"use client";

import React, { useState } from "react";
import { ChevronDown, Lightbulb, Plus, ScrollText, Trash2, Vibrate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useProject } from "@/context/project-context";
import { toUpperSnake } from "@/lib/generator/java-utils";
import { generateSuperStructureMermaid } from "@/lib/generator/mermaid";
import {
  isLedSubsystem,
  isMotorSubsystem,
  type ActionTiming,
  type LedPattern,
  type RumblePattern,
  type SuperStateEffect,
  type SuperTransition,
} from "@/lib/schema/ciprix-project";
import { RumblePreview } from "./fsm/rumble-preview";

export function SuperStructureTab() {
  const { project, updateProject, locale, t } = useProject();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [effectState, setEffectState] = useState(
    project.superstructure.states[0] ?? "IDLE",
  );
  const sup = project.superstructure;
  const motorSubsystems = project.subsystems.filter(isMotorSubsystem);
  const ledSubsystems = project.subsystems.filter(isLedSubsystem);
  const sensorOwners = project.subsystems.filter((s) => (s.sensors?.length ?? 0) > 0);
  const zones = project.zones ?? [];
  const activeEffectState = sup.states.includes(effectState)
    ? effectState
    : (sup.states[0] ?? "IDLE");
  const currentEffects = sup.stateEffects?.[activeEffectState] ?? [];

  const updateEffectsForState = (stateName: string, nextList: SuperStateEffect[]) => {
    updateProject((prev) => ({
      ...prev,
      superstructure: {
        ...prev.superstructure,
        stateEffects: {
          ...(prev.superstructure.stateEffects ?? {}),
          [stateName]: nextList,
        },
      },
    }));
  };

  const addRobotPair = () => {
    const idx = sup.states.length + 1;
    const req = `CUSTOM_REQ_${idx}`;
    const st = `CUSTOM_STATE_${idx}`;
    const defaultRow: Record<string, string> = {};
    for (const sub of motorSubsystems) {
      defaultRow[sub.id] = sub.fsm.initialRequest;
    }

    updateProject((prev) => ({
      ...prev,
      superstructure: {
        ...prev.superstructure,
        requests: [...prev.superstructure.requests, req],
        states: [...prev.superstructure.states, st],
        stateActions: { ...prev.superstructure.stateActions, [st]: defaultRow },
        bindings: [...prev.superstructure.bindings, { request: req, entryState: st }],
      },
    }));
  };

  return (
    <Card data-tour="superstructure-matrix">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0 border-b border-[#22304a] pb-4">
        <div>
          <CardTitle>{t("super.title")}</CardTitle>
          <CardDescription className="mt-1">{t("super.desc")}</CardDescription>
        </div>
        <Button size="sm" variant="primary" onClick={addRobotPair}>
          <Plus className="h-3.5 w-3.5" />
          {t("super.add_pair")}
        </Button>
      </CardHeader>

      <CardContent className="space-y-5 pt-6">
        <div className="space-y-3">
          <h3 className="font-mono text-xs uppercase tracking-wider text-slate-400">
            {t("super.matrix")}
          </h3>
          <div className="overflow-x-auto rounded-lg border border-[#22304a]">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-[#22304a] bg-[#0f1624] text-slate-300">
                <tr>
                  <th className="px-3.5 py-2.5 font-medium">RobotState</th>
                  {motorSubsystems.map((sub) => (
                    <th key={sub.id} className="px-3.5 py-2.5 font-medium">
                      {sub.name}Request
                    </th>
                  ))}
                  <th className="px-3 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#22304a]">
                {sup.states.map((stateName, rowIdx) => (
                  <tr key={`${stateName}-${rowIdx}`} className="bg-[#0f1624]/60 hover:bg-[#19253d]">
                    <td className="px-3.5 py-2.5">
                      <Input
                        value={stateName}
                        className="font-mono h-8 w-44 text-xs"
                        onChange={(e) => {
                          const nextName = toUpperSnake(e.target.value);
                          updateProject((prev) => {
                            const nextActions = { ...prev.superstructure.stateActions };
                            const row = nextActions[stateName] ?? {};
                            delete nextActions[stateName];
                            nextActions[nextName] = row;
                            return {
                              ...prev,
                              superstructure: {
                                ...prev.superstructure,
                                initialState:
                                  prev.superstructure.initialState === stateName
                                    ? nextName
                                    : prev.superstructure.initialState,
                                states: prev.superstructure.states.map((s, i) =>
                                  i === rowIdx ? nextName : s,
                                ),
                                stateActions: nextActions,
                                bindings: prev.superstructure.bindings.map((b) =>
                                  b.entryState === stateName ? { ...b, entryState: nextName } : b,
                                ),
                              },
                            };
                          });
                        }}
                      />
                    </td>
                    {motorSubsystems.map((sub) => {
                      const currentReq =
                        sup.stateActions[stateName]?.[sub.id] ?? sub.fsm.initialRequest;
                      return (
                        <td key={sub.id} className="px-3 py-2">
                          <Select
                            className="font-mono h-8 text-xs"
                            value={currentReq}
                            onChange={(e) =>
                              updateProject((prev) => ({
                                ...prev,
                                superstructure: {
                                  ...prev.superstructure,
                                  stateActions: {
                                    ...prev.superstructure.stateActions,
                                    [stateName]: {
                                      ...(prev.superstructure.stateActions[stateName] ?? {}),
                                      [sub.id]: e.target.value,
                                    },
                                  },
                                },
                              }))
                            }
                          >
                            {sub.fsm.requests.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </Select>
                        </td>
                      );
                    })}
                    <td className="px-2 py-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={sup.states.length <= 1}
                        onClick={() =>
                          updateProject((prev) => {
                            const nextActions = { ...prev.superstructure.stateActions };
                            delete nextActions[stateName];
                            return {
                              ...prev,
                              superstructure: {
                                ...prev.superstructure,
                                states: prev.superstructure.states.filter((_, i) => i !== rowIdx),
                                stateActions: nextActions,
                                bindings: prev.superstructure.bindings.filter(
                                  (b) => b.entryState !== stateName,
                                ),
                              },
                            };
                          })
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border-t border-[#22304a] pt-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Interlocks &amp; Sequenciamento (atGoal)
              </h3>
              <p className="text-[11px] text-slate-400">
                Transições automáticas da SuperStructure via <code className="font-mono text-[#93c5fd]">transitionTo / transitionAfter</code>.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={sup.states.length < 2}
              onClick={() => {
                const fromState = sup.states[0] ?? "IDLE";
                const toState = sup.states[1] ?? fromState;
                const newTr: SuperTransition = {
                  id: `str-${Date.now().toString(36)}`,
                  fromState,
                  toState,
                  condition: "allAtGoal",
                };
                updateProject((prev) => ({
                  ...prev,
                  superstructure: {
                    ...prev.superstructure,
                    transitions: [...(prev.superstructure.transitions ?? []), newTr],
                  },
                }));
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar Interlock
            </Button>
          </div>

          {(sup.transitions ?? []).length === 0 ? (
            <p className="rounded-lg border border-dashed border-[#22304a] bg-[#0b0f17] px-3 py-2.5 text-xs text-slate-400">
              Nenhum interlock configurado. Use <code className="font-mono text-slate-300">allAtGoal</code> para exigir que todos os subsistemas atinjam o alvo antes de disparar.
            </p>
          ) : (
            <div className="space-y-2">
              {(sup.transitions ?? []).map((tr, idx) => (
                <div
                  key={tr.id}
                  className="rounded-lg border border-[#22304a] bg-[#0f1624] p-2.5 space-y-2"
                >
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <Select
                      value={tr.fromState}
                      className="col-span-3 h-8 font-mono text-xs"
                      onChange={(e) =>
                        updateProject((prev) => ({
                          ...prev,
                          superstructure: {
                            ...prev.superstructure,
                            transitions: (prev.superstructure.transitions ?? []).map((item, i) =>
                              i === idx ? { ...item, fromState: e.target.value } : item,
                            ),
                          },
                        }))
                      }
                    >
                      {sup.states.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </Select>
                    <Select
                      value={tr.condition}
                      className="col-span-4 h-8 font-mono text-xs"
                      onChange={(e) => {
                        const cond = e.target.value as SuperTransition["condition"];
                        updateProject((prev) => ({
                          ...prev,
                          superstructure: {
                            ...prev.superstructure,
                            transitions: (prev.superstructure.transitions ?? []).map((item, i) =>
                              i === idx
                                ? {
                                    ...item,
                                    condition: cond,
                                    seconds: cond === "afterSeconds" ? item.seconds ?? 0.5 : undefined,
                                    subsystemIds:
                                      cond === "subsystemAtGoal"
                                        ? item.subsystemIds ??
                                          (project.subsystems[0] ? [project.subsystems[0].id] : [])
                                        : undefined,
                                    sensorOwnerId:
                                      cond === "sensorTrue" || cond === "sensorFalse"
                                        ? item.sensorOwnerId ?? sensorOwners[0]?.id
                                        : undefined,
                                    sensorId:
                                      cond === "sensorTrue" || cond === "sensorFalse"
                                        ? item.sensorId ?? sensorOwners[0]?.sensors?.[0]?.id
                                        : undefined,
                                    zoneId:
                                      cond === "inZone" || cond === "outOfZone"
                                        ? item.zoneId ?? zones[0]?.id
                                        : undefined,
                                  }
                                : item,
                            ),
                          },
                        }));
                      }}
                    >
                      <option value="allAtGoal">allAtGoal()</option>
                      <option value="subsystemAtGoal">subsystemAtGoal()</option>
                      <option value="afterSeconds">afterSeconds(s)</option>
                      {(sensorOwners.length > 0 || tr.condition === "sensorTrue" || tr.condition === "sensorFalse") && (
                        <>
                          <option value="sensorTrue">sensorTrue()</option>
                          <option value="sensorFalse">sensorFalse()</option>
                        </>
                      )}
                      {(zones.length > 0 || tr.condition === "inZone" || tr.condition === "outOfZone") && (
                        <>
                          <option value="inZone">inZone()</option>
                          <option value="outOfZone">outOfZone()</option>
                        </>
                      )}
                    </Select>
                    <Select
                      value={tr.toState}
                      className="col-span-3 h-8 font-mono text-xs"
                      onChange={(e) =>
                        updateProject((prev) => ({
                          ...prev,
                          superstructure: {
                            ...prev.superstructure,
                            transitions: (prev.superstructure.transitions ?? []).map((item, i) =>
                              i === idx ? { ...item, toState: e.target.value } : item,
                            ),
                          },
                        }))
                      }
                    >
                      {sup.states.map((st) => (
                        <option key={st} value={st}>
                          → {st}
                        </option>
                      ))}
                    </Select>
                    <div className="col-span-2 flex justify-end gap-1">
                      {tr.condition === "afterSeconds" && (
                        <Input
                          type="number"
                          step={0.1}
                          min={0.05}
                          value={tr.seconds ?? 0.5}
                          className="h-8 w-16 font-mono text-xs"
                          onChange={(e) => {
                            const secs = Math.max(0.05, Number.parseFloat(e.target.value || "0.5") || 0.5);
                            updateProject((prev) => ({
                              ...prev,
                              superstructure: {
                                ...prev.superstructure,
                                transitions: (prev.superstructure.transitions ?? []).map((item, i) =>
                                  i === idx ? { ...item, seconds: secs } : item,
                                ),
                              },
                            }));
                          }}
                        />
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          updateProject((prev) => ({
                            ...prev,
                            superstructure: {
                              ...prev.superstructure,
                              transitions: (prev.superstructure.transitions ?? []).filter(
                                (_, i) => i !== idx,
                              ),
                            },
                          }))
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                      </Button>
                    </div>
                  </div>
                  {(tr.condition === "sensorTrue" || tr.condition === "sensorFalse") && (
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#22304a]/70">
                      <Select
                        value={tr.sensorOwnerId ?? sensorOwners[0]?.id ?? ""}
                        className="h-7 font-mono text-[11px]"
                        onChange={(e) => {
                          const owner = sensorOwners.find((s) => s.id === e.target.value);
                          updateProject((prev) => ({
                            ...prev,
                            superstructure: {
                              ...prev.superstructure,
                              transitions: (prev.superstructure.transitions ?? []).map((item, i) =>
                                i === idx
                                  ? {
                                      ...item,
                                      sensorOwnerId: e.target.value,
                                      sensorId: owner?.sensors?.[0]?.id,
                                    }
                                  : item,
                              ),
                            },
                          }));
                        }}
                      >
                        {sensorOwners.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </Select>
                      <Select
                        value={tr.sensorId ?? ""}
                        className="h-7 font-mono text-[11px]"
                        onChange={(e) =>
                          updateProject((prev) => ({
                            ...prev,
                            superstructure: {
                              ...prev.superstructure,
                              transitions: (prev.superstructure.transitions ?? []).map((item, i) =>
                                i === idx ? { ...item, sensorId: e.target.value } : item,
                              ),
                            },
                          }))
                        }
                      >
                        {(sensorOwners.find((s) => s.id === tr.sensorOwnerId)?.sensors ?? []).map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}
                  {(tr.condition === "inZone" || tr.condition === "outOfZone") && (
                    <div className="pt-1 border-t border-[#22304a]/70">
                      <Select
                        value={tr.zoneId ?? zones[0]?.id ?? ""}
                        className="h-7 font-mono text-[11px]"
                        onChange={(e) =>
                          updateProject((prev) => ({
                            ...prev,
                            superstructure: {
                              ...prev.superstructure,
                              transitions: (prev.superstructure.transitions ?? []).map((item, i) =>
                                i === idx ? { ...item, zoneId: e.target.value } : item,
                              ),
                            },
                          }))
                        }
                      >
                        {zones.map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}
                  {tr.condition === "subsystemAtGoal" && (
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-[#22304a]/70">
                      {motorSubsystems.map((sub) => {
                        const checked = (tr.subsystemIds ?? []).includes(sub.id);
                        return (
                          <label
                            key={sub.id}
                            className="inline-flex items-center gap-1.5 rounded border border-[#253552] bg-[#0b0f17] px-2 py-1 text-[11px] font-mono text-slate-300 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const nextIds = e.target.checked
                                  ? [...(tr.subsystemIds ?? []), sub.id]
                                  : (tr.subsystemIds ?? []).filter((id) => id !== sub.id);
                                updateProject((prev) => ({
                                  ...prev,
                                  superstructure: {
                                    ...prev.superstructure,
                                    transitions: (prev.superstructure.transitions ?? []).map((item, i) =>
                                      i === idx ? { ...item, subsystemIds: nextIds } : item,
                                    ),
                                  },
                                }));
                              }}
                            />
                            {sub.name}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-[#22304a] pt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Efeitos Globais por RobotState (LEDs · Log · Rumble)
              </h3>
              <p className="text-[11px] text-slate-400">
                Conectados no RobotContainer via <code className="font-mono text-[#93c5fd]">superStructure.inState(...)</code> sem acoplar subsistemas.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Select
                value={activeEffectState}
                className="h-8 w-40 font-mono text-xs"
                onChange={(e) => setEffectState(e.target.value)}
              >
                {sup.states.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </Select>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  updateEffectsForState(activeEffectState, [
                    ...currentEffects,
                    {
                      id: `se-led-${Date.now().toString(36)}`,
                      kind: "leds",
                      when: "enter",
                      ledSubsystemId: ledSubsystems[0]?.id ?? "leds",
                      pattern: "solid",
                      colorHex: "#3b82f6",
                      periodSec: 0.5,
                      priority: 40,
                    },
                  ])
                }
              >
                <Lightbulb className="h-3.5 w-3.5 text-lime-300" />
                + LED
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  updateEffectsForState(activeEffectState, [
                    ...currentEffects,
                    {
                      id: `se-log-${Date.now().toString(36)}`,
                      kind: "log",
                      when: "enter",
                      key: `${activeEffectState}Event`,
                      level: "info",
                      message: `RobotState -> ${activeEffectState}`,
                      alertOnDriverStation: false,
                    },
                  ])
                }
              >
                <ScrollText className="h-3.5 w-3.5 text-amber-300" />
                + Log
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  updateEffectsForState(activeEffectState, [
                    ...currentEffects,
                    {
                      id: `se-rumble-${Date.now().toString(36)}`,
                      kind: "rumble",
                      when: "enter",
                      controller: "pilot",
                      pattern: "lightConfirm",
                      intensity: 0.6,
                      seconds: 0.3,
                      pulseCount: 2,
                      priority: 40,
                    },
                  ])
                }
              >
                <Vibrate className="h-3.5 w-3.5 text-cyan-300" />
                + Rumble
              </Button>
            </div>
          </div>

          {currentEffects.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[#22304a] bg-[#0b0f17] px-3 py-2 text-xs text-slate-400">
              Nenhum efeito global em <span className="font-mono text-slate-200">{activeEffectState}</span>.
            </p>
          ) : (
            <div className="space-y-2">
              {currentEffects.map((eff, effIdx) => (
                <div
                  key={eff.id}
                  className="space-y-2 rounded-lg border border-[#22304a] bg-[#0f1624] p-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] uppercase text-slate-200">
                      {eff.kind}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Select
                        value={eff.when}
                        className="h-7 w-28 font-mono text-[11px]"
                        onChange={(e) =>
                          updateEffectsForState(
                            activeEffectState,
                            currentEffects.map((item, i) =>
                              i === effIdx ? { ...item, when: e.target.value as ActionTiming } : item,
                            ),
                          )
                        }
                      >
                        <option value="enter">onEnter</option>
                        <option value="periodic">onUpdate</option>
                        <option value="exit">onExit</option>
                      </Select>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() =>
                          updateEffectsForState(
                            activeEffectState,
                            currentEffects.filter((_, i) => i !== effIdx),
                          )
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                      </Button>
                    </div>
                  </div>
                  {eff.kind === "leds" && (
                    <div className="grid grid-cols-4 gap-2">
                      <Select
                        value={eff.ledSubsystemId}
                        className="h-8 font-mono text-xs"
                        onChange={(e) =>
                          updateEffectsForState(
                            activeEffectState,
                            currentEffects.map((item, i) =>
                              i === effIdx && item.kind === "leds"
                                ? { ...item, ledSubsystemId: e.target.value }
                                : item,
                            ),
                          )
                        }
                      >
                        {ledSubsystems.length === 0 ? (
                          <option value={eff.ledSubsystemId}>{eff.ledSubsystemId}</option>
                        ) : (
                          ledSubsystems.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name}
                            </option>
                          ))
                        )}
                      </Select>
                      <Select
                        value={eff.pattern}
                        className="h-8 font-mono text-xs"
                        onChange={(e) =>
                          updateEffectsForState(
                            activeEffectState,
                            currentEffects.map((item, i) =>
                              i === effIdx && item.kind === "leds"
                                ? { ...item, pattern: e.target.value as LedPattern }
                                : item,
                            ),
                          )
                        }
                      >
                        <option value="solid">solid</option>
                        <option value="blink">blink</option>
                        <option value="breathe">breathe</option>
                        <option value="rainbow">rainbow</option>
                        <option value="progressBar">progressBar</option>
                        <option value="alliance">alliance</option>
                      </Select>
                      <Input
                        value={eff.colorHex}
                        className="h-8 font-mono text-xs"
                        onChange={(e) =>
                          updateEffectsForState(
                            activeEffectState,
                            currentEffects.map((item, i) =>
                              i === effIdx && item.kind === "leds"
                                ? { ...item, colorHex: e.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={eff.priority}
                        className="h-8 font-mono text-xs"
                        onChange={(e) =>
                          updateEffectsForState(
                            activeEffectState,
                            currentEffects.map((item, i) =>
                              i === effIdx && item.kind === "leds"
                                ? { ...item, priority: Math.min(100, Math.max(0, Number.parseInt(e.target.value || "40", 10) || 0)) }
                                : item,
                            ),
                          )
                        }
                      />
                    </div>
                  )}
                  {eff.kind === "log" && (
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        value={eff.key}
                        className="h-8 font-mono text-xs"
                        onChange={(e) =>
                          updateEffectsForState(
                            activeEffectState,
                            currentEffects.map((item, i) =>
                              i === effIdx && item.kind === "log" ? { ...item, key: e.target.value } : item,
                            ),
                          )
                        }
                      />
                      <Select
                        value={eff.level}
                        className="h-8 font-mono text-xs"
                        onChange={(e) =>
                          updateEffectsForState(
                            activeEffectState,
                            currentEffects.map((item, i) =>
                              i === effIdx && item.kind === "log"
                                ? { ...item, level: e.target.value as "info" | "warning" | "error" }
                                : item,
                            ),
                          )
                        }
                      >
                        <option value="info">INFO</option>
                        <option value="warning">WARNING</option>
                        <option value="error">ERROR</option>
                      </Select>
                      <Input
                        value={eff.message}
                        className="h-8 text-xs"
                        onChange={(e) =>
                          updateEffectsForState(
                            activeEffectState,
                            currentEffects.map((item, i) =>
                              i === effIdx && item.kind === "log" ? { ...item, message: e.target.value } : item,
                            ),
                          )
                        }
                      />
                    </div>
                  )}
                  {eff.kind === "rumble" && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-4 gap-2">
                        <Select
                          value={eff.controller}
                          className="h-8 font-mono text-xs"
                          onChange={(e) =>
                            updateEffectsForState(
                              activeEffectState,
                              currentEffects.map((item, i) =>
                                i === effIdx && item.kind === "rumble"
                                  ? { ...item, controller: e.target.value as "pilot" | "copilot" | "both" }
                                  : item,
                              ),
                            )
                          }
                        >
                          <option value="pilot">Piloto</option>
                          <option value="copilot">Copiloto</option>
                          <option value="both">Ambos</option>
                        </Select>
                        <Select
                          value={eff.pattern}
                          className="h-8 font-mono text-xs"
                          onChange={(e) =>
                            updateEffectsForState(
                              activeEffectState,
                              currentEffects.map((item, i) =>
                                i === effIdx && item.kind === "rumble"
                                  ? { ...item, pattern: e.target.value as RumblePattern }
                                  : item,
                              ),
                            )
                          }
                        >
                          <option value="continuous">continuous</option>
                          <option value="pulses">pulses</option>
                          <option value="zigZag">zigZag</option>
                          <option value="rampUp">rampUp</option>
                          <option value="lightConfirm">lightConfirm</option>
                          <option value="heavyWarning">heavyWarning</option>
                        </Select>
                        <Input
                          type="number"
                          step={0.05}
                          min={0.05}
                          max={5}
                          value={eff.seconds}
                          className="h-8 font-mono text-xs"
                          onChange={(e) =>
                            updateEffectsForState(
                              activeEffectState,
                              currentEffects.map((item, i) =>
                                i === effIdx && item.kind === "rumble"
                                  ? { ...item, seconds: Math.min(5, Math.max(0.05, Number.parseFloat(e.target.value || "0.3") || 0.3)) }
                                  : item,
                              ),
                            )
                          }
                        />
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={eff.priority}
                          className="h-8 font-mono text-xs"
                          onChange={(e) =>
                            updateEffectsForState(
                              activeEffectState,
                              currentEffects.map((item, i) =>
                                i === effIdx && item.kind === "rumble"
                                  ? { ...item, priority: Math.min(100, Math.max(0, Number.parseInt(e.target.value || "40", 10) || 0)) }
                                  : item,
                              ),
                            )
                          }
                        />
                      </div>
                      <RumblePreview
                        pattern={eff.pattern}
                        intensity={eff.intensity}
                        lightIntensity={eff.lightIntensity}
                        seconds={eff.seconds}
                        pulseCount={eff.pulseCount}
                        locale={locale}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-[#22304a] pt-4">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border border-[#22304a] bg-[#0f1624] px-4 py-2.5 text-left text-xs font-medium text-slate-200 hover:border-[#3b6bb5] cursor-pointer"
          >
            <span>Avançado (Request → State &amp; Mermaid)</span>
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform ${
                showAdvanced ? "rotate-180" : ""
              }`}
            />
          </button>

          {showAdvanced && (
            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <h3 className="font-mono text-xs uppercase tracking-wider text-slate-400">
                  {t("super.bindings")}
                </h3>
                <div className="space-y-2">
                  {sup.bindings.map((b, idx) => (
                    <div key={`${b.request}-${idx}`} className="grid grid-cols-2 gap-2">
                      <Input
                        value={b.request}
                        className="font-mono h-8 text-xs"
                        onChange={(e) => {
                          const nextReq = toUpperSnake(e.target.value);
                          const oldReq = b.request;
                          updateProject((prev) => ({
                            ...prev,
                            superstructure: {
                              ...prev.superstructure,
                              initialRequest:
                                prev.superstructure.initialRequest === oldReq
                                  ? nextReq
                                  : prev.superstructure.initialRequest,
                              requests: prev.superstructure.requests.map((r) =>
                                r === oldReq ? nextReq : r,
                              ),
                              bindings: prev.superstructure.bindings.map((item, i) =>
                                i === idx ? { ...item, request: nextReq } : item,
                              ),
                            },
                            controls: {
                              ...prev.controls,
                              pilotPriority: prev.controls.pilotPriority.map((p) =>
                                p.request === oldReq ? { ...p, request: nextReq } : p,
                              ),
                            },
                          }));
                        }}
                      />
                      <Select
                        className="font-mono h-8 text-xs"
                        value={b.entryState}
                        onChange={(e) =>
                          updateProject((prev) => ({
                            ...prev,
                            superstructure: {
                              ...prev.superstructure,
                              bindings: prev.superstructure.bindings.map((item, i) =>
                                i === idx ? { ...item, entryState: e.target.value } : item,
                              ),
                            },
                          }))
                        }
                      >
                        {sup.states.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-mono text-xs uppercase tracking-wider text-slate-400">
                  Mermaid (SuperStructure)
                </h3>
                <pre className="rounded-lg border border-[#22304a] bg-[#090e18] p-3.5 font-mono text-xs text-slate-300 overflow-x-auto">
                  {generateSuperStructureMermaid(project)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
