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
#include <sys/stat.h>
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

// Ввод текста для игры (sceImeDialog, x86 под box64): libSceImeDialog находит этот объект по адресу
// из APS5_TEXT_INPUT, кладёт начальный текст и ставит state = 1; GameActivity опрашивает его, показывает
// поле ввода с клавиатурой Android и возвращает текст (state 3) или отмену (4). Игра прерывает ввод
// state = 5 (диалог закрывается), после результата игра сама возвращает state в 0.
enum { APS5_TEXT_IDLE = 0, APS5_TEXT_REQUESTED = 1, APS5_TEXT_SHOWN = 2, APS5_TEXT_DONE = 3, APS5_TEXT_CANCELLED = 4, APS5_TEXT_ABORTED = 5 };
#define APS5_TEXT_CAPACITY 1024
struct aps5_text_input {
    _Atomic uint32_t state;
    uint32_t max_length;
    uint32_t type;
    uint32_t reserved;
    uint16_t text[APS5_TEXT_CAPACITY];
};
__attribute__((visibility("default"))) struct aps5_text_input aps5_text_input;

// Запрос игры: начальный текст (и переход в «показан») или null, если запроса нет.
JNIEXPORT jstring JNICALL Java_org_anyps5_android_GameActivity_nativeTextInputRequest(JNIEnv* env, jclass cls) {
    (void)cls;
    uint32_t expected = APS5_TEXT_REQUESTED;
    if (!atomic_compare_exchange_strong(&aps5_text_input.state, &expected, APS5_TEXT_SHOWN)) return NULL;
    jsize length = 0;
    while (length < APS5_TEXT_CAPACITY - 1 && aps5_text_input.text[length] != 0) ++length;
    return (*env)->NewString(env, (const jchar*)aps5_text_input.text, length);
}

JNIEXPORT jint JNICALL Java_org_anyps5_android_GameActivity_nativeTextInputMaxLength(JNIEnv* env, jclass cls) {
    (void)env; (void)cls;
    const uint32_t max = aps5_text_input.max_length;
    return (jint)(max == 0 || max >= APS5_TEXT_CAPACITY ? APS5_TEXT_CAPACITY - 1 : max);
}

// Показанный диалог ещё нужен (игра не прервала ввод).
JNIEXPORT jboolean JNICALL Java_org_anyps5_android_GameActivity_nativeTextInputPending(JNIEnv* env, jclass cls) {
    (void)env; (void)cls;
    return atomic_load(&aps5_text_input.state) == APS5_TEXT_SHOWN ? JNI_TRUE : JNI_FALSE;
}

JNIEXPORT void JNICALL Java_org_anyps5_android_GameActivity_nativeTextInputDone(JNIEnv* env, jclass cls, jstring text) {
    (void)cls;
    if (atomic_load(&aps5_text_input.state) != APS5_TEXT_SHOWN) return;
    if (text == NULL) {
        atomic_store(&aps5_text_input.state, APS5_TEXT_CANCELLED);
        return;
    }
    const jsize length = (*env)->GetStringLength(env, text);
    const uint32_t max = (uint32_t)Java_org_anyps5_android_GameActivity_nativeTextInputMaxLength(env, cls);
    const jsize copied = length < (jsize)max ? length : (jsize)max;
    (*env)->GetStringRegion(env, text, 0, copied, (jchar*)aps5_text_input.text);
    aps5_text_input.text[copied] = 0;
    atomic_store(&aps5_text_input.state, APS5_TEXT_DONE);
}

// Автопилот для тестов (APS5_AUTOPILOT=<файл сценария>): нажимает кнопки через тот же виртуальный
// геймпад, что и сенсорное управление, — нажатия видит только игра. Строки сценария:
//   wait <секунды> | press <кнопка> [мс] | stick <x> <y> <мс> (левый стик, -1..1) | mark <метка> | done
// Кнопки: cross circle square triangle l1 r1 l2 r2 l3 r3 options touchpad up down left right.
// Метки и ход пишутся в box64.log строками "[autopilot] ...".
static double autopilot_now(void) {
    struct timespec t;
    clock_gettime(CLOCK_MONOTONIC, &t);
    return (double)t.tv_sec + (double)t.tv_nsec / 1e9;
}

static void autopilot_send(uint32_t buttons, int lx, int ly) {
    const uint32_t sticks = (uint32_t)(lx & 0xff) | (uint32_t)(ly & 0xff) << 8 | 0x80u << 16 | 0x80u << 24;
    atomic_store(&aps5_virtual_pad.buttons, buttons);
    atomic_store(&aps5_virtual_pad.sticks, sticks);
    atomic_fetch_add(&aps5_virtual_pad.sequence, 1);
}

