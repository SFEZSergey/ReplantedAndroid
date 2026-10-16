#!/data/data/com.termux/files/usr/bin/bash
# Профиль первых 10 с от появления процесса: все потоки, главный поток подробно.
O=~/ps5-android/apk/startup-profile2.txt
su -c 'OLD=$(pidof org.anyps5.android); for i in $(seq 1 2400); do P=$(pidof org.anyps5.android); [ -n "$P" ] && [ "$P" != "$OLD" ] && break; [ -z "$P" ] && OLD=""; sleep 0.25; done; echo pid=$P
simpleperf record -p $P --duration 10 -f 1000 --call-graph fp -o /data/local/tmp/perf-s2.data >/dev/null 2>&1
simpleperf report -i /data/local/tmp/perf-s2.data --sort tid,comm -n 2>/dev/null | sed -n 8,14p
M=$(for t in /proc/$P/task/*; do [ "$(cat $t/comm)" = "app.elf" ] && echo ${t##*/}; done | sort -n | head -1); echo main=$M
simpleperf report -i /data/local/tmp/perf-s2.data --tids $M --children --sort dso,symbol -n --percent-limit 3 2>/dev/null | sed -n 8,60p
grep "\[fps\]" /data/data/org.anyps5.android/files/game/box64.log | head -5' > $O 2>&1
echo done >> $O
