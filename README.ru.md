# PvZ: Replanted — Android

[English](README.md) | **Русский**

Порт PS5-версии **Plants vs. Zombies: Replanted** (PPSA29802) на Android (arm64) на основе эмулятора
[AnyPS5](https://github.com/boykopovar/AnyPS5): x86-64 код игры выполняется через встроенный
[box64](https://github.com/ptitSeb/box64), графика PS5 (AGC) переводится в Vulkan и рисуется драйвером
**Turnip** (Mesa) через [libadrenotools](https://github.com/bylaws/libadrenotools).

> ⚠️ **Игры в репозитории и в APK нет.** Нужен ваш собственный, законно полученный и **расшифрованный**
> дамп игры (папка с `eboot.bin`). Репозиторий не содержит и не распространяет файлы игры или прошивки PS5.

## Требования

- Android 8.0+ (API 26), arm64-v8a.
- **Видеокарта Adreno (Snapdragon)** — встроенный Turnip работает только с Adreno (проверено на Adreno 830, Snapdragon 8 Elite).
- 8 ГБ ОЗУ и больше рекомендуется; ~5 ГБ места под игру.

## Установка и запуск

1. Установите APK (из релизов или собранный самостоятельно).
2. В лаунчере нажмите **«Папка дампа»** и выберите папку дампа игры (где лежит `eboot.bin`).
3. Нажмите **«Импорт и запуск»** — лаунчер скопирует игру в память приложения, извлечёт ELF и подготовит
   рантайм. Дальше кнопка называется **«Играть»**.

Настройки лаунчера:
- **Сенсорное управление** — виртуальный геймпад поверх игры (кнопка-глаз сверху прячет его). С физическим
  геймпадом слой по умолчанию скрыт.
- **Турбо GPU** — максимальные частоты видеокарты (быстрее, но греется сильнее).
- **FPS: 60 / 45 / 30** — ограничение кадров против нагрева.

Тонкие настройки — файл `env.txt` в папке игры (`files/game/env.txt`), строки `ИМЯ=значение`
(например `APS5_FPS_LIMIT=45`, `APS5_NO_WORKER_AFFINITY=1`).

## Состав репозитория

| Путь | Что |
|---|---|
| `android/` | APK: лаунчер и игровая Activity (Java), сенсорное управление, `native/sdl_main.c` (libmain: запуск box64, Vulkan через adrenotools, окружение), `build.sh`, `tools/` |
| `external/AnyPS5` | подмодуль — форк AnyPS5, ветка `android` (нативная bionic-группа драйвера, отслеживание записи, вывод на Android, оптимизации) |
| `external/box64` | подмодуль — форк box64, ветка `android` (box64 как библиотека внутри APK, совместимость glibc поверх bionic, сигналы, DynaCache) |
| `patches/mesa-26.2.4-android.patch` | Turnip: импорт host-памяти через KGSL, линейные буферы swapchain с gralloc |
| `patches/sdl2-android-udev-once.patch` | SDL2 (подмодуль AnyPS5) |
| `cmake/` | toolchain-файлы CMake (bionic arm64 и x86-64 glibc), cross-файл Meson для Mesa, `box64-emu.sh` |
| `compat/` | заголовки совместимости (ndk-shim, box64-android-compat) |

## Сборка

Собиралось на самом телефоне в **Termux** (clang/LLVM 21, cmake, ninja, meson, `aapt`, `d8`, `apksigner`,
`zipalign`, `patchelf`, OpenJDK 21). Зависимости, которые ставятся отдельно, по умолчанию ищутся в `deps/`
(все пути переопределяются переменными окружения, см. начало `android/build.sh`).

```sh
git clone --recursive https://github.com/SFEZSergey/ReplantedAndroid
cd ReplantedAndroid
git -C external/AnyPS5/3rdparty/SDL2 apply ../../../../patches/sdl2-android-udev-once.patch
```

1. **AnyPS5, нативная группа (bionic arm64)** → `external/AnyPS5/build-bionic`:
   `cmake -S external/AnyPS5 -B external/AnyPS5/build-bionic -G Ninja -DCMAKE_TOOLCHAIN_FILE=$PWD/cmake/aarch64-bionic.cmake -DCMAKE_BUILD_TYPE=Release -DAPS5_NATIVE_GROUP=ON -DAPS5_NO_FFMPEG=ON -DANYPS5_ENABLE_SPIRV_TOOLS=OFF`
   и цели `SDL2 aps5coreshim libSceAgcDriver libSceVideoOut libScePad libSceMouse libSceKeyboard libSceAudioOut`.
2. **AnyPS5, x86-64 библиотеки PS5 (PRX)** → `external/AnyPS5/build-x64s`: тот же исходник с
   `cmake/x86_64-linux-gnu.cmake`; нужен x86-64 sysroot Debian/Ubuntu (`PVZ_SYSROOT_X86_64`) и box64 для
   запуска x86-утилит сборки (`PVZ_BOX64`, см. `cmake/box64-emu.sh`).
3. **box64** → `external/box64/build-lib`: `-DTERMUX=1 -DARM_DYNAREC=1 -DBOX64_SHARED_LIB=ON
   -DCMAKE_BUILD_TYPE=RelWithDebInfo -DCMAKE_C_FLAGS="--target=aarch64-linux-android30 -fPIC -I$PWD/compat/box64-android-compat"`.
4. **Mesa 26.2.4 (Turnip)**: исходники mesa-26.2.4 + `patches/mesa-26.2.4-android.patch`, meson с
   `--cross-file cmake/mesa-android-cross.ini -Dbuildtype=release -Dvulkan-drivers=freedreno -Dgallium-drivers= -Dfreedreno-kmds=kgsl -Dplatforms=android -Dandroid-stub=true -Dandroid-libbacktrace=disabled -Dglx=disabled -Degl=disabled -Dgles1=disabled -Dgles2=disabled -Dopengl=false -Dllvm=disabled -Dzlib=enabled`
   → `MESA_BUILD_DIR`.
5. **libadrenotools** (сборка по его README) → `ADRENOTOOLS_DIR`; **relinker AnyPS5** для arm64
   (`-DANYPS5_RELINKER_ONLY=ON`) → `RELINKER_BIN`; x86-64 библиотеки времени выполнения из Debian/Ubuntu
   (`libstdc++.so.6/.5`, `libgcc_s.so.1`, `libssl/libcrypto 1.1 и 1.0.0`, `libmbed*`, `libpng12`, `libunwind`) → `X64LIB_DIR`;
   `android.jar` (API 35) → `ANDROID_JAR`.
6. `android/build.sh` → `android/out/PvZ-Replanted.apk` (подпись отладочным ключом, создаётся при первой сборке).

## Лицензии

Код порта — GPL-2.0 (как AnyPS5, см. `LICENSE`). Компоненты: AnyPS5 — GPL-2.0, box64 — MIT, Mesa — MIT,
SDL2 — zlib, libadrenotools — BSD-2-Clause. «Plants vs. Zombies» и связанные материалы (включая иконку
приложения) принадлежат Electronic Arts / PopCap; проект не связан с ними.
