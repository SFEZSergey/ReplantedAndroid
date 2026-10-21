import React, { useState } from 'react';
import { CursorStage } from './components/CursorStage';
import { OptimizationStage } from './components/OptimizationStage';
import { GamepadSimulator } from './components/GamepadSimulator';
import { MousePointer, Gauge, Gamepad2, Sparkles, Terminal, BookOpen, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'cursor' | 'optimization' | 'gamepad'>('cursor');

  return (
    <div className="min-h-screen bg-[#0a1c0d] text-[#f1f8e9] flex flex-col font-sans selection:bg-[#43a047] selection:text-white">
      {/* Верхняя навигационная панель */}
      <header className="border-b border-[#2e5e32] bg-[#0f2a14]/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/public/pvz_icon.jpg"
              alt="PvZ Replanted"
              className="w-10 h-10 rounded-xl shadow border border-[#43a047]/40 object-cover"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-wide">
                  PvZ: Replanted — Android Hub
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#2e7d32]/50 text-[#a5d6a7] border border-[#43a047]/40 font-semibold">
                  v0.1.4-beta
                </span>
              </div>
              <p className="text-xs text-[#a5d6a7]">
                AnyPS5 + box64 + Turnip (Mesa 26.3) • Snapdragon 8 Elite (SM8750)
              </p>
            </div>
          </div>

          {/* Вкладки этапов */}
          <nav className="flex items-center gap-1.5 bg-[#0a1c0d] p-1 rounded-xl border border-[#2e5e32] text-xs">
            <button
              onClick={() => setActiveTab('cursor')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition ${
                activeTab === 'cursor'
                  ? 'bg-[#2e7d32] text-white shadow-md'
                  : 'text-[#c8e6c9] hover:text-white hover:bg-[#153e1b]'
              }`}
            >
              <MousePointer className="w-4 h-4 text-emerald-300" />
              <span>Этап 1: Курсор и клики</span>
            </button>

            <button
              onClick={() => setActiveTab('optimization')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition ${
                activeTab === 'optimization'
                  ? 'bg-[#2e7d32] text-white shadow-md'
                  : 'text-[#c8e6c9] hover:text-white hover:bg-[#153e1b]'
              }`}
            >
              <Gauge className="w-4 h-4 text-amber-300" />
              <span>Этап 2: Оптимизация (ФПС и шейдеры)</span>
            </button>

            <button
              onClick={() => setActiveTab('gamepad')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition ${
                activeTab === 'gamepad'
                  ? 'bg-[#2e7d32] text-white shadow-md'
                  : 'text-[#c8e6c9] hover:text-white hover:bg-[#153e1b]'
              }`}
            >
              <Gamepad2 className="w-4 h-4 text-[#81c784]" />
              <span className="hidden sm:inline">Виртуальный геймпад</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Быстрое уведомление по ситуации пользователя */}
      <section className="bg-gradient-to-r from-[#153e1b] via-[#1b5e20] to-[#0f2a14] border-b border-[#2e5e32] px-4 py-3 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-emerald-200">
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
            <span>
              <strong>План решения:</strong> 1) Устраняем гонку в mouseUp (клик отжимался за 0.01мс при опросе игры раз в 62мс) + Direct-Touch. 2) Отключаем TU_DEBUG=sysmem и переводим 4K UHD в 1080p для 60 FPS.
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-[#a5d6a7] shrink-0">
            <span>Логи: 16.3 FPS @ 3840×2160</span>
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
          </div>
        </div>
      </section>

      {/* Основной контент */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1">
        {activeTab === 'cursor' && <CursorStage />}
        {activeTab === 'optimization' && <OptimizationStage />}
        {activeTab === 'gamepad' && <GamepadSimulator />}
      </main>

      {/* Футер */}
      <footer className="border-t border-[#2e5e32] bg-[#0f2a14] py-4 text-center text-xs text-[#a5d6a7]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            PvZ: Replanted (PS5 PPSA29802) Android Port Hub • AnyPS5 + box64 + Turnip
          </div>
          <div className="text-[11px] text-[#81c784]/80">
            Snapdragon 8 Elite / Adreno 830 • One-touch diagnostics
          </div>
        </div>
      </footer>
    </div>
  );
}
