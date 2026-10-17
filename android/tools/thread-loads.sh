#!/data/data/com.termux/files/usr/bin/bash
# Пассивный замер (сам ничего не запускает): ждёт, пока пользователь откроет игру, затем каждые 10 с
# пишет FPS, температуру и 15 самых загруженных потоков (% одного ядра; время между срезами — точное,
# срез одним awk) до выхода из игры. Итог: ~/ps5-android/apk/thread-loads.txt.
O=~/ps5-android/apk/thread-loads.txt; : > $O
su -c 'until [ -n "$(pidof org.anyps5.android)" ]; do sleep 2; done'
su -c 'grep -a "aps5hot" /data/data/org.anyps5.android/files/game/box64.log' >> $O
while su -c 'pidof org.anyps5.android' >/dev/null; do
su -c 'P=$(pidof -s org.anyps5.android); [ -z "$P" ] && exit
snap(){ awk "{print FILENAME, \$14+\$15, \$2}" /proc/$P/task/*/stat 2>/dev/null; }
t1=$(cut -d" " -f1 /proc/uptime); snap > /data/local/tmp/tl1; sleep 3; t2=$(cut -d" " -f1 /proc/uptime); snap > /data/local/tmp/tl2
n=$(cat /sys/class/thermal/thermal_zone*/type | grep -n "^cpu-1-1-0$" | cut -d: -f1)
echo "== $(date +%H:%M:%S) fps $(grep -a "\[fps\]" /data/data/org.anyps5.android/files/game/box64.log | tail -2 | awk "{printf \"%d \", \$2}")temp $(( $(cat /sys/class/thermal/thermal_zone$((n-1))/temp) / 1000 ))C"
awk -v t1=$t1 -v t2=$t2 "NR==FNR{a[\$1]=\$2; next} (\$1 in a){d=\$2-a[\$1]; tot+=d; if(d>2) printf \"%5.1f%% %s\n\", d/(t2-t1), \$3} END{printf \"%5.1f%% total\n\", tot/(t2-t1)}" /data/local/tmp/tl1 /data/local/tmp/tl2 | sort -rn | head -16' >> $O
sleep 7
done
echo "game exited" >> $O
