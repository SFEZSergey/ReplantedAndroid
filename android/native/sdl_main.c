// SDL_main для APK: открывает Vulkan через libadrenotools со своим Turnip, настраивает окружение
// (как run-pvz.sh) и запускает x86-64 app.elf во встроенном box64 в этом же процессе.
// Аргументы от GameActivity: <путь к app.elf> <nativeLibraryDir> <filesDir>.
#include <adrenotools/driver.h>
#include <android/log.h>
#include <dirent.h>
#include <signal.h>
#include <sys/syscall.h>
#include <ucontext.h>
#include <dlfcn.h>
#include <pthread.h>
#include <time.h>
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <jni.h>
#include <stdatomic.h>
#include <stdint.h>

// Виртуальный геймпад (сенсорный слой GameActivity/TouchControlsView). libSceVideoOut находит этот
// объект через dlsym(libmain.so, "aps5_virtual_pad") и подмешивает его к вводу: sequence растёт на
// каждое изменение, sticks = lx | ly << 8 | rx << 16 | ry << 24.
struct aps5_virtual_pad {
    _Atomic uint32_t sequence;
    _Atomic uint32_t buttons;
    _Atomic uint32_t sticks;
};
__attribute__((visibility("default"))) struct aps5_virtual_pad aps5_virtual_pad = {0, 0, 0x80808080u};

JNIEXPORT void JNICALL Java_org_anyps5_android_GameActivity_nativeVirtualPad(JNIEnv* env, jclass cls, jint buttons, jint lx, jint ly, jint rx, jint ry) {
    (void)env;
    (void)cls;
    const uint32_t sticks = (uint32_t)(lx & 0xff) | (uint32_t)(ly & 0xff) << 8 | (uint32_t)(rx & 0xff) << 16 | (uint32_t)(ry & 0xff) << 24;
    atomic_store(&aps5_virtual_pad.buttons, (uint32_t)buttons);
    atomic_store(&aps5_virtual_pad.sticks, sticks);
    atomic_fetch_add(&aps5_virtual_pad.sequence, 1);
}

extern int box64_main(int argc, const char **argv, char **env);
extern char **environ;

#define LOG(prio, ...) __android_log_print(prio, "AnyPS5", __VA_ARGS__)

static void setdefault(const char *name, const char *value) { setenv(name, value, 0); }

static void *open_vulkan(const char *native_dir) {
    char hook_dir[PATH_MAX];
    snprintf(hook_dir, sizeof(hook_dir), "%s/", native_dir);
    // Turnip лежит в nativeLibraryDir как libvulkan_freedreno.so (системный драйвер Qualcomm без
    // VK_EXT_external_memory_host не подходит). APS5_SYSTEM_VULKAN=1 — проверить системный драйвер.
    if (getenv("APS5_SYSTEM_VULKAN") != NULL) return dlopen("libvulkan.so", RTLD_NOW);
    void *handle = adrenotools_open_libvulkan(RTLD_NOW, ADRENOTOOLS_DRIVER_CUSTOM, NULL, hook_dir, hook_dir, "libvulkan_freedreno.so", NULL, NULL);
    if (handle == NULL) LOG(ANDROID_LOG_ERROR, "adrenotools_open_libvulkan failed: %s", dlerror());
    return handle;
}


