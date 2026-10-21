#!/data/data/com.termux/files/usr/bin/bash
# Ждёт нового процесса игры (до 10 мин), через 3 с после старта снимает 12 с профиля всех потоков.
O=~/ps5-android/apk/startup-profile.txt
su -c 'OLD=$(pidof org.anyps5.android); for i in $(seq 1 1200); do P=$(pidof org.anyps5.android); [ -n "$P" ] && [ "$P" != "$OLD" ] && break; [ -z "$P" ] && OLD=""; sleep 0.5; done; echo pid=$P; sleep 3
simpleperf record -p $P --duration 12 -f 500 --call-graph fp -o /data/local/tmp/perf-start.data >/dev/null 2>&1
simpleperf report -i /data/local/tmp/perf-start.data --sort tid,comm -n 2>/dev/null | sed -n 8,16p
for T in $(simpleperf report -i /data/local/tmp/perf-start.data --sort tid -n 2>/dev/null | sed -n 8,11p | awk "{print \$3}"); do echo "== $T"; simpleperf report -i /data/local/tmp/perf-start.data --tids $T --children --sort dso,symbol -n --percent-limit 10 2>/dev/null | sed -n 8,26p; done
grep "\[fps\]" /data/data/org.anyps5.android/files/game/box64.log | head -6' > $O 2>&1
echo done >> $O
