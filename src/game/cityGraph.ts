import { INITIAL_DARKSTORES, INITIAL_DISTRICTS } from './economy.ts';
import type { CityBuildingBlock, CityEdge, CityMapGraph, CityNode, CityParkPolygon } from './types.ts';

export function buildProceduralCityGraph(): CityMapGraph {
  const width = 1600;
  const height = 1080;

  // River winding horizontally through the metropolis between North (Port/City) and Center/South
  const riverPoints = [
    { x: 0, y: 390 },
    { x: 260, y: 375 },
    { x: 520, y: 340 },
    { x: 780, y: 350 },
    { x: 1050, y: 380 },
    { x: 1320, y: 360 },
    { x: 1600, y: 345 },
  ];

  const parks: CityParkPolygon[] = [
    { id: 'park_south_1', x: 250, y: 670, w: 135, h: 95, rx: 18 },
    { id: 'park_south_2', x: 540, y: 860, w: 120, h: 85, rx: 16 },
    { id: 'park_tech_1', x: 930, y: 640, w: 150, h: 95, rx: 20 },
    { id: 'park_center_1', x: 610, y: 410, w: 130, h: 80, rx: 16 },
    { id: 'park_city_1', x: 960, y: 140, w: 140, h: 90, rx: 18 },
  ];

  const nodes: CityNode[] = [];
  const edges: CityEdge[] = [];

  const addNode = (
    id: string,
    x: number,
    y: number,
    districtId: string,
    kind: CityNode['kind'],
    label?: string
  ) => {
    nodes.push({
      id,
      x,
      y,
      districtId,
      kind,
      label,
      pendingOrders: kind === 'residential' || kind === 'business' ? 2 + (nodes.length % 4) : 0,
      maxOrders: kind === 'business' ? 28 : 20,
    });
  };

  // Add Darkstore nodes from INITIAL_DARKSTORES
  for (const ds of INITIAL_DARKSTORES) {
    addNode(ds.nodeId, ds.x, ds.y, ds.districtId, 'darkstore', ds.name);
  }

  // District 0: South Residential (Спальный Юг)
  addNode('s_c1', 260, 780, 'south_residential', 'residential', 'ЖК «Южные Сады»');
  addNode('s_c2', 330, 910, 'south_residential', 'residential', 'Квартал Весна');
  addNode('s_c3', 480, 680, 'south_residential', 'residential', 'Пр-т Вернадского');
  addNode('s_c4', 560, 770, 'south_residential', 'business', 'ТЦ «Южный Молл»');
  addNode('s_c5', 490, 920, 'south_residential', 'residential', 'Микрорайон 4');
  addNode('s_c6', 760, 720, 'south_residential', 'residential', 'ЖК «Горизонт»');
  addNode('s_c7', 770, 910, 'south_residential', 'residential', 'Парковый тупик');

  // District 1: Technopark (Технопарк)
  addNode('t_c1', 910, 770, 'technopark', 'business', 'Кампус Квантум');
  addNode('t_c2', 1020, 640, 'technopark', 'business', 'Лаборатория ИИ');
  addNode('t_c3', 1240, 670, 'technopark', 'business', 'Дата-Центр Восток');
  addNode('t_c4', 1230, 820, 'technopark', 'residential', 'Лофт-квартал Код');
  addNode('t_c5', 1040, 900, 'technopark', 'residential', 'Академгородок');
  addNode('t_c6', 1380, 760, 'technopark', 'business', 'Техно-Биржа');

  // District 2: Historic Center (Исторический Центр)
  addNode('h_c1', 490, 480, 'historic_center', 'business', 'Старый Арбат');
  addNode('h_c2', 640, 530, 'historic_center', 'residential', 'Патриаршие пруды');
  addNode('h_c3', 780, 575, 'historic_center', 'business', 'Центральный Рынок');
  addNode('h_c4', 920, 465, 'historic_center', 'business', 'Гранд Отель');
  addNode('h_c5', 1070, 520, 'historic_center', 'residential', 'Набережная Искусств');
  addNode('h_c6', 630, 395, 'historic_center', 'business', 'Речной Вокзал Юг');

  // District 3: Port Industrial (Промзона-Порт)
  addNode('p_c1', 210, 220, 'port_industrial', 'business', 'Контейнерный Док');
  addNode('p_c2', 270, 120, 'port_industrial', 'business', 'Северная Верфь');
  addNode('p_c3', 510, 140, 'port_industrial', 'business', 'Оптовый Терминал');
  addNode('p_c4', 540, 260, 'port_industrial', 'residential', 'Поселок Речников');
  addNode('p_c5', 690, 210, 'port_industrial', 'business', 'Индустриальный Парк');

  // District 4: City Skyscrapers (Сити-Небоскребы)
  addNode('c_c1', 890, 220, 'city_skyscrapers', 'business', 'Башня Меркурий');
  addNode('c_c2', 1040, 125, 'city_skyscrapers', 'business', 'Небоскреб Империя');
  addNode('c_c3', 1050, 275, 'city_skyscrapers', 'business', 'Финансовый Хаб');
  addNode('c_c4', 1330, 150, 'city_skyscrapers', 'business', 'Биржевой Квартал');
  addNode('c_c5', 1350, 275, 'city_skyscrapers', 'residential', 'Пентхаусы Скайлайн');

  const nodeMap = new Map<string, CityNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  const connect = (
    from: string,
    to: string,
    roadType: CityEdge['roadType'] = 'street',
    baseTraffic = 0.35
  ) => {
    const a = nodeMap.get(from);
    const b = nodeMap.get(to);
    if (!a || !b) return;
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    edges.push({
      id: `edge_${from}_${to}`,
      from,
      to,
      roadType,
      length,
      baseTraffic,
    });
  };

  // South Residential road connections
  connect('node_ds_south_1', 's_c1', 'avenue', 0.4);
  connect('node_ds_south_1', 's_c2', 'street', 0.3);
  connect('node_ds_south_1', 's_c3', 'avenue', 0.5);
  connect('node_ds_south_1', 's_c4', 'avenue', 0.55);
  connect('node_ds_south_1', 's_c5', 'street', 0.35);
  connect('s_c1', 's_c2', 'street', 0.25);
  connect('s_c1', 's_c3', 'street', 0.3);
  connect('s_c4', 'node_ds_south_2', 'avenue', 0.5);
  connect('s_c5', 'node_ds_south_2', 'street', 0.35);
  connect('node_ds_south_2', 's_c6', 'avenue', 0.45);
  connect('node_ds_south_2', 's_c7', 'street', 0.3);
  connect('s_c4', 's_c6', 'street', 0.4);
  connect('s_c6', 's_c7', 'street', 0.3);

  // Technopark road connections
  connect('s_c6', 't_c1', 'highway', 0.65);
  connect('node_ds_south_2', 't_c5', 'avenue', 0.5);
  connect('t_c1', 'node_ds_tech_1', 'avenue', 0.5);
  connect('t_c2', 'node_ds_tech_1', 'avenue', 0.45);
  connect('node_ds_tech_1', 't_c3', 'avenue', 0.55);
  connect('node_ds_tech_1', 't_c4', 'street', 0.4);
  connect('node_ds_tech_1', 't_c5', 'street', 0.35);
  connect('t_c3', 't_c6', 'highway', 0.6);
  connect('t_c4', 't_c6', 'avenue', 0.45);
  connect('t_c1', 't_c2', 'street', 0.35);
  connect('t_c4', 't_c5', 'street', 0.3);

  // Historic Center connections
  connect('s_c3', 'h_c1', 'highway', 0.75);
  connect('s_c4', 'h_c2', 'avenue', 0.65);
  connect('s_c6', 'h_c3', 'highway', 0.7);
  connect('t_c2', 'h_c5', 'avenue', 0.6);
  connect('h_c1', 'h_c2', 'avenue', 0.6);
  connect('h_c2', 'node_ds_center_1', 'avenue', 0.7);
  connect('h_c3', 'node_ds_center_1', 'avenue', 0.65);
  connect('node_ds_center_1', 'h_c4', 'highway', 0.75);
  connect('h_c4', 'h_c5', 'avenue', 0.6);
  connect('h_c2', 'h_c6', 'street', 0.5);
  connect('node_ds_center_1', 'h_c6', 'avenue', 0.6);

  // Bridges across the river to Port & City Skyscrapers
  connect('h_c1', 'p_c4', 'bridge', 0.8);
  connect('h_c6', 'p_c5', 'bridge', 0.75);
  connect('h_c4', 'c_c1', 'bridge', 0.85);
  connect('h_c5', 'c_c3', 'bridge', 0.8);

  // Port Industrial connections
  connect('node_ds_port_1', 'p_c1', 'avenue', 0.45);
  connect('node_ds_port_1', 'p_c2', 'street', 0.35);
  connect('node_ds_port_1', 'p_c3', 'avenue', 0.5);
  connect('node_ds_port_1', 'p_c4', 'avenue', 0.5);
  connect('p_c3', 'p_c5', 'highway', 0.6);
  connect('p_c4', 'p_c5', 'avenue', 0.55);
  connect('p_c1', 'p_c2', 'street', 0.3);

  // City Skyscrapers connections
  connect('p_c5', 'c_c1', 'highway', 0.75);
  connect('c_c1', 'c_c2', 'avenue', 0.65);
  connect('c_c1', 'c_c3', 'highway', 0.75);
  connect('c_c2', 'node_ds_city_1', 'avenue', 0.7);
  connect('c_c3', 'node_ds_city_1', 'highway', 0.8);
  connect('node_ds_city_1', 'c_c4', 'avenue', 0.7);
  connect('node_ds_city_1', 'c_c5', 'avenue', 0.65);
  connect('c_c4', 'c_c5', 'street', 0.55);

  // Generate subtle architectural building blocks around districts so the map looks like Apple Maps Dark Mode
  const blocks: CityBuildingBlock[] = [];
  let blockIdx = 0;
  for (const dist of INITIAL_DISTRICTS) {
    const { minX, minY, maxX, maxY } = dist.bounds;
    const cols = 5;
    const rows = 3;
    const cellW = (maxX - minX) / cols;
    const cellH = (maxY - minY) / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const bx = minX + c * cellW + 14;
        const by = minY + r * cellH + 12;
        const bw = cellW - 28;
        const bh = cellH - 24;
        // Skip if overlapping river band (y between 325 and 405)
        if (by + bh > 325 && by < 405) continue;
        blockIdx++;
        blocks.push({
          id: `blk_${dist.id}_${blockIdx}`,
          x: bx,
          y: by,
          w: bw,
          h: bh,
          districtId: dist.id,
          isBusinessTower: dist.id === 'city_skyscrapers' || (blockIdx % 3 === 0 && dist.businessWeight > 1.2),
        });
      }
    }
  }

  return {
    width,
    height,
    nodes,
    edges,
    parks,
    blocks,
    riverPoints,
  };
}

