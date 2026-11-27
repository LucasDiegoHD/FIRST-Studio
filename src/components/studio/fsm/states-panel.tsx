"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
  GitBranch,
  Lightbulb,
  Lock,
  Plus,
  ScrollText,
  Trash2,
  Vibrate,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { UnitInput } from "@/components/ui/unit-input";
import { useProject } from "@/context/project-context";
import { toUpperSnake } from "@/lib/generator/java-utils";
import {
  getPrimaryMotorAction,
  isLedSubsystem,
  type ActionTiming,
  type FsmState,
  type FsmTransition,
  type LedPattern,
  type MotorSubsystemConfig,
  type RumblePattern,
  type StateAction,
  type SubsystemAction,
} from "@/lib/schema/ciprix-project";
import { RumblePreview } from "./rumble-preview";

function createActionForType(
  nextType: SubsystemAction["type"],
  stateName: string,
): SubsystemAction {
  if (nextType === "stop") return { type: "stop" };
  if (nextType === "velocityRpm") {
    return { type: "velocityRpm", constantName: `${stateName}_RPM`, value: 3000 };
  }
  if (nextType === "positionDeg") {
    return { type: "positionDeg", constantName: `${stateName}_ANGLE`, value: 45 };
  }
  if (nextType === "positionRot") {
    return { type: "positionRot", constantName: `${stateName}_POS`, value: 2.5 };
  }
  if (nextType === "smartPositionDeg") {
    return { type: "smartPositionDeg", constantName: `${stateName}_ANGLE`, value: 45 };
  }
  if (nextType === "smartPositionRot") {
    return { type: "smartPositionRot", constantName: `${stateName}_POS`, value: 5 };
  }
  return { type: "percentOutput", constantName: `${stateName}_OUTPUT`, value: 0.5 };
}

function getActionMeta(action: SubsystemAction) {
  switch (action.type) {
    case "velocityRpm":
      return {
        label: "Velocidade",
        unit: "RPM",
        min: -6000,
        max: 6000,
        step: 100,
        badge: `${Math.round(action.value)} RPM`,
      };
    case "positionDeg":
    case "smartPositionDeg":
      return {
        label: "Ângulo",
        unit: "deg",
        min: -180,
        max: 360,
        step: 5,
        badge: `${action.value}°`,
      };
    case "positionRot":
    case "smartPositionRot":
      return {
        label: "Rotações",
        unit: "rot",
        min: -20,
        max: 50,
        step: 0.25,
        badge: `${action.value} rot`,
      };
    case "percentOutput":
      return {
        label: "Potência",
        unit: "pct",
        min: -1,
        max: 1,
        step: 0.05,
        badge: `${action.value >= 0 ? "Frente" : "Reverso"} ${Math.round(action.value * 100)}%`,
      };
    default:
      return null;
  }
}

function StateNameInput({
  subsystemId,
  stateName,
  onRenamed,
}: {
  subsystemId: string;
  stateName: string;
  onRenamed: (nextName: string) => void;
}) {
  const { renameSubsystemState } = useProject();
  const [draft, setDraft] = useState(stateName);

  useEffect(() => {
    setDraft(stateName);
  }, [stateName]);

  const commit = () => {
    const normalized = toUpperSnake(draft);
    if (!normalized) {
      setDraft(stateName);
      return;
    }
    if (normalized !== stateName) {
      renameSubsystemState(subsystemId, stateName, normalized);
      onRenamed(normalized);
    }
    setDraft(normalized);
  };

  return (
    <Input
      value={draft}
      className="font-mono h-8 text-xs"
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setDraft(toUpperSnake(e.target.value))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
    />
  );
}

export function formatMotorHardware(subsystem: MotorSubsystemConfig) {
  const vendorLabel =
    subsystem.motor.vendor === "talonfx"
      ? "TalonFX"
      : subsystem.motor.vendor === "sparkmax"
        ? "SparkMax"
        : "TalonSRX";
  const followerSuffix = subsystem.motor.follower?.enabled
    ? ` (+${subsystem.motor.follower.canId})`
    : "";
  const busSuffix =
    subsystem.motor.canBus && subsystem.motor.canBus.toLowerCase() !== "rio"
      ? ` · ${subsystem.motor.canBus}`
      : "";
  const shortTag = `${vendorLabel} · CAN ${subsystem.motor.canId}${followerSuffix}`;
  return {
    vendorLabel,
    shortTag,
    fullTag: `${subsystem.name} · ${shortTag}${busSuffix}`,
  };
}

