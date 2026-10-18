# PvZ: Replanted — Android

**English** | [Русский](README.ru.md)

An Android (arm64) port of the PS5 version of **Plants vs. Zombies: Replanted** (PPSA29802), built on the
[AnyPS5](https://github.com/boykopovar/AnyPS5) emulator: the game's x86-64 code runs through an embedded
[box64](https://github.com/ptitSeb/box64), PS5 graphics (AGC) are translated to Vulkan and rendered by the
**Turnip** (Mesa) driver loaded via [libadrenotools](https://github.com/bylaws/libadrenotools).

> ⚠️ **The game is not included in this repository or in the APK.** You need your own legally obtained,
> **decrypted** dump of the game (the folder containing `eboot.bin`). This repository does not contain or
> distribute any game or PS5 firmware files.

## Screenshots

<table>
<tr><td colspan="3"><img src="docs/screenshots/menu-touch.jpg" alt="Main menu with touch controls"></td></tr>
<tr><td><img src="docs/screenshots/title.jpg" alt="Title screen"></td><td><img src="docs/screenshots/level-select.jpg" alt="Level select"></td><td><img src="docs/screenshots/level.jpg" alt="Level 1-6"></td></tr>
</table>
<sub>Snapdragon 8 Elite. Top: the main menu with the built-in touch controls (the layout is editable in Settings).</sub>


## Download

Get the APK from [Releases](https://github.com/SFEZSergey/ReplantedAndroid/releases) (currently a beta).

## Requirements

- Android 8.0+ (API 26), arm64-v8a.
- **An Adreno (Snapdragon) GPU** — the bundled Turnip driver only works on Adreno (tested on Adreno 830, Snapdragon 8 Elite).
- 8 GB of RAM or more recommended; ~5 GB of free space for the game.

## Installing and running

1. Install the APK.
2. In the launcher tap **Dump folder** and pick the game's dump folder (the one with `eboot.bin`).
3. Tap **Import and play** — the launcher copies the game into the app's private storage, extracts the ELF and
   prepares the runtime. After that the button reads **Play**.

**⚙ Settings**:
- *Graphics*
  - **GPU driver** — the built-in Turnip, the phone's system Vulkan driver, or your own driver package
    (an adrenotools `.zip` with `meta.json`, as used by Yuzu/Eden/Winlator). If the chosen driver fails to load,
    the built-in Turnip is used.
  - **GPU turbo** — maximum GPU clocks (faster, but the phone heats up more).
  - **Frame limit 60 / 45 / 30** — against overheating.
  - **Resolution** — *Auto* (default) uses the screen's proportions but no more than the game's own 1080p frame:
    on a 1440p phone the display hardware does the upscaling instead of the GPU (less load and heat).
    *Screen* — the full panel resolution; *720p* — for weak phones.
  - **Image on a wide screen** — how the 16:9 picture fills a wider phone screen: *Fit* (black bars), *Fill*
    (cropped edges) or *Stretch*.
- *Controls*
  - **Touch controls** — a virtual gamepad over the game (the eye button at the top hides it). Hidden by default
    when a physical gamepad is connected.
  - **Layout editor** — drag the controls anywhere, resize one or all of them, hide or add buttons (right stick,
    R3), set the opacity, reset to default.
- *Language*
  - **Game language** — the languages the game is translated into (read from the dump's `param.json`; for PvZ:
    English, French, German, Spanish, Japanese, Portuguese (Brazil)), or *System* — the phone's language when the
    game has it, English otherwise. Other PS5 languages are listed separately.
  - **Launcher language** — system, English or Russian.
- *Help*
  - **Logs** — saves a zip with the game log, the app's logcat, device info and the reason of the last crash
    (no root needed). Attach it to a [bug report](https://github.com/SFEZSergey/ReplantedAndroid/issues/new/choose).

Fine-tuning is done in `env.txt` inside the game folder (`files/game/env.txt`), one `NAME=value` per line
(for example `APS5_FPS_LIMIT=45`, `APS5_NO_WORKER_AFFINITY=1`). Switches for the newer optimizations, if a
problem shows up: `BOX64_APS5_NATIVE=0` (no native replacements of the game's libc functions), `APS5_ADPF=0`
(no Android performance hints), `TU_AUTOTUNE_ALGO=bandwidth` (Turnip's default render-mode choice).

## Known issues

- **The level does not finish after the last zombie** (the reward bag or packet does not appear, the screen dims
  only partly, plants can still be placed): if the cursor rests where the last zombie dies, it picks the reward
  up while the reward is still loading (a short load that takes about a second here), and the level-end sequence
  never completes. Move the cursor away before the last zombie dies and pick the reward up once it is shown.
  The level's progress is kept; restart the game if it happens.

## Repository layout

The emulator itself (AnyPS5) is written in C++ and lives in a submodule, so GitHub's language bar only shows this
wrapper: the APK launcher (Java), the native entry point `sdl_main.c` and the bionic shim headers (C), and build scripts.


| Path | Contents |
|---|---|
| `android/` | The APK: launcher and game Activity (Java), touch controls, `native/sdl_main.c` (libmain: starts box64, Vulkan through adrenotools, environment), `build.sh`, `tools/` |
| `external/AnyPS5` | submodule (C++) — AnyPS5 fork, branch `android` (native bionic driver group, write watching, Android presentation, optimizations) |
| `external/box64` | submodule (C) — box64 fork, branch `android` (box64 as a library inside the APK, glibc compatibility on top of bionic, signals, DynaCache) |
| `patches/mesa-26.3-android.patch` | Turnip: host-memory import through KGSL, linear gralloc swapchain buffers |
| `patches/sdl2-android-udev-once.patch` | SDL2 (an AnyPS5 submodule) |
| `patches/box64-android-hwcap.patch` | box64: CPU extensions (LSE atomics, FLAGM, FRINT, CRC32…) read through bionic's `getauxval`; without it the dynarec in the app saw ASIMD only |
| `patches/anyps5-mouse-absolute.patch` | AnyPS5: the PS5 mouse absolute-position functions (Mewgenics, PPSA37318, calls them at start) |
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
git -C external/AnyPS5 apply ../../patches/anyps5-mouse-absolute.patch
```

1. **AnyPS5, native group (bionic arm64)** → `external/AnyPS5/build-bionic`:
   `cmake -S external/AnyPS5 -B external/AnyPS5/build-bionic -G Ninja -DCMAKE_TOOLCHAIN_FILE=$PWD/cmake/aarch64-bionic.cmake -DCMAKE_BUILD_TYPE=Release -DAPS5_NATIVE_GROUP=ON -DAPS5_NO_FFMPEG=ON -DANYPS5_ENABLE_SPIRV_TOOLS=OFF`
   with the targets `SDL2 aps5coreshim libSceAgcDriver libSceVideoOut libScePad libSceMouse libSceKeyboard libSceAudioOut`.
2. **AnyPS5, x86-64 PS5 libraries (PRX)** → `external/AnyPS5/build-x64s`: the same source with
   `cmake/x86_64-linux-gnu.cmake`; needs a Debian/Ubuntu x86-64 sysroot (`PVZ_SYSROOT_X86_64`) and box64 to
   run the x86 build tools (`PVZ_BOX64`, see `cmake/box64-emu.sh`).
3. **box64** (with `git -C external/box64 apply ../../patches/box64-android-hwcap.patch`) → `external/box64/build-lib`: `-DTERMUX=1 -DARM_DYNAREC=1 -DBOX64_SHARED_LIB=ON
   -DCMAKE_BUILD_TYPE=RelWithDebInfo -DCMAKE_C_FLAGS="--target=aarch64-linux-android30 -fPIC -I$PWD/compat/box64-android-compat"`.
4. **Mesa 26.3 (Turnip)**: the Mesa `26.3` branch + `patches/mesa-26.3-android.patch`, meson with
   `--cross-file cmake/mesa-android-cross.ini -Dbuildtype=release -Dvulkan-drivers=freedreno -Dgallium-drivers= -Dfreedreno-kmds=kgsl -Dplatforms=android -Dandroid-stub=true -Dandroid-libbacktrace=disabled -Dglx=disabled -Degl=disabled -Dgles1=disabled -Dgles2=disabled -Dopengl=false -Dllvm=disabled -Dzlib=enabled`
   → `MESA_BUILD_DIR`. On Termux, first point the Python scripts' shebangs at Termux's python (`termux-fix-shebang`), `/usr/bin/env` does not exist there.
5. **libadrenotools** (built per its README) → `ADRENOTOOLS_DIR`; the **AnyPS5 relinker** for arm64
   (`-DANYPS5_RELINKER_ONLY=ON`) → `RELINKER_BIN`; x86-64 runtime libraries from Debian/Ubuntu
   (`libstdc++.so.6/.5`, `libgcc_s.so.1`, `libssl/libcrypto 1.1 and 1.0.0`, `libmbed*`, `libpng12`, `libunwind`) → `X64LIB_DIR`;
   `android.jar` (API 35) → `ANDROID_JAR`.
6. `android/build.sh` → `android/out/PvZ-Replanted.apk` (signed with a debug key created on the first build).

## Licenses

The port's code is GPL-2.0 (like AnyPS5, see `LICENSE`). Components: AnyPS5 — GPL-2.0, box64 — MIT,
Mesa — MIT, SDL2 — zlib, libadrenotools — BSD-2-Clause. "Plants vs. Zombies" and related material (including
the app icon) belong to Electronic Arts / PopCap; this project is not affiliated with them.
