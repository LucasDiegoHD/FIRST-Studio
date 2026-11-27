import { clamp, round2 } from "../arena/rebuilt-2026";
import type {
  AutoRoutine,
  CiprixProject,
  PathPlannerPathDoc,
  PathPoint2d,
  PathWaypoint,
} from "../schema/ciprix-project";

export interface RobotSimConfig {
  robotLength: number;
  robotWidth: number;
  wheelBase: number;
  trackWidth: number;
  holonomic: boolean;
  maxVel: number;
  maxAccel: number;
  maxAngVel: number; // rad/s
  maxAngAccel: number; // rad/s^2
}

export interface TrajectoryState {
  timeSec: number;
  x: number;
  y: number;
  rotationRad: number;
  headingRad: number;
  velMps: number;
  curvature: number;
  waypointRelativePos: number;
  moduleAnglesRad: number[];
}

export interface TrajectoryMarkerEvent {
  id: string;
  name: string;
  commandName: string;
  timeSec: number;
  x: number;
  y: number;
}

export interface SimulatedTrajectory {
  states: TrajectoryState[];
  totalTimeSec: number;
  totalDistanceM: number;
  maxVelMps: number;
  markerEvents: TrajectoryMarkerEvent[];
}

export interface AutoPathBreak {
  afterStepIndex: number;
  fromPathName: string;
  toPathName: string;
  from: PathPoint2d;
  to: PathPoint2d;
  gapMeters: number;
}

export interface AutoTimelineSegment {
  stepId: string;
  kind: "path" | "named" | "wait";
  label: string;
  startTimeSec: number;
  endTimeSec: number;
  trajectory?: SimulatedTrajectory;
  pathDoc?: PathPlannerPathDoc;
  commandName?: string;
}

export interface AutoSimulationResult {
  totalTimeSec: number;
  segments: AutoTimelineSegment[];
  breaks: AutoPathBreak[];
  events: TrajectoryMarkerEvent[];
  sampleAt: (timeSec: number) => {
    state: TrajectoryState;
    activeSegmentIndex: number;
    activeCommand: string | null;
  };
}

export function buildRobotSimConfig(
  project: CiprixProject,
  pathDoc?: PathPlannerPathDoc,
): RobotSimConfig {
  const dt = project.drivetrain;
  const wheelBase = dt?.wheelBaseMeters ?? 0.62;
  const trackWidth = dt?.trackWidthMeters ?? 0.62;
  const holonomic = dt ? dt.type !== "differential" : true;
  const useDefault = pathDoc?.useDefaultConstraints !== false || !pathDoc?.globalConstraints;

  const maxVel = useDefault
    ? Math.max(0.5, dt?.maxSpeedMps ?? 4.2)
    : Math.max(0.5, pathDoc.globalConstraints!.maxVelocity);
  const maxAccel = useDefault
    ? Math.max(0.5, dt?.maxLinearAccelMps2 ?? 3.6)
    : Math.max(0.5, pathDoc.globalConstraints!.maxAcceleration);
  const maxAngVel = useDefault
    ? Math.max(0.5, dt?.maxAngularSpeedRadPerSec ?? 9.4)
    : Math.max(0.5, (pathDoc.globalConstraints!.maxAngularVelocity * Math.PI) / 180);
  const maxAngAccel = useDefault
    ? Math.max(0.5, dt?.maxAngularAccelRadPerSec2 ?? 12.5)
    : Math.max(0.5, (pathDoc.globalConstraints!.maxAngularAcceleration * Math.PI) / 180);

  return {
    robotLength: wheelBase + 0.16,
    robotWidth: trackWidth + 0.16,
    wheelBase,
    trackWidth,
    holonomic,
    maxVel,
    maxAccel,
    maxAngVel,
    maxAngAccel,
  };
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function normalizeAngleRad(rad: number): number {
  let a = rad;
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

/** Cosine interpolation between two angles via shortest angular path (PathPlanner style). */
export function cosineInterpolateAngle(aRad: number, bRad: number, t: number): number {
  const u = clamp(t, 0, 1);
  const diff = normalizeAngleRad(bRad - aRad);
  const ratio = 0.5 * (1 - Math.cos(u * Math.PI));
  return normalizeAngleRad(aRad + diff * ratio);
}

/** Evaluates cubic Bézier point P(t). */
export function evalCubicBezier(
  p0: PathPoint2d,
  p1: PathPoint2d,
  p2: PathPoint2d,
  p3: PathPoint2d,
  t: number,
): PathPoint2d {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  };
}

/** Evaluates first derivative P'(t) of a cubic Bézier curve. */
export function evalCubicBezierDeriv(
  p0: PathPoint2d,
  p1: PathPoint2d,
  p2: PathPoint2d,
  p3: PathPoint2d,
  t: number,
): PathPoint2d {
  const u = 1 - t;
  return {
    x: 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x),
    y: 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y),
  };
}