static void autopilot_sleep(double seconds) {
    if (seconds <= 0) return;
    struct timespec t = {(time_t)seconds, (long)((seconds - (double)(time_t)seconds) * 1e9)};
    while (nanosleep(&t, &t) != 0) {}
}

static uint32_t autopilot_button(const char *name) {
    static const struct { const char *name; uint32_t bit; } names[] = {
        {"cross", 0x4000}, {"circle", 0x2000}, {"square", 0x8000}, {"triangle", 0x1000},
        {"l1", 0x400}, {"r1", 0x800}, {"l2", 0x100}, {"r2", 0x200}, {"l3", 0x2}, {"r3", 0x4},
        {"options", 0x8}, {"touchpad", 0x100000}, {"up", 0x10}, {"right", 0x20}, {"down", 0x40}, {"left", 0x80},
    };
    for (size_t i = 0; i < sizeof(names) / sizeof(names[0]); ++i) if (strcmp(names[i].name, name) == 0) return names[i].bit;
    return 0;
}

static void *autopilot(void *arg) {
    const char *path = (const char *)arg;
    FILE *script = fopen(path, "r");
    if (script == NULL) { fprintf(stderr, "[autopilot] cannot open %s\n", path); return NULL; }
    const double start = autopilot_now();
    char line[256];
    while (fgets(line, sizeof(line), script) != NULL) {
        char command[32] = {0}, word[96] = {0};
        double a = 0, b = 0, c = 0;
        if (sscanf(line, "%31s", command) != 1 || command[0] == '#') continue;
        if (strcmp(command, "wait") == 0 && sscanf(line, "%*s %lf", &a) == 1) {
            autopilot_sleep(a);
        } else if (strcmp(command, "press") == 0 && sscanf(line, "%*s %95s", word) == 1) {
            const uint32_t bit = autopilot_button(word);
            if (sscanf(line, "%*s %*s %lf", &a) != 1) a = 150;
            fprintf(stderr, "[autopilot] %.1f s: press %s\n", autopilot_now() - start, word);
            autopilot_send(bit, 128, 128);
            autopilot_sleep(a / 1000.0);
            autopilot_send(0, 128, 128);
        } else if (strcmp(command, "stick") == 0 && sscanf(line, "%*s %lf %lf %lf", &a, &b, &c) == 3) {
            fprintf(stderr, "[autopilot] %.1f s: stick %.1f %.1f\n", autopilot_now() - start, a, b);
            autopilot_send(0, (int)(128 + a * 127), (int)(128 + b * 127));
            autopilot_sleep(c / 1000.0);
            autopilot_send(0, 128, 128);
        } else if (strcmp(command, "mark") == 0 && sscanf(line, "%*s %95s", word) == 1) {
            fprintf(stderr, "[autopilot] %.1f s: mark %s\n", autopilot_now() - start, word);
        } else if (strcmp(command, "done") == 0) {
            break;
        }
        fflush(stderr);
    }
    fclose(script);
    fprintf(stderr, "[autopilot] %.1f s: done\n", autopilot_now() - start);
    fflush(stderr);
    return NULL;
}

extern int box64_main(int argc, const char **argv, char **env);
extern char **environ;

#define LOG(prio, ...) __android_log_print(prio, "AnyPS5", __VA_ARGS__)

static void setdefault(const char *name, const char *value) { setenv(name, value, 0); }

