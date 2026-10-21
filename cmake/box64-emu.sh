#!/usr/bin/env bash
# Запуск x86-64 утилит сборки AnyPS5 (nid_patcher, glslang) через box64 на arm64.
# PVZ_BOX64 — бинарник box64 (Termux/glibc), PVZ_X64LIB и PVZ_SYSROOT_X86_64 — x86-64 библиотеки.
: "${PVZ_BOX64:?set PVZ_BOX64 to a box64 binary}"
: "${PVZ_SYSROOT_X86_64:?set PVZ_SYSROOT_X86_64 to an x86-64 Debian/Ubuntu sysroot}"
exec env -i HOME="$HOME" TMPDIR="${TMPDIR:-/tmp}" PATH="${PREFIX:-/usr}/glibc/bin:${PREFIX:-/usr}/bin" BOX64_LOG=0 BOX64_NOBANNER=1 \
  BOX64_LD_LIBRARY_PATH="${PVZ_X64LIB:-}:$PVZ_SYSROOT_X86_64/usr/lib/x86_64-linux-gnu" "$PVZ_BOX64" "$@"