/** Evaluates second derivative P''(t) of a cubic Bézier curve. */
export function evalCubicBezierSecondDeriv(
  p0: PathPoint2d,
  p1: PathPoint2d,
  p2: PathPoint2d,
  p3: PathPoint2d,
  t: number,
): PathPoint2d {
  const u = 1 - t;
  return {
    x: 6 * u * (p2.x - 2 * p1.x + p0.x) + 6 * t * (p3.x - 2 * p2.x + p1.x),
    y: 6 * u * (p2.y - 2 * p1.y + p0.y) + 6 * t * (p3.y - 2 * p2.y + p1.y),
  };
}

function getSegmentControlPoints(w0: PathWaypoint, w1: PathWaypoint) {
  const p0 = w0.anchor;
  const p3 = w1.anchor;
  const p1 = w0.nextControl ?? {
    x: p0.x + (p3.x - p0.x) / 3,
    y: p0.y + (p3.y - p0.y) / 3,
  };
  const p2 = w1.prevControl ?? {
    x: p3.x - (p3.x - p0.x) / 3,
    y: p3.y - (p3.y - p0.y) / 3,
  };
  return { p0, p1, p2, p3 };
}

/** Samples position and tangent heading at waypointRelativePos ∈ [0, waypoints.length - 1]. */
export function samplePathAtRelativePos(
  waypoints: PathWaypoint[],
  waypointRelativePos: number,
): { x: number; y: number; headingRad: number } {
  if (waypoints.length === 0) return { x: 0, y: 0, headingRad: 0 };
  if (waypoints.length === 1) return { x: waypoints[0].anchor.x, y: waypoints[0].anchor.y, headingRad: 0 };

  const maxPos = waypoints.length - 1;
  const clamped = clamp(waypointRelativePos, 0, maxPos);
  const segIdx = Math.min(maxPos - 1, Math.floor(clamped));
  const localT = clamped - segIdx;
  const { p0, p1, p2, p3 } = getSegmentControlPoints(waypoints[segIdx], waypoints[segIdx + 1]);
  const pt = evalCubicBezier(p0, p1, p2, p3, localT);
  const d = evalCubicBezierDeriv(p0, p1, p2, p3, localT);
  const headingRad =
    Math.hypot(d.x, d.y) > 1e-4 ? Math.atan2(d.y, d.x) : Math.atan2(p3.y - p0.y, p3.x - p0.x);

  return { x: pt.x, y: pt.y, headingRad };
}

/** Finds closest waypointRelativePos along the spline for a field coordinate. */
export function findClosestRelativePos(
  waypoints: PathWaypoint[],
  target: PathPoint2d,
): number {
  if (waypoints.length < 2) return 0;
  let bestPos = 0;
  let bestDistSq = Infinity;
  const segCount = waypoints.length - 1;
  const stepsPerSeg = 32;

  for (let s = 0; s < segCount; s += 1) {
    const { p0, p1, p2, p3 } = getSegmentControlPoints(waypoints[s], waypoints[s + 1]);
    for (let i = 0; i <= stepsPerSeg; i += 1) {
      const t = i / stepsPerSeg;
      const pt = evalCubicBezier(p0, p1, p2, p3, t);
      const dx = pt.x - target.x;
      const dy = pt.y - target.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestPos = s + t;
      }
    }
  }
  return round2(bestPos);
}

function clampFieldPt(pt: PathPoint2d, fieldL: number, fieldW: number): PathPoint2d {
  return {
    x: round2(clamp(pt.x, 0.25, fieldL - 0.25)),
    y: round2(clamp(pt.y, 0.25, fieldW - 0.25)),
  };
}

