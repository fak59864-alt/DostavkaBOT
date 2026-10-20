import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBulkPurchase,
  calculateIpoRewards,
  calculateUnitCost,
  createInitialGameState,
  evaluateEconomyBottlenecks,
  formatCompactNumber,
  getCourierMilestoneBonuses,
  getTimeOfDayProfile,
  getWeatherProfile,
} from './economy.ts';

test('calculateUnitCost follows exponential growth formula BaseCost * GrowthRate^Count', () => {
  assert.equal(calculateUnitCost(25, 1.12, 0), 25);
  assert.equal(calculateUnitCost(25, 1.12, 10), Math.round(25 * Math.pow(1.12, 10)));
  assert.equal(calculateUnitCost(1000, 1.22, 5), Math.round(1000 * Math.pow(1.22, 5)));
});

test('calculateBulkPurchase computes x1, x5, x10 and MAX accurately', () => {
  const single = calculateBulkPurchase(100, 1.15, 0, 500, 1);
  assert.equal(single.count, 1);
  assert.equal(single.totalCost, 100);

  const five = calculateBulkPurchase(100, 1.15, 0, 500, 5);
  assert.equal(five.count, 5);
  assert.ok(five.totalCost > 500);

  const maxAffordable = calculateBulkPurchase(100, 1.15, 0, 350, 'MAX');
  assert.equal(maxAffordable.count, 3); // 100 + 115 + 132 = 347 <= 350
  assert.equal(maxAffordable.totalCost, 347);
});

test('getCourierMilestoneBonuses unlocks synergy multipliers at 10, 25, 50, 100', () => {
  const below10 = getCourierMilestoneBonuses('scooter', 9);
  assert.equal(below10.unlockedMilestones.length, 0);
  assert.equal(below10.speedMultiplier, 1);
  assert.equal(below10.nextMilestone?.threshold, 10);

  const at25 = getCourierMilestoneBonuses('scooter', 25);
  assert.equal(at25.unlockedMilestones.length, 2);
  assert.ok(at25.speedMultiplier > 1.4);
  assert.equal(at25.nextMilestone?.threshold, 50);
});

test('getTimeOfDayProfile returns correct day/night cycle modifiers', () => {
  const morning = getTimeOfDayProfile(8 * 60); // 08:00
  assert.equal(morning.periodId, 'morning_peak');
  assert.equal(morning.baseTrafficBalls, 7);
  assert.equal(morning.residentialDemandMult, 1.5);

  const evening = getTimeOfDayProfile(18 * 60 + 30); // 18:30
  assert.equal(evening.periodId, 'evening_rush');
  assert.equal(evening.baseTrafficBalls, 9);
  assert.equal(evening.globalDemandMult, 1.8);

  const night = getTimeOfDayProfile(23 * 60); // 23:00
  assert.equal(night.periodId, 'night');
  assert.equal(night.baseTrafficBalls, 0);
  assert.equal(night.tariffMult, 1.35);
});

test('evaluateEconomyBottlenecks identifies bottlenecks and responds to weather & surge pricing', () => {
  const baseState = createInitialGameState();
  const baseMetrics = evaluateEconomyBottlenecks(baseState);
  assert.ok(baseMetrics.demandRate > 0);
  assert.ok(baseMetrics.pickingCapacity > 0);
  assert.ok(baseMetrics.deliveryCapacity > 0);
  assert.ok(baseMetrics.netIncomePerSec > 0);

  // Enable Surge Pricing: demand drops, average order check rises
  const surgeState = { ...baseState, surgePricingActive: true };
  const surgeMetrics = evaluateEconomyBottlenecks(surgeState);
  assert.ok(surgeMetrics.demandRate < baseMetrics.demandRate);
  assert.ok(surgeMetrics.avgOrderCheck > baseMetrics.avgOrderCheck);

  // Storm grounds cargo drones
  const droneState = {
    ...baseState,
    couriers: { foot: 0, scooter: 0, van: 0, drone: 5 },
    weather: 'storm' as const,
  };
  const stormMetrics = evaluateEconomyBottlenecks(droneState);
  assert.equal(stormMetrics.deliveryCapacity, 0);
  assert.equal(stormMetrics.limitingFactor, 'delivery');
});

test('calculateIpoRewards grants Founder Shares and Quantum Cores above threshold', () => {
  const below = calculateIpoRewards(10000);
  assert.equal(below.canLaunchIpo, false);
  assert.equal(below.founderSharesGain, 0);

  const ready = calculateIpoRewards(50000);
  assert.equal(ready.canLaunchIpo, true);
  assert.ok(ready.founderSharesGain >= 3);
  assert.ok(ready.quantumCoresGain >= 2);
});

test('formatCompactNumber formats K, M, B cleanly', () => {
  assert.equal(formatCompactNumber(850), '850');
  assert.equal(formatCompactNumber(12400), '12.40K');
  assert.equal(formatCompactNumber(3850000), '3.85M');
  assert.equal(formatCompactNumber(1200000000), '1.20B');
});
