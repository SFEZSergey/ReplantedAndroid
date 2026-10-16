# PvZ: Replanted — Android

**English** | [Русский](README.ru.md)

An Android (arm64) port of the PS5 version of **Plants vs. Zombies: Replanted** (PPSA29802), built on the
[AnyPS5](https://github.com/boykopovar/AnyPS5) emulator: the game's x86-64 code runs through an embedded
[box64](https://github.com/ptitSeb/box64), PS5 graphics (AGC) are translated to Vulkan and rendered by the
**Turnip** (Mesa) driver loaded via [libadrenotools](https://github.com/bylaws/libadrenotools).

> ⚠️ **The game is not included in this repository or in the APK.** You need your own legally obtained,
> **decrypted** dump of the game (the folder containing `eboot.bin`). This repository does not contain or
> distribute any game or PS5 firmware files.

## Download

Get the APK from [Releases](https://github.com/SFEZSergey/ReplantedAndroid/releases) (currently a beta).

## Requirements

- Android 8.0+ (API 26), arm64-v8a.
- **An Adreno (Snapdragon) GPU** — the bundled Turnip driver only works on Adreno (tested on Adreno 830, Snapdragon 8 Elite).
- 8 GB of RAM or more recommended; ~5 GB of free space for the game.

## Installing and running

1. Install the APK.
2. In the launcher tap **"Папка дампа"** (dump folder) and pick the game's dump folder (the one with `eboot.bin`).
3. Tap **"Импорт и запуск"** (import and run) — the launcher copies the game into the app's private storage,
   extracts the ELF and prepares the runtime. After that the button reads **"Играть"** (play).

Launcher options:
- **Touch controls** — a virtual gamepad over the game (the eye button at the top hides it). Hidden by default when a physical gamepad is connected.
- **GPU turbo** — maximum GPU clocks (faster, but the phone heats up more).
- **FPS: 60 / 45 / 30** — frame-rate limit against overheating.
- **GPU driver** — the built-in Turnip, the phone's system Vulkan driver, or your own driver package
  (an adrenotools `.zip` with `meta.json`, as used by Yuzu/Eden/Winlator). If the chosen driver fails to load,
  the built-in Turnip is used.
- **Game language** — the languages the game is translated into (read from the dump's `param.json`; for PvZ:
  English, French, German, Spanish, Japanese, Portuguese (Brazil)), or "System" — the phone's language when the
  game has it, English otherwise. Other PS5 languages are listed separately.
- **Language** — the launcher's own language: system, English or Russian.
- **GPU driver** — the built-in Turnip, the phone's system Vulkan driver, or your own driver package
  (an adrenotools `.zip` with `meta.json`, as used by Yuzu/Eden/Winlator). If the chosen driver fails to load,
  the built-in Turnip is used.
- **Game language** — any of the 31 PS5 console languages, or "System" (follows the phone's language).
- **Language** — the launcher's own language: system, English or Russian.

Fine-tuning is done in `env.txt` inside the game folder (`files/game/env.txt`), one `NAME=value` per line
(for example `APS5_FPS_LIMIT=45`, `APS5_NO_WORKER_AFFINITY=1`).

## Repository layout

| Path | Contents |
|---|---|
| `android/` | The APK: launcher and game Activity (Java), touch controls, `native/sdl_main.c` (libmain: starts box64, Vulkan through adrenotools, environment), `build.sh`, `tools/` |
| `external/AnyPS5` | submodule — AnyPS5 fork, branch `android` (native bionic driver group, write watching, Android presentation, optimizations) |
| `external/box64` | submodule — box64 fork, branch `android` (box64 as a library inside the APK, glibc compatibility on top of bionic, signals, DynaCache) |
| `patches/mesa-26.2.4-android.patch` | Turnip: host-memory import through KGSL, linear gralloc swapchain buffers |
| `patches/sdl2-android-udev-once.patch` | SDL2 (an AnyPS5 submodule) |
| `cmake/` | CMake toolchain files (bionic arm64 and x86-64 glibc), Meson cross file for Mesa, `box64-emu.sh` |
| `compat/` | compatibility headers (ndk-shim, box64-android-compat) |

## Building

Everything was built on the phone itself in **Termux** (clang/LLVM 21, cmake, ninja, meson, `aapt`, `d8`,
`apksigner`, `zipalign`, `patchelf`, OpenJDK 21). Dependencies installed separately are looked up in `deps/`
by default (every path can be overridden with environment variables, see the top of `android/build.sh`).

```sh
git clone --recursive https://github.com/SFEZSergey/ReplantedAndroid
cd ReplantedAndroid
git -C external/AnyPS5/3rdparty/SDL2 apply ../../../../patches/sdl2-android-udev-once.patch
```

1. **AnyPS5, native group (bionic arm64)** → `external/AnyPS5/build-bionic`:
   `cmake -S external/AnyPS5 -B external/AnyPS5/build-bionic -G Ninja -DCMAKE_TOOLCHAIN_FILE=$PWD/cmake/aarch64-bionic.cmake -DCMAKE_BUILD_TYPE=Release -DAPS5_NATIVE_GROUP=ON -DAPS5_NO_FFMPEG=ON -DANYPS5_ENABLE_SPIRV_TOOLS=OFF`
   with the targets `SDL2 aps5coreshim libSceAgcDriver libSceVideoOut libScePad libSceMouse libSceKeyboard libSceAudioOut`.
2. **AnyPS5, x86-64 PS5 libraries (PRX)** → `external/AnyPS5/build-x64s`: the same source with
   `cmake/x86_64-linux-gnu.cmake`; needs a Debian/Ubuntu x86-64 sysroot (`PVZ_SYSROOT_X86_64`) and box64 to
   run the x86 build tools (`PVZ_BOX64`, see `cmake/box64-emu.sh`).
3. **box64** → `external/box64/build-lib`: `-DTERMUX=1 -DARM_DYNAREC=1 -DBOX64_SHARED_LIB=ON
   -DCMAKE_BUILD_TYPE=RelWithDebInfo -DCMAKE_C_FLAGS="--target=aarch64-linux-android30 -fPIC -I$PWD/compat/box64-android-compat"`.
4. **Mesa 26.2.4 (Turnip)**: mesa-26.2.4 sources + `patches/mesa-26.2.4-android.patch`, meson with
   `--cross-file cmake/mesa-android-cross.ini -Dbuildtype=release -Dvulkan-drivers=freedreno -Dgallium-drivers= -Dfreedreno-kmds=kgsl -Dplatforms=android -Dandroid-stub=true -Dandroid-libbacktrace=disabled -Dglx=disabled -Degl=disabled -Dgles1=disabled -Dgles2=disabled -Dopengl=false -Dllvm=disabled -Dzlib=enabled`
   → `MESA_BUILD_DIR`.
5. **libadrenotools** (built per its README) → `ADRENOTOOLS_DIR`; the **AnyPS5 relinker** for arm64
   (`-DANYPS5_RELINKER_ONLY=ON`) → `RELINKER_BIN`; x86-64 runtime libraries from Debian/Ubuntu
   (`libstdc++.so.6/.5`, `libgcc_s.so.1`, `libssl/libcrypto 1.1 and 1.0.0`, `libmbed*`, `libpng12`, `libunwind`) → `X64LIB_DIR`;
   `android.jar` (API 35) → `ANDROID_JAR`.
6. `android/build.sh` → `android/out/PvZ-Replanted.apk` (signed with a debug key created on the first build).

## Licenses

The port's code is GPL-2.0 (like AnyPS5, see `LICENSE`). Components: AnyPS5 — GPL-2.0, box64 — MIT,
Mesa — MIT, SDL2 — zlib, libadrenotools — BSD-2-Clause. "Plants vs. Zombies" and related material (including
the app icon) belong to Electronic Arts / PopCap; this project is not affiliated with them.
