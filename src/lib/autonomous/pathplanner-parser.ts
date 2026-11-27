import type {
  AutoStep,
  PathEventMarker,
  PathPlannerPathDoc,
  PathRotationTarget,
  PathWaypoint,
} from "../schema/ciprix-project";

/**
 * Parsers for PathPlanner 2026 `.auto` / `.path` JSON files to discover
 * referenced path names and `NamedCommands` without needing filesystem access.
 */

export function stripAutoExtension(fileName: string): string {
  return fileName.trim().replace(/\.(auto|path|traj)$/i, "");
}

function collectUnique(target: string[], seen: Set<string>, value: unknown) {
  if (typeof value !== "string") return;
  const trimmed = value.trim();
  if (!trimmed || seen.has(trimmed)) return;
  seen.add(trimmed);
  target.push(trimmed);
}

function walkCommandNode(
  node: unknown,
  namedCommands: string[],
  seenCmds: Set<string>,
  pathNames: string[],
  seenPaths: Set<string>,
  steps?: AutoStep[],
) {
  if (!node || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  const type = obj.type;
  const data = obj.data && typeof obj.data === "object" ? (obj.data as Record<string, unknown>) : null;

  if (type === "named" && data) {
    collectUnique(namedCommands, seenCmds, data.name);
    if (steps && typeof data.name === "string" && data.name.trim()) {
      steps.push({
        id: `st-${steps.length + 1}-${Math.random().toString(36).slice(2, 6)}`,
        kind: "named",
        commandName: data.name.trim(),
        durationSec: 1.0,
      });
    }
  } else if (type === "path" && data) {
    collectUnique(pathNames, seenPaths, data.pathName);
    if (steps && typeof data.pathName === "string" && data.pathName.trim()) {
      steps.push({
        id: `st-${steps.length + 1}-${Math.random().toString(36).slice(2, 6)}`,
        kind: "path",
        pathName: data.pathName.trim(),
        durationSec: 2.5,
      });
    }
  } else if (type === "wait" && data && steps) {
    const wt = typeof data.waitTime === "number" && data.waitTime > 0 ? data.waitTime : 0.5;
    steps.push({
      id: `st-${steps.length + 1}-${Math.random().toString(36).slice(2, 6)}`,
      kind: "wait",
      seconds: wt,
    });
  }

  if (data) {
    if (data.command) {
      walkCommandNode(data.command, namedCommands, seenCmds, pathNames, seenPaths, steps);
    }
    if (Array.isArray(data.commands)) {
      for (const child of data.commands) {
        walkCommandNode(child, namedCommands, seenCmds, pathNames, seenPaths, steps);
      }
    }
  }
}

export function parsePathPlannerAutoJson(rawText: string): {
  namedCommands: string[];
  pathNames: string[];
} {
  const full = parseFullPathPlannerAutoJson(rawText);
  return { namedCommands: full.namedCommands, pathNames: full.pathNames };
}

export function parseFullPathPlannerAutoJson(rawText: string): {
  namedCommands: string[];
  pathNames: string[];
  steps: AutoStep[];
} {
  const namedCommands: string[] = [];
  const pathNames: string[] = [];
  const steps: AutoStep[] = [];
  const seenCmds = new Set<string>();
  const seenPaths = new Set<string>();

  try {
    const parsed = JSON.parse(rawText) as Record<string, unknown>;
    if (parsed && typeof parsed === "object" && parsed.command) {
      walkCommandNode(parsed.command, namedCommands, seenCmds, pathNames, seenPaths, steps);
    }
  } catch {
    return { namedCommands: [], pathNames: [], steps: [] };
  }

  return { namedCommands, pathNames, steps };
}

export function parsePathPlannerPathJson(rawText: string): {
  namedCommands: string[];
} {
  const namedCommands: string[] = [];
  const seenCmds = new Set<string>();
  const pathNames: string[] = [];
  const seenPaths = new Set<string>();

  try {
    const parsed = JSON.parse(rawText) as Record<string, unknown>;
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.eventMarkers)) {
      for (const marker of parsed.eventMarkers) {
        if (marker && typeof marker === "object") {
          const m = marker as Record<string, unknown>;
          if (m.command) {
            walkCommandNode(m.command, namedCommands, seenCmds, pathNames, seenPaths);
          }
        }
      }
    }
  } catch {
    return { namedCommands: [] };
  }

  return { namedCommands };
}

function readPt(val: unknown): { x: number; y: number } | null {
  if (!val || typeof val !== "object") return null;
  const obj = val as Record<string, unknown>;
  if (typeof obj.x === "number" && typeof obj.y === "number") {
    return { x: obj.x, y: obj.y };
  }
  return null;
}

