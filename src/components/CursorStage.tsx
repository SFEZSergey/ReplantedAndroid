import React, { useState, useEffect, useRef } from 'react';
import { MousePointer, CheckCircle2, AlertTriangle, Play, Sparkles, Copy, Check, Info } from 'lucide-react';

export const CursorStage: React.FC = () => {
  const [clickMode, setClickMode] = useState<'buggy' | 'fixed'>('fixed');
  const [mouseSubmode, setMouseSubmode] = useState<'relative' | 'direct'>('direct');
  const [clickStats, setClickStats] = useState({ sent: 0, receivedByGame: 0 });
  const [cursorPos, setCursorPos] = useState({ x: 50, y: 50 }); // percentage
  const [lastClickStatus, setLastClickStatus] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Simulated game loop running at ~16.5 FPS (60.6ms) as in user's box64.log
  const simulatedGameFps = 16.5;
  const frameIntervalMs = 1000 / simulatedGameFps;
  const isButtonPressedRef = useRef(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      if (isButtonPressedRef.current) {
        setClickStats((prev) => ({
          ...prev,
          receivedByGame: prev.receivedByGame + 1,
        }));
        setLastClickStatus('УСПЕХ! Кадр игры считал нажатие');
      }
    }, frameIntervalMs);

    return () => clearInterval(timer);
  }, [frameIntervalMs]);

  const handleScreenTouch = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const touchX = ((e.clientX - rect.left) / rect.width) * 100;
    const touchY = ((e.clientY - rect.top) / rect.height) * 100;

    if (mouseSubmode === 'direct') {
      setCursorPos({ x: touchX, y: touchY });
    }

    setClickStats((prev) => ({ ...prev, sent: prev.sent + 1 }));

    if (clickMode === 'buggy') {
      // Имитация старого кода: mouse(0, 0, button, true) сразу же mouse(0, 0, button, false)
      isButtonPressedRef.current = true;
      // Сброс через < 0.1 мс (в том же макротаске или microtask)
      setTimeout(() => {
        isButtonPressedRef.current = false;
      }, 0);
      setLastClickStatus('Клик отправлен импульсом 0.01мс... Игра на 16 FPS скорее всего пропустит!');
    } else {
      // Исправленный режим: фиксация клика на 80-100 мс (гарантирует захват игровым циклом на 16-60 FPS)
      isButtonPressedRef.current = true;
      setTimeout(() => {
        isButtonPressedRef.current = false;
      }, 85);
      setLastClickStatus('Клик зафиксирован на 85мс: гарантированно попадёт в опрос sceMouseRead!');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const javaFixCode = `// Исправление в TouchControlsView.java
// 1. Устранение гонки клика: удерживаем кнопку 80-100 мс (хватает при любом FPS 15-60)
// 2. Поддержка прямого нажатия пальцем в точку экрана (Direct Screen Tap)

private final android.os.Handler mouseHandler = new android.os.Handler(android.os.Looper.getMainLooper());
private boolean directTouchMode = true; // true = прямое касание в точку, false = относительный тачпад

private boolean mouseUp(MotionEvent event, int id) {
    if (id == mouseExtraPointer) { mouseExtraPointer = -1; return true; }
    if (mouseDragging) {
        mouse(0, 0, 1, false);
    } else if (!mouseMoved && event.getEventTime() - mouseDownTime <= MOUSE_TAP_MS) {
        final int button = mouseSecondFinger ? 2 : 1;
        
        // ВАЖНО: Игра опрашивает мышь раз в кадр (на 16 FPS это каждые 62 мс).
        // Если сразу вызвать true и false, игра в 99% случаев не успеет прочитать!
        mouse(0, 0, button, true);
        mouseHandler.postDelayed(new Runnable() {
            @Override public void run() {
                mouse(0, 0, button, false);
            }
        }, 85); // 85 мс гарантирует считывание даже при просадках до 12 FPS!
    }
    mousePointer = -1;
    mouseDragging = false;
    return true;
}

// В mouseDown для режима прямого касания пальцем:
private boolean mouseDown(MotionEvent event, int index) {
    // Если включен режим прямого сенсора: мгновенно телепортируем курсор в точку нажатия!
    if (directTouchMode) {
        float normX = event.getX(index) / getWidth();
        float normY = event.getY(index) / getHeight();
        // В виртуальных координатах игры (1920x1080):
        int targetX = (int)(normX * 1920f);
        int targetY = (int)(normY * 1080f);
        // Перемещаем абсолютный курсор и сбрасываем относительное накопление
        GameActivity.nativeTouchMouseAbsolute(targetX, targetY);
    }
    ...
}`;

  return (
    <div className="space-y-6">
      {/* Шапка этапа */}
      <div className="bg-[#153e1b] border border-[#2e5e32] rounded-2xl p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#43a047]/20 border border-[#43a047]/40 flex items-center justify-center text-[#a5d6a7]">
              <MousePointer className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#43a047]/20 text-[#a5d6a7] border border-[#43a047]/30 mb-1">
                ЭТАП 1
              </div>
              <h2 className="text-xl font-bold text-white">Диагностика и решение проблем курсора и кликов</h2>
              <p className="text-sm text-[#c8e6c9]">
                Почему «клики не проходят, а если проходят то через пару попыток» и «нажимаю пальцем — кликов нет»
              </p>
            </div>
          </div>
        </div>

        {/* Две главные причины */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="bg-[#0f2a14]/90 p-4 rounded-xl border border-red-500/40">
            <div className="flex items-center gap-2 text-red-400 font-semibold mb-2">
              <AlertTriangle className="w-5 h-5" />
              Причина 1: Гонка потоков в mouseUp (Сотые доли миллисекунды)
            </div>
            <p className="text-xs text-[#e8f5e9] leading-relaxed">
              В <code className="text-amber-300">TouchControlsView.java</code> при отпускании пальца подряд вызываются:
              <br />
              <code className="text-red-300 block my-1 font-mono bg-black/40 p-1.5 rounded">
                mouse(0, 0, button, true);<br />
                mouse(0, 0, button, false);
              </code>
              Кнопка зажимается и тут же отпускается за <strong className="text-white">~0.001 мс</strong>.
              А игровой цикл игры (особенно при низком ФПС 16 кадров/с из лога) опрашивает координаты мыши лишь раз в <strong className="text-white">62 мс</strong>!
              Шанс того, что опрос игры попадет ровно в этот миг — меньше <strong className="text-red-400">0.1%</strong>.
              Поэтому клик срабатывает лишь со случайной 5-10 попытки.
            </p>
          </div>

          <div className="bg-[#0f2a14]/90 p-4 rounded-xl border border-amber-500/40">
            <div className="flex items-center gap-2 text-amber-400 font-semibold mb-2">
              <Info className="w-5 h-5" />
              Причина 2: Относительный тачпад вместо прямого касания
            </div>
            <p className="text-xs text-[#e8f5e9] leading-relaxed">
              По умолчанию касания вне кнопок работают как <strong className="text-white">ноутбучный тачпад</strong>:
              палец нужно <strong className="text-amber-300">вести</strong>, чтобы сдвинуть курсор на <code className="text-amber-200">dx, dy</code>.
              Когда вы нажимаете пальцем прямо на зомби или цветок, <code className="text-amber-200">dx=0, dy=0</code> — курсор <strong className="text-white">не телепортируется</strong> под ваш палец,
              а остаётся в прежнем месте (например, в центре экрана).
              Для игры на телефоне нужен режим <strong className="text-emerald-400">Direct Tap (Прямое нажатие в координаты)</strong>!
            </p>
          </div>
        </div>
      </div>

      {/* Интерактивный симулятор курсора и кликов */}
      <div className="bg-[#153e1b] border border-[#2e5e32] rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Play className="w-5 h-5 text-[#81c784]" />
              Интерактивный тест кликов в реальном времени
            </h3>
            <p className="text-xs text-[#c8e6c9]">
              Симулирует игровой цикл AnyPS5 (частота опроса: {simulatedGameFps} кадров/с, период {frameIntervalMs.toFixed(1)} мс)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Выбор режима клика */}
            <div className="bg-[#0f2a14] p-1 rounded-xl flex border border-[#2e5e32] text-xs">
              <button
                onClick={() => setClickMode('buggy')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  clickMode === 'buggy' ? 'bg-red-900/60 text-red-200 border border-red-500/50' : 'text-[#a5d6a7] hover:text-white'
                }`}
              >
                Исходный код (0.01 мс гонка)
              </button>
              <button
                onClick={() => setClickMode('fixed')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  clickMode === 'fixed' ? 'bg-[#2e7d32] text-white border border-[#81c784]/60' : 'text-[#a5d6a7] hover:text-white'
                }`}
              >
                Исправленный (85 мс Latch)
              </button>
            </div>

            {/* Выбор позиционирования */}
            <div className="bg-[#0f2a14] p-1 rounded-xl flex border border-[#2e5e32] text-xs">
              <button
                onClick={() => setMouseSubmode('relative')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  mouseSubmode === 'relative' ? 'bg-amber-900/60 text-amber-200 border border-amber-500/50' : 'text-[#a5d6a7] hover:text-white'
                }`}
              >
                Относительный тачпад
              </button>
              <button
                onClick={() => setMouseSubmode('direct')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  mouseSubmode === 'direct' ? 'bg-[#2e7d32] text-white border border-[#81c784]/60' : 'text-[#a5d6a7] hover:text-white'
                }`}
              >
                Прямой сенсор (Direct Tap)
              </button>
            </div>
          </div>
        </div>

        {/* Интерактивный виртуальный экран */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-2">
            <div
              ref={canvasRef}
              onClick={handleScreenTouch}
              className="relative w-full aspect-[16/9] bg-gradient-to-br from-[#1b5e20] to-[#0d2813] border-2 border-[#43a047] rounded-xl overflow-hidden cursor-crosshair shadow-inner flex flex-col justify-between p-4 group select-none"
            >
              {/* Сетка игры */}
              <div className="absolute inset-0 bg-[radial-gradient(#43a047_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />

              {/* Зомби / цели для клика */}
              <div className="absolute top-1/4 right-1/4 w-14 h-14 rounded-full bg-red-600/30 border border-red-500 flex items-center justify-center text-xs font-bold text-red-200 animate-pulse pointer-events-none">
                Зомби
              </div>
              <div className="absolute bottom-1/3 left-1/4 w-12 h-12 rounded-full bg-emerald-600/30 border border-emerald-400 flex items-center justify-center text-xs font-bold text-emerald-200 pointer-events-none">
                Горох
              </div>
              <div className="absolute top-1/3 left-1/2 w-10 h-10 rounded-full bg-amber-600/30 border border-amber-400 flex items-center justify-center text-xs font-bold text-amber-200 pointer-events-none">
                Солнце
              </div>

              {/* Виртуальный курсор */}
              <div
                className="absolute w-8 h-8 -ml-4 -mt-4 pointer-events-none transition-all duration-75 flex items-center justify-center"
                style={{ left: `${cursorPos.x}%`, top: `${cursorPos.y}%` }}
              >
                <div className="relative">
                  <MousePointer className="w-6 h-6 text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75" />
                </div>
              </div>

              <div className="text-[11px] text-white/70 bg-black/50 px-2 py-1 rounded w-fit pointer-events-none">
                Нажмите в любое место игрового поля для отправки клика
              </div>

              <div className="text-[11px] text-right text-emerald-300/80 bg-black/50 px-2 py-1 rounded w-fit self-end pointer-events-none">
                Режим: {mouseSubmode === 'direct' ? 'Прямой сенсор (курсор под пальцем)' : 'Тачпад (курсор не двигается)'}
              </div>
            </div>

            <div className="text-xs text-[#a5d6a7] flex items-center justify-between px-1">
              <span>{lastClickStatus || 'Ожидание нажатия...'}</span>
              <span>Координаты курсора: X: {(cursorPos.x * 19.2).toFixed(0)}px, Y: {(cursorPos.y * 10.8).toFixed(0)}px</span>
            </div>
          </div>

          {/* Статистика и аналитика в реальном времени */}
          <div className="bg-[#0f2a14] border border-[#2e5e32] rounded-xl p-4 flex flex-col justify-between">
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-white border-b border-[#2e5e32] pb-2">
                Регистрация кликов движком AnyPS5
              </h4>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#c8e6c9]">Отправлено кликов:</span>
                  <span className="font-mono text-white text-sm font-bold">{clickStats.sent}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#c8e6c9]">Считано игровым циклом:</span>
                  <span className={`font-mono text-sm font-bold ${clickStats.receivedByGame > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {clickStats.receivedByGame}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#c8e6c9]">Эффективность регистрации:</span>
                  <span className="font-mono text-sm font-bold text-yellow-300">
                    {clickStats.sent > 0 ? `${((clickStats.receivedByGame / clickStats.sent) * 100).toFixed(1)}%` : '—'}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-black/40 text-xs text-[#e8f5e9] space-y-1">
                  <div className="font-semibold text-amber-300">Текущий опрос игры:</div>
                  <div>~{simulatedGameFps} FPS (1 кадр каждые {frameIntervalMs.toFixed(1)} мс)</div>
                  <div className="text-[11px] text-[#a5d6a7]">
                    {clickMode === 'buggy'
                      ? '⚠️ В исходном коде сигнал отжат за 0.01мс, опрос игры не успевает его зафиксировать.'
                      : '✅ Фиксация 85мс гарантированно накрывает 1-2 кадра опроса.'}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setClickStats({ sent: 0, receivedByGame: 0 })}
              className="w-full mt-4 py-2 px-3 bg-[#2e5e32]/50 hover:bg-[#2e5e32] text-xs font-semibold rounded-lg text-white transition border border-[#81c784]/30"
            >
              Сбросить счетчики
            </button>
          </div>
        </div>
      </div>

      {/* Готовое решение и патч */}
      <div className="bg-[#153e1b] border border-[#2e5e32] rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">Готовое решение в коде APK</h3>
          </div>
          <button
            onClick={() => copyToClipboard(javaFixCode, 'java_fix')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2e7d32] hover:bg-[#388e3c] text-white text-xs font-semibold rounded-lg transition"
          >
            {copiedCode === 'java_fix' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copiedCode === 'java_fix' ? 'Скопировано!' : 'Копировать Java-патч'}
          </button>
        </div>

        <p className="text-xs text-[#c8e6c9] mb-3">
          В файле <code className="text-amber-300 font-mono">android/src/org/anyps5/android/TouchControlsView.java</code> в методе <code className="text-amber-300 font-mono">mouseUp()</code> заменяем мгновенный отжим на отложенный:
        </p>

        <pre className="bg-[#0a1c0d] p-4 rounded-xl border border-[#2e5e32] text-xs font-mono text-[#a5d6a7] overflow-x-auto leading-relaxed">
          {javaFixCode}
        </pre>
      </div>
    </div>
  );
};
