#!/data/data/com.termux/files/usr/bin/bash
# Пассивный профиль меню (сам ничего не запускает и не нажимает): ждёт, пока в игре пользователя
# FPS держится в диапазоне меню (30..52 два замера подряд), и снимает 8 с потоков драйвера (очередь
# и запись) с графом вызовов. Итог: ~/ps5-android/apk/menu-profile.txt.
O=~/ps5-android/apk/menu-profile.txt; : > $O
su -c 'G=/data/data/org.anyps5.android/files/game
for i in $(seq 1 2400); do
  P=$(pidof -s org.anyps5.android)
  if [ -n "$P" ]; then
    f=$(grep -a "\[fps\]" $G/box64.log | tail -2 | awk "{printf \"%d \", \$2}")
    set -- $f
    if [ -n "$2" ] && [ "$1" -ge 30 ] && [ "$1" -le 52 ] && [ "$2" -ge 30 ] && [ "$2" -le 52 ]; then
      Q=$(grep -l "agc-queue-worke" /proc/$P/task/*/comm | head -1 | cut -d/ -f5)
      R=$(grep -l "agc-draw-record" /proc/$P/task/*/comm | head -1 | cut -d/ -f5)
      echo "== fps $f threads queue $Q recorder $R"
      simpleperf record -t $Q,$R --duration 8 -f 2000 --call-graph fp -o /data/local/tmp/menu.data >/dev/null 2>&1
      for X in $Q $R; do
        echo "==== thread $X flat"; simpleperf report -i /data/local/tmp/menu.data --tids $X --sort dso,symbol -n --percent-limit 0.7 2>/dev/null | sed -n 8,70p
        echo "==== thread $X tree"; simpleperf report -i /data/local/tmp/menu.data --tids $X --children --sort symbol -n --percent-limit 2 2>/dev/null | sed -n 8,90p
      done
      exit
    fi
  fi
  sleep 3
done; echo "no menu seen"' 2>&1 | cut -c1-260 >> $O
echo done >> $O
