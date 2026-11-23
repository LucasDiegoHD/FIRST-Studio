"use client";

import React, { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { UnitInput } from "@/components/ui/unit-input";
import { useProject } from "@/context/project-context";
import { toPackageSegment, toUpperSnake } from "@/lib/generator/java-utils";
import { generateSubsystemMermaid } from "@/lib/generator/mermaid";
import type { MotorVendor, SubsystemAction, SubsystemConfig } from "@/lib/schema/ciprix-project";
import { CodeViewer } from "./code-viewer";

export type InspectorMode = "hardware" | "fsm" | "java";

function MiniStateDiagram({ subsystem }: { subsystem: SubsystemConfig }) {
  const states = subsystem.fsm.states;
  const width = 340;
  const rowH = 56;
  const height = Math.max(150, states.length * rowH + 28);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full rounded border border-[#171c26] bg-[#030508]">
      <defs>
        <marker id="insp-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#4f83cc" />
        </marker>
      </defs>

      <rect x={14} y={height / 2 - 14} width={72} height={28} rx={5} fill="#080d17" stroke="#1e2c44" />
      <text x={50} y={height / 2 + 4} textAnchor="middle" fill="#8fa2bf" fontSize={9} fontFamily="monospace">
        ANY
      </text>

      {states.map((st, idx) => {
        const y = 16 + idx * rowH;
        const isInitial = st.name === subsystem.fsm.initialState;
        const binding = subsystem.fsm.bindings.find((b) => b.entryState === st.name);

        return (
          <g key={st.name}>
            {binding && (
              <>
                <path
                  d={`M 86 ${height / 2} C 122 ${height / 2}, 122 ${y + 19}, 158 ${y + 19}`}
                  fill="none"
                  stroke="#264f8a"
                  strokeWidth={1.25}
                  markerEnd="url(#insp-arrow)"
                />
                <text x={122} y={y + 14} textAnchor="middle" fill="#7c98c2" fontSize={9} fontFamily="monospace">
                  {binding.request}
                </text>
              </>
            )}
            <rect
              x={162}
              y={y}
              width={164}
              height={38}
              rx={6}
              fill={isInitial ? "#0a1526" : "#070a11"}
              stroke={isInitial ? "#264f8a" : "#1a2232"}
            />
            <text x={172} y={y + 16} fill="#e2e8f0" fontSize={10} fontWeight="600" fontFamily="monospace">
              {st.name}
            </text>
            <text x={172} y={y + 30} fill="#6b7689" fontSize={9} fontFamily="monospace">
              {st.onEnter.type === "stop"
                ? "stop()"
                : `${st.onEnter.constantName} (${st.onEnter.value})`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function SubsystemInspector({
  mode,
  onModeChange,
}: {
  mode: InspectorMode;
  onModeChange: (mode: InspectorMode) => void;
}) {
  const {
    project,
    activeTab,
    selectedSubsystemId,
    generatedFiles,
    updateSubsystem,
    removeSubsystem,
    t,
  } = useProject();

  const [fsmView, setFsmView] = useState<"visual" | "mermaid">("visual");
  const [selectedJavaIndex, setSelectedJavaIndex] = useState(0);

  const selected =
    project.subsystems.find((s) => s.id === selectedSubsystemId) ??
    project.subsystems[0] ??
    null;

  // Contextual Java preview when not in Architecture view
  const contextualFiles = useMemo(() => {
    if (activeTab === "superstructure") {
      return generatedFiles.filter((f) => f.path.endsWith("SuperStructure.java"));
    }
    if (activeTab === "controls") {
      return generatedFiles.filter(
        (f) => f.path.endsWith("SuperStructureCommands.java") || f.path.endsWith("RobotContainer.java"),
      );
    }
    if (activeTab === "project") {
      return generatedFiles.filter(
        (f) =>
          f.path.endsWith("Constants.java") ||
          f.path.endsWith("Robot.java") ||
          f.path.endsWith("wpilib_preferences.json"),
      );
    }
    if (!selected) return [];
    const subPkg = toPackageSegment(selected.name);
    return generatedFiles.filter((f) => f.path.includes(`/subsystems/${subPkg}/`));
  }, [activeTab, generatedFiles, selected]);

  if (activeTab !== "subsystems" && activeTab !== "fsm") {
    const file = contextualFiles[selectedJavaIndex] ?? contextualFiles[0];
    return (
      <aside className="flex h-full w-[390px] shrink-0 flex-col border-l border-[#171c26] bg-[#05070b]">
        <div className="flex items-center gap-1 border-b border-[#171c26] px-3 py-2">
          {contextualFiles.map((f, idx) => (
            <button
              key={f.path}
              type="button"
              onClick={() => setSelectedJavaIndex(idx)}
              className={`rounded px-2 py-1 font-mono text-[11px] transition-colors cursor-pointer ${
                (contextualFiles[selectedJavaIndex] ? selectedJavaIndex === idx : idx === 0)
                  ? "bg-[#142c4f] text-white"
                  : "text-[#7c8ba1] hover:text-slate-200"
              }`}
            >
              {f.path.split("/").pop()}
            </button>
          ))}
        </div>
        {file && <CodeViewer filePath={file.path} content={file.content} className="flex-1" />}
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-[390px] shrink-0 flex-col border-l border-[#171c26] bg-[#05070b]">
      {!selected ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-[#6b7689]">
          {t("subsystems.select_prompt")}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-[#171c26] px-3.5 py-2">
            <span className="truncate text-xs font-semibold text-slate-100">{selected.name}</span>
            <div className="flex rounded border border-[#1a2232] bg-[#000000] p-0.5">
              {(["hardware", "fsm", "java"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onModeChange(m)}
                  className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
                    mode === m ? "bg-[#142c4f] text-white" : "text-[#7c8ba1] hover:text-slate-200"
                  }`}
                >
                  {t(`inspector.${m}`)}
                </button>
              ))}
            </div>
          </div>

          {mode === "hardware" && (
            <div className="flex-1 overflow-y-auto divide-y divide-[#171c26] text-xs">
              <div className="space-y-3 p-4">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#8a94a6]">{t("subsystems.name")}</label>
                  <Input
                    value={selected.name}
                    className="font-mono"
                    onChange={(e) =>
                      updateSubsystem(selected.id, (prev) => ({
                        ...prev,
                        name: e.target.value.replace(/\s+/g, ""),
                      }))
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#8a94a6]">{t("subsystems.vendor")}</label>
                    <Select
                      value={selected.motor.vendor}
                      onChange={(e) =>
                        updateSubsystem(selected.id, (prev) => ({
                          ...prev,
                          motor: { ...prev.motor, vendor: e.target.value as MotorVendor },
                        }))
                      }
                    >
                      <option value="talonfx">Talon FX (Phoenix 6)</option>
                      <option value="sparkmax">SPARK MAX (REV)</option>
                      <option value="talonsrx">Talon SRX (Phoenix 5)</option>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#8a94a6]">{t("subsystems.can_id")}</label>
                    <UnitInput
                      unit="ID"
                      type="number"
                      min={0}
                      max={62}
                      value={selected.motor.canId}
                      onChange={(e) =>
                        updateSubsystem(selected.id, (prev) => ({
                          ...prev,
                          motor: {
                            ...prev.motor,
                            canId: Math.min(
                              62,
                              Math.max(0, Number.parseInt(e.target.value || "0", 10) || 0),
                            ),
                          },
                        }))
                      }
                    />
                  </div>
                </div>

                {selected.motor.vendor === "talonfx" && (
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#8a94a6]">{t("subsystems.can_bus")}</label>
                    <Input
                      value={selected.motor.canBus}
                      placeholder="rio"
                      className="font-mono"
                      onChange={(e) =>
                        updateSubsystem(selected.id, (prev) => ({
                          ...prev,
                          motor: { ...prev.motor, canBus: e.target.value },
                        }))
                      }
                    />
                  </div>
                )}
              </div>

              <div className="space-y-3 p-4">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#8a94a6]">{t("subsystems.current_limit")}</label>
                    <UnitInput
                      unit="A"
                      type="number"
                      min={1}
                      max={120}
                      value={selected.motor.currentLimitAmps}
                      onChange={(e) =>
                        updateSubsystem(selected.id, (prev) => ({
                          ...prev,
                          motor: {
                            ...prev.motor,
                            currentLimitAmps: Math.min(
                              120,
                              Math.max(1, Number.parseInt(e.target.value || "40", 10) || 40),
                            ),
                          },
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#8a94a6]">{t("subsystems.neutral_mode")}</label>
                    <Select
                      value={selected.motor.neutralMode}
                      onChange={(e) =>
                        updateSubsystem(selected.id, (prev) => ({
                          ...prev,
                          motor: { ...prev.motor, neutralMode: e.target.value as "coast" | "brake" },
                        }))
                      }
                    >
                      <option value="coast">Coast</option>
                      <option value="brake">Brake</option>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-xs text-slate-200">{t("subsystems.inverted")}</span>
                  <Switch
                    checked={selected.motor.inverted}
                    onCheckedChange={(checked) =>
                      updateSubsystem(selected.id, (prev) => ({
                        ...prev,
                        motor: { ...prev.motor, inverted: checked },
                      }))
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#8a94a6]">{t("subsystems.gear_ratio")}</label>
                    <UnitInput
                      unit=":1"
                      type="number"
                      step={0.1}
                      min={0.1}
                      value={selected.motor.gearRatio}
                      onChange={(e) =>
                        updateSubsystem(selected.id, (prev) => ({
                          ...prev,
                          motor: {
                            ...prev.motor,
                            gearRatio: Math.max(0.1, Number.parseFloat(e.target.value || "1") || 1),
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#8a94a6]">{t("subsystems.moi")}</label>
                    <UnitInput
                      unit="kg·m²"
                      type="number"
                      step={0.0005}
                      min={0.0001}
                      value={selected.motor.moiKgM2}
                      onChange={(e) =>
                        updateSubsystem(selected.id, (prev) => ({
                          ...prev,
                          motor: {
                            ...prev.motor,
                            moiKgM2: Math.max(
                              0.0001,
                              Number.parseFloat(e.target.value || "0.001") || 0.001,
                            ),
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-200">{t("subsystems.selftest_enable")}</span>
                  <Switch
                    checked={selected.selfTest.enabled}
                    onCheckedChange={(checked) =>
                      updateSubsystem(selected.id, (prev) => ({
                        ...prev,
                        selfTest: { ...prev.selfTest, enabled: checked },
                      }))
                    }
                  />
                </div>
                {selected.selfTest.enabled && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] text-[#8a94a6]">{t("subsystems.selftest_output")}</label>
                      <UnitInput
                        unit="%"
                        type="number"
                        step={0.05}
                        min={-1}
                        max={1}
                        value={selected.selfTest.output}
                        onChange={(e) =>
                          updateSubsystem(selected.id, (prev) => ({
                            ...prev,
                            selfTest: {
                              ...prev.selfTest,
                              output: Math.min(
                                1,
                                Math.max(-1, Number.parseFloat(e.target.value || "0.3") || 0.3),
                              ),
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-[#8a94a6]">{t("subsystems.selftest_min_rps")}</label>
                      <UnitInput
                        unit="RPS"
                        type="number"
                        step={0.5}
                        min={0}
                        value={selected.selfTest.minVelocityRps}
                        onChange={(e) =>
                          updateSubsystem(selected.id, (prev) => ({
                            ...prev,
                            selfTest: {
                              ...prev.selfTest,
                              minVelocityRps: Math.max(
                                0,
                                Number.parseFloat(e.target.value || "5") || 5,
                              ),
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4">
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => removeSubsystem(selected.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t("subsystems.remove")}
                </Button>
              </div>
            </div>
          )}

          {mode === "fsm" && (
            <div className="flex-1 overflow-y-auto divide-y divide-[#171c26] text-xs">
              <div className="grid grid-cols-2 gap-2.5 p-4">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#8a94a6]">{t("fsm.initial_state")}</label>
                  <Select
                    className="font-mono"
                    value={selected.fsm.initialState}
                    onChange={(e) =>
                      updateSubsystem(selected.id, (prev) => ({
                        ...prev,
                        fsm: { ...prev.fsm, initialState: e.target.value },
                      }))
                    }
                  >
                    {selected.fsm.states.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#8a94a6]">{t("fsm.initial_request")}</label>
                  <Select
                    className="font-mono"
                    value={selected.fsm.initialRequest}
                    onChange={(e) =>
                      updateSubsystem(selected.id, (prev) => ({
                        ...prev,
                        fsm: { ...prev.fsm, initialRequest: e.target.value },
                      }))
                    }
                  >
                    {selected.fsm.requests.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="space-y-2.5 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[#8a94a6]">
                    {t("fsm.states_title")}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const stateName = `STATE_${selected.fsm.states.length + 1}`;
                      updateSubsystem(selected.id, (prev) => ({
                        ...prev,
                        fsm: {
                          ...prev.fsm,
                          states: [...prev.fsm.states, { name: stateName, onEnter: { type: "stop" } }],
                        },
                      }));
                    }}
                  >
                    <Plus className="h-3 w-3" />
                    {t("fsm.add_state")}
                  </Button>
                </div>

                {selected.fsm.states.map((st, idx) => (
                  <div
                    key={`${st.name}-${idx}`}
                    className="space-y-2 rounded border border-[#171c26] bg-[#070a10] p-2.5"
                  >
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={st.name}
                        className="font-mono h-7"
                        onChange={(e) => {
                          const nextName = toUpperSnake(e.target.value);
                          const oldName = st.name;
                          updateSubsystem(selected.id, (prev) => ({
                            ...prev,
                            fsm: {
                              ...prev.fsm,
                              initialState:
                                prev.fsm.initialState === oldName ? nextName : prev.fsm.initialState,
                              states: prev.fsm.states.map((item, i) =>
                                i === idx ? { ...item, name: nextName } : item,
                              ),
                              bindings: prev.fsm.bindings.map((b) => ({
                                ...b,
                                entryState: b.entryState === oldName ? nextName : b.entryState,
                                goalState: b.goalState === oldName ? nextName : b.goalState,
                              })),
                            },
                          }));
                        }}
                      />
                      <Select
                        value={st.onEnter.type}
                        className="w-36 h-7"
                        onChange={(e) => {
                          const action: SubsystemAction =
                            e.target.value === "stop"
                              ? { type: "stop" }
                              : {
                                  type: "percentOutput",
                                  constantName: `${st.name}_OUTPUT`,
                                  value: 0.5,
                                };
                          updateSubsystem(selected.id, (prev) => ({
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
                      </Select>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={selected.fsm.states.length <= 1}
                        onClick={() =>
                          updateSubsystem(selected.id, (prev) => ({
                            ...prev,
                            fsm: {
                              ...prev.fsm,
                              states: prev.fsm.states.filter((_, i) => i !== idx),
                            },
                          }))
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                      </Button>
                    </div>

                    {st.onEnter.type === "percentOutput" && (
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={st.onEnter.constantName}
                          className="font-mono h-7"
                          onChange={(e) => {
                            const nextConst = toUpperSnake(e.target.value);
                            updateSubsystem(selected.id, (prev) => ({
                              ...prev,
                              fsm: {
                                ...prev.fsm,
                                states: prev.fsm.states.map((item, i) =>
                                  i === idx && item.onEnter.type === "percentOutput"
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
                        <UnitInput
                          unit="pct"
                          type="number"
                          step={0.05}
                          min={-1}
                          max={1}
                          className="h-7"
                          value={st.onEnter.value}
                          onChange={(e) => {
                            const val = Math.min(
                              1,
                              Math.max(-1, Number.parseFloat(e.target.value || "0") || 0),
                            );
                            updateSubsystem(selected.id, (prev) => ({
                              ...prev,
                              fsm: {
                                ...prev.fsm,
                                states: prev.fsm.states.map((item, i) =>
                                  i === idx && item.onEnter.type === "percentOutput"
                                    ? { ...item, onEnter: { ...item.onEnter, value: val } }
                                    : item,
                                ),
                              },
                            }));
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[#8a94a6]">
                    {t("fsm.bindings_title")}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const reqName = `REQUEST_${selected.fsm.requests.length + 1}`;
                      const fallback = selected.fsm.states[0]?.name ?? selected.fsm.initialState;
                      updateSubsystem(selected.id, (prev) => ({
                        ...prev,
                        fsm: {
                          ...prev.fsm,
                          requests: [...prev.fsm.requests, reqName],
                          bindings: [
                            ...prev.fsm.bindings,
                            {
                              request: reqName,
                              entryState: fallback,
                              goalState: fallback,
                              intermediateStates: [],
                            },
                          ],
                        },
                      }));
                    }}
                  >
                    <Plus className="h-3 w-3" />
                    {t("fsm.add_binding")}
                  </Button>
                </div>

                {selected.fsm.bindings.map((binding, idx) => (
                  <div key={`${binding.request}-${idx}`} className="grid grid-cols-12 gap-1.5 items-center">
                    <Input
                      value={binding.request}
                      className="col-span-4 font-mono h-7"
                      onChange={(e) => {
                        const nextReq = toUpperSnake(e.target.value);
                        const oldReq = binding.request;
                        updateSubsystem(selected.id, (prev) => ({
                          ...prev,
                          fsm: {
                            ...prev.fsm,
                            initialRequest:
                              prev.fsm.initialRequest === oldReq ? nextReq : prev.fsm.initialRequest,
                            requests: prev.fsm.requests.map((r) => (r === oldReq ? nextReq : r)),
                            bindings: prev.fsm.bindings.map((b, i) =>
                              i === idx ? { ...b, request: nextReq } : b,
                            ),
                          },
                        }));
                      }}
                    />
                    <Select
                      value={binding.entryState}
                      className="col-span-3 font-mono h-7"
                      onChange={(e) =>
                        updateSubsystem(selected.id, (prev) => ({
                          ...prev,
                          fsm: {
                            ...prev.fsm,
                            bindings: prev.fsm.bindings.map((b, i) =>
                              i === idx ? { ...b, entryState: e.target.value } : b,
                            ),
                          },
                        }))
                      }
                    >
                      {selected.fsm.states.map((s) => (
                        <option key={s.name} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </Select>
                    <Select
                      value={binding.goalState}
                      className="col-span-4 font-mono h-7"
                      onChange={(e) =>
                        updateSubsystem(selected.id, (prev) => ({
                          ...prev,
                          fsm: {
                            ...prev.fsm,
                            bindings: prev.fsm.bindings.map((b, i) =>
                              i === idx ? { ...b, goalState: e.target.value } : b,
                            ),
                          },
                        }))
                      }
                    >
                      {selected.fsm.states.map((s) => (
                        <option key={s.name} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </Select>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="col-span-1"
                      disabled={selected.fsm.bindings.length <= 1}
                      onClick={() =>
                        updateSubsystem(selected.id, (prev) => ({
                          ...prev,
                          fsm: {
                            ...prev.fsm,
                            bindings: prev.fsm.bindings.filter((_, i) => i !== idx),
                            requests: prev.fsm.requests.filter((r) => r !== binding.request),
                          },
                        }))
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-2 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[#8a94a6]">{t("fsm.diagram_title")}</span>
                  <div className="flex rounded border border-[#1a2232] bg-[#000000] p-0.5">
                    <button
                      type="button"
                      onClick={() => setFsmView("visual")}
                      className={`px-2 py-0.5 text-[10px] rounded cursor-pointer ${
                        fsmView === "visual" ? "bg-[#142c4f] text-white" : "text-[#7c8ba1]"
                      }`}
                    >
                      {t("fsm.diagram_preview")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFsmView("mermaid")}
                      className={`px-2 py-0.5 text-[10px] rounded cursor-pointer ${
                        fsmView === "mermaid" ? "bg-[#142c4f] text-white" : "text-[#7c8ba1]"
                      }`}
                    >
                      {t("fsm.diagram_code")}
                    </button>
                  </div>
                </div>
                {fsmView === "visual" ? (
                  <MiniStateDiagram subsystem={selected} />
                ) : (
                  <pre className="rounded border border-[#171c26] bg-[#030508] p-3 font-mono text-[11px] text-slate-300 overflow-x-auto">
                    {generateSubsystemMermaid(selected)}
                  </pre>
                )}
              </div>
            </div>
          )}

          {mode === "java" && (
            <div className="flex flex-1 flex-col min-h-0">
              <div className="flex items-center gap-1 overflow-x-auto border-b border-[#171c26] px-2.5 py-1.5 shrink-0">
                {contextualFiles.map((f, idx) => (
                  <button
                    key={f.path}
                    type="button"
                    onClick={() => setSelectedJavaIndex(idx)}
                    className={`rounded px-2 py-0.5 font-mono text-[10px] whitespace-nowrap cursor-pointer ${
                      (contextualFiles[selectedJavaIndex] ? selectedJavaIndex === idx : idx === 0)
                        ? "bg-[#142c4f] text-white"
                        : "text-[#7c8ba1] hover:text-slate-200"
                    }`}
                  >
                    {f.path.split("/").pop()}
                  </button>
                ))}
              </div>
              {contextualFiles[selectedJavaIndex] ?? contextualFiles[0] ? (
                <CodeViewer
                  filePath={(contextualFiles[selectedJavaIndex] ?? contextualFiles[0]).path}
                  content={(contextualFiles[selectedJavaIndex] ?? contextualFiles[0]).content}
                  className="flex-1"
                />
              ) : null}
            </div>
          )}
        </>
      )}
    </aside>
  );
}