// Драйвер Vulkan (выбор в лаунчере, launcher.env):
//   APS5_GPU_DRIVER не задан / "builtin" — встроенный Turnip (libvulkan_freedreno.so в nativeLibraryDir);
//   "system" — системный драйвер телефона (libvulkan.so);
//   иначе — каталог пакета драйвера (adrenotools, meta.json), библиотека — APS5_GPU_DRIVER_LIB.
// Не загрузился выбранный — пробуем встроенный Turnip. APS5_SYSTEM_VULKAN=1 — как "system" (старый флаг).
// tmp_dir нужен adrenotools на Android 9 и ниже.
static void *open_vulkan(const char *native_dir, const char *tmp_dir) {
    char hook_dir[PATH_MAX];
    snprintf(hook_dir, sizeof(hook_dir), "%s/", native_dir);
    char tmp[PATH_MAX];
    snprintf(tmp, sizeof(tmp), "%s/", tmp_dir);
    mkdir(tmp_dir, 0700);
    const char *driver = getenv("APS5_GPU_DRIVER");
    if (getenv("APS5_SYSTEM_VULKAN") != NULL || (driver != NULL && strcmp(driver, "system") == 0)) {
        void *system = dlopen("libvulkan.so", RTLD_NOW);
        LOG(ANDROID_LOG_INFO, "Vulkan: system driver %s", system != NULL ? "loaded" : dlerror());
        fprintf(stderr, "[gpu] Vulkan driver: system (%s)\n", system != NULL ? "loaded" : "failed");
        if (system != NULL) return system;
    } else if (driver != NULL && driver[0] == '/' ) {
        const char *library = getenv("APS5_GPU_DRIVER_LIB");
        char custom_dir[PATH_MAX];
        snprintf(custom_dir, sizeof(custom_dir), "%s/", driver);
        void *custom = library != NULL ? adrenotools_open_libvulkan(RTLD_NOW, ADRENOTOOLS_DRIVER_CUSTOM, tmp, hook_dir, custom_dir, library, NULL, NULL) : NULL;
        fprintf(stderr, "[gpu] Vulkan driver: custom %s/%s (%s)\n", driver, library != NULL ? library : "?", custom != NULL ? "loaded" : "failed, using built-in Turnip");
        if (custom != NULL) return custom;
        LOG(ANDROID_LOG_ERROR, "custom driver %s failed: %s", driver, dlerror());
    }
    void *handle = adrenotools_open_libvulkan(RTLD_NOW, ADRENOTOOLS_DRIVER_CUSTOM, tmp, hook_dir, hook_dir, "libvulkan_freedreno.so", NULL, NULL);
    if (handle == NULL) LOG(ANDROID_LOG_ERROR, "adrenotools_open_libvulkan failed: %s", dlerror());
    else fprintf(stderr, "[gpu] Vulkan driver: built-in Turnip\n");
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
    char text_input[32];
    snprintf(text_input, sizeof(text_input), "%llx", (unsigned long long)(uintptr_t)&aps5_text_input);
    setenv("APS5_TEXT_INPUT", text_input, 1);
    // Кэш шейдеров/конвейеров: по умолчанию рядом с исполняемым файлом (/system/bin — нет доступа).
    char cache[PATH_MAX];
    snprintf(cache, sizeof(cache), "%s/shader_cache", game_dir);
    setdefault("ANYPS5_SHADER_CACHE_DIR", cache);
    setdefault("HOME", argv[3]);
    setdefault("TMPDIR", argv[3]);
    // Циклы ожидания игры (x86 PAUSE) — подсказка YIELD вместо пустого кручения на полной мощности.
    // PAUSE в циклах ожидания (спинлоки потоков Unity) — SEVL+WFE: ядро ждёт события, а не крутится;
    // на одинаковой частоте меню давало больше кадров при ~12% меньшей загрузке ядер.
    setdefault("BOX64_DYNAREC_PAUSE", "3");
    // Кэш ресурсов и рецепты для draw со сгенерированными стадиями (прямоугольники интерфейса).
    setdefault("APS5_GENERATED_STAGE_CACHE", "1");
    // Конвейер draw: подготовка и запись Vulkan в двух потоках (APS5_PIPELINE_DRAWS=0 — по-старому, в одном).
    setdefault("APS5_PIPELINE_DRAWS", "1");
    setdefault("BOX64_LOG", "1");
    setdefault("BOX64_SHOWBT", "1");
    setdefault("BOX64_DYNAREC_BIGBLOCK", "3");
    setdefault("BOX64_DYNAREC_CALLRET", "1");
    setdefault("BOX64_DYNAREC_FASTROUND", "1");
    setdefault("BOX64_DYNAREC_FASTNAN", "1");
    setdefault("APS5_IGNORE_MSAA", "1");
    // Касания — только сенсорное управление (геймпад игрока 1): SDL не делает из них мышь, иначе
    // игра видела мышь вторым устройством ввода (второй игрок) при касании мимо кнопок.
    setdefault("SDL_TOUCH_MOUSE_EVENTS", "0");
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
    const char *autopilot_script = getenv("APS5_AUTOPILOT");
    if (autopilot_script != NULL && autopilot_script[0] != '\0') {
        static char autopilot_path[PATH_MAX];
        snprintf(autopilot_path, sizeof(autopilot_path), "%s", autopilot_script);
        pthread_t thread;
        if (pthread_create(&thread, NULL, autopilot, autopilot_path) == 0) pthread_detach(thread);
    }
    const char *sample = getenv("APS5_SAMPLE");
    if (sample != NULL && strcmp(sample, "1") == 0) {
        sample_tid = gettid();
        pthread_t thread;
        if (pthread_create(&thread, NULL, sampler, NULL) == 0) pthread_detach(thread);
    }

    char adrenotools_tmp[PATH_MAX];
    snprintf(adrenotools_tmp, sizeof(adrenotools_tmp), "%s/adrenotools-tmp", argv[3]);
    void *vulkan = open_vulkan(native_dir, adrenotools_tmp);
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
