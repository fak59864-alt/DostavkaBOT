import React, { useState } from 'react';
import {
  Award,
  Building2,
  ChevronRight,
  Cpu,
  Flame,
  Footprints,
  MapPin,
  Navigation,
  Package,
  Plane,
  Rocket,
  Sparkles,
  Store,
  TrendingUp,
  Truck,
  Users,
  X,
  Zap,
} from 'lucide-react';
import {
  COURIER_CONFIGS,
  INITIAL_ALGORITHMS,
  INITIAL_DARKSTORES,
  INITIAL_DISTRICTS,
  calculateBulkPurchase,
  calculateIpoRewards,
  calculateUnitCost,
  formatCompactNumber,
  getCourierMilestoneBonuses,
  getDarkstoreMetrics,
} from '../game/economy.ts';
import type {
  BottomTabId,
  BottleneckAnalysis,
  BuyMultiplier,
  CourierTypeId,
  DarkstoreSlot,
  PersistentGameState,
} from '../game/types.ts';
import { triggerHaptic } from '../utils/telegram.ts';

interface BottomDockAndSheetsProps {
  gameState: PersistentGameState;
  bottleneck: BottleneckAnalysis;
  activeTab: BottomTabId;
  onSelectTab: (tab: BottomTabId) => void;
  selectedDarkstoreId: string | null;
  onSelectDarkstore: (id: string | null) => void;
  onHireCourier: (type: CourierTypeId, count: number, cost: number) => void;
  onUpgradeCourierTraining: (type: CourierTypeId, cost: number) => void;
  onUnlockDarkstore: (id: string, cost: number) => void;
  onUpgradeDarkstorePicking: (id: string, cost: number) => void;
  onUpgradeDarkstoreStorage: (id: string, cost: number) => void;
  onToggleSurgePricing: () => void;
  onUpgradeAlgorithm: (id: string, cost: number) => void;
  onUnlockDistrict: (id: string, cost: number) => void;
  onLaunchIpo: () => void;
  onFocusCoords: (x: number, y: number, zoom?: number) => void;
}

