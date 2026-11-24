"use client";

import "@xyflow/react/dist/style.css";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
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
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Blocks,
  Cog,
  Cpu,
  Gamepad2,
  GripVertical,
  HelpCircle,
  Layers,
  LayoutGrid,
  Plus,
  Trash2,
  Workflow,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { UnitInput } from "@/components/ui/unit-input";
import { useProject } from "@/context/project-context";
import { toPackageSegment } from "@/lib/generator/java-utils";
import type { MotorVendor, SubsystemConfig } from "@/lib/schema/ciprix-project";
import { cn } from "@/lib/utils";
import { CodeViewer } from "./code-viewer";

type XboxNodeData = {
  buttons: { label: string; request: string }[];
  simRequest: string;
  onSimulate: (req: string) => void;
  onOpenControls: () => void;
};

type SuperNodeData = {
  requests: string[];
  simRequest: string;
  activeRobotState: string;
  onSimulate: (req: string) => void;
  onOpenStates: () => void;
};

type SubsystemNodeData = {
  subsystem: SubsystemConfig;
  activeRequest: string;
  activeStateName: string;
  outputPct: number;
  selected: boolean;
  errorCount: number;
  onSelect: (id: string) => void;
};

function XboxFlowNode({ data }: NodeProps<Node<XboxNodeData>>) {
  return (
    <div className="w-[230px] overflow-hidden rounded-lg border border-[#2c3f61] bg-[#131c2e] text-left shadow-lg">
      <div className="flex items-center justify-between border-b border-[#22304a] bg-[#142c4f]/75 px-3 py-2">
        <span className="flex items-center gap-1.5 font-headline text-[13px] font-semibold text-white">
          <Gamepad2 className="h-3.5 w-3.5 text-[#93c5fd]" />
          Xbox 0 / 1
        </span>
        <button
          type="button"
          onClick={data.onOpenControls}
          className="font-mono text-[11px] text-[#93c5fd] hover:text-white cursor-pointer"
        >
          editar
        </button>
      </div>
      <div className="p-3 flex flex-wrap gap-1.5">
        {data.buttons.length === 0 ? (
          <span className="font-mono text-[11px] text-slate-400">sem botões</span>
        ) : (
          data.buttons.map((b) => (
            <button
              key={b.label + b.request}
              type="button"
              onClick={() => data.onSimulate(b.request)}
              className={`rounded border px-2 py-0.5 font-mono text-[11px] transition-all cursor-pointer ${
                data.simRequest === b.request
                  ? "border-[#60a5fa] bg-[#142c4f] text-white shadow-[0_0_12px_-3px_rgba(59,130,246,0.65)]"
                  : "border-[#253552] bg-[#0b0f17] text-slate-300 hover:text-white"
              }`}
            >
              {b.label} → {b.request}
            </button>
          ))
        )}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function SuperNode({ data }: NodeProps<Node<SuperNodeData>>) {
  return (
    <div className="w-[245px] overflow-hidden rounded-lg border border-[#3b6bb5] bg-[#131c2e] text-left shadow-lg">
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center justify-between border-b border-[#22304a] bg-[#142c4f]/90 px-3 py-2">
        <span className="flex items-center gap-1.5 font-headline text-[13px] font-semibold text-white">
          <Layers className="h-3.5 w-3.5 text-[#93c5fd]" />
          SuperStructure
        </span>
        <button
          type="button"
          onClick={data.onOpenStates}
          className="font-mono text-[11px] text-[#93c5fd] hover:text-white cursor-pointer"
        >
          matriz
        </button>
      </div>
      <div className="p-3 space-y-2">
        <div className="font-mono text-[11px] text-[#93c5fd]">
          State: <strong className="text-white">{data.activeRobotState}</strong>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {data.requests.map((req) => (
            <button
              key={req}
              type="button"
              onClick={() => data.onSimulate(req)}
              className={`rounded border px-2 py-0.5 font-mono text-[11px] transition-all cursor-pointer ${
                data.simRequest === req
                  ? "border-[#60a5fa] bg-[#142c4f] text-white"
                  : "border-[#253552] bg-[#0b0f17] text-slate-300 hover:text-white"
              }`}
            >
              {req}
            </button>
          ))}
        </div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function SubsystemFlowNode({ data }: NodeProps<Node<SubsystemNodeData>>) {
  const { subsystem, activeRequest, activeStateName, outputPct, selected, errorCount, onSelect } =
    data;
  const vendor =
    subsystem.motor.vendor === "talonfx"
      ? "TalonFX"
      : subsystem.motor.vendor === "sparkmax"
        ? "SparkMax"
        : "TalonSRX";

  return (
    <div
      onClick={() => onSelect(subsystem.id)}
      className={`w-[270px] overflow-hidden rounded-lg border text-left transition-all cursor-pointer ${
        selected
          ? "border-[#60a5fa] bg-[#19253d] shadow-[0_0_24px_-6px_rgba(59,130,246,0.55)]"
          : outputPct !== 0
            ? "border-[#3b6bb5] bg-[#152036] shadow-lg"
            : "border-[#253552] bg-[#131c2e] hover:border-[#3b6bb5]"
      }`}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center justify-between border-b border-[#22304a] bg-[#142c4f]/75 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <Cog
            className={`h-3.5 w-3.5 shrink-0 ${
              outputPct > 0
                ? "text-[#93c5fd] animate-motor-cw"
                : outputPct < 0
                  ? "text-[#93c5fd] animate-motor-ccw"
                  : "text-slate-400"
            }`}
          />
          <span className="truncate font-headline text-[13px] font-semibold text-white">
            {subsystem.name}
          </span>
        </div>
        <span
          className={`font-mono text-[11px] ${
            errorCount > 0 ? "text-rose-400" : "text-[#93c5fd]"
          }`}
        >
          {errorCount > 0 ? `${errorCount} err` : `CAN ${subsystem.motor.canId}`}
        </span>
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between font-mono text-[11px]">
          <span className="text-slate-300">
            {vendor} · {subsystem.motor.currentLimitAmps}A
          </span>
          <span className={outputPct !== 0 ? "text-[#93c5fd] font-semibold" : "text-slate-400"}>
            {outputPct > 0 ? `+${Math.round(outputPct * 100)}%` : `${Math.round(outputPct * 100)}%`}
          </span>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#0b0f17] border border-[#22304a]">
          <div
            className="h-full bg-[#60a5fa] transition-all duration-300"
            style={{ width: `${Math.abs(outputPct) * 100}%` }}
          />
        </div>

        <div className="font-mono text-[11px] text-slate-400">
          {activeRequest} → <span className="text-slate-100">{activeStateName}</span>
        </div>
      </div>
    </div>
  );
}

const nodeTypes = {
  xboxNode: XboxFlowNode,
  superNode: SuperNode,
  subsystemNode: SubsystemFlowNode,
};

function HelpHint({ text }: { text: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="text-slate-400 hover:text-white cursor-help"
          aria-label="Ajuda"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          sideOffset={6}
          className="z-50 max-w-xs rounded-lg border border-[#3b6bb5] bg-[#0f1624] p-2.5 text-xs text-slate-200 shadow-xl"
        >
          {text}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function RobotFlowView({
  onGoToStates,
  onGoToControls,
}: {
  onGoToStates: () => void;
  onGoToControls: () => void;
}) {
  const {
    project,
    selectedSubsystemId,
    setSelectedSubsystemId,
    generatedFiles,
    issues,
    addSubsystem,
    updateSubsystem,
    removeSubsystem,
    reorderSubsystems,
    t,
  } = useProject();

  const [canvasView, setCanvasView] = useState<"blocks" | "flow">("blocks");
  const [isDragOver, setIsDragOver] = useState(false);
  const [rightTab, setRightTab] = useState<"code" | "summary">("code");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [simRequest, setSimRequest] = useState<string>(project.superstructure.initialRequest);
  const [autoSim, setAutoSim] = useState(false);
  const [selectedJavaIdx, setSelectedJavaIdx] = useState(0);

  const dragCounter = useRef(0);
  const positionsRef = useRef<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    if (!autoSim || project.superstructure.requests.length <= 1) return;
    const reqs = project.superstructure.requests;
    const id = setInterval(() => {
      setSimRequest((curr) => reqs[(reqs.indexOf(curr) + 1) % reqs.length] ?? reqs[0]);
    }, 2000);
    return () => clearInterval(id);
  }, [autoSim, project.superstructure.requests]);

  const activeSimRequest = project.superstructure.requests.includes(simRequest)
    ? simRequest
    : project.superstructure.initialRequest;

  const activeRobotState =
    project.superstructure.bindings.find((b) => b.request === activeSimRequest)?.entryState ??
    project.superstructure.initialState;

  const handleManualSim = useCallback((req: string) => {
    setAutoSim(false);
    setSimRequest(req);
  }, []);

  const computedNodes = useMemo<Node[]>(() => {
    const xboxPos = positionsRef.current["xbox"] ?? { x: 30, y: 110 };
    const superPos = positionsRef.current["superstructure"] ?? { x: 315, y: 100 };

    const list: Node[] = [
      {
        id: "xbox",
        type: "xboxNode",
        position: xboxPos,
        data: {
          buttons: project.controls.pilotPriority.map((p) => ({
            label: p.button.replace("Bumper", "B").replace("Trigger", "T").toUpperCase(),
            request: p.request,
          })),
          simRequest: activeSimRequest,
          onSimulate: handleManualSim,
          onOpenControls: onGoToControls,
        },
      },
      {
        id: "superstructure",
        type: "superNode",
        position: superPos,
        data: {
          requests: project.superstructure.requests,
          simRequest: activeSimRequest,
          activeRobotState,
          onSimulate: handleManualSim,
          onOpenStates: onGoToStates,
        },
      },
    ];

    project.subsystems.forEach((sub, idx) => {
      const subId = `sub-${sub.id}`;
      const pos = positionsRef.current[subId] ?? { x: 620, y: 40 + idx * 125 };

      const subReq =
        project.superstructure.stateActions[activeRobotState]?.[sub.id] ?? sub.fsm.initialRequest;
      const binding = sub.fsm.bindings.find((b) => b.request === subReq);
      const activeStateName = binding?.goalState ?? binding?.entryState ?? sub.fsm.initialState;
      const stObj = sub.fsm.states.find((s) => s.name === activeStateName);
      const outputPct = stObj?.onEnter.type === "percentOutput" ? stObj.onEnter.value : 0;
      const errorCount = issues.filter(
        (i) => i.targetId === sub.id && i.severity === "error",
      ).length;

      list.push({
        id: subId,
        type: "subsystemNode",
        position: pos,
        data: {
          subsystem: sub,
          activeRequest: subReq,
          activeStateName,
          outputPct,
          selected: selectedSubsystemId === sub.id,
          errorCount,
          onSelect: setSelectedSubsystemId,
        },
      });
    });

    return list;
  }, [
    project,
    activeSimRequest,
    activeRobotState,
    selectedSubsystemId,
    issues,
    setSelectedSubsystemId,
    onGoToControls,
    onGoToStates,
    handleManualSim,
  ]);

  const [nodes, setNodes] = useState<Node[]>(computedNodes);
  useEffect(() => {
    setNodes(computedNodes);
  }, [computedNodes]);

  const onNodesChange: OnNodesChange<Node> = useCallback((changes) => {
    setNodes((nds) => changes.applyTo(nds));
  }, []);

  const onNodeDragStop: OnNodeDrag<Node> = useCallback((_event, node) => {
    positionsRef.current[node.id] = node.position;
  }, []);

  const edges = useMemo<Edge[]>(() => {
    const isDriving = activeSimRequest !== project.superstructure.initialRequest;
    const result: Edge[] = [
      {
        id: "e-xbox-super",
        source: "xbox",
        target: "superstructure",
        animated: isDriving,
        style: {
          stroke: isDriving ? "#60a5fa" : "#2c3f61",
          strokeWidth: isDriving ? 2.2 : 1.4,
        },
      },
    ];

    for (const sub of project.subsystems) {
      const subReq =
        project.superstructure.stateActions[activeRobotState]?.[sub.id] ?? sub.fsm.initialRequest;
      const active = subReq !== sub.fsm.initialRequest;
      result.push({
        id: `e-super-${sub.id}`,
        source: "superstructure",
        target: `sub-${sub.id}`,
        animated: active,
        style: {
          stroke: active ? "#60a5fa" : "#2c3f61",
          strokeWidth: active ? 2.2 : 1.4,
        },
      });
    }

    return result;
  }, [project, activeSimRequest, activeRobotState]);

  const selected =
    project.subsystems.find((s) => s.id === selectedSubsystemId) ??
    project.subsystems[0] ??
    null;

  const subJavaFiles = useMemo(() => {
    if (!selected) return [];
    const subPkg = toPackageSegment(selected.name);
    return generatedFiles.filter((f) => f.path.includes(`/subsystems/${subPkg}/`));
  }, [generatedFiles, selected]);

  const vendors: { id: MotorVendor; label: string }[] = [
    { id: "talonfx", label: "Talon FX" },
    { id: "sparkmax", label: "SPARK MAX" },
    { id: "talonsrx", label: "Talon SRX" },
  ];

  const moveSubsystem = (idx: number, delta: -1 | 1) => {
    const nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= project.subsystems.length) return;
    const ids = project.subsystems.map((s) => s.id);
    const [item] = ids.splice(idx, 1);
    ids.splice(nextIdx, 0, item);
    reorderSubsystems(ids);
  };

  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>, kind: "roller" | "generic") => {
    e.dataTransfer.setData("text/plain", kind);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragOver(false);
    const kind = e.dataTransfer.getData("text/plain");
    if (kind === "roller" || kind === "generic") {
      addSubsystem(kind);
    }
  };

  const paletteItems: {
    kind: "roller" | "generic";
    title: string;
    desc: string;
    icon: React.ReactNode;
  }[] = [
    {
      kind: "roller",
      title: "Roller / Intake",
      desc: "Motor + FSM STOP / INTAKE / EJECT",
      icon: <Cog className="h-7 w-7 text-[#93c5fd] shrink-0" />,
    },
    {
      kind: "generic",
      title: "Subsistema Genérico",
      desc: "Motor + StateSubsystem básica",
      icon: <Cpu className="h-7 w-7 text-[#93c5fd] shrink-0" />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editor do Robô"
        description="Arraste ou clique em componentes para montar seu robô e inspecione a lógica da SuperStructure."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Zone 1: Left Component Library Sidebar */}
        <Card className="lg:col-span-3 flex flex-col">
          <CardHeader>
            <CardTitle>Componentes</CardTitle>
            <CardDescription>Arraste para o canvas ou clique para adicionar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2.5">
              <p className="font-headline text-sm font-semibold text-[#93c5fd]">
                Mecanismos &amp; Templates
              </p>
              <div className="flex flex-col gap-2.5">
                {paletteItems.map((item) => (
                  <button
                    key={item.kind}
                    type="button"
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.kind)}
                    onClick={() => addSubsystem(item.kind)}
                    className="group flex items-center gap-3.5 rounded-xl border border-[#2c3f61] bg-[#0f1624] p-4 text-left transition-all hover:scale-[1.02] hover:border-[#60a5fa] hover:bg-[#19253d] cursor-grab active:cursor-grabbing"
                  >
                    {item.icon}
                    <div className="min-w-0 flex-1">
                      <p className="font-headline text-sm font-semibold text-white">{item.title}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{item.desc}</p>
                    </div>
                    <Plus className="h-4 w-4 text-slate-500 group-hover:text-white shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Zone 2 & 3: Right Main Column */}
        <div className="lg:col-span-9 space-y-6">
          {/* Zone 2: Top Canvas Card ("Seu Robô") */}
          <Card className="h-[400px] flex flex-col overflow-hidden">
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0 border-b border-[#22304a] py-4">
              <div className="flex items-center gap-3">
                <CardTitle>Seu Robô</CardTitle>
                <Badge variant="default">
                  {project.subsystems.length}{" "}
                  {project.subsystems.length === 1 ? "subsistema" : "subsistemas"}
                </Badge>
              </div>

              <div className="flex items-center gap-1 rounded-lg border border-[#22304a] bg-[#0b0f17] p-1">
                <button
                  type="button"
                  onClick={() => setCanvasView("blocks")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
                    canvasView === "blocks"
                      ? "bg-[#142c4f] border border-[#60a5fa]/70 text-white"
                      : "border border-transparent text-slate-400 hover:text-white",
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Blocos
                </button>
                <button
                  type="button"
                  onClick={() => setCanvasView("flow")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
                    canvasView === "flow"
                      ? "bg-[#142c4f] border border-[#60a5fa]/70 text-white"
                      : "border border-transparent text-slate-400 hover:text-white",
                  )}
                >
                  <Workflow className="h-3.5 w-3.5" />
                  Fluxo SuperStructure
                </button>
              </div>
            </CardHeader>

            <CardContent
              className="flex-1 min-h-0 p-0 relative overflow-hidden"
              onDragEnter={(e) => {
                e.preventDefault();
                dragCounter.current += 1;
                if (dragCounter.current === 1) setIsDragOver(true);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={(e) => {
                e.preventDefault();
                dragCounter.current -= 1;
                if (dragCounter.current === 0) setIsDragOver(false);
              }}
              onDrop={handleDrop}
            >
              {canvasView === "blocks" ? (
                <div
                  className={cn(
                    "relative h-full w-full overflow-y-auto bg-[#0b0f17] transition-colors",
                    isDragOver && "ring-2 ring-inset ring-[#60a5fa] bg-[#0f182a]",
                  )}
                >
                  <div className="pointer-events-none absolute inset-0 bg-canvas-grid" />
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_60%_at_50%_0%,rgba(20,44,79,0.55),transparent_70%)]" />

                  <div className="relative z-10 h-full p-6">
                    {project.subsystems.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
                        <Blocks className="h-12 w-12 text-slate-500" />
                        <p className="mt-3 font-headline text-lg font-medium text-slate-200">
                          Arraste um componente ou clique na barra à esquerda
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-4">
                        {project.subsystems.map((sub, idx) => {
                          const isSelected = selected?.id === sub.id;
                          const subErrors = issues.filter(
                            (i) => i.targetId === sub.id && i.severity === "error",
                          ).length;
                          const vendorLabel =
                            sub.motor.vendor === "talonfx"
                              ? "TalonFX"
                              : sub.motor.vendor === "sparkmax"
                                ? "SparkMax"
                                : "TalonSRX";

                          return (
                            <div
                              key={sub.id}
                              onClick={() => setSelectedSubsystemId(sub.id)}
                              className={cn(
                                "group relative aspect-square rounded-xl border-2 bg-[#162238] p-4 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer hover:border-[#60a5fa] hover:bg-[#192844]",
                                isSelected
                                  ? "border-[#60a5fa] bg-[#1b2c4a] shadow-[0_0_24px_-8px_rgba(96,165,250,0.65)] animate-select-bounce"
                                  : "border-[#253552]",
                                subErrors > 0 && "border-rose-500/80",
                              )}
                            >
                              <div className="absolute left-2.5 top-2.5 flex items-center gap-1 opacity-55 group-hover:opacity-100">
                                <GripVertical className="h-4 w-4 text-slate-400" />
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveSubsystem(idx, -1);
                                  }}
                                  className="rounded p-0.5 text-slate-400 hover:bg-[#0b0f17] hover:text-white disabled:opacity-25 cursor-pointer"
                                  title="Mover para esquerda"
                                >
                                  <ArrowLeft className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === project.subsystems.length - 1}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveSubsystem(idx, 1);
                                  }}
                                  className="rounded p-0.5 text-slate-400 hover:bg-[#0b0f17] hover:text-white disabled:opacity-25 cursor-pointer"
                                  title="Mover para direita"
                                >
                                  <ArrowRight className="h-3 w-3" />
                                </button>
                              </div>

                              {subErrors > 0 && (
                                <span className="absolute right-2.5 top-2.5 text-rose-400">
                                  <AlertTriangle className="h-4 w-4" />
                                </span>
                              )}

                              <Cog
                                className={cn(
                                  "mb-2.5 h-10 w-10",
                                  isSelected ? "text-[#93c5fd]" : "text-[#60a5fa]",
                                )}
                              />
                              <span className="font-headline text-sm font-semibold text-white break-words">
                                {sub.name}
                              </span>
                              <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
                                <Badge variant="default" className="text-[10px] px-2 py-0">
                                  CAN {sub.motor.canId}
                                </Badge>
                                <Badge variant="secondary" className="text-[10px] px-2 py-0">
                                  {vendorLabel}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full w-full bg-[#0b0f17]">
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onNodeDragStop={onNodeDragStop}
                    nodeTypes={nodeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                    minZoom={0.4}
                    maxZoom={1.6}
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
                          Simular:
                        </span>
                        {project.superstructure.requests.map((req) => (
                          <button
                            key={req}
                            type="button"
                            onClick={() => handleManualSim(req)}
                            className={`rounded-md px-2.5 py-1 font-mono text-xs transition-all cursor-pointer ${
                              activeSimRequest === req
                                ? "bg-[#142c4f] border border-[#60a5fa] text-white"
                                : "border border-[#253552] bg-[#0b0f17] text-slate-300 hover:text-white"
                            }`}
                          >
                            {req}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setAutoSim((v) => !v)}
                          className={`ml-1 rounded-md border px-2.5 py-1 font-mono text-[11px] cursor-pointer ${
                            autoSim
                              ? "border-[#60a5fa] bg-[#142c4f] text-white"
                              : "border-[#253552] bg-[#0b0f17] text-slate-400 hover:text-white"
                          }`}
                        >
                          {autoSim ? "AUTO ON" : "AUTO"}
                        </button>
                      </div>
                    </Panel>
                  </ReactFlow>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Zone 3: Bottom Split — ConfigPanel + Code/Hardware Preview */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left: FGCLib-style ConfigPanel Card */}
            <Card className="xl:col-span-7">
              {!selected ? (
                <CardContent className="flex flex-col items-center justify-center py-14 text-center gap-3">
                  <p className="text-sm text-slate-400">{t("subsystems.select_prompt")}</p>
                  <Button size="sm" variant="primary" onClick={() => addSubsystem("roller")}>
                    <Plus className="h-4 w-4" />
                    {t("subsystems.roller")}
                  </Button>
                </CardContent>
              ) : (
                <>
                  <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-[#22304a] pb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <CardTitle className="truncate">{selected.name}</CardTitle>
                      <Badge variant="default">CAN {selected.motor.canId}</Badge>
                    </div>
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => removeSubsystem(selected.id)}
                      title={t("subsystems.remove")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>

                  <CardContent className="space-y-5 pt-6">
                    {/* Nome da Classe */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-slate-200">
                          {t("subsystems.name")}
                        </label>
                        <HelpHint text="Nome Java PascalCase usado para gerar o pacote e classe StateSubsystem." />
                      </div>
                      <div className="w-1/2">
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
                    </div>

                    {/* CAN ID */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-slate-200">
                          {t("subsystems.can_id")}
                        </label>
                        <HelpHint text="Identificador único no barramento CAN (0 a 62)." />
                      </div>
                      <div className="w-1/2">
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

                    {/* Vendor Tactile Chips */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-slate-200">
                          {t("subsystems.vendor")}
                        </label>
                        <HelpHint text="Controlador de motor usado na implementação IO gerada." />
                      </div>
                      <div className="grid w-1/2 grid-cols-3 gap-1.5">
                        {vendors.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() =>
                              updateSubsystem(selected.id, (prev) => ({
                                ...prev,
                                motor: { ...prev.motor, vendor: v.id },
                              }))
                            }
                            className={`rounded-md border py-2 text-xs font-medium transition-all cursor-pointer ${
                              selected.motor.vendor === v.id
                                ? "border-[#60a5fa] bg-[#142c4f] text-white"
                                : "border-[#253552] bg-[#0f1624] text-slate-300 hover:text-white"
                            }`}
                          >
                            {v.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Current Limit */}
                    <div className="space-y-2.5 pt-1">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-slate-200">
                            {t("subsystems.current_limit")}
                          </label>
                          <HelpHint text="Limite de corrente contínua/stator em Ampères para proteger motor e bateria." />
                        </div>
                        <div className="w-28">
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
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={120}
                        step={5}
                        value={selected.motor.currentLimitAmps}
                        onChange={(e) =>
                          updateSubsystem(selected.id, (prev) => ({
                            ...prev,
                            motor: {
                              ...prev.motor,
                              currentLimitAmps: Number.parseInt(e.target.value, 10),
                            },
                          }))
                        }
                        className="w-full"
                      />
                    </div>

                    {/* FGCLib-style Show Advanced Switch */}
                    <div className="border-t border-[#22304a] pt-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">
                          Mostrar Configurações Avançadas
                        </p>
                        <p className="text-xs text-slate-400">
                          Barramento CAN, modo neutro, inversão, redução, MOI e Self-Test
                        </p>
                      </div>
                      <Switch checked={showAdvanced} onCheckedChange={setShowAdvanced} />
                    </div>

                    {showAdvanced && (
                      <div className="space-y-4 rounded-xl border border-[#22304a] bg-[#0f1624] p-4">
                        {selected.motor.vendor === "talonfx" && (
                          <div className="flex items-center justify-between gap-4">
                            <label className="text-sm font-medium text-slate-200">
                              {t("subsystems.can_bus")}
                            </label>
                            <div className="w-1/2">
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
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-4">
                          <span className="text-sm font-medium text-slate-200">
                            {t("subsystems.neutral_mode")}
                          </span>
                          <div className="flex rounded-md border border-[#253552] bg-[#0b0f17] p-0.5">
                            {(["coast", "brake"] as const).map((mode) => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() =>
                                  updateSubsystem(selected.id, (prev) => ({
                                    ...prev,
                                    motor: { ...prev.motor, neutralMode: mode },
                                  }))
                                }
                                className={`rounded px-3 py-1 text-xs capitalize cursor-pointer ${
                                  selected.motor.neutralMode === mode
                                    ? "bg-[#142c4f] text-white"
                                    : "text-slate-400"
                                }`}
                              >
                                {mode}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-200">
                            {t("subsystems.inverted")}
                          </span>
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

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-xs text-slate-300">
                              {t("subsystems.gear_ratio")}
                            </label>
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
                                    gearRatio: Math.max(
                                      0.1,
                                      Number.parseFloat(e.target.value || "1") || 1,
                                    ),
                                  },
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs text-slate-300">{t("subsystems.moi")}</label>
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

                        <div className="space-y-2.5 border-t border-[#22304a] pt-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-200">
                              {t("subsystems.selftest_enable")}
                            </span>
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
                            <div className="grid grid-cols-2 gap-3">
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
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="border-t border-[#22304a] pt-4 flex-wrap">
                    <Button variant="secondary" size="md" onClick={onGoToStates}>
                      Configurar Estados (FSM)
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="md" onClick={onGoToControls}>
                      Configurar Controles
                    </Button>
                  </CardFooter>
                </>
              )}
            </Card>

            {/* Right: Tabbed Code / Hardware Summary Card */}
            <Card className="xl:col-span-5 h-[520px] flex flex-col overflow-hidden">
              <div className="flex border-b border-[#22304a] bg-[#0f1624] px-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setRightTab("code")}
                  className={cn(
                    "border-b-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer",
                    rightTab === "code"
                      ? "border-[#60a5fa] text-white bg-[#142c4f]/35"
                      : "border-transparent text-slate-400 hover:text-white",
                  )}
                >
                  Código Java
                </button>
                <button
                  type="button"
                  onClick={() => setRightTab("summary")}
                  className={cn(
                    "border-b-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer",
                    rightTab === "summary"
                      ? "border-[#60a5fa] text-white bg-[#142c4f]/35"
                      : "border-transparent text-slate-400 hover:text-white",
                  )}
                >
                  Hardware &amp; CAN
                </button>
              </div>

              {rightTab === "code" ? (
                subJavaFiles.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center p-6 text-sm text-slate-400">
                    Selecione um subsistema para visualizar os arquivos Java gerados.
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col min-h-0">
                    <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[#22304a] bg-[#0b0f17] px-3 py-2 shrink-0">
                      {subJavaFiles.map((f, idx) => (
                        <button
                          key={f.path}
                          type="button"
                          onClick={() => setSelectedJavaIdx(idx)}
                          className={`rounded px-2.5 py-1 font-mono text-[11px] whitespace-nowrap cursor-pointer ${
                            (subJavaFiles[selectedJavaIdx] ? selectedJavaIdx === idx : idx === 0)
                              ? "bg-[#142c4f] text-white"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {f.path.split("/").pop()}
                        </button>
                      ))}
                    </div>
                    {(subJavaFiles[selectedJavaIdx] ?? subJavaFiles[0]) && (
                      <CodeViewer
                        filePath={(subJavaFiles[selectedJavaIdx] ?? subJavaFiles[0]).path}
                        content={(subJavaFiles[selectedJavaIdx] ?? subJavaFiles[0]).content}
                        className="flex-1"
                      />
                    )}
                  </div>
                )
              ) : (
                <div className="flex-1 overflow-auto p-4">
                  {project.subsystems.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">
                      Nenhum subsistema configurado.
                    </p>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-[#22304a] text-slate-400 font-mono">
                        <tr>
                          <th className="py-2 pr-2">Nome</th>
                          <th className="py-2 px-2">Vendor</th>
                          <th className="py-2 px-2">CAN</th>
                          <th className="py-2 px-2">Bus</th>
                          <th className="py-2 px-2">Limite</th>
                          <th className="py-2 pl-2">Neutro</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#22304a] font-mono">
                        {project.subsystems.map((sub) => (
                          <tr
                            key={sub.id}
                            onClick={() => setSelectedSubsystemId(sub.id)}
                            className="hover:bg-[#19253d] cursor-pointer"
                          >
                            <td className="py-2.5 pr-2 font-sans font-medium text-white">
                              {sub.name}
                            </td>
                            <td className="py-2.5 px-2 text-slate-300">{sub.motor.vendor}</td>
                            <td className="py-2.5 px-2 text-[#93c5fd]">{sub.motor.canId}</td>
                            <td className="py-2.5 px-2 text-slate-400">{sub.motor.canBus}</td>
                            <td className="py-2.5 px-2 text-slate-300">
                              {sub.motor.currentLimitAmps}A
                            </td>
                            <td className="py-2.5 pl-2 capitalize text-slate-300">
                              {sub.motor.neutralMode}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
