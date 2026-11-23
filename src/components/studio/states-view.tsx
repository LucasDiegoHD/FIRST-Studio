"use client";

import "@xyflow/react/dist/style.css";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Panel,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type OnNodeDrag,
  type OnNodesChange,
} from "@xyflow/react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { UnitInput } from "@/components/ui/unit-input";
import { useProject } from "@/context/project-context";
import { toUpperSnake } from "@/lib/generator/java-utils";
import { generateSubsystemMermaid } from "@/lib/generator/mermaid";
import type { SubsystemAction } from "@/lib/schema/ciprix-project";
import { CodeViewer } from "./code-viewer";
import { SuperStructureTab } from "./superstructure-tab";

type FsmStateNodeData = {
  label: string;
  actionLabel: string;
  isInitial: boolean;
  isActive: boolean;
  isSelected: boolean;
  onSelect: (name: string) => void;
};

type AnyStateNodeData = {
  label: string;
};

function AnyStateFlowNode({ data }: NodeProps<Node<AnyStateNodeData>>) {
  return (
    <div className="rounded-md border border-[#264f8a] bg-[#081222] px-3.5 py-2 font-mono text-[11px] font-semibold text-[#93c5fd] shadow-[0_0_20px_-8px_rgba(37,99,235,0.6)]">
      {data.label}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function FsmStateFlowNode({ data }: NodeProps<Node<FsmStateNodeData>>) {
  return (
    <div
      onClick={() => data.onSelect(data.label)}
      className={`w-[215px] rounded-md border p-3 text-left transition-all cursor-pointer ${
        data.isActive
          ? "border-[#3b82f6] bg-[#142c4f]/80 shadow-[0_0_24px_-6px_rgba(59,130,246,0.7)]"
          : data.isSelected
            ? "border-[#264f8a] bg-[#0b182d]"
            : "border-[#1b2434] bg-[#060910] hover:border-[#2e4266]"
      }`}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-semibold text-white">{data.label}</span>
        {data.isInitial && (
          <span className="rounded bg-[#142c4f] px-1.5 py-0.5 font-mono text-[9px] uppercase text-[#93c5fd]">
            init
          </span>
        )}
      </div>
      <p className="mt-1.5 truncate font-mono text-[10px] text-[#8a94a6]">{data.actionLabel}</p>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const fsmNodeTypes = {
  anyState: AnyStateFlowNode,
  fsmState: FsmStateFlowNode,
};

export function StatesView({ initialTarget = "subsystem" }: { initialTarget?: "subsystem" | "superstructure" }) {
  const {
    project,
    selectedSubsystemId,
    setSelectedSubsystemId,
    generatedFiles,
    updateSubsystem,
    t,
  } = useProject();

  const [target, setTarget] = useState<"subsystem" | "superstructure">(initialTarget);
  const [selectedStateName, setSelectedStateName] = useState<string | null>(null);
  const [simRequest, setSimRequest] = useState<string | null>(null);
  const [showMermaid, setShowMermaid] = useState(false);
  const posRef = useRef<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    setTarget(initialTarget);
  }, [initialTarget]);

  const activeSub =
    project.subsystems.find((s) => s.id === selectedSubsystemId) ??
    project.subsystems[0] ??
    null;

  const activeRequest =
    simRequest && activeSub?.fsm.requests.includes(simRequest)
      ? simRequest
      : (activeSub?.fsm.initialRequest ?? null);

  const activeBinding = activeSub?.fsm.bindings.find((b) => b.request === activeRequest);
  const activeSimState = activeBinding?.goalState ?? activeBinding?.entryState ?? activeSub?.fsm.initialState;

  const activeStateObj =
    activeSub?.fsm.states.find((s) => s.name === selectedStateName) ??
    activeSub?.fsm.states[0] ??
    null;

  const computedNodes = useMemo<Node[]>(() => {
    if (!activeSub) return [];
    const anyPos = posRef.current["ANY_STATE"] ?? { x: 40, y: 120 };
    const list: Node[] = [
      {
        id: "ANY_STATE",
        type: "anyState",
        position: anyPos,
        data: { label: "ANY_STATE" },
      },
    ];

    activeSub.fsm.states.forEach((st, idx) => {
      const id = `state-${st.name}`;
      const pos = posRef.current[id] ?? { x: 290, y: 40 + idx * 105 };
      const actionLabel =
        st.onEnter.type === "stop"
          ? "onEnter: stop()"
          : `onEnter: ${st.onEnter.constantName} (${st.onEnter.value})`;

      list.push({
        id,
        type: "fsmState",
        position: pos,
        data: {
          label: st.name,
          actionLabel,
          isInitial: st.name === activeSub.fsm.initialState,
          isActive: st.name === activeSimState,
          isSelected: activeStateObj?.name === st.name,
          onSelect: setSelectedStateName,
        },
      });
    });

    return list;
  }, [activeSub, activeSimState, activeStateObj]);

  const [nodes, setNodes] = useState<Node[]>(computedNodes);
  useEffect(() => {
    setNodes(computedNodes);
  }, [computedNodes]);

  const onNodesChange: OnNodesChange<Node> = useCallback((changes) => {
    setNodes((nds) => changes.applyTo(nds));
  }, []);

  const onNodeDragStop: OnNodeDrag<Node> = useCallback((_event, node) => {
    posRef.current[node.id] = node.position;
  }, []);

  const edges = useMemo<Edge[]>(() => {
    if (!activeSub) return [];
    return activeSub.fsm.bindings.map((b, idx) => {
      const isFired = b.request === activeRequest;
      return {
        id: `e-bind-${b.request}-${idx}`,
        source: "ANY_STATE",
        target: `state-${b.entryState}`,
        label: b.request,
        animated: isFired,
        labelStyle: { fill: isFired ? "#ffffff" : "#8a94a6", fontSize: 10, fontFamily: "monospace" },
        labelBgStyle: { fill: isFired ? "#142c4f" : "#05070b", fillOpacity: 0.95 },
        style: {
          stroke: isFired ? "#3b82f6" : "#1e3150",
          strokeWidth: isFired ? 2.2 : 1.3,
        },
      };
    });
  }, [activeSub, activeRequest]);

  const superJavaFile = useMemo(
    () => generatedFiles.find((f) => f.path.endsWith("SuperStructure.java")),
    [generatedFiles],
  );

  return (
    <div className="flex h-full flex-col bg-black">
      {/* Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#172030] bg-[#05070b] px-4 py-2 shrink-0">
        <div className="flex flex-wrap items-center gap-1.5">
          {project.subsystems.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => {
                setSelectedSubsystemId(sub.id);
                setTarget("subsystem");
              }}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all cursor-pointer ${
                target === "subsystem" && activeSub?.id === sub.id
                  ? "bg-[#142c4f] border border-[#3b6bb5] text-white"
                  : "border border-[#1a2232] bg-black text-[#8a94a6] hover:text-white"
              }`}
            >
              {sub.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setTarget("superstructure")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-all cursor-pointer ${
              target === "superstructure"
                ? "bg-[#142c4f] border border-[#3b6bb5] text-white"
                : "border border-[#1a2232] bg-black text-[#8a94a6] hover:text-white"
            }`}
          >
            SuperStructure
          </button>
        </div>

        {target === "subsystem" && activeSub && (
          <button
            type="button"
            onClick={() => setShowMermaid((v) => !v)}
            className="font-mono text-[11px] text-[#7cb3ff] hover:text-white cursor-pointer"
          >
            {showMermaid ? t("fsm.diagram_preview") : "toMermaid()"}
          </button>
        )}
      </div>

      {target === "superstructure" ? (
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 min-w-0 overflow-hidden">
            <SuperStructureTab />
          </div>
          {superJavaFile && (
            <aside className="hidden lg:flex w-[390px] shrink-0 border-l border-[#172030]">
              <CodeViewer
                filePath={superJavaFile.path}
                content={superJavaFile.content}
                className="w-full"
              />
            </aside>
          )}
        </div>
      ) : !activeSub ? (
        <div className="flex flex-1 items-center justify-center p-8 text-xs text-[#6b7689]">
          {t("fsm.no_subsystems")}
        </div>
      ) : (
        <div className="flex flex-1 min-h-0">
          {/* Left Interactive FSM Graph or Mermaid */}
          <div className="relative flex-1 min-w-0 h-full">
            {showMermaid ? (
              <div className="h-full overflow-auto p-6">
                <pre className="rounded border border-[#172030] bg-[#030508] p-4 font-mono text-xs text-slate-200">
                  {generateSubsystemMermaid(activeSub)}
                </pre>
              </div>
            ) : (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onNodeDragStop={onNodeDragStop}
                nodeTypes={fsmNodeTypes}
                fitView
                fitViewOptions={{ padding: 0.25 }}
              >
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={22}
                  size={1}
                  color="rgba(255,255,255,0.09)"
                />
                <Controls showInteractive={false} />
                <Panel position="top-left">
                  <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-[#264f8a]/70 bg-[#050811]/95 px-2.5 py-1.5 shadow-lg">
                    <span className="font-mono text-[10px] uppercase text-[#7cb3ff] mr-1">
                      Disparar:
                    </span>
                    {activeSub.fsm.requests.map((req) => (
                      <button
                        key={req}
                        type="button"
                        onClick={() => setSimRequest(req)}
                        className={`rounded px-2 py-0.5 font-mono text-[11px] transition-all cursor-pointer ${
                          activeRequest === req
                            ? "bg-[#142c4f] border border-[#3b82f6] text-white"
                            : "border border-[#1a2232] bg-black text-[#8a94a6] hover:text-white"
                        }`}
                      >
                        {req}
                      </button>
                    ))}
                  </div>
                </Panel>
              </ReactFlow>
            )}
          </div>

          {/* Right State & Bindings Editor */}
          <aside className="flex h-full w-[380px] shrink-0 flex-col overflow-y-auto border-l border-[#172030] bg-[#05070b] divide-y divide-[#172030] text-xs">
            <div className="grid grid-cols-2 gap-2.5 p-4">
              <div className="space-y-1">
                <label className="text-[11px] text-[#8a94a6]">{t("fsm.initial_state")}</label>
                <Select
                  className="font-mono"
                  value={activeSub.fsm.initialState}
                  onChange={(e) =>
                    updateSubsystem(activeSub.id, (prev) => ({
                      ...prev,
                      fsm: { ...prev.fsm, initialState: e.target.value },
                    }))
                  }
                >
                  {activeSub.fsm.states.map((s) => (
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
                  value={activeSub.fsm.initialRequest}
                  onChange={(e) =>
                    updateSubsystem(activeSub.id, (prev) => ({
                      ...prev,
                      fsm: { ...prev.fsm, initialRequest: e.target.value },
                    }))
                  }
                >
                  {activeSub.fsm.requests.map((r) => (
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
                    const stateName = `STATE_${activeSub.fsm.states.length + 1}`;
                    updateSubsystem(activeSub.id, (prev) => ({
                      ...prev,
                      fsm: {
                        ...prev.fsm,
                        states: [...prev.fsm.states, { name: stateName, onEnter: { type: "stop" } }],
                      },
                    }));
                    setSelectedStateName(stateName);
                  }}
                >
                  <Plus className="h-3 w-3" />
                  {t("fsm.add_state")}
                </Button>
              </div>

              {activeSub.fsm.states.map((st, idx) => (
                <div
                  key={`${st.name}-${idx}`}
                  onClick={() => setSelectedStateName(st.name)}
                  className={`space-y-2 rounded-md border p-2.5 transition-colors ${
                    activeStateObj?.name === st.name
                      ? "border-[#3b6bb5] bg-[#0a1526]"
                      : "border-[#172030] bg-[#070a10]"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={st.name}
                      className="font-mono h-7"
                      onChange={(e) => {
                        const nextName = toUpperSnake(e.target.value);
                        const oldName = st.name;
                        updateSubsystem(activeSub.id, (prev) => ({
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
                        setSelectedStateName(nextName);
                      }}
                    />
                    <Select
                      value={st.onEnter.type}
                      className="w-32 h-7"
                      onChange={(e) => {
                        const action: SubsystemAction =
                          e.target.value === "stop"
                            ? { type: "stop" }
                            : {
                                type: "percentOutput",
                                constantName: `${st.name}_OUTPUT`,
                                value: 0.5,
                              };
                        updateSubsystem(activeSub.id, (prev) => ({
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
                      disabled={activeSub.fsm.states.length <= 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateSubsystem(activeSub.id, (prev) => ({
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

                  {st.onEnter.type === "percentOutput" && (
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={st.onEnter.constantName}
                          className="font-mono h-7"
                          onChange={(e) => {
                            const nextConst = toUpperSnake(e.target.value);
                            updateSubsystem(activeSub.id, (prev) => ({
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
                            updateSubsystem(activeSub.id, (prev) => ({
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
                      <div className="flex items-center gap-2">
                        <span className="w-14 font-mono text-[10px] text-[#7cb3ff]">
                          {st.onEnter.value >= 0 ? "FWD" : "REV"}{" "}
                          {Math.round(st.onEnter.value * 100)}%
                        </span>
                        <input
                          type="range"
                          min={-1}
                          max={1}
                          step={0.05}
                          value={st.onEnter.value}
                          onChange={(e) => {
                            const val = Number.parseFloat(e.target.value);
                            updateSubsystem(activeSub.id, (prev) => ({
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
                          className="flex-1"
                        />
                      </div>
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
                    const reqName = `REQUEST_${activeSub.fsm.requests.length + 1}`;
                    const fallback = activeSub.fsm.states[0]?.name ?? activeSub.fsm.initialState;
                    updateSubsystem(activeSub.id, (prev) => ({
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

              {activeSub.fsm.bindings.map((binding, idx) => (
                <div key={`${binding.request}-${idx}`} className="grid grid-cols-12 gap-1.5 items-center">
                  <Input
                    value={binding.request}
                    className="col-span-4 font-mono h-7"
                    onChange={(e) => {
                      const nextReq = toUpperSnake(e.target.value);
                      const oldReq = binding.request;
                      updateSubsystem(activeSub.id, (prev) => ({
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
                      updateSubsystem(activeSub.id, (prev) => ({
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
                    {activeSub.fsm.states.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={binding.goalState}
                    className="col-span-4 font-mono h-7"
                    onChange={(e) =>
                      updateSubsystem(activeSub.id, (prev) => ({
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
                    {activeSub.fsm.states.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="col-span-1"
                    disabled={activeSub.fsm.bindings.length <= 1}
                    onClick={() =>
                      updateSubsystem(activeSub.id, (prev) => ({
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
          </aside>
        </div>
      )}
    </div>
  );
}
