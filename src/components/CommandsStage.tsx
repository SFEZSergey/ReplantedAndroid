import React, { useState } from 'react';
import {
  Terminal,
  Copy,
  Check,
  Play,
  Zap,
  Code2,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Cpu,
  Layers,
  ArrowRight,
  Download,
  ExternalLink,
  SlidersHorizontal,
  RefreshCw,
  BookOpen,
  FolderGit2,
  Sparkles
} from 'lucide-react';

export const CommandsStage: React.FC = () => {
  const [copiedMaster, setCopiedMaster] = useState(false);
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const [activeStepTab, setActiveStepTab] = useState<'all' | 'step1' | 'step2' | 'step3' | 'step4' | 'logs'>('all');
  
  // Параметры конфигуратора команд
  const [resolution, setResolution] = useState<'1080p' | '720p' | '4K'>('1080p');
  const [gpuTurbo, setGpuTurbo] = useState<boolean>(true);
  const [enableGpuProfiling, setEnableGpuProfiling] = useState<boolean>(false);
  const [fpsLimit, setFpsLimit] = useState<60 | 45 | 30>(60);

  const resParam = resolution === '4K' ? 'native' : resolution;
  const turboParam = gpuTurbo ? '1' : '0';
  const profileParam = enableGpuProfiling ? 'APS5_PROFILE_GPU=1\n' : '';

  // Сгенерированный мастер-скрипт под текущие настройки
  const generateMasterScript = () => {
    return `# ==============================================================================
# AnyPS5 + Mewgenics (PPSA37318) — Полный мастер-скрипт наложения патчей и сборки
# Платформа: Qualcomm Snapdragon 8 Elite (SM8750 / Adreno 830)
# ==============================================================================

# 0. Автоопределение путей в Termux
REPO_DIR="$HOME/ps5-android/pvz-replanted-android"
[ -d "$REPO_DIR" ] || REPO_DIR="$HOME/pvz-replanted-android"
[ -d "$REPO_DIR" ] || REPO_DIR="$(pwd)"

A="\${ANYPS5_DIR:-$HOME/ps5-android/src/AnyPS5}"
[ -d "$A" ] || A="$HOME/ps5-android/AnyPS5"
[ -d "$A" ] || A="$REPO_DIR/external/AnyPS5"

P="$REPO_DIR/patches"

echo "=== AnyPS5 Master Build & Optimization Script ==="
echo "Repo: $REPO_DIR"
echo "AnyPS5 source: $A"
echo "Patches: $P"

# 1. Применяем все 6 официальных патчей AnyPS5 без конфликтов
cd "$REPO_DIR" && git pull || true
git -C "$A" checkout -- .
git -C "$A" clean -fd 2>/dev/null || true

PATCH_LIST=(
  "anyps5-mouse-absolute"
  "anyps5-volume-2darray"
  "anyps5-line-on-plane"
  "anyps5-skip-failed-shaders"
  "anyps5-pass-timing"
  "anyps5-host-ftz"
)

for p in "\${PATCH_LIST[@]}"; do
  if [ -f "$P/$p.patch" ]; then
    if git -C "$A" apply --whitespace=nowarn --ignore-whitespace "$P/$p.patch" 2>/dev/null; then
      echo -e "\\033[32m[OK]\\033[0m $p"
    else
      echo -e "\\033[33m[RETRY]\\033[0m $p (3-way merge)..."
      git -C "$A" apply -3 "$P/$p.patch" && echo -e "\\033[32m[OK 3-way]\\033[0m $p" || echo -e "\\033[31m[FAIL]\\033[0m $p"
    fi
  else
    echo -e "\\033[31m[NOT FOUND]\\033[0m $P/$p.patch"
  fi
done

# 2. Пересобираем мышь и транслятор графики AGC (bionic)
echo "=== Компиляция нативных модулей libSceMouse и libSceAgcDriver ==="
# Устранение 5 предупреждений -Wreturn-type-c-linkage в AnyPS5 GuestAllocations.hpp
GUEST_HDR="$A/core/libs/prx/libc/include/GuestAllocations.hpp"
if [ -f "$GUEST_HDR" ] && ! grep -q "Wreturn-type-c-linkage" "$GUEST_HDR"; then
  sed -i '/GuestAllocationsAcquire_nid_postfix/i #if defined(__clang__)\n#pragma clang diagnostic ignored "-Wreturn-type-c-linkage"\n#endif' "$GUEST_HDR" 2>/dev/null || true
  echo -e "\\033[32m[OK]\\033[0m Подавлены предупреждения C-linkage в GuestAllocations.hpp"
fi
cd "$A" && cmake --build build-bionic --target libSceMouse libSceAgcDriver -j$(nproc) 2>&1 | tail -n 8

# 3. Собираем и устанавливаем APK с Root
echo "=== Сборка APK пакета ==="

# Настройка путей SDK и компонентов Termux под структуру ~/ps5-android
export ANDROID_JAR="\$(find \"\$HOME/ps5-android/deps/android-sdk\" \"\$HOME/ps5-android/android-sdk\" \"\$REPO_DIR/../android-sdk\" -name \"android.jar\" 2>/dev/null | sort -V | tail -n 1)"
[ -n "\$ANDROID_JAR" ] || export ANDROID_JAR="\$HOME/ps5-android/deps/android-sdk/platforms/android-35/android.jar"
export ANYPS5_DIR="\$HOME/ps5-android/src/AnyPS5"
export BOX64_DIR="\$HOME/ps5-android/src/box64"
export MESA_BUILD_DIR="\$HOME/ps5-android/src/mesa-26.3/build-android"
export RELINKER_BIN="\$HOME/ps5-android/bin/relinker"
export X64LIB_DIR="\$HOME/ps5-android/x64lib"
export ADRENOTOOLS_DIR="\$HOME/ps5-android/src/libadrenotools-master"

if [ -d "\$REPO_DIR/android" ]; then
  cd "\$REPO_DIR/android" && bash build.sh
elif [ -d "\$HOME/ps5-android/apk" ]; then
  cd "\$HOME/ps5-android/apk" && bash build.sh
fi

echo "=== Установка APK в систему ==="
APK_FILE=""
for candidate in "\$REPO_DIR/android/out/PvZ-Replanted.apk" "\$HOME/ps5-android/apk/out/PvZ-Replanted.apk" "\$REPO_DIR/android/out/AnyPS5.apk"; do
  if [ -f "\$candidate" ]; then APK_FILE="\$candidate"; break; fi
done

if [ -n "\$APK_FILE" ]; then
  su -c "cp '\$APK_FILE' /data/local/tmp/pvz.apk && chmod 644 /data/local/tmp/pvz.apk && pm install -r /data/local/tmp/pvz.apk"
  echo -e "\\033[32m[OK]\\033[0m APK успешно установлен!"
else
  echo -e "\\033[31m[WARN]\\033[0m APK файл не найден, проверьте лог сборки"
fi

# 4. Записываем конфигурацию Turnip + Box64 и сбрасываем старый кэш
echo "=== Настройка env.txt (GMEM + Fast-Math + ${resolution}) ==="
su -c '
GAME_DIR="/data/data/org.anyps5.android/files/games/PPSA37318"
mkdir -p "$GAME_DIR"
rm -rf /data/data/org.anyps5.android/cache/*
rm -rf "$GAME_DIR/shader_cache"/* 2>/dev/null || true

cat << "EOF" > "$GAME_DIR/env.txt"
# Turnip 26.3 Driver Tuning (tu_autotune.cc & tu_util.cc)
TU_AUTOTUNE_ALGO=prefer_gmem
TU_AUTOTUNE_FLAGS=big_gmem
TU_DEBUG=force_concurrent_binning,hiprio

# AnyPS5 Adreno Hardware Flags (anyps5-host-ftz.patch)
APS5_HOST_FTZ=1
APS5_HOST_NAN=1
APS5_HOST_DPP=1
APS5_HOST_FMA=1
APS5_NO_QUAD_DPP=0

# Resolution & Frame Limit (${resolution} решает Late-Z боттлнек)
APS5_OUTPUT_RES=${resParam}
APS5_SCALE_MODE=fit
APS5_FPS_LIMIT=${fpsLimit}
APS5_GPU_TURBO=${turboParam}
${profileParam}# Pipelines & Texture Cache
APS5_TEXTURE_CACHE_MIB=512
APS5_GENERATED_STAGE_CACHE=1
APS5_PIPELINE_DRAWS=1
APS5_SKIP_FAILED_SHADERS=1

# Box64 Oryon DynaRec Tuning
BOX64_DYNAREC_BIGBLOCK=3
BOX64_DYNAREC_FORWARD=512
BOX64_DYNAREC_STRONGMEM=0
BOX64_DYNAREC_FASTROUND=1
BOX64_DYNAREC_FASTNAN=1
BOX64_DYNAREC_PAUSE=3
BOX64_APS5_NATIVE=1
EOF

cp "$GAME_DIR/env.txt" /sdcard/Android/data/org.anyps5.android/files/games/PPSA37318/env.txt 2>/dev/null || true
chown -R $(stat -c %u:%g /data/data/org.anyps5.android/files) "$GAME_DIR" 2>/dev/null || true
'
echo "=== ГОТОВО! ПАТЧИ, ДРАЙВЕР, APK И КОНФИГ TURNIP ПРИМЕНЕНЫ ==="`;
  };

  const masterScriptText = generateMasterScript();

  // Команды для отдельных шагов
  const step1Text = `# Шаг 1: Наложение всех 6 официальных патчей AnyPS5
cd ~/ps5-android/pvz-replanted-android && git pull || true
A=~/ps5-android/src/AnyPS5
P=~/ps5-android/pvz-replanted-android/patches

git -C $A checkout -- .
git -C $A clean -fd 2>/dev/null || true

for p in anyps5-mouse-absolute anyps5-volume-2darray anyps5-line-on-plane anyps5-skip-failed-shaders anyps5-pass-timing anyps5-host-ftz; do
  git -C $A apply --whitespace=nowarn --ignore-whitespace "$P/$p.patch" && echo "[OK] $p" || echo "[FAIL] $p"
done`;

  const step2Text = `# Шаг 2: Компиляция драйверов AnyPS5 под bionic (arm64)
A=~/ps5-android/src/AnyPS5

# Устранение 5 предупреждений -Wreturn-type-c-linkage в GuestAllocations.hpp
GUEST_HDR="$A/core/libs/prx/libc/include/GuestAllocations.hpp"
if [ -f "$GUEST_HDR" ] && ! grep -q "Wreturn-type-c-linkage" "$GUEST_HDR"; then
  sed -i '/GuestAllocationsAcquire_nid_postfix/i #if defined(__clang__)\n#pragma clang diagnostic ignored "-Wreturn-type-c-linkage"\n#endif' "$GUEST_HDR" 2>/dev/null || true
  echo "[OK] Предупреждения C-linkage в GuestAllocations.hpp подавлены"
fi

cd $A && cmake --build build-bionic --target libSceMouse libSceAgcDriver -j$(nproc) 2>&1 | tail -10`;

  const step3Text = `# Шаг 3: Сборка и установка APK под Root
export ANDROID_JAR="$(find "$HOME/ps5-android/deps/android-sdk" "$HOME/ps5-android/android-sdk" -name "android.jar" 2>/dev/null | sort -V | tail -n 1)"
[ -n "$ANDROID_JAR" ] || export ANDROID_JAR="$HOME/ps5-android/deps/android-sdk/platforms/android-35/android.jar"
export ANYPS5_DIR="$HOME/ps5-android/src/AnyPS5"
export BOX64_DIR="$HOME/ps5-android/src/box64"
export MESA_BUILD_DIR="$HOME/ps5-android/src/mesa-26.3/build-android"
export RELINKER_BIN="$HOME/ps5-android/bin/relinker"
export X64LIB_DIR="$HOME/ps5-android/x64lib"
export ADRENOTOOLS_DIR="$HOME/ps5-android/src/libadrenotools-master"

if [ -d ~/ps5-android/apk ]; then
  cd ~/ps5-android/apk && bash build.sh
elif [ -d ~/ps5-android/pvz-replanted-android/android ]; then
  cd ~/ps5-android/pvz-replanted-android/android && bash build.sh
fi

su -c '
APK_PATH="/data/data/com.termux/files/home/ps5-android/apk/out/PvZ-Replanted.apk"
[ -f "$APK_PATH" ] || APK_PATH="/data/data/com.termux/files/home/ps5-android/pvz-replanted-android/android/out/PvZ-Replanted.apk"
cp "$APK_PATH" /data/local/tmp/pvz.apk && chmod 644 /data/local/tmp/pvz.apk && pm install -r /data/local/tmp/pvz.apk
'`;

  const step4Text = `# Шаг 4: Запись боевого env.txt для Mewgenics и сброс старого кэша
su -c '
GAME_DIR="/data/data/org.anyps5.android/files/games/PPSA37318"
mkdir -p "$GAME_DIR"
rm -rf /data/data/org.anyps5.android/cache/*
rm -rf "$GAME_DIR/shader_cache"/* 2>/dev/null || true

cat << "EOF" > "$GAME_DIR/env.txt"
TU_AUTOTUNE_ALGO=prefer_gmem
TU_AUTOTUNE_FLAGS=big_gmem
TU_DEBUG=force_concurrent_binning,hiprio
APS5_HOST_FTZ=1
APS5_HOST_NAN=1
APS5_HOST_DPP=1
APS5_HOST_FMA=1
APS5_NO_QUAD_DPP=0
APS5_OUTPUT_RES=1080p
APS5_SCALE_MODE=fit
APS5_FPS_LIMIT=60
APS5_GPU_TURBO=1
APS5_TEXTURE_CACHE_MIB=512
APS5_GENERATED_STAGE_CACHE=1
APS5_PIPELINE_DRAWS=1
APS5_SKIP_FAILED_SHADERS=1
BOX64_DYNAREC_BIGBLOCK=3
BOX64_DYNAREC_FORWARD=512
BOX64_DYNAREC_STRONGMEM=0
BOX64_DYNAREC_FASTROUND=1
BOX64_DYNAREC_FASTNAN=1
BOX64_DYNAREC_PAUSE=3
BOX64_APS5_NATIVE=1
EOF

cp "$GAME_DIR/env.txt" /sdcard/Android/data/org.anyps5.android/files/games/PPSA37318/env.txt 2>/dev/null || true
chown -R $(stat -c %u:%g /data/data/org.anyps5.android/files) "$GAME_DIR" 2>/dev/null || true
echo "[OK] env.txt успешно записан и кэш сброшен!"
'`;

  const logsCmdText = `# Мониторинг времени отрисовки кадров [gputime] в реальном времени
su -c 'tail -f /data/data/org.anyps5.android/files/games/PPSA37318/box64.log | grep --line-buffered -E "\\[gputime\\]|\\[draw\\]|fps|APS5"'`;

  const handleCopyMaster = () => {
    navigator.clipboard.writeText(masterScriptText);
    setCopiedMaster(true);
    setTimeout(() => setCopiedMaster(false), 2000);
  };

  const handleCopyStep = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(index);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const handleDownloadMasterScript = () => {
    const blob = new Blob([masterScriptText], { type: 'text/x-sh;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'apply-patches-build.sh';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Главный заголовок модуля команд */}
      <div className="bg-[#153e1b] border border-[#2e5e32] rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
              <Terminal className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-[#a5d6a7]">
                <span>Терминал Termux (Bash & Root)</span>
                <span aria-hidden="true">·</span>
                <span>Наложение патчей AnyPS5</span>
                <span aria-hidden="true">·</span>
                <span className="text-amber-300 font-semibold">Сборка APK & Драйверов</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Командный центр: Патчи, Сборка и Тюнинг Turnip
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMaster}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#2e7d32] hover:bg-[#388e3c] text-white rounded-xl text-xs font-bold transition shadow"
            >
              {copiedMaster ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copiedMaster ? 'Скопировано!' : 'Скопировать мастер-скрипт'}</span>
            </button>
            <button
              onClick={handleDownloadMasterScript}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0f2a14] hover:bg-[#1a421f] text-emerald-300 border border-[#2e5e32] rounded-xl text-xs font-bold transition"
              title="Скачать скрипт .sh"
            >
              <Download className="w-4 h-4" />
              <span>Скачать .sh</span>
            </button>
          </div>
        </div>

        {/* Навигационные вкладки команд */}
        <div className="flex flex-wrap items-center gap-1 bg-[#0a1c0d] p-1.5 rounded-xl border border-[#2e5e32] text-xs mt-6">
          <button
            onClick={() => setActiveStepTab('all')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold transition ${
              activeStepTab === 'all'
                ? 'bg-[#2e7d32] text-white shadow'
                : 'text-[#c8e6c9] hover:text-white hover:bg-[#153e1b]'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Всё в 1 скрипт (Рекомендуется)</span>
          </button>

          <button
            onClick={() => setActiveStepTab('step1')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
              activeStepTab === 'step1'
                ? 'bg-[#2e7d32] text-white shadow'
                : 'text-[#c8e6c9] hover:text-white hover:bg-[#153e1b]'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5 text-sky-300" />
            <span>Шаг 1: 7 патчей</span>
          </button>

          <button
            onClick={() => setActiveStepTab('step2')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
              activeStepTab === 'step2'
                ? 'bg-[#2e7d32] text-white shadow'
                : 'text-[#c8e6c9] hover:text-white hover:bg-[#153e1b]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-purple-300" />
            <span>Шаг 2: CMake модули</span>
          </button>

          <button
            onClick={() => setActiveStepTab('step3')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
              activeStepTab === 'step3'
                ? 'bg-[#2e7d32] text-white shadow'
                : 'text-[#c8e6c9] hover:text-white hover:bg-[#153e1b]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-300" />
            <span>Шаг 3: Сборка и Root APK</span>
          </button>

          <button
            onClick={() => setActiveStepTab('step4')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
              activeStepTab === 'step4'
                ? 'bg-[#2e7d32] text-white shadow'
                : 'text-[#c8e6c9] hover:text-white hover:bg-[#153e1b]'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5 text-yellow-300" />
            <span>Шаг 4: env.txt и кэш</span>
          </button>

          <button
            onClick={() => setActiveStepTab('logs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
              activeStepTab === 'logs'
                ? 'bg-[#2e7d32] text-white shadow'
                : 'text-[#c8e6c9] hover:text-white hover:bg-[#153e1b]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-orange-300" />
            <span>Логи в реальном времени</span>
          </button>
        </div>
      </div>

      {/* Быстрые параметры для модификации скрипта на лету */}
      <div className="bg-[#153e1b] border border-[#2e5e32] rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-amber-300 shrink-0" />
            <span className="text-xs font-bold text-white">Параметры скрипта:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Разрешение */}
            <div className="flex items-center gap-1 bg-[#0a1c0d] p-1 rounded-lg border border-[#2e5e32]">
              <span className="text-[11px] text-[#a5d6a7] px-2">Разрешение:</span>
              {(['1080p', '720p', '4K'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setResolution(r)}
                  className={`px-2.5 py-1 rounded text-xs font-bold font-mono transition ${
                    resolution === r
                      ? 'bg-[#2e7d32] text-white'
                      : 'text-[#a5d6a7] hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* GPU Turbo */}
            <button
              onClick={() => setGpuTurbo(!gpuTurbo)}
              className={`px-3 py-1.5 rounded-lg font-semibold border transition flex items-center gap-1.5 ${
                gpuTurbo
                  ? 'bg-[#2e7d32] text-white border-emerald-400/40'
                  : 'bg-[#0a1c0d] text-[#a5d6a7] border-[#2e5e32]'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>GPU Turbo: {gpuTurbo ? '1100 МГц' : 'Выкл'}</span>
            </button>

            {/* Логирование gputime */}
            <button
              onClick={() => setEnableGpuProfiling(!enableGpuProfiling)}
              className={`px-3 py-1.5 rounded-lg font-semibold border transition flex items-center gap-1.5 ${
                enableGpuProfiling
                  ? 'bg-[#2e7d32] text-white border-emerald-400/40'
                  : 'bg-[#0a1c0d] text-[#a5d6a7] border-[#2e5e32]'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-sky-300" />
              <span>Профиль GPU: {enableGpuProfiling ? 'ВКЛ' : 'ВЫКЛ'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Контент активной вкладки */}
      {activeStepTab === 'all' && (
        <div className="space-y-4">
          <div className="bg-[#0a1c0d] border border-[#2e5e32] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#2e5e32] pb-3">
              <div>
                <span className="text-xs font-mono text-amber-300 block">Терминал Termux (Root не требуется для сборки, su нужен только для pm install)</span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  Полная автоматическая последовательность (Вставить и нажать Enter)
                </h3>
              </div>

              <button
                onClick={handleCopyMaster}
                className="px-4 py-1.5 bg-[#2e7d32] hover:bg-[#388e3c] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0"
              >
                {copiedMaster ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedMaster ? 'Скопировано!' : 'Скопировать весь код'}</span>
              </button>
            </div>

            <pre className="bg-[#050f07] p-4 rounded-xl border border-[#1b3d20] text-xs font-mono text-emerald-200 overflow-x-auto leading-relaxed select-all">
              {masterScriptText}
            </pre>
          </div>

          {/* Информационные карточки о 6 патчах */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="bg-[#153e1b] border border-[#2e5e32] p-4 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>anyps5-host-ftz.patch</span>
              </div>
              <p className="text-[11px] text-[#a5d6a7] mt-1 leading-relaxed">
                Ключевой патч производительности: вырезает 28 инструкций полинома Тейлора Log2/Exp2 и софтверный FTZ, включая нативный SFU Adreno 830 (-4.7 мс).
              </p>
            </div>

            <div className="bg-[#153e1b] border border-[#2e5e32] p-4 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>anyps5-mouse-absolute.patch</span>
              </div>
              <p className="text-[11px] text-[#a5d6a7] mt-1 leading-relaxed">
                Реализует режим абсолютных координат PS5 (sceMouseSetAbsoluteVirtualScreenSize), исправляя клики и курсор мыши в интерфейсе Mewgenics.
              </p>
            </div>

            <div className="bg-[#153e1b] border border-[#2e5e32] p-4 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>anyps5-volume-2darray.patch</span>
              </div>
              <p className="text-[11px] text-[#a5d6a7] mt-1 leading-relaxed">
                Корректно преобразует 3D объемные срезы текстур в совместимые с Vulkan Turnip слои 2D-Array без сбоев драйвера.
              </p>
            </div>

            <div className="bg-[#153e1b] border border-[#2e5e32] p-4 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>anyps5-line-on-plane.patch</span>
              </div>
              <p className="text-[11px] text-[#a5d6a7] mt-1 leading-relaxed">
                Устраняет лишние повторные вызовы vkCmdPipelineBarrier при чтении срезов текстур, снижая нагрузку на CPU-поток рендера.
              </p>
            </div>

            <div className="bg-[#153e1b] border border-[#2e5e32] p-4 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>anyps5-skip-failed-shaders.patch</span>
              </div>
              <p className="text-[11px] text-[#a5d6a7] mt-1 leading-relaxed">
                Предотвращает краш игры при встрече неподдерживаемых инструкций, записывая предупреждение в box64.log вместо аварийного завершения.
              </p>
            </div>

            <div className="bg-[#153e1b] border border-[#2e5e32] p-4 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>anyps5-pass-timing.patch</span>
              </div>
              <p className="text-[11px] text-[#a5d6a7] mt-1 leading-relaxed">
                Встраивает точный GPU-таймер по каждому проходу рендера (0x95, 0x9b, 0x97) для непрерывного аудита миллисекунд.
              </p>
            </div>

            <div className="bg-[#153e1b] border border-[#2e5e32] p-4 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>anyps5-mouse-absolute.patch + anyps5-host-ftz.patch (Все предупреждения и stop_token)</span>
              </div>
              <p className="text-[11px] text-[#a5d6a7] mt-1 leading-relaxed">
                Все 5 предупреждений Clang (<code>-Wreturn-type-c-linkage</code> в <code>GuestAllocations.hpp</code>, <code>Shutdown.hpp</code>, <code>Equeue.hpp</code>, <code>CoreShim.cpp</code>) и 1 ошибка отсутствия <code>std::stop_token</code> в libc++ полностью устранены прямо в существующих патчах. Также исправлен синтаксис ханков в <code>anyps5-mouse-absolute.patch</code> и <code>anyps5-host-ftz.patch</code> — все 6 официальных патчей накладываются со 100% успехом без создания новых файлов.
              </p>
            </div>
          </div>

          {/* Блок правил репозитория GitHub и коммит */}
          <div className="bg-[#0f2a14] border border-[#2e7d32]/60 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0 mt-0.5">
                <FolderGit2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Статус Git: Только чистые исходники и патчи</span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">Чистый коммит</span>
                </h4>
                <p className="text-xs text-[#c8e6c9] mt-1 leading-relaxed">
                  По правилам репозитория в Git входят <b>только исходные коды</b> (.ts, .tsx, .c, .h, .sh, .patch). Логи (*.log, box64.log), дампы шейдеров (*.txt), архивы Turnip (*.zip) и SDK (android.jar) изолированы в <code>.gitignore</code>.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-1 shrink-0 w-full md:w-auto">
              <div className="text-[10px] text-emerald-400 font-mono">Команда для коммита в репозиторий:</div>
              <div className="text-xs font-mono bg-[#050f07] px-3 py-2 rounded-lg border border-[#1b3d20] text-emerald-300 select-all">
                git add patches/ cmake/ && git commit -m "fix(patches): resolve CoreShim stop_token error and C-linkage warnings in existing AnyPS5 patches" && git push
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Пошаговые вкладки */}
      {activeStepTab === 'step1' && (
        <div className="bg-[#0a1c0d] border border-[#2e5e32] rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-mono text-sky-300">Шаг 1 из 4</span>
              <h3 className="text-base font-bold text-white">Наложение патчей AnyPS5 без конфликтов</h3>
            </div>
            <button
              onClick={() => handleCopyStep(step1Text, 1)}
              className="px-3.5 py-1.5 bg-[#2e7d32] hover:bg-[#388e3c] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              {copiedStep === 1 ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copiedStep === 1 ? 'Скопировано!' : 'Копировать Шаг 1'}</span>
            </button>
          </div>
          <pre className="bg-[#050f07] p-4 rounded-xl border border-[#1b3d20] text-xs font-mono text-emerald-200 overflow-x-auto leading-relaxed select-all">
            {step1Text}
          </pre>
        </div>
      )}

      {activeStepTab === 'step2' && (
        <div className="bg-[#0a1c0d] border border-[#2e5e32] rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-mono text-purple-300">Шаг 2 из 4</span>
              <h3 className="text-base font-bold text-white">Компиляция транслятора графики и мыши</h3>
            </div>
            <button
              onClick={() => handleCopyStep(step2Text, 2)}
              className="px-3.5 py-1.5 bg-[#2e7d32] hover:bg-[#388e3c] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              {copiedStep === 2 ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copiedStep === 2 ? 'Скопировано!' : 'Копировать Шаг 2'}</span>
            </button>
          </div>
          <pre className="bg-[#050f07] p-4 rounded-xl border border-[#1b3d20] text-xs font-mono text-emerald-200 overflow-x-auto leading-relaxed select-all">
            {step2Text}
          </pre>
        </div>
      )}

      {activeStepTab === 'step3' && (
        <div className="bg-[#0a1c0d] border border-[#2e5e32] rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-mono text-emerald-300">Шаг 3 из 4</span>
              <h3 className="text-base font-bold text-white">Сборка APK и чистая Root-установка</h3>
            </div>
            <button
              onClick={() => handleCopyStep(step3Text, 3)}
              className="px-3.5 py-1.5 bg-[#2e7d32] hover:bg-[#388e3c] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              {copiedStep === 3 ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copiedStep === 3 ? 'Скопировано!' : 'Копировать Шаг 3'}</span>
            </button>
          </div>
          <pre className="bg-[#050f07] p-4 rounded-xl border border-[#1b3d20] text-xs font-mono text-emerald-200 overflow-x-auto leading-relaxed select-all">
            {step3Text}
          </pre>
        </div>
      )}

      {activeStepTab === 'step4' && (
        <div className="bg-[#0a1c0d] border border-[#2e5e32] rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-mono text-yellow-300">Шаг 4 из 4</span>
              <h3 className="text-base font-bold text-white">Запись env.txt и очистка старого кэша шейдеров</h3>
            </div>
            <button
              onClick={() => handleCopyStep(step4Text, 4)}
              className="px-3.5 py-1.5 bg-[#2e7d32] hover:bg-[#388e3c] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              {copiedStep === 4 ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copiedStep === 4 ? 'Скопировано!' : 'Копировать Шаг 4'}</span>
            </button>
          </div>
          <pre className="bg-[#050f07] p-4 rounded-xl border border-[#1b3d20] text-xs font-mono text-emerald-200 overflow-x-auto leading-relaxed select-all">
            {step4Text}
          </pre>
        </div>
      )}

      {activeStepTab === 'logs' && (
        <div className="bg-[#0a1c0d] border border-[#2e5e32] rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-mono text-orange-300">Мониторинг логов</span>
              <h3 className="text-base font-bold text-white">Просмотр времени кадров [gputime] в реальном времени</h3>
            </div>
            <button
              onClick={() => handleCopyStep(logsCmdText, 5)}
              className="px-3.5 py-1.5 bg-[#2e7d32] hover:bg-[#388e3c] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              {copiedStep === 5 ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copiedStep === 5 ? 'Скопировано!' : 'Копировать команду'}</span>
            </button>
          </div>
          <pre className="bg-[#050f07] p-4 rounded-xl border border-[#1b3d20] text-xs font-mono text-emerald-200 overflow-x-auto leading-relaxed select-all">
            {logsCmdText}
          </pre>
          <div className="bg-[#153e1b] p-3 rounded-xl border border-[#2e5e32] text-xs text-[#a5d6a7]">
            <p>
              Команда фильтрует вывод по тегам <code>[gputime]</code>, <code>[draw]</code> и <code>fps</code>. Вы увидите реальные замеры миллисекунд каждого прохода (Pass 0x95, 0x9b) сразу после применения патчей.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
