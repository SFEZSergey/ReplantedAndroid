#!/usr/bin/env bash
# Сборка APK в Termux. Нативное (arm64, bionic) — в lib/arm64-v8a: box64, SDL2, Turnip + хуки
# adrenotools, нативная группа AnyPS5 (libSceX.prx упакована как libSceX.so). x86-64 библиотеки
# AnyPS5 (заглушки нативной группы + остальные PRX) — в assets/runtime/prx, копируются в game/libs.
# Данные игры в APK не попадают.
set -euo pipefail
# Пути (переопределяются переменными окружения, см. README):
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; APK="$ROOT/android"
PARENT="$(cd "$ROOT/.." && pwd)"

# Автоопределение SDK (android.jar)
SDK="${ANDROID_JAR:-}"
if [ -z "$SDK" ] || [ ! -f "$SDK" ]; then
  for candidate in \
    "$PARENT/deps/android-sdk/platforms/android-35/android.jar" \
    "$PARENT/deps/android-sdk/platforms/android-34/android.jar" \
    "$PARENT/deps/android-sdk/platforms/android-33/android.jar" \
    "$HOME/ps5-android/deps/android-sdk/platforms/android-35/android.jar" \
    "$HOME/ps5-android/deps/android-sdk/platforms/android-34/android.jar" \
    "$HOME/ps5-android/deps/android-sdk/platforms/android-33/android.jar" \
    "$PARENT/android-sdk/platforms/android-35/android.jar" \
    "$PARENT/android-sdk/platforms/android-34/android.jar" \
    "$PARENT/android-sdk/platforms/android-33/android.jar" \
    "$HOME/ps5-android/android-sdk/platforms/android-35/android.jar" \
    "$HOME/ps5-android/android-sdk/platforms/android-34/android.jar" \
    "$HOME/ps5-android/android-sdk/platforms/android-33/android.jar" \
    "$PARENT/apk/deps/android-sdk/platforms/android-35/android.jar" \
    "$HOME/ps5-android/apk/deps/android-sdk/platforms/android-35/android.jar" \
    "$ROOT/deps/android-sdk/platforms/android-35/android.jar" \
    "$ROOT/deps/android-sdk/platforms/android-34/android.jar" \
    "$HOME/android-sdk/platforms/android-35/android.jar"; do
    if [ -f "$candidate" ]; then SDK="$candidate"; break; fi
  done
  if [ -z "$SDK" ] || [ ! -f "$SDK" ]; then
    SDK="$(find "$PARENT" "$HOME/ps5-android" "$HOME" -maxdepth 6 -name "android.jar" 2>/dev/null | sort -V | tail -n 1 || true)"
  fi
fi

# Если android.jar не найден локально — пробуем автоматическую загрузку платформы android-35
if [ -z "$SDK" ] || [ ! -f "$SDK" ]; then
  TARGET_DIR="$ROOT/deps/android-sdk/platforms/android-35"
  [ -d "$PARENT/deps" ] && TARGET_DIR="$PARENT/deps/android-sdk/platforms/android-35"
  mkdir -p "$TARGET_DIR"
  AUTO_JAR="$TARGET_DIR/android.jar"
  echo "[*] Поиск android.jar: загрузка официальной платформы android-35 в $AUTO_JAR..."
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL -o "$AUTO_JAR" "https://raw.githubusercontent.com/Sable/android-platforms/master/android-35/android.jar" 2>/dev/null || \
    curl -fsSL -o "$AUTO_JAR" "https://github.com/Shubham-S-B/android-jar/raw/master/android-34/android.jar" 2>/dev/null || true
  elif command -v wget >/dev/null 2>&1; then
    wget -q -O "$AUTO_JAR" "https://raw.githubusercontent.com/Sable/android-platforms/master/android-35/android.jar" 2>/dev/null || true
  fi
  if [ -f "$AUTO_JAR" ] && [ -s "$AUTO_JAR" ]; then
    SDK="$AUTO_JAR"
    echo "[OK] android.jar успешно получен: $SDK"
  fi
fi

if [ -z "$SDK" ] || [ ! -f "$SDK" ]; then
  echo "======================================================================"
  echo " ОШИБКА: android.jar не найден!"
  echo " В Termux выполните быструю установку SDK:"
  echo "   mkdir -p ~/ps5-android/deps/android-sdk/platforms/android-35 && \\"
  echo "   curl -L -o ~/ps5-android/deps/android-sdk/platforms/android-35/android.jar https://raw.githubusercontent.com/Sable/android-platforms/master/android-35/android.jar"
  echo " Или укажите путь: export ANDROID_JAR=/путь/к/android.jar"
  echo "======================================================================"
  exit 1
fi
echo "[SDK] Используется: $SDK"

# Автоопределение AnyPS5 и box64
ANYPS5="${ANYPS5_DIR:-}"
if [ -z "$ANYPS5" ] || [ ! -d "$ANYPS5" ]; then
  for candidate in "$PARENT/src/AnyPS5" "$HOME/ps5-android/src/AnyPS5" "$PARENT/AnyPS5" "$ROOT/external/AnyPS5"; do
    if [ -d "$candidate" ]; then ANYPS5="$candidate"; break; fi
  done
  [ -n "$ANYPS5" ] || ANYPS5="$ROOT/external/AnyPS5"
