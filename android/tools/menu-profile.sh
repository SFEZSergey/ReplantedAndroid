#!/data/data/com.termux/files/usr/bin/bash
# Пассивный профиль потока драйвера (ждёт запуска игры пользователем, сам ничего не запускает):
# через DELAYS секунд (по умолчанию 75 — меню, затем ещё 125 — уровень) — 8 с записи самого загруженного потока,
# затем плоский профиль, вызывающие malloc/operator new и дерево. Итог: ~/ps5-android/apk/menu-profile.txt
O=~/ps5-android/apk/menu-profile.txt; : > $O; DELAYS=${DELAYS:-75 125}
su -c 'until [ -n "$(pidof org.anyps5.android)" ]; do sleep 1; done'
for DELAY in $DELAYS; do sleep $DELAY; echo "######## after +$DELAY s" >> $O
su -c 'P=$(pidof org.anyps5.android); [ -z "$P" ] && { echo "no game"; exit; }
snap(){ for t in /proc/$P/task/*; do echo "${t##*/} $(cut -d" " -f14,15 $t/stat) $(cat $t/comm)"; done; }
snap > /data/local/tmp/s1; sleep 3; snap > /data/local/tmp/s2
awk "NR==FNR{a[\$1]=\$2+\$3; next} {d=\$2+\$3-a[\$1]; if(d>10) printf \"%5.1f%% %s %s\n\", d/3, \$1, \$4}" /data/local/tmp/s1 /data/local/tmp/s2 | sort -rn | head -8 > /data/local/tmp/loads
echo "== loads"; cat /data/local/tmp/loads
echo "== fps: $(grep "\[fps\]" /data/data/org.anyps5.android/files/game/box64.log | tail -3 | awk "{printf \"%d \", \$2}") cpu max: $(cat /sys/devices/system/cpu/cpufreq/policy0/scaling_max_freq) $(cat /sys/devices/system/cpu/cpufreq/policy6/scaling_max_freq)"
T=$(head -1 /data/local/tmp/loads | awk "{print \$2}")
simpleperf record -t $T --duration 8 -f 2000 --call-graph fp -o /data/local/tmp/prof.data >/dev/null 2>&1
echo "== flat"; simpleperf report -i /data/local/tmp/prof.data --sort dso,symbol -n --percent-limit 0.7 2>/dev/null | sed -n 8,70p
echo "== malloc callers"; simpleperf report -i /data/local/tmp/prof.data -g caller -g callee --symbols "operator new(unsigned long)" --percent-limit 1 --children 2>/dev/null | sed -n 1,200p
echo "== tree"; simpleperf report -i /data/local/tmp/prof.data --children --sort symbol -n --percent-limit 2 2>/dev/null | sed -n 8,90p
cp /data/local/tmp/prof.data /data/local/tmp/prof-$(date +%H%M%S).data' >> $O 2>&1
done
echo done
