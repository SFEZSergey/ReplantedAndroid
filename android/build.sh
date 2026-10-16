#!/usr/bin/env bash
# Сборка APK в Termux. Нативное (arm64, bionic) — в lib/arm64-v8a: box64, SDL2, Turnip + хуки
# adrenotools, нативная группа AnyPS5 (libSceX.prx упакована как libSceX.so). x86-64 библиотеки
# AnyPS5 (заглушки нативной группы + остальные PRX) — в assets/runtime/prx, копируются в game/libs.
# Данные игры в APK не попадают.
set -euo pipefail
# Пути (переопределяются переменными окружения, см. README):
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; APK="$ROOT/android"
SDK="${ANDROID_JAR:-$ROOT/deps/android-sdk/platforms/android-35/android.jar}"
ANYPS5="${ANYPS5_DIR:-$ROOT/external/AnyPS5}"; BOX64="${BOX64_DIR:-$ROOT/external/box64}"
MESA_BUILD="${MESA_BUILD_DIR:-$ROOT/deps/mesa-26.3/build-android}"
RELINKER="${RELINKER_BIN:-$ROOT/deps/bin/relinker}"; X64LIB="${X64LIB_DIR:-$ROOT/deps/x64lib}"
NDK_SHIM="${NDK_SHIM_DIR:-$ROOT/compat/ndk-shim}"
SDL="$ANYPS5/3rdparty/SDL2/android-project/app/src/main/java"; OUT="$APK/out"; GEN="$OUT/gen"; CLASSES="$OUT/classes"
BIONIC="${ANYPS5_BIONIC_BUILD:-$ANYPS5/build-bionic}"; ADRENO="${ADRENOTOOLS_DIR:-$ROOT/deps/libadrenotools}"
X86STUBS="${ANYPS5_X64_BUILD:-$ANYPS5/build-x64s}/core/libs/libs"; X86LIBS="${X86LIBS:-$X86STUBS}"
LIB="$OUT/lib/arm64-v8a"
rm -rf "$OUT"; mkdir -p "$GEN" "$CLASSES" "$LIB" "$OUT/assets/runtime/prx" "$OUT/assets/runtime/x64lib"
aapt package -f -m -J "$GEN" -S "$APK/res" -M "$APK/AndroidManifest.xml" -I "$SDK" -F "$OUT/resources.ap_"
find "$APK/src" "$SDL" "$GEN" -name '*.java' -print > "$OUT/sources.list"
javac -nowarn -source 8 -target 8 -classpath "$SDK" -d "$CLASSES" $(cat "$OUT/sources.list") > "$OUT/javac.log" 2>&1 || { grep -v "^warning\|^Note" "$OUT/javac.log"; exit 1; }
grep -v "^warning\|^Note" "$OUT/javac.log" || true
d8 --min-api 26 --lib "$SDK" --output "$OUT" $(find "$CLASSES" -name "*.class" -print)

# Нативные библиотеки
cp "${BOX64_BUILD:-$BOX64/build-lib}/libbox64.so" "$LIB/"
cp "$PREFIX/lib/libandroid-sysv-semaphore.so" "$PREFIX/lib/libiconv.so" "$PREFIX/lib/libc++_shared.so" "$LIB/"
cp "$RELINKER" "$LIB/librelinker.so"
cp "$BIONIC/3rdparty/SDL2/libSDL2.so.2.33.0" "$LIB/libSDL2.so"
patchelf --set-soname libSDL2.so "$LIB/libSDL2.so"
cp "$MESA_BUILD/src/freedreno/vulkan/libvulkan_freedreno.so" "$LIB/"
patchelf --replace-needed libz.so.1 libz.so "$LIB/libvulkan_freedreno.so"
cp "$ADRENO"/build/src/hook/lib{hook_impl,main_hook,file_redirect_hook,gsl_alloc_hook}.so "$LIB/"
cp "$BIONIC/core/libs/prx/aps5native/libaps5coreshim.so" "$LIB/"
GROUP="libSceAgcDriver libSceVideoOut libScePad libSceMouse libSceKeyboard libSceAudioOut"
for lib in $GROUP; do
  cp "$BIONIC/core/libs/libs/unpatched/$lib.prx" "$LIB/$lib.so"
  patchelf --set-soname "$lib.so" --replace-needed libSDL2.so.0 libSDL2.so "$LIB/$lib.so"
  for dep in $GROUP; do patchelf --replace-needed "$dep.prx" "$dep.so" "$LIB/$lib.so"; done
done
clang --target=aarch64-linux-android30 -fPIC -shared -O2 -Wall -Wextra -I"$ADRENO/include" "$APK/native/sdl_main.c" \
  -L"$LIB" -lbox64 "$ADRENO/build/libadrenotools.a" "$ADRENO/build/lib/linkernsbypass/liblinkernsbypass.a" -lc++_shared -landroid -ldl -llog \
  -Wl,-soname,libmain.so -o "$LIB/libmain.so"
clang --target=aarch64-linux-android26 -fPIC -shared -O2 -Wall -Wextra -isystem "$NDK_SHIM/include" "$APK/native/entry.c" -o "$LIB/libanyps5_android.so"

# x86-64 часть: все обычные файлы рабочей раскладки (без отладочных хуков) + свежие заглушки.
for f in "$X86LIBS"/*.prx; do [ -L "$f" ] || cp "$f" "$OUT/assets/runtime/prx/"; done
for lib in $GROUP; do cp "$X86STUBS/$lib.prx" "$OUT/assets/runtime/prx/"; done
cp "$X64LIB"/* "$OUT/assets/runtime/x64lib/"

# Компактность: отладочная информация не нужна в APK (таблица символов остаётся — имена в бэктрейсах),
# ассеты сжимаются (лаунчер распаковывает их потоком при импорте).
for f in "$LIB"/*.so "$OUT"/assets/runtime/prx/*.prx; do llvm-strip --strip-debug "$f"; done

cp "$OUT/resources.ap_" "$OUT/AnyPS5-unsigned.apk"
(cd "$OUT" && zip -q -9 -r AnyPS5-unsigned.apk assets && zip -q -r AnyPS5-unsigned.apk classes.dex lib)
KEY="$APK/debug.keystore"
if [ ! -f "$KEY" ]; then keytool -genkeypair -keystore "$KEY" -storepass android -keypass android -alias androiddebugkey -dname 'CN=Android Debug,O=Android,C=US' -keyalg RSA -keysize 2048 -validity 10000 >/dev/null 2>&1; fi
zipalign -f -p 4 "$OUT/AnyPS5-unsigned.apk" "$OUT/AnyPS5-aligned.apk"
apksigner sign --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --ks "$KEY" --ks-pass pass:android --key-pass pass:android --ks-key-alias androiddebugkey --out "$OUT/PvZ-Replanted.apk" "$OUT/AnyPS5-aligned.apk"
apksigner verify "$OUT/PvZ-Replanted.apk"
echo "Built $OUT/PvZ-Replanted.apk"
