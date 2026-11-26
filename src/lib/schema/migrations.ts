import { z } from "zod";
import {
  CiprixProjectSchema,
  type CiprixProject,
} from "./ciprix-project";

type AnyRecord = Record<string, unknown>;

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function migrateV1toV2(raw: unknown): unknown {
  if (!isRecord(raw)) return raw;
  const version = raw.schemaVersion;
  if (version === 2) return raw;
  if (version !== undefined && version !== 1) return raw;

  const next: AnyRecord = structuredClone(raw);
  next.schemaVersion = 2;

  if (Array.isArray(next.subsystems)) {
    next.subsystems = next.subsystems.map((sub) => {
      if (!isRecord(sub) || !isRecord(sub.fsm) || !Array.isArray(sub.fsm.states)) {
        return sub;
      }
      const subId = typeof sub.id === "string" ? sub.id : "sub";
      const nextStates = sub.fsm.states.map((st, sIdx) => {
        if (!isRecord(st)) return st;
        if (Array.isArray(st.actions)) return st;

        const stateName = typeof st.name === "string" ? st.name : `state_${sIdx}`;
        const actions: AnyRecord[] = [];
        const onEnter = st.onEnter;
        actions.push({
          id: `act-${subId}-${stateName}-enter`,
          kind: "motor",
          when: "enter",
          action: isRecord(onEnter) ? onEnter : { type: "stop" },
        });
        if (isRecord(st.onUpdate)) {
          actions.push({
            id: `act-${subId}-${stateName}-periodic`,
            kind: "motor",
            when: "periodic",
            action: st.onUpdate,
          });
        }

        const migratedState: AnyRecord = { ...st, actions };
        delete migratedState.onEnter;
        delete migratedState.onUpdate;
        return migratedState;
      });
      return {
        ...sub,
        fsm: {
          ...sub.fsm,
          states: nextStates,
        },
      };
    });
  }

  if (isRecord(next.controls) && Array.isArray(next.controls.pilotPriority)) {
    next.controls = {
      ...next.controls,
      pilotPriority: next.controls.pilotPriority.map((item) =>
        isRecord(item) && item.source === undefined
          ? { ...item, source: "button" }
          : item,
      ),
    };
  }

  return next;
}

export type ParseMigrationResult =
  | { ok: true; data: CiprixProject; migratedFrom?: number }
  | { ok: false; error: z.ZodError | Error };

export function parseProjectWithMigration(raw: unknown): ParseMigrationResult {
  const originalVersion =
    isRecord(raw) && typeof raw.schemaVersion === "number"
      ? raw.schemaVersion
      : isRecord(raw)
        ? 1
        : undefined;

  const migrated = migrateV1toV2(raw);
  const parsed = CiprixProjectSchema.safeParse(migrated);
  if (!parsed.success) {
    return { ok: false, error: parsed.error };
  }
  return {
    ok: true,
    data: parsed.data,
    migratedFrom:
      originalVersion !== undefined && originalVersion < 2
        ? originalVersion
        : undefined,
  };
}
