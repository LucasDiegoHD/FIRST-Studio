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
import { AlertTriangle, Code2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useProject } from "@/context/project-context";
import { generateSubsystemMermaid } from "@/lib/generator/mermaid";
import {
  getPrimaryMotorAction,
  isMotorSubsystem,
  type FsmState,
  type SubsystemAction,
} from "@/lib/schema/ciprix-project";
import { CodeViewer } from "./code-viewer";
import { BindingsPanel } from "./fsm/bindings-panel";
import { RequestsPanel } from "./fsm/requests-panel";
import { StatesPanel } from "./fsm/states-panel";
import { SuperStructureTab } from "./superstructure-tab";

type FsmInnerTab = "states" | "requests" | "bindings";

function formatActionSummary(action: SubsystemAction): string {
  switch (action.type) {
    case "stop":
      return "stop()";
    case "percentOutput":
      return `${action.constantName} (${action.value})`;
    case "velocityRpm":
      return `${action.constantName} (${action.value} RPM)`;
    case "positionDeg":
      return `${action.constantName} (${action.value}°)`;
    case "positionRot":
      return `${action.constantName} (${action.value} rot)`;
    case "smartPositionDeg":
      return `SmartPos: ${action.constantName} (${action.value}°)`;
    case "smartPositionRot":
      return `SmartPos: ${action.constantName} (${action.value} rot)`;
  }
}

function formatStateActionsSummary(state: FsmState): string {
  const primary = formatActionSummary(getPrimaryMotorAction(state));
  const badges: string[] = [];
  if (state.actions.some((a) => a.kind === "leds")) badges.push("LED");
  if (state.actions.some((a) => a.kind === "log")) badges.push("LOG");
  if (state.actions.some((a) => a.kind === "rumble")) badges.push("RUMBLE");
  return badges.length > 0 ? `${primary} · +${badges.join("+")}` : primary;
}

