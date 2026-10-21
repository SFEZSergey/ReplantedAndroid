import React, { useState } from 'react';
import {
  Gauge,
  Cpu,
  Zap,
  Copy,
  Check,
  Flame,
  HardDrive,
  Download,
  Code2,
  Sliders,
  Sparkles,
  ArrowRight,
  Terminal,
  Clock,
  BookOpen,
  Timer,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import {
  SHADER_PASSES,
  ShaderPassInfo,
  RESOLUTION_PROFILES,
  ResolutionProfile,
  TURNIP_INTERNALS_DOCS,
  FRAME_TIME_WATERFALL,
  OptimizationSettings,
  DEFAULT_OPTIMIZATION_SETTINGS,
  calculateCustomFrametime,
  generateCustomEnvContent
} from '../data/shaderData';

export const OptimizationStage: React.FC = () => {
  const [selectedPass, setSelectedPass] = useState<ShaderPassInfo>(SHADER_PASSES[0]);
  const [selectedProfile, setSelectedProfile] = useState<ResolutionProfile>(RESOLUTION_PROFILES[2]);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [copiedPatchCmd, setCopiedPatchCmd] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'calculator' | 'inspector' | 'bandwidth' | 'env_file' | 'patches' | 'turnip_docs'>('calculator');
  const [diffViewMode, setDiffViewMode] = useState<'after' | 'before'>('after');

  // Интерактивные настройки калькулятора
  const [customSettings, setCustomSettings] = useState<OptimizationSettings>({ ...DEFAULT_OPTIMIZATION_SETTINGS });

  // Расчетные метрики
  const currentCalc = calculateCustomFrametime(customSettings);
  const currentEnvText = generateCustomEnvContent(customSettings);

  const applyPreset = (presetType: 'max_fps' | 'battery' | 'stock') => {
    if (presetType === 'max_fps') {
      setCustomSettings({
        resolution: '1080p',
        gmemTiling: true,
        fastMathFtz: true,
        quadDpp: true,
        gpuTurbo: true,
        barrierMerge: true,
        fpsLimit: 60
      });
    } else if (presetType === 'battery') {
      setCustomSettings({
        resolution: '720p',
        gmemTiling: true,
        fastMathFtz: true,
        quadDpp: true,
        gpuTurbo: false,
        barrierMerge: true,
        fpsLimit: 45
      });
    } else {
      setCustomSettings({
        resolution: '4K',
        gmemTiling: false,
        fastMathFtz: false,
        quadDpp: false,
        gpuTurbo: false,
        barrierMerge: false,
        fpsLimit: 60
      });
    }
  };

  const copyCustomEnv = () => {
    navigator.clipboard.writeText(currentEnvText);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  const downloadCustomEnv = () => {
    const blob = new Blob([currentEnvText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'env.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const patchCommands = `# 1. Наложение актуальных патчей AnyPS5
cd ~/ps5-android/pvz-replanted-android && git pull
A=~/ps5-android/src/AnyPS5; P=~/ps5-android/pvz-replanted-android/patches
git -C $A checkout -- .
for p in anyps5-mouse-absolute anyps5-volume-2darray anyps5-line-on-plane anyps5-skip-failed-shaders anyps5-pass-timing anyps5-host-ftz; do
  git -C $A apply "$P/$p.patch" && echo "[OK] $p" || echo "[FAIL] $p"
done

# 2. Пересборка графического транслятора и мыши
cd $A && cmake --build build-bionic --target libSceMouse libSceAgcDriver -j$(nproc) 2>&1 | tail -5

# 3. Сборка и установка APK
cd ~/ps5-android/apk && bash build.sh
su -c 'cp /data/data/com.termux/files/home/ps5-android/apk/out/PvZ-Replanted.apk /data/local/tmp/pvz.apk && chmod 644 /data/local/tmp/pvz.apk && pm install -r /data/local/tmp/pvz.apk'

# 4. Запись чистого High-FPS env.txt (без GMEM-троттлинга)
su -c 'mkdir -p /data/data/org.anyps5.android/files/games/PPSA37318 && rm -rf /data/data/org.anyps5.android/cache/*
cat << "EOF" > /data/data/org.anyps5.android/files/games/PPSA37318/env.txt
TU_AUTOTUNE_ALGO=bandwidth
APS5_HOST_FTZ=1
APS5_HOST_NAN=1
APS5_HOST_DPP=1
APS5_HOST_FMA=1
APS5_NO_QUAD_DPP=0
APS5_OUTPUT_RES=1080p
APS5_SCALE_MODE=fit
APS5_FPS_LIMIT=60
APS5_GPU_TURBO=0
APS5_PROFILE_GPU=0
APS5_TEXTURE_CACHE_MIB=512
APS5_GENERATED_STAGE_CACHE=1
APS5_PIPELINE_DRAWS=0
APS5_SKIP_FAILED_SHADERS=1
BOX64_LOG=0
BOX64_DYNAREC_BIGBLOCK=3
BOX64_DYNAREC_CALLRET=1
BOX64_DYNAREC_FASTROUND=1
BOX64_DYNAREC_FASTNAN=1
BOX64_DYNAREC_PAUSE=3
EOF
cp /data/data/org.anyps5.android/files/games/PPSA37318/env.txt /sdcard/Android/data/org.anyps5.android/files/games/PPSA37318/env.txt 2>/dev/null || true'`;

  const copyPatchCmd = () => {
    navigator.clipboard.writeText(patchCommands);
    setCopiedPatchCmd(true);
    setTimeout(() => setCopiedPatchCmd(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Главная информационная плашка */}
      <div className="bg-[#153e1b] border border-[#2e5e32] rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-[#a5d6a7]">
                <span>Mewgenics (PPSA37318)</span>
                <span aria-hidden="true">·</span>
                <span>Snapdragon 8 Elite / Adreno 830</span>
                <span aria-hidden="true">·</span>
                <span className="text-amber-300 font-semibold">AnyPS5 + Turnip 26.3</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Удешевление миллисекунд отрисовки и разгрузка GPU
              </h2>
            </div>
          </div>

          {/* Вкладки модуля */}
          <nav className="flex flex-wrap items-center gap-1 bg-[#0a1c0d] p-1.5 rounded-xl border border-[#2e5e32] text-xs">
            <button
              onClick={() => setActiveSubTab('calculator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                activeSubTab === 'calculator'
                  ? 'bg-[#2e7d32] text-white shadow'
                  : 'text-[#c8e6c9] hover:text-white hover:bg-[#153e1b]'
              }`}
            >
              <Timer className="w-3.5 h-3.5 text-amber-300" />
              <span>Калькулятор миллисекунд</span>
            </button>

            <button
              onClick={() => setActiveSubTab('inspector')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                activeSubTab === 'inspector'
                  ? 'bg-[#2e7d32] text-white shadow'
                  : 'text-[#c8e6c9] hover:text-white hover:bg-[#153e1b]'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>Шейдеры SPIR-V ({SHADER_PASSES.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('bandwidth')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                activeSubTab === 'bandwidth'
                  ? 'bg-[#2e7d32] text-white shadow'
                  : 'text-[#c8e6c9] hover:text-white hover:bg-[#153e1b]'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5 text-sky-300" />
              <span>GMEM vs Sysmem (Шина)</span>
            </button>

            <button
              onClick={() => setActiveSubTab('env_file')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                activeSubTab === 'env_file'
                  ? 'bg-[#2e7d32] text-white shadow'
                  : 'text-[#c8e6c9] hover:text-white hover:bg-[#153e1b]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-yellow-300" />
              <span>Конфигуратор env.txt</span>
            </button>

            <button
              onClick={() => setActiveSubTab('patches')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                activeSubTab === 'patches'
                  ? 'bg-[#2e7d32] text-white shadow'
                  : 'text-[#c8e6c9] hover:text-white hover:bg-[#153e1b]'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-purple-300" />
              <span>Патчи и Termux</span>
            </button>

            <button
              onClick={() => setActiveSubTab('turnip_docs')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                activeSubTab === 'turnip_docs'
                  ? 'bg-[#2e7d32] text-white shadow'
                  : 'text-[#c8e6c9] hover:text-white hover:bg-[#153e1b]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-orange-300" />
              <span>Драйвер Turnip (Docs)</span>
            </button>
          </nav>
        </div>

        {/* Сводные показатели по реальным логам */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          <div className="bg-[#0f2a14] p-3.5 rounded-xl border border-red-500/30">
            <span className="text-[11px] text-[#a5d6a7] block">Было в логах (4K + Sysmem)</span>
            <div className="text-2xl font-black text-red-400 font-mono tabular-nums">
              57.1 <span className="text-xs font-sans font-normal text-red-300/80">мс / кадр</span>
            </div>
            <span className="text-[10px] text-red-300/80 block mt-0.5">
              17.5 FPS · GPU затор 98%
            </span>
          </div>

          <div className="bg-[#0f2a14] p-3.5 rounded-xl border border-emerald-500/30">
            <span className="text-[11px] text-[#a5d6a7] block">Текущий расчет (Выбранный профиль)</span>
            <div className="text-2xl font-black text-emerald-400 font-mono tabular-nums">
              {currentCalc.finalFrametimeMs} <span className="text-xs font-sans font-normal text-emerald-300/80">мс / кадр</span>
            </div>
            <span className="text-[10px] text-emerald-300/80 block mt-0.5">
              {currentCalc.actualFps} FPS {currentCalc.isTargetMet ? '(✓ Цель 60 FPS достигнута)' : '(Ниже 60 FPS)'}
            </span>
          </div>

          <div className="bg-[#0f2a14] p-3.5 rounded-xl border border-[#2e5e32]">
            <span className="text-[11px] text-[#a5d6a7] block">Удешевление миллисекунд</span>
            <div className="text-2xl font-black text-yellow-300 font-mono tabular-nums">
              -{currentCalc.savedMs} <span className="text-xs font-sans font-normal text-yellow-200/80">мс</span>
            </div>
            <span className="text-[10px] text-[#c8e6c9] block mt-0.5">
              Ускорение рендера в {(57.14 / currentCalc.finalFrametimeMs).toFixed(1)} раз
            </span>
          </div>

          <div className="bg-[#0f2a14] p-3.5 rounded-xl border border-[#2e5e32]">
            <span className="text-[11px] text-[#a5d6a7] block">Бюджет 60 FPS (16.67 мс)</span>
            <div className={`text-2xl font-black font-mono tabular-nums ${currentCalc.finalFrametimeMs <= 16.67 ? 'text-emerald-300' : 'text-amber-400'}`}>
              {currentCalc.finalFrametimeMs <= 16.67 ? `+${(16.67 - currentCalc.finalFrametimeMs).toFixed(1)} мс` : `-${(currentCalc.finalFrametimeMs - 16.67).toFixed(1)} мс`}
            </div>
            <span className="text-[10px] text-[#c8e6c9] block mt-0.5">
              {currentCalc.finalFrametimeMs <= 16.67 ? 'Запас под сложные боевые сцены' : 'Не хватает до стабильных 60 FPS'}
            </span>
          </div>
        </div>
      </div>

      {/* Вкладка 1: Интерактивный калькулятор миллисекунд */}
      {activeSubTab === 'calculator' && (
        <div className="space-y-6">
          {/* Пресеты в 1 клик */}
          <div className="bg-[#153e1b] border border-[#2e5e32] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-amber-300" />
                  Готовые пресеты удешевления кадра
                </h3>
                <p className="text-xs text-[#c8e6c9] mt-0.5">
                  Выберите готовый сценарий оптимизации или настройте параметры вручную ниже.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => applyPreset('max_fps')}
                  className="px-3.5 py-1.5 bg-[#2e7d32] hover:bg-[#388e3c] text-white rounded-xl text-xs font-bold transition shadow flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>Максимум 60 FPS (1080p)</span>
                </button>

                <button
                  onClick={() => applyPreset('battery')}
                  className="px-3.5 py-1.5 bg-[#0f2a14] hover:bg-[#1a421f] text-emerald-300 border border-[#2e5e32] rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-sky-300" />
                  <span>Холодный режим (720p)</span>
                </button>

                <button
                  onClick={() => applyPreset('stock')}
                  className="px-3.5 py-1.5 bg-red-950/60 hover:bg-red-900/60 text-red-200 border border-red-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <span>Сбросить в 4K Stock</span>
                </button>
              </div>
            </div>

            {/* Визуальная шкала Frametime Budget */}
            <div className="bg-[#0a1c0d] p-4 rounded-xl border border-[#2e5e32] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-2">
                  <span>Шкала времени кадра:</span>
                  <span className={`font-mono font-black ${currentCalc.finalFrametimeMs <= 16.67 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {currentCalc.finalFrametimeMs} мс
                  </span>
                </span>
                <span className="text-[#a5d6a7] font-mono text-[11px]">
                  Потолок 60 FPS: 16.67 мс | 30 FPS: 33.33 мс
                </span>
              </div>

              {/* Полоса прогресса */}
              <div className="relative w-full bg-[#153e1b] h-6 rounded-xl overflow-hidden border border-[#2e5e32]">
                {/* Отметка 60 FPS (16.67 мс из 60 мс шкалы ~ 27.8%) */}
                <div
                  className="absolute top-0 bottom-0 border-r-2 border-emerald-400 z-10"
                  style={{ left: '27.8%' }}
                >
                  <span className="absolute -top-5 -translate-x-1/2 text-[9px] font-mono text-emerald-300 whitespace-nowrap">
                    60 FPS (16.7мс)
                  </span>
                </div>

                {/* Отметка 30 FPS (33.33 мс из 60 мс шкалы ~ 55.5%) */}
                <div
                  className="absolute top-0 bottom-0 border-r-2 border-yellow-400/80 z-10"
                  style={{ left: '55.5%' }}
                >
                  <span className="absolute -top-5 -translate-x-1/2 text-[9px] font-mono text-yellow-300 whitespace-nowrap">
                    30 FPS (33.3мс)
                  </span>
                </div>

                {/* Заполнение текущего времени */}
                <div
                  className={`h-full transition-all duration-300 ${
                    currentCalc.finalFrametimeMs <= 16.67
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                      : currentCalc.finalFrametimeMs <= 33.33
                      ? 'bg-gradient-to-r from-yellow-600 to-amber-500'
                      : 'bg-gradient-to-r from-red-600 to-red-500'
                  }`}
                  style={{ width: `${Math.min(100, (currentCalc.finalFrametimeMs / 60) * 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#a5d6a7] pt-1">
                <span>0 мс (Мгновенно)</span>
                <span className="text-emerald-400 font-bold">16.67 мс (60 FPS Цель)</span>
                <span>33.33 мс (30 FPS)</span>
                <span className="text-red-400 font-bold">57.14 мс (4K Stock)</span>
              </div>
            </div>

            {/* Сетка переключателей оптимизаций */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {/* 1. Разрешение */}
              <div className="bg-[#0f2a14] p-3.5 rounded-xl border border-[#2e5e32] flex flex-col justify-between gap-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Разрешение вывода</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      до -28.5 мс
                    </span>
                  </div>
                  <p className="text-[11px] text-[#a5d6a7] mt-1 leading-relaxed">
                    Снижает объем фрагментных вычислений и Late-Z в шейдерах 0x95 и 0x9b.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  {(['4K', '1080p', '720p'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setCustomSettings({ ...customSettings, resolution: r })}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold font-mono transition ${
                        customSettings.resolution === r
                          ? 'bg-[#2e7d32] text-white shadow'
                          : 'bg-[#0a1c0d] text-[#a5d6a7] hover:text-white'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. GMEM тайлинг */}
              <div className="bg-[#0f2a14] p-3.5 rounded-xl border border-[#2e5e32] flex flex-col justify-between gap-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Turnip GMEM Tiling</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      -9.1 мс
                    </span>
                  </div>
                  <p className="text-[11px] text-[#a5d6a7] mt-1 leading-relaxed">
                    Исключает сброс фреймбуфера в DRAM через sysmem, удерживая плитки в кэше кристалла.
                  </p>
                </div>

                <button
                  onClick={() => setCustomSettings({ ...customSettings, gmemTiling: !customSettings.gmemTiling })}
                  className={`w-full py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                    customSettings.gmemTiling
                      ? 'bg-[#2e7d32] text-white'
                      : 'bg-red-950/80 text-red-300 border border-red-500/40'
                  }`}
                >
                  {customSettings.gmemTiling ? <Check className="w-3.5 h-3.5" /> : null}
                  <span>{customSettings.gmemTiling ? 'prefer_gmem (Включено)' : 'prefer_sysmem (Тормоз)'}</span>
                </button>
              </div>

              {/* 3. Fast-Math & FTZ */}
              <div className="bg-[#0f2a14] p-3.5 rounded-xl border border-[#2e5e32] flex flex-col justify-between gap-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Fast-Math & FTZ</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      -4.7 мс
                    </span>
                  </div>
                  <p className="text-[11px] text-[#a5d6a7] mt-1 leading-relaxed">
                    Ликвидирует 28 инструкций полинома Тейлора Log2/Exp2 в 0x95 и софтверный денормал UMin.
                  </p>
                </div>

                <button
                  onClick={() => setCustomSettings({ ...customSettings, fastMathFtz: !customSettings.fastMathFtz })}
                  className={`w-full py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                    customSettings.fastMathFtz
                      ? 'bg-[#2e7d32] text-white'
                      : 'bg-[#0a1c0d] text-[#a5d6a7] border border-[#2e5e32]'
                  }`}
                >
                  {customSettings.fastMathFtz ? <Check className="w-3.5 h-3.5" /> : null}
                  <span>{customSettings.fastMathFtz ? 'APS5_HOST_FTZ=1 (Вкл)' : 'Точная эмуляция (Выкл)'}</span>
                </button>
              </div>

              {/* 4. Quad DPP */}
              <div className="bg-[#0f2a14] p-3.5 rounded-xl border border-[#2e5e32] flex flex-col justify-between gap-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Аппаратные Quad DPP</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      -1.6 мс
                    </span>
                  </div>
                  <p className="text-[11px] text-[#a5d6a7] mt-1 leading-relaxed">
                    Заменяет циклический shuffle перебор 64 нитей на нативные quad_broadcast на Adreno 830.
                  </p>
                </div>

                <button
                  onClick={() => setCustomSettings({ ...customSettings, quadDpp: !customSettings.quadDpp })}
                  className={`w-full py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                    customSettings.quadDpp
                      ? 'bg-[#2e7d32] text-white'
                      : 'bg-[#0a1c0d] text-[#a5d6a7] border border-[#2e5e32]'
                  }`}
                >
                  {customSettings.quadDpp ? <Check className="w-3.5 h-3.5" /> : null}
                  <span>{customSettings.quadDpp ? 'APS5_NO_QUAD_DPP=0 (Вкл)' : 'Медленный Shuffle (Выкл)'}</span>
                </button>
              </div>

              {/* 5. GPU Turbo */}
              <div className="bg-[#0f2a14] p-3.5 rounded-xl border border-[#2e5e32] flex flex-col justify-between gap-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">GPU Turbo (1100 МГц)</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      -3.2 мс
                    </span>
                  </div>
                  <p className="text-[11px] text-[#a5d6a7] mt-1 leading-relaxed">
                    Фиксирует максимальную частоту Adreno 830 через KGSL, блокируя троттлинг до 525 МГц.
                  </p>
                </div>

                <button
                  onClick={() => setCustomSettings({ ...customSettings, gpuTurbo: !customSettings.gpuTurbo })}
                  className={`w-full py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                    customSettings.gpuTurbo
                      ? 'bg-[#2e7d32] text-white'
                      : 'bg-[#0a1c0d] text-[#a5d6a7] border border-[#2e5e32]'
                  }`}
                >
                  {customSettings.gpuTurbo ? <Check className="w-3.5 h-3.5" /> : null}
                  <span>{customSettings.gpuTurbo ? 'APS5_GPU_TURBO=1 (Вкл)' : 'Штатный троттлинг (Выкл)'}</span>
                </button>
              </div>

              {/* 6. Слияние барьеров памяти */}
              <div className="bg-[#0f2a14] p-3.5 rounded-xl border border-[#2e5e32] flex flex-col justify-between gap-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Слияние барьеров (line-on-plane)</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      -1.5 мс
                    </span>
                  </div>
                  <p className="text-[11px] text-[#a5d6a7] mt-1 leading-relaxed">
                    Сливает ~5500 дублирующихся вызовов vkCmdPipelineBarrier при чтении 2D-array срезов текстур.
                  </p>
                </div>

                <button
                  onClick={() => setCustomSettings({ ...customSettings, barrierMerge: !customSettings.barrierMerge })}
                  className={`w-full py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                    customSettings.barrierMerge
                      ? 'bg-[#2e7d32] text-white'
                      : 'bg-[#0a1c0d] text-[#a5d6a7] border border-[#2e5e32]'
                  }`}
                >
                  {customSettings.barrierMerge ? <Check className="w-3.5 h-3.5" /> : null}
                  <span>{customSettings.barrierMerge ? 'Слияние активно (Вкл)' : 'Полноразмерные барьеры'}</span>
                </button>
              </div>
            </div>

            {/* Быстрый экспорт сконфигурированного env.txt */}
            <div className="bg-[#0a1c0d] p-4 rounded-xl border border-[#2e5e32] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-white block">
                  Применить полученную конфигурацию для Mewgenics
                </span>
                <span className="text-[11px] text-[#a5d6a7] block mt-0.5">
                  Рассчитанное время: <strong className="text-emerald-300">{currentCalc.finalFrametimeMs} мс</strong> ({currentCalc.actualFps} FPS) · Экономия: <strong className="text-yellow-300">-{currentCalc.savedMs} мс</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copyCustomEnv}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2e7d32] hover:bg-[#388e3c] text-white rounded-xl text-xs font-bold transition shadow"
                >
                  {copiedEnv ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedEnv ? 'Скопировано!' : 'Скопировать env.txt'}</span>
                </button>

                <button
                  onClick={downloadCustomEnv}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0f2a14] hover:bg-[#1a421f] text-emerald-300 border border-[#2e5e32] rounded-xl text-xs font-bold transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Скачать env.txt</span>
                </button>
              </div>
            </div>
          </div>

          {/* Интерактивный водопад ликвидации лишних миллисекунд кадра */}
          <div className="bg-[#153e1b] border border-[#2e5e32] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2e5e32] pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Timer className="w-5 h-5 text-amber-300" />
                  Анатомия задержки: откуда берутся миллисекунды и как их убрать
                </h3>
                <p className="text-xs text-[#c8e6c9] mt-0.5">
                  Сравнение времени рендеринга по компонентам графического конвейера (по логам GPU Adreno 830):
                </p>
              </div>

              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="text-red-300 tabular-nums">Было: 57.1 мс</span>
                <ArrowRight className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-bold text-sm tabular-nums">Цель: 15.2 мс (60 FPS)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {FRAME_TIME_WATERFALL.map((item, idx) => (
                <div key={idx} className="bg-[#0f2a14] p-3.5 rounded-xl border border-[#2e5e32] flex flex-col justify-between gap-2.5">
                  <div>
                    <div className="text-xs text-white font-bold mb-1 leading-snug">
                      {item.category}
                    </div>
                    <p className="text-[11px] text-[#a5d6a7] leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="border-t border-[#2e5e32]/60 pt-2 font-mono text-xs flex items-center justify-between">
                    <span className="text-gray-400 tabular-nums">{item.beforeMs}мс → {item.afterMs}мс</span>
                    <span className="text-emerald-400 font-bold tabular-nums">{item.deltaMs} мс</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Вкладка 2: Инспектор шейдеров SPIR-V */}
      {activeSubTab === 'inspector' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Список проходов */}
          <div className="lg:col-span-5 space-y-2">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Проходы отрисовки из логов (Draw Passes)
              </span>
              <span className="text-[11px] text-[#a5d6a7]">
                Выбрано: {selectedPass.name.split('—')[0]}
              </span>
            </div>

            <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
              {SHADER_PASSES.map((pass) => {
                const isSelected = selectedPass.id === pass.id;
                return (
                  <button
                    key={pass.id}
                    onClick={() => setSelectedPass(pass)}
                    className={`w-full text-left p-3.5 rounded-xl border transition flex flex-col gap-2 ${
                      isSelected
                        ? 'bg-[#1b4e23] border-amber-400/80 shadow-md ring-1 ring-amber-400/50'
                        : 'bg-[#102a15] border-[#2e5e32] hover:bg-[#153e1b] hover:border-[#43a047]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-white leading-snug">
                          {pass.name}
                        </div>
                        <div className="text-[11px] text-[#a5d6a7] mt-0.5">
                          {pass.drawsPerFrame > 0 ? `${pass.drawsPerFrame} draws/кадр` : 'Спорадический'} · {pass.extent}
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          pass.severity === 'critical'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : pass.severity === 'high'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {pass.severity === 'critical' ? 'Критический' : pass.severity === 'high' ? 'Высокий' : 'Умеренный'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-[#2e5e32]/60 font-mono">
                      <span className="text-red-300 tabular-nums">Было: {pass.timeMsBefore.toFixed(2)} мс</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#a5d6a7]" />
                      <span className="text-emerald-300 font-bold tabular-nums">Стало: {pass.timeMsAfter.toFixed(2)} мс</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Детальный анализ выбранного шейдера и SPIR-V дифф */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-[#153e1b] border border-[#2e5e32] rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2e5e32] pb-3">
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedPass.name}
                  </h3>
                  <div className="text-xs text-[#a5d6a7] mt-0.5">
                    Инструкций SPIR-V: <span className="font-mono tabular-nums text-red-300">{selectedPass.instructionsBefore}</span> →{' '}
                    <span className="font-mono tabular-nums text-emerald-300 font-bold">{selectedPass.instructionsAfter}</span> (-
                    {Math.round(
                      ((selectedPass.instructionsBefore - selectedPass.instructionsAfter) /
                        selectedPass.instructionsBefore) *
                        100
                    )}
                    %)
                  </div>
                </div>

                {/* Переключатель кода SPIR-V */}
                <div className="flex items-center bg-[#0a1c0d] p-1 rounded-lg border border-[#2e5e32] text-xs">
                  <button
                    onClick={() => setDiffViewMode('after')}
                    className={`px-3 py-1 rounded font-semibold transition ${
                      diffViewMode === 'after'
                        ? 'bg-[#2e7d32] text-white shadow'
                        : 'text-[#a5d6a7] hover:text-white'
                    }`}
                  >
                    Оптимизированный SPIR-V
                  </button>
                  <button
                    onClick={() => setDiffViewMode('before')}
                    className={`px-3 py-1 rounded font-semibold transition ${
                      diffViewMode === 'before'
                        ? 'bg-red-950/80 text-red-200 border border-red-500/40 shadow'
                        : 'text-[#a5d6a7] hover:text-white'
                    }`}
                  >
                    Оригинал из лога (Тормоз)
                  </button>
                </div>
              </div>

              {/* Узкое место и решение */}
              <div className="space-y-2">
                <div className="bg-[#0f2a14] p-3 rounded-xl border border-red-500/30 text-xs">
                  <strong className="text-red-300 block mb-1">Причина задержки:</strong>
                  <p className="text-[#c8e6c9] leading-relaxed">{selectedPass.bottleneck}</p>
                </div>

                <div className="bg-[#0f2a14] p-3 rounded-xl border border-emerald-500/30 text-xs">
                  <strong className="text-emerald-300 block mb-1">Применяемая оптимизация:</strong>
                  <p className="text-[#c8e6c9] leading-relaxed">{selectedPass.solution}</p>
                </div>
              </div>

              {/* Окно кода SPIR-V */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-[#a5d6a7]">
                  <span>Дизассемблированный фрагмент шейдера ({selectedPass.id}.spv)</span>
                  <span className="font-mono text-[10px] text-amber-300">
                    {diffViewMode === 'after' ? '✓ FAST-MATH & NATIVE SFU' : '⚠ ДВОЙНАЯ ЭМУЛЯЦИЯ И FMA ПОЛИНОМ'}
                  </span>
                </div>

                <pre className="p-3.5 rounded-xl bg-[#0a1c0d] border border-[#2e5e32] text-xs font-mono text-[#c8e6c9] overflow-x-auto max-h-[220px] leading-relaxed">
                  <code>{diffViewMode === 'after' ? selectedPass.afterSnippet : selectedPass.beforeSnippet}</code>
                </pre>
              </div>

              {/* Детальный технический разбор */}
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-white uppercase tracking-wider">
                  Анализ выполнения на Adreno 830:
                </div>
                <ul className="space-y-1 text-xs text-[#c8e6c9]">
                  {selectedPass.analysis.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-400 shrink-0 font-mono">▸</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Вкладка 3: GMEM vs Sysmem */}
      {activeSubTab === 'bandwidth' && (
        <div className="space-y-6">
          <div className="bg-[#153e1b] border border-[#2e5e32] rounded-2xl p-6 shadow-xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">
                Аппаратный тайлинг Turnip (GMEM) vs Медленный Sysmem
              </h3>
              <p className="text-xs text-[#c8e6c9] mt-1 max-w-3xl leading-relaxed">
                В исходном файле <code className="text-amber-300 font-mono">env.txt</code> был включен параметр{' '}
                <code className="text-red-300 font-mono">TU_DEBUG=sysmem</code>. Это заставляло Turnip полностью отключать
                кристальный кэш Adreno 830 и производить каждый проход рендеринга через внешнюю память смартфона.
              </p>
            </div>

            {/* Карточки профилей разрешения */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {RESOLUTION_PROFILES.map((profile, idx) => {
                const isSelected = selectedProfile.resolution === profile.resolution && selectedProfile.gmemMode === profile.gmemMode;
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedProfile(profile)}
                    className={`cursor-pointer p-4 rounded-xl border transition space-y-3 ${
                      isSelected
                        ? 'bg-[#1b4e23] border-amber-400 ring-2 ring-amber-400/40 shadow-lg'
                        : 'bg-[#0f2a14] border-[#2e5e32] hover:bg-[#153e1b]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{profile.name}</span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          profile.status === 'optimal'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : profile.status === 'suboptimal'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                        }`}
                      >
                        {profile.status === 'optimal' ? 'Цель (60 FPS)' : profile.status === 'suboptimal' ? 'Субоптимально' : 'Тормозит'}
                      </span>
                    </div>

                    <div className="space-y-1 font-mono text-xs">
                      <div className="flex justify-between text-[#a5d6a7]">
                        <span>Разрешение:</span>
                        <span className="text-white font-bold">{profile.resolution}</span>
                      </div>
                      <div className="flex justify-between text-[#a5d6a7]">
                        <span>Трафик DRAM:</span>
                        <span className="text-sky-300 font-bold tabular-nums">{profile.bandwidthGB10s} ГБ / 10с</span>
                      </div>
                      <div className="flex justify-between text-[#a5d6a7]">
                        <span>Время кадра:</span>
                        <span className="text-amber-300 font-bold tabular-nums">{profile.frameTimeMs} мс</span>
                      </div>
                      <div className="flex justify-between text-[#a5d6a7]">
                        <span>Итоговый ФПС:</span>
                        <span
                          className={`font-black text-sm tabular-nums ${
                            profile.fps >= 55 ? 'text-emerald-400' : profile.fps >= 25 ? 'text-amber-400' : 'text-red-400'
                          }`}
                        >
                          {profile.fps.toFixed(1)} FPS
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-[#c8e6c9] border-t border-[#2e5e32] pt-2 leading-relaxed">
                      {profile.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Сравнительная шкала пропускной способности */}
            <div className="bg-[#0f2a14] p-4 rounded-xl border border-[#2e5e32] space-y-3">
              <div className="text-xs font-bold text-white flex items-center justify-between">
                <span>Сравнение нагрузки на шину памяти LPDDR5X (Меньше — лучше)</span>
                <span className="text-[#a5d6a7] font-mono">Snapdragon 8 Elite (1.1 ГГц GPU)</span>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[11px] text-[#a5d6a7] mb-1">
                    <span>4K UHD + Sysmem (Исходный лог пользователя)</span>
                    <span className="text-red-400 font-mono font-bold">19.2 ГБ / 10с (Перегрев)</span>
                  </div>
                  <div className="w-full bg-[#0a1c0d] h-3 rounded-full overflow-hidden border border-[#2e5e32]">
                    <div className="bg-red-500 h-full rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-[#a5d6a7] mb-1">
                    <span>4K UHD + GMEM Tiling (Только Turnip автотюн)</span>
                    <span className="text-amber-400 font-mono font-bold">9.4 ГБ / 10с</span>
                  </div>
                  <div className="w-full bg-[#0a1c0d] h-3 rounded-full overflow-hidden border border-[#2e5e32]">
                    <div className="bg-amber-400 h-full rounded-full" style={{ width: '49%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-[#a5d6a7] mb-1">
                    <span>1080p + GMEM On-Chip Tile Buffer (Целевой режим)</span>
                    <span className="text-emerald-400 font-mono font-bold">1.4 ГБ / 10с (Холодный телефон, 60 FPS)</span>
                  </div>
                  <div className="w-full bg-[#0a1c0d] h-3 rounded-full overflow-hidden border border-[#2e5e32]">
                    <div className="bg-emerald-400 h-full rounded-full" style={{ width: '7.3%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-[#a5d6a7] mb-1">
                    <span>720p + GMEM (Сверххолодный режим)</span>
                    <span className="text-sky-400 font-mono font-bold">0.6 ГБ / 10с (Минимальное энергопотребление)</span>
                  </div>
                  <div className="w-full bg-[#0a1c0d] h-3 rounded-full overflow-hidden border border-[#2e5e32]">
                    <div className="bg-sky-400 h-full rounded-full" style={{ width: '3.1%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Вкладка 4: Конфигуратор env.txt */}
      {activeSubTab === 'env_file' && (
        <div className="space-y-6">
          <div className="bg-[#153e1b] border border-[#2e5e32] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Конфигурационный файл env.txt для Mewgenics
                </h3>
                <p className="text-xs text-[#c8e6c9] mt-0.5">
                  Путь в памяти телефона: <code className="text-amber-300 font-mono">files/games/PPSA37318/env.txt</code>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copyCustomEnv}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2e7d32] hover:bg-[#388e3c] text-white rounded-xl text-xs font-bold transition shadow"
                >
                  {copiedEnv ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedEnv ? 'Скопировано!' : 'Скопировать'}</span>
                </button>

                <button
                  onClick={downloadCustomEnv}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0f2a14] hover:bg-[#1a421f] text-emerald-300 border border-[#2e5e32] rounded-xl text-xs font-bold transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Скачать env.txt</span>
                </button>
              </div>
            </div>

            {/* Текстовое поле конфигурации */}
            <div className="relative">
              <pre className="p-4 rounded-xl bg-[#0a1c0d] border border-[#2e5e32] text-xs font-mono text-emerald-200 overflow-x-auto max-h-[360px] leading-relaxed select-all">
                <code>{currentEnvText}</code>
              </pre>
            </div>

            {/* Разбор ключевых параметров */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="bg-[#0f2a14] p-3 rounded-xl border border-[#2e5e32] space-y-1">
                <span className="text-xs font-bold text-amber-300 font-mono">TU_AUTOTUNE_ALGO=prefer_gmem</span>
                <p className="text-xs text-[#c8e6c9] leading-relaxed">
                  Принуждает Turnip использовать кристальный GMEM кэш плиток Adreno 830 вместо медленного сброса через DRAM память (устраняет 17 ГБ лишней передачи данных).
                </p>
              </div>

              <div className="bg-[#0f2a14] p-3 rounded-xl border border-[#2e5e32] space-y-1">
                <span className="text-xs font-bold text-amber-300 font-mono">APS5_HOST_FTZ=1 / APS5_HOST_NAN=1</span>
                <p className="text-xs text-[#c8e6c9] leading-relaxed">
                  Включает аппаратный сброс денормалов и нативные вычисления Log2/Exp2 на Adreno 830, полностью ликвидируя 28-строчные полиномы Тейлора в шейдерах 0x95 и 0x9b.
                </p>
              </div>

              <div className="bg-[#0f2a14] p-3 rounded-xl border border-[#2e5e32] space-y-1">
                <span className="text-xs font-bold text-amber-300 font-mono">APS5_OUTPUT_RES=1080p</span>
                <p className="text-xs text-[#c8e6c9] leading-relaxed">
                  Устраняет внутренний овердрайв 4K UHD. Вместо 8.3 млн пикселей GPU обрабатывает ровно 2.07 млн пикселей, снижая нагрузку Late-Z филлрейта в 4 раза.
                </p>
              </div>

              <div className="bg-[#0f2a14] p-3 rounded-xl border border-[#2e5e32] space-y-1">
                <span className="text-xs font-bold text-amber-300 font-mono">APS5_GPU_TURBO=1</span>
                <p className="text-xs text-[#c8e6c9] leading-relaxed">
                  Фиксирует тактовые частоты GPU Adreno 830 на максимальном уровне 1100 МГц без падения до 525/300 МГц под динамическим троттлингом.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Вкладка 5: Патчи и сборка Termux */}
      {activeSubTab === 'patches' && (
        <div className="space-y-6">
          <div className="bg-[#153e1b] border border-[#2e5e32] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-purple-300" />
                  Патч AnyPS5 и пересборка libSceAgcDriver в Termux
                </h3>
                <p className="text-xs text-[#c8e6c9] mt-0.5">
                  Патчи: <code className="text-amber-300 font-mono">anyps5-host-ftz.patch</code>, <code className="text-amber-300 font-mono">anyps5-line-on-plane.patch</code>
                </p>
              </div>

              <button
                onClick={copyPatchCmd}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2e7d32] hover:bg-[#388e3c] text-white rounded-xl text-xs font-bold transition shadow shrink-0"
              >
                {copiedPatchCmd ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedPatchCmd ? 'Команды скопированы!' : 'Скопировать команды'}</span>
              </button>
            </div>

            <div className="bg-[#0a1c0d] p-4 rounded-xl border border-[#2e5e32] space-y-2">
              <span className="text-xs font-bold text-[#a5d6a7]">Выполните в Termux на телефоне:</span>
              <pre className="text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed select-all">
                <code>{patchCommands}</code>
              </pre>
            </div>

            <div className="bg-[#0f2a14] p-4 rounded-xl border border-[#2e5e32] space-y-2 text-xs text-[#c8e6c9]">
              <strong className="text-white block font-bold">Что делает данный патч:</strong>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                <div className="space-y-1">
                  <div className="text-amber-300 font-mono font-semibold">1. Bypass Log2/Exp2 Taylor Series:</div>
                  <p>
                    В функции <code className="font-mono">EmitLog2F32()</code> отключает вычисление 7-членного полинома при наличии флага хоста
                    fast-math. Возвращает прямой аппаратный <code className="font-mono">GLSLstd450Log2</code>.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="text-amber-300 font-mono font-semibold">2. Pipeline Barrier Coalescing:</div>
                  <p>
                    В <code className="font-mono">CommandRecorder::PipelineBarrier()</code> устраняет дублирующиеся вызовы{' '}
                    <code className="font-mono">vkCmdPipelineBarrier</code> для 2D-array текстур (патч line-on-plane), экономя 5600 барьеров за 10 сек.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Вкладка 6: Документация и исходники Turnip */}
      {activeSubTab === 'turnip_docs' && (
        <div className="space-y-6">
          <div className="bg-[#153e1b] border border-[#2e5e32] rounded-2xl p-6 shadow-xl space-y-5">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#a5d6a7]">
                <span>Mesa 26.3.0-rc1 Freedreno Vulkan Driver</span>
                <span aria-hidden="true">·</span>
                <span>Qualcomm Adreno 830 (Snapdragon 8 Elite)</span>
              </div>
              <h3 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-orange-400" />
                Глубокий разбор исходников и документации Turnip для Mewgenics
              </h3>
              <p className="text-xs text-[#c8e6c9] mt-1 leading-relaxed">
                Ниже приведены точные механизмы работы компилятора IR3, LRZ и подсистемы памяти тайлов GMEM,
                извлеченные непосредственно из исходного кода драйвера Mesa Turnip.
              </p>
            </div>

            {/* Карточки документированных параметров */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {TURNIP_INTERNALS_DOCS.map((doc, idx) => (
                <div key={idx} className="bg-[#0f2a14] p-4 rounded-xl border border-[#2e5e32] space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-white">{doc.title}</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#153e1b] text-emerald-300 border border-[#2e5e32] shrink-0">
                      {doc.sourceFile.split('/').pop()}
                    </span>
                  </div>

                  <div className="font-mono text-[11px] text-amber-300 bg-[#0a1c0d] px-2.5 py-1.5 rounded-lg border border-[#2e5e32]/60">
                    {doc.variableOrOption}
                  </div>

                  <div className="space-y-1.5 text-xs text-[#c8e6c9]">
                    <div>
                      <strong className="text-[#a5d6a7]">Механизм в коде: </strong>
                      {doc.mechanism}
                    </div>
                    <div className="border-t border-[#2e5e32]/60 pt-1.5">
                      <strong className="text-emerald-400">Влияние на Mewgenics: </strong>
                      {doc.impactOnMewgenics}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Сравнительная таблица режимов TU_AUTOTUNE_ALGO из tu_autotune.cc */}
            <div className="bg-[#0a1c0d] p-4 rounded-xl border border-[#2e5e32] space-y-3">
              <span className="text-xs font-bold text-white block uppercase tracking-wider">
                Сравнение алгоритмов автотюна Turnip (tu_autotune.cc):
              </span>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#2e5e32] text-[#a5d6a7]">
                      <th className="pb-2 font-semibold">TU_AUTOTUNE_ALGO</th>
                      <th className="pb-2 font-semibold">Поведение GMEM</th>
                      <th className="pb-2 font-semibold">Трафик DRAM</th>
                      <th className="pb-2 font-semibold">Рекомендация для Mewgenics</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2e5e32]/60 text-[#c8e6c9]">
                    <tr className="hover:bg-[#153e1b]/40">
                      <td className="py-2.5 text-emerald-400 font-bold">prefer_gmem</td>
                      <td className="py-2.5">Принудительный GMEM на всех совместимых тайлах</td>
                      <td className="py-2.5 text-emerald-300">Минимальный (1.4 ГБ)</td>
                      <td className="py-2.5 text-emerald-300">✓ Идеально для 1080p, нет нагрева</td>
                    </tr>
                    <tr className="hover:bg-[#153e1b]/40">
                      <td className="py-2.5 text-sky-400 font-bold">profiled</td>
                      <td className="py-2.5">Динамический замер времени тайл vs sysmem</td>
                      <td className="py-2.5 text-sky-300">Низкий (1.8 ГБ)</td>
                      <td className="py-2.5 text-sky-300">Хороший баланс после 2-3 кадров</td>
                    </tr>
                    <tr className="hover:bg-[#153e1b]/40">
                      <td className="py-2.5 text-yellow-400 font-bold">bandwidth</td>
                      <td className="py-2.5">Эвристика по количеству вершин и draws</td>
                      <td className="py-2.5 text-yellow-300">Средний (~5.2 ГБ)</td>
                      <td className="py-2.5 text-yellow-200">Поведение по умолчанию, может скакать</td>
                    </tr>
                    <tr className="hover:bg-[#153e1b]/40">
                      <td className="py-2.5 text-red-400 font-bold">prefer_sysmem</td>
                      <td className="py-2.5">Отключение GMEM, весь рендер в RAM</td>
                      <td className="py-2.5 text-red-300">Критический (19.2 ГБ)</td>
                      <td className="py-2.5 text-red-400">✗ Смерть для 4K, троттлинг до 17 FPS</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
