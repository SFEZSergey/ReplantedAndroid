#!/system/bin/sh
# Тестовая раскладка игры в данные приложения (нужен root): копирует рабочую Termux-раскладку
# PvZ в /data/data/org.anyps5.android/files/game, чинит симлинки на относительные.
set -e
S=${1:-/data/data/com.termux/files/home/ps5-android/games/PPSA29802}
A=${2:-/data/data/com.termux/files/home/ps5-android/apk/out/assets/runtime}
P=/data/data/org.anyps5.android
D=$P/files/game
mkdir -p $D/app0 $D/libs $D/x64lib
cp $S/run/app.elf $S/run/*.registry.json $D/
for d in _sd _sd_mem devlog download0; do rm -rf $D/$d; cp -r $S/run/$d $D/; done
rm -rf $D/app0/prx $D/app0/sce_module; mkdir -p $D/app0/prx
for f in $S/run/app0/prx/*.guest.prx; do cp $f $D/app0/prx/; done
cp -r $S/run/app0/sce_module $D/app0/
[ -d $D/dump ] || cp -r $S/dump $D/dump.tmp && { [ -d $D/dump ] || mv $D/dump.tmp $D/dump; }
for l in $D/dump/Media/Modules/* $D/dump/Media/Plugins/*; do
  [ -L $l ] || continue
  t=$(readlink $l); case $t in /*/run/app0/prx/*) rm $l; ln -s ../../../app0/prx/${t##*/} $l;; esac
done
rm -f $D/app0/Media $D/app0/sce_sys; ln -s ../dump/Media $D/app0/Media; ln -s ../dump/sce_sys $D/app0/sce_sys
cp $A/prx/* $D/libs/; cp $A/x64lib/* $D/x64lib/
for n in Il2cppUserAssemblies PS5Util; do rm -f $D/libs/$n.prx; ln -s ../app0/prx/$n.prx.guest.prx $D/libs/$n.prx; done
U=$(stat -c %u $P); CTX=$(ls -dZ $P | cut -d' ' -f1)
chown -h $U:$U $P/files; chown -R -h $U:$U $D; chmod -R u+rwX $D; chmod +x $D/app.elf
chcon -h $CTX $P/files; chcon -R -h $CTX $D
echo staged; du -sh $D
