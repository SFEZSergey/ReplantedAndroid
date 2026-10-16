#!/data/data/com.termux/files/usr/bin/bash
# Тестовый прогон игры автопилотом (только когда пользователь разрешил и телефоном не пользуется):
# кладёт сценарий (SCENARIO=<файл> или встроенный: титульник -> меню -> уровень), запускает игру через
# лаунчер (рантайм обновляется как при «Играть»), нажимает кнопки виртуальным геймпадом внутри игры,
# снимает экран на каждой метке (SHOTS=0 — без снимков), затем закрывает игру и всё убирает.
# Отказывается, если экран включён и на нём другое приложение или уже идёт игра (FORCE=1 — всё равно).
# PERF_AT=<метка> — профиль потока записи 8 с с этой метки (perf.txt). PROFILE=1 добавляет APS5_PROFILE_DRAW=1, EXTRA_ENV="A=1 B=2" — свои переменные. Итог: ~/ps5-android/apk/autopilot/<время>/ (log, summary.txt, снимки).
set -u
PKG=org.anyps5.android
GAME=/data/data/$PKG/files/game
OUT=~/ps5-android/apk/autopilot/$(date +%Y%m%d-%H%M%S); mkdir -p "$OUT"
TMP=${CLAUDE_JOB_DIR:-$HOME}/tmp; mkdir -p "$TMP"

awake=$(su -c "dumpsys power" 2>/dev/null | grep -m1 -o "mWakefulness=[A-Za-z]*" | cut -d= -f2)
top=$(su -c "dumpsys activity activities" 2>/dev/null | grep -m1 -E "topResumedActivity|mResumedActivity" | grep -o "[a-z0-9_.]*/[A-Za-z0-9_.]*" | head -1)
echo "screen: $awake, top: $top"
if [ "${FORCE:-0}" != 1 ]; then
    if su -c "pidof $PKG" >/dev/null; then echo "REFUSED: the game is already running (the user may be playing)"; exit 2; fi
    if [ "$awake" = Awake ] && [ -n "$top" ] && ! echo "$top" | grep -q "launcher\|$PKG"; then echo "REFUSED: the screen is on with $top (the phone is in use)"; exit 2; fi
fi

if [ -n "${SCENARIO:-}" ]; then cp "$SCENARIO" "$TMP/autopilot.txt"; else cat > "$TMP/autopilot.txt" <<'EOF'
# Титульник -> главное меню (60 с) -> «Начать приключение» -> □ «Играть!» -> выбор растений -> старт ->
# игра (90 с).
wait 30
mark title
press cross
wait 12
mark menu
wait 60
mark menu-end
press cross
wait 10
mark adventure
press square
wait 25
mark chooser
press cross
wait 1
press right
press cross
wait 1
press right
press cross
wait 1
press right
press cross
wait 1
press right
press cross
wait 1
press right
press cross
wait 2
press cross
wait 10
mark level
wait 90
mark level-end
done
EOF
fi
LEN=$(awk '$1=="wait"{s+=$2} END{print int(s)}' "$TMP/autopilot.txt")

# Сценарий и env.txt — с владельцем и меткой SELinux приложения; env.txt восстанавливается в конце.
su -c "cp $GAME/env.txt $GAME/env.txt.autopilot-backup 2>/dev/null; cp $TMP/autopilot.txt $GAME/autopilot.txt
  { cat $GAME/env.txt.autopilot-backup 2>/dev/null | grep -v '^APS5_AUTOPILOT='; echo APS5_AUTOPILOT=$GAME/autopilot.txt; [ '${PROFILE:-0}' = 1 ] && echo APS5_PROFILE_DRAW=1; for e in ${EXTRA_ENV:-}; do echo \$e; done; } > $GAME/env.txt.new && mv $GAME/env.txt.new $GAME/env.txt
  chown \$(stat -c %u:%g $GAME) $GAME/autopilot.txt $GAME/env.txt; chcon \$(ls -Z -d $GAME | cut -d' ' -f1) $GAME/autopilot.txt $GAME/env.txt"
cleanup() {
    su -c "am force-stop $PKG; rm -f $GAME/autopilot.txt; if [ -f $GAME/env.txt.autopilot-backup ]; then mv $GAME/env.txt.autopilot-backup $GAME/env.txt; else : > $GAME/env.txt; fi
      chown \$(stat -c %u:%g $GAME) $GAME/env.txt; chcon \$(ls -Z -d $GAME | cut -d' ' -f1) $GAME/env.txt"
    [ "$awake" != Awake ] && su -c "input keyevent KEYCODE_SLEEP"
    [ -n "${OLD0:-}" ] && su -c "echo $OLD0 > /sys/devices/system/cpu/cpufreq/policy0/scaling_max_freq; echo $OLD6 > /sys/devices/system/cpu/cpufreq/policy6/scaling_max_freq"
}
trap cleanup EXIT

# FIXFREQ="<кГц policy0> <кГц policy6>": на время прогона потолок частоты ядер (одинаковые условия для сравнения
# сборок, независимо от нагрева); после прогона прежние значения возвращаются.
if [ -n "${FIXFREQ:-}" ]; then
    set -- $FIXFREQ
    OLD0=$(su -c "cat /sys/devices/system/cpu/cpufreq/policy0/scaling_max_freq"); OLD6=$(su -c "cat /sys/devices/system/cpu/cpufreq/policy6/scaling_max_freq")
    su -c "echo $1 > /sys/devices/system/cpu/cpufreq/policy0/scaling_max_freq; echo $2 > /sys/devices/system/cpu/cpufreq/policy6/scaling_max_freq"
    echo "cpu max fixed: $(su -c 'cat /sys/devices/system/cpu/cpufreq/policy0/scaling_max_freq /sys/devices/system/cpu/cpufreq/policy6/scaling_max_freq' | tr '\n' ' ')"