export const BottomDockAndSheets: React.FC<BottomDockAndSheetsProps> = ({
  gameState,
  bottleneck,
  activeTab,
  onSelectTab,
  selectedDarkstoreId,
  onSelectDarkstore,
  onHireCourier,
  onUpgradeCourierTraining,
  onUnlockDarkstore,
  onUpgradeDarkstorePicking,
  onUpgradeDarkstoreStorage,
  onToggleSurgePricing,
  onUpgradeAlgorithm,
  onUnlockDistrict,
  onLaunchIpo,
  onFocusCoords,
}) => {
  const [buyMultiplier, setBuyMultiplier] = useState<BuyMultiplier>(1);

  const renderCourierIcon = (id: CourierTypeId) => {
    switch (id) {
      case 'foot':
        return <Footprints className="w-5 h-5 text-[#0A84FF]" />;
      case 'scooter':
        return <Zap className="w-5 h-5 text-[#64D2FF]" />;
      case 'van':
        return <Truck className="w-5 h-5 text-[#FFD60A]" />;
      case 'drone':
        return <Plane className="w-5 h-5 text-[#BF5AF2]" />;
    }
  };

  // Selected Darkstore floating inspector card (when tapped on map and no sheet is covering)
  const selectedDsTemplate = selectedDarkstoreId
    ? INITIAL_DARKSTORES.find((d) => d.id === selectedDarkstoreId)
    : null;
  const selectedDsState = selectedDarkstoreId
    ? gameState.darkstores.find((d) => d.id === selectedDarkstoreId)
    : null;

  const predictiveLvl = gameState.algorithms['predictive_packing'] || 0;
  const hyperloopLvl = gameState.algorithms['capsule_hyperloop'] || 0;
  const ipoRewards = calculateIpoRewards(gameState.prestige.currentRunRevenue);

  return (
    <>
      {/* Map Darkstore Inspector Popover */}
      {selectedDsTemplate && selectedDsState && !activeTab && (
        <div className="fixed bottom-24 inset-x-0 z-20 px-4 pointer-events-none flex justify-center">
          <div
            className="pointer-events-auto w-full max-w-md rounded-3xl border border-white/10 p-4 shadow-2xl flex flex-col gap-3"
            style={{ backgroundColor: 'rgba(28, 28, 30, 0.95)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#0A84FF]/15 border border-[#0A84FF]/30 flex items-center justify-center text-[#0A84FF]">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">
                    {selectedDsTemplate.name}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {
                      INITIAL_DISTRICTS.find((d) => d.id === selectedDsTemplate.districtId)
                        ?.name
                    }{' '}
                    ·{' '}
                    {selectedDsState.unlocked
                      ? `Уровень сборки ${selectedDsState.pickingUpgradeLevel}`
                      : 'Слот свободен'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelectDarkstore(null)}
                aria-label="Закрыть карточку даркстора"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedDsState.unlocked ? (
              (() => {
                const merged: DarkstoreSlot = {
                  ...selectedDsTemplate,
                  ...selectedDsState,
                  utilizationPct: 0,
                };
                const metrics = getDarkstoreMetrics(
                  merged,
                  predictiveLvl,
                  hyperloopLvl,
                  gameState.prestige.quantumCores
                );
                const queueRatio = Math.min(
                  100,
                  Math.round((selectedDsState.currentQueue / Math.max(1, metrics.storageCapacity)) * 100)
                );

                return (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                        <span className="text-[11px] text-zinc-400 block">Комплектация</span>
                        <span className="text-sm font-bold text-[#30D158] font-mono tabular-nums">
                          {metrics.pickingRate.toFixed(1)} зак/с
                        </span>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                        <span className="text-[11px] text-zinc-400 block">Очередь склада</span>
                        <span className="text-sm font-bold text-white font-mono tabular-nums">
                          {Math.round(selectedDsState.currentQueue)} / {metrics.storageCapacity}{' '}
                          ({queueRatio}%)
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={gameState.money < metrics.pickingUpgradeCost}
                        onClick={() =>
                          onUpgradeDarkstorePicking(
                            selectedDsTemplate.id,
                            metrics.pickingUpgradeCost
                          )
                        }
                        className={`py-2.5 px-3 rounded-2xl text-xs font-semibold flex items-center justify-between active:scale-95 transition-transform ${
                          gameState.money >= metrics.pickingUpgradeCost
                            ? 'bg-[#0A84FF] text-white'
                            : 'bg-white/[0.06] text-zinc-500 cursor-not-allowed'
                        }`}
                      >
                        <span>Сборка +32%</span>
                        <span className="font-mono tabular-nums">
                          ${formatCompactNumber(metrics.pickingUpgradeCost)}
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={gameState.money < metrics.storageUpgradeCost}
                        onClick={() =>
                          onUpgradeDarkstoreStorage(
                            selectedDsTemplate.id,
                            metrics.storageUpgradeCost
                          )
                        }
                        className={`py-2.5 px-3 rounded-2xl text-xs font-semibold flex items-center justify-between active:scale-95 transition-transform ${
                          gameState.money >= metrics.storageUpgradeCost
                            ? 'bg-white/15 text-white hover:bg-white/20'
                            : 'bg-white/[0.06] text-zinc-500 cursor-not-allowed'
                        }`}
                      >
                        <span>Буфер +35%</span>
                        <span className="font-mono tabular-nums">
                          ${formatCompactNumber(metrics.storageUpgradeCost)}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : (
              <button
                type="button"
                disabled={gameState.money < selectedDsTemplate.baseUnlockCost}
                onClick={() =>
                  onUnlockDarkstore(selectedDsTemplate.id, selectedDsTemplate.baseUnlockCost)
                }
                className={`w-full py-3 px-4 rounded-2xl text-xs font-bold flex items-center justify-between active:scale-95 transition-transform ${
                  gameState.money >= selectedDsTemplate.baseUnlockCost
                    ? 'bg-[#30D158] text-black'
                    : 'bg-white/[0.06] text-zinc-500 cursor-not-allowed'
                }`}
              >
                <span>Открыть даркстор ({selectedDsTemplate.basePickingRate} зак/с)</span>
                <span className="font-mono tabular-nums">
                  ${formatCompactNumber(selectedDsTemplate.baseUnlockCost)}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* iOS Bottom Sheet Drawer when a tab is active */}
      {activeTab && (
        <div className="fixed inset-x-0 bottom-20 z-30 px-2.5 sm:px-5 pointer-events-none flex justify-center">
          <section
            aria-label={
              activeTab === 'staff'
                ? 'Штат курьеров'
                : activeTab === 'network'
                  ? 'Сеть дарксторов'
                  : activeTab === 'rnd'
                    ? 'Алгоритмы R&D'
                    : 'Город и IPO'
            }
            className="pointer-events-auto w-full max-w-3xl max-h-[64vh] rounded-[28px] border border-white/10 shadow-2xl flex flex-col overflow-hidden"
            style={{ backgroundColor: 'rgba(24, 24, 27, 0.96)' }}
          >
            {/* Drag Handle & Sheet Header */}
            <div className="pt-2.5 pb-3 px-5 border-b border-white/[0.07] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {activeTab === 'staff' && 'Штат и флот доставки'}
                  {activeTab === 'network' && 'Сеть районных дарксторов'}
                  {activeTab === 'rnd' && 'Алгоритмы маршрутизации (R&D)'}
                  {activeTab === 'city' && 'Экспансия мегаполиса и IPO'}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {activeTab === 'staff' && (
                  <div
                    role="group"
                    aria-label="Множитель найма"
                    className="inline-flex p-0.5 rounded-xl bg-white/[0.07] border border-white/[0.06]"
                  >
                    {([1, 5, 10, 'MAX'] as BuyMultiplier[]).map((mult) => (
                      <button
                        key={String(mult)}
                        type="button"
                        onClick={() => {
                          triggerHaptic('selection');
                          setBuyMultiplier(mult);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono tabular-nums transition-colors ${
                          buyMultiplier === mult
                            ? 'bg-[#0A84FF] text-white'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {mult === 'MAX' ? 'MAX' : `x${mult}`}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onSelectTab(null);
                  }}
                  aria-label="Закрыть панель"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 active:scale-95 transition-transform flex items-center justify-center text-zinc-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sheet Scrollable Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5">
              {/* TAB 1: STAFF (КУРЬЕРЫ) */}
              {activeTab === 'staff' && (
                <div className="space-y-3">
                  {(Object.keys(COURIER_CONFIGS) as CourierTypeId[]).map((typeId) => {
                    const cfg = COURIER_CONFIGS[typeId];
                    const count = gameState.couriers[typeId] || 0;
                    const level = gameState.courierLevels[typeId] || 1;
                    const reqDistrict = INITIAL_DISTRICTS[cfg.unlockDistrictIdx];
                    const isUnlocked = gameState.districtsUnlocked[reqDistrict.id];

                    const bulk = calculateBulkPurchase(
                      cfg.baseCost,
                      cfg.growthRate,
                      count,
                      gameState.money,
                      buyMultiplier
                    );
                    const canAfford = isUnlocked && gameState.money >= bulk.totalCost;
                    const milestones = getCourierMilestoneBonuses(typeId, count);
                    const trainingCost = calculateUnitCost(
                      cfg.baseCost * 4,
                      1.45,
                      level - 1
                    );

                    const nextThreshold = milestones.nextMilestone?.threshold || 100;
                    const prevThreshold =
                      milestones.unlockedMilestones[milestones.unlockedMilestones.length - 1]
                        ?.threshold || 0;
                    const milestoneProgress = Math.min(
                      100,
                      Math.round(
                        ((count - prevThreshold) / Math.max(1, nextThreshold - prevThreshold)) *
                          100
                      )
                    );

                    return (
                      <div
                        key={typeId}
                        className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex flex-col gap-2.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div
                              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border border-white/10"
                              style={{ backgroundColor: `${cfg.color}18` }}
                            >
                              {renderCourierIcon(typeId)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-bold text-white">{cfg.name}</h3>
                                <span className="text-xs font-mono tabular-nums text-zinc-400">
                                  Штат: <strong className="text-white">{count}</strong> · Ранг{' '}
                                  {level}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-400 mt-0.5 leading-snug">
                                {cfg.subtitle}
                              </p>
                            </div>
                          </div>

                          {/* Hire Button */}
                          {isUnlocked ? (
                            <button
                              type="button"
                              disabled={!canAfford}
                              onClick={() => onHireCourier(typeId, bulk.count, bulk.totalCost)}
                              className={`min-w-[126px] min-h-[44px] px-3.5 py-2 rounded-2xl text-xs font-bold flex flex-col items-end justify-center shrink-0 active:scale-95 transition-transform ${
                                canAfford
                                  ? 'bg-[#0A84FF] text-white shadow-lg shadow-[#0A84FF]/20'
                                  : 'bg-white/[0.06] text-zinc-500 cursor-not-allowed'
                              }`}
                            >
                              <span>Нанять +{bulk.count}</span>
                              <span className="font-mono tabular-nums text-[11px] opacity-90">
                                ${formatCompactNumber(bulk.totalCost)}
                              </span>
                            </button>
                          ) : (
                            <div className="px-3 py-2 rounded-xl bg-white/[0.04] text-[11px] text-zinc-400 font-medium shrink-0">
                              Нужен район «{reqDistrict.name}»
                            </div>
                          )}
                        </div>

                        {/* Milestone Synergy Bar & Equipment Upgrade */}
                        <div className="pt-2 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="text-zinc-400 flex items-center gap-1">
                                <Award className="w-3.5 h-3.5 text-[#FFD60A]" />
                                {milestones.nextMilestone
                                  ? `Веха ${milestones.nextMilestone.threshold}: ${milestones.nextMilestone.title}`
                                  : 'Все вехи 100/100 открыты!'}
                              </span>
                              <span className="font-mono tabular-nums text-zinc-300">
                                {count}/{nextThreshold} (x
                                {(
                                  milestones.capacityMultiplier * milestones.speedMultiplier
                                ).toFixed(2)}
                                )
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-transform duration-200 origin-left"
                                style={{
                                  backgroundColor: cfg.color,
                                  transform: `scaleX(${Math.max(0.04, milestoneProgress / 100)})`,
                                }}
                              />
                            </div>
                          </div>

                          {isUnlocked && count > 0 && (
                            <button
                              type="button"
                              disabled={gameState.money < trainingCost}
                              onClick={() => onUpgradeCourierTraining(typeId, trainingCost)}
                              className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap shrink-0 active:scale-95 transition-transform font-mono tabular-nums ${
                                gameState.money >= trainingCost
                                  ? 'bg-white/12 text-white hover:bg-white/20'
                                  : 'bg-white/[0.04] text-zinc-500 cursor-not-allowed'
                              }`}
                            >
                              Экипировка Ранг {level + 1} · ${formatCompactNumber(trainingCost)}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 2: NETWORK (ДАРКСТОРЫ) */}
              {activeTab === 'network' && (
                <div className="space-y-3">
                  {INITIAL_DARKSTORES.map((dsTemplate) => {
                    const saved =
                      gameState.darkstores.find((d) => d.id === dsTemplate.id) || dsTemplate;
                    const dist = INITIAL_DISTRICTS.find((d) => d.id === dsTemplate.districtId);
                    const distUnlocked = dist ? gameState.districtsUnlocked[dist.id] : false;

                    const merged: DarkstoreSlot = {
                      ...dsTemplate,
                      ...saved,
                      utilizationPct: 0,
                    };
                    const metrics = getDarkstoreMetrics(
                      merged,
                      predictiveLvl,
                      hyperloopLvl,
                      gameState.prestige.quantumCores
                    );

                    const queueLoadPct = saved.unlocked
                      ? Math.min(
                          100,
                          Math.round(
                            (saved.currentQueue / Math.max(1, metrics.storageCapacity)) * 100
                          )
                        )
                      : 0;

                    return (
                      <div
                        key={dsTemplate.id}
                        className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex flex-col gap-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('selection');
                                onFocusCoords(dsTemplate.x, dsTemplate.y, 1.15);
                                onSelectDarkstore(dsTemplate.id);
                              }}
                              title="Показать на карте"
                              className="w-11 h-11 rounded-2xl bg-[#0A84FF]/15 border border-[#0A84FF]/30 flex items-center justify-center text-[#0A84FF] shrink-0 active:scale-95 transition-transform"
                            >
                              <MapPin className="w-5 h-5" />
                            </button>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-bold text-white">{dsTemplate.name}</h3>
                                <span className="text-xs text-zinc-400">· {dist?.name}</span>
                              </div>
                              {saved.unlocked ? (
                                <p className="text-xs text-zinc-300 mt-0.5 font-mono tabular-nums">
                                  Сборка:{' '}
                                  <strong className="text-[#30D158]">
                                    {metrics.pickingRate.toFixed(1)} зак/с
                                  </strong>{' '}
                                  · Буфер: {Math.round(saved.currentQueue)}/
                                  {metrics.storageCapacity} ({queueLoadPct}%)
                                </p>
                              ) : (
                                <p className="text-xs text-zinc-400 mt-0.5">
                                  Базовая мощность: {dsTemplate.basePickingRate} зак/с · Емкость:{' '}
                                  {dsTemplate.baseStorageCapacity} зак.
                                </p>
                              )}
                            </div>
                          </div>

                          {!saved.unlocked && (
                            <div>
                              {distUnlocked ? (
                                <button
                                  type="button"
                                  disabled={gameState.money < dsTemplate.baseUnlockCost}
                                  onClick={() =>
                                    onUnlockDarkstore(dsTemplate.id, dsTemplate.baseUnlockCost)
                                  }
                                  className={`min-h-[44px] px-4 py-2 rounded-2xl text-xs font-bold font-mono tabular-nums active:scale-95 transition-transform ${
                                    gameState.money >= dsTemplate.baseUnlockCost
                                      ? 'bg-[#30D158] text-black'
                                      : 'bg-white/[0.06] text-zinc-500 cursor-not-allowed'
                                  }`}
                                >
                                  Открыть · ${formatCompactNumber(dsTemplate.baseUnlockCost)}
                                </button>
                              ) : (
                                <span className="text-xs text-zinc-500">
                                  Откройте район «{dist?.name}»
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {saved.unlocked && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            <button
                              type="button"
                              disabled={gameState.money < metrics.pickingUpgradeCost}
                              onClick={() =>
                                onUpgradeDarkstorePicking(
                                  dsTemplate.id,
                                  metrics.pickingUpgradeCost
                                )
                              }
                              className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between active:scale-95 transition-transform ${
                                gameState.money >= metrics.pickingUpgradeCost
                                  ? 'bg-[#0A84FF] text-white'
                                  : 'bg-white/[0.05] text-zinc-500 cursor-not-allowed'
                              }`}
                            >
                              <span>
                                Робо-конвейер Ур. {saved.pickingUpgradeLevel + 1} (+32% зак/с)
                              </span>
                              <span className="font-mono tabular-nums font-bold">
                                ${formatCompactNumber(metrics.pickingUpgradeCost)}
                              </span>
                            </button>

                            <button
                              type="button"
                              disabled={gameState.money < metrics.storageUpgradeCost}
                              onClick={() =>
                                onUpgradeDarkstoreStorage(
                                  dsTemplate.id,
                                  metrics.storageUpgradeCost
                                )
                              }
                              className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between active:scale-95 transition-transform ${
                                gameState.money >= metrics.storageUpgradeCost
                                  ? 'bg-white/12 text-white hover:bg-white/20'
                                  : 'bg-white/[0.05] text-zinc-500 cursor-not-allowed'
                              }`}
                            >
                              <span>
                                Холодильные ячейки Ур. {saved.storageUpgradeLevel + 1} (+35%)
                              </span>
                              <span className="font-mono tabular-nums font-bold">
                                ${formatCompactNumber(metrics.storageUpgradeCost)}
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 3: ALGORITHMS (R&D И SURGE PRICING) */}
              {activeTab === 'rnd' && (
                <div className="space-y-3.5">
                  {/* Surge Pricing Dynamic Toggle Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-[#FF9F0A]/15 to-[#FF453A]/10 border border-[#FF9F0A]/30 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-[#FF9F0A]" />
                        <h3 className="text-sm font-bold text-white">
                          Surge Pricing (Динамический тариф)
                        </h3>
                      </div>
                      <p className="text-xs text-zinc-300 leading-snug">
                        Повышает чек доставки на <strong>+55%</strong> и снижает перегрузку спроса
                        на <strong>-28%</strong>, защищая рейтинг {gameState.rating.toFixed(1)} / 5.0 в
                        часы пик.
                      </p>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={gameState.surgePricingActive}
                      onClick={() => {
                        triggerHaptic('medium');
                        onToggleSurgePricing();
                      }}
                      className={`min-w-[110px] min-h-[44px] px-4 py-2 rounded-2xl text-xs font-bold active:scale-95 transition-transform shrink-0 ${
                        gameState.surgePricingActive
                          ? 'bg-[#FF9F0A] text-black shadow-lg shadow-[#FF9F0A]/25'
                          : 'bg-white/10 text-white hover:bg-white/15'
                      }`}
                    >
                      {gameState.surgePricingActive ? 'АКТИВЕН (x1.55)' : 'ВКЛЮЧИТЬ'}
                    </button>
                  </div>

                  {/* R&D Tree */}
                  {INITIAL_ALGORITHMS.map((alg) => {
                    const currentLvl = gameState.algorithms[alg.id] ?? alg.level;
                    const isMaxed = currentLvl >= alg.maxLevel;
                    const lockedByPrestige =
                      Boolean(alg.requiresPrestige) && gameState.prestige.ipoCount === 0;
                    const cost = calculateUnitCost(alg.baseCost, alg.growthRate, currentLvl);
                    const canAfford =
                      !isMaxed && !lockedByPrestige && gameState.money >= cost;

                    return (
                      <div
                        key={alg.id}
                        className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white">{alg.name}</span>
                            <span className="text-xs font-mono text-[#BF5AF2]">
                              {alg.codeName} · Ур. {currentLvl}/{alg.maxLevel}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 leading-snug">{alg.description}</p>
                          <p className="text-[11px] text-[#30D158] font-medium">
                            {alg.effectSummary}
                          </p>
                        </div>

                        {lockedByPrestige ? (
                          <span className="px-3 py-2 rounded-xl bg-white/[0.04] text-[11px] text-zinc-400 shrink-0">
                            Требуется 1-е IPO
                          </span>
                        ) : isMaxed ? (
                          <span className="px-3 py-2 rounded-xl bg-[#30D158]/20 text-[#30D158] text-xs font-bold shrink-0">
                            МАКС.
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={!canAfford}
                            onClick={() => onUpgradeAlgorithm(alg.id, cost)}
                            className={`min-w-[120px] min-h-[44px] px-3.5 py-2 rounded-2xl text-xs font-bold flex flex-col items-end justify-center shrink-0 active:scale-95 transition-transform ${
                              canAfford
                                ? 'bg-[#BF5AF2] text-white shadow-lg shadow-[#BF5AF2]/25'
                                : 'bg-white/[0.06] text-zinc-500 cursor-not-allowed'
                            }`}
                          >
                            <span>Изучить Ур. {currentLvl + 1}</span>
                            <span className="font-mono tabular-nums text-[11px]">
                              ${formatCompactNumber(cost)}
                            </span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 4: CITY EXPANSION & IPO PRESTIGE */}
              {activeTab === 'city' && (
                <div className="space-y-4">
                  {/* IPO Prestige Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0A84FF]/20 via-[#BF5AF2]/15 to-transparent border border-white/15 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Rocket className="w-4 h-4 text-[#64D2FF]" />
                          <h3 className="text-sm font-bold text-white">
                            Выход на IPO и Экспансия в новый Мегаполис
                          </h3>
                        </div>
                        <p className="text-xs text-zinc-300 mt-1 leading-snug">
                          Зафиксируйте оценку компании, чтобы получить{' '}
                          <strong>Опционы Основателя</strong> (+15% к базовому чеку навсегда) и{' '}
                          <strong>Квантовые Ядра ИИ</strong> (+12% к мощности дарксторов и скорости
                          ИИ).
                        </p>
                      </div>
                      <div className="text-right shrink-0 font-mono tabular-nums">
                        <span className="text-[11px] text-zinc-400 block">Оборот раунда</span>
                        <span className="text-sm font-bold text-white">
                          ${formatCompactNumber(gameState.prestige.currentRunRevenue)} / $
                          {formatCompactNumber(ipoRewards.minRevenueRequired)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-xl bg-black/30 border border-white/[0.06]">
                        <span className="text-[10px] text-zinc-400 block">Раундов IPO</span>
                        <span className="text-sm font-bold text-white font-mono tabular-nums">
                          {gameState.prestige.ipoCount}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-black/30 border border-white/[0.06]">
                        <span className="text-[10px] text-zinc-400 block">Опционы Акций</span>
                        <span className="text-sm font-bold text-[#30D158] font-mono tabular-nums">
                          {gameState.prestige.founderShares} (+
                          {gameState.prestige.founderShares * 15}%)
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-black/30 border border-white/[0.06]">
                        <span className="text-[10px] text-zinc-400 block">Квантовые Ядра</span>
                        <span className="text-sm font-bold text-[#BF5AF2] font-mono tabular-nums">
                          {gameState.prestige.quantumCores} (+
                          {gameState.prestige.quantumCores * 12}%)
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!ipoRewards.canLaunchIpo}
                      onClick={() => {
                        triggerHaptic('heavy');
                        onLaunchIpo();
                      }}
                      className={`w-full min-h-[44px] py-2.5 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform ${
                        ipoRewards.canLaunchIpo
                          ? 'bg-[#30D158] text-black shadow-lg shadow-[#30D158]/25'
                          : 'bg-white/[0.06] text-zinc-500 cursor-not-allowed'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      {ipoRewards.canLaunchIpo ? (
                        <span>
                          Провести IPO: +{ipoRewards.founderSharesGain} Акций и +
                          {ipoRewards.quantumCoresGain} Квантовых Ядер
                        </span>
                      ) : (
                        <span>
                          Наберите ${formatCompactNumber(ipoRewards.minRevenueRequired)} оборота для
                          выхода на IPO
                        </span>
                      )}
                    </button>
                  </div>

                  {/* 5 City Districts List */}
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Районы мегаполиса (5 зон)
                    </h3>
                    {INITIAL_DISTRICTS.map((dist) => {
                      const unlocked = gameState.districtsUnlocked[dist.id];
                      const canAfford = !unlocked && gameState.money >= dist.unlockCost;

                      return (
                        <div
                          key={dist.id}
                          className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-between gap-3"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{dist.name}</span>
                              <span className="text-xs font-mono text-zinc-400">
                                Базовый чек ${dist.baseOrderValue} · Спрос {dist.baseDemandPerSec}{' '}
                                зак/с
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400 leading-snug">{dist.subtitle}</p>
                          </div>

                          {unlocked ? (
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('selection');
                                onFocusCoords(dist.centerX, dist.centerY, 0.95);
                                onSelectTab(null);
                              }}
                              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white flex items-center gap-1 shrink-0 active:scale-95 transition-transform"
                            >
                              <span>На карту</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={!canAfford}
                              onClick={() => onUnlockDistrict(dist.id, dist.unlockCost)}
                              className={`min-w-[125px] min-h-[44px] px-3.5 py-2 rounded-2xl text-xs font-bold flex flex-col items-end justify-center shrink-0 active:scale-95 transition-transform ${
                                canAfford
                                  ? 'bg-[#0A84FF] text-white'
                                  : 'bg-white/[0.06] text-zinc-500 cursor-not-allowed'
                              }`}
                            >
                              <span>Открыть район</span>
                              <span className="font-mono tabular-nums text-[11px]">
                                ${formatCompactNumber(dist.unlockCost)}
                              </span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Bottom Floating Glass Dock (4 Tabs) */}
      <nav
        aria-label="Основная навигация управления"
        className="fixed bottom-3 inset-x-0 z-30 px-3 pointer-events-none flex justify-center"
      >
        <div
          className="pointer-events-auto w-full max-w-md grid grid-cols-4 gap-1.5 p-1.5 rounded-[24px] border border-white/[0.09] shadow-2xl"
          style={{ backgroundColor: 'rgba(28, 28, 30, 0.94)' }}
        >
          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              onSelectTab(activeTab === 'staff' ? null : 'staff');
            }}
            className={`min-h-[50px] rounded-[18px] flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all ${
              activeTab === 'staff'
                ? 'bg-[#0A84FF] text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="text-[11px] font-semibold leading-none whitespace-nowrap">Штат</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              onSelectTab(activeTab === 'network' ? null : 'network');
            }}
            className={`min-h-[50px] rounded-[18px] flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all ${
              activeTab === 'network'
                ? 'bg-[#0A84FF] text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Package className="w-4 h-4" />
            <span className="text-[11px] font-semibold leading-none whitespace-nowrap">Сеть</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              onSelectTab(activeTab === 'rnd' ? null : 'rnd');
            }}
            className={`min-h-[50px] rounded-[18px] flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all ${
              activeTab === 'rnd'
                ? 'bg-[#BF5AF2] text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span className="text-[11px] font-semibold leading-none whitespace-nowrap">
              Алгоритмы
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              onSelectTab(activeTab === 'city' ? null : 'city');
            }}
            className={`min-h-[50px] rounded-[18px] flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all ${
              activeTab === 'city'
                ? 'bg-[#30D158] text-black shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span className="text-[11px] font-semibold leading-none whitespace-nowrap">Город</span>
          </button>
        </div>
      </nav>
    </>
  );
};
