#!/data/data/com.termux/files/usr/bin/bash
# Ждёт запуска игры, затем каждые 40 с (5 раз): загрузка потоков 5 с + профиль самого горячего потока 6 с.
O=~/ps5-android/apk/play-profile.txt; : > $O
su -c 'until [ -n "$(pidof org.anyps5.android)" ]; do sleep 1; done' 
for round in 1 2 3 4 5; do
  sleep 40
  su -c 'P=$(pidof org.anyps5.android); [ -z "$P" ] && { echo "== round: no game"; exit; }
echo "== round $(date +%T) fps: $(grep "\[fps\]" /data/data/org.anyps5.android/files/game/box64.log | tail -3 | awk "{printf \"%d \", \$2}") top=$(dumpsys activity activities 2>/dev/null | grep -m1 topResumedActivity | grep -o "[a-z.]*/[.A-Za-z]*")"
snap(){ for t in /proc/$P/task/*; do echo "${t##*/} $(cut -d" " -f14,15 $t/stat) $(cat $t/comm)"; done; }
snap > /data/local/tmp/s1; sleep 5; snap > /data/local/tmp/s2
awk "NR==FNR{a[\$1]=\$2+\$3; next} {d=\$2+\$3-a[\$1]; if(d>25) printf \"%5.1f%% %s %s\n\", d/5, \$1, \$4}" /data/local/tmp/s1 /data/local/tmp/s2 | sort -rn | head -5 > /data/local/tmp/loads; cat /data/local/tmp/loads
echo gpu=$(cat /sys/class/kgsl/kgsl-3d0/devfreq/cur_freq) busy=$(cat /sys/class/kgsl/kgsl-3d0/gpu_busy_percentage)
for T in $(head -2 /data/local/tmp/loads | awk "{print \$2}"); do
  simpleperf record -t $T --duration 4 -f 1000 --call-graph fp -o /data/local/tmp/pp.data >/dev/null 2>&1
  echo "-- $T"; simpleperf report -i /data/local/tmp/pp.data --children --sort dso,symbol -n --percent-limit 6 2>/dev/null | sed -n 8,34p
done' >> $O 2>&1
done
echo done >> $O
