import React, { useState } from 'react';
import { CursorStage } from './components/CursorStage';
import { OptimizationStage } from './components/OptimizationStage';
import { GamepadSimulator } from './components/GamepadSimulator';
import { CommandsStage } from './components/CommandsStage';
import { MousePointer, Gauge, Gamepad2, Download, Check, Sparkles, Terminal } from 'lucide-react';
import { OPTIMAL_ENV_CONTENT } from './data/shaderData';

export default function App() {
  const [activeTab, setActiveTab] = useState<'optimization' | 'commands' | 'cursor' | 'gamepad'>('commands');
  const [copiedQuickEnv, setCopiedQuickEnv] = useState(false);

  const handleQuickDownloadEnv = () => {
    const blob = new Blob([OPTIMAL_ENV_CONTENT], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'env.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setCopiedQuickEnv(true);
    setTimeout(() => setCopiedQuickEnv(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0a1c0d] text-[#f1f8e9] flex flex-col font-sans selection:bg-[#43a047] selection:text-white">
      {/* Верхняя навигационная панель по контракту 3-х зон */}
      <header className="border-b border-[#2e5e32] bg-[#0f2a14]/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-6">
          {/* Зона 1: Бренд wordmark (одноэлементный заголовок) */}
          <div className="flex items-center gap-3 shrink-0">
            <img
              src="/pvz_icon.jpg"
              alt="AnyPS5 Hub"
              className="w-9 h-9 rounded-xl border border-[#43a047]/40 object-cover shrink-0"
            />
            <span className="text-base font-bold text-white tracking-wide whitespace-nowrap">
              AnyPS5 Android Hub
            </span>
          </div>

          {/* Зона 2: Навигационные вкладки в одну строку без переносов */}
          <nav className="hidden md:flex items-center gap-1 bg-[#0a1c0d] p-1 rounded-xl border border-[#2e5e32] text-xs">
            <button
              onClick={() => setActiveTab('commands')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold transition whitespace-nowrap shrink-0 ${
                activeTab === 'commands'
                  ? 'bg-[#2e7d32] text-white shadow'
                  : 'text-[#c8e6c9] hover:text-white hover:bg-[#153e1b]'
              }`}
            >
              <Terminal className="w-4 h-4 text-purple-300" />
              <span>Команды (Termux & Патчи)</span>
            </button>

            <button
              onClick={() => setActiveTab('optimization')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold transition whitespace-nowrap shrink-0 ${
                activeTab === 'optimization'
                  ? 'bg-[#2e7d32] text-white shadow'
                  : 'text-[#c8e6c9] hover:text-white hover:bg-[#153e1b]'
              }`}
            >
              <Gauge className="w-4 h-4 text-amber-300" />
              <span>Оптимизация Mewgenics (Шейдеры & GPU)</span>
            </button>

            <button
              onClick={() => setActiveTab('cursor')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold transition whitespace-nowrap shrink-0 ${
                activeTab === 'cursor'
                  ? 'bg-[#2e7d32] text-white shadow'
                  : 'text-[#c8e6c9] hover:text-white hover:bg-[#153e1b]'
              }`}
            >
              <MousePointer className="w-4 h-4 text-emerald-300" />
              <span>Курсор и клики</span>
            </button>

            <button
              onClick={() => setActiveTab('gamepad')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold transition whitespace-nowrap shrink-0 ${
                activeTab === 'gamepad'
                  ? 'bg-[#2e7d32] text-white shadow'
                  : 'text-[#c8e6c9] hover:text-white hover:bg-[#153e1b]'
              }`}
            >
              <Gamepad2 className="w-4 h-4 text-[#81c784]" />
              <span>Виртуальный геймпад</span>
            </button>
          </nav>

          {/* Зона 3: Первичное действие */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleQuickDownloadEnv}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2e7d32] hover:bg-[#388e3c] text-white rounded-xl text-xs font-bold transition shadow whitespace-nowrap"
            >
              {copiedQuickEnv ? <Check className="w-4 h-4 text-emerald-300" /> : <Download className="w-4 h-4" />}
              <span>{copiedQuickEnv ? 'Скачано' : 'Скачать env.txt'}</span>
            </button>
          </div>
        </div>

        {/* Мобильная полоса навигации */}
        <div className="md:hidden flex items-center justify-around border-t border-[#2e5e32] px-2 py-2 bg-[#0a1c0d] text-xs">
          <button
            onClick={() => setActiveTab('commands')}
            className={`px-2.5 py-1.5 rounded-lg font-semibold whitespace-nowrap ${
              activeTab === 'commands' ? 'bg-[#2e7d32] text-white' : 'text-[#a5d6a7]'
            }`}
          >
            Команды
          </button>
          <button
            onClick={() => setActiveTab('optimization')}
            className={`px-2.5 py-1.5 rounded-lg font-semibold whitespace-nowrap ${
              activeTab === 'optimization' ? 'bg-[#2e7d32] text-white' : 'text-[#a5d6a7]'
            }`}
          >
            Шейдеры & GPU
          </button>
          <button
            onClick={() => setActiveTab('cursor')}
            className={`px-2.5 py-1.5 rounded-lg font-semibold whitespace-nowrap ${
              activeTab === 'cursor' ? 'bg-[#2e7d32] text-white' : 'text-[#a5d6a7]'
            }`}
          >
            Курсор
          </button>
          <button
            onClick={() => setActiveTab('gamepad')}
            className={`px-2.5 py-1.5 rounded-lg font-semibold whitespace-nowrap ${
              activeTab === 'gamepad' ? 'bg-[#2e7d32] text-white' : 'text-[#a5d6a7]'
            }`}
          >
            Геймпад
          </button>
        </div>
      </header>

      {/* Контекстная панель статуса без декоративных пульсирующих точек */}
      <section className="bg-gradient-to-r from-[#123617] via-[#1b5e20] to-[#0a1c0d] border-b border-[#2e5e32] px-4 py-2.5 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-emerald-100">
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
            <span>
              <strong>Целевой профиль Mewgenics:</strong> 1080p + аппаратный GMEM тайлинг + патч fast-math (разгрузка Log2/Exp2 и софтверного FTZ).
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#a5d6a7] font-mono shrink-0 tabular-nums">
            <span>Логи: 17.5 FPS (4K sysmem)</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-300 font-bold">Цель: 60.0 FPS (1080p GMEM)</span>
          </div>
        </div>
      </section>

      {/* Основной контент */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1">
        {activeTab === 'commands' && <CommandsStage />}
        {activeTab === 'optimization' && <OptimizationStage />}
        {activeTab === 'cursor' && <CursorStage />}
        {activeTab === 'gamepad' && <GamepadSimulator />}
      </main>

      {/* Футер */}
      <footer className="border-t border-[#2e5e32] bg-[#0f2a14] py-4 text-xs text-[#a5d6a7]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            AnyPS5 + box64 + Turnip (Mesa 26.3) • Инженерный хаб оптимизации Mewgenics (PPSA37318)
          </div>
          <div className="text-[11px] text-[#81c784]/90">
            Snapdragon 8 Elite (SM8750) • Adreno 830
          </div>
        </div>
      </footer>
    </div>
  );
}
