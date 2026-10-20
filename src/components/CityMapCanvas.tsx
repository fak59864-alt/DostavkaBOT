import React, { useEffect, useRef } from 'react';
import { findRoadPath } from '../game/cityGraph.ts';
import {
  COURIER_CONFIGS,
  INITIAL_DARKSTORES,
  INITIAL_DISTRICTS,
  formatCompactNumber,
  getTimeOfDayProfile,
  getWeatherProfile,
} from '../game/economy.ts';
import type {
  BottleneckAnalysis,
  CityMapGraph,
  CityNode,
  CourierTypeId,
  MapLayerMode,
  PersistentGameState,
} from '../game/types.ts';
import { triggerHaptic } from '../utils/telegram.ts';

interface ActiveCourierAgent {
  id: number;
  type: CourierTypeId;
  color: string;
  darkstoreId: string;
  startNodeId: string;
  targetNodeId: string;
  path: CityNode[];
  pathIndex: number;
  segmentProgress: number; // 0..1 along current edge
  x: number;
  y: number;
  trailX: Float32Array;
  trailY: Float32Array;
  trailHead: number;
  returningToBase: boolean;
  waitTimer: number; // waiting at darkstore if picking is bottlenecked
  batteryPct: number;
  batchCount: number;
}

interface FloatingMoneyPopup {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  text: string;
  color: string;
}

interface PooledParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface CityMapCanvasProps {
  cityGraph: CityMapGraph;
  gameState: PersistentGameState;
  bottleneck: BottleneckAnalysis;
  layerMode: MapLayerMode;
  selectedDarkstoreId: string | null;
  onSelectDarkstore: (id: string | null) => void;
  cameraTarget: { x: number; y: number; zoom: number; seq: number } | null;
  isPlaying: boolean;
}

const MAX_AGENTS = 64;
const TRAIL_LEN = 8;
const MAX_POPUPS = 32;
const MAX_PARTICLES = 96;

