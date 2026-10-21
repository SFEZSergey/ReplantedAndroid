#!/data/data/com.termux/files/usr/bin/bash
# Запуск GameActivity через root и сбор логов: run-root.sh [секунды]
# Не мешать: если игра уже запущена (ты играешь), скрипт её не трогает. FORCE=1 — перезапустить всё равно.
if [ -z "$FORCE" ] && su -c "pidof org.anyps5.android" >/dev/null 2>&1; then echo "Игра запущена — не трогаю (FORCE=1 $0 чтобы перезапустить)"; exit 1; fi
T=${1:-30}
su -c "logcat -c; am force-stop org.anyps5.android; am start -n org.anyps5.android/.GameActivity >/dev/null; sleep $T; logcat -d -v brief" > ~/ps5-android/apk/logcat.txt
su -c "cat /data/data/org.anyps5.android/files/game/box64.log" > ~/ps5-android/apk/box64.log
echo "pid: $(su -c 'pidof org.anyps5.android')"
grep -E "AnyPS5|DEBUG|F libc|linker|adrenotools|freedreno|TU|turnip|SDL" ~/ps5-android/apk/logcat.txt | grep -v "ActivityTaskManager\|WindowManager\|AppsFilter" | tail -30
echo ----; tail -30 ~/ps5-android/apk/box64.log
