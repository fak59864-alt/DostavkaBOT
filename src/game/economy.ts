import type {
  AlgorithmRnD,
  BottleneckAnalysis,
  BuyMultiplier,
  CourierMilestone,
  CourierTypeId,
  CourierUnitConfig,
  DarkstoreSlot,
  DistrictConfig,
  PersistentGameState,
  TimePeriodId,
  WeatherType,
} from './types.ts';

export const COURIER_CONFIGS: Record<CourierTypeId, CourierUnitConfig> = {
  foot: {
    id: 'foot',
    name: 'Пешие курьеры',
    subtitle: 'Маневренные на узких улочках, не стоят в пробках, но чувствительны к дождю',
    color: '#0A84FF',
    baseCost: 25,
    growthRate: 1.12,
    baseSpeed: 58,
    baseBatchSize: 1,
    baseOrdersPerSec: 0.45,
    ignoresTraffic: true,
    ignoresRoads: false,
    groundedInStorm: false,
    rainPenalty: 0.2,
    trafficSensitivity: 0.05,
    unlockDistrictIdx: 0,
  },
  scooter: {
    id: 'scooter',
    name: 'Электросамокаты',
    subtitle: 'Быстрая микромобильность по велополосам с экспресс-зарядкой на дарксторах',
    color: '#64D2FF',
    baseCost: 140,
    growthRate: 1.14,
    baseSpeed: 105,
    baseBatchSize: 2,
    baseOrdersPerSec: 1.65,
    ignoresTraffic: false,
    ignoresRoads: false,
    groundedInStorm: false,
    rainPenalty: 0.2,
    trafficSensitivity: 0.22,
    unlockDistrictIdx: 0,
  },
  van: {
    id: 'van',
    name: 'Автофургоны',
    subtitle: 'Перевозят пачки по 5–15 заказов между районами, но стоят в вечерних пробках',
    color: '#FFD60A',
    baseCost: 780,
    growthRate: 1.16,
    baseSpeed: 135,
    baseBatchSize: 8,
    baseOrdersPerSec: 6.8,
    ignoresTraffic: false,
    ignoresRoads: false,
    groundedInStorm: false,
    rainPenalty: 0.05,
    trafficSensitivity: 0.85,
    unlockDistrictIdx: 1,
  },
  drone: {
    id: 'drone',
    name: 'Грузовые дроны',
    subtitle: 'Летят по прямой над реками и пробками, но возвращаются на базу в грозу',
    color: '#BF5AF2',
    baseCost: 4200,
    growthRate: 1.18,
    baseSpeed: 210,
    baseBatchSize: 3,
    baseOrdersPerSec: 24.0,
    ignoresTraffic: true,
    ignoresRoads: true,
    groundedInStorm: true,
    rainPenalty: 0.08,
    trafficSensitivity: 0,
    unlockDistrictIdx: 2,
  },
};

