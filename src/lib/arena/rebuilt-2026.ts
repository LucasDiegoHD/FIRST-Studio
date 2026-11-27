import type {
  FieldZone,
  ZoneMirror,
  ZonePoint,
  ZoneShape,
} from "../schema/ciprix-project";

export const REBUILT_BASE_LENGTH_M = 16.541;
export const REBUILT_BASE_WIDTH_M = 8.069;

export interface FieldRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface RebuiltLandmarks {
  blueAllianceLineX: number;
  redAllianceLineX: number;
  centerX: number;
  blueHub: FieldRect;
  redHub: FieldRect;
  blueBumps: [FieldRect, FieldRect];
  redBumps: [FieldRect, FieldRect];
  blueTrenches: [FieldRect, FieldRect];
  redTrenches: [FieldRect, FieldRect];
  blueTower: FieldRect;
  redTower: FieldRect;
  blueDepot: FieldRect;
  redDepot: FieldRect;
  blueOutpost: FieldRect;
  redOutpost: FieldRect;
  neutralFuelZone: FieldRect;
}

export interface RebuiltPresetDef {
  id: string;
  title: { pt: string; en: string };
  description: { pt: string; en: string };
  createZone: (fieldL: number, fieldW: number) => Omit<FieldZone, "id">;
}

export interface RobotPose2d {
  x: number;
  y: number;
  thetaRad: number;
}

