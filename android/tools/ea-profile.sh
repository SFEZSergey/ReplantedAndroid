#!/data/data/com.termux/files/usr/bin/bash
# Профиль 6 с с момента создания swapchain (окно заставок): все потоки + 3 самых горячих подробно.
# Перезапускает игру. Не мешать: если игра уже запущена (ты играешь), скрипт её не трогает. FORCE=1 — всё равно.
if [ -z "$FORCE" ] && su -c "pidof org.anyps5.android" >/dev/null 2>&1; then echo "Игра запущена — не трогаю (FORCE=1 $0 чтобы перезапустить)"; exit 1; fi
O=~/ps5-android/apk/ea-profile.txt
su -c 'G=/data/data/org.anyps5.android/files/game; am force-stop org.anyps5.android; sleep 1; am start -n org.anyps5.android/.GameActivity >/dev/null
for i in $(seq 1 400); do P=$(pidof org.anyps5.android); [ -n "$P" ] && grep -q "Swapchain created" $G/box64.log 2>/dev/null && break; sleep 0.1; done
simpleperf record -p $P --duration 6 -f 1000 --call-graph fp -o /data/local/tmp/ea.data >/dev/null 2>&1
simpleperf report -i /data/local/tmp/ea.data --sort tid,comm -n 2>/dev/null | sed -n 8,14p
for T in $(simpleperf report -i /data/local/tmp/ea.data --sort tid -n 2>/dev/null | sed -n 8,10p | awk "{print \$3}"); do echo "== $T"; simpleperf report -i /data/local/tmp/ea.data --tids $T --children --sort dso,symbol -n --percent-limit 5 2>/dev/null | sed -n 8,40p; done
grep "\[fps\]" $G/box64.log | head -4' > $O 2>&1
echo done >> $O