// Сторожевой поток (APS5_WATCHDOG=0 отключает): каждые 3 с пишет в watch.log состояние потоков
// (имя, состояние, utime, stime, wchan) — видно, где процесс встал, даже если его потом заморозят.
static void *watchdog(void *arg) {
    (void)arg;
    FILE *out = fopen("watch.log", "w");
    if (out == NULL) return NULL;
    for (int tick = 0;; ++tick) {
        sleep(3);
        fprintf(out, "== %d s\n", tick * 3 + 3);
        DIR *dir = opendir("/proc/self/task");
        struct dirent *entry;
        while (dir != NULL && (entry = readdir(dir)) != NULL) {
            if (entry->d_name[0] == '.') continue;
            char path[128], stat[512] = "", wchan[64] = "";
            snprintf(path, sizeof(path), "/proc/self/task/%s/stat", entry->d_name);
            FILE *f = fopen(path, "r");
            if (f != NULL) { if (fgets(stat, sizeof(stat), f) == NULL) stat[0] = '\0'; fclose(f); }
            snprintf(path, sizeof(path), "/proc/self/task/%s/wchan", entry->d_name);
            f = fopen(path, "r");
            if (f != NULL) { if (fgets(wchan, sizeof(wchan), f) == NULL) wchan[0] = '\0'; fclose(f); }
            char *name = strchr(stat, '('), *close = strrchr(stat, ')');
            if (name == NULL || close == NULL) continue;
            *close = '\0';
            char state = 0; unsigned long utime = 0, stime = 0;
            sscanf(close + 2, "%c %*d %*d %*d %*d %*d %*u %*u %*u %*u %*u %lu %lu", &state, &utime, &stime);
            fprintf(out, "%s %s %c %lu %lu %s\n", entry->d_name, name + 1, state, utime, stime, wchan);
        }
        if (dir != NULL) closedir(dir);
        fflush(out);
    }
    return NULL;
}

// Сэмплер (APS5_SAMPLE=1): каждые 2 мс сигнал главному потоку; обработчик переводит нативный PC в
// x86-адрес начала блока box64 (box64_native_to_x64). Каждые 5 с — топ адресов в sample.log.
extern void *box64_native_to_x64(void *pc);
extern void box64_save_dynacache(void);

// Кэш трансляции box64 (DynaCache) пишется только при выходе box64, а Android убивает приложение:
// сохраняем его сами — после старта и периодически. APS5_DYNACACHE_SAVE=0 — выкл.
static void *dynacache_saver(void *arg) {
    (void)arg;
    static const unsigned delays[] = { 40, 50, 300 };
    for (unsigned i = 0;; ++i) {
        sleep(delays[i < 3 ? i : 2]);
        box64_save_dynacache();
        LOG(ANDROID_LOG_INFO, "DynaCache saved");
    }
    return NULL;
}
#define SAMPLE_RING 65536
static uintptr_t sample_ring[SAMPLE_RING];
static volatile unsigned sample_head;
static pid_t sample_tid;

static void sample_handler(int sig, siginfo_t *info, void *raw) {
    (void)sig; (void)info;
    ucontext_t *uc = raw;
    uintptr_t pc = (uintptr_t)uc->uc_mcontext.pc;
    void *x64 = box64_native_to_x64((void *)pc);
    // x86-адреса помечаем старшим битом 0, нативные — 1 (bit 63).
    uintptr_t value = x64 != NULL ? (uintptr_t)x64 : (pc | (1ULL << 63));
    unsigned slot = __atomic_fetch_add(&sample_head, 1, __ATOMIC_RELAXED);
    sample_ring[slot % SAMPLE_RING] = value;
}

typedef struct { uintptr_t key; unsigned count; } sample_bin;
static int sample_cmp(const void *a, const void *b) { return (int)((const sample_bin *)b)->count - (int)((const sample_bin *)a)->count; }