/** Moves waypoint anchor and translates its control handles rigidly. */
export function moveWaypointAnchor(
  waypoints: PathWaypoint[],
  index: number,
  nextAnchor: PathPoint2d,
  fieldL: number,
  fieldW: number,
): PathWaypoint[] {
  const clamped = clampFieldPt(nextAnchor, fieldL, fieldW);
  const prev = waypoints[index];
  if (!prev) return waypoints;
  const dx = clamped.x - prev.anchor.x;
  const dy = clamped.y - prev.anchor.y;

  return waypoints.map((wp, idx) => {
    if (idx !== index) return wp;
    return {
      ...wp,
      anchor: clamped,
      prevControl: wp.prevControl
        ? { x: round2(wp.prevControl.x + dx), y: round2(wp.prevControl.y + dy) }
        : null,
      nextControl: wp.nextControl
        ? { x: round2(wp.nextControl.x + dx), y: round2(wp.nextControl.y + dy) }
        : null,
    };
  });
}

/** Moves a Bézier handle and maintains C1 collinearity on the opposite handle unless broken. */
export function moveWaypointControl(
  waypoints: PathWaypoint[],
  index: number,
  side: "prev" | "next",
  nextControl: PathPoint2d,
  fieldL: number,
  fieldW: number,
  breakTangent = false,
): PathWaypoint[] {
  const wp = waypoints[index];
  if (!wp) return waypoints;
  const clampedCtrl: PathPoint2d = {
    x: round2(clamp(nextControl.x, 0.05, fieldL - 0.05)),
    y: round2(clamp(nextControl.y, 0.05, fieldW - 0.05)),
  };

  const dx = clampedCtrl.x - wp.anchor.x;
  const dy = clampedCtrl.y - wp.anchor.y;
  const norm = Math.hypot(dx, dy);

  return waypoints.map((item, idx) => {
    if (idx !== index) return item;
    if (side === "prev") {
      let mirrorNext = item.nextControl;
      if (!breakTangent && item.nextControl && norm > 1e-4) {
        const oppLen = Math.max(
          0.35,
          Math.hypot(item.nextControl.x - item.anchor.x, item.nextControl.y - item.anchor.y),
        );
        mirrorNext = {
          x: round2(item.anchor.x - (dx / norm) * oppLen),
          y: round2(item.anchor.y - (dy / norm) * oppLen),
        };
      }
      return { ...item, prevControl: clampedCtrl, nextControl: mirrorNext };
    }

    let mirrorPrev = item.prevControl;
    if (!breakTangent && item.prevControl && norm > 1e-4) {
      const oppLen = Math.max(
        0.35,
        Math.hypot(item.prevControl.x - item.anchor.x, item.prevControl.y - item.anchor.y),
      );
      mirrorPrev = {
        x: round2(item.anchor.x - (dx / norm) * oppLen),
        y: round2(item.anchor.y - (dy / norm) * oppLen),
      };
    }
    return { ...item, nextControl: clampedCtrl, prevControl: mirrorPrev };
  });
}

/** Appends a new waypoint to the end of the path with smooth ~1/3 chord Bézier handles. */
export function appendWaypoint(
  waypoints: PathWaypoint[],
  anchor: PathPoint2d,
  fieldL: number,
  fieldW: number,
): PathWaypoint[] {
  const clamped = clampFieldPt(anchor, fieldL, fieldW);
  if (waypoints.length === 0) {
    return [{ anchor: clamped, prevControl: null, nextControl: null, isLocked: false, linkedName: null }];
  }

  const lastIdx = waypoints.length - 1;
  const last = waypoints[lastIdx];
  const dx = clamped.x - last.anchor.x;
  const dy = clamped.y - last.anchor.y;
  const dist = Math.max(0.4, Math.hypot(dx, dy));
  const ux = dx / dist;
  const uy = dy / dist;
  const handleLen = round2(clamp(dist * 0.34, 0.35, 1.4));

  const updated = waypoints.map((wp, idx) => {
    if (idx !== lastIdx) return wp;
    // Keep collinearity with existing prevControl if present
    let nextCtrl: PathPoint2d;
    if (wp.prevControl) {
      const pdx = wp.anchor.x - wp.prevControl.x;
      const pdy = wp.anchor.y - wp.prevControl.y;
      const pnorm = Math.hypot(pdx, pdy);
      if (pnorm > 1e-4) {
        nextCtrl = {
          x: round2(wp.anchor.x + (pdx / pnorm) * handleLen),
          y: round2(wp.anchor.y + (pdy / pnorm) * handleLen),
        };
      } else {
        nextCtrl = {
          x: round2(wp.anchor.x + ux * handleLen),
          y: round2(wp.anchor.y + uy * handleLen),
        };
      }
    } else {
      nextCtrl = {
        x: round2(wp.anchor.x + ux * handleLen),
        y: round2(wp.anchor.y + uy * handleLen),
      };
    }
    return { ...wp, nextControl: nextCtrl };
  });

  updated.push({
    anchor: clamped,
    prevControl: {
      x: round2(clamped.x - ux * handleLen),
      y: round2(clamped.y - uy * handleLen),
    },
    nextControl: null,
    isLocked: false,
    linkedName: null,
  });

  return updated;
}

