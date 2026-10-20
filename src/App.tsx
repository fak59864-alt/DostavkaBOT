/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BottomDockAndSheets } from './components/BottomDockAndSheets.tsx';
import { CityMapCanvas } from './components/CityMapCanvas.tsx';
import { GameModals } from './components/GameModals.tsx';
import { TopHud } from './components/TopHud.tsx';
import { buildProceduralCityGraph } from './game/cityGraph.ts';
import {
  INITIAL_DARKSTORES,
  INITIAL_DISTRICTS,
  calculateIpoRewards,
  createInitialGameState,
  evaluateEconomyBottlenecks,
  getDarkstoreMetrics,
} from './game/economy.ts';
import type {
  BottomTabId,
  CourierTypeId,
  GameScreenState,
  MapLayerMode,
  PersistentGameState,
  WeatherType,
} from './game/types.ts';
import {
  getAudioMuted,
  initTelegramWebApp,
  setAudioMuted,
  triggerHaptic,
} from './utils/telegram.ts';

const STORAGE_KEY = 'qdrop_logistics_state_v1';
const WEATHER_ROTATION: WeatherType[] = ['clear', 'rain', 'clear', 'snow', 'storm'];

export default function App() {
  const cityGraph = useMemo(() => buildProceduralCityGraph(), []);

  const [screenState, setScreenState] = useState<GameScreenState>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return 'playing';
      }
    }
    return 'title';
  });

  const [offlineReward, setOfflineReward] = useState<{
    seconds: number;
    earned: number;
  } | null>(null);

  const [gameState, setGameState] = useState<PersistentGameState>(() => {
    const fallback = createInitialGameState();
    if (typeof window === 'undefined') return fallback;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw) as Partial<PersistentGameState>;
      return {
        ...fallback,
        ...parsed,
        couriers: { ...fallback.couriers, ...(parsed.couriers || {}) },
        courierLevels: { ...fallback.courierLevels, ...(parsed.courierLevels || {}) },
        districtsUnlocked: {
          ...fallback.districtsUnlocked,
          ...(parsed.districtsUnlocked || {}),
        },
        algorithms: { ...fallback.algorithms, ...(parsed.algorithms || {}) },
        prestige: { ...fallback.prestige, ...(parsed.prestige || {}) },
        darkstores: INITIAL_DARKSTORES.map((ds) => {
          const found = parsed.darkstores?.find((d) => d.id === ds.id);
          return found
            ? { ...ds, ...found }
            : {
                id: ds.id,
                unlocked: ds.unlocked,
                level: ds.level,
                pickingUpgradeLevel: ds.pickingUpgradeLevel,
                storageUpgradeLevel: ds.storageUpgradeLevel,
                currentQueue: ds.currentQueue,
              };
        }),
      };
    } catch {
      return fallback;
    }
  });

  const [layerMode, setLayerMode] = useState<MapLayerMode>('traffic');
  const [activeTab, setActiveTab] = useState<BottomTabId>(null);
  const [selectedDarkstoreId, setSelectedDarkstoreId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(() => getAudioMuted());
  const [cameraTarget, setCameraTarget] = useState<{
    x: number;
    y: number;
    zoom: number;
    seq: number;
  } | null>(null);

  // Initialize Telegram Mini App SDK & calculate offline income once on mount
  useEffect(() => {
    initTelegramWebApp();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistentGameState;
        const elapsedSec = Math.min(
          8 * 3600,
          Math.floor((Date.now() - (parsed.lastSavedAt || Date.now())) / 1000)
        );
        if (elapsedSec >= 15) {
          const bn = evaluateEconomyBottlenecks(gameState);
          const earned = Math.round(bn.netIncomePerSec * elapsedSec * 0.45); // 45% offline efficiency
          if (earned > 10) {
            setOfflineReward({ seconds: elapsedSec, earned });
          }
        }
      }
    } catch {
      // Ignore storage parse errors
    }
  }, []);

  // Mirror screenState to document.body.dataset.state
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.dataset.state = screenState;
    }
  }, [screenState]);

  const startGame = useCallback(() => {
    setScreenState('playing');
    if (typeof document !== 'undefined') {
      document.body.dataset.state = 'playing';
      (document.activeElement as HTMLElement | null)?.blur?.();
    }
  }, []);

  // Keyboard shortcuts for Title Start (Enter/Space) and Pause (Escape/P)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (screenState === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        startGame();
      } else if (
        (screenState === 'playing' || screenState === 'paused') &&
        (e.code === 'Escape' || e.code === 'KeyP')
      ) {
        e.preventDefault();
        if (activeTab) {
          setActiveTab(null);
        } else {
          setScreenState((prev) => (prev === 'playing' ? 'paused' : 'playing'));
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screenState, activeTab, startGame]);

  // Live Bottleneck Analysis memo
  const bottleneck = useMemo(() => evaluateEconomyBottlenecks(gameState), [gameState]);

  // Core Economy & Environment Simulation Loop (ticks every 250ms while playing)
  const weatherIndexRef = useRef(0);
  useEffect(() => {
    if (screenState !== 'playing') return;

    const intervalMs = 250;
    const dtSec = intervalMs / 1000;

    const timer = setInterval(() => {
      setGameState((prev) => {
        const simDt = dtSec * prev.simSpeed;
        const bn = evaluateEconomyBottlenecks(prev);

        const earnedMoney = bn.netIncomePerSec * simDt;
        const deliveredOrders = bn.effectiveOrdersPerSec * simDt;

        // 24 game hours = 4 minutes (240 sec) real time -> 6 game minutes per 1 real second
        const nextGameMinutes = (prev.gameMinutes + 6 * simDt) % 1440;

        // Weather timer progression
        let nextWeather = prev.weather;
        let nextWeatherTimer = prev.weatherTimerSec - simDt;
        if (nextWeatherTimer <= 0) {
          weatherIndexRef.current = (weatherIndexRef.current + 1) % WEATHER_ROTATION.length;
          nextWeather = WEATHER_ROTATION[weatherIndexRef.current];
          nextWeatherTimer = 42;
        }

        // Update darkstore queues based on demand vs delivery throughput
        const unlockedCount = prev.darkstores.filter((d) => d.unlocked).length || 1;
        const netQueueDeltaPerStore =
          ((bn.demandRate - bn.effectiveOrdersPerSec) * simDt) / unlockedCount;

        const predictiveLvl = prev.algorithms['predictive_packing'] || 0;
        const hyperloopLvl = prev.algorithms['capsule_hyperloop'] || 0;

        let overloadedStores = 0;
        const nextDarkstores = prev.darkstores.map((ds) => {
          if (!ds.unlocked) return ds;
          const template = INITIAL_DARKSTORES.find((t) => t.id === ds.id) || INITIAL_DARKSTORES[0];
          const metrics = getDarkstoreMetrics(
            { ...template, ...ds, utilizationPct: 0 },
            predictiveLvl,
            hyperloopLvl,
            prev.prestige.quantumCores
          );
          const nextQueue = Math.max(
            0,
            Math.min(metrics.storageCapacity * 1.25, ds.currentQueue + netQueueDeltaPerStore)
          );
          if (nextQueue > metrics.storageCapacity * 0.82) {
            overloadedStores++;
          }
          return {
            ...ds,
            currentQueue: nextQueue,
          };
        });

        // Rating drift: if stores are overloaded and Surge isn't mitigating, rating drops slowly; otherwise recovers toward 5.0
        const ratingDelta =
          overloadedStores > 0 ? -0.015 * overloadedStores * simDt : +0.012 * simDt;
        const nextRating = Math.max(2.4, Math.min(5.0, prev.rating + ratingDelta));

        const updated: PersistentGameState = {
          ...prev,
          money: prev.money + earnedMoney,
          rating: nextRating,
          gameMinutes: nextGameMinutes,
          weather: nextWeather,
          weatherTimerSec: nextWeatherTimer,
          darkstores: nextDarkstores,
          totalOrdersDelivered: prev.totalOrdersDelivered + deliveredOrders,
          prestige: {
            ...prev.prestige,
            currentRunRevenue: prev.prestige.currentRunRevenue + earnedMoney,
            lifetimeRevenue: prev.prestige.lifetimeRevenue + earnedMoney,
          },
          lastSavedAt: Date.now(),
        };

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {
          // Ignore quota errors
        }

        return updated;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [screenState]);

  // Action Handlers
  const handleToggleSimSpeed = () => {
    setGameState((prev) => ({
      ...prev,
      simSpeed: prev.simSpeed === 1 ? 2 : 1,
    }));
  };

  const handleCycleWeather = () => {
    const order: WeatherType[] = ['clear', 'rain', 'snow', 'storm'];
    setGameState((prev) => {
      const nextIdx = (order.indexOf(prev.weather) + 1) % order.length;
      return {
        ...prev,
        weather: order[nextIdx],
        weatherTimerSec: 45,
      };
    });
  };

  const handleFocusCoords = (x: number, y: number, zoom = 1.0) => {
    setCameraTarget((prev) => ({ x, y, zoom, seq: (prev?.seq || 0) + 1 }));
  };

  const handleFocusDistrict = (districtId: string) => {
    const dist = INITIAL_DISTRICTS.find((d) => d.id === districtId);
    if (dist) {
      handleFocusCoords(dist.centerX, dist.centerY, 0.95);
    }
  };

  const handleHireCourier = (type: CourierTypeId, count: number, cost: number) => {
    setGameState((prev) => {
      if (prev.money < cost) return prev;
      triggerHaptic('medium');
      return {
        ...prev,
        money: prev.money - cost,
        couriers: {
          ...prev.couriers,
          [type]: (prev.couriers[type] || 0) + count,
        },
      };
    });
  };

  const handleUpgradeCourierTraining = (type: CourierTypeId, cost: number) => {
    setGameState((prev) => {
      if (prev.money < cost) return prev;
      triggerHaptic('success');
      return {
        ...prev,
        money: prev.money - cost,
        courierLevels: {
          ...prev.courierLevels,
          [type]: (prev.courierLevels[type] || 1) + 1,
        },
      };
    });
  };

  const handleUnlockDarkstore = (id: string, cost: number) => {
    setGameState((prev) => {
      if (prev.money < cost) return prev;
      triggerHaptic('heavy');
      return {
        ...prev,
        money: prev.money - cost,
        darkstores: prev.darkstores.map((d) =>
          d.id === id ? { ...d, unlocked: true, currentQueue: 2 } : d
        ),
      };
    });
  };

  const handleUpgradeDarkstorePicking = (id: string, cost: number) => {
    setGameState((prev) => {
      if (prev.money < cost) return prev;
      triggerHaptic('medium');
      return {
        ...prev,
        money: prev.money - cost,
        darkstores: prev.darkstores.map((d) =>
          d.id === id ? { ...d, pickingUpgradeLevel: d.pickingUpgradeLevel + 1 } : d
        ),
      };
    });
  };

  const handleUpgradeDarkstoreStorage = (id: string, cost: number) => {
    setGameState((prev) => {
      if (prev.money < cost) return prev;
      triggerHaptic('medium');
      return {
        ...prev,
        money: prev.money - cost,
        darkstores: prev.darkstores.map((d) =>
          d.id === id ? { ...d, storageUpgradeLevel: d.storageUpgradeLevel + 1 } : d
        ),
      };
    });
  };

  const handleToggleSurgePricing = () => {
    setGameState((prev) => ({
      ...prev,
      surgePricingActive: !prev.surgePricingActive,
    }));
  };

  const handleUpgradeAlgorithm = (id: string, cost: number) => {
    setGameState((prev) => {
      if (prev.money < cost) return prev;
      triggerHaptic('success');
      return {
        ...prev,
        money: prev.money - cost,
        algorithms: {
          ...prev.algorithms,
          [id]: (prev.algorithms[id] || 0) + 1,
        },
      };
    });
  };

  const handleUnlockDistrict = (id: string, cost: number) => {
    setGameState((prev) => {
      if (prev.money < cost || prev.districtsUnlocked[id]) return prev;
      triggerHaptic('heavy');
      const dist = INITIAL_DISTRICTS.find((d) => d.id === id);
      if (dist) {
        handleFocusCoords(dist.centerX, dist.centerY, 0.92);
      }
      return {
        ...prev,
        money: prev.money - cost,
        districtsUnlocked: {
          ...prev.districtsUnlocked,
          [id]: true,
        },
      };
    });
  };

  const handleLaunchIpo = () => {
    setGameState((prev) => {
      const rewards = calculateIpoRewards(prev.prestige.currentRunRevenue);
      if (!rewards.canLaunchIpo) return prev;

      const fresh = createInitialGameState();
      const nextPrestige = {
        ipoCount: prev.prestige.ipoCount + 1,
        founderShares: prev.prestige.founderShares + rewards.founderSharesGain,
        quantumCores: prev.prestige.quantumCores + rewards.quantumCoresGain,
        lifetimeRevenue: prev.prestige.lifetimeRevenue,
        currentRunRevenue: 250,
        metropolisTier: prev.prestige.metropolisTier + 1,
        hyperloopUnlocked: true,
      };

      const nextState: PersistentGameState = {
        ...fresh,
        money: 250 + nextPrestige.founderShares * 80,
        simSpeed: prev.simSpeed,
        prestige: nextPrestige,
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      } catch {}

      return nextState;
    });
    setActiveTab(null);
    handleFocusCoords(480, 790, 0.92);
  };

  const handleResetSave = () => {
    const fresh = createInitialGameState();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    } catch {}
    setGameState(fresh);
    setScreenState('playing');
    setActiveTab(null);
  };

  const handleClaimOfflineReward = () => {
    if (!offlineReward) return;
    const bonus = offlineReward.earned;
    setGameState((prev) => ({
      ...prev,
      money: prev.money + bonus,
      prestige: {
        ...prev.prestige,
        currentRunRevenue: prev.prestige.currentRunRevenue + bonus,
        lifetimeRevenue: prev.prestige.lifetimeRevenue + bonus,
      },
    }));
    setOfflineReward(null);
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    setAudioMuted(next);
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#090A0F] select-none">
      {/* 100% Full-Screen Live Procedural Vector Map */}
      <CityMapCanvas
        cityGraph={cityGraph}
        gameState={gameState}
        bottleneck={bottleneck}
        layerMode={layerMode}
        selectedDarkstoreId={selectedDarkstoreId}
        onSelectDarkstore={setSelectedDarkstoreId}
        cameraTarget={cameraTarget}
        isPlaying={screenState === 'playing'}
      />

      {/* Playing HUD & Bottom Glass Dock */}
      {screenState !== 'title' && (
        <>
          <TopHud
            gameState={gameState}
            bottleneck={bottleneck}
            layerMode={layerMode}
            onChangeLayerMode={setLayerMode}
            onToggleSimSpeed={handleToggleSimSpeed}
            onCycleWeather={handleCycleWeather}
            onFocusDistrict={handleFocusDistrict}
            onOpenPause={() => setScreenState('paused')}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
          />

          <BottomDockAndSheets
            gameState={gameState}
            bottleneck={bottleneck}
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            selectedDarkstoreId={selectedDarkstoreId}
            onSelectDarkstore={setSelectedDarkstoreId}
            onHireCourier={handleHireCourier}
            onUpgradeCourierTraining={handleUpgradeCourierTraining}
            onUnlockDarkstore={handleUnlockDarkstore}
            onUpgradeDarkstorePicking={handleUpgradeDarkstorePicking}
            onUpgradeDarkstoreStorage={handleUpgradeDarkstoreStorage}
            onToggleSurgePricing={handleToggleSurgePricing}
            onUpgradeAlgorithm={handleUpgradeAlgorithm}
            onUnlockDistrict={handleUnlockDistrict}
            onLaunchIpo={handleLaunchIpo}
            onFocusCoords={handleFocusCoords}
          />
        </>
      )}

      {/* Title Screen, Pause Menu & Offline Earnings Modals */}
      <GameModals
        screenState={screenState}
        gameState={gameState}
        bottleneck={bottleneck}
        offlineReward={offlineReward}
        onClaimOfflineReward={handleClaimOfflineReward}
        onStartGame={startGame}
        onResumeGame={() => setScreenState('playing')}
        onResetSave={handleResetSave}
      />
    </main>
  );
}