fi
[ "$awake" != Awake ] && su -c "input keyevent KEYCODE_WAKEUP"
su -c "am start -n $PKG/.MainActivity --ez autostart true" >/dev/null
echo "running ~$LEN s"
seen=0; deadline=$(( $(date +%s) + LEN + 120 ))
: > "$OUT/samples.txt"
while [ "$(date +%s)" -lt "$deadline" ]; do
    sleep 2
    # Сэмпл: время, процессорные тики игры (utime+stime), загрузка GPU %, температура большого ядра (м°C).
    su -c 'P=$(pidof -s '$PKG'); [ -n "$P" ] && echo "$(date +%s.%N | cut -c1-14) $(cut -d" " -f14,15 /proc/$P/stat | tr " " "+" | bc) $(cat /sys/class/kgsl/kgsl-3d0/gpu_busy_percentage | tr -d " %") $(cat /sys/class/thermal/thermal_zone*/type | grep -n "^cpu-1-1-0$" | cut -d: -f1 | { read n; cat /sys/class/thermal/thermal_zone$((n-1))/temp; })"' >> "$OUT/samples.txt" 2>/dev/null
    echo "M $seen" >> "$OUT/samples.txt"
    su -c "cat $GAME/box64.log" > "$TMP/autopilot-box64.log" 2>/dev/null
    marks=$(grep -a -c "^\[autopilot\].*mark" "$TMP/autopilot-box64.log")
    while [ "$seen" -lt "$marks" ]; do
        seen=$((seen + 1))
        name=$(grep -a "^\[autopilot\].*mark" "$TMP/autopilot-box64.log" | sed -n "${seen}p" | awk '{print $NF}')
        echo "mark $name"
        [ "${SHOTS:-1}" = 1 ] && su -c "screencap -p" > "$OUT/$seen-$name.png"
        if [ "$name" = "${PERF_AT:-}" ]; then
            # Профиль потока записи (или потока очереди, PERF_THREAD=agc-queue-worke) на этой метке, 8 с.
            su -c 'P=$(pidof -s '$PKG'); T=$(grep -l "'${PERF_THREAD:-agc-draw-record}'" /proc/$P/task/*/comm | head -1 | cut -d/ -f5); simpleperf record -t $T --duration 8 -f 2000 --call-graph fp -o /data/local/tmp/ap.data >/dev/null 2>&1' &
        fi
    done
    grep -a -q "^\[autopilot\].*done" "$TMP/autopilot-box64.log" && break
    if ! su -c "pidof $PKG" >/dev/null && [ "$(date +%s)" -gt $(( deadline - LEN - 90 )) ]; then echo "THE GAME EXITED"; break; fi
done
cp "$TMP/autopilot-box64.log" "$OUT/box64.log"
if [ -n "${PERF_AT:-}" ]; then
    wait
    su -c "simpleperf report -i /data/local/tmp/ap.data --sort symbol -n --percent-limit 0.8 2>/dev/null | sed -n 8,60p; echo; simpleperf report -i /data/local/tmp/ap.data --children --sort symbol --percent-limit 2 2>/dev/null | sed -n 8,90p" | cut -c1-220 > "$OUT/perf.txt"
fi

# Сводка: FPS по участкам между метками, вылеты, строки статистики последних участков.
awk 'BEGIN{seg="intro"} /^\[autopilot\].*mark/{if(n) printf "%-14s fps avg %5.1f min %3d max %3d (%d samples)\n", seg, s/n, mn, mx, n; seg=$NF; s=0; n=0; mn=999; mx=0; next}
     /^\[fps\]/{v=$2+0; s+=v; n++; if(v<mn)mn=v; if(v>mx)mx=v}
     END{if(n) printf "%-14s fps avg %5.1f min %3d max %3d (%d samples)\n", seg, s/n, mn, mx, n}' "$OUT/box64.log" > "$OUT/summary.txt"
# Нагрузка по участкам: ядер занято (тики/100 Гц), GPU %, температура ядра в конце участка.
names=$(grep -a "^\[autopilot\].*mark" "$OUT/box64.log" | awk '{print $NF}' | tr '\n' ' ')
awk -v names="intro $names" 'BEGIN{n=split(names, nm, " ")}
  /^M /{seg=$2; next}
  NF==4{ if(seg in t0){} else {t0[seg]=$1; c0[seg]=$2}; t1[seg]=$1; c1[seg]=$2; g[seg]+=$3; k[seg]++; temp[seg]=$4 }
  END{for(i=0;i<n;i++) if(k[i]>1) printf "load %-12s cpu cores %.2f, gpu busy %3.0f%%, cpu temp %.1f C\n", nm[i+1], (c1[i]-c0[i])/100/(t1[i]-t0[i]), g[i]/k[i], temp[i]/1000}' "$OUT/samples.txt" >> "$OUT/summary.txt"
grep -a -E "Ask to run at NULL|Unhandled signal|\[crash\]|SIGABRT" "$OUT/box64.log" | head -5 >> "$OUT/summary.txt"
for k in "\[pipeline\]" "\[recipe-why\]" "\[reusable-why\]" "\[recipe\] draw"; do grep -a "$k" "$OUT/box64.log" | tail -2 >> "$OUT/summary.txt"; done
echo "cpu max now: $(su -c 'cat /sys/devices/system/cpu/cpufreq/policy0/scaling_max_freq /sys/devices/system/cpu/cpufreq/policy6/scaling_max_freq' | tr '\n' ' ')" >> "$OUT/summary.txt"
cat "$OUT/summary.txt" | cut -c1-400
echo "result: $OUT"