/** Removes a waypoint while preserving >= 2 waypoints and null outer handles. */
export function removeWaypoint(waypoints: PathWaypoint[], index: number): PathWaypoint[] {
  if (waypoints.length <= 2) return waypoints;
  const filtered = waypoints.filter((_, idx) => idx !== index);
  return filtered.map((wp, idx) => ({
    ...wp,
    prevControl: idx === 0 ? null : wp.prevControl ?? { x: wp.anchor.x - 0.5, y: wp.anchor.y },
    nextControl:
      idx === filtered.length - 1 ? null : wp.nextControl ?? { x: wp.anchor.x + 0.5, y: wp.anchor.y },
  }));
}

/** Reverses a PathPlannerPathDoc in place cleanly. */
export function reversePathDoc(pathDoc: PathPlannerPathDoc): PathPlannerPathDoc {
  const maxPos = Math.max(1, pathDoc.waypoints.length - 1);
  const reversedWaypoints: PathWaypoint[] = [...pathDoc.waypoints]
    .reverse()
    .map((wp, idx, arr) => ({
      ...wp,
      prevControl: idx === 0 ? null : wp.nextControl,
      nextControl: idx === arr.length - 1 ? null : wp.prevControl,
    }));

  return {
    ...pathDoc,
    waypoints: reversedWaypoints,
    rotationTargets: pathDoc.rotationTargets
      .map((rt) => ({
        ...rt,
        waypointRelativePos: round2(clamp(maxPos - rt.waypointRelativePos, 0, maxPos)),
      }))
      .sort((a, b) => a.waypointRelativePos - b.waypointRelativePos),
    eventMarkers: pathDoc.eventMarkers
      .map((em) => ({
        ...em,
        waypointRelativePos: round2(clamp(maxPos - em.waypointRelativePos, 0, maxPos)),
      }))
      .sort((a, b) => a.waypointRelativePos - b.waypointRelativePos),
    idealStartingState: pathDoc.goalEndState
      ? { ...pathDoc.goalEndState }
      : { velocity: 0, rotation: 0 },
    goalEndState: pathDoc.idealStartingState
      ? { ...pathDoc.idealStartingState }
      : { velocity: 0, rotation: 0 },
  };
}

export function createDefaultPathDoc(
  name: string,
  fieldL: number,
  fieldW: number,
): Omit<PathPlannerPathDoc, "id"> {
  const startY = round2(fieldW * 0.52);
  const endY = round2(fieldW * 0.65);
  return {
    name,
    waypoints: [
      {
        anchor: { x: 1.9, y: startY },
        prevControl: null,
        nextControl: { x: 2.9, y: startY },
        isLocked: false,
        linkedName: null,
      },
      {
        anchor: { x: round2(Math.min(5.2, fieldL * 0.34)), y: endY },
        prevControl: { x: round2(Math.min(4.2, fieldL * 0.27)), y: endY },
        nextControl: null,
        isLocked: false,
        linkedName: null,
      },
    ],
    rotationTargets: [],
    eventMarkers: [],
    idealStartingState: { velocity: 0, rotation: 0 },
    goalEndState: { velocity: 0, rotation: 0 },
    reversed: false,
    useDefaultConstraints: true,
    globalConstraints: {
      maxVelocity: 3.5,
      maxAcceleration: 3.0,
      maxAngularVelocity: 540,
      maxAngularAcceleration: 720,
    },
  };
}

