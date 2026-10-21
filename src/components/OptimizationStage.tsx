import React, { useState } from 'react';
import { Gauge, Cpu, Zap, Copy, Check, Flame, HardDrive, BarChart3, ChevronRight, FileCode } from 'lucide-react';
import { SHADER_PASSES, ShaderPassInfo } from '../data/shaderData';

export const OptimizationStage: React.FC = () => {
  const [selectedPass, setSelectedPass] = useState<ShaderPassInfo>(SHADER_PASSES[0]);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'passes' | 'env_generator'>('overview');

  const optimalEnvContent = `# Оптимальная конфигурация для Snapdragon 8 Elite (Adreno 830)
# Устраняет просадку до 16 FPS и разгружает шейдеры 0x95 и 0x9b

# 1. ОТКЛЮЧИТЬ принудительный sysmem! Разрешаем Turnip использовать быстрый кристальный GMEM:
# TU_DEBUG=sysmem (УДАЛЕНО - вызывало 24 ГБ мусорного трафика в RAM)
TU_AUTOTUNE_ALGO=profiled

# 2. Аппаратная оптимизация шейдеров под Adreno GPU:
APS5_HOST_FTZ=1
APS5_HOST_NAN=1
APS5_HOST_DPP=1
APS5_HOST_FMA=1
APS5_NO_QUAD_DPP=0

# 3. Разрешение и лимиты (вместо 4K 3840x2160 рендерим в честные 1080p экрана):
APS5_OUTPUT_RES=auto
APS5_SCALE_MODE=fit
APS5_FPS_LIMIT=60

# 4. GPU Турбо (держит 1.1 ГГц вместо сброса до 300 МГц):
APS5_GPU_TURBO=1

# 5. Кэши конвейеров и текстур:
APS5_TEXTURE_CACHE_MIB=512
APS5_GENERATED_STAGE_CACHE=1
APS5_PIPELINE_DRAWS=1
BOX64_DYNAREC_BIGBLOCK=3
BOX64_DYNAREC_FASTROUND=1
BOX64_DYNAREC_FASTNAN=1
BOX64_DYNAREC_PAUSE=3`;

  const copyEnv = () => {
    navigator.clipboard.writeText(optimalEnvContent);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  const totalGpuDrawTime = SHADER_PASSES.reduce((acc, p) => acc + p.timeMsPerFrame, 0);

  return (
    <div className="space-y-6">
      {/* Шапка этапа 2 */}
      <div className="bg-[#153e1b] border border-[#2e5e32] rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
              <Gauge className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-1">
                ЭТАП 2
              </div>
              <h2 className="text-xl font-bold text-white">Оптимизация и разбор низкого ФПС (Шейдерные проходы)</h2>
              <p className="text-sm text-[#c8e6c9]">
                Анализ логов box64.log, device.txt (OnePlus 12R / Snapdragon 8 Elite) и 8 дампов SPIR-V
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#0f2a14] p-1.5 rounded-xl border border-[#2e5e32] text-xs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                activeTab === 'overview' ? 'bg-[#2e7d32] text-white shadow' : 'text-[#a5d6a7] hover:text-white'
              }`}
            >
              Сводка и заторы
            </button>
            <button
              onClick={() => setActiveTab('passes')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                activeTab === 'passes' ? 'bg-[#2e7d32] text-white shadow' : 'text-[#a5d6a7] hover:text-white'
              }`}
            >
              8 Шейдеров SPIR-V
            </button>
            <button
              onClick={() => setActiveTab('env_generator')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                activeTab === 'env_generator' ? 'bg-[#2e7d32] text-white shadow' : 'text-[#a5d6a7] hover:text-white'
              }`}
            >
              Готовый env.txt
            </button>
          </div>
        </div>

        {/* Быстрые метрики из реального лога пользователя */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <div className="bg-[#0f2a14] p-3 rounded-xl border border-red-500/30">
            <span className="text-[11px] text-[#a5d6a7]">Текущий ФПС в логе</span>
            <div className="text-2xl font-black text-red-400 font-mono">16.3 FPS</div>
            <span className="text-[10px] text-red-300/80">Период кадра: 61.3 мс</span>
          </div>

          <div className="bg-[#0f2a14] p-3 rounded-xl border border-amber-500/30">
            <span className="text-[11px] text-[#a5d6a7]">Рендер-разрешение</span>
            <div className="text-2xl font-black text-amber-300 font-mono">3840×2160</div>
            <span className="text-[10px] text-amber-200/80">4K UHD (экран: 2344×1080)</span>
          </div>

          <div className="bg-[#0f2a14] p-3 rounded-xl border border-[#2e5e32]">
            <span className="text-[11px] text-[#a5d6a7]">Pass 0x95 + 0x9b</span>
            <div className="text-2xl font-black text-yellow-300 font-mono">31.7 мс</div>
            <span className="text-[10px] text-[#c8e6c9]">58% от всего времени GPU!</span>
          </div>

          <div className="bg-[#0f2a14] p-3 rounded-xl border border-[#2e5e32]">
            <span className="text-[11px] text-[#a5d6a7]">Процессор</span>
            <div className="text-2xl font-black text-emerald-400 font-mono">Snapdragon 8 Elite</div>
            <span className="text-[10px] text-emerald-300/80">Adreno 830 (OnePlus CPH2723)</span>
          </div>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Главные причины тормозов */}
          <div className="bg-[#153e1b] border border-[#2e5e32] rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Flame className="w-5 h-5 text-red-400" />
              Три фатальные причины просадки до 16 FPS
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#0f2a14] p-4 rounded-xl border border-red-500/40 space-y-2">
                <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                  <span>1.</span> Отрисовка в 4K UHD (3840×2160)
                </div>
                <p className="text-xs text-[#c8e6c9] leading-relaxed">
                  В логе чётко видно: <code className="text-amber-300 font-mono">[gputime] draw passes: ... 3840x2160</code>.
                  Игра рендерит более <strong className="text-white">8.3 миллиона пикселей</strong> на каждый проход, хотя экран телефона всего 1080p!
                  Это в 4 раза больше пикселей, чем нужно, что душит филлрейт Adreno.
                </p>
                <div className="text-[11px] text-emerald-400 font-semibold mt-2">
                  → Решение: <code className="font-mono">APS5_OUTPUT_RES=auto</code> (разгружает GPU ровно в 4 раза).
                </div>
              </div>

              <div className="bg-[#0f2a14] p-4 rounded-xl border border-red-500/40 space-y-2">
                <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                  <span>2.</span> Параметр TU_DEBUG=sysmem в env.txt
                </div>
                <p className="text-xs text-[#c8e6c9] leading-relaxed">
                  В вашем <code className="text-amber-300 font-mono">env.txt</code> прописано: <code className="text-red-300 font-mono">TU_DEBUG=sysmem</code>.
                  Это отключает аппаратный кэш плиток (GMEM) в Turnip и заставляет видеоядро гонять гигабайты 4K текстур через медленную оперативную память!
                  В логе зафиксировано 24 ГБ трафика за 10 секунд.
                </p>
                <div className="text-[11px] text-emerald-400 font-semibold mt-2">
                  → Решение: УДАЛИТЬ <code className="font-mono">TU_DEBUG=sysmem</code> из env.txt.
                </div>
              </div>

              <div className="bg-[#0f2a14] p-4 rounded-xl border border-amber-500/40 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <span>3.</span> Шейдер 0x95 и отсутствие APS5_HOST_FMA
                </div>
                <p className="text-xs text-[#c8e6c9] leading-relaxed">
                  Шейдер 0x95 (4568 инструкций, 44 вызова на кадр) выполняет бесконечные ряды умножений и сложений.
                  Без флага <code className="text-amber-200 font-mono">APS5_HOST_FMA=1</code> шейдер компилируется с запретом слияния NoContraction,
                  вынуждая Adreno выполнять умножение и сложение как две раздельные операции вместо одной быстрой инструкции <code className="text-white font-mono">mad</code>.
                </p>
                <div className="text-[11px] text-emerald-400 font-semibold mt-2">
                  → Решение: включить <code className="font-mono">APS5_HOST_FMA=1</code> и <code className="font-mono">APS5_GPU_TURBO=1</code>.
                </div>
              </div>
            </div>
          </div>

          {/* Диаграмма распределения времени GPU по шейдерным проходам */}
          <div className="bg-[#153e1b] border border-[#2e5e32] rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              Таймлайн GPU на 1 кадр (из реального лога gputime)
            </h3>
            <p className="text-xs text-[#c8e6c9] mb-4">
              Суммарно на кадр уходит ~44.6 мс на проходы отрисовки + ~9.5 мс на blit и upload:
            </p>

            <div className="space-y-3">
              {SHADER_PASSES.slice(0, 6).map((pass) => {
                const percentage = ((pass.timeMsPerFrame / totalGpuDrawTime) * 100).toFixed(1);
                return (
                  <div key={pass.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          pass.severity === 'critical' ? 'bg-red-500' : pass.severity === 'high' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} />
                        {pass.name}
                      </span>
                      <span className="font-mono text-[#c8e6c9]">
                        <strong className="text-white">{pass.timeMsPerFrame.toFixed(2)} мс</strong> ({pass.drawsPerFrame} draws) — {percentage}%
                      </span>
                    </div>

                    <div className="w-full h-3 bg-[#0a1c0d] rounded-full overflow-hidden border border-[#2e5e32]">
                      <div
                        className={`h-full rounded-full ${
                          pass.severity === 'critical'
                            ? 'bg-gradient-to-r from-red-600 to-red-400'
                            : pass.severity === 'high'
                            ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                            : 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'passes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Список шейдеров */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-white px-1">Все 8 шейдерных проходов игры</h4>
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
              {SHADER_PASSES.map((pass) => (
                <button
                  key={pass.id}
                  onClick={() => setSelectedPass(pass)}
                  className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                    selectedPass.id === pass.id
                      ? 'bg-[#2e7d32]/50 border-[#81c784] text-white shadow'
                      : 'bg-[#0f2a14] border-[#2e5e32] text-[#c8e6c9] hover:bg-[#153e1b]'
                  }`}
                >
                  <div>
                    <div className="font-mono text-xs font-bold text-white flex items-center gap-1.5">
                      {pass.id.replace('pass-80f0021c', 'Pass 0x')}
                      {pass.severity === 'critical' && (
                        <span className="px-1.5 py-0.2 bg-red-900 text-red-200 text-[10px] rounded font-sans">Тормозит</span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#a5d6a7] truncate max-w-[200px] mt-0.5">{pass.name}</div>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <div className="font-bold text-yellow-300">{pass.timeMsPerFrame} мс</div>
                    <div className="text-[10px] text-[#a5d6a7]">{pass.drawsPerFrame} draws</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Детальный просмотр выбранного шейдера */}
          <div className="lg:col-span-2 bg-[#153e1b] border border-[#2e5e32] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="border-b border-[#2e5e32] pb-3 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-emerald-400" />
                  {selectedPass.name}
                </h3>
                <span className="font-mono text-xs text-[#a5d6a7]">{selectedPass.id}.spv</span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                selectedPass.severity === 'critical'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                  : selectedPass.severity === 'high'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}>
                {selectedPass.severity.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-[#0f2a14] p-2.5 rounded-lg border border-[#2e5e32]">
                <span className="text-[#a5d6a7] text-[11px]">Время на 1 кадр:</span>
                <div className="font-mono text-white text-base font-bold">{selectedPass.timeMsPerFrame} мс</div>
              </div>
              <div className="bg-[#0f2a14] p-2.5 rounded-lg border border-[#2e5e32]">
                <span className="text-[#a5d6a7] text-[11px]">Вызовов (draws):</span>
                <div className="font-mono text-white text-base font-bold">{selectedPass.drawsPerFrame}</div>
              </div>
              <div className="bg-[#0f2a14] p-2.5 rounded-lg border border-[#2e5e32]">
                <span className="text-[#a5d6a7] text-[11px]">Инструкций в SPIR-V:</span>
                <div className="font-mono text-white text-base font-bold">{selectedPass.instructions}</div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Анализ компилятора:</h4>
              <ul className="space-y-1.5 text-xs text-[#e8f5e9]">
                {selectedPass.analysis.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Фрагмент SPIR-V кода:</h4>
              <pre className="bg-[#0a1c0d] p-3 rounded-xl border border-[#2e5e32] text-xs font-mono text-emerald-300 overflow-x-auto max-h-48 leading-relaxed">
                {selectedPass.fullSpirvSnippet}
              </pre>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'env_generator' && (
        <div className="bg-[#153e1b] border border-[#2e5e32] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-300" />
              <div>
                <h3 className="text-lg font-bold text-white">Оптимизированный файл env.txt</h3>
                <p className="text-xs text-[#c8e6c9]">
                  Создайте или замените файл <code className="font-mono text-amber-300">files/game/env.txt</code> в памяти телефона
                </p>
              </div>
            </div>

            <button
              onClick={copyEnv}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#2e7d32] hover:bg-[#388e3c] text-white text-xs font-bold rounded-xl transition shadow-lg"
            >
              {copiedEnv ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedEnv ? 'Скопировано!' : 'Скопировать весь env.txt'}
            </button>
          </div>

          <pre className="bg-[#0a1c0d] p-4 rounded-xl border border-[#2e5e32] text-xs font-mono text-[#a5d6a7] overflow-x-auto leading-relaxed">
            {optimalEnvContent}
          </pre>

          <div className="bg-[#0f2a14] p-4 rounded-xl border border-[#2e5e32] text-xs text-[#c8e6c9] space-y-2">
            <div className="font-bold text-white flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              Где лежит этот файл на телефоне:
            </div>
            <p>
              Путь: <code className="text-amber-300 font-mono">/sdcard/Android/data/org.anyps5.android/files/game/env.txt</code>
              <br />
              Либо во встроенном редакторе лаунчера при установке игры.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