/** Parses a full PathPlanner 2025/2026 `.path` JSON file for the visual Bézier editor. */
export function parseFullPathPlannerPathJson(
  rawText: string,
  fallbackName: string,
): PathPlannerPathDoc | null {
  try {
    const parsed = JSON.parse(rawText) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.waypoints)) {
      return null;
    }

    const waypoints: PathWaypoint[] = [];
    for (const rawWp of parsed.waypoints) {
      if (!rawWp || typeof rawWp !== "object") continue;
      const wp = rawWp as Record<string, unknown>;
      const anchor = readPt(wp.anchor);
      if (!anchor) continue;
      waypoints.push({
        anchor,
        prevControl: readPt(wp.prevControl),
        nextControl: readPt(wp.nextControl),
        isLocked: Boolean(wp.isLocked),
        linkedName: typeof wp.linkedName === "string" ? wp.linkedName : null,
      });
    }
    if (waypoints.length < 2) return null;

    const rotationTargets: PathRotationTarget[] = [];
    if (Array.isArray(parsed.rotationTargets)) {
      parsed.rotationTargets.forEach((rawRt, idx) => {
        if (!rawRt || typeof rawRt !== "object") return;
        const rt = rawRt as Record<string, unknown>;
        const pos = typeof rt.waypointRelativePos === "number" ? rt.waypointRelativePos : 0.5;
        const rot =
          typeof rt.rotation === "number"
            ? rt.rotation
            : typeof rt.rotationDegrees === "number"
              ? rt.rotationDegrees
              : 0;
        rotationTargets.push({
          id: `rt-imp-${idx + 1}-${Math.random().toString(36).slice(2, 5)}`,
          waypointRelativePos: Math.max(0, pos),
          rotationDegrees: rot,
        });
      });
    }

    const eventMarkers: PathEventMarker[] = [];
    if (Array.isArray(parsed.eventMarkers)) {
      parsed.eventMarkers.forEach((rawEm, idx) => {
        if (!rawEm || typeof rawEm !== "object") return;
        const em = rawEm as Record<string, unknown>;
        const pos = typeof em.waypointRelativePos === "number" ? em.waypointRelativePos : 0.25;
        const markerCmds: string[] = [];
        const seen = new Set<string>();
        if (em.command) {
          walkCommandNode(em.command, markerCmds, seen, [], new Set());
        }
        const cmdName =
          markerCmds[0] ?? (typeof em.name === "string" && em.name.trim() ? em.name.trim() : "");
        if (!cmdName) return;
        eventMarkers.push({
          id: `em-imp-${idx + 1}-${Math.random().toString(36).slice(2, 5)}`,
          name: typeof em.name === "string" && em.name.trim() ? em.name.trim() : cmdName,
          waypointRelativePos: Math.max(0, pos),
          commandName: cmdName,
        });
      });
    }

    const gc = parsed.globalConstraints as Record<string, unknown> | undefined;
    const globalConstraints =
      gc &&
      typeof gc.maxVelocity === "number" &&
      typeof gc.maxAcceleration === "number" &&
      typeof gc.maxAngularVelocity === "number" &&
      typeof gc.maxAngularAcceleration === "number"
        ? {
            maxVelocity: Math.max(0.2, gc.maxVelocity),
            maxAcceleration: Math.max(0.2, gc.maxAcceleration),
            maxAngularVelocity: Math.max(10, gc.maxAngularVelocity),
            maxAngularAcceleration: Math.max(10, gc.maxAngularAcceleration),
          }
        : undefined;

    const startState = parsed.idealStartingState as Record<string, unknown> | undefined;
    const endState = parsed.goalEndState as Record<string, unknown> | undefined;

    return {
      id: `path-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      name: stripAutoExtension(fallbackName) || "ImportedPath",
      waypoints,
      rotationTargets,
      eventMarkers,
      globalConstraints,
      idealStartingState: {
        velocity: typeof startState?.velocity === "number" ? Math.max(0, startState.velocity) : 0,
        rotation: typeof startState?.rotation === "number" ? startState.rotation : 0,
      },
      goalEndState: {
        velocity: typeof endState?.velocity === "number" ? Math.max(0, endState.velocity) : 0,
        rotation: typeof endState?.rotation === "number" ? endState.rotation : 0,
      },
      reversed: Boolean(parsed.reversed),
      useDefaultConstraints: parsed.useDefaultConstraints !== false,
    };
  } catch {
    return null;
  }
}
