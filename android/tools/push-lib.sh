#!/data/data/com.termux/files/usr/bin/bash
# Быстрая замена нативных .so в установленном APK (root, только для отладки): push-lib.sh file.so [...]
set -e
for f in "$@"; do
  su -c "D=\$(dirname \$(pm path org.anyps5.android | cut -d: -f2))/lib/arm64; C=\$(ls -Z \$D/libmain.so | cut -d' ' -f1); rm -f \$D/\$(basename '$f'); cp '$f' \$D/\$(basename '$f'); chown system:system \$D/\$(basename '$f'); chmod 755 \$D/\$(basename '$f'); chcon \$C \$D/\$(basename '$f'); echo pushed \$(basename '$f')"
done
