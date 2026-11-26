import type { ZodIssue } from "zod";
import type { Locale } from "./i18n";
import { normalizeFieldPath } from "./help/catalog";
import type { CiprixProject } from "./schema/ciprix-project";
import type { StudioTab } from "./validator";

export interface FieldMeta {
  fieldLabel: { pt: string; en: string };
  section?: { pt: string; en: string };
  tab: StudioTab;
  advanced?: boolean;
  min?: number;
  max?: number;
}

export const FIELD_META: Record<string, FieldMeta> = {
  "project.name": {
    fieldLabel: { pt: "Nome do Projeto", en: "Project Name" },
    section: { pt: "Identidade do Projeto", en: "Project Identity" },
    tab: "project",
  },
  "project.teamNumber": {
    fieldLabel: { pt: "Número da Equipe", en: "Team Number" },
    section: { pt: "Identidade do Projeto", en: "Project Identity" },
    tab: "project",
    min: 0,
    max: 99999,
  },
  "project.packageName": {
    fieldLabel: { pt: "Pacote Java Base", en: "Base Java Package" },
    section: { pt: "Identidade do Projeto", en: "Project Identity" },
    tab: "project",
  },
  "project.controllerDeadband": {
    fieldLabel: { pt: "Deadband do Controle", en: "Controller Deadband" },
    section: { pt: "Simulação e Tuning", en: "Simulation & Tuning" },
    tab: "project",
    min: 0,
    max: 0.5,
  },
  "project.fieldLengthMeters": {
    fieldLabel: { pt: "Comprimento do Campo", en: "Field Length" },
    section: { pt: "Campo e Aliança", en: "Field & Alliance" },
    tab: "project",
  },
  "project.fieldWidthMeters": {
    fieldLabel: { pt: "Largura do Campo", en: "Field Width" },
    section: { pt: "Campo e Aliança", en: "Field & Alliance" },
    tab: "project",
  },
  "subsystems.*.name": {
    fieldLabel: { pt: "Nome da Classe", en: "Class Name" },
    section: { pt: "Geral", en: "General" },
    tab: "subsystems",
  },
  "subsystems.*.motor.canId": {
    fieldLabel: { pt: "ID CAN", en: "CAN ID" },
    section: { pt: "Hardware", en: "Hardware" },
    tab: "subsystems",
    min: 0,
    max: 62,
  },
  "subsystems.*.motor.currentLimitAmps": {
    fieldLabel: { pt: "Limite de Corrente", en: "Current Limit" },
    section: { pt: "Hardware", en: "Hardware" },
    tab: "subsystems",
    min: 1,
    max: 120,
  },
  "subsystems.*.motor.gearRatio": {
    fieldLabel: { pt: "Redução", en: "Gear Ratio" },
    section: { pt: "Avançado", en: "Advanced" },
    tab: "subsystems",
    advanced: true,
  },
  "subsystems.*.motor.moiKgM2": {
    fieldLabel: { pt: "Inércia Sim", en: "Sim Inertia" },
    section: { pt: "Avançado", en: "Advanced" },
    tab: "subsystems",
    advanced: true,
  },
  "subsystems.*.motor.follower.canId": {
    fieldLabel: { pt: "ID CAN do Follower", en: "Follower CAN ID" },
    section: { pt: "Dual-Motor Follower", en: "Dual-Motor Follower" },
    tab: "subsystems",
    advanced: true,
    min: 0,
    max: 62,
  },
  "subsystems.*.physics.massKg": {
    fieldLabel: { pt: "Massa Sim", en: "Sim Mass" },
    section: { pt: "Física", en: "Physics" },
    tab: "subsystems",
    advanced: true,
  },
  "subsystems.*.physics.lengthMeters": {
    fieldLabel: { pt: "Comprimento", en: "Length" },
    section: { pt: "Física", en: "Physics" },
    tab: "subsystems",
    advanced: true,
  },
  "subsystems.*.physics.drumRadiusMeters": {
    fieldLabel: { pt: "Raio do Tambor", en: "Drum Radius" },
    section: { pt: "Física", en: "Physics" },
    tab: "subsystems",
    advanced: true,
  },
  "subsystems.*.closedLoop.smartMotion.maxVelRps": {
    fieldLabel: { pt: "Vel. Máx (RPS)", en: "Max Vel (RPS)" },
    section: { pt: "SmartMotion", en: "SmartMotion" },
    tab: "subsystems",
    advanced: true,
  },
  "subsystems.*.closedLoop.smartMotion.maxAccelRpss": {
    fieldLabel: { pt: "Acel. Máx (RPS²)", en: "Max Accel (RPS²)" },
    section: { pt: "SmartMotion", en: "SmartMotion" },
    tab: "subsystems",
    advanced: true,
  },
  "subsystems.*.closedLoop.smartMotion.allowedError": {
    fieldLabel: { pt: "Erro Permitido", en: "Allowed Error" },
    section: { pt: "SmartMotion", en: "SmartMotion" },
    tab: "subsystems",
    advanced: true,
    min: 0,
  },
  "subsystems.*.protection.stallCurrentAmps": {
    fieldLabel: { pt: "Corrente de stall", en: "Stall current" },
    section: { pt: "Proteção", en: "Protection" },
    tab: "subsystems",
    advanced: true,
  },
  "subsystems.*.protection.stallTimeSec": {
    fieldLabel: { pt: "Tempo de stall", en: "Stall time" },
    section: { pt: "Proteção", en: "Protection" },
    tab: "subsystems",
    advanced: true,
  },
  "subsystems.*.protection.reverseTimeSec": {
    fieldLabel: { pt: "Tempo de reversão", en: "Reverse time" },
    section: { pt: "Proteção", en: "Protection" },
    tab: "subsystems",
    advanced: true,
  },
  "subsystems.*.protection.reverseOutput": {
    fieldLabel: { pt: "Intensidade da reversão", en: "Reversal intensity" },
    section: { pt: "Proteção", en: "Protection" },
    tab: "subsystems",
    advanced: true,
    min: 0,
    max: 1,
  },
  "subsystems.*.protection.currentWarningAmps": {
    fieldLabel: { pt: "Aviso de corrente", en: "Current warning" },
    section: { pt: "Proteção", en: "Protection" },
    tab: "subsystems",
    advanced: true,
    min: 0,
  },
  "subsystems.*.protection.openLoopRampSec": {
    fieldLabel: { pt: "Rampa open-loop", en: "Open-loop ramp" },
    section: { pt: "Proteção", en: "Protection" },
    tab: "subsystems",
    advanced: true,
    min: 0,
  },
  "subsystems.*.selfTest.output": {
    fieldLabel: { pt: "Saída Self-Test", en: "Self-Test Output" },
    section: { pt: "Pit Self-Test", en: "Pit Self-Test" },
    tab: "subsystems",
    advanced: true,
    min: -1,
    max: 1,
  },
  "subsystems.*.selfTest.minVelocityRps": {
    fieldLabel: { pt: "Velocidade Mínima", en: "Min Velocity" },
    section: { pt: "Pit Self-Test", en: "Pit Self-Test" },
    tab: "subsystems",
    advanced: true,
    min: 0,
  },
  "subsystems.*.fsm.initialState": {
    fieldLabel: { pt: "Estado Inicial", en: "Initial State" },
    section: { pt: "Estados", en: "States" },
    tab: "fsm",
  },
  "subsystems.*.fsm.initialRequest": {
    fieldLabel: { pt: "Request Inicial", en: "Initial Request" },
    section: { pt: "Requisições", en: "Requests" },
    tab: "fsm",
  },
  "subsystems.*.fsm.securityState": {
    fieldLabel: { pt: "Estado de Segurança", en: "Security State" },
    section: { pt: "Estados", en: "States" },
    tab: "fsm",
  },
  "subsystems.*.fsm.states.*.name": {
    fieldLabel: { pt: "Nome do Estado", en: "State Name" },
    section: { pt: "Estados", en: "States" },
    tab: "fsm",
  },
  "subsystems.*.fsm.states.*.actions.*.constantName": {
    fieldLabel: { pt: "Constante Java", en: "Java Constant" },
    section: { pt: "Estados", en: "States" },
    tab: "fsm",
  },
  "subsystems.*.fsm.states.*.actions.*.value": {
    fieldLabel: { pt: "Valor da Ação", en: "Action Value" },
    section: { pt: "Estados", en: "States" },
    tab: "fsm",
  },
  "subsystems.*.fsm.states.*.regularTimeSec.min": {
    fieldLabel: { pt: "Tempo Mínimo", en: "Min Regular Time" },
    section: { pt: "Estados", en: "States" },
    tab: "fsm",
  },
  "subsystems.*.fsm.states.*.regularTimeSec.max": {
    fieldLabel: { pt: "Tempo Máximo", en: "Max Regular Time" },
    section: { pt: "Estados", en: "States" },
    tab: "fsm",
  },
  "subsystems.*.leds.pwmPort": {
    fieldLabel: { pt: "Porta PWM", en: "PWM Port" },
    section: { pt: "Hardware LEDs", en: "LED Hardware" },
    tab: "subsystems",
    min: 0,
    max: 9,
  },
  "subsystems.*.leds.ledCount": {
    fieldLabel: { pt: "Quantidade de LEDs", en: "LED Count" },
    section: { pt: "Hardware LEDs", en: "LED Hardware" },
    tab: "subsystems",
    min: 1,
    max: 300,
  },
  "subsystems.*.leds.canId": {
    fieldLabel: { pt: "ID CAN CANdle", en: "CANdle CAN ID" },
    section: { pt: "Hardware LEDs", en: "LED Hardware" },
    tab: "subsystems",
    min: 0,
    max: 62,
  },
  "subsystems.*.sensors.*.channel": {
    fieldLabel: { pt: "Canal DIO", en: "DIO Channel" },
    section: { pt: "Sensores", en: "Sensors" },
    tab: "subsystems",
    min: 0,
    max: 25,
  },
  "subsystems.*.sensors.*.canId": {
    fieldLabel: { pt: "CAN ID Sensor", en: "Sensor CAN ID" },
    section: { pt: "Sensores", en: "Sensors" },
    tab: "subsystems",
    min: 0,
    max: 62,
  },
  "subsystems.*.fsm.states.*.timeoutAfterSec": {
    fieldLabel: { pt: "Timeout (s)", en: "Timeout (s)" },
    section: { pt: "Estados", en: "States" },
    tab: "fsm",
  },
  "subsystems.*.fsm.requests.*": {
    fieldLabel: { pt: "Requisição", en: "Request" },
    section: { pt: "Requisições", en: "Requests" },
    tab: "fsm",
  },
  "subsystems.*.fsm.bindings.*": {
    fieldLabel: { pt: "Ligação bindRequest", en: "bindRequest Binding" },
    section: { pt: "Ligações", en: "Bindings" },
    tab: "fsm",
  },
};