/** Generates velocity-profiled trajectory + holonomic rotations + 4 swerve module wheel angles. */
export function generatePathTrajectory(
  pathDoc: PathPlannerPathDoc,
  config: RobotSimConfig,
): SimulatedTrajectory {
  const waypoints = pathDoc.waypoints;
  if (waypoints.length < 2) {
    return {
      states: [],
      totalTimeSec: 0,
      totalDistanceM: 0,
      maxVelMps: config.maxVel,
      markerEvents: [],
    };
  }

  const samplesPerSeg = 28;
  const segCount = waypoints.length - 1;
  const rawPts: {
    x: number;
    y: number;
    headingRad: number;
    curvature: number;
    waypointRelativePos: number;
    distAlong: number;
  }[] = [];

  let cumulativeDist = 0;
  for (let s = 0; s < segCount; s += 1) {
    const { p0, p1, p2, p3 } = getSegmentControlPoints(waypoints[s], waypoints[s + 1]);
    const startI = s === 0 ? 0 : 1;
    for (let i = startI; i <= samplesPerSeg; i += 1) {
      const t = i / samplesPerSeg;
      const pt = evalCubicBezier(p0, p1, p2, p3, t);
      const d1 = evalCubicBezierDeriv(p0, p1, p2, p3, t);
      const d2 = evalCubicBezierSecondDeriv(p0, p1, p2, p3, t);
      const speedSq = d1.x * d1.x + d1.y * d1.y;
      const denom = Math.pow(Math.max(1e-6, speedSq), 1.5);
      const curvature = Math.abs(d1.x * d2.y - d1.y * d2.x) / denom;
      const headingRad =
        Math.hypot(d1.x, d1.y) > 1e-4 ? Math.atan2(d1.y, d1.x) : Math.atan2(p3.y - p0.y, p3.x - p0.x);

      if (rawPts.length > 0) {
        const prev = rawPts[rawPts.length - 1];
        cumulativeDist += Math.hypot(pt.x - prev.x, pt.y - prev.y);
      }

      rawPts.push({
        x: pt.x,
        y: pt.y,
        headingRad,
        curvature,
        waypointRelativePos: s + t,
        distAlong: cumulativeDist,
      });
    }
  }

  const n = rawPts.length;
  const vels = new Array<number>(n).fill(config.maxVel);
  const latAccelCap = Math.max(1.2, config.maxAccel * 1.15);

  for (let i = 0; i < n; i += 1) {
    const curvCap = Math.sqrt(latAccelCap / Math.max(Math.abs(rawPts[i].curvature), 1e-3));
    vels[i] = Math.min(config.maxVel, curvCap);
  }

  const startVel = clamp(pathDoc.idealStartingState?.velocity ?? 0, 0, config.maxVel);
  const endVel = clamp(pathDoc.goalEndState?.velocity ?? 0, 0, config.maxVel);
  vels[0] = startVel;
  vels[n - 1] = endVel;

  // Forward acceleration pass
  for (let i = 1; i < n; i += 1) {
    const ds = Math.max(0, rawPts[i].distAlong - rawPts[i - 1].distAlong);
    const maxReach = Math.sqrt(Math.max(0, vels[i - 1] * vels[i - 1] + 2 * config.maxAccel * ds));
    vels[i] = Math.min(vels[i], maxReach);
  }

  // Backward deceleration pass
  for (let i = n - 2; i >= 0; i -= 1) {
    const ds = Math.max(0, rawPts[i + 1].distAlong - rawPts[i].distAlong);
    const maxReach = Math.sqrt(Math.max(0, vels[i + 1] * vels[i + 1] + 2 * config.maxAccel * ds));
    vels[i] = Math.min(vels[i], maxReach);
  }

  // Holonomic rotation interpolation through sorted rotationTargets
  const startRotRad = degToRad(pathDoc.idealStartingState?.rotation ?? 0);
  const endRotRad = degToRad(pathDoc.goalEndState?.rotation ?? 0);
  const rotStops: { dist: number; rotRad: number }[] = [
    { dist: 0, rotRad: startRotRad },
    ...[...pathDoc.rotationTargets]
      .sort((a, b) => a.waypointRelativePos - b.waypointRelativePos)
      .map((rt) => {
        const clampedRel = clamp(rt.waypointRelativePos, 0, segCount);
        const idx = clamp(Math.round((clampedRel / segCount) * (n - 1)), 0, n - 1);
        return { dist: rawPts[idx].distAlong, rotRad: degToRad(rt.rotationDegrees) };
      }),
    { dist: cumulativeDist, rotRad: endRotRad },
  ];

  // Time integration
  const times = new Array<number>(n).fill(0);
  for (let i = 1; i < n; i += 1) {
    const ds = Math.max(1e-5, rawPts[i].distAlong - rawPts[i - 1].distAlong);
    const avgV = Math.max(0.18, 0.5 * (vels[i - 1] + vels[i]));
    times[i] = times[i - 1] + ds / avgV;
  }

  const halfL = config.wheelBase / 2;
  const halfW = config.trackWidth / 2;
  const moduleOffsets: PathPoint2d[] = [
    { x: halfL, y: halfW },
    { x: halfL, y: -halfW },
    { x: -halfL, y: halfW },
    { x: -halfL, y: -halfW },
  ];

  const rotations = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i += 1) {
    if (!config.holonomic) {
      rotations[i] = pathDoc.reversed
        ? normalizeAngleRad(rawPts[i].headingRad + Math.PI)
        : rawPts[i].headingRad;
    } else {
      const d = rawPts[i].distAlong;
      let seg = 0;
      while (seg < rotStops.length - 2 && d > rotStops[seg + 1].dist) {
        seg += 1;
      }
      const a = rotStops[seg];
      const b = rotStops[seg + 1];
      const span = Math.max(1e-5, b.dist - a.dist);
      rotations[i] = cosineInterpolateAngle(a.rotRad, b.rotRad, (d - a.dist) / span);
    }
  }

  const states: TrajectoryState[] = rawPts.map((pt, i) => {
    const dt =
      i < n - 1
        ? Math.max(1e-3, times[i + 1] - times[i])
        : i > 0
          ? Math.max(1e-3, times[i] - times[i - 1])
          : 0.02;
    const dRot =
      i < n - 1
        ? normalizeAngleRad(rotations[i + 1] - rotations[i])
        : i > 0
          ? normalizeAngleRad(rotations[i] - rotations[i - 1])
          : 0;
    const omega = clamp(dRot / dt, -config.maxAngVel, config.maxAngVel);
    const vxField = vels[i] * Math.cos(pt.headingRad);
    const vyField = vels[i] * Math.sin(pt.headingRad);

    const moduleAnglesRad = config.holonomic
      ? moduleOffsets.map((m) => {
          const rx = m.x * Math.cos(rotations[i]) - m.y * Math.sin(rotations[i]);
          const ry = m.x * Math.sin(rotations[i]) + m.y * Math.cos(rotations[i]);
          const mvx = vxField - omega * ry;
          const mvy = vyField + omega * rx;
          return Math.hypot(mvx, mvy) > 0.05 ? Math.atan2(mvy, mvx) : rotations[i];
        })
      : [];

    return {
      timeSec: times[i],
      x: pt.x,
      y: pt.y,
      rotationRad: rotations[i],
      headingRad: pt.headingRad,
      velMps: vels[i],
      curvature: pt.curvature,
      waypointRelativePos: pt.waypointRelativePos,
      moduleAnglesRad,
    };
  });

  const markerEvents: TrajectoryMarkerEvent[] = pathDoc.eventMarkers.map((em) => {
    const rel = clamp(em.waypointRelativePos, 0, segCount);
    const idx = clamp(Math.round((rel / segCount) * (n - 1)), 0, n - 1);
    const st = states[idx];
    return {
      id: em.id,
      name: em.name,
      commandName: em.commandName,
      timeSec: st.timeSec,
      x: st.x,
      y: st.y,
    };
  });

  return {
    states,
    totalTimeSec: states[states.length - 1]?.timeSec ?? 0,
    totalDistanceM: cumulativeDist,
    maxVelMps: config.maxVel,
    markerEvents,
  };
}