export const CityMapCanvas: React.FC<CityMapCanvasProps> = ({
  cityGraph,
  gameState,
  bottleneck,
  layerMode,
  selectedDarkstoreId,
  onSelectDarkstore,
  cameraTarget,
  isPlaying,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Store latest props in refs so the 60Hz loop never restarts on React state updates
  const stateRef = useRef({
    cityGraph,
    gameState,
    bottleneck,
    layerMode,
    selectedDarkstoreId,
    onSelectDarkstore,
    isPlaying,
  });

  useEffect(() => {
    stateRef.current = {
      cityGraph,
      gameState,
      bottleneck,
      layerMode,
      selectedDarkstoreId,
      onSelectDarkstore,
      isPlaying,
    };
  }, [
    cityGraph,
    gameState,
    bottleneck,
    layerMode,
    selectedDarkstoreId,
    onSelectDarkstore,
    isPlaying,
  ]);

  // Camera state ref (world coordinates center + zoom)
  const cameraRef = useRef({
    x: 560,
    y: 740,
    zoom: 0.92,
    targetX: 560,
    targetY: 740,
    targetZoom: 0.92,
  });

  useEffect(() => {
    if (cameraTarget) {
      cameraRef.current.targetX = cameraTarget.x;
      cameraRef.current.targetY = cameraTarget.y;
      cameraRef.current.targetZoom = cameraTarget.zoom;
    }
  }, [cameraTarget]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isHeadless =
      typeof navigator !== 'undefined' &&
      (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent));

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = isHeadless ? 1 : Math.min(window.devicePixelRatio || 1, 2);

    const updateCanvasSize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      width = Math.max(320, rect.width || window.innerWidth);
      height = Math.max(480, rect.height || window.innerHeight);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    };

    updateCanvasSize();
    const resizeObserver = new ResizeObserver(() => updateCanvasSize());
    resizeObserver.observe(canvas);

    // Pre-allocate zero-GC pools
    const popups: FloatingMoneyPopup[] = Array.from({ length: MAX_POPUPS }, () => ({
      active: false,
      x: 0,
      y: 0,
      vy: -28,
      life: 0,
      maxLife: 1.2,
      text: '',
      color: '#30D158',
    }));
    let popupCursor = 0;

    const spawnPopup = (x: number, y: number, text: string, color = '#30D158') => {
      const p = popups[popupCursor];
      popupCursor = (popupCursor + 1) % MAX_POPUPS;
      p.active = true;
      p.x = x + (Math.random() - 0.5) * 16;
      p.y = y - 10;
      p.vy = -26 - Math.random() * 10;
      p.life = 0;
      p.maxLife = 1.25;
      p.text = text;
      p.color = color;
    };

    const particles: PooledParticle[] = Array.from({ length: MAX_PARTICLES }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0.5,
      color: '#30D158',
      size: 2.5,
    }));
    let particleCursor = 0;

    const spawnBurst = (x: number, y: number, color: string, count = 5) => {
      if (isHeadless) return;
      for (let i = 0; i < count; i++) {
        const pt = particles[particleCursor];
        particleCursor = (particleCursor + 1) % MAX_PARTICLES;
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const speed = 25 + Math.random() * 45;
        pt.active = true;
        pt.x = x;
        pt.y = y;
        pt.vx = Math.cos(angle) * speed;
        pt.vy = Math.sin(angle) * speed;
        pt.life = 0;
        pt.maxLife = 0.38 + Math.random() * 0.22;
        pt.color = color;
        pt.size = 2 + Math.random() * 2;
      }
    };

    // Active courier agents pool
    const agents: ActiveCourierAgent[] = [];
    let nextAgentId = 1;

    const pickDestinationCluster = (districtIds: string[], graph: CityMapGraph): CityNode => {
      const candidates = graph.nodes.filter(
        (n) =>
          (n.kind === 'residential' || n.kind === 'business') &&
          districtIds.includes(n.districtId)
      );
      if (candidates.length === 0) {
        return graph.nodes.find((n) => n.kind === 'residential') || graph.nodes[0];
      }
      // Prefer nodes with higher pending orders
      candidates.sort((a, b) => b.pendingOrders - a.pendingOrders + (Math.random() - 0.5) * 4);
      return candidates[0];
    };

    const assignNewRoute = (
      agent: ActiveCourierAgent,
      st: PersistentGameState,
      graph: CityMapGraph
    ) => {
      const unlockedDs = INITIAL_DARKSTORES.filter((ds) =>
        st.darkstores.some((s) => s.id === ds.id && s.unlocked)
      );
      const homeDs =
        unlockedDs.find((d) => d.id === agent.darkstoreId) ||
        unlockedDs[agent.id % Math.max(1, unlockedDs.length)] ||
        INITIAL_DARKSTORES[0];

      agent.darkstoreId = homeDs.id;
      const unlockedDistrictIds = Object.entries(st.districtsUnlocked)
        .filter(([, u]) => u)
        .map(([k]) => k);

      const destNode = pickDestinationCluster(unlockedDistrictIds, graph);
      const startNode =
        graph.nodes.find((n) => n.id === homeDs.nodeId) || graph.nodes[0];

      agent.startNodeId = startNode.id;
      agent.targetNodeId = destNode.id;
      agent.returningToBase = false;

      if (agent.type === 'drone') {
        agent.path = [startNode, destNode];
      } else {
        agent.path = findRoadPath(graph, startNode.id, destNode.id);
      }
      agent.pathIndex = 0;
      agent.segmentProgress = 0;
      agent.x = startNode.x;
      agent.y = startNode.y;
    };

    const syncAgentPool = () => {
      const { gameState: st, cityGraph: graph } = stateRef.current;
      const weatherProf = getWeatherProfile(st.weather);

      // Desired visual agent count per type (capped smoothly for 60fps)
      const desiredByType: Record<CourierTypeId, number> = {
        foot: Math.min(18, st.couriers.foot || 0),
        scooter: Math.min(18, st.couriers.scooter || 0),
        van: Math.min(14, st.couriers.van || 0),
        drone: weatherProf.dronesGrounded ? 0 : Math.min(14, st.couriers.drone || 0),
      };

      // Remove excess agents of any type
      for (let i = agents.length - 1; i >= 0; i--) {
        const a = agents[i];
        const currentOfType = agents.filter((x) => x.type === a.type).length;
        if (currentOfType > desiredByType[a.type]) {
          agents.splice(i, 1);
        }
      }

      // Add missing agents
      (Object.keys(desiredByType) as CourierTypeId[]).forEach((t) => {
        const currentCount = agents.filter((x) => x.type === t).length;
        const needed = desiredByType[t] - currentCount;
        for (let k = 0; k < needed && agents.length < MAX_AGENTS; k++) {
          const cfg = COURIER_CONFIGS[t];
          const unlockedDs = INITIAL_DARKSTORES.filter((ds) =>
            st.darkstores.some((s) => s.id === ds.id && s.unlocked)
          );
          const homeDs = unlockedDs[agents.length % Math.max(1, unlockedDs.length)] || INITIAL_DARKSTORES[0];

          const newAgent: ActiveCourierAgent = {
            id: nextAgentId++,
            type: t,
            color: cfg.color,
            darkstoreId: homeDs.id,
            startNodeId: homeDs.nodeId,
            targetNodeId: homeDs.nodeId,
            path: [],
            pathIndex: 0,
            segmentProgress: Math.random() * 0.6,
            x: homeDs.x,
            y: homeDs.y,
            trailX: new Float32Array(TRAIL_LEN).fill(homeDs.x),
            trailY: new Float32Array(TRAIL_LEN).fill(homeDs.y),
            trailHead: 0,
            returningToBase: false,
            waitTimer: 0,
            batteryPct: 75 + Math.random() * 25,
            batchCount: cfg.baseBatchSize + (st.algorithms['multi_batching'] || 0),
          };
          assignNewRoute(newAgent, st, graph);
          agents.push(newAgent);
        }
      });
    };

    // Pointer & Keyboard navigation handlers
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let pointerMovedDist = 0;
    const keysHeld = new Set<string>();

    const screenToWorld = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      const cam = cameraRef.current;
      const wx = (sx - width / 2) / cam.zoom + cam.x;
      const wy = (sy - height / 2) / cam.zoom + cam.y;
      return { wx, wy };
    };

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      pointerMovedDist = 0;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      pointerMovedDist += Math.hypot(dx, dy);
      dragStartX = e.clientX;
      dragStartY = e.clientY;

      const cam = cameraRef.current;
      cam.targetX = Math.max(120, Math.min(1480, cam.targetX - dx / cam.zoom));
      cam.targetY = Math.max(100, Math.min(980, cam.targetY - dy / cam.zoom));
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;

      // If it was a clean tap/click (< 8px drag), check if user clicked a darkstore on the map
      if (pointerMovedDist < 10) {
        const { wx, wy } = screenToWorld(e.clientX, e.clientY);
        const hitDs = INITIAL_DARKSTORES.find(
          (ds) => Math.hypot(ds.x - wx, ds.y - wy) < 38
        );
        if (hitDs) {
          triggerHaptic('selection');
          stateRef.current.onSelectDarkstore(hitDs.id);
          cameraRef.current.targetX = hitDs.x;
          cameraRef.current.targetY = hitDs.y;
        } else if (stateRef.current.selectedDarkstoreId) {
          stateRef.current.onSelectDarkstore(null);
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const cam = cameraRef.current;
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      cam.targetZoom = Math.max(0.52, Math.min(1.85, cam.targetZoom * zoomFactor));
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        keysHeld.add(e.code);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysHeld.delete(e.code);
    };

    const clearInputs = () => {
      isDragging = false;
      keysHeld.clear();
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearInputs);

    let rafId = 0;
    let lastTime = performance.now();
    let lastHeadlessDraw = 0;
    let ambientClusterPulse = 0;

    const frame = (now: number) => {
      rafId = requestAnimationFrame(frame);

      // Throttle headless software rendering to ~15 FPS so Playwright screenshots never stall
      if (isHeadless && now - lastHeadlessDraw < 65) {
        return;
      }
      lastHeadlessDraw = now;

      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      const {
        cityGraph: graph,
        gameState: st,
        bottleneck: bn,
        layerMode: mode,
        selectedDarkstoreId: selDsId,
        isPlaying: activePlay,
      } = stateRef.current;

      const simDt = dt * (activePlay ? st.simSpeed : 0.65);
      ambientClusterPulse += dt * 2.4;

      // Keyboard camera panning
      const cam = cameraRef.current;
      const panSpeed = (340 / cam.zoom) * dt;
      if (keysHeld.has('KeyW') || keysHeld.has('ArrowUp')) cam.targetY -= panSpeed;
      if (keysHeld.has('KeyS') || keysHeld.has('ArrowDown')) cam.targetY += panSpeed;
      if (keysHeld.has('KeyA') || keysHeld.has('ArrowLeft')) cam.targetX -= panSpeed;
      if (keysHeld.has('KeyD') || keysHeld.has('ArrowRight')) cam.targetX += panSpeed;
      cam.targetX = Math.max(120, Math.min(1480, cam.targetX));
      cam.targetY = Math.max(100, Math.min(980, cam.targetY));

      // Smooth camera damping
      const damp = 1 - Math.exp(-8 * dt);
      cam.x += (cam.targetX - cam.x) * damp;
      cam.y += (cam.targetY - cam.y) * damp;
      cam.zoom += (cam.targetZoom - cam.zoom) * damp;

      // Sync courier pool and update positions
      syncAgentPool();

      const weatherProf = getWeatherProfile(st.weather);
      const timeProf = getTimeOfDayProfile(st.gameMinutes);
      const trafficNorm = bn.trafficScore / 10;
      const astarRelief = Math.max(0.2, 1 - (st.algorithms['astar_live_traffic'] || 0) * 0.1);

      // Update cluster pendingOrders visually for the Heatmap
      for (const node of graph.nodes) {
        if (node.kind !== 'residential' && node.kind !== 'business') continue;
        const distUnlocked = st.districtsUnlocked[node.districtId];
        if (!distUnlocked) {
          node.pendingOrders = 0;
          continue;
        }
        const growthPressure =
          bn.demandRate > bn.effectiveOrdersPerSec
            ? (bn.demandRate - bn.effectiveOrdersPerSec) * 0.14
            : -0.35;
        const targetPending =
          bn.limitingFactor === 'demand'
            ? 2.2
            : Math.min(node.maxOrders, Math.max(1.5, node.pendingOrders + growthPressure * simDt));
        node.pendingOrders += (targetPending - node.pendingOrders) * Math.min(1, simDt * 1.5);
      }

      // Advance active couriers
      for (const agent of agents) {
        if (agent.waitTimer > 0) {
          agent.waitTimer -= simDt;
          continue;
        }
        if (agent.path.length < 2) {
          assignNewRoute(agent, st, graph);
          continue;
        }

        const fromNode = agent.path[agent.pathIndex];
        const toNode = agent.path[agent.pathIndex + 1];
        if (!fromNode || !toNode) {
          assignNewRoute(agent, st, graph);
          continue;
        }

        const cfg = COURIER_CONFIGS[agent.type];
        const segLen = Math.max(10, Math.hypot(toNode.x - fromNode.x, toNode.y - fromNode.y));

        const weatherSpeed =
          agent.type === 'foot' || agent.type === 'scooter'
            ? weatherProf.footScooterSpeedMult
            : 1.0;
        const trafficSlow = cfg.ignoresTraffic
          ? 1.0
          : Math.max(0.22, 1 - trafficNorm * cfg.trafficSensitivity * astarRelief);

        const speed = cfg.baseSpeed * weatherSpeed * trafficSlow;
        agent.segmentProgress += (speed * simDt) / segLen;

        // Record trail point
        agent.trailHead = (agent.trailHead + 1) % TRAIL_LEN;
        agent.trailX[agent.trailHead] = agent.x;
        agent.trailY[agent.trailHead] = agent.y;

        if (agent.segmentProgress >= 1) {
          agent.segmentProgress = 0;
          agent.pathIndex++;

          if (agent.pathIndex >= agent.path.length - 1) {
            // Reached destination or returned to darkstore
            if (!agent.returningToBase) {
              // Delivered order!
              const dest = agent.path[agent.path.length - 1];
              if (dest) {
                dest.pendingOrders = Math.max(0.5, dest.pendingOrders - 1.8);
                const payout = Math.round(bn.avgOrderCheck * (agent.type === 'van' ? 2.5 : 1));
                spawnPopup(dest.x, dest.y, `+$${formatCompactNumber(payout, 0)}`, '#30D158');
                spawnBurst(dest.x, dest.y, '#30D158', 5);
              }
              // Reverse path back to darkstore
              agent.path = [...agent.path].reverse();
              agent.pathIndex = 0;
              agent.returningToBase = true;
            } else {
              // Back at darkstore: if picking is bottlenecked, pause briefly at darkstore
              agent.batteryPct = 100;
              if (bn.limitingFactor === 'picking') {
                agent.waitTimer = 0.65;
              }
              assignNewRoute(agent, st, graph);
            }
          }
        } else {
          agent.x = fromNode.x + (toNode.x - fromNode.x) * agent.segmentProgress;
          agent.y = fromNode.y + (toNode.y - fromNode.y) * agent.segmentProgress;
        }
      }

      // Advance floating money popups & particles
      for (const p of popups) {
        if (!p.active) continue;
        p.life += dt;
        p.y += p.vy * dt;
        if (p.life >= p.maxLife) p.active = false;
      }

      for (const pt of particles) {
        if (!pt.active) continue;
        pt.life += dt;
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        if (pt.life >= pt.maxLife) pt.active = false;
      }

      // ================== RENDERING ==================
      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Deep Graphite iOS Dark Mode Map Background (#090A0F)
      ctx.fillStyle = '#090A0F';
      ctx.fillRect(0, 0, width, height);

      // Apply camera transform
      ctx.translate(width / 2, height / 2);
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-cam.x, -cam.y);

      // 2. Subtle grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx <= graph.width; gx += 80) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, graph.height);
        ctx.stroke();
      }
      for (let gy = 0; gy <= graph.height; gy += 80) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(graph.width, gy);
        ctx.stroke();
      }

      // 3. River (#0A1929)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(graph.riverPoints[0].x, graph.riverPoints[0].y);
      for (let i = 1; i < graph.riverPoints.length; i++) {
        const prev = graph.riverPoints[i - 1];
        const curr = graph.riverPoints[i];
        const midX = (prev.x + curr.x) / 2;
        const midY = (prev.y + curr.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
      }
      const lastRp = graph.riverPoints[graph.riverPoints.length - 1];
      ctx.lineTo(lastRp.x, lastRp.y);
      ctx.strokeStyle = '#0A1929';
      ctx.lineWidth = 64;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.strokeStyle = 'rgba(10, 132, 255, 0.12)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // 4. Parks (#0D1F18)
      for (const park of graph.parks) {
        ctx.fillStyle = '#0D1F18';
        ctx.strokeStyle = 'rgba(48, 209, 88, 0.12)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(park.x, park.y, park.w, park.h, park.rx);
        ctx.fill();
        ctx.stroke();
      }

      // 5. City Blocks (#12141C) & District Boundaries
      for (const blk of graph.blocks) {
        const isUnlocked = st.districtsUnlocked[blk.districtId];
        ctx.fillStyle = isUnlocked
          ? blk.isBusinessTower
            ? '#161924'
            : '#12141C'
          : 'rgba(14, 16, 22, 0.55)';
        ctx.strokeStyle = isUnlocked
          ? 'rgba(255, 255, 255, 0.04)'
          : 'rgba(255, 255, 255, 0.015)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(blk.x, blk.y, blk.w, blk.h, 8);
        ctx.fill();
        ctx.stroke();
      }

      // 6. Layer: COVERAGE ZONES (Зоны покрытия)
      if (mode === 'coverage') {
        for (const ds of INITIAL_DARKSTORES) {
          const saved = st.darkstores.find((s) => s.id === ds.id);
          if (!saved?.unlocked) continue;
          const radius = ds.coverageRadius * (1 + (saved.pickingUpgradeLevel - 1) * 0.06);

          const grad = ctx.createRadialGradient(ds.x, ds.y, 12, ds.x, ds.y, radius);
          grad.addColorStop(0, 'rgba(10, 132, 255, 0.24)');
          grad.addColorStop(0.7, 'rgba(10, 132, 255, 0.08)');
          grad.addColorStop(1, 'rgba(10, 132, 255, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(ds.x, ds.y, radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = 'rgba(10, 132, 255, 0.45)';
          ctx.setLineDash([6, 6]);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(ds.x, ds.y, radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // 7. Roads (#1E2230) & Highways (#2A3042) + Live Traffic Overlay
      const nodeMap = new Map<string, CityNode>();
      for (const n of graph.nodes) nodeMap.set(n.id, n);

      for (const edge of graph.edges) {
        const a = nodeMap.get(edge.from);
        const b = nodeMap.get(edge.to);
        if (!a || !b) continue;

        const bothUnlocked =
          st.districtsUnlocked[a.districtId] && st.districtsUnlocked[b.districtId];

        const baseWidth =
          edge.roadType === 'highway'
            ? 11
            : edge.roadType === 'bridge'
              ? 12
              : edge.roadType === 'avenue'
                ? 8
                : 5.5;

        // Road casing/surface
        ctx.strokeStyle =
          edge.roadType === 'highway' || edge.roadType === 'bridge' ? '#2A3042' : '#1E2230';
        ctx.lineWidth = baseWidth;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        // Traffic color overlay when in 'traffic' mode and district is active
        if (mode === 'traffic' && bothUnlocked) {
          const localCongestion = Math.min(1, edge.baseTraffic * (bn.trafficScore / 7.5));
          if (localCongestion > 0.25) {
            ctx.strokeStyle =
              localCongestion > 0.72
                ? 'rgba(255, 69, 58, 0.65)' // iOS Red congestion
                : localCongestion > 0.45
                  ? 'rgba(255, 159, 10, 0.55)' // iOS Amber load
                  : 'rgba(48, 209, 88, 0.35)'; // iOS Green free flow
            ctx.lineWidth = Math.max(2, baseWidth * 0.38);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Hyperloop underground pneumatic pipelines between unlocked darkstores if researched
      const hyperloopLvl = st.algorithms['capsule_hyperloop'] || 0;
      if (hyperloopLvl > 0) {
        const activeDs = INITIAL_DARKSTORES.filter((ds) =>
          st.darkstores.some((s) => s.id === ds.id && s.unlocked)
        );
        ctx.save();
        ctx.strokeStyle = 'rgba(100, 210, 255, 0.45)';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 8]);
        for (let i = 1; i < activeDs.length; i++) {
          ctx.beginPath();
          ctx.moveTo(activeDs[i - 1].x, activeDs[i - 1].y);
          ctx.lineTo(activeDs[i].x, activeDs[i].y);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 8. Layer: HEATMAP (Тепловая карта заказов)
      for (const node of graph.nodes) {
        if (node.kind !== 'residential' && node.kind !== 'business') continue;
        const isUnlocked = st.districtsUnlocked[node.districtId];
        if (!isUnlocked) continue;

        const intensity = Math.min(1, node.pendingOrders / node.maxOrders);

        if (mode === 'heatmap') {
          const heatRadius = 55 + intensity * 65;
          const grad = ctx.createRadialGradient(node.x, node.y, 4, node.x, node.y, heatRadius);
          if (intensity > 0.66) {
            grad.addColorStop(0, 'rgba(255, 69, 58, 0.68)');
            grad.addColorStop(0.5, 'rgba(255, 159, 10, 0.32)');
            grad.addColorStop(1, 'rgba(255, 69, 58, 0)');
          } else if (intensity > 0.35) {
            grad.addColorStop(0, 'rgba(255, 159, 10, 0.55)');
            grad.addColorStop(0.55, 'rgba(48, 209, 88, 0.22)');
            grad.addColorStop(1, 'rgba(255, 159, 10, 0)');
          } else {
            grad.addColorStop(0, 'rgba(48, 209, 88, 0.45)');
            grad.addColorStop(1, 'rgba(48, 209, 88, 0)');
          }
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(node.x, node.y, heatRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Cluster node marker
        ctx.fillStyle =
          intensity > 0.7 ? '#FF453A' : node.kind === 'business' ? '#64D2FF' : '#8E8E93';
        ctx.beginPath();
        ctx.arc(node.x, node.y, 5.5, 0, Math.PI * 2);
        ctx.fill();

        if (node.label && cam.zoom >= 0.75) {
          ctx.fillStyle = 'rgba(235, 235, 245, 0.65)';
          ctx.font = '500 10px -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(node.label, node.x, node.y + 17);
        }
      }

      // 9. Locked District Overlays & Labels
      for (const dist of INITIAL_DISTRICTS) {
        const isUnlocked = st.districtsUnlocked[dist.id];
        if (!isUnlocked) {
          const { minX, minY, maxX, maxY } = dist.bounds;
          ctx.fillStyle = 'rgba(9, 10, 15, 0.62)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.setLineDash([8, 8]);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(minX, minY, maxX - minX, maxY - minY, 22);
          ctx.fill();
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.font = '600 15px -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`🔒 ${dist.name}`, dist.centerX, dist.centerY - 6);
          ctx.fillStyle = '#0A84FF';
          ctx.font = '600 12px -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.fillText(
            `Открыть за $${formatCompactNumber(dist.unlockCost)}`,
            dist.centerX,
            dist.centerY + 14
          );
        } else {
          // Subtle district watermark header at top-left of district bounds
          ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.font = '600 11px -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(dist.name.toUpperCase(), dist.bounds.minX + 14, dist.bounds.minY + 22);
        }
      }

      // 10. Active Couriers + Glowing Trails + Drone Pulsing Flight Vectors
      for (const agent of agents) {
        // If drone, draw pulsing straight flight path line from start to target
        if (agent.type === 'drone' && agent.path.length >= 2) {
          const start = agent.path[0];
          const end = agent.path[agent.path.length - 1];
          ctx.save();
          ctx.strokeStyle = 'rgba(191, 90, 242, 0.38)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 5]);
          ctx.lineDashOffset = -ambientClusterPulse * 12;
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
          ctx.restore();
        }

        // Draw glowing motion trail
        ctx.save();
        for (let t = 0; t < TRAIL_LEN - 1; t++) {
          const idx = (agent.trailHead - t + TRAIL_LEN) % TRAIL_LEN;
          const tx = agent.trailX[idx];
          const ty = agent.trailY[idx];
          const alpha = ((TRAIL_LEN - t) / TRAIL_LEN) * 0.28;
          ctx.fillStyle = agent.color;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(tx, ty, Math.max(1.5, 4.5 - t * 0.4), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // Draw courier unit head
        ctx.save();
        ctx.fillStyle = agent.color;
        ctx.beginPath();
        const radius = agent.type === 'van' ? 6.5 : agent.type === 'drone' ? 5.8 : 4.6;
        ctx.arc(agent.x, agent.y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#090A0F';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      // 11. Darkstore Nodes on Map (Interactive)
      for (const ds of INITIAL_DARKSTORES) {
        const distUnlocked = st.districtsUnlocked[ds.districtId];
        if (!distUnlocked) continue;
        const saved = st.darkstores.find((s) => s.id === ds.id);
        const isUnlocked = Boolean(saved?.unlocked);
        const isSelected = selDsId === ds.id;

        const boxSize = isSelected ? 34 : 28;
        ctx.save();

        // Selection ring
        if (isSelected) {
          ctx.strokeStyle = '#0A84FF';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(ds.x, ds.y, 26, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = isUnlocked ? '#1C1C1E' : 'rgba(28, 28, 30, 0.75)';
        ctx.strokeStyle = isUnlocked
          ? bn.limitingFactor === 'picking'
            ? '#FF9F0A'
            : '#0A84FF'
          : 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.roundRect(ds.x - boxSize / 2, ds.y - boxSize / 2, boxSize, boxSize, 9);
        ctx.fill();
        ctx.stroke();

        // Inner warehouse icon symbol
        ctx.fillStyle = isUnlocked ? '#FFFFFF' : '#8E8E93';
        ctx.font = '700 11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isUnlocked ? `L${saved?.pickingUpgradeLevel || 1}` : '+', ds.x, ds.y);

        // Label underneath darkstore
        ctx.fillStyle = isUnlocked ? '#FFFFFF' : 'rgba(235, 235, 245, 0.6)';
        ctx.font = '600 11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(ds.name, ds.x, ds.y + boxSize / 2 + 14);
        ctx.restore();
      }

      // 12. Pooled Particle Bursts
      for (const pt of particles) {
        if (!pt.active) continue;
        const alpha = 1 - pt.life / pt.maxLife;
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 13. Floating +$XX Delivery Micro-Animations
      for (const p of popups) {
        if (!p.active) continue;
        const alpha = 1 - Math.pow(p.life / p.maxLife, 1.6);
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.font = '700 13px -apple-system, BlinkMacSystemFont, monospace';
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(9, 10, 15, 0.85)';
        ctx.lineWidth = 3;
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x, p.y);
        ctx.restore();
      }

      ctx.restore();

      // 14. Subtle Weather & Time-of-Day Screen Atmosphere Tint
      if (st.weather === 'rain' || st.weather === 'storm') {
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.strokeStyle =
          st.weather === 'storm' ? 'rgba(191, 90, 242, 0.14)' : 'rgba(100, 210, 255, 0.12)';
        ctx.lineWidth = 1;
        const rainOffset = (now * 0.4) % 40;
        for (let rx = -20; rx < width; rx += 48) {
          ctx.beginPath();
          ctx.moveTo(rx + rainOffset, (rx * 13) % height);
          ctx.lineTo(rx + rainOffset - 8, ((rx * 13) % height) + 22);
          ctx.stroke();
        }
        ctx.restore();
      } else if (timeProf.periodId === 'night') {
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.fillStyle = 'rgba(5, 8, 20, 0.16)';
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearInputs);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#090A0F]">
      <canvas
        ref={canvasRef}
        data-testid="city-map-canvas"
        className="w-full h-full block cursor-grab active:cursor-grabbing touch-none"
      />
    </div>
  );
};