export function getFieldMeta(path: string): FieldMeta | undefined {
  return FIELD_META[normalizeFieldPath(path)];
}

function readValueAtPath(root: unknown, rawPath: (string | number)[]): unknown {
  let curr: unknown = root;
  for (const seg of rawPath) {
    if (curr === null || typeof curr !== "object") return undefined;
    curr = (curr as Record<string | number, unknown>)[seg];
  }
  return curr;
}

function formatNumberLocale(n: number, locale: Locale): string {
  return locale === "pt" ? String(n).replace(".", ",") : String(n);
}

function formatValueDisplay(val: unknown, locale: Locale): string {
  if (typeof val === "number") return formatNumberLocale(val, locale);
  if (typeof val === "string") return val === "" ? "(vazio)" : `"${val}"`;
  if (val === undefined) return locale === "pt" ? "(vazio)" : "(empty)";
  return String(val);
}

export function resolveZodPath(
  rawPath: (string | number)[],
  project: CiprixProject,
): {
  path: string;
  targetId?: string;
  subsystemName?: string;
  stateName?: string;
  tab: StudioTab;
} {
  const segs: string[] = [];
  let targetId: string | undefined;
  let subsystemName: string | undefined;
  let stateName: string | undefined;
  let tab: StudioTab = "project";

  if (rawPath[0] === "subsystems" && typeof rawPath[1] === "number") {
    const sub = project.subsystems[rawPath[1]];
    targetId = sub?.id;
    subsystemName = sub?.name;
    segs.push("subsystems", sub?.id ?? String(rawPath[1]));

    if (rawPath[2] === "fsm") {
      tab = "fsm";
      segs.push("fsm");
      if (rawPath[3] === "states" && typeof rawPath[4] === "number") {
        const st = sub?.fsm?.states[rawPath[4]];
        stateName = st?.name;
        segs.push("states", st?.name ?? String(rawPath[4]), ...rawPath.slice(5).map(String));
      } else if (rawPath[3] === "requests" && typeof rawPath[4] === "number") {
        const req = sub?.fsm?.requests[rawPath[4]];
        segs.push("requests", req ?? String(rawPath[4]), ...rawPath.slice(5).map(String));
      } else if (rawPath[3] === "bindings" && typeof rawPath[4] === "number") {
        const bind = sub?.fsm?.bindings[rawPath[4]];
        segs.push("bindings", bind?.request ?? String(rawPath[4]));
      } else {
        segs.push(...rawPath.slice(3).map(String));
      }
    } else {
      tab = "subsystems";
      segs.push(...rawPath.slice(2).map(String));
    }
  } else if (rawPath[0] === "superstructure") {
    tab = "superstructure";
    segs.push(...rawPath.map(String));
  } else if (rawPath[0] === "controls") {
    tab = "controls";
    if (rawPath[1] === "pilotPriority" && typeof rawPath[2] === "number") {
      const item = project.controls.pilotPriority[rawPath[2]];
      segs.push("controls", "pilotPriority", item?.id ?? String(rawPath[2]), ...rawPath.slice(3).map(String));
    } else if (rawPath[1] === "copilotOverrides" && typeof rawPath[2] === "number") {
      const item = project.controls.copilotOverrides[rawPath[2]];
      segs.push("controls", "copilotOverrides", item?.id ?? String(rawPath[2]), ...rawPath.slice(3).map(String));
    } else {
      segs.push(...rawPath.map(String));
    }
  } else {
    segs.push(...rawPath.map(String));
  }

  return { path: segs.join("."), targetId, subsystemName, stateName, tab };
}