static void *sampler(void *arg) {
    (void)arg;
    FILE *out = fopen("sample.log", "w");
    if (out == NULL) return NULL;
    struct sigaction action;
    memset(&action, 0, sizeof(action));
    action.sa_sigaction = sample_handler;
    action.sa_flags = SA_SIGINFO | SA_RESTART;
    sigaction(SIGRTMIN + 18, &action, NULL);
    static sample_bin bins[8192];
    sleep(5); // box64 должен успеть инициализироваться
    unsigned taken = __atomic_load_n(&sample_head, __ATOMIC_RELAXED);
    for (int window = 0;; ++window) {
        for (int i = 0; i < 2500; ++i) {
            syscall(SYS_tgkill, getpid(), sample_tid, SIGRTMIN + 18);
            usleep(2000);
        }
        unsigned head = __atomic_load_n(&sample_head, __ATOMIC_RELAXED);
        int used = 0; unsigned total = 0;
        for (; taken != head; ++taken) {
            uintptr_t v = sample_ring[taken % SAMPLE_RING];
            // нативные адреса группируем по модулю (dladdr), x86 — по началу блока
            if (v >> 63) {
                Dl_info dl;
                uintptr_t pc = v & ~(1ULL << 63);
                v = dladdr((void *)pc, &dl) && dl.dli_fbase ? ((uintptr_t)dl.dli_fbase | (1ULL << 63)) : (1ULL << 63);
            }
            int j = 0;
            while (j < used && bins[j].key != v) ++j;
            if (j == used) { if (used == 8192) continue; bins[used].key = v; bins[used].count = 0; ++used; }
            ++bins[j].count; ++total;
        }
        qsort(bins, used, sizeof(bins[0]), sample_cmp);
        fprintf(out, "== window %d (%.0f s), samples %u\n", window, (window + 1) * 5.0, total);
        for (int j = 0; j < used && j < 40; ++j) {
            if (bins[j].key >> 63) {
                Dl_info dl;
                uintptr_t base = bins[j].key & ~(1ULL << 63);
                const char *name = base && dladdr((void *)base, &dl) ? dl.dli_fname : "?";
                fprintf(out, "%5.1f%% native %s\n", 100.0 * bins[j].count / total, name);
            } else {
                fprintf(out, "%5.1f%% x64 0x%lx\n", 100.0 * bins[j].count / total, (unsigned long)bins[j].key);
            }
        }
        fflush(out);
    }
    return NULL;
}