/** Linearly samples a simulated trajectory at time t. */
export function sampleTrajectoryAtTime(
  traj: SimulatedTrajectory,
  timeSec: number,
): TrajectoryState {
  const { states } = traj;
  if (states.length === 0) {
    return {
      timeSec: 0,
      x: 2,
      y: 4,
      rotationRad: 0,
      headingRad: 0,
      velMps: 0,
      curvature: 0,
      waypointRelativePos: 0,
      moduleAnglesRad: [],
    };
  }
  if (timeSec <= states[0].timeSec) return states[0];
  const last = states[states.length - 1];
  if (timeSec >= last.timeSec) return last;

  let lo = 0;
  let hi = states.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (states[mid].timeSec <= timeSec) lo = mid;
    else hi = mid;
  }

  const a = states[lo];
  const b = states[hi];
  const span = Math.max(1e-5, b.timeSec - a.timeSec);
  const ratio = clamp((timeSec - a.timeSec) / span, 0, 1);

  return {
    timeSec,
    x: a.x + (b.x - a.x) * ratio,
    y: a.y + (b.y - a.y) * ratio,
    rotationRad: normalizeAngleRad(a.rotationRad + normalizeAngleRad(b.rotationRad - a.rotationRad) * ratio),
    headingRad: normalizeAngleRad(a.headingRad + normalizeAngleRad(b.headingRad - a.headingRad) * ratio),
    velMps: a.velMps + (b.velMps - a.velMps) * ratio,
    curvature: a.curvature + (b.curvature - a.curvature) * ratio,
    waypointRelativePos:
      a.waypointRelativePos + (b.waypointRelativePos - a.waypointRelativePos) * ratio,
    moduleAnglesRad: a.moduleAnglesRad.map((ang, mIdx) => {
      const nextAng = b.moduleAnglesRad[mIdx] ?? ang;
      return normalizeAngleRad(ang + normalizeAngleRad(nextAng - ang) * ratio);
    }),
  };
}

