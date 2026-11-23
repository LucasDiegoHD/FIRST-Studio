"use client";

import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useProject } from "@/context/project-context";
import { toUpperSnake } from "@/lib/generator/java-utils";
import { generateSubsystemMermaid } from "@/lib/generator/mermaid";
import type { SubsystemAction, SubsystemConfig } from "@/lib/schema/ciprix-project";

function StateDiagramPreview({ subsystem }: { subsystem: SubsystemConfig }) {
  const states = subsystem.fsm.states;
  const width = 460;
  const rowHeight = 76;
  const height = Math.max(220, states.length * rowHeight + 48);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full rounded-lg border border-slate-800 bg-slate-950/70">
      <defs>
        <marker id="fsm-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
        </marker>
      </defs>

      <circle cx={42} cy={46} r={7} fill="#38bdf8" />
      <rect
        x={24}
        y={height / 2 - 20}
        width={92}
        height={40}
        rx={8}
        fill="#1e293b"
        stroke="#475569"
      />
      <text x={70} y={height / 2 + 4} textAnchor="middle" fill="#cbd5e1" fontSize={11} fontFamily="monospace">
        ANY_STATE
      </text>

      {states.map((st, idx) => {
        const y = 26 + idx * rowHeight;
        const isInitial = st.name === subsystem.fsm.initialState;
        const binding = subsystem.fsm.bindings.find((b) => b.entryState === st.name);

        return (
          <g key={st.name}>
            {isInitial && (
              <line
                x1={49}
                y1={46}
                x2={215}
                y2={y + 24}
                stroke="#38bdf8"
                strokeWidth={1.5}
                markerEnd="url(#fsm-arrow)"
              />
            )}
            {binding && (
              <>
                <path
                  d={`M 116 ${height / 2} C 165 ${height / 2}, 165 ${y + 24}, 215 ${y + 24}`}
                  fill="none"
                  stroke="#38bdf8"
                  strokeOpacity={0.75}
                  strokeWidth={1.5}
                  markerEnd="url(#fsm-arrow)"
                />
                <text x={165} y={y + 18} textAnchor="middle" fill="#7dd3fc" fontSize={10} fontFamily="monospace">
                  {binding.request}
                </text>
              </>
            )}

            <rect
              x={220}
              y={y}
              width={210}
              height={48}
              rx={10}
              fill="#0f172a"
              stroke={isInitial ? "#38bdf8" : "#334155"}
              strokeWidth={isInitial ? 2 : 1.2}
            />
            <text x={234} y={y + 20} fill="#f8fafc" fontSize={12} fontWeight="600" fontFamily="monospace">
              {st.name}
            </text>
            <text x={234} y={y + 37} fill="#94a3b8" fontSize={10} fontFamily="monospace">
              {st.onEnter.type === "stop"
                ? "onEnter: stop()"
                : `onEnter: ${st.onEnter.constantName} (${st.onEnter.value})`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function FsmTab() {
  const { project, selectedSubsystemId, setSelectedSubsystemId, updateSubsystem, t } = useProject();
  const [diagramView, setDiagramView] = useState<"visual" | "mermaid">("visual");

  const active =
    project.subsystems.find((s) => s.id === selectedSubsystemId) ??
    project.subsystems[0] ??
    null;

  if (!active) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-slate-400">
          {t("fsm.no_subsystems")}
        </CardContent>
      </Card>
    );
  }

  const mermaidText = generateSubsystemMermaid(active);

  const addState = () => {
    const idx = active.fsm.states.length + 1;
    const stateName = `STATE_${idx}`;
    updateSubsystem(active.id, (prev) => ({
      ...prev,
      fsm: {
        ...prev.fsm,
        states: [...prev.fsm.states, { name: stateName, onEnter: { type: "stop" } }],
      },
    }));
  };

  const addBinding = () => {
    const idx = active.fsm.requests.length + 1;
    const reqName = `REQUEST_${idx}`;
    const fallbackState = active.fsm.states[0]?.name ?? active.fsm.initialState;
    updateSubsystem(active.id, (prev) => ({
      ...prev,
      fsm: {
        ...prev.fsm,
        requests: [...prev.fsm.requests, reqName],
        bindings: [
          ...prev.fsm.bindings,
          {
            request: reqName,
            entryState: fallbackState,
            goalState: fallbackState,
            intermediateStates: [],
          },
        ],
      },
    }));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400">{t("fsm.select_subsystem")}:</span>
          <Select
            className="w-52"
            value={active.id}
            onChange={(e) => setSelectedSubsystemId(e.target.value)}
          >
            {project.subsystems.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400">{t("fsm.initial_state")}:</span>
          <Select
            className="w-40 font-mono"
            value={active.fsm.initialState}
            onChange={(e) =>
              updateSubsystem(active.id, (prev) => ({
                ...prev,
                fsm: { ...prev.fsm, initialState: e.target.value },
              }))
            }
          >
            {active.fsm.states.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400">{t("fsm.initial_request")}:</span>
          <Select
            className="w-40 font-mono"
            value={active.fsm.initialRequest}
            onChange={(e) =>
              updateSubsystem(active.id, (prev) => ({
                ...prev,
                fsm: { ...prev.fsm, initialRequest: e.target.value },
              }))
            }
          >
            {active.fsm.requests.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-5">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>{t("fsm.states_title")}</CardTitle>
              <Button size="sm" onClick={addState}>
                <Plus className="h-3.5 w-3.5" />
                {t("fsm.add_state")}
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {active.fsm.states.map((st, idx) => (
                <div
                  key={`${st.name}-${idx}`}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-2.5"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      value={st.name}
                      className="font-mono text-xs"
                      onChange={(e) => {
                        const nextName = toUpperSnake(e.target.value);
                        const oldName = st.name;
                        updateSubsystem(active.id, (prev) => ({
                          ...prev,
                          fsm: {
                            ...prev.fsm,
                            initialState: prev.fsm.initialState === oldName ? nextName : prev.fsm.initialState,
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
                      className="w-48"
                      onChange={(e) => {
                        const action: SubsystemAction =
                          e.target.value === "stop"
                            ? { type: "stop" }
                            : {
                                type: "percentOutput",
                                constantName: `${st.name}_OUTPUT`,
                                value: 0.5,
                              };
                        updateSubsystem(active.id, (prev) => ({
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
                      disabled={active.fsm.states.length <= 1}
                      onClick={() =>
                        updateSubsystem(active.id, (prev) => ({
                          ...prev,
                          fsm: {
                            ...prev.fsm,
                            states: prev.fsm.states.filter((_, i) => i !== idx),
                          },
                        }))
                      }
                    >
                      <Trash2 className="h-4 w-4 text-rose-400" />
                    </Button>
                  </div>

                  {st.onEnter.type === "percentOutput" && (
                    <div className="grid grid-cols-2 gap-2.5">
                      <Input
                        value={st.onEnter.constantName}
                        className="font-mono text-xs"
                        placeholder={t("fsm.constant_name")}
                        onChange={(e) => {
                          const nextConst = toUpperSnake(e.target.value);
                          updateSubsystem(active.id, (prev) => ({
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
                      <Input
                        type="number"
                        step={0.05}
                        min={-1}
                        max={1}
                        value={st.onEnter.value}
                        onChange={(e) => {
                          const val = Math.min(1, Math.max(-1, Number.parseFloat(e.target.value || "0") || 0));
                          updateSubsystem(active.id, (prev) => ({
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>{t("fsm.bindings_title")}</CardTitle>
              <Button size="sm" onClick={addBinding}>
                <Plus className="h-3.5 w-3.5" />
                {t("fsm.add_binding")}
              </Button>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {active.fsm.bindings.map((binding, idx) => (
                <div key={`${binding.request}-${idx}`} className="grid grid-cols-12 items-center gap-2">
                  <Input
                    value={binding.request}
                    className="col-span-4 font-mono text-xs"
                    onChange={(e) => {
                      const nextReq = toUpperSnake(e.target.value);
                      const oldReq = binding.request;
                      updateSubsystem(active.id, (prev) => ({
                        ...prev,
                        fsm: {
                          ...prev.fsm,
                          initialRequest: prev.fsm.initialRequest === oldReq ? nextReq : prev.fsm.initialRequest,
                          requests: prev.fsm.requests.map((r) => (r === oldReq ? nextReq : r)),
                          bindings: prev.fsm.bindings.map((b, i) =>
                            i === idx ? { ...b, request: nextReq } : b,
                          ),
                        },
                      }));
                    }}
                  />
                  <Select
                    className="col-span-3 font-mono text-xs"
                    value={binding.entryState}
                    onChange={(e) =>
                      updateSubsystem(active.id, (prev) => ({
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
                    {active.fsm.states.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                  <Select
                    className="col-span-4 font-mono text-xs"
                    value={binding.goalState}
                    onChange={(e) =>
                      updateSubsystem(active.id, (prev) => ({
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
                    {active.fsm.states.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="col-span-1"
                    disabled={active.fsm.bindings.length <= 1}
                    onClick={() =>
                      updateSubsystem(active.id, (prev) => ({
                        ...prev,
                        fsm: {
                          ...prev.fsm,
                          bindings: prev.fsm.bindings.filter((_, i) => i !== idx),
                          requests: prev.fsm.requests.filter((r) => r !== binding.request),
                        },
                      }))
                    }
                  >
                    <Trash2 className="h-4 w-4 text-rose-400" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Live diagram + Mermaid source */}
        <Card className="lg:col-span-5 h-fit">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <CardTitle>{t("fsm.diagram_title")}</CardTitle>
              <Badge variant="info">stateDiagram-v2</Badge>
            </div>
            <div className="flex rounded-md border border-slate-800 p-0.5 bg-slate-950">
              <button
                type="button"
                onClick={() => setDiagramView("visual")}
                className={`px-2.5 py-1 text-xs rounded cursor-pointer ${
                  diagramView === "visual" ? "bg-sky-500/20 text-sky-300" : "text-slate-400"
                }`}
              >
                {t("fsm.diagram_preview")}
              </button>
              <button
                type="button"
                onClick={() => setDiagramView("mermaid")}
                className={`px-2.5 py-1 text-xs rounded cursor-pointer ${
                  diagramView === "mermaid" ? "bg-sky-500/20 text-sky-300" : "text-slate-400"
                }`}
              >
                {t("fsm.diagram_code")}
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {diagramView === "visual" ? (
              <StateDiagramPreview subsystem={active} />
            ) : (
              <pre className="rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-sky-200 overflow-x-auto">
                {mermaidText}
              </pre>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
