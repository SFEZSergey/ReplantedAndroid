#!/usr/bin/env bash
# Обновление в Termux одной командой: свежие патчи → AnyPS5 и Turnip → APK → установка (root) → env.txt.
#   bash ~/ps5-android/pvz-replanted-android/android/termux-update.sh
# Каталоги переопределяются переменными: REPO_DIR, ANYPS5_DIR, MESA_DIR, MESA_BUILD, APK_DIR, GAME_ID.
# SKIP_MESA=1 — не пересобирать Turnip; CLEAN_CACHE=1 — стереть кэш шейдеров игры; KEEP_ENV=1 — не трогать env.txt.
set -uo pipefail

REPO_DIR="${REPO_DIR:-$HOME/ps5-android/pvz-replanted-android}"
[ -d "$REPO_DIR" ] || REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
A="${ANYPS5_DIR:-$HOME/ps5-android/src/AnyPS5}"
MESA="${MESA_DIR:-$HOME/ps5-android/src/mesa-26.3}"
MESA_BUILD="${MESA_BUILD:-$MESA/build-android}"
APK_DIR="${APK_DIR:-$HOME/ps5-android/apk}"
GAME_ID="${GAME_ID:-PPSA37318}"
P="$REPO_DIR/patches"
ok() { echo -e "\033[32m[OK]\033[0m $*"; }
fail() { echo -e "\033[31m[FAIL]\033[0m $*"; }

echo "repo: $REPO_DIR"; echo "AnyPS5: $A"; echo "Mesa: $MESA"; echo "APK: $APK_DIR"
git -C "$REPO_DIR" pull --ff-only || fail "git pull (продолжаю с тем, что есть)"

# 1. AnyPS5: исходники как в коммите, затем все патчи по порядку. Папки build-* в .gitignore, clean их не трогает.
git -C "$A" checkout -- . && git -C "$A" clean -fdq
for p in anyps5-mouse-absolute anyps5-volume-2darray anyps5-line-on-plane anyps5-skip-failed-shaders anyps5-pass-timing anyps5-host-ftz; do
  if git -C "$A" apply --whitespace=nowarn "$P/$p.patch"; then ok "$p"; else fail "$p"; exit 1; fi
done

# 2. Turnip: файлы, которые меняет патч, — как в коммите; патч; пересборка одной библиотеки.
if [ "${SKIP_MESA:-0}" != 1 ] && [ -d "$MESA/.git" ]; then
  git -C "$MESA" checkout -- $(grep '^+++ b/' "$P/mesa-26.3-android.patch" | cut -c7- | sort -u)
  if git -C "$MESA" apply --whitespace=nowarn "$P/mesa-26.3-android.patch"; then ok "mesa-26.3-android"; else fail "mesa-26.3-android"; exit 1; fi
  ninja -C "$MESA_BUILD" src/freedreno/vulkan/libvulkan_freedreno.so 2>&1 | tail -3
  [ "${PIPESTATUS[0]}" = 0 ] && ok "Turnip" || { fail "Turnip"; exit 1; }
fi

# 3. Нативная группа AnyPS5 (bionic).
cmake --build "$A/build-bionic" --target libSceMouse libSceAgcDriver -j"$(nproc)" 2>&1 | tail -3
[ "${PIPESTATUS[0]}" = 0 ] && ok "libSceMouse libSceAgcDriver" || { fail "AnyPS5 bionic"; exit 1; }

# 4. APK: в рабочую папку сборки — свежие лаунчер и libmain из репозитория (build.sh там свой, с путями Termux).
if [ -d "$APK_DIR" ]; then
  cp "$REPO_DIR/android/native/sdl_main.c" "$APK_DIR/native/"
  cp -r "$REPO_DIR/android/src/." "$APK_DIR/src/"
  cp -r "$REPO_DIR/android/res/." "$APK_DIR/res/"
  cp "$REPO_DIR/android/AndroidManifest.xml" "$APK_DIR/"
  (cd "$APK_DIR" && bash build.sh) || { fail "build.sh"; exit 1; }
  APK_FILE="$APK_DIR/out/PvZ-Replanted.apk"
else
  (cd "$REPO_DIR/android" && bash build.sh) || { fail "build.sh"; exit 1; }
  APK_FILE="$REPO_DIR/android/out/PvZ-Replanted.apk"
fi
su -c "cp '$APK_FILE' /data/local/tmp/pvz.apk && chmod 644 /data/local/tmp/pvz.apk && pm install -r /data/local/tmp/pvz.apk" && ok "APK установлен" || { fail "установка APK"; exit 1; }

# 5. env.txt игры. Всё, что не указано, APK выставляет сам (APS5_HOST_FTZ/NAN/FMA/DPP, quad DPP, конвейер
# отрисовок). Переменная, которой здесь нет, проверяется по наличию: «=0» её не выключает, а включает.
if [ "${KEEP_ENV:-0}" != 1 ]; then
  su -c "
G=/data/data/org.anyps5.android/files/games/$GAME_ID
[ -d \$G ] || exit 0
[ -f \$G/env.txt ] && cp \$G/env.txt \$G/env.txt.bak
cat > \$G/env.txt << 'EOF'
APS5_TEXTURE_CACHE_MIB=512
TU_DEBUG=sysmem
TU_MUTABLE_UBWC=1
APS5_PROFILE_GPU=1
EOF
[ '${CLEAN_CACHE:-0}' = 1 ] && rm -rf \$G/shader_cache
chown \$(stat -c %u:%g \$G) \$G/env.txt; chcon \$(stat -c %C \$G) \$G/env.txt
cat \$G/env.txt
" && ok "env.txt ($GAME_ID)"
fi
echo "Готово."