/** PathPlanner heatmap scale: red (0.0) -> orange (0.33) -> yellow (0.67) -> green (1.0). */
export function velocityToHeatColor(normalizedVel: number): string {
  const v = clamp(normalizedVel, 0, 1);
  let r = 0;
  let g = 0;
  let b = 0;
  if (v <= 0.33) {
    const t = v / 0.33;
    r = 239;
    g = Math.round(68 + (152 - 68) * t);
    b = Math.round(68 - 68 * t);
  } else if (v <= 0.67) {
    const t = (v - 0.33) / 0.34;
    r = Math.round(249 + (234 - 249) * t);
    g = Math.round(152 + (179 - 152) * t);
    b = Math.round(8 * t);
  } else {
    const t = (v - 0.67) / 0.33;
    r = Math.round(234 + (34 - 234) * t);
    g = Math.round(179 + (197 - 179) * t);
    b = Math.round(8 + (94 - 8) * t);
  }
  return `rgb(${r}, ${g}, ${b})`;
}

/** Simulates a full multi-path autonomous routine matching PathPlanner AutoSimulator + break warnings. */
export function simulateAutoRoutine(
  routine: AutoRoutine | null,
  paths: PathPlannerPathDoc[],
  project: CiprixProject,
  fieldL: number,
  fieldW: number,
): AutoSimulationResult {
  const defaultPose: TrajectoryState = {
    timeSec: 0,
    x: round2(Math.min(2.0, fieldL * 0.14)),
    y: round2(fieldW * 0.5),
    rotationRad: 0,
    headingRad: 0,
    velMps: 0,
    curvature: 0,
    waypointRelativePos: 0,
    moduleAnglesRad: project.drivetrain?.type === "differential" ? [] : [0, 0, 0, 0],
  };

  if (!routine || !routine.steps || routine.steps.length === 0) {
    return {
      totalTimeSec: 0,
      segments: [],
      breaks: [],
      events: [],
      sampleAt: () => ({ state: defaultPose, activeSegmentIndex: -1, activeCommand: null }),
    };
  }

  const byName = new Map(paths.map((p) => [p.name.trim().toLowerCase(), p]));
  const segments: AutoTimelineSegment[] = [];
  const breaks: AutoPathBreak[] = [];
  const events: TrajectoryMarkerEvent[] = [];

  let elapsed = 0;
  let lastEndpoint: PathPoint2d | null = null;
  let lastPathName = "";
  let currentHoldState: TrajectoryState = { ...defaultPose };

  routine.steps.forEach((step, idx) => {
    if (step.kind === "path") {
      const matched = byName.get(step.pathName.trim().toLowerCase());
      const doc: PathPlannerPathDoc = matched ?? {
        id: `fallback-${step.id}`,
        name: step.pathName,
        waypoints: [
          {
            anchor: {
              x: step.startX ?? currentHoldState.x,
              y: step.startY ?? currentHoldState.y,
            },
            prevControl: null,
            nextControl: null,
          },
          {
            anchor: {
              x: step.endX ?? clamp((step.startX ?? currentHoldState.x) + 1.8, 0.5, fieldL - 0.5),
              y: step.endY ?? currentHoldState.y,
            },
            prevControl: null,
            nextControl: null,
          },
        ],
        rotationTargets: [],
        eventMarkers: [],
      };

      const cfg = buildRobotSimConfig(project, doc);
      const traj = generatePathTrajectory(doc, cfg);
      const duration = Math.max(0.25, traj.totalTimeSec || step.durationSec);
      const firstPt = doc.waypoints[0].anchor;
      const endPt = doc.waypoints[doc.waypoints.length - 1].anchor;

      if (lastEndpoint) {
        const gap = Math.hypot(firstPt.x - lastEndpoint.x, firstPt.y - lastEndpoint.y);
        if (gap >= 0.25) {
          breaks.push({
            afterStepIndex: idx - 1,
            fromPathName: lastPathName,
            toPathName: doc.name,
            from: lastEndpoint,
            to: firstPt,
            gapMeters: round2(gap),
          });
        }
      }

      for (const ev of traj.markerEvents) {
        events.push({ ...ev, timeSec: round2(elapsed + ev.timeSec) });
      }

      segments.push({
        stepId: step.id,
        kind: "path",
        label: doc.name,
        startTimeSec: elapsed,
        endTimeSec: elapsed + duration,
        trajectory: traj,
        pathDoc: doc,
      });

      elapsed += duration;
      lastEndpoint = endPt;
      lastPathName = doc.name;
      if (traj.states.length > 0) {
        currentHoldState = { ...traj.states[traj.states.length - 1], velMps: 0 };
      }
      return;
    }

    const duration = step.kind === "named" ? step.durationSec : step.seconds;
    if (step.kind === "named") {
      events.push({
        id: step.id,
        name: step.commandName,
        commandName: step.commandName,
        timeSec: round2(elapsed),
        x: currentHoldState.x,
        y: currentHoldState.y,
      });
    }
    segments.push({
      stepId: step.id,
      kind: step.kind,
      label: step.kind === "named" ? step.commandName : `Espera ${step.seconds.toFixed(1)}s`,
      startTimeSec: elapsed,
      endTimeSec: elapsed + duration,
      commandName: step.kind === "named" ? step.commandName : undefined,
    });
    elapsed += duration;
  });

  const sampleAt = (timeSec: number) => {
    const t = clamp(timeSec, 0, Math.max(0, elapsed));
    let held: TrajectoryState = { ...defaultPose };

    for (let i = 0; i < segments.length; i += 1) {
      const seg = segments[i];
      if (t <= seg.endTimeSec || i === segments.length - 1) {
        if (seg.kind === "path" && seg.trajectory) {
          const localT = t - seg.startTimeSec;
          const st = sampleTrajectoryAtTime(seg.trajectory, localT);
          const nearEv = seg.trajectory.markerEvents.find((ev) => Math.abs(ev.timeSec - localT) <= 0.35);
          return {
            state: { ...st, timeSec: t },
            activeSegmentIndex: i,
            activeCommand: nearEv?.commandName ?? null,
          };
        }
        return {
          state: { ...held, timeSec: t, velMps: 0 },
          activeSegmentIndex: i,
          activeCommand: seg.commandName ?? null,
        };
      }
      if (seg.kind === "path" && seg.trajectory && seg.trajectory.states.length > 0) {
        const lastSt = seg.trajectory.states[seg.trajectory.states.length - 1];
        held = { ...lastSt, velMps: 0 };
      }
    }

    return { state: held, activeSegmentIndex: -1, activeCommand: null };
  };

  return {
    totalTimeSec: round2(elapsed),
    segments,
    breaks,
    events,
    sampleAt,
  };
}