type FsmStateNodeData = {
  label: string;
  actionLabel: string;
  isInitial: boolean;
  isActive: boolean;
  isSelected: boolean;
  errorCount: number;
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
        data.errorCount > 0
          ? "border-rose-500 ring-1 ring-rose-500/60 bg-[#1c1624]"
          : data.isActive
            ? "border-[#60a5fa] bg-[#142c4f] shadow-[0_0_24px_-6px_rgba(59,130,246,0.65)]"
            : data.isSelected
              ? "border-[#3b6bb5] bg-[#19253d]"
              : "border-[#253552] bg-[#131c2e] hover:border-[#3b6bb5]"
      }`}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center justify-between gap-1.5">
        <span className="truncate font-mono text-[13px] font-semibold text-white">
          {data.label}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {data.errorCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
              <AlertTriangle className="h-2.5 w-2.5" />
              {data.errorCount}
            </span>
          )}
          {data.isInitial && (
            <span className="rounded bg-[#142c4f] border border-[#3b6bb5]/70 px-1.5 py-0.5 font-mono text-[10px] uppercase text-[#93c5fd]">
              init
            </span>
          )}
        </div>
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
    issues,
    focusRequest,
    t,
  } = useProject();

  const [target, setTarget] = useState<"subsystem" | "superstructure">(initialTarget);
  const [innerTab, setInnerTab] = useState<FsmInnerTab>("states");
  const [selectedStateName, setSelectedStateName] = useState<string | null>(null);
  const [simRequest, setSimRequest] = useState<string | null>(null);
  const [showMermaid, setShowMermaid] = useState(false);
  const [showSuperJava, setShowSuperJava] = useState(false);
  const posRef = useRef<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    setTarget(initialTarget);
  }, [initialTarget]);

  useEffect(() => {
    if (!focusRequest) return;
    if (focusRequest.tab === "superstructure") {
      setTarget("superstructure");
      return;
    }
    if (focusRequest.tab === "fsm") {
      setTarget("subsystem");
      if (focusRequest.stateName) setSelectedStateName(focusRequest.stateName);
      const path = focusRequest.path ?? "";
      if (path.includes(".fsm.requests.") || path.includes(".fsm.initialRequest")) {
        setInnerTab("requests");
      } else if (path.includes(".fsm.bindings.")) {
        setInnerTab("bindings");
      } else {
        setInnerTab("states");
      }
    }
  }, [focusRequest]);

  const motorSubsystems = useMemo(
    () => project.subsystems.filter(isMotorSubsystem),
    [project.subsystems],
  );

  const activeSub =
    motorSubsystems.find((s) => s.id === selectedSubsystemId) ??
    motorSubsystems[0] ??
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
      const errorCount = issues.filter(
        (i) => i.targetId === activeSub.id && i.stateName === st.name && i.severity === "error",
      ).length;

      list.push({
        id,
        type: "fsmState",
        position: pos,
        data: {
          label: st.name,
          actionLabel: formatStateActionsSummary(st),
          isInitial: st.name === activeSub.fsm.initialState,
          isActive: st.name === activeSimState,
          isSelected: activeStateObj?.name === st.name,
          errorCount,
          onSelect: (name: string) => {
            setSelectedStateName(name);
            setInnerTab("states");
          },
        },
      });
    });

    return list;
  }, [activeSub, activeSimState, activeStateObj, issues]);

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
    const list: Edge[] = activeSub.fsm.bindings.map((b, idx) => {
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

    const sensorNameById = new Map((activeSub.sensors ?? []).map((s) => [s.id, s.name]));

    for (const st of activeSub.fsm.states) {
      for (const tr of st.transitions ?? []) {
        const sName = tr.sensorId ? (sensorNameById.get(tr.sensorId) ?? tr.sensorId) : "sensor";
        const label =
          tr.trigger === "afterSeconds"
            ? `after ${tr.value ?? 0.5}s`
            : tr.trigger === "atSetpoint"
              ? "atGoal()"
              : tr.trigger === "stalled"
                ? "stalled"
                : tr.trigger === "sensorTrue"
                  ? `${sName} == true`
                  : tr.trigger === "sensorFalse"
                    ? `${sName} == false`
                    : `>${tr.value ?? 30}A`;
        list.push({
          id: `e-tr-${st.name}-${tr.id}`,
          source: `state-${st.name}`,
          target: `state-${tr.targetState}`,
          label,
          animated: st.name === activeSimState,
          labelStyle: { fill: "#67e8f9", fontSize: 10, fontFamily: "monospace" },
          labelBgStyle: { fill: "#0f1624", fillOpacity: 0.95 },
          style: {
            stroke: "#22d3ee",
            strokeWidth: 1.6,
            strokeDasharray: "5 3",
          },
        });
      }
      if (st.timeoutAfterSec && activeSub.fsm.securityState) {
        list.push({
          id: `e-to-${st.name}`,
          source: `state-${st.name}`,
          target: `state-${activeSub.fsm.securityState}`,
          label: `timeout ${st.timeoutAfterSec}s`,
          labelStyle: { fill: "#fda4af", fontSize: 10, fontFamily: "monospace" },
          labelBgStyle: { fill: "#0f1624", fillOpacity: 0.95 },
          style: {
            stroke: "#fb7185",
            strokeWidth: 1.4,
            strokeDasharray: "3 3",
          },
        });
      }
    }

    return list;
  }, [activeSub, activeRequest, activeSimState]);

  const superJavaFile = useMemo(
    () => generatedFiles.find((f) => f.path.endsWith("SuperStructure.java")),
    [generatedFiles],
  );

  const selectorActions = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[#22304a] bg-[#0f1624] p-1">
        {motorSubsystems.map((sub) => (
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
        <div
          key="superstructure"
          className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start animate-fade-in"
        >
          <div className={showSuperJava && superJavaFile ? "xl:col-span-7" : "xl:col-span-12"}>
            <SuperStructureTab />
          </div>
          {showSuperJava && superJavaFile && (
            <Card className="xl:col-span-5 h-[560px] flex flex-col overflow-hidden animate-fade-in">
              <CodeViewer
                filePath={superJavaFile.path}
                content={superJavaFile.content}
                className="flex-1"
              />
            </Card>
          )}
        </div>
      ) : !activeSub ? (
        <Card className="animate-fade-in">
          <CardContent className="flex items-center justify-center py-16 text-sm text-slate-400">
            {t("fsm.no_subsystems")}
          </CardContent>
        </Card>
      ) : (
        <div
          key={activeSub.id}
          className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start animate-fade-in"
        >
          {/* Left Interactive FSM Graph or Mermaid */}
          <Card className="xl:col-span-7 h-[540px] flex flex-col overflow-hidden">
            {showMermaid ? (
              <div className="flex flex-1 flex-col overflow-auto p-6 space-y-3 bg-[#0b0f17] animate-fade-in">
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
                  deleteKeyCode={null}
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
                  <Panel position="top-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="font-mono text-[11px]"
                      onClick={() => setShowMermaid(true)}
                    >
                      toMermaid()
                    </Button>
                  </Panel>
                </ReactFlow>
              </div>
            )}
          </Card>

          {/* Right Split 3-Tab FSM Editor */}
          <Card className="xl:col-span-5">
            <CardHeader className="border-b border-[#22304a] p-2">
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#0b0f17] p-1">
                {(
                  [
                    { id: "states", label: t("fsm.tab_states"), count: activeSub.fsm.states.length },
                    { id: "requests", label: t("fsm.tab_requests"), count: activeSub.fsm.requests.length },
                    { id: "bindings", label: t("fsm.tab_bindings"), count: activeSub.fsm.bindings.length },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setInnerTab(tab.id)}
                    className={`flex items-center justify-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-medium transition-all cursor-pointer ${
                      innerTab === tab.id
                        ? "bg-[#142c4f] border border-[#60a5fa]/70 text-white"
                        : "border border-transparent text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="font-mono text-[10px] text-[#93c5fd]">{tab.count}</span>
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="pt-5">
              {innerTab === "states" && (
                <StatesPanel
                  subsystem={activeSub}
                  selectedStateName={activeStateObj?.name ?? null}
                  onSelectState={setSelectedStateName}
                />
              )}
              {innerTab === "requests" && <RequestsPanel subsystem={activeSub} />}
              {innerTab === "bindings" && <BindingsPanel subsystem={activeSub} />}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