/**
 * Finds shortest path of node IDs between startNodeId and targetNodeId using Dijkstra/A*
 */
export function findRoadPath(
  graph: CityMapGraph,
  startNodeId: string,
  targetNodeId: string
): CityNode[] {
  const nodeMap = new Map<string, CityNode>();
  for (const n of graph.nodes) nodeMap.set(n.id, n);

  const startNode = nodeMap.get(startNodeId);
  const targetNode = nodeMap.get(targetNodeId);
  if (!startNode || !targetNode) return [];
  if (startNodeId === targetNodeId) return [startNode];

  const adj = new Map<string, Array<{ to: string; cost: number }>>();
  for (const n of graph.nodes) adj.set(n.id, []);
  for (const e of graph.edges) {
    adj.get(e.from)?.push({ to: e.to, cost: e.length });
    adj.get(e.to)?.push({ to: e.from, cost: e.length });
  }

  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const visited = new Set<string>();

  for (const n of graph.nodes) {
    dist.set(n.id, Infinity);
    prev.set(n.id, null);
  }
  dist.set(startNodeId, 0);

  while (visited.size < graph.nodes.length) {
    let u: string | null = null;
    let best = Infinity;
    for (const [id, d] of dist.entries()) {
      if (!visited.has(id) && d < best) {
        best = d;
        u = id;
      }
    }
    if (!u || u === targetNodeId) break;
    visited.add(u);

    const neighbors = adj.get(u) || [];
    for (const nb of neighbors) {
      if (visited.has(nb.to)) continue;
      const alt = best + nb.cost;
      if (alt < (dist.get(nb.to) ?? Infinity)) {
        dist.set(nb.to, alt);
        prev.set(nb.to, u);
      }
    }
  }

  const path: CityNode[] = [];
  let curr: string | null = targetNodeId;
  while (curr) {
    const n = nodeMap.get(curr);
    if (n) path.unshift(n);
    curr = prev.get(curr) ?? null;
  }

  if (path.length === 0 || path[0].id !== startNodeId) {
    return [startNode, targetNode];
  }
  return path;
}