function summarizePrimaryAction(state: FsmState): { text: string; tone: string } {
  const action = getPrimaryMotorAction(state);
  switch (action.type) {
    case "stop":
      return { text: "Parado", tone: "text-slate-400" };
    case "percentOutput": {
      const pct = Math.round(action.value * 100);
      return pct >= 0
        ? { text: `Frente +${pct}%`, tone: "text-emerald-300" }
        : { text: `Reverso ${pct}%`, tone: "text-amber-300" };
    }
    case "velocityRpm":
      return {
        text: `${Math.round(action.value)} RPM`,
        tone: action.value >= 0 ? "text-emerald-300" : "text-amber-300",
      };
    case "positionDeg":
    case "smartPositionDeg":
      return { text: `${action.value}°`, tone: "text-violet-300" };
    case "positionRot":
    case "smartPositionRot":
      return { text: `${action.value} rot`, tone: "text-violet-300" };
  }
}

export function StatesPanel({
  subsystem,
  selectedStateName,
  onSelectState,
}: {
  subsystem: MotorSubsystemConfig;
  selectedStateName: string | null;
  onSelectState: (name: string) => void;
}) {
  const { project, updateSubsystem, issues, focusRequest, locale, t } = useProject();
  const ledSubsystems = project.subsystems.filter(isLedSubsystem);
  const sensors = subsystem.sensors ?? [];

  const foundIdx = subsystem.fsm.states.findIndex((s) => s.name === selectedStateName);
  const activeIdx = foundIdx >= 0 ? foundIdx : 0;
  const st = subsystem.fsm.states[activeIdx];

  const [showTiming, setShowTiming] = useState<boolean>(() =>
    Boolean(st?.regularTimeSec !== undefined || st?.timeoutAfterSec !== undefined),
  );
  const [showTransitions, setShowTransitions] = useState<boolean>(() =>
    Boolean((st?.transitions?.length ?? 0) > 0),
  );

  useEffect(() => {
    if (!st) return;
    const focusOnTiming = Boolean(
      focusRequest?.path &&
        (focusRequest.path.includes("regularTimeSec") ||
          focusRequest.path.includes("timeoutAfterSec")),
    );
    setShowTiming(
      focusOnTiming || st.regularTimeSec !== undefined || st.timeoutAfterSec !== undefined,
    );
    setShowTransitions((st.transitions?.length ?? 0) > 0);
  }, [subsystem.id, st?.name, focusRequest]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateFsm = (fn: (fsm: MotorSubsystemConfig["fsm"]) => MotorSubsystemConfig["fsm"]) => {
    updateSubsystem(subsystem.id, (prev) =>
      prev.fsm ? { ...prev, fsm: fn(prev.fsm) } : prev,
    );
  };

  const updateActionAt = (stateIdx: number, actIdx: number, nextAct: StateAction) => {
    updateFsm((fsm) => ({
      ...fsm,
      states: fsm.states.map((item, sI) =>
        sI === stateIdx
          ? {
              ...item,
              actions: item.actions.map((a, aI) => (aI === actIdx ? nextAct : a)),
            }
          : item,
      ),
    }));
  };

  const addActionToState = (stateIdx: number, stateName: string, kind: StateAction["kind"]) => {
    const id = `act-${kind}-${Date.now().toString(36)}`;
    let next: StateAction;
    if (kind === "motor") {
      next = { id, kind: "motor", when: "enter", action: { type: "stop" } };
    } else if (kind === "leds") {
      next = {
        id,
        kind: "leds",
        when: "enter",
        ledSubsystemId: ledSubsystems[0]?.id ?? "leds",
        pattern: "blink",
        colorHex: "#22c55e",
        periodSec: 0.5,
        priority: 50,
      };
    } else if (kind === "log") {
      next = {
        id,
        kind: "log",
        when: "enter",
        key: `${stateName}Status`,
        level: "info",
        message: `${subsystem.name}: ${stateName}`,
        alertOnDriverStation: false,
      };
    } else {
      next = {
        id,
        kind: "rumble",
        when: "enter",
        controller: "pilot",
        pattern: "lightConfirm",
        intensity: 0.6,
        seconds: 0.35,
        pulseCount: 2,
        priority: 50,
      };
    }
    updateFsm((fsm) => ({
      ...fsm,
      states: fsm.states.map((item, sI) =>
        sI === stateIdx ? { ...item, actions: [...item.actions, next] } : item,
      ),
    }));
  };

  if (!st) return null;

  const idx = activeIdx;
  const motorHw = formatMotorHardware(subsystem);
  const motorActionsCount = st.actions.filter((a) => a.kind === "motor").length;
  const transitionsCount = (st.transitions ?? []).length;
  const timingSummary = [
    st.regularTimeSec !== undefined
      ? `${st.regularTimeSec.min}–${st.regularTimeSec.max}s`
      : null,
    st.timeoutAfterSec !== undefined ? `timeout ${st.timeoutAfterSec}s` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-2.5 rounded-lg border border-[#22304a] bg-[#0f1624] p-3">
        <Field path={`subsystems.${subsystem.id}.fsm.initialState`} label={t("fsm.initial_state")}>
          <Select
            className="font-mono h-8 py-0 text-xs"
            value={subsystem.fsm.initialState}
            onChange={(e) =>
              updateFsm((fsm) => ({ ...fsm, initialState: e.target.value }))
            }
          >
            {subsystem.fsm.states.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field path={`subsystems.${subsystem.id}.fsm.securityState`} label={t("fsm.security_state")}>
          <Select
            className="font-mono h-8 py-0 text-xs"
            value={subsystem.fsm.securityState ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              updateFsm((fsm) => ({
                ...fsm,
                securityState: val === "" ? undefined : val,
              }));
            }}
          >
            <option value="">(Desativado)</option>
            {subsystem.fsm.states.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-300">{t("fsm.states_title")}</span>
            <Badge variant="default">{subsystem.fsm.states.length}</Badge>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const stateName = `STATE_${subsystem.fsm.states.length + 1}`;
              updateFsm((fsm) => ({
                ...fsm,
                states: [
                  ...fsm.states,
                  {
                    name: stateName,
                    actions: [
                      {
                        id: `act-${Date.now().toString(36)}`,
                        kind: "motor",
                        when: "enter",
                        action: { type: "stop" },
                      },
                    ],
                  },
                ],
              }));
              onSelectState(stateName);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("fsm.add_state")}
          </Button>
        </div>
        <p className="text-[11px] text-slate-400">
          Selecione um estado abaixo (ou no diagrama) para configurar motor, LEDs, tempos e transições.
        </p>
      </div>

      {/* Compact State Selector Strip */}
      <div className="space-y-1.5">
        {subsystem.fsm.states.map((item, itemIdx) => {
          const isSelected = itemIdx === activeIdx;
          const isInit = item.name === subsystem.fsm.initialState;
          const isSec = item.name === subsystem.fsm.securityState;
          const errCount = issues.filter(
            (i) => i.targetId === subsystem.id && i.stateName === item.name && i.severity === "error",
          ).length;
          const trCount = item.transitions?.length ?? 0;

          return (
            <button
              key={`${item.name}-${itemIdx}`}
              type="button"
              onClick={() => onSelectState(item.name)}
              className={`w-full rounded-lg border px-2.5 py-2 flex items-center justify-between gap-2 text-left transition-all cursor-pointer ${
                errCount > 0
                  ? "border-rose-500/80 bg-[#1c1624]"
                  : isSelected
                    ? "border-[#60a5fa] bg-[#142c4f]/80 text-white"
                    : "border-[#22304a] bg-[#0f1624] text-slate-300 hover:border-[#3b6bb5]"
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="truncate font-mono text-xs font-semibold text-white">
                  {item.name}
                </span>
                {isInit && (
                  <span className="shrink-0 rounded bg-[#142c4f] border border-[#3b6bb5]/70 px-1.5 py-0.2 font-mono text-[9px] uppercase text-[#93c5fd]">
                    Inicial
                  </span>
                )}
                {isSec && (
                  <span className="shrink-0 rounded bg-amber-950/70 border border-amber-600/60 px-1.5 py-0.2 font-mono text-[9px] uppercase text-amber-300">
                    Seg
                  </span>
                )}
                {errCount > 0 && (
                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-rose-600 px-1.5 py-0.2 font-mono text-[9px] font-bold text-white">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    {errCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 font-mono text-[10px] text-slate-400">
                <span className={summarizePrimaryAction(item).tone}>
                  {summarizePrimaryAction(item).text}
                </span>
                {item.actions.length > 1 && (
                  <span className="rounded bg-[#0b0f17] px-1.5 py-0.5 text-[9px] text-sky-300">
                    +{item.actions.length - 1}
                  </span>
                )}
                {trCount > 0 && (
                  <span className="rounded bg-[#0b0f17] px-1.5 py-0.5 text-[9px] text-cyan-300">
                    {trCount}T
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Focused Editor for Active State */}
      <div className="space-y-2.5 rounded-xl border border-[#3b6bb5]/70 bg-[#131d31] p-3.5">
        <div className="flex items-center gap-2">
          <Field
            path={`subsystems.${subsystem.id}.fsm.states.${st.name}.name`}
            className="flex-1"
          >
            <StateNameInput
              subsystemId={subsystem.id}
              stateName={st.name}
              onRenamed={onSelectState}
            />
          </Field>
          <Badge variant="outline" className="font-mono text-[10px] shrink-0">
            {st.actions.length} {st.actions.length === 1 ? "ação" : "ações"}
          </Badge>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            disabled={subsystem.fsm.states.length <= 1}
            onClick={() => {
              const remaining = subsystem.fsm.states.filter((_, i) => i !== idx);
              updateFsm((fsm) => ({
                ...fsm,
                states: fsm.states.filter((_, i) => i !== idx),
              }));
              if (remaining[0]) onSelectState(remaining[0].name);
            }}
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
          </Button>
        </div>

        {/* Multi-Action Stack */}
        <div className="space-y-2">
          {st.actions.map((act, actIdx) => (
            <div
              key={act.id}
              className="space-y-2 rounded-lg border border-[#22304a] bg-[#0b111c] p-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0 text-[11px] font-medium text-slate-200">
                  {act.kind === "motor" && <Zap className="h-3.5 w-3.5 shrink-0 text-sky-400" />}
                  {act.kind === "leds" && <Lightbulb className="h-3.5 w-3.5 shrink-0 text-lime-400" />}
                  {act.kind === "log" && <ScrollText className="h-3.5 w-3.5 shrink-0 text-amber-300" />}
                  {act.kind === "rumble" && <Vibrate className="h-3.5 w-3.5 shrink-0 text-cyan-300" />}
                  {act.kind === "motor" ? (
                    <>
                      <span className="truncate font-medium text-slate-100">{subsystem.name}</span>
                      <span
                        className="inline-flex shrink-0 items-center gap-1 rounded border border-[#2c3f61] bg-[#131d31] px-1.5 py-0.5 font-mono text-[10px] text-[#93c5fd]"
                        title="Motor real configurado no Editor do Robô (fixo neste subsistema)"
                      >
                        <Lock className="h-2.5 w-2.5" />
                        {motorHw.shortTag}
                      </span>
                    </>
                  ) : (
                    <span className="capitalize">{act.kind}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Field path={`subsystems.${subsystem.id}.fsm.states.${st.name}.actions.${act.id}.when`}>
                    <Select
                      value={act.when}
                      className="h-7 py-0 w-28 font-mono text-[11px]"
                      onChange={(e) =>
                        updateActionAt(idx, actIdx, {
                          ...act,
                          when: e.target.value as ActionTiming,
                        })
                      }
                    >
                      <option value="enter">onEnter</option>
                      <option value="periodic">onUpdate</option>
                      <option value="exit">onExit</option>
                    </Select>
                  </Field>
                  {!(act.kind === "motor" && motorActionsCount <= 1) && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      disabled={st.actions.length <= 1}
                      onClick={() =>
                        updateFsm((fsm) => ({
                          ...fsm,
                          states: fsm.states.map((item, i) =>
                            i === idx
                              ? { ...item, actions: item.actions.filter((_, ai) => ai !== actIdx) }
                              : item,
                          ),
                        }))
                      }
                    >
                      <Trash2 className="h-3 w-3 text-rose-400" />
                    </Button>
                  )}
                </div>
              </div>

              {act.kind === "motor" && (() => {
                const actionMeta = getActionMeta(act.action);
                return (
                  <div className="space-y-2">
                    <Field path={`subsystems.${subsystem.id}.fsm.states.${st.name}.actions.${act.id}.type`}>
                      <Select
                        value={act.action.type}
                        className="h-8 py-0 text-xs"
                        onChange={(e) =>
                          updateActionAt(idx, actIdx, {
                            ...act,
                            action: createActionForType(
                              e.target.value as SubsystemAction["type"],
                              st.name,
                            ),
                          })
                        }
                      >
                        <option value="stop">{t("fsm.action_stop")}</option>
                        <option value="percentOutput">{t("fsm.action_percent")}</option>
                        <option value="velocityRpm">Velocidade (RPM)</option>
                        <option value="positionDeg">Posição (°)</option>
                        <option value="positionRot">Posição (rot)</option>
                        <option value="smartPositionDeg">SmartPos (°)</option>
                        <option value="smartPositionRot">SmartPos (rot)</option>
                      </Select>
                    </Field>

                    {act.action.type !== "stop" && actionMeta && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <Field path={`subsystems.${subsystem.id}.fsm.states.${st.name}.actions.${act.id}.constantName`} label={t("fsm.constant_name")}>
                            <Input
                              value={act.action.constantName}
                              className="font-mono h-8 text-xs"
                              onChange={(e) => {
                                if (act.action.type === "stop") return;
                                updateActionAt(idx, actIdx, {
                                  ...act,
                                  action: {
                                    ...act.action,
                                    constantName: toUpperSnake(e.target.value),
                                  },
                                });
                              }}
                            />
                          </Field>
                          <Field path={`subsystems.${subsystem.id}.fsm.states.${st.name}.actions.${act.id}.value`} label={actionMeta.label}>
                            <UnitInput
                              unit={actionMeta.unit}
                              type="number"
                              step={actionMeta.step}
                              min={actionMeta.min}
                              max={actionMeta.max}
                              className="h-8 text-xs"
                              value={act.action.value}
                              onChange={(e) => {
                                if (act.action.type === "stop") return;
                                const raw = Number.parseFloat(e.target.value || "0") || 0;
                                const val = Math.min(actionMeta.max, Math.max(actionMeta.min, raw));
                                updateActionAt(idx, actIdx, {
                                  ...act,
                                  action: { ...act.action, value: val },
                                });
                              }}
                            />
                          </Field>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="w-20 font-mono text-[11px] text-[#93c5fd]">
                            {actionMeta.badge}
                          </span>
                          <input
                            type="range"
                            min={actionMeta.min}
                            max={actionMeta.max}
                            step={actionMeta.step}
                            value={act.action.value}
                            onChange={(e) => {
                              if (act.action.type === "stop") return;
                              const val = Number.parseFloat(e.target.value);
                              updateActionAt(idx, actIdx, {
                                ...act,
                                action: { ...act.action, value: val },
                              });
                            }}
                            className="flex-1"
                          />
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              {act.kind === "leds" && (
                <div className="grid grid-cols-2 gap-2">
                  <Field path={`subsystems.${subsystem.id}.fsm.states.${st.name}.actions.${act.id}.ledSubsystemId`} label="LED">
                    <Select
                      value={act.ledSubsystemId}
                      className="h-8 py-0 font-mono text-xs"
                      onChange={(e) =>
                        updateActionAt(idx, actIdx, { ...act, ledSubsystemId: e.target.value })
                      }
                    >
                      {ledSubsystems.length === 0 ? (
                        <option value={act.ledSubsystemId}>{act.ledSubsystemId} (adicione LEDs)</option>
                      ) : (
                        ledSubsystems.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))
                      )}
                    </Select>
                  </Field>
                  <Field path={`subsystems.${subsystem.id}.fsm.states.${st.name}.actions.${act.id}.pattern`} label="Padrão">
                    <Select
                      value={act.pattern}
                      className="h-8 py-0 font-mono text-xs"
                      onChange={(e) =>
                        updateActionAt(idx, actIdx, {
                          ...act,
                          pattern: e.target.value as LedPattern,
                        })
                      }
                    >
                      <option value="solid">Solid</option>
                      <option value="blink">Blink</option>
                      <option value="breathe">Breathe</option>
                      <option value="rainbow">Rainbow</option>
                      <option value="progressBar">ProgressBar</option>
                      <option value="alliance">Alliance</option>
                    </Select>
                  </Field>
                  <Field path={`subsystems.${subsystem.id}.fsm.states.${st.name}.actions.${act.id}.colorHex`} label="Cor">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={act.colorHex}
                        onChange={(e) =>
                          updateActionAt(idx, actIdx, { ...act, colorHex: e.target.value })
                        }
                        className="h-8 w-10 cursor-pointer rounded border border-[#22304a] bg-transparent p-0.5"
                      />
                      <Input
                        value={act.colorHex}
                        className="h-8 font-mono text-xs"
                        onChange={(e) =>
                          updateActionAt(idx, actIdx, { ...act, colorHex: e.target.value })
                        }
                      />
                    </div>
                  </Field>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Field path={`subsystems.${subsystem.id}.fsm.states.${st.name}.actions.${act.id}.periodSec`} label="Período (s)">
                      <Input
                        type="number"
                        step={0.1}
                        min={0.05}
                        max={10}
                        value={act.periodSec}
                        className="h-8 font-mono text-xs"
                        onChange={(e) =>
                          updateActionAt(idx, actIdx, {
                            ...act,
                            periodSec: Math.min(10, Math.max(0.05, Number.parseFloat(e.target.value || "0.5") || 0.5)),
                          })
                        }
                      />
                    </Field>
                    <Field path={`subsystems.${subsystem.id}.fsm.states.${st.name}.actions.${act.id}.priority`} label="Prio">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={act.priority}
                        className="h-8 font-mono text-xs"
                        onChange={(e) =>
                          updateActionAt(idx, actIdx, {
                            ...act,
                            priority: Math.min(100, Math.max(0, Number.parseInt(e.target.value || "50", 10) || 0)),
                          })
                        }
                      />
                    </Field>
                  </div>
                </div>
              )}

              {act.kind === "log" && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Field path={`subsystems.${subsystem.id}.fsm.states.${st.name}.actions.${act.id}.key`} label="Chave Log">
                      <Input
                        value={act.key}
                        className="h-8 font-mono text-xs"
                        onChange={(e) =>
                          updateActionAt(idx, actIdx, { ...act, key: e.target.value })
                        }
                      />
                    </Field>
                    <Field path={`subsystems.${subsystem.id}.fsm.states.${st.name}.actions.${act.id}.level`} label="Nível">
                      <Select
                        value={act.level}
                        className="h-8 py-0 font-mono text-xs"
                        onChange={(e) =>
                          updateActionAt(idx, actIdx, {
                            ...act,
                            level: e.target.value as "info" | "warning" | "error",
                          })
                        }
                      >
                        <option value="info">INFO</option>
                        <option value="warning">WARNING</option>
                        <option value="error">ERROR</option>
                      </Select>
                    </Field>
                  </div>
                  <Field path={`subsystems.${subsystem.id}.fsm.states.${st.name}.actions.${act.id}.message`} label="Mensagem">
                    <Input
                      value={act.message}
                      className="h-8 text-xs"
                      onChange={(e) =>
                        updateActionAt(idx, actIdx, { ...act, message: e.target.value })
                      }
                    />
                  </Field>
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={act.alertOnDriverStation}
                      onChange={(e) =>
                        updateActionAt(idx, actIdx, {
                          ...act,
                          alertOnDriverStation: e.target.checked,
                        })
                      }
                    />
                    <span>Enviar PersistentAlert para Driver Station</span>
                  </label>
                </div>
              )}

              {act.kind === "rumble" && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Field path={`subsystems.${subsystem.id}.fsm.states.${st.name}.actions.${act.id}.controller`} label="Controle">
                      <Select
                        value={act.controller}
                        className="h-8 py-0 font-mono text-xs"
                        onChange={(e) =>
                          updateActionAt(idx, actIdx, {
                            ...act,
                            controller: e.target.value as "pilot" | "copilot" | "both",
                          })
                        }
                      >
                        <option value="pilot">Piloto (0)</option>
                        <option value="copilot">Copiloto (1)</option>
                        <option value="both">Ambos</option>
                      </Select>
                    </Field>
                    <Field path={`subsystems.${subsystem.id}.fsm.states.${st.name}.actions.${act.id}.pattern`} label="Padrão">
                      <Select
                        value={act.pattern}
                        className="h-8 py-0 font-mono text-xs"
                        onChange={(e) =>
                          updateActionAt(idx, actIdx, {
                            ...act,
                            pattern: e.target.value as RumblePattern,
                          })
                        }
                      >
                        <option value="continuous">continuous</option>
                        <option value="pulses">pulses</option>
                        <option value="zigZag">zigZag</option>
                        <option value="rampUp">rampUp</option>
                        <option value="lightConfirm">lightConfirm</option>
                        <option value="heavyWarning">heavyWarning</option>
                      </Select>
                    </Field>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Field path={`subsystems.${subsystem.id}.fsm.states.${st.name}.actions.${act.id}.intensity`} label="Força">
                      <Input
                        type="number"
                        step={0.1}
                        min={0}
                        max={1}
                        value={act.intensity}
                        className="h-8 font-mono text-xs"
                        onChange={(e) =>
                          updateActionAt(idx, actIdx, {
                            ...act,
                            intensity: Math.min(1, Math.max(0, Number.parseFloat(e.target.value || "0") || 0)),
                          })
                        }
                      />
                    </Field>
                    <Field path={`subsystems.${subsystem.id}.fsm.states.${st.name}.actions.${act.id}.seconds`} label="Duração (s)">
                      <Input
                        type="number"
                        step={0.05}
                        min={0.05}
                        max={5}
                        value={act.seconds}
                        className="h-8 font-mono text-xs"
                        onChange={(e) =>
                          updateActionAt(idx, actIdx, {
                            ...act,
                            seconds: Math.min(5, Math.max(0.05, Number.parseFloat(e.target.value || "0.3") || 0.3)),
                          })
                        }
                      />
                    </Field>
                    <Field path={`subsystems.${subsystem.id}.fsm.states.${st.name}.actions.${act.id}.priority`} label="Prio">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={act.priority}
                        className="h-8 font-mono text-xs"
                        onChange={(e) =>
                          updateActionAt(idx, actIdx, {
                            ...act,
                            priority: Math.min(100, Math.max(0, Number.parseInt(e.target.value || "50", 10) || 0)),
                          })
                        }
                      />
                    </Field>
                  </div>
                  {act.pattern === "pulses" && (
                    <Field path={`subsystems.${subsystem.id}.fsm.states.${st.name}.actions.${act.id}.pulseCount`} label="Pulsos">
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={act.pulseCount ?? 3}
                        className="h-8 w-24 font-mono text-xs"
                        onChange={(e) =>
                          updateActionAt(idx, actIdx, {
                            ...act,
                            pulseCount: Math.min(20, Math.max(1, Number.parseInt(e.target.value || "3", 10) || 1)),
                          })
                        }
                      />
                    </Field>
                  )}
                  <RumblePreview
                    pattern={act.pattern}
                    intensity={act.intensity}
                    lightIntensity={act.lightIntensity}
                    seconds={act.seconds}
                    pulseCount={act.pulseCount}
                    locale={locale}
                  />
                </div>
              )}
            </div>
          ))}

          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {motorActionsCount === 0 && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[11px]"
                onClick={() => addActionToState(idx, st.name, "motor")}
              >
                + {subsystem.name}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[11px]"
              onClick={() => addActionToState(idx, st.name, "leds")}
            >
              + LED
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[11px]"
              onClick={() => addActionToState(idx, st.name, "log")}
            >
              + Log / Alerta
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[11px]"
              onClick={() => addActionToState(idx, st.name, "rumble")}
            >
              + Rumble
            </Button>
          </div>
        </div>

        {/* Collapsible Tempos & Timeout */}
        <div className="border-t border-[#22304a]/80 pt-2 space-y-2">
          <button
            type="button"
            onClick={() => setShowTiming((v) => !v)}
            className="flex w-full items-center justify-between text-left cursor-pointer"
          >
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-400 hover:text-slate-200">
              {showTiming ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <Clock className="h-3 w-3 text-slate-400" />
              Tempos & Timeout
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              {timingSummary || "opcional"}
            </span>
          </button>

          {showTiming && (
            <div className="grid grid-cols-3 gap-2">
              <Field
                path={`subsystems.${subsystem.id}.fsm.states.${st.name}.regularTimeSec.min`}
                label="Min (s)"
              >
                <Input
                  type="number"
                  step={0.1}
                  min={0}
                  placeholder="—"
                  value={st.regularTimeSec?.min ?? ""}
                  className="h-7 py-0 font-mono text-[11px]"
                  onChange={(e) => {
                    const raw = e.target.value.trim();
                    updateFsm((fsm) => ({
                      ...fsm,
                      states: fsm.states.map((item, i) => {
                        if (i !== idx) return item;
                        if (raw === "" && item.regularTimeSec === undefined) return item;
                        if (raw === "") return { ...item, regularTimeSec: undefined };
                        const min = Math.max(0, Number.parseFloat(raw) || 0);
                        return {
                          ...item,
                          regularTimeSec: {
                            min,
                            max: Math.max(min + 0.1, item.regularTimeSec?.max ?? min + 1.0),
                          },
                        };
                      }),
                    }));
                  }}
                />
              </Field>
              <Field
                path={`subsystems.${subsystem.id}.fsm.states.${st.name}.regularTimeSec.max`}
                label="Max regular (s)"
              >
                <Input
                  type="number"
                  step={0.1}
                  min={0.1}
                  placeholder="—"
                  value={st.regularTimeSec?.max ?? ""}
                  className="h-7 py-0 font-mono text-[11px]"
                  onChange={(e) => {
                    const raw = e.target.value.trim();
                    updateFsm((fsm) => ({
                      ...fsm,
                      states: fsm.states.map((item, i) => {
                        if (i !== idx) return item;
                        if (raw === "") return { ...item, regularTimeSec: undefined };
                        const max = Math.max(0.1, Number.parseFloat(raw) || 1.0);
                        return {
                          ...item,
                          regularTimeSec: {
                            min: Math.min(item.regularTimeSec?.min ?? 0, max - 0.05),
                            max,
                          },
                        };
                      }),
                    }));
                  }}
                />
              </Field>
              <Field
                path={`subsystems.${subsystem.id}.fsm.states.${st.name}.timeoutAfterSec`}
                label={t("fsm.timeout_sec")}
              >
                <Input
                  type="number"
                  step={0.5}
                  min={0}
                  placeholder="—"
                  value={st.timeoutAfterSec ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value.trim();
                    const parsed =
                      raw === ""
                        ? undefined
                        : Math.max(0.1, Number.parseFloat(raw) || 0.1);
                    updateFsm((fsm) => ({
                      ...fsm,
                      states: fsm.states.map((item, i) =>
                        i === idx ? { ...item, timeoutAfterSec: parsed } : item,
                      ),
                    }));
                  }}
                  className="h-7 py-0 font-mono text-[11px]"
                />
              </Field>
            </div>
          )}
        </div>

        {/* Collapsible Transições automáticas */}
        <div className="space-y-2 border-t border-[#22304a]/80 pt-2">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowTransitions((v) => !v)}
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              {showTransitions ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <GitBranch className="h-3 w-3 text-cyan-400" />
              Transições automáticas ({transitionsCount})
            </button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[11px]"
              onClick={() => {
                const target =
                  subsystem.fsm.states.find((s) => s.name !== st.name)?.name ?? st.name;
                const newTr: FsmTransition = {
                  id: `tr-${Date.now().toString(36)}`,
                  trigger: "atSetpoint",
                  targetState: target,
                };
                updateFsm((fsm) => ({
                  ...fsm,
                  states: fsm.states.map((item, i) =>
                    i === idx
                      ? { ...item, transitions: [...(item.transitions ?? []), newTr] }
                      : item,
                  ),
                }));
                setShowTransitions(true);
              }}
            >
              <Plus className="h-3 w-3" />
              Nova
            </Button>
          </div>

          {showTransitions && transitionsCount > 0 && (
            <div className="space-y-1.5">
              {(st.transitions ?? []).map((tr, trIdx) => (
                <div
                  key={tr.id}
                  className="grid grid-cols-12 gap-1.5 items-center"
                >
                  <Select
                    value={tr.trigger}
                    className="col-span-5 h-7 py-0 font-mono text-[11px]"
                    onChange={(e) => {
                      const nextTrigger = e.target.value as FsmTransition["trigger"];
                      updateFsm((fsm) => ({
                        ...fsm,
                        states: fsm.states.map((item, i) =>
                          i === idx
                            ? {
                                ...item,
                                transitions: (item.transitions ?? []).map((tItem, ti) =>
                                  ti === trIdx
                                    ? {
                                        ...tItem,
                                        trigger: nextTrigger,
                                        value:
                                          nextTrigger === "afterSeconds"
                                            ? tItem.value ?? 0.5
                                            : nextTrigger === "currentAbove"
                                              ? tItem.value ?? 35
                                              : undefined,
                                        sensorId:
                                          nextTrigger === "sensorTrue" || nextTrigger === "sensorFalse"
                                            ? tItem.sensorId ?? sensors[0]?.id
                                            : undefined,
                                      }
                                    : tItem,
                                ),
                              }
                            : item,
                        ),
                      }));
                    }}
                  >
                    <option value="atSetpoint">atSetpoint()</option>
                    <option value="afterSeconds">afterSeconds(s)</option>
                    <option value="stalled">stalled()</option>
                    <option value="currentAbove">currentAbove(A)</option>
                    {sensors.length > 0 && (
                      <>
                        <option value="sensorTrue">sensorTrue</option>
                        <option value="sensorFalse">sensorFalse</option>
                      </>
                    )}
                  </Select>

                  {(tr.trigger === "afterSeconds" || tr.trigger === "currentAbove") && (
                    <Input
                      type="number"
                      step={tr.trigger === "afterSeconds" ? 0.1 : 1}
                      min={0.05}
                      value={tr.value ?? (tr.trigger === "afterSeconds" ? 0.5 : 35)}
                      className="col-span-2 h-7 py-0 font-mono text-[11px]"
                      onChange={(e) => {
                        const val = Math.max(
                          0.05,
                          Number.parseFloat(e.target.value || "0.5") || 0.5,
                        );
                        updateFsm((fsm) => ({
                          ...fsm,
                          states: fsm.states.map((item, i) =>
                            i === idx
                              ? {
                                  ...item,
                                  transitions: (item.transitions ?? []).map((tItem, ti) =>
                                    ti === trIdx ? { ...tItem, value: val } : tItem,
                                  ),
                                }
                              : item,
                          ),
                        }));
                      }}
                    />
                  )}

                  {(tr.trigger === "sensorTrue" || tr.trigger === "sensorFalse") && (
                    <Select
                      value={tr.sensorId ?? sensors[0]?.id ?? ""}
                      className="col-span-3 h-7 py-0 font-mono text-[11px]"
                      onChange={(e) =>
                        updateFsm((fsm) => ({
                          ...fsm,
                          states: fsm.states.map((item, i) =>
                            i === idx
                              ? {
                                  ...item,
                                  transitions: (item.transitions ?? []).map((tItem, ti) =>
                                    ti === trIdx ? { ...tItem, sensorId: e.target.value } : tItem,
                                  ),
                                }
                              : item,
                          ),
                        }))
                      }
                    >
                      {sensors.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </Select>
                  )}

                  <Select
                    value={tr.targetState}
                    className={`${
                      tr.trigger === "afterSeconds" || tr.trigger === "currentAbove"
                        ? "col-span-4"
                        : tr.trigger === "sensorTrue" || tr.trigger === "sensorFalse"
                          ? "col-span-3"
                          : "col-span-6"
                    } h-7 py-0 font-mono text-[11px]`}
                    onChange={(e) =>
                      updateFsm((fsm) => ({
                        ...fsm,
                        states: fsm.states.map((item, i) =>
                          i === idx
                            ? {
                                ...item,
                                transitions: (item.transitions ?? []).map((tItem, ti) =>
                                  ti === trIdx
                                    ? { ...tItem, targetState: e.target.value }
                                    : tItem,
                                ),
                              }
                            : item,
                        ),
                      }))
                    }
                  >
                    {subsystem.fsm.states.map((s) => (
                      <option key={s.name} value={s.name}>
                        → {s.name}
                      </option>
                    ))}
                  </Select>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="col-span-1 h-7 w-7"
                    onClick={() =>
                      updateFsm((fsm) => ({
                        ...fsm,
                        states: fsm.states.map((item, i) =>
                          i === idx
                            ? {
                                ...item,
                                transitions: (item.transitions ?? []).filter(
                                  (_, ti) => ti !== trIdx,
                                ),
                              }
                            : item,
                        ),
                      }))
                    }
                  >
                    <Trash2 className="h-3 w-3 text-rose-400" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
