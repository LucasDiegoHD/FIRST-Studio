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
import { ChevronDown, Code2, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="rounded-lg border border-[#3b6bb5] bg-[#131c2e] px-4 py-2.5 font-mono text-xs font-semibold text-[#93c5fd] shadow-lg">
      {data.label}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function FsmStateFlowNode({ data }: NodeProps<Node<FsmStateNodeData>>) {
  return (
    <div
      onClick={() => data.onSelect(data.label)}
      className={`w-[225px] rounded-lg border p-3.5 text-left transition-all cursor-pointer ${
        data.isActive
          ? "border-[#60a5fa] bg-[#142c4f] shadow-[0_0_24px_-6px_rgba(59,130,246,0.65)]"
          : data.isSelected
            ? "border-[#3b6bb5] bg-[#19253d]"
            : "border-[#253552] bg-[#131c2e] hover:border-[#3b6bb5]"
      }`}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center justify-between">
        <span className="font-mono text-[13px] font-semibold text-white">{data.label}</span>
        {data.isInitial && (
          <span className="rounded bg-[#142c4f] border border-[#3b6bb5]/70 px-1.5 py-0.5 font-mono text-[10px] uppercase text-[#93c5fd]">
            init
          </span>
        )}
      </div>
      <p className="mt-1.5 truncate font-mono text-[11px] text-slate-300">{data.actionLabel}</p>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const fsmNodeTypes = {
  anyState: AnyStateFlowNode,
  fsmState: FsmStateFlowNode,
};

export function StatesView({
  initialTarget = "subsystem",
}: {
  initialTarget?: "subsystem" | "superstructure";
}) {
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSuperJava, setShowSuperJava] = useState(false);
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
  const activeSimState =
    activeBinding?.goalState ?? activeBinding?.entryState ?? activeSub?.fsm.initialState;

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
        labelStyle: { fill: isFired ? "#ffffff" : "#94a3b8", fontSize: 11, fontFamily: "monospace" },
        labelBgStyle: { fill: isFired ? "#142c4f" : "#0f1624", fillOpacity: 0.95 },
        style: {
          stroke: isFired ? "#60a5fa" : "#2c3f61",
          strokeWidth: isFired ? 2.2 : 1.4,
        },
      };
    });
  }, [activeSub, activeRequest]);

  const superJavaFile = useMemo(
    () => generatedFiles.find((f) => f.path.endsWith("SuperStructure.java")),
    [generatedFiles],
  );

  const selectorActions = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[#22304a] bg-[#0f1624] p-1">
        {project.subsystems.map((sub) => (
          <button
            key={sub.id}
            type="button"
            onClick={() => {
              setSelectedSubsystemId(sub.id);
              setTarget("subsystem");
            }}
            className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-all cursor-pointer ${
              target === "subsystem" && activeSub?.id === sub.id
                ? "bg-[#142c4f] border border-[#60a5fa]/70 text-white"
                : "border border-transparent text-slate-300 hover:text-white"
            }`}
          >
            {sub.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setTarget("superstructure")}
          className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-all cursor-pointer ${
            target === "superstructure"
              ? "bg-[#142c4f] border border-[#60a5fa]/70 text-white"
              : "border border-transparent text-slate-300 hover:text-white"
          }`}
        >
          SuperStructure
        </button>
      </div>

      {target === "superstructure" && superJavaFile && (
        <Button
          size="sm"
          variant={showSuperJava ? "secondary" : "outline"}
          onClick={() => setShowSuperJava((v) => !v)}
        >
          <Code2 className="h-3.5 w-3.5" />
          {showSuperJava ? "Ocultar SuperStructure.java" : "Ver SuperStructure.java"}
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estados & SuperStructure"
        description="Defina os estados de cada subsistema e coordene ações globais na matriz da SuperStructure."
        actions={selectorActions}
      />

      {target === "superstructure" ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className={showSuperJava && superJavaFile ? "xl:col-span-7" : "xl:col-span-12"}>
            <SuperStructureTab />
          </div>
          {showSuperJava && superJavaFile && (
            <Card className="xl:col-span-5 h-[560px] flex flex-col overflow-hidden">
              <CodeViewer
                filePath={superJavaFile.path}
                content={superJavaFile.content}
                className="flex-1"
              />
            </Card>
          )}
        </div>
      ) : !activeSub ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16 text-sm text-slate-400">
            {t("fsm.no_subsystems")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left Interactive FSM Graph or Mermaid */}
          <Card className="xl:col-span-7 h-[540px] flex flex-col overflow-hidden">
            {showMermaid ? (
              <div className="flex flex-1 flex-col overflow-auto p-6 space-y-3 bg-[#0b0f17]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-slate-300">toMermaid()</span>
                  <Button size="sm" variant="outline" onClick={() => setShowMermaid(false)}>
                    {t("fsm.diagram_preview")}
                  </Button>
                </div>
                <pre className="rounded-lg border border-[#22304a] bg-[#131c2e] p-4 font-mono text-xs text-slate-200">
                  {generateSubsystemMermaid(activeSub)}
                </pre>
              </div>
            ) : (
              <div className="flex-1 min-h-0 h-full w-full bg-[#0b0f17]">
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
                    gap={24}
                    size={1}
                    color="rgba(148,163,184,0.14)"
                  />
                  <Controls showInteractive={false} />
                  <Panel position="top-left">
                    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[#2c3f61] bg-[#0f1624]/95 px-3 py-2 shadow-lg">
                      <span className="font-mono text-[11px] uppercase text-[#93c5fd] mr-1">
                        Disparar:
                      </span>
                      {activeSub.fsm.requests.map((req) => (
                        <button
                          key={req}
                          type="button"
                          onClick={() => setSimRequest(req)}
                          className={`rounded-md px-2.5 py-1 font-mono text-xs transition-all cursor-pointer ${
                            activeRequest === req
                              ? "bg-[#142c4f] border border-[#60a5fa] text-white"
                              : "border border-[#253552] bg-[#0b0f17] text-slate-300 hover:text-white"
                          }`}
                        >
                          {req}
                        </button>
                      ))}
                    </div>
                  </Panel>
                </ReactFlow>
              </div>
            )}
          </Card>

          {/* Right Essential States & Collapsed Advanced Bindings Editor */}
          <Card className="xl:col-span-5">
            <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-[#22304a] pb-4">
              <div className="flex items-center gap-2.5">
                <CardTitle>{t("fsm.states_title")}</CardTitle>
                <Badge variant="default">{activeSub.fsm.states.length}</Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
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
                <Plus className="h-3.5 w-3.5" />
                {t("fsm.add_state")}
              </Button>
            </CardHeader>

            <CardContent className="space-y-4 pt-5">
              <div className="space-y-3">
                {activeSub.fsm.states.map((st, idx) => (
                  <div
                    key={`${st.name}-${idx}`}
                    onClick={() => setSelectedStateName(st.name)}
                    className={`space-y-2.5 rounded-xl border p-3.5 transition-colors cursor-pointer ${
                      activeStateObj?.name === st.name
                        ? "border-[#60a5fa] bg-[#19253d]"
                        : "border-[#22304a] bg-[#0f1624]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        value={st.name}
                        className="font-mono h-8 text-xs"
                        onChange={(e) => {
                          const nextName = toUpperSnake(e.target.value);
                          const oldName = st.name;
                          updateSubsystem(activeSub.id, (prev) => ({
                            ...prev,
                            fsm: {
                              ...prev.fsm,
                              initialState:
                                prev.fsm.initialState === oldName
                                  ? nextName
                                  : prev.fsm.initialState,
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
                        className="w-32 h-8 text-xs"
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
                            className="font-mono h-8 text-xs"
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
                            className="h-8 text-xs"
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
                        <div className="flex items-center gap-2.5">
                          <span className="w-16 font-mono text-[11px] text-[#93c5fd]">
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

              {/* Collapsed-by-default Advanced: initialState, initialRequest, bindRequest, toMermaid() */}
              <div className="border-t border-[#22304a] pt-4">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="flex w-full items-center justify-between rounded-lg border border-[#22304a] bg-[#0f1624] px-3.5 py-2.5 text-left text-xs font-medium text-slate-200 hover:border-[#3b6bb5] cursor-pointer"
                >
                  <span>Avançado</span>
                  <span className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                    {activeSub.fsm.initialState} · {activeSub.fsm.bindings.length} bindings
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${
                        showAdvanced ? "rotate-180" : ""
                      }`}
                    />
                  </span>
                </button>

                {showAdvanced && (
                  <div className="mt-3 space-y-4 rounded-xl border border-[#22304a] bg-[#0f1624] p-3.5">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1.5">
                        <label className="text-xs text-slate-300">{t("fsm.initial_state")}</label>
                        <Select
                          className="font-mono h-8 text-xs"
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
                      <div className="space-y-1.5">
                        <label className="text-xs text-slate-300">{t("fsm.initial_request")}</label>
                        <Select
                          className="font-mono h-8 text-xs"
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

                    <div className="space-y-2.5 border-t border-[#22304a] pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-300">
                          {t("fsm.bindings_title")}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const reqName = `REQUEST_${activeSub.fsm.requests.length + 1}`;
                            const fallback =
                              activeSub.fsm.states[0]?.name ?? activeSub.fsm.initialState;
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
                          <Plus className="h-3.5 w-3.5" />
                          {t("fsm.add_binding")}
                        </Button>
                      </div>

                      {activeSub.fsm.bindings.map((binding, idx) => (
                        <div
                          key={`${binding.request}-${idx}`}
                          className="grid grid-cols-12 gap-1.5 items-center"
                        >
                          <Input
                            value={binding.request}
                            className="col-span-4 font-mono h-8 text-xs"
                            onChange={(e) => {
                              const nextReq = toUpperSnake(e.target.value);
                              const oldReq = binding.request;
                              updateSubsystem(activeSub.id, (prev) => ({
                                ...prev,
                                fsm: {
                                  ...prev.fsm,
                                  initialRequest:
                                    prev.fsm.initialRequest === oldReq
                                      ? nextReq
                                      : prev.fsm.initialRequest,
                                  requests: prev.fsm.requests.map((r) =>
                                    r === oldReq ? nextReq : r,
                                  ),
                                  bindings: prev.fsm.bindings.map((b, i) =>
                                    i === idx ? { ...b, request: nextReq } : b,
                                  ),
                                },
                              }));
                            }}
                          />
                          <Select
                            value={binding.entryState}
                            className="col-span-3 font-mono h-8 text-xs"
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
                            className="col-span-4 font-mono h-8 text-xs"
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

                    <div className="border-t border-[#22304a] pt-3">
                      <Button
                        size="sm"
                        variant={showMermaid ? "secondary" : "outline"}
                        className="w-full font-mono text-xs"
                        onClick={() => setShowMermaid((v) => !v)}
                      >
                        {showMermaid ? t("fsm.diagram_preview") : "toMermaid()"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
