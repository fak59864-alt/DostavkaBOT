import React, { useState } from 'react';
import {
  Activity,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Compass,
  Flame,
  Gauge,
  Layers,
  Pause,
  Star,
  Sun,
  TrendingUp,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import {
  INITIAL_DISTRICTS,
  formatCompactNumber,
  getTimeOfDayProfile,
  getWeatherProfile,
} from '../game/economy.ts';
import type {
  BottleneckAnalysis,
  MapLayerMode,
  PersistentGameState,
  WeatherType,
} from '../game/types.ts';
import { triggerHaptic } from '../utils/telegram.ts';

interface TopHudProps {
  gameState: PersistentGameState;
  bottleneck: BottleneckAnalysis;
  layerMode: MapLayerMode;
  onChangeLayerMode: (mode: MapLayerMode) => void;
  onToggleSimSpeed: () => void;
  onCycleWeather: () => void;
  onFocusDistrict: (districtId: string) => void;
  onOpenPause: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TopHud: React.FC<TopHudProps> = ({
  gameState,
  bottleneck,
  layerMode,
  onChangeLayerMode,
  onToggleSimSpeed,
  onCycleWeather,
  onFocusDistrict,
  onOpenPause,
  isMuted,
  onToggleMute,
}) => {
  const [showAnalyzerDetail, setShowAnalyzerDetail] = useState(false);

  const timeProfile = getTimeOfDayProfile(gameState.gameMinutes);
  const weatherProfile = getWeatherProfile(gameState.weather);

  const renderWeatherIcon = (w: WeatherType) => {
    switch (w) {
      case 'rain':
        return <CloudRain className="w-3.5 h-3.5 text-[#64D2FF] shrink-0" />;
      case 'snow':
        return <CloudSnow className="w-3.5 h-3.5 text-white shrink-0" />;
      case 'storm':
        return <CloudLightning className="w-3.5 h-3.5 text-[#BF5AF2] shrink-0" />;
      case 'clear':
      default:
        return <Sun className="w-3.5 h-3.5 text-[#FFD60A] shrink-0" />;
    }
  };

  return (
    <div className="fixed inset-x-0 top-0 z-20 pointer-events-none px-2.5 pt-2 sm:px-5 sm:pt-3.5 flex flex-col gap-1.5 sm:gap-2 max-w-6xl mx-auto">
      {/* Row 1: Unified Responsive iOS Dynamic Island Header */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-1.5 sm:gap-2">
        {/* Left Island: Balance, $/sec, Rating */}
        <div
          className="pointer-events-auto flex items-center justify-between sm:justify-start gap-2.5 sm:gap-4 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-[18px] sm:rounded-[20px] border border-white/[0.08] shadow-2xl w-full sm:w-auto"
          style={{ backgroundColor: 'rgba(28, 28, 30, 0.92)' }}
        >
          <div className="flex items-center gap-2.5 sm:gap-4">
            {/* Balance */}
            <div className="flex flex-col">
              <span className="text-[9px] sm:text-[10px] font-semibold tracking-wider text-zinc-400 uppercase whitespace-nowrap">
                Баланс
              </span>
              <span
                data-testid="hud-balance"
                className="text-sm sm:text-xl font-bold text-white font-mono tabular-nums leading-tight whitespace-nowrap"
              >
                ${formatCompactNumber(gameState.money)}
              </span>
            </div>

            <div className="h-6 w-[1px] bg-white/[0.08] shrink-0" />

            {/* Net Income / sec */}
            <div className="flex flex-col">
              <span className="text-[9px] sm:text-[10px] font-semibold tracking-wider text-zinc-400 uppercase whitespace-nowrap">
                Прибыль
              </span>
              <div className="flex items-center gap-1 whitespace-nowrap">
                <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#30D158] shrink-0" />
                <span
                  data-testid="hud-income"
                  className="text-xs sm:text-base font-bold text-[#30D158] font-mono tabular-nums leading-tight whitespace-nowrap"
                >
                  +${formatCompactNumber(bottleneck.netIncomePerSec)}/с
                </span>
              </div>
            </div>

            <div className="h-6 w-[1px] bg-white/[0.08] shrink-0" />

            {/* Customer Satisfaction Rating */}
            <div className="flex flex-col">
              <span className="text-[9px] sm:text-[10px] font-semibold tracking-wider text-zinc-400 uppercase whitespace-nowrap">
                Рейтинг
              </span>
              <span
                data-testid="hud-rating"
                className={`text-xs sm:text-base font-bold font-mono tabular-nums leading-tight whitespace-nowrap inline-flex items-center gap-1 ${
                  gameState.rating >= 4.5
                    ? 'text-[#30D158]'
                    : gameState.rating >= 3.6
                      ? 'text-[#FF9F0A]'
                      : 'text-[#FF453A]'
                }`}
              >
                <span>{gameState.rating.toFixed(1)}</span>
                <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current shrink-0" />
              </span>
            </div>
          </div>

          {/* Compact Mobile Utility Controls inline on right side of top island */}
          <div className="flex sm:hidden items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                triggerHaptic('selection');
                onCycleWeather();
              }}
              aria-label="Погода и время суток"
              className="h-8 px-2 rounded-xl bg-white/[0.06] flex items-center gap-1 text-left whitespace-nowrap active:scale-95 transition-transform"
            >
              {renderWeatherIcon(gameState.weather)}
              <span className="text-[11px] font-bold text-white font-mono tabular-nums">
                {timeProfile.formattedTime}
              </span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                triggerHaptic('light');
                onToggleSimSpeed();
              }}
              aria-label={`Скорость симуляции ${gameState.simSpeed}x`}
              className={`h-8 px-2 rounded-xl font-mono text-[11px] font-bold tabular-nums active:scale-95 transition-transform flex items-center justify-center whitespace-nowrap ${
                gameState.simSpeed === 2
                  ? 'bg-[#0A84FF] text-white'
                  : 'bg-white/[0.07] text-zinc-200'
              }`}
            >
              {gameState.simSpeed}x
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                triggerHaptic('light');
                onOpenPause();
              }}
              aria-label="Пауза и меню"
              className="w-8 h-8 rounded-xl bg-white/[0.07] active:scale-95 transition-transform flex items-center justify-center text-zinc-300"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Desktop Right Dynamic Island: Weather & Time, Speed Toggle (1x/2x), Mute & Pause */}
        <div
          className="hidden sm:flex pointer-events-auto items-center gap-2 px-2.5 py-1.5 rounded-[20px] border border-white/[0.08] shadow-2xl shrink-0"
          style={{ backgroundColor: 'rgba(28, 28, 30, 0.92)' }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              triggerHaptic('selection');
              onCycleWeather();
            }}
            aria-label="Погода и время суток"
            title="Нажмите для смены погодного фронта"
            className="flex items-center gap-2 px-2.5 py-1 rounded-xl hover:bg-white/[0.06] active:scale-95 transition-transform text-left whitespace-nowrap"
          >
            {renderWeatherIcon(gameState.weather)}
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-xs font-bold text-white font-mono tabular-nums">
                  {timeProfile.formattedTime}
                </span>
                <span
                  className={`text-[10px] font-semibold whitespace-nowrap ${
                    bottleneck.trafficScore >= 7
                      ? 'text-[#FF453A]'
                      : bottleneck.trafficScore >= 4
                        ? 'text-[#FF9F0A]'
                        : 'text-[#30D158]'
                  }`}
                >
                  Пробки {bottleneck.trafficScore} б.
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 whitespace-nowrap">
                {weatherProfile.label} · {timeProfile.label}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              triggerHaptic('light');
              onToggleSimSpeed();
            }}
            aria-label={`Скорость симуляции ${gameState.simSpeed}x`}
            className={`min-w-[42px] h-9 px-2.5 rounded-xl font-mono text-xs font-bold tabular-nums active:scale-95 transition-transform flex items-center justify-center gap-1 whitespace-nowrap ${
              gameState.simSpeed === 2
                ? 'bg-[#0A84FF] text-white'
                : 'bg-white/[0.07] text-zinc-200 hover:bg-white/[0.12]'
            }`}
          >
            <Zap className="w-3.5 h-3.5 shrink-0" />
            <span>{gameState.simSpeed}x</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
            className="w-9 h-9 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] active:scale-95 transition-transform flex items-center justify-center text-zinc-300"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              triggerHaptic('light');
              onOpenPause();
            }}
            aria-label="Пауза и меню"
            className="w-9 h-9 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] active:scale-95 transition-transform flex items-center justify-center text-zinc-300"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Row 2: iOS Segmented Control (Map Layers) + Bottleneck Analyzer Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
        {/* Map Layer Segmented Control */}
        <div
          role="group"
          aria-label="Слои карты"
          className="pointer-events-auto grid grid-cols-3 sm:inline-flex items-center p-1 rounded-2xl border border-white/[0.08] shadow-lg w-full sm:w-auto"
          style={{ backgroundColor: 'rgba(28, 28, 30, 0.92)' }}
        >
          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              onChangeLayerMode('traffic');
            }}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5 transition-colors active:scale-95 ${
              layerMode === 'traffic'
                ? 'bg-[#0A84FF] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5 shrink-0" />
            <span>Трафик</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              onChangeLayerMode('heatmap');
            }}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5 transition-colors active:scale-95 ${
              layerMode === 'heatmap'
                ? 'bg-[#FF9F0A] text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 shrink-0" />
            <span>Тепловая карта</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              onChangeLayerMode('coverage');
            }}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5 transition-colors active:scale-95 ${
              layerMode === 'coverage'
                ? 'bg-[#BF5AF2] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span>Зоны покрытия</span>
          </button>
        </div>

        {/* Bottleneck Analyzer (3 progress bars) */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('selection');
            setShowAnalyzerDetail((prev) => !prev);
          }}
          aria-expanded={showAnalyzerDetail}
          aria-label="Диагностика узких мест: Спрос, Сборка, Вывоз"
          className="pointer-events-auto flex items-center justify-between sm:justify-start gap-2.5 px-3.5 py-1.5 rounded-2xl border border-white/[0.08] shadow-lg active:scale-95 transition-transform text-left w-full sm:w-auto"
          style={{ backgroundColor: 'rgba(28, 28, 30, 0.92)' }}
        >
          <div className="flex items-center gap-1.5 shrink-0">
            <Gauge
              className={`w-4 h-4 shrink-0 ${
                bottleneck.limitingFactor === 'delivery'
                  ? 'text-[#FF453A]'
                  : bottleneck.limitingFactor === 'picking'
                    ? 'text-[#FF9F0A]'
                    : 'text-[#30D158]'
              }`}
            />
            <span className="text-[11px] font-semibold text-zinc-300 sm:hidden">Баланс сети</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Bar 1: Demand */}
            <div className="flex flex-col w-16">
              <div className="flex justify-between text-[10px] leading-none mb-1 whitespace-nowrap">
                <span className="text-zinc-400">Спрос</span>
                <span className="font-mono tabular-nums text-white font-semibold">
                  {bottleneck.demandRate.toFixed(1)}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#0A84FF] transition-transform duration-200 origin-left"
                  style={{ transform: `scaleX(${Math.max(0.08, bottleneck.demandPct / 100)})` }}
                />
              </div>
            </div>

            {/* Bar 2: Darkstores */}
            <div className="flex flex-col w-16">
              <div className="flex justify-between text-[10px] leading-none mb-1 whitespace-nowrap">
                <span className="text-zinc-400">Склады</span>
                <span
                  className={`font-mono tabular-nums font-semibold ${
                    bottleneck.limitingFactor === 'picking' ? 'text-[#FF9F0A]' : 'text-white'
                  }`}
                >
                  {bottleneck.pickingCapacity.toFixed(1)}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-transform duration-200 origin-left ${
                    bottleneck.limitingFactor === 'picking' ? 'bg-[#FF9F0A]' : 'bg-[#30D158]'
                  }`}
                  style={{ transform: `scaleX(${Math.max(0.08, bottleneck.pickingPct / 100)})` }}
                />
              </div>
            </div>

            {/* Bar 3: Couriers */}
            <div className="flex flex-col w-16">
              <div className="flex justify-between text-[10px] leading-none mb-1 whitespace-nowrap">
                <span className="text-zinc-400">Вывоз</span>
                <span
                  className={`font-mono tabular-nums font-semibold ${
                    bottleneck.limitingFactor === 'delivery' ? 'text-[#FF453A]' : 'text-white'
                  }`}
                >
                  {bottleneck.deliveryCapacity.toFixed(1)}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-transform duration-200 origin-left ${
                    bottleneck.limitingFactor === 'delivery' ? 'bg-[#FF453A]' : 'bg-[#30D158]'
                  }`}
                  style={{ transform: `scaleX(${Math.max(0.08, bottleneck.deliveryPct / 100)})` }}
                />
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Expandable Bottleneck Diagnostic & Quick District Jump Card */}
      {showAnalyzerDetail && (
        <div
          className="pointer-events-auto self-end w-full sm:w-96 p-3.5 rounded-2xl border border-white/[0.08] shadow-2xl flex flex-col gap-2.5"
          style={{ backgroundColor: 'rgba(28, 28, 30, 0.95)' }}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white">Bottleneck-Анализатор</span>
            <span className="font-mono tabular-nums text-zinc-400">
              Средний чек: ${bottleneck.avgOrderCheck.toFixed(1)}
            </span>
          </div>
          <p className="text-xs text-zinc-300 leading-snug">{bottleneck.recommendation}</p>
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
            <Compass className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            {INITIAL_DISTRICTS.map((d) => {
              const unlocked = gameState.districtsUnlocked[d.id];
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    onFocusDistrict(d.id);
                  }}
                  className={`px-2 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap shrink-0 active:scale-95 transition-transform ${
                    unlocked
                      ? 'bg-white/10 text-white hover:bg-white/15'
                      : 'bg-white/[0.04] text-zinc-500'
                  }`}
                >
                  {d.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