export interface ZoneEvalResult {
  activeZones: FieldZone[];
  currentZone: FieldZone | null;
  speedFactor: number;
  forceVec: ZonePoint;
  forbiddenAlerts: string[];
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function mirrorRectX(r: FieldRect, fieldL: number): FieldRect {
  return {
    x1: round2(fieldL - r.x2),
    y1: r.y1,
    x2: round2(fieldL - r.x1),
    y2: r.y2,
  };
}

function mirrorRectBoth(r: FieldRect, fieldL: number, fieldW: number): FieldRect {
  return {
    x1: round2(fieldL - r.x2),
    y1: round2(fieldW - r.y2),
    x2: round2(fieldL - r.x1),
    y2: round2(fieldW - r.y1),
  };
}

/**
 * Returns 2026 REBUILT field landmarks in WPILib coordinates (meters, Blue origin bottom-left).
 */
export function getRebuilt2026Landmarks(
  fieldL = REBUILT_BASE_LENGTH_M,
  fieldW = REBUILT_BASE_WIDTH_M,
): RebuiltLandmarks {
  const sx = fieldL / REBUILT_BASE_LENGTH_M;
  const sy = fieldW / REBUILT_BASE_WIDTH_M;
  const midY = fieldW / 2;

  const blueAllianceLineX = round2(4.03 * sx);
  const redAllianceLineX = round2(fieldL - 4.03 * sx);
  const centerX = round2(fieldL / 2);

  const hubHalfW = 0.595 * sy;
  const hubX1 = round2(4.03 * sx);
  const hubX2 = round2(5.22 * sx);
  const blueHub: FieldRect = {
    x1: hubX1,
    y1: round2(midY - hubHalfW),
    x2: hubX2,
    y2: round2(midY + hubHalfW),
  };
  const redHub = mirrorRectX(blueHub, fieldL);

  const bumpX1 = round2(4.06 * sx);
  const bumpX2 = round2(5.19 * sx);
  const bumpSpan = 1.85 * sy;
  const blueBumpTop: FieldRect = {
    x1: bumpX1,
    y1: round2(blueHub.y2),
    x2: bumpX2,
    y2: round2(blueHub.y2 + bumpSpan),
  };
  const blueBumpBot: FieldRect = {
    x1: bumpX1,
    y1: round2(blueHub.y1 - bumpSpan),
    x2: bumpX2,
    y2: round2(blueHub.y1),
  };
  const blueBumps: [FieldRect, FieldRect] = [blueBumpTop, blueBumpBot];
  const redBumps: [FieldRect, FieldRect] = [
    mirrorRectX(blueBumpTop, fieldL),
    mirrorRectX(blueBumpBot, fieldL),
  ];

  const trenchH = 1.58 * sy;
  const blueTrenchTop: FieldRect = {
    x1: hubX1,
    y1: round2(fieldW - trenchH),
    x2: hubX2,
    y2: fieldW,
  };
  const blueTrenchBot: FieldRect = {
    x1: hubX1,
    y1: 0,
    x2: hubX2,
    y2: round2(trenchH),
  };
  const blueTrenches: [FieldRect, FieldRect] = [blueTrenchTop, blueTrenchBot];
  const redTrenches: [FieldRect, FieldRect] = [
    mirrorRectX(blueTrenchTop, fieldL),
    mirrorRectX(blueTrenchBot, fieldL),
  ];

  const towerHalfY = 0.625 * sy;
  const blueTower: FieldRect = {
    x1: 0,
    y1: round2(midY - towerHalfY),
    x2: round2(1.14 * sx),
    y2: round2(midY + towerHalfY),
  };
  const redTower = mirrorRectBoth(blueTower, fieldL, fieldW);

  const blueDepot: FieldRect = {
    x1: 0,
    y1: round2(midY + 1.4 * sy),
    x2: round2(0.69 * sx),
    y2: round2(midY + 2.47 * sy),
  };
  const redDepot = mirrorRectBoth(blueDepot, fieldL, fieldW);

  const blueOutpost: FieldRect = {
    x1: 0,
    y1: round2(0.25 * sy),
    x2: round2(0.55 * sx),
    y2: round2(1.45 * sy),
  };
  const redOutpost = mirrorRectBoth(blueOutpost, fieldL, fieldW);

  const neutralFuelZone: FieldRect = {
    x1: round2(centerX - 0.9 * sx),
    y1: round2(midY - 2.3 * sy),
    x2: round2(centerX + 0.9 * sx),
    y2: round2(midY + 2.3 * sy),
  };

  return {
    blueAllianceLineX,
    redAllianceLineX,
    centerX,
    blueHub,
    redHub,
    blueBumps,
    redBumps,
    blueTrenches,
    redTrenches,
    blueTower,
    redTower,
    blueDepot,
    redDepot,
    blueOutpost,
    redOutpost,
    neutralFuelZone,
  };
}

export const REBUILT_ZONE_PRESETS: RebuiltPresetDef[] = [
  {
    id: "trench-suction",
    title: { pt: "Sucção no Trench", en: "Trench Suction" },
    description: {
      pt: "Alinha e puxa o chassi ao entrar pelo Trench para passar sem bater.",
      en: "Pulls and aligns the chassis through the low-clearance Trench.",
    },
    createZone: (fieldL, fieldW) => {
      const lm = getRebuilt2026Landmarks(fieldL, fieldW);
      const t = lm.blueTrenches[0];
      return {
        name: "TRENCH_SUCTION",
        type: "suction",
        shape: {
          kind: "rectangle",
          x1: round2(Math.max(0, t.x1 - 0.35)),
          y1: t.y1,
          x2: round2(Math.min(fieldL, t.x2 + 0.35)),
          y2: t.y2,
        },
        mirror: "both",
        strength: 0.4,
        colorHex: "#34d399",
      };
    },
  },
  {
    id: "bump-slow",
    title: { pt: "Reduzir no Bump", en: "Bump Speed Limit" },
    description: {
      pt: "Limita velocidade a 45% sobre a rampa do Bump para evitar tombamento.",
      en: "Caps speed to 45% over the Bump ramp to avoid tipping.",
    },
    createZone: (fieldL, fieldW) => {
      const lm = getRebuilt2026Landmarks(fieldL, fieldW);
      const b = lm.blueBumps[0];
      return {
        name: "BUMP_SLOW",
        type: "speedLimit",
        shape: { kind: "rectangle", x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2 },
        mirror: "both",
        speedFactor: 0.45,
        colorHex: "#facc15",
      };
    },
  },
  {
    id: "hub-repulsion",
    title: { pt: "Repulsão do Hub", en: "Hub Repulsion" },
    description: {
      pt: "Escudo ao redor do Hub que afasta o robô contra colisões bruscas.",
      en: "Repulsion halo around the Hub to soften wall impacts.",
    },
    createZone: (fieldL, fieldW) => {
      const lm = getRebuilt2026Landmarks(fieldL, fieldW);
      const h = lm.blueHub;
      return {
        name: "HUB_REPULSION",
        type: "repulsion",
        shape: {
          kind: "circle",
          cx: round2((h.x1 + h.x2) / 2),
          cy: round2((h.y1 + h.y2) / 2),
          radius: 1.15,
        },
        mirror: "x",
        strength: 0.7,
        colorHex: "#fb923c",
      };
    },
  },
  {
    id: "depot-collect",
    title: { pt: "Coleta no Depot", en: "Depot Trigger" },
    description: {
      pt: "Zona gatilho no Depot de FUEL para acionar intake automaticamente.",
      en: "Trigger zone at the FUEL Depot for auto-intake rules.",
    },
    createZone: (fieldL, fieldW) => {
      const lm = getRebuilt2026Landmarks(fieldL, fieldW);
      const d = lm.blueDepot;
      return {
        name: "DEPOT_COLLECT",
        type: "trigger",
        shape: {
          kind: "rectangle",
          x1: d.x1,
          y1: d.y1,
          x2: round2(d.x2 + 0.8),
          y2: d.y2,
        },
        mirror: "both",
        colorHex: "#38bdf8",
      };
    },
  },
  {
    id: "neutral-collect",
    title: { pt: "Zona Neutra (FUEL)", en: "Neutral FUEL Zone" },
    description: {
      pt: "Gatilho na faixa central da arena onde ficam os FUEL compartilhados.",
      en: "Trigger zone covering the center Neutral FUEL field strip.",
    },
    createZone: (fieldL, fieldW) => {
      const lm = getRebuilt2026Landmarks(fieldL, fieldW);
      const n = lm.neutralFuelZone;
      return {
        name: "NEUTRAL_COLLECT",
        type: "trigger",
        shape: { kind: "rectangle", x1: n.x1, y1: n.y1, x2: n.x2, y2: n.y2 },
        mirror: "none",
        colorHex: "#38bdf8",
      };
    },
  },
  {
    id: "opponent-forbidden",
    title: { pt: "Área Adversária Proibida", en: "Opponent Forbidden Zone" },
    description: {
      pt: "Repulsão forte + alerta no Driver Station ao invadir a área protegida rival.",
      en: "Strong repulsion + Driver Station alert inside opponent protected zone.",
    },
    createZone: (fieldL, fieldW) => {
      const lm = getRebuilt2026Landmarks(fieldL, fieldW);
      return {
        name: "OPPONENT_FORBIDDEN",
        type: "forbidden",
        shape: {
          kind: "rectangle",
          x1: lm.redAllianceLineX,
          y1: round2(0.4),
          x2: round2(fieldL - 0.1),
          y2: round2(fieldW - 0.4),
        },
        mirror: "x",
        strength: 0.9,
        alertMessage: "Atenção: robô entrou na zona adversária!",
        colorHex: "#f43f5e",
      };
    },
  },
];

export function mirrorPoint(
  p: ZonePoint,
  mirror: ZoneMirror,
  fieldL: number,
  fieldW: number,
): ZonePoint {
  const flipX = mirror === "x" || mirror === "both";
  const flipY = mirror === "y" || mirror === "both";
  return {
    x: flipX ? round2(fieldL - p.x) : p.x,
    y: flipY ? round2(fieldW - p.y) : p.y,
  };
}

export function mirrorShape(
  shape: ZoneShape,
  mirror: ZoneMirror,
  fieldL: number,
  fieldW: number,
): ZoneShape {
  if (mirror === "none") return shape;
  if (shape.kind === "rectangle") {
    const p1 = mirrorPoint({ x: shape.x1, y: shape.y1 }, mirror, fieldL, fieldW);
    const p2 = mirrorPoint({ x: shape.x2, y: shape.y2 }, mirror, fieldL, fieldW);
    return { kind: "rectangle", x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
  }
  if (shape.kind === "circle") {
    const c = mirrorPoint({ x: shape.cx, y: shape.cy }, mirror, fieldL, fieldW);
    return { kind: "circle", cx: c.x, cy: c.y, radius: shape.radius };
  }
  return {
    kind: "polygon",
    vertices: shape.vertices.map((v) => mirrorPoint(v, mirror, fieldL, fieldW)),
  };
}

export function shapeCenter(shape: ZoneShape): ZonePoint {
  if (shape.kind === "rectangle") {
    return { x: (shape.x1 + shape.x2) / 2, y: (shape.y1 + shape.y2) / 2 };
  }
  if (shape.kind === "circle") {
    return { x: shape.cx, y: shape.cy };
  }
  const n = shape.vertices.length || 1;
  const sum = shape.vertices.reduce(
    (acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y }),
    { x: 0, y: 0 },
  );
  return { x: sum.x / n, y: sum.y / n };
}

export function translateShape(
  shape: ZoneShape,
  dx: number,
  dy: number,
  fieldL: number,
  fieldW: number,
): ZoneShape {
  if (shape.kind === "rectangle") {
    return {
      kind: "rectangle",
      x1: round2(clamp(shape.x1 + dx, 0, fieldL)),
      y1: round2(clamp(shape.y1 + dy, 0, fieldW)),
      x2: round2(clamp(shape.x2 + dx, 0, fieldL)),
      y2: round2(clamp(shape.y2 + dy, 0, fieldW)),
    };
  }
  if (shape.kind === "circle") {
    return {
      kind: "circle",
      cx: round2(clamp(shape.cx + dx, 0, fieldL)),
      cy: round2(clamp(shape.cy + dy, 0, fieldW)),
      radius: shape.radius,
    };
  }
  return {
    kind: "polygon",
    vertices: shape.vertices.map((v) => ({
      x: round2(clamp(v.x + dx, 0, fieldL)),
      y: round2(clamp(v.y + dy, 0, fieldW)),
    })),
  };
}

export function isPointInShape(shape: ZoneShape, point: ZonePoint): boolean {
  if (shape.kind === "rectangle") {
    const minX = Math.min(shape.x1, shape.x2);
    const maxX = Math.max(shape.x1, shape.x2);
    const minY = Math.min(shape.y1, shape.y2);
    const maxY = Math.max(shape.y1, shape.y2);
    return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
  }
  if (shape.kind === "circle") {
    const dx = point.x - shape.cx;
    const dy = point.y - shape.cy;
    return dx * dx + dy * dy <= shape.radius * shape.radius;
  }
  // Even-odd rule matching Ciprix Polygon2d.contains()
  const verts = shape.vertices;
  let inside = false;
  let j = verts.length - 1;
  for (let i = 0; i < verts.length; i += 1) {
    const xi = verts[i].x;
    const yi = verts[i].y;
    const xj = verts[j].x;
    const yj = verts[j].y;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
    j = i;
  }
  return inside;
}

export function getActiveZoneShape(
  zone: FieldZone,
  alliance: "Blue" | "Red",
  fieldL: number,
  fieldW: number,
): ZoneShape {
  return alliance === "Red"
    ? mirrorShape(zone.shape, zone.mirror, fieldL, fieldW)
    : zone.shape;
}

export function isPointInZone(
  zone: FieldZone,
  point: ZonePoint,
  alliance: "Blue" | "Red",
  fieldL: number,
  fieldW: number,
): boolean {
  return isPointInShape(getActiveZoneShape(zone, alliance, fieldL, fieldW), point);
}

export function evaluateRobotInZones(
  zones: FieldZone[],
  pose: ZonePoint,
  alliance: "Blue" | "Red",
  fieldL: number,
  fieldW: number,
): ZoneEvalResult {
  const activeZones: FieldZone[] = [];
  let speedFactor = 1.0;
  let fx = 0;
  let fy = 0;
  const forbiddenAlerts: string[] = [];

  for (const zone of zones) {
    const activeShape = getActiveZoneShape(zone, alliance, fieldL, fieldW);
    if (!isPointInShape(activeShape, pose)) continue;

    activeZones.push(zone);
    if (zone.type === "speedLimit") {
      speedFactor = Math.min(speedFactor, zone.speedFactor ?? 0.5);
    } else if (zone.type === "suction") {
      const center = shapeCenter(activeShape);
      const dx = center.x - pose.x;
      const dy = center.y - pose.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.05) {
        const s = zone.strength ?? 0.4;
        fx += (dx / dist) * s;
        fy += (dy / dist) * s;
      }
    } else if (zone.type === "repulsion" || zone.type === "forbidden") {
      const center = shapeCenter(activeShape);
      const dx = pose.x - center.x;
      const dy = pose.y - center.y;
      const dist = Math.hypot(dx, dy);
      const s = zone.strength ?? (zone.type === "forbidden" ? 0.9 : 0.6);
      if (dist > 1e-4) {
        fx += (dx / dist) * s;
        fy += (dy / dist) * s;
      } else {
        fx += alliance === "Blue" ? -s : s;
      }
      if (zone.type === "forbidden") {
        forbiddenAlerts.push(
          zone.alertMessage?.trim() || `Robot entered forbidden zone ${zone.name}`,
        );
      }
    }
  }

  return {
    activeZones,
    currentZone: activeZones[0] ?? null,
    speedFactor,
    forceVec: { x: fx, y: fy },
    forbiddenAlerts,
  };
}