export const COURIER_MILESTONES: Record<CourierTypeId, CourierMilestone[]> = {
  foot: [
    {
      threshold: 10,
      title: 'Терморюкзаки Pro',
      description: 'Скорость пеших курьеров +20%, чаевые за горячую доставку',
      speedMultiplier: 1.2,
      capacityMultiplier: 1.15,
    },
    {
      threshold: 25,
      title: 'Карта сквозных дворов',
      description: 'Срезают углы через арки: вывоз +35%',
      speedMultiplier: 1.25,
      capacityMultiplier: 1.35,
    },
    {
      threshold: 50,
      title: 'Экзоскелеты голени',
      description: 'Нулевая усталость на подъемах: вывоз x1.5',
      speedMultiplier: 1.3,
      capacityMultiplier: 1.5,
    },
    {
      threshold: 100,
      title: 'Автономная пешая гвардия',
      description: 'Удваивает общую эффективность пешего штата (x2.0)',
      speedMultiplier: 1.4,
      capacityMultiplier: 2.0,
    },
  ],
  scooter: [
    {
      threshold: 10,
      title: 'Мотор-колеса 1200W',
      description: 'Ускорение со светофоров: вывоз +25%',
      speedMultiplier: 1.2,
      capacityMultiplier: 1.25,
    },
    {
      threshold: 25,
      title: 'Быстрая замена батарей',
      description: 'Hot-swap аккумуляторов на дарксторах за 8 секунд (+25% к скорости)',
      speedMultiplier: 1.25,
      capacityMultiplier: 1.35,
    },
    {
      threshold: 50,
      title: 'Подогрев деки и шин',
      description: 'Стабильное сцепление в дождь и снег (+50% к вывозу)',
      speedMultiplier: 1.3,
      capacityMultiplier: 1.5,
    },
    {
      threshold: 100,
      title: 'Флот кибер-скутеров',
      description: 'Двойной багажный кофр: производительность x2.0',
      speedMultiplier: 1.4,
      capacityMultiplier: 2.0,
    },
  ],
  van: [
    {
      threshold: 10,
      title: 'Умные паллеты',
      description: 'Автоматическая сортировка коробок в кузове (+25% вывоз)',
      speedMultiplier: 1.15,
      capacityMultiplier: 1.25,
    },
    {
      threshold: 25,
      title: 'Доступ на выделенные полосы',
      description: 'Разрешение на движение по спецполосам (+35% скорость в пик)',
      speedMultiplier: 1.35,
      capacityMultiplier: 1.4,
    },
    {
      threshold: 50,
      title: 'Электрические шасси Ривиан',
      description: 'Вместимость пачки до 15 заказов (вывоз x1.6)',
      speedMultiplier: 1.25,
      capacityMultiplier: 1.6,
    },
    {
      threshold: 100,
      title: 'Беспилотные конвои',
      description: 'Синхронизированные автоколонны: производительность x2.2',
      speedMultiplier: 1.4,
      capacityMultiplier: 2.2,
    },
  ],
  drone: [
    {
      threshold: 10,
      title: 'Карбоновые винты с шумоподавлением',
      description: 'Разрешены ночные полеты на низкой высоте (+30% вывоз)',
      speedMultiplier: 1.25,
      capacityMultiplier: 1.3,
    },
    {
      threshold: 25,
      title: 'Лазерная посадка на балконы',
      description: 'Сброс заказа на тросе без зависания (+40% скорость)',
      speedMultiplier: 1.4,
      capacityMultiplier: 1.45,
    },
    {
      threshold: 50,
      title: 'Всепогодная защита IP68',
      description: 'Стабилизация при сильном ветре (вывоз x1.65)',
      speedMultiplier: 1.35,
      capacityMultiplier: 1.65,
    },
    {
      threshold: 100,
      title: 'Стратосферная матрица',
      description: 'Квантовая синхронизация воздушных эшелонов (x2.5)',
      speedMultiplier: 1.5,
      capacityMultiplier: 2.5,
    },
  ],
};

export const INITIAL_DISTRICTS: DistrictConfig[] = [
  {
    id: 'south_residential',
    index: 0,
    name: 'Спальный Юг',
    subtitle: 'Плотные жилые кварталы с высоким утренним и вечерним спросом на продукты',
    unlockCost: 0,
    baseDemandPerSec: 2.4,
    baseOrderValue: 14,
    centerX: 480,
    centerY: 790,
    bounds: { minX: 160, minY: 610, maxX: 820, maxY: 980 },
    residentialWeight: 1.45,
    businessWeight: 0.65,
    unlocked: true,
  },
  {
    id: 'technopark',
    index: 1,
    name: 'Технопарк',
    subtitle: 'Кампусы IT-компаний, коворкинги и лаборатории с высокими чаевыми днем',
    unlockCost: 2400,
    baseDemandPerSec: 5.5,
    baseOrderValue: 22,
    centerX: 1120,
    centerY: 760,
    bounds: { minX: 840, minY: 580, maxX: 1460, maxY: 960 },
    residentialWeight: 0.85,
    businessWeight: 1.4,
    unlocked: false,
  },
  {
    id: 'historic_center',
    index: 2,
    name: 'Исторический Центр',
    subtitle: 'Бутики, рестораны и узкие набережные с интенсивным трафиком и дорогим чеком',
    unlockCost: 14500,
    baseDemandPerSec: 12.0,
    baseOrderValue: 34,
    centerX: 780,
    centerY: 470,
    bounds: { minX: 420, minY: 310, maxX: 1140, maxY: 590 },
    residentialWeight: 1.1,
    businessWeight: 1.35,
    unlocked: false,
  },
  {
    id: 'port_industrial',
    index: 3,
    name: 'Промзона-Порт',
    subtitle: 'Логистические терминалы и оптовые хабы на северном берегу реки',
    unlockCost: 75000,
    baseDemandPerSec: 28.0,
    baseOrderValue: 48,
    centerX: 380,
    centerY: 220,
    bounds: { minX: 120, minY: 80, maxX: 720, maxY: 340 },
    residentialWeight: 0.75,
    businessWeight: 1.5,
    unlocked: false,
  },
  {
    id: 'city_skyscrapers',
    index: 4,
    name: 'Сити-Небоскребы',
    subtitle: 'Финансовое сердце мегаполиса: премиальные экспресс-заказы 24/7 и дрон-хабы',
    unlockCost: 380000,
    baseDemandPerSec: 68.0,
    baseOrderValue: 75,
    centerX: 1180,
    centerY: 210,
    bounds: { minX: 760, minY: 70, maxX: 1480, maxY: 350 },
    residentialWeight: 1.0,
    businessWeight: 1.85,
    unlocked: false,
  },
];

