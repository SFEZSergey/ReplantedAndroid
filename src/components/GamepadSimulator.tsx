import React, { useState } from 'react';
import { Gamepad2, RotateCcw, Sliders, Eye, EyeOff } from 'lucide-react';
import { TouchControlItem, createDefaultControls, PAD_BITS } from '../types';

export const GamepadSimulator: React.FC = () => {
  const [controls, setControls] = useState<TouchControlItem[]>(createDefaultControls());
  const [opacity, setOpacity] = useState(0.85);
  const [visible, setVisible] = useState(true);
  const [activeButton, setActiveButton] = useState<string | null>(null);

  const resetControls = () => {
    setControls(createDefaultControls());
    setOpacity(0.85);
  };

  const toggleControl = (id: string) => {
    setControls((prev) =>
      prev.map((c) => (c.id === id ? { ...c, on: !c.on } : c))
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#153e1b] border border-[#2e5e32] rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#43a047]/20 border border-[#43a047]/40 flex items-center justify-center text-[#a5d6a7]">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Виртуальный геймпад PS5 (AnyPS5 libScePad)</h2>
              <p className="text-sm text-[#c8e6c9]">
                Интерактивный симулятор слоя TouchControlsView поверх игры
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setVisible(!visible)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0f2a14] border border-[#2e5e32] text-xs font-semibold rounded-lg text-white hover:bg-[#1b5e20] transition"
            >
              {visible ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
              {visible ? 'Скрыть слой' : 'Показать слой'}
            </button>
            <button
              onClick={resetControls}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0f2a14] border border-[#2e5e32] text-xs font-semibold rounded-lg text-white hover:bg-[#1b5e20] transition"
            >
              <RotateCcw className="w-4 h-4 text-amber-300" />
              Сброс
            </button>
          </div>
        </div>
      </div>

      {/* Экран симуляции */}
      <div className="bg-[#153e1b] border border-[#2e5e32] rounded-2xl p-6 shadow-xl space-y-4">
        <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-[#123817] to-[#07180a] border-2 border-[#43a047] rounded-xl overflow-hidden shadow-2xl select-none">
          {/* Фон игры */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <img src="/public/pvz_icon.jpg" alt="PvZ" className="w-48 h-48 rounded-full blur-sm" />
          </div>

          {/* Элементы управления */}
          {visible &&
            controls
              .filter((c) => c.on)
              .map((c) => {
                const isPressed = activeButton === c.id;
                return (
                  <button
                    key={c.id}
                    onMouseDown={() => setActiveButton(c.id)}
                    onMouseUp={() => setActiveButton(null)}
                    onTouchStart={() => setActiveButton(c.id)}
                    onTouchEnd={() => setActiveButton(null)}
                    style={{
                      left: `${c.x * 100}%`,
                      top: `${c.y * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      opacity: opacity,
                    }}
                    className={`absolute flex items-center justify-center rounded-full font-bold transition-transform active:scale-90 border-2 select-none shadow-lg ${
                      c.kind === 'stick'
                        ? 'w-16 h-16 bg-white/20 border-white/40 text-white text-base'
                        : c.kind === 'dpad'
                        ? 'w-16 h-16 bg-white/20 border-white/40 text-white text-xl'
                        : c.kind === 'toggle'
                        ? 'w-8 h-8 bg-white/30 border-white/60 text-white text-xs'
                        : isPressed
                        ? 'w-12 h-12 bg-white/70 border-white text-black'
                        : 'w-12 h-12 bg-white/25 border-white/50 text-white text-base'
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}

          <div className="absolute top-2 left-2 text-[10px] text-white/50 pointer-events-none">
            {activeButton ? `Нажата кнопка: ${activeButton.toUpperCase()}` : 'Касайтесь кнопок для симуляции ввода'}
          </div>
        </div>

        {/* Настройки прозрачности и список кнопок */}
        <div className="bg-[#0f2a14] p-4 rounded-xl border border-[#2e5e32] space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#c8e6c9] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              Непрозрачность кнопок (opacity):
            </span>
            <span className="font-mono font-bold text-white">{(opacity * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="1"
            step="0.05"
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />

          <div>
            <div className="text-xs font-semibold text-white mb-2">Переключатели отображения кнопок:</div>
            <div className="flex flex-wrap gap-2">
              {controls.map((c) => (
                <button
                  key={c.id}
                  onClick={() => toggleControl(c.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition border ${
                    c.on
                      ? 'bg-[#2e7d32] border-[#81c784] text-white'
                      : 'bg-[#0a1c0d] border-[#2e5e32] text-[#a5d6a7]/60 hover:text-white'
                  }`}
                >
                  {c.label} {c.id.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
