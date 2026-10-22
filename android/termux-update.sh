#!/usr/bin/env bash
# ==============================================================================
# AnyPS5 + Mewgenics (PPSA37318) — патчи, Turnip, APK, установка и env.txt
# Платформа: Snapdragon 8 Elite (Adreno 830) / Termux
# Запуск: bash github.sh
# Опции (перед командой): SKIP_MESA=1 — не пересобирать Turnip; KEEP_ENV=1 — не трогать env.txt;
#                          CLEAN_CACHE=1 — стереть кэш шейдеров; GAME_ID=PPSA29802 — другая игра;
#                          MEW1080=0 — оставить Mewgenics в 4K (по умолчанию 1080p: tools/mew1080.sh).
# ==============================================================================
set -uo pipefail

ok()   { echo -e "\033[32m[OK]\033[0m $*"; }
fail() { echo -e "\033[31m[FAIL]\033[0m $*"; }

# 0. Пути (первый существующий вариант)
REPO_DIR="${REPO_DIR:-$HOME/ps5-android/pvz-replanted-android}"
[ -d "$REPO_DIR" ] || REPO_DIR="$HOME/pvz-replanted-android"
A="${ANYPS5_DIR:-$HOME/ps5-android/src/AnyPS5}"
[ -d "$A" ] || A="$HOME/ps5-android/AnyPS5"
MESA="${MESA_DIR:-$HOME/ps5-android/src/mesa-26.3}"
MESA_BUILD="${MESA_BUILD:-$MESA/build-android}"
APK_DIR="${APK_DIR:-$HOME/ps5-android/apk}"
GAME_ID="${GAME_ID:-PPSA37318}"
P="$REPO_DIR/patches"

echo "=== AnyPS5 Master Build ==="
echo "Repo:   $REPO_DIR"; echo "AnyPS5: $A"; echo "Mesa:   $MESA ($MESA_BUILD)"; echo "APK:    $APK_DIR"
for d in "$REPO_DIR" "$A"; do [ -d "$d" ] || { fail "нет папки $d"; exit 1; }; done

# 1. Свежие патчи из репозитория
git -C "$REPO_DIR" pull --ff-only || fail "git pull (продолжаю с тем, что есть)"

# 2. AnyPS5: исходники как в коммите и все 6 патчей по порядку. Папки build-* в .gitignore — clean их не трогает.
echo "=== Патчи AnyPS5 ==="
git -C "$A" checkout -- . && git -C "$A" clean -fdq
for p in anyps5-mouse-absolute anyps5-volume-2darray anyps5-line-on-plane anyps5-skip-failed-shaders anyps5-pass-timing anyps5-host-ftz; do
  [ -f "$P/$p.patch" ] || { fail "нет $P/$p.patch"; exit 1; }
  if git -C "$A" apply --whitespace=nowarn "$P/$p.patch"; then ok "$p"; else fail "$p — сборка остановлена"; exit 1; fi
done

# 3. Turnip: файлы из патча — как в коммите, патч, пересборка одной библиотеки
if [ "${SKIP_MESA:-0}" != 1 ]; then
  echo "=== Turnip (Mesa) ==="
  if [ -d "$MESA/.git" ] && [ -d "$MESA_BUILD" ]; then
    git -C "$MESA" checkout -- $(grep '^+++ b/' "$P/mesa-26.3-android.patch" | cut -c7- | sort -u)
    if git -C "$MESA" apply --whitespace=nowarn "$P/mesa-26.3-android.patch"; then ok "mesa-26.3-android"; else fail "mesa-26.3-android"; exit 1; fi
    ninja -C "$MESA_BUILD" src/freedreno/vulkan/libvulkan_freedreno.so 2>&1 | tail -n 3
    [ "${PIPESTATUS[0]}" = 0 ] && ok "Turnip собран" || { fail "сборка Turnip"; exit 1; }
  else
    fail "нет $MESA/.git или $MESA_BUILD — Turnip пропущен (укажи MESA_DIR / MESA_BUILD)"
  fi
fi

# 4. Нативная группа AnyPS5 (bionic)
echo "=== libSceMouse, libSceAgcDriver ==="
cmake --build "$A/build-bionic" --target libSceMouse libSceAgcDriver -j"$(nproc)" 2>&1 | tail -n 3
[ "${PIPESTATUS[0]}" = 0 ] && ok "AnyPS5 собран" || { fail "сборка AnyPS5"; exit 1; }

# 5. APK: в папку сборки — свежие лаунчер и libmain из репозитория (build.sh там свой, с путями Termux)
echo "=== APK ==="
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
[ -f "$APK_FILE" ] || { fail "нет $APK_FILE"; exit 1; }
su -c "cp '$APK_FILE' /data/local/tmp/pvz.apk && chmod 644 /data/local/tmp/pvz.apk && pm install -r /data/local/tmp/pvz.apk" \
  && ok "APK установлен" || { fail "установка APK"; exit 1; }

# 6. env.txt игры. Всё остальное APK выставляет сам: APS5_HOST_FTZ/NAN/FMA/DPP, quad DPP, конвейер отрисовок.
#    Не дописывай сюда «ВЫКЛЮЧАТЕЛЬ=0» для переменных, которые проверяются по наличию: это их включает.
if [ "${KEEP_ENV:-0}" != 1 ]; then
  echo "=== env.txt ($GAME_ID) ==="
  su -c "
G=/data/data/org.anyps5.android/files/games/$GAME_ID
[ -d \$G ] || { echo 'игра $GAME_ID не импортирована'; exit 0; }
[ -f \$G/env.txt ] && cp \$G/env.txt \$G/env.txt.bak
cat > \$G/env.txt << 'EOF'
APS5_TEXTURE_CACHE_MIB=512
TU_DEBUG=sysmem
TU_MUTABLE_UBWC=1
APS5_PROFILE_GPU=1
EOF
[ '${CLEAN_CACHE:-0}' = 1 ] && rm -rf \$G/shader_cache
chown \$(stat -c %u:%g \$G) \$G/env.txt
chcon \$(stat -c %C \$G) \$G/env.txt
cat \$G/env.txt
" && ok "env.txt записан (старый — env.txt.bak)"
fi

# 7. Mewgenics в 1080p: холст движка и экран SDL в app.elf (проверка байтов, копия app.elf.orig1080) и
#    APS5_PRESENT_CROP в env.txt. Откат: su -c 'sh ~/ps5-android/pvz-replanted-android/tools/mew1080.sh undo' (путь Termux).
if [ "$GAME_ID" = PPSA37318 ] && [ "${MEW1080:-1}" = 1 ]; then
  echo "=== Mewgenics 1080p ==="
  su -c "sh '$REPO_DIR/tools/mew1080.sh'" | tail -n 3
fi

echo "=== ГОТОВО ==="
