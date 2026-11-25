"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { UnitInput } from "@/components/ui/unit-input";
import { useProject } from "@/context/project-context";
import { toUpperSnake } from "@/lib/generator/java-utils";
import type {
  FsmTransition,
  SubsystemAction,
  SubsystemConfig,
} from "@/lib/schema/ciprix-project";

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
        unit: "RPM",
        min: -6000,
        max: 6000,
        step: 100,
        badge: `${Math.round(action.value)} RPM`,
      };
    case "positionDeg":
    case "smartPositionDeg":
      return {
        unit: "deg",
        min: -180,
        max: 360,
        step: 5,
        badge: `${action.value}°`,
      };
    case "positionRot":
    case "smartPositionRot":
      return {
        unit: "rot",
        min: -20,
        max: 50,
        step: 0.25,
        badge: `${action.value} rot`,
      };
    case "percentOutput":
      return {
        unit: "pct",
        min: -1,
        max: 1,
        step: 0.05,
        badge: `${action.value >= 0 ? "FWD" : "REV"} ${Math.round(action.value * 100)}%`,
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

export function StatesPanel({
  subsystem,
  selectedStateName,
  onSelectState,
}: {
  subsystem: SubsystemConfig;
  selectedStateName: string | null;
  onSelectState: (name: string) => void;
}) {
  const { updateSubsystem, t } = useProject();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 rounded-lg border border-[#22304a] bg-[#0f1624] p-3">
        <Field path={`subsystems.${subsystem.id}.fsm.initialState`} label={t("fsm.initial_state")}>
          <Select
            className="font-mono h-8 text-xs"
            value={subsystem.fsm.initialState}
            onChange={(e) =>
              updateSubsystem(subsystem.id, (prev) => ({
                ...prev,
                fsm: { ...prev.fsm, initialState: e.target.value },
              }))
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
            className="font-mono h-8 text-xs"
            value={subsystem.fsm.securityState ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              updateSubsystem(subsystem.id, (prev) => ({
                ...prev,
                fsm: {
                  ...prev.fsm,
                  securityState: val === "" ? undefined : val,
                },
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
            updateSubsystem(subsystem.id, (prev) => ({
              ...prev,
              fsm: {
                ...prev.fsm,
                states: [...prev.fsm.states, { name: stateName, onEnter: { type: "stop" } }],
              },
            }));
            onSelectState(stateName);
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          {t("fsm.add_state")}
        </Button>
      </div>

      <div className="space-y-3">
        {subsystem.fsm.states.map((st, idx) => {
          const actionMeta = getActionMeta(st.onEnter);
          const isSelected = selectedStateName === st.name;

          return (
            <div
              key={`${st.name}-${idx}`}
              onClick={() => onSelectState(st.name)}
              className={`space-y-2.5 rounded-xl border p-3.5 transition-colors cursor-pointer ${
                isSelected
                  ? "border-[#60a5fa] bg-[#19253d]"
                  : "border-[#22304a] bg-[#0f1624]"
              }`}
            >
              <div className="flex items-start gap-2">
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
                <div onClick={(e) => e.stopPropagation()} className="w-36 shrink-0">
                  <Field path={`subsystems.${subsystem.id}.fsm.states.${st.name}.onEnter.type`}>
                    <Select
                      value={st.onEnter.type}
                      className="h-8 text-xs"
                      onChange={(e) => {
                        const action = createActionForType(
                          e.target.value as SubsystemAction["type"],
                          st.name,
                        );
                        updateSubsystem(subsystem.id, (prev) => ({
                          ...prev,
                          fsm: {
                            ...prev.fsm,
                            states: prev.fsm.states.map((item, i) =>
                              i === idx ? { ...item, onEnter: action } : item,
                            ),
                          },
                        }));
                      }}
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
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={subsystem.fsm.states.length <= 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateSubsystem(subsystem.id, (prev) => ({
                      ...prev,
                      fsm: {
                        ...prev.fsm,
                        states: prev.fsm.states.filter((_, i) => i !== idx),
                      },
                    }));
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                </Button>
              </div>

              {st.onEnter.type !== "stop" && actionMeta && (
                <div className="space-y-2 pt-1" onClick={(e) => e.stopPropagation()}>
                  <div className="grid grid-cols-2 gap-2">
                    <Field
                      path={`subsystems.${subsystem.id}.fsm.states.${st.name}.onEnter.constantName`}
                      label={t("fsm.constant_name")}
                    >
                      <Input
                        value={st.onEnter.constantName}
                        className="font-mono h-8 text-xs"
                        onChange={(e) => {
                          const nextConst = toUpperSnake(e.target.value);
                          updateSubsystem(subsystem.id, (prev) => ({
                            ...prev,
                            fsm: {
                              ...prev.fsm,
                              states: prev.fsm.states.map((item, i) =>
                                i === idx && item.onEnter.type !== "stop"
                                  ? {
                                      ...item,
                                      onEnter: { ...item.onEnter, constantName: nextConst },
                                    }
                                  : item,
                              ),
                            },
                          }));
                        }}
                      />
                    </Field>
                    <Field
                      path={`subsystems.${subsystem.id}.fsm.states.${st.name}.onEnter.value`}
                      label={actionMeta.unit}
                    >
                      <UnitInput
                        unit={actionMeta.unit}
                        type="number"
                        step={actionMeta.step}
                        min={actionMeta.min}
                        max={actionMeta.max}
                        className="h-8 text-xs"
                        value={st.onEnter.value}
                        onChange={(e) => {
                          const raw = Number.parseFloat(e.target.value || "0") || 0;
                          const val = Math.min(actionMeta.max, Math.max(actionMeta.min, raw));
                          updateSubsystem(subsystem.id, (prev) => ({
                            ...prev,
                            fsm: {
                              ...prev.fsm,
                              states: prev.fsm.states.map((item, i) =>
                                i === idx && item.onEnter.type !== "stop"
                                  ? { ...item, onEnter: { ...item.onEnter, value: val } }
                                  : item,
                              ),
                            },
                          }));
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
                      value={st.onEnter.value}
                      onChange={(e) => {
                        const val = Number.parseFloat(e.target.value);
                        updateSubsystem(subsystem.id, (prev) => ({
                          ...prev,
                          fsm: {
                            ...prev.fsm,
                            states: prev.fsm.states.map((item, i) =>
                              i === idx && item.onEnter.type !== "stop"
                                ? { ...item, onEnter: { ...item.onEnter, value: val } }
                                : item,
                            ),
                          },
                        }));
                      }}
                      className="flex-1"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2 border-t border-[#22304a]/80 pt-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                    Transições ({(st.transitions ?? []).length}) · {t("fsm.timeout_sec")}
                  </span>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <Field
                      path={`subsystems.${subsystem.id}.fsm.states.${st.name}.timeoutAfterSec`}
                    >
                      <Input
                        type="number"
                        step={0.5}
                        min={0}
                        placeholder="Timeout (s)"
                        value={st.timeoutAfterSec ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value.trim();
                          const parsed =
                            raw === ""
                              ? undefined
                              : Math.max(0.1, Number.parseFloat(raw) || 0.1);
                          updateSubsystem(subsystem.id, (prev) => ({
                            ...prev,
                            fsm: {
                              ...prev.fsm,
                              states: prev.fsm.states.map((item, i) =>
                                i === idx ? { ...item, timeoutAfterSec: parsed } : item,
                              ),
                            },
                          }));
                        }}
                        className="h-7 w-20 font-mono text-[11px]"
                      />
                    </Field>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => {
                        const target =
                          subsystem.fsm.states.find((s) => s.name !== st.name)?.name ?? st.name;
                        const newTr: FsmTransition = {
                          id: `tr-${Date.now().toString(36)}`,
                          trigger: "atSetpoint",
                          targetState: target,
                        };
                        updateSubsystem(subsystem.id, (prev) => ({
                          ...prev,
                          fsm: {
                            ...prev.fsm,
                            states: prev.fsm.states.map((item, i) =>
                              i === idx
                                ? {
                                    ...item,
                                    transitions: [...(item.transitions ?? []), newTr],
                                  }
                                : item,
                            ),
                          },
                        }));
                      }}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {(st.transitions ?? []).map((tr, trIdx) => (
                  <div
                    key={tr.id}
                    onClick={(e) => e.stopPropagation()}
                    className="grid grid-cols-12 gap-1.5 items-center"
                  >
                    <Select
                      value={tr.trigger}
                      className="col-span-5 h-7 font-mono text-[11px]"
                      onChange={(e) => {
                        const nextTrigger = e.target.value as FsmTransition["trigger"];
                        updateSubsystem(subsystem.id, (prev) => ({
                          ...prev,
                          fsm: {
                            ...prev.fsm,
                            states: prev.fsm.states.map((item, i) =>
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
                                          }
                                        : tItem,
                                    ),
                                  }
                                : item,
                            ),
                          },
                        }));
                      }}
                    >
                      <option value="atSetpoint">atSetpoint()</option>
                      <option value="afterSeconds">afterSeconds(s)</option>
                      <option value="stalled">stalled()</option>
                      <option value="currentAbove">currentAbove(A)</option>
                    </Select>

                    {(tr.trigger === "afterSeconds" || tr.trigger === "currentAbove") && (
                      <Input
                        type="number"
                        step={tr.trigger === "afterSeconds" ? 0.1 : 1}
                        min={0.05}
                        value={tr.value ?? (tr.trigger === "afterSeconds" ? 0.5 : 35)}
                        className="col-span-2 h-7 font-mono text-[11px]"
                        onChange={(e) => {
                          const val = Math.max(
                            0.05,
                            Number.parseFloat(e.target.value || "0.5") || 0.5,
                          );
                          updateSubsystem(subsystem.id, (prev) => ({
                            ...prev,
                            fsm: {
                              ...prev.fsm,
                              states: prev.fsm.states.map((item, i) =>
                                i === idx
                                  ? {
                                      ...item,
                                      transitions: (item.transitions ?? []).map((tItem, ti) =>
                                        ti === trIdx ? { ...tItem, value: val } : tItem,
                                      ),
                                    }
                                  : item,
                              ),
                            },
                          }));
                        }}
                      />
                    )}

                    <Select
                      value={tr.targetState}
                      className={`${
                        tr.trigger === "afterSeconds" || tr.trigger === "currentAbove"
                          ? "col-span-4"
                          : "col-span-6"
                      } h-7 font-mono text-[11px]`}
                      onChange={(e) =>
                        updateSubsystem(subsystem.id, (prev) => ({
                          ...prev,
                          fsm: {
                            ...prev.fsm,
                            states: prev.fsm.states.map((item, i) =>
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
                          },
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
                        updateSubsystem(subsystem.id, (prev) => ({
                          ...prev,
                          fsm: {
                            ...prev.fsm,
                            states: prev.fsm.states.map((item, i) =>
                              i === idx
                                ? {
                                    ...item,
                                    transitions: (item.transitions ?? []).filter(
                                      (_, ti) => ti !== trIdx,
                                    ),
                                  }
                                : item,
                            ),
                          },
                        }))
                      }
                    >
                      <Trash2 className="h-3 w-3 text-rose-400" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