fi

BOX64="${BOX64_DIR:-}"
if [ -z "$BOX64" ] || [ ! -d "$BOX64" ]; then
  for candidate in "$PARENT/src/box64" "$HOME/ps5-android/src/box64" "$PARENT/box64" "$ROOT/external/box64"; do
    if [ -d "$candidate" ]; then BOX64="$candidate"; break; fi
  done
  [ -n "$BOX64" ] || BOX64="$ROOT/external/box64"
fi

# Автоопределение Mesa 26.3
MESA_BUILD="${MESA_BUILD_DIR:-}"
if [ -z "$MESA_BUILD" ] || [ ! -d "$MESA_BUILD" ]; then
  for candidate in "$PARENT/src/mesa-26.3/build-android" "$HOME/ps5-android/src/mesa-26.3/build-android" "$ROOT/deps/mesa-26.3/build-android"; do
    if [ -d "$candidate" ]; then MESA_BUILD="$candidate"; break; fi
  done
  [ -n "$MESA_BUILD" ] || MESA_BUILD="$ROOT/deps/mesa-26.3/build-android"
fi

# Автоопределение Relinker и x64lib
RELINKER="${RELINKER_BIN:-}"
if [ -z "$RELINKER" ] || [ ! -f "$RELINKER" ]; then
  for candidate in "$PARENT/bin/relinker" "$HOME/ps5-android/bin/relinker" "$ROOT/deps/bin/relinker"; do
    if [ -f "$candidate" ]; then RELINKER="$candidate"; break; fi
  done
  [ -n "$RELINKER" ] || RELINKER="$ROOT/deps/bin/relinker"
fi

X64LIB="${X64LIB_DIR:-}"
if [ -z "$X64LIB" ] || [ ! -d "$X64LIB" ]; then
  for candidate in "$PARENT/x64lib" "$HOME/ps5-android/x64lib" "$ROOT/deps/x64lib"; do
    if [ -d "$candidate" ]; then X64LIB="$candidate"; break; fi
  done
  [ -n "$X64LIB" ] || X64LIB="$ROOT/deps/x64lib"
fi

NDK_SHIM="${NDK_SHIM_DIR:-$ROOT/compat/ndk-shim}"
SDL="$ANYPS5/3rdparty/SDL2/android-project/app/src/main/java"; OUT="$APK/out"; GEN="$OUT/gen"; CLASSES="$OUT/classes"
BIONIC="${ANYPS5_BIONIC_BUILD:-$ANYPS5/build-bionic}"

# Автоопределение libadrenotools
ADRENO="${ADRENOTOOLS_DIR:-}"
if [ -z "$ADRENO" ] || [ ! -d "$ADRENO" ]; then
  for candidate in "$PARENT/src/libadrenotools-master" "$HOME/ps5-android/src/libadrenotools-master" "$PARENT/src/libadrenotools" "$ROOT/deps/libadrenotools"; do
    if [ -d "$candidate" ]; then ADRENO="$candidate"; break; fi
  done
  [ -n "$ADRENO" ] || ADRENO="$ROOT/deps/libadrenotools"
fi

X86STUBS="${ANYPS5_X64_BUILD:-$ANYPS5/build-x64s}/core/libs/libs"; X86LIBS="${X86LIBS:-$X86STUBS}"
LIB="$OUT/lib/arm64-v8a"
rm -rf "$OUT"; mkdir -p "$GEN" "$CLASSES" "$LIB" "$OUT/assets/runtime/prx" "$OUT/assets/runtime/x64lib"
aapt package -f -m -J "$GEN" -S "$APK/res" -M "$APK/AndroidManifest.xml" -I "$SDK" -F "$OUT/resources.ap_"
find "$APK/src" "$SDL" "$GEN" -name '*.java' -print > "$OUT/sources.list"
javac -nowarn -source 8 -target 8 -classpath "$SDK" -d "$CLASSES" $(cat "$OUT/sources.list") > "$OUT/javac.log" 2>&1 || { grep -v "^warning\|^Note" "$OUT/javac.log"; exit 1; }
grep -v "^warning\|^Note" "$OUT/javac.log" || true
d8 --min-api 26 --lib "$SDK" --output "$OUT" $(find "$CLASSES" -name "*.class" -print)

# Нативные библиотеки
PREFIX="${PREFIX:-/data/data/com.termux/files/usr}"
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

# Синхронизация с альтернативной папкой apk в Termux
if [ -d "$PARENT/apk" ] && [ "$PARENT/apk" != "$APK" ]; then
  mkdir -p "$PARENT/apk/out" 2>/dev/null || true
  cp -f "$OUT/PvZ-Replanted.apk" "$PARENT/apk/out/PvZ-Replanted.apk" 2>/dev/null || true
  echo "Синхронизировано: $PARENT/apk/out/PvZ-Replanted.apk"
fi