export function formatZodIssue(
  err: ZodIssue,
  project: CiprixProject,
  locale: Locale,
): {
  path: string;
  fieldLabel: string;
  section?: string;
  tab: StudioTab;
  targetId?: string;
  stateName?: string;
  advanced?: boolean;
  message: string;
} {
  const resolved = resolveZodPath(err.path, project);
  const meta = getFieldMeta(resolved.path);
  const tab = meta?.tab ?? resolved.tab;
  const fieldLabel = meta?.fieldLabel[locale] ?? String(err.path[err.path.length - 1] ?? "campo");
  const section = meta?.section?.[locale];
  const rawVal = readValueAtPath(project, err.path);
  const valStr = formatValueDisplay(rawVal, locale);

  const whereParts: string[] = [];
  if (resolved.subsystemName) {
    whereParts.push(
      locale === "pt"
        ? `No subsistema ${resolved.subsystemName}`
        : `In subsystem ${resolved.subsystemName}`,
    );
  }
  if (section) {
    whereParts.push(locale === "pt" ? `aba ${section}` : `${section} section`);
  }
  const wherePrefix = whereParts.length > 0 ? `${whereParts.join(", ")}, ` : "";

  let reason = err.message;
  if (err.code === "too_small" || err.code === "too_big") {
    const min = meta?.min ?? (err.code === "too_small" && typeof err.minimum === "number" ? err.minimum : undefined);
    const max = meta?.max ?? (err.code === "too_big" && typeof err.maximum === "number" ? err.maximum : undefined);

    if (min !== undefined && max !== undefined) {
      reason =
        locale === "pt"
          ? `está ${valStr}; use um valor entre ${formatNumberLocale(min, locale)} e ${formatNumberLocale(max, locale)}.`
          : `is ${valStr}; use a value between ${formatNumberLocale(min, locale)} and ${formatNumberLocale(max, locale)}.`;
    } else if (err.code === "too_small" && typeof err.minimum === "number") {
      if (err.type === "string") {
        reason =
          locale === "pt" ? "não pode ficar vazio." : "cannot be empty.";
      } else {
        const cmp = err.inclusive ? "≥" : ">";
        reason =
          locale === "pt"
            ? `está ${valStr}; use um valor ${cmp} ${formatNumberLocale(err.minimum, locale)}.`
            : `is ${valStr}; use a value ${cmp} ${formatNumberLocale(err.minimum, locale)}.`;
      }
    } else if (err.code === "too_big" && typeof err.maximum === "number") {
      const cmp = err.inclusive ? "≤" : "<";
      reason =
        locale === "pt"
          ? `está ${valStr}; use um valor ${cmp} ${formatNumberLocale(err.maximum, locale)}.`
          : `is ${valStr}; use a value ${cmp} ${formatNumberLocale(err.maximum, locale)}.`;
    }
  } else if (err.code === "invalid_type") {
    reason =
      locale === "pt"
        ? `valor inválido (${valStr}).`
        : `invalid value (${valStr}).`;
  }

  const message =
    locale === "pt"
      ? `${wherePrefix}o campo ${fieldLabel} ${reason}`
      : `${wherePrefix}field ${fieldLabel} ${reason}`;

  return {
    path: resolved.path,
    fieldLabel,
    section,
    tab,
    targetId: resolved.targetId,
    stateName: resolved.stateName,
    advanced: meta?.advanced,
    message,
  };
}