export const INITIAL_DARKSTORES: DarkstoreSlot[] = [
  {
    id: 'ds_south_1',
    name: 'Даркстор «Южный-Альфа»',
    districtId: 'south_residential',
    nodeId: 'node_ds_south_1',
    x: 420,
    y: 780,
    unlocked: true,
    level: 1,
    pickingUpgradeLevel: 1,
    storageUpgradeLevel: 1,
    baseUnlockCost: 0,
    basePickingRate: 3.2,
    baseStorageCapacity: 45,
    currentQueue: 4,
    utilizationPct: 42,
    coverageRadius: 240,
  },
  {
    id: 'ds_south_2',
    name: 'Даркстор «Бульвар Парковый»',
    districtId: 'south_residential',
    nodeId: 'node_ds_south_2',
    x: 680,
    y: 830,
    unlocked: false,
    level: 1,
    pickingUpgradeLevel: 1,
    storageUpgradeLevel: 1,
    baseUnlockCost: 650,
    basePickingRate: 4.5,
    baseStorageCapacity: 65,
    currentQueue: 0,
    utilizationPct: 0,
    coverageRadius: 250,
  },
  {
    id: 'ds_tech_1',
    name: 'Даркстор «Кремниевый Хаб»',
    districtId: 'technopark',
    nodeId: 'node_ds_tech_1',
    x: 1080,
    y: 750,
    unlocked: false,
    level: 1,
    pickingUpgradeLevel: 1,
    storageUpgradeLevel: 1,
    baseUnlockCost: 3200,
    basePickingRate: 9.0,
    baseStorageCapacity: 110,
    currentQueue: 0,
    utilizationPct: 0,
    coverageRadius: 280,
  },
  {
    id: 'ds_center_1',
    name: 'Даркстор «Гранд-Пассаж»',
    districtId: 'historic_center',
    nodeId: 'node_ds_center_1',
    x: 770,
    y: 460,
    unlocked: false,
    level: 1,
    pickingUpgradeLevel: 1,
    storageUpgradeLevel: 1,
    baseUnlockCost: 18500,
    basePickingRate: 20.0,
    baseStorageCapacity: 220,
    currentQueue: 0,
    utilizationPct: 0,
    coverageRadius: 300,
  },
  {
    id: 'ds_port_1',
    name: 'Мега-Склад «Док-Терминал»',
    districtId: 'port_industrial',
    nodeId: 'node_ds_port_1',
    x: 370,
    y: 210,
    unlocked: false,
    level: 1,
    pickingUpgradeLevel: 1,
    storageUpgradeLevel: 1,
    baseUnlockCost: 92000,
    basePickingRate: 48.0,
    baseStorageCapacity: 480,
    currentQueue: 0,
    utilizationPct: 0,
    coverageRadius: 340,
  },
  {
    id: 'ds_city_1',
    name: 'Кибер-Хаб «Федерация Сити»',
    districtId: 'city_skyscrapers',
    nodeId: 'node_ds_city_1',
    x: 1180,
    y: 205,
    unlocked: false,
    level: 1,
    pickingUpgradeLevel: 1,
    storageUpgradeLevel: 1,
    baseUnlockCost: 460000,
    basePickingRate: 115.0,
    baseStorageCapacity: 950,
    currentQueue: 0,
    utilizationPct: 0,
    coverageRadius: 380,
  },
];

