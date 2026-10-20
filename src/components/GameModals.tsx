import React from 'react';
import { Play, RotateCcw, Sparkles, Star, TrendingUp } from 'lucide-react';
import { formatCompactNumber } from '../game/economy.ts';
import type { BottleneckAnalysis, GameScreenState, PersistentGameState } from '../game/types.ts';
import { triggerHaptic } from '../utils/telegram.ts';

interface GameModalsProps {
  screenState: GameScreenState;
  gameState: PersistentGameState;
  bottleneck: BottleneckAnalysis;
  offlineReward: { seconds: number; earned: number } | null;
  onClaimOfflineReward: () => void;
  onStartGame: () => void;
  onResumeGame: () => void;
  onResetSave: () => void;
}

export const GameModals: React.FC<GameModalsProps> = ({
  screenState,
  gameState,
  bottleneck,
  offlineReward,
  onClaimOfflineReward,
  onStartGame,
  onResumeGame,
  onResetSave,
}) => {
  return (
    <>
      {/* 1. TITLE SCREEN OVERLAY */}
      {screenState === 'title' && (
        <div className="fixed inset-0 z-40 pointer-events-auto flex flex-col justify-between p-6 sm:p-10 bg-gradient-to-t from-[#090A0F] via-[#090A0F]/65 to-transparent">
          <div className="flex items-center justify-between max-w-5xl w-full mx-auto">
            <span className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
              Q-Drop Urban Logistics OS
            </span>
            <span className="text-xs font-mono tabular-nums text-zinc-400 inline-flex items-center gap-1">
              <span>Мегаполис Тир {gameState.prestige.metropolisTier + 1} · Рейтинг {gameState.rating.toFixed(1)}</span>
              <Star className="w-3.5 h-3.5 text-[#FFD60A] fill-current inline" />
            </span>
          </div>

          {/* Center-Left Negative Space Emblem & Primary Start CTA */}
          <div className="my-auto max-w-xl mx-auto w-full flex flex-col items-center text-center gap-6">
            {/* Custom Inline SVG Title Lockup */}
            <svg
              viewBox="0 0 380 110"
              className="w-72 sm:w-88 h-auto drop-shadow-2xl"
              role="img"
              aria-label="Q-Drop: Last-Mile Logistics"
            >
              <defs>
                <linearGradient id="qdropIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0A84FF" />
                  <stop offset="100%" stopColor="#BF5AF2" />
                </linearGradient>
              </defs>
              {/* Isometric Route Hex Emblem */}
              <g transform="translate(18, 16)">
                <rect
                  x="0"
                  y="0"
                  width="76"
                  height="76"
                  rx="20"
                  fill="#12141C"
                  stroke="url(#qdropIconGrad)"
                  strokeWidth="2.5"
                />
                <path
                  d="M20 52 L38 20 L56 52 L38 43 Z"
                  fill="url(#qdropIconGrad)"
                />
                <circle cx="38" cy="20" r="4" fill="#30D158" />
                <circle cx="20" cy="52" r="3.5" fill="#64D2FF" />
                <circle cx="56" cy="52" r="3.5" fill="#FFD60A" />
              </g>
              {/* Display Typography Lockup */}
              <text
                x="112"
                y="54"
                fill="#FFFFFF"
                fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
                fontWeight="800"
                fontSize="42"
                letterSpacing="-1"
              >
                Q-DROP
              </text>
              <text
                x="114"
                y="78"
                fill="#64D2FF"
                fontFamily="-apple-system, BlinkMacSystemFont, monospace"
                fontWeight="600"
                fontSize="13"
                letterSpacing="2.8"
              >
                LAST-MILE LOGISTICS
              </text>
            </svg>

            <p className="text-sm sm:text-base text-zinc-300 max-w-md leading-relaxed">
              Управляйте сетью дарксторов, балансируйте спрос, сборку и флот курьеров от пеших
              агентов до грузовых дронов в реальном времени.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
              <button
                type="button"
                data-start="true"
                onClick={(e) => {
                  e.currentTarget.blur();
                  triggerHaptic('heavy');
                  onStartGame();
                }}
                className="w-full min-h-[52px] px-6 py-3.5 rounded-2xl bg-[#0A84FF] hover:bg-[#0070E0] text-white font-bold text-base shadow-xl shadow-[#0A84FF]/30 active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Запустить сеть</span>
              </button>
            </div>
          </div>

          {/* Flat Single-Line Control Hint in Bottom Safe Margin */}
          <div className="text-center text-xs text-zinc-400">
            Перетаскивание Карты · Клик по Даркстору Инспекция · Пробел / Enter Старт · Esc Пауза
          </div>
        </div>
      )}

      {/* 2. PAUSE & EXPORT MODAL */}
      {screenState === 'paused' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Пауза и системное меню"
          className="fixed inset-0 z-50 pointer-events-auto flex items-center justify-center p-4 bg-black/75"
        >
          <div
            className="w-full max-w-md rounded-[28px] border border-white/10 p-6 shadow-2xl flex flex-col gap-5"
            style={{ backgroundColor: 'rgba(28, 28, 30, 0.98)' }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Управление симуляцией</h2>
              <span className="text-xs font-mono text-[#30D158]">ПАУЗА</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                <span className="text-[11px] text-zinc-400 block">Доставлено</span>
                <span className="text-base font-bold text-white font-mono tabular-nums">
                  {formatCompactNumber(gameState.totalOrdersDelivered, 0)}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                <span className="text-[11px] text-zinc-400 block">Поток $/с</span>
                <span className="text-base font-bold text-[#30D158] font-mono tabular-nums">
                  ${formatCompactNumber(bottleneck.netIncomePerSec)}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                <span className="text-[11px] text-zinc-400 block">Рейтинг</span>
                <span className="text-base font-bold text-[#FFD60A] font-mono tabular-nums inline-flex items-center justify-center gap-1">
                  <span>{gameState.rating.toFixed(1)}</span>
                  <Star className="w-3.5 h-3.5 fill-current" />
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onResumeGame();
                }}
                className="w-full min-h-[48px] rounded-2xl bg-[#0A84FF] text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Продолжить работу</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('warning');
                  onResetSave();
                }}
                className="w-full min-h-[44px] rounded-2xl bg-[#FF453A]/15 hover:bg-[#FF453A]/25 text-[#FF453A] font-semibold text-xs flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Сбросить прогресс города</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. OFFLINE EARNINGS MODAL */}
      {offlineReward && screenState === 'playing' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Офлайн-доход"
          className="fixed inset-0 z-50 pointer-events-auto flex items-center justify-center p-4 bg-black/70"
        >
          <div
            className="w-full max-w-sm rounded-[28px] border border-white/10 p-6 shadow-2xl flex flex-col items-center text-center gap-4"
            style={{ backgroundColor: 'rgba(28, 28, 30, 0.98)' }}
          >
            <div className="w-12 h-12 rounded-2xl bg-[#30D158]/20 border border-[#30D158]/40 flex items-center justify-center text-[#30D158]">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Автономная смена завершена</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Пока вас не было ({Math.round(offlineReward.seconds)} сек.), дарксторы и курьеры
                продолжали выполнять заказы.
              </p>
            </div>
            <div className="text-2xl font-extrabold text-[#30D158] font-mono tabular-nums">
              +${formatCompactNumber(offlineReward.earned)}
            </div>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('success');
                onClaimOfflineReward();
              }}
              className="w-full min-h-[46px] rounded-2xl bg-[#30D158] text-black font-bold text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
            >
              <Sparkles className="w-4 h-4" />
              <span>Забрать выручку</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