int SDL_main(int argc, char **argv) {
    LOG(ANDROID_LOG_INFO, "SDL_main argc=%d", argc);
    if (argc < 4) return 2;
    char game_elf[PATH_MAX];
    if (realpath(argv[1], game_elf) == NULL) { LOG(ANDROID_LOG_ERROR, "no game ELF %s", argv[1]); return 3; }
    const char *native_dir = argv[2];
    char game_dir[PATH_MAX];
    snprintf(game_dir, sizeof(game_dir), "%s", game_elf);
    char *slash = strrchr(game_dir, '/');
    if (slash == NULL) return 4;
    *slash = '\0';
    if (chdir(game_dir) != 0) return 5;
    if (getenv("APS5_LOG_TO_LOGCAT") == NULL) {
        // stdout и stderr — один дескриптор: иначе "w" со своим смещением затирает записи stderr.
        freopen("box64.log", "w", stdout);
        dup2(fileno(stdout), STDERR_FILENO);
        setvbuf(stdout, NULL, _IOLBF, 0);
        setvbuf(stderr, NULL, _IONBF, 0);
    }

    // Пользовательские переменные: <game>/env.txt, строки NAME=VALUE (перекрывают умолчания ниже).
    // launcher.env — переключатели хаба (MainActivity), env.txt — ручные (перекрывают хаб).
    static const char *const env_files[] = {"launcher.env", "env.txt"};
    for (size_t file = 0; file < sizeof(env_files) / sizeof(env_files[0]); ++file) {
        FILE *extra = fopen(env_files[file], "r");
        if (extra == NULL) continue;
        char line[1024];
        while (fgets(line, sizeof(line), extra) != NULL) {
            line[strcspn(line, "\r\n")] = '\0';
            char *eq = strchr(line, '=');
            if (line[0] == '#' || eq == NULL) continue;
            *eq = '\0';
            setenv(line, eq + 1, 1);
        }
        fclose(extra);
    }

    char path[PATH_MAX * 3];
    snprintf(path, sizeof(path), "%s/x64lib:%s/libs", game_dir, game_dir);
    setdefault("BOX64_LD_LIBRARY_PATH", path);
    setdefault("APS5_NATIVE_DIR", native_dir);
    // Адрес состояния сенсорного геймпада для libSceVideoOut (без поиска символа через пространства имён линкера).
    char virtual_pad[32];
    snprintf(virtual_pad, sizeof(virtual_pad), "%llx", (unsigned long long)(uintptr_t)&aps5_virtual_pad);
    setenv("APS5_VIRTUAL_PAD", virtual_pad, 1);
    // Кэш шейдеров/конвейеров: по умолчанию рядом с исполняемым файлом (/system/bin — нет доступа).
    char cache[PATH_MAX];
    snprintf(cache, sizeof(cache), "%s/shader_cache", game_dir);
    setdefault("ANYPS5_SHADER_CACHE_DIR", cache);
    setdefault("HOME", argv[3]);
    setdefault("TMPDIR", argv[3]);
    // Циклы ожидания игры (x86 PAUSE) — подсказка YIELD вместо пустого кручения на полной мощности.
    setdefault("BOX64_DYNAREC_PAUSE", "1");
    setdefault("BOX64_LOG", "1");
    setdefault("BOX64_SHOWBT", "1");
    setdefault("BOX64_DYNAREC_BIGBLOCK", "3");
    setdefault("BOX64_DYNAREC_CALLRET", "1");
    setdefault("BOX64_DYNAREC_FASTROUND", "1");
    setdefault("BOX64_DYNAREC_FASTNAN", "1");
    setdefault("APS5_IGNORE_MSAA", "1");
    setdefault("APS5_TEXTURE_CHECK_PER_FRAME", "1");
    setdefault("APS5_LOG_FPS", "1");
    // Кэш трансляции box64: в окне заставок половина главного потока — трансляция нового x86-кода.
    // Без сжатия (распаковка zlib стоила ~9% главного потока). BOX64_DYNACACHE=0 — выкл.
    setdefault("BOX64_DYNACACHE", "1");
    setdefault("BOX64_DYNACACHE_COMPRESS", "0");
    // Окно SDL на Android ставит ориентацию сама (по размеру окна / этой подсказке): только альбомная.
    setdefault("SDL_IOS_ORIENTATIONS", "LandscapeLeft LandscapeRight");

    const char *watch = getenv("APS5_WATCHDOG");
    if (watch == NULL || strcmp(watch, "0") != 0) {
        pthread_t thread;
        if (pthread_create(&thread, NULL, watchdog, NULL) == 0) pthread_detach(thread);
    }

    const char *save = getenv("APS5_DYNACACHE_SAVE");
    if (save == NULL || strcmp(save, "0") != 0) {
        pthread_t thread;
        if (pthread_create(&thread, NULL, dynacache_saver, NULL) == 0) pthread_detach(thread);
    }
    const char *sample = getenv("APS5_SAMPLE");
    if (sample != NULL && strcmp(sample, "1") == 0) {
        sample_tid = gettid();
        pthread_t thread;
        if (pthread_create(&thread, NULL, sampler, NULL) == 0) pthread_detach(thread);
    }

    void *vulkan = open_vulkan(native_dir);
    if (vulkan == NULL) return 6;
    // GPU на максимальной частоте (KGSL, без root): работа приходит рывками, и штатный регулятор
    // держал 525 МГц из 1100 — кадр ждал GPU. На титульнике 56-59 -> ровные 60 FPS. APS5_GPU_TURBO=0 — выкл.
    // Выкл. по умолчанию: на батарее максимальная частота греет телефон, и прошивка всё равно режет
    // частоты. Скорость берём уменьшением работы. APS5_GPU_TURBO=1 — включить.
    const char *turbo = getenv("APS5_GPU_TURBO");
    if (turbo != NULL && strcmp(turbo, "1") == 0) {
        adrenotools_set_turbo(true);
        LOG(ANDROID_LOG_INFO, "GPU turbo on");
    }
    char handle[32];
    snprintf(handle, sizeof(handle), "0x%llx", (unsigned long long)(unsigned long)vulkan);
    setenv("APS5_VULKAN_HANDLE", handle, 1);
    LOG(ANDROID_LOG_INFO, "Vulkan handle %s, ELF %s", handle, game_elf);

    // box64 переписывает argv на месте: строки должны лежать одним непрерывным изменяемым блоком.
    size_t len0 = strlen("box64") + 1, len1 = strlen(game_elf) + 1;
    char *block = malloc(len0 + len1);
    memcpy(block, "box64", len0);
    memcpy(block + len0, game_elf, len1);
    const char *box_argv[] = { block, block + len0, NULL };
    int result = box64_main(2, box_argv, environ);
    LOG(ANDROID_LOG_ERROR, "box64_main returned %d", result);
    fflush(stdout);
    _exit(result);
}
