#!/data/data/com.termux/files/usr/bin/bash
# Отложенный профиль: ждёт $1 с, затем загрузка потоков, частота GPU, FPS и simpleperf самого горячего потока.
sleep ${1:-90}
O=~/ps5-android/apk/level-profile.txt
su -c 'P=$(pidof org.anyps5.android); echo pid=$P; dumpsys activity activities 2>/dev/null | grep -m1 topResumedActivity
snap(){ for t in /proc/$P/task/*; do echo "${t##*/} $(cut -d" " -f14,15 $t/stat) $(cat $t/comm)"; done; }
snap > /data/local/tmp/s1; sleep 10; snap > /data/local/tmp/s2
awk "NR==FNR{a[\$1]=\$2+\$3; next} {d=\$2+\$3-a[\$1]; if(d>30) printf \"%5.1f%% %s %s\n\", d/10, \$1, \$4}" /data/local/tmp/s1 /data/local/tmp/s2 | sort -rn | head -6 > /data/local/tmp/loads; cat /data/local/tmp/loads
echo gpu=$(cat /sys/class/kgsl/kgsl-3d0/devfreq/cur_freq) busy=$(cat /sys/class/kgsl/kgsl-3d0/gpu_busy_percentage)
grep "\[fps\]" /data/data/org.anyps5.android/files/game/box64.log | tail -6
T=$(head -1 /data/local/tmp/loads | awk "{print \$2}")
simpleperf record -t $T --duration 8 -f 1000 --call-graph fp -o /data/local/tmp/perf-level.data >/dev/null 2>&1
simpleperf report -i /data/local/tmp/perf-level.data --children --sort symbol -n --percent-limit 5 2>/dev/null | sed -n 8,40p' > $O 2>&1
echo done >> $O
