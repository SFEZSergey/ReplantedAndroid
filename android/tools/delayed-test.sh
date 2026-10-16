#!/data/data/com.termux/files/usr/bin/bash
# Запуск через 45 с, наблюдение 150 с: тики потоков, рост лога, стеки на 60-й секунде.
# Не мешать: если игра уже запущена (ты играешь), скрипт её не трогает. FORCE=1 — перезапустить всё равно.
if [ -z "$FORCE" ] && su -c "pidof org.anyps5.android" >/dev/null 2>&1; then echo "Игра запущена — не трогаю (FORCE=1 $0 чтобы перезапустить)"; exit 1; fi
O=~/ps5-android/apk/delayed.txt; : > $O
sleep 45
if [ -z "$FORCE" ] && su -c "pidof org.anyps5.android" >/dev/null 2>&1; then echo "Игра запущена — не трогаю" >> $O; exit 1; fi
su -c 'logcat -c; am force-stop org.anyps5.android; am start -n org.anyps5.android/.GameActivity >/dev/null'
for s in 20 40 60 90 120 150; do
  sleep $(( s==20 ? 20 : (s==90||s==120||s==150 ? 30 : 20) ))
  su -c 'P=$(pidof org.anyps5.android); echo "== t='$s' pid=$P top=$(dumpsys activity activities 2>/dev/null | grep -m1 topResumedActivity | grep -o "[a-z.]*/[A-Za-z.]*")"; for t in /proc/$P/task/*; do echo "$(cat $t/comm) $(cut -d" " -f3,14,15 $t/stat) $(cat $t/wchan)"; done | sort -k3 -n -r | head -8; wc -l < /data/data/org.anyps5.android/files/game/box64.log' >> $O 2>&1
  [ $s = 60 ] && su -c 'timeout 40 debuggerd -b $(pidof org.anyps5.android)' > ~/ps5-android/apk/stacks.txt 2>&1
done
su -c 'cat /data/data/org.anyps5.android/files/game/box64.log' > ~/ps5-android/apk/box64.log
su -c 'logcat -d -v brief' > ~/ps5-android/apk/logcat.txt
echo done >> $O
