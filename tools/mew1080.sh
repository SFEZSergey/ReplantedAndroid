#!/system/bin/sh
# Mewgenics (PPSA37318): всё в 1080p — холст движка (render_scale 1.0 -> 0.5) и экран/окно SDL (3840x2160 -> 1920x1080).
# Нужен APK с патчем anyps5-host-ftz от 22.10 или новее (APS5_PRESENT_CROP).
# Запуск (игра закрыта): su -c 'sh /sdcard/Download/mew1080.sh'        откат: su -c 'sh /sdcard/Download/mew1080.sh undo'
# Каждое место проверяется: ставится, только если там исходные байты; уже исправленное пропускается; иначе — ничего не меняется.
G=/data/data/org.anyps5.android/files/games/PPSA37318
cd "$G" || { echo "нет $G"; exit 1; }
# Игра рисует кадр 1080p в левый верхний угол буферов вывода 4K: AnyPS5 выводит на экран только этот угол.
crop_on() {
  [ -f env.txt ] || touch env.txt
  sed -i "/^APS5_PRESENT_CROP=/d" env.txt; echo "APS5_PRESENT_CROP=1920x1080" >> env.txt
  chown $(stat -c %u:%g .) env.txt; chcon $(stat -c %C .) env.txt 2>/dev/null
  echo "env.txt: APS5_PRESENT_CROP=1920x1080"
}
if [ "$1" = undo ]; then
  [ -f app.elf.orig1080 ] && cp -p app.elf.orig1080 app.elf && echo "возвращён исходный app.elf" || echo "нет app.elf.orig1080"
  [ -f env.txt ] && sed -i "/^APS5_PRESENT_CROP=/d" env.txt && echo "env.txt: APS5_PRESENT_CROP убран"
  exit 0
fi
SITES='
15222337 000f000070080000 8007000038040000 \200\007\000\000\070\004\000\000
15224306 000f000070080000 8007000038040000 \200\007\000\000\070\004\000\000
15231890 000f000070080000 8007000038040000 \200\007\000\000\070\004\000\000
15232065 000f000070080000 8007000038040000 \200\007\000\000\070\004\000\000
15234762 000f000070080000 8007000038040000 \200\007\000\000\070\004\000\000
15235997 000f000070080000 8007000038040000 \200\007\000\000\070\004\000\000
19424222 000f000070080000 8007000038040000 \200\007\000\000\070\004\000\000
15235735 70080000 38040000 \070\004\000\000
15235822 000f0000 80070000 \200\007\000\000
15235828 000f0000 80070000 \200\007\000\000
15235892 70080000 38040000 \070\004\000\000
15235940 000f0000 80070000 \200\007\000\000
15235946 70080000 38040000 \070\004\000\000
15222139 000000000000f03f 000000000000e03f \000\000\000\000\000\000\340\077
'
bytes_at() { od -An -tx1 -j "$1" -N"$2" app.elf | tr -d ' \n'; }
todo=0; bad=0
printf '%s\n' "$SITES" | while read -r off old new oct; do
  [ -z "$off" ] && continue
  cur=$(bytes_at "$off" $(( ${#old} / 2 )))
  if [ "$cur" = "$new" ]; then echo "$off: уже исправлено"
  elif [ "$cur" = "$old" ]; then echo "$off: будет исправлено"
  else echo "$off: НЕОЖИДАННЫЕ байты $cur"; fi
done > /data/local/tmp/mew1080.check
cat /data/local/tmp/mew1080.check
grep -q "НЕОЖИДАННЫЕ" /data/local/tmp/mew1080.check && { echo "ничего не изменено: другая сборка app.elf"; exit 1; }
grep -q "будет исправлено" /data/local/tmp/mew1080.check || { echo "всё уже исправлено"; crop_on; exit 0; }
[ -f app.elf.orig1080 ] || cp -p app.elf app.elf.orig1080
printf '%s\n' "$SITES" | while read -r off old new oct; do
  [ -z "$off" ] && continue
  [ "$(bytes_at "$off" $(( ${#old} / 2 )))" = "$old" ] && printf "$oct" | dd of=app.elf bs=1 seek="$off" conv=notrunc 2>/dev/null
done
printf '%s\n' "$SITES" | while read -r off old new oct; do
  [ -z "$off" ] && continue
  [ "$(bytes_at "$off" $(( ${#old} / 2 )))" = "$new" ] || echo "$off: НЕ ЗАПИСАЛОСЬ"
done
crop_on
echo "готово (копия исходного файла: app.elf.orig1080)"