export const INITIAL_ALGORITHMS: AlgorithmRnD[] = [
  {
    id: 'greedy_dispatch',
    name: 'Жадный поиск курьера',
    codeName: 'Greedy Dispatch v2',
    description: 'Назначает ближайшего свободного курьера с учетом остатка заряда и вектора движения.',
    effectSummary: '+15% к скорости вывоза всех курьеров за уровень',
    level: 1,
    maxLevel: 15,
    baseCost: 180,
    growthRate: 1.55,
    category: 'dispatch',
  },
  {
    id: 'multi_batching',
    name: 'Кластеризация заказов',
    codeName: 'Multi-Order Batching',
    description: 'Объединяет попутные заказы из одного подъезда и соседних домов в единый батч.',
    effectSummary: '+22% к пропускной способности доставки и +8% к среднему чеку за уровень',
    level: 0,
    maxLevel: 12,
    baseCost: 520,
    growthRate: 1.68,
    category: 'batching',
  },
  {
    id: 'predictive_packing',
    name: 'Предиктивный ИИ сборки',
    codeName: 'Predictive Pre-Packing',
    description: 'Дарксторы начинают собирать молоко, кофе и снеки еще до того, как клиент нажал «Оплатить».',
    effectSummary: '+40% к скорости комплектации всех дарксторов за уровень',
    level: 0,
    maxLevel: 10,
    baseCost: 950,
    growthRate: 1.72,
    category: 'packing',
  },
  {
    id: 'astar_live_traffic',
    name: 'Динамический обход пробок',
    codeName: 'A* Live Traffic Mesh',
    description: 'Перестраивает маршруты фургонов и самокатов в реальном времени вокруг заторов.',
    effectSummary: 'Снижает штраф от пробок для фургонов и самокатов до 50%+',
    level: 0,
    maxLevel: 8,
    baseCost: 2600,
    growthRate: 1.78,
    category: 'traffic',
  },
  {
    id: 'swarm_mesh',
    name: 'Роевой интеллект дронов',
    codeName: 'Swarm Airspace Mesh',
    description: 'Эшелонирование воздушных коридоров и автоматический подхват груза в воздухе.',
    effectSummary: '+35% к скорости и вывозу грузовых дронов за уровень',
    level: 0,
    maxLevel: 10,
    baseCost: 8400,
    growthRate: 1.82,
    category: 'drones',
  },
  {
    id: 'capsule_hyperloop',
    name: 'Подземные капсульные трубопроводы',
    codeName: 'Sub-Surface HyperPipe',
    description: 'Пневматические туннели между дарксторами мгновенно балансируют пиковую очередь по городу.',
    effectSummary: '+55% к мощности сети дарксторов и +25% к среднему чеку (требует IPO)',
    level: 0,
    maxLevel: 8,
    baseCost: 45000,
    growthRate: 1.9,
    category: 'hyperloop',
    requiresPrestige: true,
  },
];

/**
 * Exponential cost progression formula:
 * Cost = BaseCost * Math.pow(GrowthRate, Count)
 */
export function calculateUnitCost(baseCost: number, growthRate: number, currentCount: number): number {
  return Math.round(baseCost * Math.pow(growthRate, Math.max(0, currentCount)));
}

/**
 * Multi-buy cost and count calculator (1, 5, 10, or MAX affordable)
 */
export function calculateBulkPurchase(
  baseCost: number,
  growthRate: number,
  currentCount: number,
  availableMoney: number,
  multiplier: BuyMultiplier
): { count: number; totalCost: number } {
  if (multiplier !== 'MAX') {
    let totalCost = 0;
    for (let i = 0; i < multiplier; i++) {
      totalCost += calculateUnitCost(baseCost, growthRate, currentCount + i);
    }
    return { count: multiplier, totalCost };
  }

  let count = 0;
  let totalCost = 0;
  const maxCap = 250; // safeguard loop
  while (count < maxCap) {
    const nextCost = calculateUnitCost(baseCost, growthRate, currentCount + count);
    if (totalCost + nextCost > availableMoney) {
      break;
    }
    totalCost += nextCost;
    count++;
  }

  if (count === 0) {
    return { count: 1, totalCost: calculateUnitCost(baseCost, growthRate, currentCount) };
  }
  return { count, totalCost };
}

/**
 * Calculates cumulative milestone multipliers for a given courier type and count.
 */
export function getCourierMilestoneBonuses(
  type: CourierTypeId,
  count: number
): {
  speedMultiplier: number;
  capacityMultiplier: number;
  unlockedMilestones: CourierMilestone[];
  nextMilestone: CourierMilestone | null;
} {
  const list = COURIER_MILESTONES[type];
  let speedMultiplier = 1;
  let capacityMultiplier = 1;
  const unlockedMilestones: CourierMilestone[] = [];
  let nextMilestone: CourierMilestone | null = null;

  for (const m of list) {
    if (count >= m.threshold) {
      speedMultiplier *= m.speedMultiplier;
      capacityMultiplier *= m.capacityMultiplier;
      unlockedMilestones.push(m);
    } else if (!nextMilestone) {
      nextMilestone = m;
    }
  }

  return { speedMultiplier, capacityMultiplier, unlockedMilestones, nextMilestone };
}

/**
 * Evaluates the 24-hour cycle (0..1439 minutes) into time-of-day modifiers.
 * 24 game hours = 4 minutes real time (240 seconds -> 6 game minutes per 1 real second).
 */
export function getTimeOfDayProfile(gameMinutes: number): {
  periodId: TimePeriodId;
  label: string;
  formattedTime: string;
  residentialDemandMult: number;
  businessDemandMult: number;
  globalDemandMult: number;
  baseTrafficBalls: number; // 0..10
  tariffMult: number;
} {
  const normalized = ((Math.floor(gameMinutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const formattedTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

  // Morning peak: 07:00 - 10:00 (Demand in residential +50%, traffic 7 balls)
  if (hours >= 7 && hours < 10) {
    return {
      periodId: 'morning_peak',
      label: 'Утренний пик',
      formattedTime,
      residentialDemandMult: 1.5,
      businessDemandMult: 1.05,
      globalDemandMult: 1.25,
      baseTrafficBalls: 7,
      tariffMult: 1.05,
    };
  }

  // Day business peak: 12:00 - 15:00 (Demand shifts to center/business)
  if (hours >= 12 && hours < 15) {
    return {
      periodId: 'day_business',
      label: 'Деловой обед',
      formattedTime,
      residentialDemandMult: 0.95,
      businessDemandMult: 1.55,
      globalDemandMult: 1.3,
      baseTrafficBalls: 5,
      tariffMult: 1.1,
    };
  }

  // Evening rush hour: 17:00 - 21:00 (Demand +80% citywide, traffic 9 balls)
  if (hours >= 17 && hours < 21) {
    return {
      periodId: 'evening_rush',
      label: 'Вечерний час пик',
      formattedTime,
      residentialDemandMult: 1.8,
      businessDemandMult: 1.8,
      globalDemandMult: 1.8,
      baseTrafficBalls: 9,
      tariffMult: 1.2,
    };
  }

  // Night: 22:00 - 06:00 (Demand drops 40%, roads empty 0 balls, night tariff +35%)
  if (hours >= 22 || hours < 6) {
    return {
      periodId: 'night',
      label: 'Ночной тариф',
      formattedTime,
      residentialDemandMult: 0.6,
      businessDemandMult: 0.6,
      globalDemandMult: 0.6,
      baseTrafficBalls: 0,
      tariffMult: 1.35,
    };
  }

  // Standard daytime transition hours (06-07, 10-12, 15-17, 21-22)
  return {
    periodId: 'day_business',
    label: 'Штатный режим',
    formattedTime,
    residentialDemandMult: 1.0,
    businessDemandMult: 1.0,
    globalDemandMult: 1.0,
    baseTrafficBalls: 3,
    tariffMult: 1.0,
  };
}

/**
 * Evaluates weather modifiers according to game design spec:
 * - Clear: baseline
 * - Rain: demand +35%, foot/scooter speed -20%
 * - Snow: traffic +3 balls, delivery check x1.5
 * - Storm (Гроза): drones grounded at base, demand +45%, check x1.35
 */
export function getWeatherProfile(weather: WeatherType): {
  id: WeatherType;
  label: string;
  demandMult: number;
  footScooterSpeedMult: number;
  trafficDeltaBalls: number;
  checkMult: number;
  dronesGrounded: boolean;
} {
  switch (weather) {
    case 'rain':
      return {
        id: 'rain',
        label: 'Дождь',
        demandMult: 1.35,
        footScooterSpeedMult: 0.8,
        trafficDeltaBalls: 1,
        checkMult: 1.15,
        dronesGrounded: false,
      };
    case 'snow':
      return {
        id: 'snow',
        label: 'Снегопад',
        demandMult: 1.25,
        footScooterSpeedMult: 0.85,
        trafficDeltaBalls: 3,
        checkMult: 1.5,
        dronesGrounded: false,
      };
    case 'storm':
      return {
        id: 'storm',
        label: 'Гроза (Шторм)',
        demandMult: 1.45,
        footScooterSpeedMult: 0.78,
        trafficDeltaBalls: 2,
        checkMult: 1.35,
        dronesGrounded: true,
      };
    case 'clear':
    default:
      return {
        id: 'clear',
        label: 'Ясно',
        demandMult: 1.0,
        footScooterSpeedMult: 1.0,
        trafficDeltaBalls: 0,
        checkMult: 1.0,
        dronesGrounded: false,
      };
  }
}

/**
 * Calculates darkstore picking capacity (orders/sec) and storage capacity
 */
export function getDarkstoreMetrics(
  slot: DarkstoreSlot,
  predictivePackingLevel: number,
  hyperloopLevel: number,
  quantumCores: number
): {
  pickingRate: number;
  storageCapacity: number;
  pickingUpgradeCost: number;
  storageUpgradeCost: number;
} {
  if (!slot.unlocked) {
    return {
      pickingRate: 0,
      storageCapacity: 0,
      pickingUpgradeCost: slot.baseUnlockCost,
      storageUpgradeCost: slot.baseUnlockCost,
    };
  }

  const predictiveBonus = 1 + predictivePackingLevel * 0.4; // +40% per level of Predictive Pre-Packing
  const hyperloopBonus = 1 + hyperloopLevel * 0.55;
  const quantumBonus = 1 + quantumCores * 0.12;

  const pickingLevelMult = Math.pow(1.32, slot.pickingUpgradeLevel - 1);
  const storageLevelMult = Math.pow(1.35, slot.storageUpgradeLevel - 1);

  const pickingRate =
    slot.basePickingRate * pickingLevelMult * predictiveBonus * hyperloopBonus * quantumBonus;
  const storageCapacity = Math.round(slot.baseStorageCapacity * storageLevelMult * (1 + hyperloopLevel * 0.25));

  const baseUpgradeRef = Math.max(120, slot.baseUnlockCost || 160);
  const pickingUpgradeCost = calculateUnitCost(baseUpgradeRef, 1.22, slot.pickingUpgradeLevel - 1);
  const storageUpgradeCost = calculateUnitCost(Math.round(baseUpgradeRef * 0.85), 1.2, slot.storageUpgradeLevel - 1);

  return {
    pickingRate,
    storageCapacity,
    pickingUpgradeCost,
    storageUpgradeCost,
  };
}

/**
 * Core Bottleneck-Driven Economy Engine:
 * Evaluates all 3 links of the value creation chain:
 * 1. Demand Generation (Спрос)
 * 2. Darkstore Picking Capacity (Мощность дарксторов)
 * 3. Fleet Delivery Throughput (Пропускная способность курьеров)
 */
export function evaluateEconomyBottlenecks(state: PersistentGameState): BottleneckAnalysis {
  const timeProfile = getTimeOfDayProfile(state.gameMinutes);
  const weatherProfile = getWeatherProfile(state.weather);

  const greedyLevel = state.algorithms['greedy_dispatch'] ?? 1;
  const batchingLevel = state.algorithms['multi_batching'] ?? 0;
  const predictiveLevel = state.algorithms['predictive_packing'] ?? 0;
  const trafficAStarLevel = state.algorithms['astar_live_traffic'] ?? 0;
  const swarmLevel = state.algorithms['swarm_mesh'] ?? 0;
  const hyperloopLevel = state.algorithms['capsule_hyperloop'] ?? 0;

  const trafficScore = Math.min(
    10,
    Math.max(0, timeProfile.baseTrafficBalls + weatherProfile.trafficDeltaBalls)
  );

  // Rating multiplier: high rating (e.g. 4.9★) increases order frequency and tips
  const clampedRating = Math.min(5.0, Math.max(1.0, state.rating));
  const ratingDemandMult = 0.5 + (clampedRating / 5.0) * 0.75; // 1.25x at 5.0★, 0.65x at 1.0★
  const ratingTipMult = 0.75 + Math.pow(clampedRating / 5.0, 1.5) * 0.65; // up to 1.4x at 5.0★

  // Surge Pricing: reduces incoming demand by 28%, increases order margin by +55%
  const surgeDemandMult = state.surgePricingActive ? 0.72 : 1.0;
  const surgeCheckMult = state.surgePricingActive ? 1.55 : 1.0;

  // 1. DEMAND GENERATION across unlocked districts
  let rawDemandPerSec = 0;
  let weightedCheckNumerator = 0;

  for (const dist of INITIAL_DISTRICTS) {
    if (!state.districtsUnlocked[dist.id]) continue;
    const districtTimeBonus =
      timeProfile.periodId === 'morning_peak'
        ? dist.residentialWeight * timeProfile.residentialDemandMult
        : timeProfile.periodId === 'day_business'
          ? dist.businessWeight * timeProfile.businessDemandMult
          : timeProfile.globalDemandMult;

    const distDemand =
      dist.baseDemandPerSec *
      districtTimeBonus *
      weatherProfile.demandMult *
      ratingDemandMult *
      surgeDemandMult *
      (1 + state.prestige.metropolisTier * 0.25);

    rawDemandPerSec += distDemand;
    weightedCheckNumerator += distDemand * dist.baseOrderValue;
  }

  const baseWeightedCheck = rawDemandPerSec > 0 ? weightedCheckNumerator / rawDemandPerSec : 15;

  // 2. DARKSTORE PICKING CAPACITY
  let totalPickingCapacity = 0;
  let totalPendingOrders = 0;
  let maxStorageCapacity = 0;

  for (const savedDs of state.darkstores) {
    const template = INITIAL_DARKSTORES.find((d) => d.id === savedDs.id);
    if (!template || !savedDs.unlocked) continue;
    const mergedSlot: DarkstoreSlot = {
      ...template,
      ...savedDs,
      utilizationPct: 0,
    };
    const dsMetrics = getDarkstoreMetrics(
      mergedSlot,
      predictiveLevel,
      hyperloopLevel,
      state.prestige.quantumCores
    );
    totalPickingCapacity += dsMetrics.pickingRate;
    totalPendingOrders += savedDs.currentQueue;
    maxStorageCapacity += dsMetrics.storageCapacity;
  }

  // 3. COURIER DELIVERY THROUGHPUT
  const greedyMult = 1 + greedyLevel * 0.15;
  const batchingThroughputMult = 1 + batchingLevel * 0.22;
  // A* Live Traffic reduces traffic penalty by up to 75% (50% at level 4)
  const trafficReliefFactor = Math.max(0.2, 1 - trafficAStarLevel * 0.1);
  const swarmMult = 1 + swarmLevel * 0.35;
  const quantumSpeedMult = 1 + state.prestige.quantumCores * 0.08;

  let totalDeliveryCapacity = 0;
  (Object.keys(COURIER_CONFIGS) as CourierTypeId[]).forEach((cId) => {
    const count = state.couriers[cId] || 0;
    if (count <= 0) return;

    const cfg = COURIER_CONFIGS[cId];
    if (cfg.groundedInStorm && weatherProfile.dronesGrounded) {
      return; // Drones are grounded during thunderstorm
    }

    const milestones = getCourierMilestoneBonuses(cId, count);
    const upgradeLvl = state.courierLevels[cId] || 1;
    const upgradeMult = 1 + (upgradeLvl - 1) * 0.18;

    const weatherSpeedMod =
      cId === 'foot' || cId === 'scooter' ? weatherProfile.footScooterSpeedMult : 1.0;

    // Traffic penalty calculation
    const normalizedTraffic = trafficScore / 10; // 0..1
    const rawTrafficSlowdown = cfg.ignoresTraffic
      ? 0
      : normalizedTraffic * cfg.trafficSensitivity * trafficReliefFactor;
    const trafficSpeedMod = Math.max(0.18, 1 - rawTrafficSlowdown);

    const droneBonus = cId === 'drone' ? swarmMult : 1.0;

    const unitThroughput =
      count *
      cfg.baseOrdersPerSec *
      milestones.capacityMultiplier *
      milestones.speedMultiplier *
      upgradeMult *
      weatherSpeedMod *
      trafficSpeedMod *
      greedyMult *
      batchingThroughputMult *
      droneBonus *
      quantumSpeedMult;

    totalDeliveryCapacity += unitThroughput;
  });

  // Effective fulfilled orders/sec is constrained by the tightest bottleneck
  // If there is a backlog queue at darkstores, picking + delivery can drain slightly faster than live demand
  const availableSupplyToPack = rawDemandPerSec + Math.min(totalPickingCapacity * 0.35, totalPendingOrders * 0.5);
  const packedPerSec = Math.min(availableSupplyToPack, totalPickingCapacity);
  const effectiveOrdersPerSec = Math.min(packedPerSec, totalDeliveryCapacity);

  // Determine limiting factor
  let limitingFactor: 'demand' | 'picking' | 'delivery' = 'delivery';
  const minVal = Math.min(rawDemandPerSec, totalPickingCapacity, totalDeliveryCapacity);
  if (minVal === totalPickingCapacity && totalPickingCapacity <= totalDeliveryCapacity) {
    limitingFactor = 'picking';
  } else if (minVal === totalDeliveryCapacity) {
    limitingFactor = 'delivery';
  } else {
    limitingFactor = 'demand';
  }

  const maxReference = Math.max(0.1, rawDemandPerSec, totalPickingCapacity, totalDeliveryCapacity);
  const demandPct = Math.min(100, Math.round((rawDemandPerSec / maxReference) * 100));
  const pickingPct = Math.min(100, Math.round((totalPickingCapacity / maxReference) * 100));
  const deliveryPct = Math.min(100, Math.round((totalDeliveryCapacity / maxReference) * 100));

  // Average Order Check ($)
  const founderBonus = 1 + state.prestige.founderShares * 0.15;
  const batchCheckBonus = 1 + batchingLevel * 0.08;
  const hyperloopCheckBonus = 1 + hyperloopLevel * 0.25;

  const avgOrderCheck =
    baseWeightedCheck *
    timeProfile.tariffMult *
    weatherProfile.checkMult *
    ratingTipMult *
    surgeCheckMult *
    founderBonus *
    batchCheckBonus *
    hyperloopCheckBonus;

  const netIncomePerSec = effectiveOrdersPerSec * avgOrderCheck;

  let recommendation = 'Баланс оптимален: расширяйте сеть районов';
  if (limitingFactor === 'delivery') {
    if (weatherProfile.dronesGrounded && (state.couriers.drone || 0) > 0) {
      recommendation = 'Гроза: дроны на базе! Усильте самокаты или фургоны';
    } else if (trafficScore >= 7 && (state.couriers.van || 0) > 3) {
      recommendation = 'Пробки 7+ баллов тормозят фургоны: наймите самокаты/дроны или A* ИИ';
    } else {
      recommendation = 'Узкое место — Вывоз: наймите курьеров или прокачайте батчинг';
    }
  } else if (limitingFactor === 'picking') {
    recommendation = 'Узкое место — Сборка: курьеры ждут у дарксторов! Прокачайте склады';
  } else {
    recommendation = 'Спрос ниже мощностей: откройте новый район или отключите Surge-тариф';
  }

  return {
    demandRate: rawDemandPerSec,
    pickingCapacity: totalPickingCapacity,
    deliveryCapacity: totalDeliveryCapacity,
    effectiveOrdersPerSec,
    limitingFactor,
    demandPct,
    pickingPct,
    deliveryPct,
    avgOrderCheck,
    netIncomePerSec,
    totalPendingOrders,
    maxStorageCapacity: Math.max(10, maxStorageCapacity),
    trafficScore,
    recommendation,
  };
}

/**
 * Calculates IPO Prestige rewards based on current run revenue
 */
export function calculateIpoRewards(currentRunRevenue: number): {
  canLaunchIpo: boolean;
  minRevenueRequired: number;
  founderSharesGain: number;
  quantumCoresGain: number;
} {
  const minRevenueRequired = 25000;
  if (currentRunRevenue < minRevenueRequired) {
    return {
      canLaunchIpo: false,
      minRevenueRequired,
      founderSharesGain: 0,
      quantumCoresGain: 0,
    };
  }

  const ratio = currentRunRevenue / minRevenueRequired;
  const founderSharesGain = Math.max(1, Math.floor(Math.pow(ratio, 0.55) * 3));
  const quantumCoresGain = Math.max(1, Math.floor(Math.pow(ratio, 0.48) * 2));

  return {
    canLaunchIpo: true,
    minRevenueRequired,
    founderSharesGain,
    quantumCoresGain,
  };
}

/**
 * Formats large numbers cleanly in iOS financial style: 12.4K, 3.85M, 1.2B
 */
export function formatCompactNumber(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '0';
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);

  if (abs < 1000) {
    if (abs < 10 && decimals > 0 && abs % 1 !== 0) {
      return `${sign}${abs.toFixed(1)}`;
    }
    return `${sign}${Math.round(abs)}`;
  }
  if (abs < 1_000_000) {
    return `${sign}${(abs / 1_000).toFixed(abs >= 100_000 ? 1 : decimals)}K`;
  }
  if (abs < 1_000_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(decimals)}M`;
  }
  if (abs < 1_000_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(decimals)}B`;
  }
  return `${sign}${(abs / 1_000_000_000_000).toFixed(decimals)}T`;
}

export function formatCurrency(value: number): string {
  return `$${formatCompactNumber(value)}`;
}

/**
 * Creates a fresh initial game state
 */
export function createInitialGameState(): PersistentGameState {
  return {
    version: 1,
    money: 180,
    rating: 4.9,
    gameMinutes: 8 * 60 + 15, // 08:15 AM Morning Peak start for immediate action
    weather: 'clear',
    weatherTimerSec: 45,
    simSpeed: 1,
    surgePricingActive: false,
    couriers: {
      foot: 3,
      scooter: 1,
      van: 0,
      drone: 0,
    },
    courierLevels: {
      foot: 1,
      scooter: 1,
      van: 1,
      drone: 1,
    },
    districtsUnlocked: {
      south_residential: true,
      technopark: false,
      historic_center: false,
      port_industrial: false,
      city_skyscrapers: false,
    },
    darkstores: INITIAL_DARKSTORES.map((ds) => ({
      id: ds.id,
      unlocked: ds.unlocked,
      level: ds.level,
      pickingUpgradeLevel: ds.pickingUpgradeLevel,
      storageUpgradeLevel: ds.storageUpgradeLevel,
      currentQueue: ds.currentQueue,
    })),
    algorithms: {
      greedy_dispatch: 1,
      multi_batching: 0,
      predictive_packing: 0,
      astar_live_traffic: 0,
      swarm_mesh: 0,
      capsule_hyperloop: 0,
    },
    prestige: {
      ipoCount: 0,
      founderShares: 0,
      quantumCores: 0,
      lifetimeRevenue: 0,
      currentRunRevenue: 180,
      metropolisTier: 0,
      hyperloopUnlocked: false,
    },
    totalOrdersDelivered: 12,
    lastSavedAt: Date.now(),
  };
}
