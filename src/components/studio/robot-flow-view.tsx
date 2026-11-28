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
import {
  AlertTriangle,
  Anchor,
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Blocks,
  Cog,
  Compass,
  Copy,
  Cpu,
  FastForward,
  Gamepad2,
  Gauge,
  GripVertical,
  Layers,
  LayoutGrid,
  Lightbulb,
  Plus,
  Radar,
  RotateCw,
  SlidersHorizontal,
  Target,
  Trash2,
  Workflow,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Hint } from "@/components/ui/hint";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { UnitInput } from "@/components/ui/unit-input";
import { useProject } from "@/context/project-context";
import { toPackageSegment } from "@/lib/generator/java-utils";
import { getSubsystemTheme } from "@/lib/subsystem-theme";
import {
  getPrimaryMotorAction,
  isLedSubsystem,
  isMotorSubsystem,
  type MotorSubsystemConfig,
  type MotorVendor,
  type SensorConfig,
  type SensorType,
  type SubsystemAction,
  type SubsystemConfig,
  type SubsystemType,
} from "@/lib/schema/ciprix-project";
import { cn } from "@/lib/utils";
import { createDefaultDrivetrain } from "@/lib/presets/drivetrain";
import { CodeViewer } from "./code-viewer";
import { DrivetrainPanel } from "./drivetrain-panel";

const VALID_TYPES = new Set<SubsystemType>([
  "roller",
  "shooter",
  "arm",
  "elevator",
  "climber",
  "turret",
  "wrist",
  "indexer",
  "hood",
  "leds",
  "generic",
]);

function SubsystemIcon({
  type,
  className,
}: {
  type: SubsystemType;
  className?: string;
}) {
  switch (type) {
    case "shooter":
      return <Target className={className} />;
    case "arm":
      return <Compass className={className} />;
    case "elevator":
      return <ArrowUpDown className={className} />;
    case "climber":
      return <Anchor className={className} />;
    case "turret":
      return <RotateCw className={className} />;
    case "wrist":
      return <SlidersHorizontal className={className} />;
    case "indexer":
      return <FastForward className={className} />;
    case "hood":
      return <Gauge className={className} />;
    case "leds":
      return <Lightbulb className={className} />;
    case "generic":
      return <Cpu className={className} />;
    case "roller":
    default:
      return <Cog className={className} />;
  }
}

function formatSetpoint(action: SubsystemAction | undefined): {
  label: string;
  barPct: number;
  activeDir: number;
} {
  if (!action || action.type === "stop") {
    return { label: "0%", barPct: 0, activeDir: 0 };
  }
  switch (action.type) {
    case "percentOutput": {
      const pct = Math.round(action.value * 100);
      return {
        label: pct > 0 ? `+${pct}%` : `${pct}%`,
        barPct: Math.abs(action.value) * 100,
        activeDir: action.value,
      };
    }
    case "velocityRpm":
      return {
        label: `${Math.round(action.value)} RPM`,
        barPct: Math.min(100, (Math.abs(action.value) / 6000) * 100),
        activeDir: action.value,
      };
    case "positionDeg":
      return {
        label: `${action.value}°`,
        barPct: Math.min(100, (Math.abs(action.value) / 120) * 100),
        activeDir: action.value === 0 ? 0 : 1,
      };
    case "positionRot":
      return {
        label: `${action.value} rot`,
        barPct: Math.min(100, (Math.abs(action.value) / 10) * 100),
        activeDir: action.value === 0 ? 0 : 1,
      };
    case "smartPositionDeg":
      return {
        label: `${action.value}° SM`,
        barPct: Math.min(100, (Math.abs(action.value) / 180) * 100),
        activeDir: action.value === 0 ? 0 : 1,
      };
    case "smartPositionRot":
      return {
        label: `${action.value} rot SM`,
        barPct: Math.min(100, (Math.abs(action.value) / 20) * 100),
        activeDir: action.value === 0 ? 0 : 1,
      };
  }
}

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
  setpointLabel: string;
  barPct: number;
  activeDir: number;
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
  const {
    subsystem,
    activeRequest,
    activeStateName,
    setpointLabel,
    barPct,
    activeDir,
    selected,
    errorCount,
    onSelect,
  } = data;
  const isLed = isLedSubsystem(subsystem);
  const vendor = isLed
    ? subsystem.leds.driver === "candle"
      ? "CANdle"
      : "AddressableLED"
    : subsystem.motor?.vendor === "talonfx"
      ? "TalonFX"
      : subsystem.motor?.vendor === "sparkmax"
        ? "SparkMax"
        : "TalonSRX";
  const theme = getSubsystemTheme(subsystem.type);
  const hwIdLabel = isLed
    ? subsystem.leds.driver === "candle"
      ? `CAN ${subsystem.leds.canId ?? 30}`
      : `PWM ${subsystem.leds.pwmPort ?? 0}`
    : `CAN ${subsystem.motor?.canId ?? 0}`;
  const hwDetailLabel = isLed
    ? `${vendor} · ${subsystem.leds.ledCount} LEDs`
    : `${vendor} · ${subsystem.motor?.currentLimitAmps ?? 40}A`;

  return (
    <div
      onClick={() => onSelect(subsystem.id)}
      className={`w-[270px] overflow-hidden rounded-lg border text-left transition-all cursor-pointer ${
        errorCount > 0
          ? "border-rose-500 ring-1 ring-rose-500/60 bg-[#1c1624] shadow-[0_0_24px_-6px_rgba(244,63,94,0.45)]"
          : selected
            ? "border-[#60a5fa] bg-[#19253d] shadow-[0_0_24px_-6px_rgba(59,130,246,0.55)]"
            : activeDir !== 0
              ? "border-[#3b6bb5] bg-[#152036] shadow-lg"
              : "border-[#253552] bg-[#131c2e] hover:border-[#3b6bb5]"
      }`}
    >
      <div className={`h-1 w-full ${errorCount > 0 ? "bg-rose-500" : theme.barBg}`} />
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center justify-between border-b border-[#22304a] bg-[#142c4f]/75 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <SubsystemIcon
            type={subsystem.type}
            className={`h-3.5 w-3.5 shrink-0 ${
              subsystem.type === "roller" ||
              subsystem.type === "shooter" ||
              subsystem.type === "indexer"
                ? activeDir > 0
                  ? `${theme.iconText} animate-motor-cw`
                  : activeDir < 0
                    ? `${theme.iconText} animate-motor-ccw`
                    : theme.iconText
                : activeDir !== 0
                  ? theme.iconText
                  : theme.iconText
            }`}
          />
          <span className="truncate font-headline text-[13px] font-semibold text-white">
            {subsystem.name}
          </span>
        </div>
        {errorCount > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
            <AlertTriangle className="h-2.5 w-2.5" />
            {errorCount}
          </span>
        ) : (
          <span className="font-mono text-[11px] text-[#93c5fd]">
            {hwIdLabel}
          </span>
        )}
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between font-mono text-[11px]">
          <span className="text-slate-300">
            {hwDetailLabel}
          </span>
          <span className={activeDir !== 0 ? "text-[#93c5fd] font-semibold" : "text-slate-400"}>
            {setpointLabel}
          </span>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#0b0f17] border border-[#22304a]">
          <div
            className="h-full bg-[#60a5fa] transition-all duration-300"
            style={{ width: `${barPct}%` }}
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

export function RobotFlowView({
  onGoToStates,
  onGoToControls,
  onRequestDeleteSubsystem,
  onDuplicateSubsystem,
  forceShowAdvancedSignal = 0,
}: {
  onGoToStates: () => void;
  onGoToControls: () => void;
  onRequestDeleteSubsystem?: (sub: SubsystemConfig) => void;
  onDuplicateSubsystem?: (sub: SubsystemConfig) => void;
  forceShowAdvancedSignal?: number;
}) {
  const {
    project,
    selectedSubsystemId,
    setSelectedSubsystemId,
    generatedFiles,
    issues,
    focusRequest,
    addSubsystem,
    duplicateSubsystem,
    updateSubsystem,
    updateProject,
    removeSubsystem,
    reorderSubsystems,
    t,
  } = useProject();

  const [canvasView, setCanvasView] = useState<"blocks" | "flow">("blocks");
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggingTileId, setDraggingTileId] = useState<string | null>(null);
  const [dragOverTileId, setDragOverTileId] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<"code" | "summary">("code");
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (focusRequest?.tab === "subsystems" && focusRequest.advanced) {
      setShowAdvanced(true);
    }
  }, [focusRequest]);

  useEffect(() => {
    if (forceShowAdvancedSignal > 0) {
      setShowAdvanced(true);
    }
  }, [forceShowAdvancedSignal]);
  const [simRequest, setSimRequest] = useState<string>(project.superstructure.initialRequest);
  const [autoSim, setAutoSim] = useState(false);
  const [selectedJavaIdx, setSelectedJavaIdx] = useState(0);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  const dragCounter = useRef(0);
  const dragPayloadRef = useRef<
    { kind: "new"; type: SubsystemType } | { kind: "reorder"; id: string } | null
  >(null);
  const prevCountRef = useRef(project.subsystems.length);
  const positionsRef = useRef<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    const resetDrag = () => {
      dragPayloadRef.current = null;
      dragCounter.current = 0;
      setIsDragOver(false);
      setDraggingTileId(null);
      setDragOverTileId(null);
    };
    window.addEventListener("dragend", resetDrag);
    return () => window.removeEventListener("dragend", resetDrag);
  }, []);

  useEffect(() => {
    if (project.subsystems.length > prevCountRef.current) {
      const newest = project.subsystems[project.subsystems.length - 1];
      if (newest) {
        setLastAddedId(newest.id);
        const timer = setTimeout(() => setLastAddedId(null), 900);
        prevCountRef.current = project.subsystems.length;
        return () => clearTimeout(timer);
      }
    }
    prevCountRef.current = project.subsystems.length;
  }, [project.subsystems]);

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
            label:
              p.source === "sensor"
                ? `SENSOR`
                : (p.button ?? "a")
                    .replace("Bumper", "B")
                    .replace("Trigger", "T")
                    .replace("Stick", "S")
                    .toUpperCase(),
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

      if (!isMotorSubsystem(sub)) {
        const errorCount = issues.filter(
          (i) => i.targetId === sub.id && i.severity === "error",
        ).length;
        list.push({
          id: subId,
          type: "subsystemNode",
          position: pos,
          data: {
            subsystem: sub,
            activeRequest: "LED_ARBITER",
            activeStateName: sub.leds?.driver === "candle" ? "CANdle" : "AddressableLED",
            setpointLabel: `${sub.leds?.ledCount ?? 30} LEDs`,
            barPct: 100,
            activeDir: 0,
            selected: selectedSubsystemId === sub.id,
            errorCount,
            onSelect: setSelectedSubsystemId,
          },
        });
        return;
      }

      const subReq =
        project.superstructure.stateActions[activeRobotState]?.[sub.id] ?? sub.fsm.initialRequest;
      const binding = sub.fsm.bindings.find((b) => b.request === subReq);
      const activeStateName = binding?.goalState ?? binding?.entryState ?? sub.fsm.initialState;
      const stObj = sub.fsm.states.find((s) => s.name === activeStateName);
      const sp = formatSetpoint(getPrimaryMotorAction(stObj));
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
          setpointLabel: sp.label,
          barPct: sp.barPct,
          activeDir: sp.activeDir,
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
      if (!isMotorSubsystem(sub)) continue;
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

  const isDrivetrainSelected = selectedSubsystemId === "drivetrain";

  const selected = isDrivetrainSelected
    ? null
    : project.subsystems.find((s) => s.id === selectedSubsystemId) ??
      project.subsystems[0] ??
      null;

  const subJavaFiles = useMemo(() => {
    if (isDrivetrainSelected) {
      return generatedFiles.filter(
        (f) => f.path.includes("/subsystems/drive/") || f.path.includes("deploy/swerve/"),
      );
    }
    if (!selected) return [];
    const subPkg = toPackageSegment(selected.name);
    return generatedFiles.filter((f) => f.path.includes(`/subsystems/${subPkg}/`));
  }, [generatedFiles, selected, isDrivetrainSelected]);

  const openDrivetrain = () => {
    if (!project.drivetrain) {
      updateProject((prev) => ({
        ...prev,
        drivetrain: createDefaultDrivetrain("ctre_swerve"),
        features: { ...prev.features, driveContextStub: false },
      }));
    }
    setSelectedSubsystemId("drivetrain");
  };

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

  const clearDragState = useCallback(() => {
    dragPayloadRef.current = null;
    dragCounter.current = 0;
    setIsDragOver(false);
    setDraggingTileId(null);
    setDragOverTileId(null);
  }, []);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, kind: SubsystemType) => {
    dragPayloadRef.current = { kind: "new", type: kind };
    e.dataTransfer.setData("text/plain", kind);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const activePayload = dragPayloadRef.current;
    const raw = e.dataTransfer.getData("text/plain");
    clearDragState();

    if (activePayload?.kind === "new") {
      addSubsystem(activePayload.type);
      return;
    }

    const kind = raw as SubsystemType;
    if (VALID_TYPES.has(kind)) {
      addSubsystem(kind);
    }
  };

  const handleTileDragStart = (e: React.DragEvent<HTMLDivElement>, subId: string) => {
    dragPayloadRef.current = { kind: "reorder", id: subId };
    e.dataTransfer.setData("text/plain", `reorder:${subId}`);
    e.dataTransfer.effectAllowed = "move";
    setDraggingTileId(subId);
  };

  const handleTileDrop = (targetId: string) => {
    const payload = dragPayloadRef.current;
    clearDragState();
    if (!payload || payload.kind !== "reorder" || payload.id === targetId) return;

    const ids = project.subsystems.map((s) => s.id);
    const fromIdx = ids.indexOf(payload.id);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, moved);
    reorderSubsystems(ids);
  };

  const paletteGroups: {
    groupTitle: string;
    items: { kind: SubsystemType; title: string; desc: string }[];
  }[] = [
    {
      groupTitle: "Velocidade & Fluxo",
      items: [
        { kind: "roller", title: "Roller / Intake", desc: "PercentOutput · Un-Jam & STOP/EJECT" },
        { kind: "indexer", title: "Indexer / Feeder", desc: "StallReversal · WAIT_SHOOTER → FEEDING" },
        { kind: "shooter", title: "Shooter / Flywheel", desc: "RPM PID/SVAG · SPOOLING → AT_SPEED" },
      ],
    },
    {
      groupTitle: "Posição & Precisão",
      items: [
        { kind: "arm", title: "Arm / Pivot", desc: "SmartPos (°) · armGravity()" },
        { kind: "elevator", title: "Elevator", desc: "SmartMotion (rot) · Gravity kG" },
        { kind: "turret", title: "Turret", desc: "PositionWrap 0–360° · AIM/CENTER" },
        { kind: "wrist", title: "Wrist", desc: "Degrees · armGravity() compacta" },
        { kind: "hood", title: "Shooter Hood", desc: "SmartPos (°) · CLOSE/FAR/LOW" },
      ],
    },
    {
      groupTitle: "Força & Sinalização",
      items: [
        { kind: "climber", title: "Climber", desc: "Brake 60A · EXTEND/CLIMB" },
        { kind: "leds", title: "LEDs", desc: "AddressableLED / CANdle · LedArbiter" },
        { kind: "generic", title: "Motor Genérico", desc: "StateSubsystem simples" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editor do Robô"
        description="Arraste ou clique em mecanismos Ciprix para montar seu robô e inspecione a lógica da SuperStructure."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Zone 1: Left Component Library Sidebar */}
        <Card data-tour="subsystem-palette" className="lg:col-span-3 flex flex-col">
          <CardHeader>
            <CardTitle>Componentes</CardTitle>
            <CardDescription>Arraste para o canvas ou clique para adicionar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2.5">
              <p className="font-headline text-xs font-semibold uppercase tracking-wider text-sky-400">
                Base / Tração
              </p>
              <button
                type="button"
                onClick={openDrivetrain}
                className={cn(
                  "group w-full select-none flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-150 hover:scale-[1.02] hover:border-[#60a5fa] hover:bg-[#19253d] cursor-pointer",
                  isDrivetrainSelected
                    ? "border-sky-400 bg-[#19253d]"
                    : "border-[#2c3f61] bg-[#0f1624]",
                )}
              >
                <span className="h-8 w-1 shrink-0 rounded-full bg-sky-400" />
                <Compass className="h-5 w-5 shrink-0 text-sky-400" />
                <div className="min-w-0 flex-1">
                  <p className="font-headline text-sm font-semibold text-white">Drivetrain</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {project.drivetrain?.enabled
                      ? `${project.drivetrain.type} · ${project.drivetrain.maxSpeedMps} m/s`
                      : "Swerve / YAGSL / Tank / Mecanum"}
                  </p>
                </div>
                <Badge variant={project.drivetrain?.enabled ? "success" : "outline"} className="text-[10px]">
                  {project.drivetrain?.enabled ? "Ativo" : "Stub"}
                </Badge>
              </button>
            </div>

            {paletteGroups.map((group) => (
              <div key={group.groupTitle} className="space-y-2.5">
                <p className="font-headline text-xs font-semibold uppercase tracking-wider text-[#93c5fd]">
                  {group.groupTitle}
                </p>
                <div className="flex flex-col gap-2">
                  {group.items.map((item) => {
                    const theme = getSubsystemTheme(item.kind);
                    return (
                      <div
                        key={item.kind}
                        role="button"
                        tabIndex={0}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item.kind)}
                        onDragEnd={clearDragState}
                        onClick={() => addSubsystem(item.kind)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            addSubsystem(item.kind);
                          }
                        }}
                        className="group select-none flex items-center gap-3 rounded-xl border border-[#2c3f61] bg-[#0f1624] p-3 text-left transition-all duration-150 hover:scale-[1.02] hover:border-[#60a5fa] hover:bg-[#19253d] active:scale-[0.98] cursor-grab active:cursor-grabbing"
                      >
                        <span className={`h-8 w-1 shrink-0 rounded-full ${theme.barBg}`} />
                        <SubsystemIcon
                          type={item.kind}
                          className={`h-5 w-5 shrink-0 ${theme.iconText}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-headline text-sm font-semibold text-white">
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-400">{item.desc}</p>
                        </div>
                        <Plus className="h-4 w-4 text-slate-500 group-hover:text-white shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
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
                if (dragPayloadRef.current?.kind === "reorder") return;
                dragCounter.current += 1;
                if (dragCounter.current === 1) setIsDragOver(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragPayloadRef.current?.kind === "reorder") {
                  e.dataTransfer.dropEffect = "move";
                } else {
                  e.dataTransfer.dropEffect = "copy";
                  if (!isDragOver) setIsDragOver(true);
                }
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                if (dragPayloadRef.current?.kind === "reorder") return;
                dragCounter.current = Math.max(0, dragCounter.current - 1);
                if (dragCounter.current === 0) setIsDragOver(false);
              }}
              onDrop={handleDrop}
            >
              {canvasView === "blocks" ? (
                <div
                  key="blocks"
                  className={cn(
                    "relative h-full w-full overflow-y-auto bg-[#0b0f17] transition-colors animate-fade-in",
                    isDragOver && "ring-2 ring-inset ring-[#60a5fa] bg-[#0f182a]",
                  )}
                >
                  <div className="pointer-events-none absolute inset-0 bg-canvas-grid" />
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_60%_at_50%_0%,rgba(20,44,79,0.55),transparent_70%)]" />

                  <div className="relative z-10 h-full p-6">
                    {project.subsystems.length === 0 && !project.drivetrain?.enabled && !isDragOver ? (
                      <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
                        <Blocks className="h-12 w-12 text-slate-500" />
                        <p className="mt-3 font-headline text-lg font-medium text-slate-200">
                          Arraste um mecanismo ou clique na barra à esquerda
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-4">
                        {(() => {
                          const dt = project.drivetrain;
                          const dtErrors = issues.filter(
                            (i) => i.targetId === "drivetrain" && i.severity === "error",
                          ).length;
                          const dtLabel = dt?.enabled
                            ? dt.type === "ctre_swerve"
                              ? "CTRE Swerve"
                              : dt.type === "yagsl"
                                ? "YAGSL"
                                : dt.type === "akit_swerve"
                                  ? "AKit Swerve"
                                  : dt.type === "differential"
                                    ? "Differential"
                                    : "Mecanum"
                            : "Stub";
                          return (
                            <div
                              onClick={openDrivetrain}
                              className={cn(
                                "group relative select-none overflow-hidden aspect-square rounded-xl border-2 flex flex-col justify-between text-center transition-all duration-200 cursor-pointer hover:border-[#60a5fa] hover:bg-[#192844]",
                                dt?.enabled ? "bg-[#142038]" : "bg-[#0f1624] border-dashed opacity-85",
                                isDrivetrainSelected
                                  ? "border-sky-400 bg-[#1b2c4a] shadow-lg animate-select-bounce"
                                  : "border-[#253552]",
                                dtErrors > 0 && "border-rose-500 ring-1 ring-rose-500/60",
                              )}
                            >
                              <div
                                className={cn(
                                  "h-1.5 w-full shrink-0",
                                  dtErrors > 0 ? "bg-rose-500" : dt?.enabled ? "bg-sky-400" : "bg-slate-600",
                                )}
                              />
                              <div className="relative flex flex-1 flex-col items-center justify-center px-3 pt-4 pb-2">
                                {dtErrors > 0 && (
                                  <span className="absolute right-2 top-1.5 inline-flex items-center gap-0.5 rounded-full bg-rose-600 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white">
                                    <AlertTriangle className="h-2.5 w-2.5" />
                                    {dtErrors}
                                  </span>
                                )}
                                <Compass className="h-8 w-8 text-sky-400 transition-transform duration-200 group-hover:scale-110" />
                                <p className="mt-2 w-full truncate font-headline text-sm font-bold text-white">
                                  Drive
                                </p>
                                <div className="mt-1.5 flex items-center justify-center gap-1 font-mono text-[10px]">
                                  <span className="rounded bg-[#0b0f17] px-1.5 py-0.5 text-[#93c5fd] font-semibold">
                                    {dtLabel}
                                  </span>
                                </div>
                              </div>
                              <div className="px-3 pb-2.5 space-y-1">
                                <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                                  <span className="truncate">
                                    {dt?.enabled ? dt.gyro.type : "DriveContext"}
                                  </span>
                                  <span>
                                    {dt?.enabled ? `${dt.maxSpeedMps} m/s` : "Opcional"}
                                  </span>
                                </div>
                                <div className="h-1 w-full overflow-hidden rounded-full bg-[#0b0f17]">
                                  <div
                                    className={cn(
                                      "h-full transition-all",
                                      dt?.enabled ? "bg-sky-400" : "bg-slate-600",
                                    )}
                                    style={{ width: dt?.enabled ? "100%" : "25%" }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                        {project.subsystems.map((sub, idx) => {
                          const isSelected = selected?.id === sub.id;
                          const isNewlyAdded = lastAddedId === sub.id;
                          const isDraggingThis = draggingTileId === sub.id;
                          const isDropTarget = dragOverTileId === sub.id && draggingTileId !== sub.id;
                          const subErrors = issues.filter(
                            (i) => i.targetId === sub.id && i.severity === "error",
                          ).length;
                          const isLedSub = isLedSubsystem(sub);
                          const vendorLabel = isLedSub
                            ? sub.leds.driver === "candle"
                              ? "CANdle"
                              : "PWM LED"
                            : sub.motor?.vendor === "talonfx"
                              ? "TalonFX"
                              : sub.motor?.vendor === "sparkmax"
                                ? "SparkMax"
                                : "TalonSRX";
                          const theme = getSubsystemTheme(sub.type);
                          const currentPct = isLedSub
                            ? Math.min(100, Math.round((sub.leds.ledCount / 300) * 100))
                            : Math.min(
                                100,
                                Math.round(((sub.motor?.currentLimitAmps ?? 40) / 120) * 100),
                              );
                          const primaryBadge = isLedSub
                            ? sub.leds.driver === "candle"
                              ? `CAN ${sub.leds.canId ?? 30}`
                              : `PWM ${sub.leds.pwmPort ?? 0}`
                            : `CAN ${sub.motor?.canId ?? 0}`;
                          const rightFootLabel = isLedSub
                            ? `${sub.leds.ledCount} LEDs`
                            : `${sub.motor?.currentLimitAmps ?? 40}A`;
                          const sensorCount = sub.sensors?.length ?? 0;

                          return (
                            <div
                              key={sub.id}
                              draggable
                              onDragStart={(e) => handleTileDragStart(e, sub.id)}
                              onDragOver={(e) => {
                                if (dragPayloadRef.current?.kind !== "reorder") return;
                                e.preventDefault();
                                e.stopPropagation();
                                e.dataTransfer.dropEffect = "move";
                                if (dragOverTileId !== sub.id) setDragOverTileId(sub.id);
                              }}
                              onDragLeave={() => {
                                if (dragOverTileId === sub.id) setDragOverTileId(null);
                              }}
                              onDrop={(e) => {
                                if (dragPayloadRef.current?.kind !== "reorder") return;
                                e.preventDefault();
                                e.stopPropagation();
                                handleTileDrop(sub.id);
                              }}
                              onDragEnd={clearDragState}
                              onClick={() => setSelectedSubsystemId(sub.id)}
                              className={cn(
                                "group relative select-none overflow-hidden aspect-square rounded-xl border-2 bg-[#162238] flex flex-col justify-between text-center transition-all duration-200 cursor-grab active:cursor-grabbing hover:border-[#60a5fa] hover:bg-[#192844]",
                                isSelected
                                  ? `${theme.borderActive} bg-[#1b2c4a] shadow-lg animate-select-bounce`
                                  : "border-[#253552]",
                                isNewlyAdded && "animate-pop-in animate-pulse-ring",
                                isDraggingThis && "opacity-45 scale-95",
                                isDropTarget && "border-[#60a5fa] ring-2 ring-[#60a5fa]/40 scale-[1.03]",
                                subErrors > 0 && "border-rose-500 ring-1 ring-rose-500/60",
                              )}
                            >
                              <div
                                className={cn(
                                  "h-1.5 w-full shrink-0",
                                  subErrors > 0 ? "bg-rose-500" : theme.barBg,
                                )}
                              />
                              <div className="relative flex flex-1 flex-col items-center justify-center px-3 pt-5 pb-2">
                                <div className="absolute left-2 top-1.5 flex items-center gap-0.5 opacity-55 group-hover:opacity-100">
                                  <GripVertical className="h-3.5 w-3.5 text-slate-400" />
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

                                {subErrors > 0 ? (
                                  <span className="absolute right-2 top-1.5 inline-flex items-center gap-1 rounded-full bg-rose-600 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white shadow">
                                    <AlertTriangle className="h-3 w-3" />
                                    {subErrors}
                                  </span>
                                ) : sub.isDefaultTemplate ? (
                                  <span className="absolute right-2 top-1.5">
                                    <Hint hintKey="subsystems.*.basicDefaults" tone="warning" />
                                  </span>
                                ) : null}

                                <SubsystemIcon
                                  type={sub.type}
                                  className={cn("mb-2 h-9 w-9", theme.iconText)}
                                />
                                <span className="font-headline text-sm font-semibold text-white break-words">
                                  {sub.name}
                                </span>
                                <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1">
                                  <Badge variant="default" className="text-[10px] px-1.5 py-0 tabular-nums">
                                    {primaryBadge}
                                  </Badge>
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {vendorLabel}
                                  </Badge>
                                  {!isLedSub && sub.motor && (
                                    <span className="rounded border border-[#22304a] bg-[#0b0f17] px-1.5 py-0 font-mono text-[9px] uppercase text-slate-300">
                                      {sub.motor.neutralMode}
                                    </span>
                                  )}
                                  {sensorCount > 0 && (
                                    <span className="rounded border border-cyan-700/60 bg-cyan-950/60 px-1.5 py-0 font-mono text-[9px] text-cyan-200">
                                      {sensorCount} {sensorCount === 1 ? "sensor" : "sensores"}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="border-t border-[#22304a]/80 bg-[#0f1624]/90 px-3 py-1.5">
                                <div className="flex items-center justify-between font-mono text-[10px] text-slate-400 tabular-nums mb-1">
                                  <span>{sub.type}</span>
                                  <span className="text-slate-200">{rightFootLabel}</span>
                                </div>
                                <div className="h-1 w-full overflow-hidden rounded-full bg-[#0b0f17]">
                                  <div
                                    className={cn("h-full transition-all duration-300", theme.barBg)}
                                    style={{ width: `${currentPct}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {isDragOver && (
                          <div className="aspect-square rounded-xl border-2 border-dashed border-[#60a5fa]/70 bg-[#142c4f]/25 flex flex-col items-center justify-center gap-2 text-[#93c5fd] animate-fade-in">
                            <Plus className="h-7 w-7" />
                            <span className="font-headline text-xs font-medium">Soltar aqui</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div key="flow" className="h-full w-full bg-[#0b0f17] animate-fade-in">
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onNodeDragStop={onNodeDragStop}
                    nodeTypes={nodeTypes}
                    deleteKeyCode={null}
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
            <Card
              data-tour={isDrivetrainSelected ? "drivetrain-panel" : "subsystem-inspector"}
              className="xl:col-span-7"
            >
              {isDrivetrainSelected ? (
                <DrivetrainPanel />
              ) : !selected ? (
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
                      <SubsystemIcon
                        type={selected.type}
                        className={cn("h-5 w-5 shrink-0", getSubsystemTheme(selected.type).iconText)}
                      />
                      <CardTitle className="truncate">{selected.name}</CardTitle>
                      <Badge variant="default">
                        {isLedSubsystem(selected)
                          ? selected.leds.driver === "candle"
                            ? `CAN ${selected.leds.canId ?? 30}`
                            : `PWM ${selected.leds.pwmPort ?? 0}`
                          : `CAN ${selected.motor?.canId ?? 0}`}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {selected.type}
                      </Badge>
                      {selected.isDefaultTemplate && (
                        <Hint hintKey="subsystems.*.basicDefaults" tone="warning" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() =>
                          onDuplicateSubsystem
                            ? onDuplicateSubsystem(selected)
                            : duplicateSubsystem(selected.id)
                        }
                        title={t("subsystems.duplicate")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() =>
                          onRequestDeleteSubsystem
                            ? onRequestDeleteSubsystem(selected)
                            : removeSubsystem(selected.id)
                        }
                        title={t("subsystems.remove")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-5 pt-6">
                    {/* Nome da Classe */}
                    <Field
                      path={`subsystems.${selected.id}.name`}
                      label={t("subsystems.name")}
                      layout="row"
                      controlClassName="w-1/2"
                    >
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
                    </Field>

                    {/* LED Hardware Panel OR Motor Subsystem Inspector */}
                    {isLedSubsystem(selected) ? (
                      <div className="space-y-4">
                        <Field
                          path={`subsystems.${selected.id}.leds.driver`}
                          label="Driver LEDs"
                          layout="row"
                          controlClassName="w-1/2"
                        >
                          <Select
                            value={selected.leds.driver}
                            className="h-9 text-xs font-mono"
                            onChange={(e) => {
                              const driver = e.target.value as "addressableLed" | "candle";
                              updateSubsystem(selected.id, (prev) => ({
                                ...prev,
                                leds: {
                                  ...(prev.leds ?? { driver: "addressableLed", ledCount: 30 }),
                                  driver,
                                  pwmPort:
                                    driver === "addressableLed" ? prev.leds?.pwmPort ?? 0 : prev.leds?.pwmPort,
                                  canId: driver === "candle" ? prev.leds?.canId ?? 30 : prev.leds?.canId,
                                },
                              }));
                            }}
                          >
                            <option value="addressableLed">AddressableLED (PWM)</option>
                            <option value="candle">CTRE CANdle (CAN)</option>
                          </Select>
                        </Field>

                        <Field
                          path={`subsystems.${selected.id}.leds.ledCount`}
                          label="Quantidade de LEDs"
                          layout="row"
                          controlClassName="w-1/2"
                        >
                          <UnitInput
                            unit="LEDs"
                            type="number"
                            min={1}
                            max={300}
                            value={selected.leds.ledCount}
                            onChange={(e) =>
                              updateSubsystem(selected.id, (prev) => ({
                                ...prev,
                                leds: {
                                  ...(prev.leds ?? { driver: "addressableLed", ledCount: 30 }),
                                  ledCount: Math.min(300, Math.max(1, Number.parseInt(e.target.value || "30", 10) || 1)),
                                },
                              }))
                            }
                          />
                        </Field>

                        {selected.leds.driver === "addressableLed" ? (
                          <Field
                            path={`subsystems.${selected.id}.leds.pwmPort`}
                            label="Porta PWM"
                            layout="row"
                            controlClassName="w-1/2"
                          >
                            <UnitInput
                              unit="PWM"
                              type="number"
                              min={0}
                              max={9}
                              value={selected.leds.pwmPort ?? 0}
                              onChange={(e) =>
                                updateSubsystem(selected.id, (prev) => ({
                                  ...prev,
                                  leds: {
                                    ...(prev.leds ?? { driver: "addressableLed", ledCount: 30 }),
                                    pwmPort: Math.min(9, Math.max(0, Number.parseInt(e.target.value || "0", 10) || 0)),
                                  },
                                }))
                              }
                            />
                          </Field>
                        ) : (
                          <>
                            <Field
                              path={`subsystems.${selected.id}.leds.canId`}
                              label="CAN ID CANdle"
                              layout="row"
                              controlClassName="w-1/2"
                            >
                              <UnitInput
                                unit="ID"
                                type="number"
                                min={0}
                                max={62}
                                value={selected.leds.canId ?? 30}
                                onChange={(e) =>
                                  updateSubsystem(selected.id, (prev) => ({
                                    ...prev,
                                    leds: {
                                      ...(prev.leds ?? { driver: "candle", ledCount: 30 }),
                                      canId: Math.min(62, Math.max(0, Number.parseInt(e.target.value || "30", 10) || 0)),
                                    },
                                  }))
                                }
                              />
                            </Field>
                            <Field
                              path={`subsystems.${selected.id}.leds.canBus`}
                              label="Barramento CAN"
                              layout="row"
                              controlClassName="w-1/2"
                            >
                              <Input
                                value={selected.leds.canBus ?? ""}
                                placeholder="rio"
                                className="font-mono"
                                onChange={(e) =>
                                  updateSubsystem(selected.id, (prev) => ({
                                    ...prev,
                                    leds: {
                                      ...(prev.leds ?? { driver: "candle", ledCount: 30 }),
                                      canBus: e.target.value,
                                    },
                                  }))
                                }
                              />
                            </Field>
                          </>
                        )}
                      </div>
                    ) : isMotorSubsystem(selected) ? (() => {
                      const motorSub: MotorSubsystemConfig = selected;
                      const sensors = motorSub.sensors ?? [];
                      return (
                        <div className="space-y-5">
                          {/* CAN ID */}
                          <Field
                            path={`subsystems.${motorSub.id}.motor.canId`}
                            label={t("subsystems.can_id")}
                            layout="row"
                            controlClassName="w-1/2"
                          >
                            <UnitInput
                              unit="ID"
                              type="number"
                              min={0}
                              max={62}
                              value={motorSub.motor.canId}
                              onChange={(e) =>
                                updateSubsystem(motorSub.id, (prev) =>
                                  prev.motor
                                    ? {
                                        ...prev,
                                        motor: {
                                          ...prev.motor,
                                          canId: Math.min(
                                            62,
                                            Math.max(0, Number.parseInt(e.target.value || "0", 10) || 0),
                                          ),
                                        },
                                      }
                                    : prev,
                                )
                              }
                            />
                          </Field>

                          {/* Vendor Tactile Chips */}
                          <Field
                            path={`subsystems.${motorSub.id}.motor.vendor`}
                            label={t("subsystems.vendor")}
                            layout="row"
                            controlClassName="w-1/2"
                          >
                            <div className="grid grid-cols-3 gap-1.5">
                              {vendors.map((v) => (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() =>
                                    updateSubsystem(motorSub.id, (prev) =>
                                      prev.motor ? { ...prev, motor: { ...prev.motor, vendor: v.id } } : prev,
                                    )
                                  }
                                  className={`rounded-md border py-2 text-xs font-medium transition-all cursor-pointer ${
                                    motorSub.motor.vendor === v.id
                                      ? "border-[#60a5fa] bg-[#142c4f] text-white"
                                      : "border-[#253552] bg-[#0f1624] text-slate-300 hover:text-white"
                                  }`}
                                >
                                  {v.label}
                                </button>
                              ))}
                            </div>
                          </Field>

                          {/* Current Limit */}
                          <div className="space-y-2.5 pt-1">
                            <Field
                              path={`subsystems.${motorSub.id}.motor.currentLimitAmps`}
                              label={t("subsystems.current_limit")}
                              layout="row"
                              controlClassName="w-28"
                            >
                              <UnitInput
                                unit="A"
                                type="number"
                                min={1}
                                max={120}
                                value={motorSub.motor.currentLimitAmps}
                                onChange={(e) =>
                                  updateSubsystem(motorSub.id, (prev) =>
                                    prev.motor
                                      ? {
                                          ...prev,
                                          motor: {
                                            ...prev.motor,
                                            currentLimitAmps: Math.min(
                                              120,
                                              Math.max(1, Number.parseInt(e.target.value || "40", 10) || 40),
                                            ),
                                          },
                                        }
                                      : prev,
                                  )
                                }
                              />
                            </Field>
                            <input
                              type="range"
                              min={10}
                              max={120}
                              step={5}
                              value={motorSub.motor.currentLimitAmps}
                              onChange={(e) =>
                                updateSubsystem(motorSub.id, (prev) =>
                                  prev.motor
                                    ? {
                                        ...prev,
                                        motor: {
                                          ...prev.motor,
                                          currentLimitAmps: Number.parseInt(e.target.value, 10),
                                        },
                                      }
                                    : prev,
                                )
                              }
                              className="w-full"
                            />
                          </div>

                          {/* Presence Sensors */}
                          <div
                            data-tour="subsystem-sensors"
                            className="rounded-xl border border-[#22304a] bg-[#0b111e]/60 p-3.5 space-y-2.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Radar className="h-4 w-4 text-cyan-300" />
                                <span className="text-sm font-medium text-white">
                                  {t("subsystems.sensors_title")}
                                </span>
                                <Badge variant="default">{sensors.length}</Badge>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 text-xs"
                                onClick={() => {
                                  const nextIdx = sensors.length + 1;
                                  const newSensor: SensorConfig = {
                                    id: `sen-${Date.now().toString(36)}`,
                                    name: nextIdx === 1 ? "hasPiece" : `sensor${nextIdx}`,
                                    type: "dio",
                                    channel: sensors.length,
                                    inverted: true,
                                  };
                                  updateSubsystem(motorSub.id, (prev) => ({
                                    ...prev,
                                    sensors: [...(prev.sensors ?? []), newSensor],
                                  }));
                                }}
                              >
                                <Plus className="h-3.5 w-3.5" />
                                {t("subsystems.add_sensor")}
                              </Button>
                            </div>

                            {sensors.map((sensor, sIdx) => {
                              const patchSensor = (nextSensor: SensorConfig) => {
                                updateSubsystem(motorSub.id, (prev) => ({
                                  ...prev,
                                  sensors: (prev.sensors ?? []).map((item, i) =>
                                    i === sIdx ? nextSensor : item,
                                  ),
                                }));
                              };
                              return (
                                <div
                                  key={sensor.id}
                                  className="space-y-2 rounded-lg border border-[#22304a] bg-[#0f1624] p-3"
                                >
                                  <div className="flex items-end gap-2">
                                    <Field path={`subsystems.${motorSub.id}.sensors.${sensor.id}.name`} label="Nome (Java)" className="flex-1">
                                      <Input
                                        value={sensor.name}
                                        className="h-8 font-mono text-xs"
                                        onChange={(e) =>
                                          patchSensor({
                                            ...sensor,
                                            name: e.target.value.replace(/[^A-Za-z0-9_]/g, ""),
                                          })
                                        }
                                      />
                                    </Field>
                                    <Field path={`subsystems.${motorSub.id}.sensors.${sensor.id}.type`} label="Tipo" className="w-36">
                                      <Select
                                        value={sensor.type}
                                        className="h-8 font-mono text-xs"
                                        onChange={(e) => {
                                          const nextType = e.target.value as SensorType;
                                          if (nextType === "dio") {
                                            patchSensor({
                                              id: sensor.id,
                                              name: sensor.name,
                                              type: "dio",
                                              channel: 0,
                                              inverted: true,
                                            });
                                          } else if (nextType === "canrange") {
                                            patchSensor({
                                              id: sensor.id,
                                              name: sensor.name,
                                              type: "canrange",
                                              canId: 20,
                                              canBus: "",
                                              thresholdMeters: 0.2,
                                            });
                                          } else {
                                            patchSensor({
                                              id: sensor.id,
                                              name: sensor.name,
                                              type: "lasercan",
                                              canId: 21,
                                              thresholdMm: 150,
                                            });
                                          }
                                        }}
                                      >
                                        <option value="dio">Beam Break (DIO)</option>
                                        <option value="canrange">CANrange (CTRE)</option>
                                        <option value="lasercan">LaserCAN (Grapple)</option>
                                      </Select>
                                    </Field>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8"
                                      onClick={() =>
                                        updateSubsystem(motorSub.id, (prev) => ({
                                          ...prev,
                                          sensors: (prev.sensors ?? []).filter((_, i) => i !== sIdx),
                                        }))
                                      }
                                    >
                                      <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                                    </Button>
                                  </div>

                                  {sensor.type === "dio" && (
                                    <div className="grid grid-cols-2 gap-2">
                                      <Field path={`subsystems.${motorSub.id}.sensors.${sensor.id}.channel`} label="Canal DIO">
                                        <UnitInput
                                          unit="DIO"
                                          type="number"
                                          min={0}
                                          max={25}
                                          value={sensor.channel}
                                          onChange={(e) =>
                                            patchSensor({
                                              ...sensor,
                                              channel: Math.min(25, Math.max(0, Number.parseInt(e.target.value || "0", 10) || 0)),
                                            })
                                          }
                                        />
                                      </Field>
                                      <Field path={`subsystems.${motorSub.id}.sensors.${sensor.id}.inverted`} label="Invertido (NPN)">
                                        <div className="flex h-9 items-center justify-between rounded-md border border-[#22304a] bg-[#0b0f17] px-3">
                                          <span className="text-xs text-slate-300">Active-low</span>
                                          <Switch
                                            checked={sensor.inverted}
                                            onCheckedChange={(checked) =>
                                              patchSensor({ ...sensor, inverted: checked })
                                            }
                                          />
                                        </div>
                                      </Field>
                                    </div>
                                  )}

                                  {sensor.type === "canrange" && (
                                    <div className="grid grid-cols-3 gap-2">
                                      <Field path={`subsystems.${motorSub.id}.sensors.${sensor.id}.canId`} label="CAN ID">
                                        <Input
                                          type="number"
                                          min={0}
                                          max={62}
                                          value={sensor.canId}
                                          className="h-8 font-mono text-xs"
                                          onChange={(e) =>
                                            patchSensor({
                                              ...sensor,
                                              canId: Math.min(62, Math.max(0, Number.parseInt(e.target.value || "20", 10) || 0)),
                                            })
                                          }
                                        />
                                      </Field>
                                      <Field path={`subsystems.${motorSub.id}.sensors.${sensor.id}.canBus`} label="CAN Bus">
                                        <Input
                                          value={sensor.canBus}
                                          placeholder="rio"
                                          className="h-8 font-mono text-xs"
                                          onChange={(e) =>
                                            patchSensor({ ...sensor, canBus: e.target.value })
                                          }
                                        />
                                      </Field>
                                      <Field path={`subsystems.${motorSub.id}.sensors.${sensor.id}.thresholdMeters`} label="Limiar (m)">
                                        <Input
                                          type="number"
                                          step={0.01}
                                          min={0.01}
                                          max={4}
                                          value={sensor.thresholdMeters}
                                          className="h-8 font-mono text-xs"
                                          onChange={(e) =>
                                            patchSensor({
                                              ...sensor,
                                              thresholdMeters: Math.min(4, Math.max(0.01, Number.parseFloat(e.target.value || "0.2") || 0.2)),
                                            })
                                          }
                                        />
                                      </Field>
                                    </div>
                                  )}

                                  {sensor.type === "lasercan" && (
                                    <div className="grid grid-cols-2 gap-2">
                                      <Field path={`subsystems.${motorSub.id}.sensors.${sensor.id}.canId`} label="CAN ID (rio)">
                                        <Input
                                          type="number"
                                          min={0}
                                          max={62}
                                          value={sensor.canId}
                                          className="h-8 font-mono text-xs"
                                          onChange={(e) =>
                                            patchSensor({
                                              ...sensor,
                                              canId: Math.min(62, Math.max(0, Number.parseInt(e.target.value || "21", 10) || 0)),
                                            })
                                          }
                                        />
                                      </Field>
                                      <Field path={`subsystems.${motorSub.id}.sensors.${sensor.id}.thresholdMm`} label="Limiar (mm)">
                                        <Input
                                          type="number"
                                          step={5}
                                          min={10}
                                          max={4000}
                                          value={sensor.thresholdMm}
                                          className="h-8 font-mono text-xs"
                                          onChange={(e) =>
                                            patchSensor({
                                              ...sensor,
                                              thresholdMm: Math.min(4000, Math.max(10, Number.parseInt(e.target.value || "150", 10) || 150)),
                                            })
                                          }
                                        />
                                      </Field>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                    {/* FGCLib-style Show Advanced Switch */}
                    <div className="border-t border-[#22304a] pt-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">
                          Mostrar Configurações Avançadas
                        </p>
                        <p className="text-xs text-slate-400">
                          CAN, Neutro, Inversão, PID/SVAG, Física Sim e Pit Self-Test
                        </p>
                      </div>
                      <Switch checked={showAdvanced} onCheckedChange={setShowAdvanced} />
                    </div>

                    {showAdvanced && (
                      <div className="space-y-4 rounded-xl border border-[#22304a] bg-[#0f1624] p-4 animate-fade-in">
                        {motorSub.motor.vendor === "talonfx" && (
                          <Field
                            path={`subsystems.${motorSub.id}.motor.canBus`}
                            label={t("subsystems.can_bus")}
                            layout="row"
                            controlClassName="w-1/2"
                          >
                            <Input
                              value={motorSub.motor.canBus}
                              placeholder="rio"
                              className="font-mono"
                              onChange={(e) =>
                                updateSubsystem(motorSub.id, (prev) =>
                                  prev.motor
                                    ? { ...prev, motor: { ...prev.motor, canBus: e.target.value } }
                                    : prev,
                                )
                              }
                            />
                          </Field>
                        )}

                        <Field
                          path={`subsystems.${motorSub.id}.motor.neutralMode`}
                          label={t("subsystems.neutral_mode")}
                          layout="row"
                        >
                          <div className="flex rounded-md border border-[#253552] bg-[#0b0f17] p-0.5">
                            {(["coast", "brake"] as const).map((mode) => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() =>
                                  updateSubsystem(motorSub.id, (prev) =>
                                    prev.motor
                                      ? { ...prev, motor: { ...prev.motor, neutralMode: mode } }
                                      : prev,
                                  )
                                }
                                className={`rounded px-3 py-1 text-xs capitalize cursor-pointer ${
                                  motorSub.motor.neutralMode === mode
                                    ? "bg-[#142c4f] text-white"
                                    : "text-slate-400"
                                }`}
                              >
                                {mode}
                              </button>
                            ))}
                          </div>
                        </Field>

                        <Field
                          path={`subsystems.${motorSub.id}.motor.inverted`}
                          label={t("subsystems.inverted")}
                          layout="row"
                        >
                          <Switch
                            checked={motorSub.motor.inverted}
                            onCheckedChange={(checked) =>
                              updateSubsystem(motorSub.id, (prev) =>
                                prev.motor
                                  ? { ...prev, motor: { ...prev.motor, inverted: checked } }
                                  : prev,
                              )
                            }
                          />
                        </Field>

                        <div className="grid grid-cols-2 gap-3">
                          <Field
                            path={`subsystems.${motorSub.id}.motor.gearRatio`}
                            label={t("subsystems.gear_ratio")}
                          >
                            <UnitInput
                              unit=":1"
                              type="number"
                              step={0.1}
                              min={0.1}
                              value={motorSub.motor.gearRatio}
                              onChange={(e) =>
                                updateSubsystem(motorSub.id, (prev) =>
                                  prev.motor
                                    ? {
                                        ...prev,
                                        motor: {
                                          ...prev.motor,
                                          gearRatio: Math.max(
                                            0.1,
                                            Number.parseFloat(e.target.value || "1") || 1,
                                          ),
                                        },
                                      }
                                    : prev,
                                )
                              }
                            />
                          </Field>
                          <Field
                            path={`subsystems.${motorSub.id}.motor.moiKgM2`}
                            label={t("subsystems.moi")}
                          >
                            <UnitInput
                              unit="kg·m²"
                              type="number"
                              step={0.0005}
                              min={0.0001}
                              value={motorSub.motor.moiKgM2}
                              onChange={(e) =>
                                updateSubsystem(motorSub.id, (prev) =>
                                  prev.motor
                                    ? {
                                        ...prev,
                                        motor: {
                                          ...prev.motor,
                                          moiKgM2: Math.max(
                                            0.0001,
                                            Number.parseFloat(e.target.value || "0.001") || 0.001,
                                          ),
                                        },
                                      }
                                    : prev,
                                )
                              }
                            />
                          </Field>
                        </div>

                        {/* Physics parameters for Arm / Elevator / Climber */}
                        {selected.physics && (
                          <div className="grid grid-cols-2 gap-3 border-t border-[#22304a] pt-3">
                            <Field
                              path={`subsystems.${selected.id}.physics.massKg`}
                              label={t("subsystems.mass_kg")}
                            >
                              <UnitInput
                                unit="kg"
                                type="number"
                                step={0.5}
                                min={0.1}
                                value={selected.physics.massKg ?? 4}
                                onChange={(e) =>
                                  updateSubsystem(selected.id, (prev) => ({
                                    ...prev,
                                    physics: {
                                      ...(prev.physics ?? {}),
                                      massKg: Math.max(
                                        0.1,
                                        Number.parseFloat(e.target.value || "4") || 4,
                                      ),
                                    },
                                  }))
                                }
                              />
                            </Field>
                            {selected.type === "arm" || selected.type === "wrist" || selected.type === "hood" ? (
                              <Field
                                path={`subsystems.${selected.id}.physics.lengthMeters`}
                                label={t("subsystems.length_m")}
                              >
                                <UnitInput
                                  unit="m"
                                  type="number"
                                  step={0.05}
                                  min={0.05}
                                  value={selected.physics.lengthMeters ?? 0.5}
                                  onChange={(e) =>
                                    updateSubsystem(selected.id, (prev) => ({
                                      ...prev,
                                      physics: {
                                        ...(prev.physics ?? {}),
                                        lengthMeters: Math.max(
                                          0.05,
                                          Number.parseFloat(e.target.value || "0.5") || 0.5,
                                        ),
                                      },
                                    }))
                                  }
                                />
                              </Field>
                            ) : (
                              <Field
                                path={`subsystems.${selected.id}.physics.drumRadiusMeters`}
                                label={t("subsystems.drum_radius_m")}
                              >
                                <UnitInput
                                  unit="m"
                                  type="number"
                                  step={0.005}
                                  min={0.005}
                                  value={selected.physics.drumRadiusMeters ?? 0.025}
                                  onChange={(e) =>
                                    updateSubsystem(selected.id, (prev) => ({
                                      ...prev,
                                      physics: {
                                        ...(prev.physics ?? {}),
                                        drumRadiusMeters: Math.max(
                                          0.005,
                                          Number.parseFloat(e.target.value || "0.025") || 0.025,
                                        ),
                                      },
                                    }))
                                  }
                                />
                              </Field>
                            )}
                          </div>
                        )}

                        {/* Closed-Loop PID & SVAG + Soft Limits */}
                        {selected.closedLoop && (
                          <div className="space-y-3 border-t border-[#22304a] pt-3">
                            <p className="font-mono text-[11px] uppercase tracking-wider text-[#93c5fd]">
                              Closed-Loop PID / SVAG
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                              {(["kP", "kI", "kD"] as const).map((gain) => (
                                <Field
                                  key={gain}
                                  path={`subsystems.${selected.id}.closedLoop.${gain}`}
                                  label={gain}
                                >
                                  <Input
                                    type="number"
                                    step={0.01}
                                    className="font-mono h-8 text-xs"
                                    value={selected.closedLoop?.[gain] ?? 0}
                                    onChange={(e) => {
                                      const val = Number.parseFloat(e.target.value || "0") || 0;
                                      updateSubsystem(selected.id, (prev) => ({
                                        ...prev,
                                        closedLoop: prev.closedLoop
                                          ? { ...prev.closedLoop, [gain]: val }
                                          : undefined,
                                      }));
                                    }}
                                  />
                                </Field>
                              ))}
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              {(["kS", "kV", "kA", "kG"] as const).map((gain) => (
                                <Field
                                  key={gain}
                                  path={`subsystems.${selected.id}.closedLoop.${gain}`}
                                  label={gain}
                                >
                                  <Input
                                    type="number"
                                    step={0.01}
                                    className="font-mono h-8 text-xs"
                                    value={selected.closedLoop?.[gain] ?? 0}
                                    onChange={(e) => {
                                      const val = Number.parseFloat(e.target.value || "0") || 0;
                                      updateSubsystem(selected.id, (prev) => ({
                                        ...prev,
                                        closedLoop: prev.closedLoop
                                          ? { ...prev.closedLoop, [gain]: val }
                                          : undefined,
                                      }));
                                    }}
                                  />
                                </Field>
                              ))}
                            </div>
                            {selected.closedLoop.limitUnit && (
                              <div className="grid grid-cols-2 gap-3">
                                <Field
                                  path={`subsystems.${selected.id}.closedLoop.minLimit`}
                                  label={t("subsystems.soft_limit_min")}
                                >
                                  <UnitInput
                                    unit={selected.closedLoop.limitUnit}
                                    type="number"
                                    step={1}
                                    value={selected.closedLoop.minLimit ?? 0}
                                    onChange={(e) => {
                                      const val = Number.parseFloat(e.target.value || "0") || 0;
                                      updateSubsystem(selected.id, (prev) => ({
                                        ...prev,
                                        closedLoop: prev.closedLoop
                                          ? { ...prev.closedLoop, minLimit: val }
                                          : undefined,
                                      }));
                                    }}
                                  />
                                </Field>
                                <Field
                                  path={`subsystems.${selected.id}.closedLoop.maxLimit`}
                                  label={t("subsystems.soft_limit_max")}
                                >
                                  <UnitInput
                                    unit={selected.closedLoop.limitUnit}
                                    type="number"
                                    step={1}
                                    value={selected.closedLoop.maxLimit ?? 90}
                                    onChange={(e) => {
                                      const val = Number.parseFloat(e.target.value || "0") || 0;
                                      updateSubsystem(selected.id, (prev) => ({
                                        ...prev,
                                        closedLoop: prev.closedLoop
                                          ? { ...prev.closedLoop, maxLimit: val }
                                          : undefined,
                                      }));
                                    }}
                                  />
                                </Field>
                              </div>
                            )}

                            <div className="space-y-2.5 border-t border-[#22304a]/70 pt-2.5">
                              <Field
                                path={`subsystems.${selected.id}.closedLoop.positionWrap`}
                                label={t("subsystems.position_wrap")}
                                layout="row"
                              >
                                <Switch
                                  checked={Boolean(selected.closedLoop.positionWrap)}
                                  onCheckedChange={(checked) =>
                                    updateSubsystem(selected.id, (prev) => ({
                                      ...prev,
                                      closedLoop: prev.closedLoop
                                        ? { ...prev.closedLoop, positionWrap: checked }
                                        : undefined,
                                    }))
                                  }
                                />
                              </Field>

                              <Field
                                path={`subsystems.${selected.id}.closedLoop.smartMotion`}
                                label={t("subsystems.smart_motion")}
                                layout="row"
                              >
                                <Switch
                                  checked={Boolean(selected.closedLoop.smartMotion)}
                                  onCheckedChange={(checked) =>
                                    updateSubsystem(selected.id, (prev) => ({
                                      ...prev,
                                      closedLoop: prev.closedLoop
                                        ? {
                                            ...prev.closedLoop,
                                            smartMotion: checked
                                              ? prev.closedLoop.smartMotion ?? {
                                                  maxVelRps: 40,
                                                  maxAccelRpss: 80,
                                                  allowedError: 1,
                                                }
                                              : undefined,
                                          }
                                        : undefined,
                                    }))
                                  }
                                />
                              </Field>

                              {selected.closedLoop.smartMotion && (
                                <div className="grid grid-cols-3 gap-2">
                                  <Field
                                    path={`subsystems.${selected.id}.closedLoop.smartMotion.maxVelRps`}
                                    label={t("subsystems.smart_vel")}
                                  >
                                    <UnitInput
                                      unit="RPS"
                                      type="number"
                                      step={1}
                                      min={0.5}
                                      value={selected.closedLoop.smartMotion.maxVelRps}
                                      onChange={(e) => {
                                        const val = Math.max(0.5, Number.parseFloat(e.target.value || "40") || 40);
                                        updateSubsystem(selected.id, (prev) => ({
                                          ...prev,
                                          closedLoop: prev.closedLoop?.smartMotion
                                            ? {
                                                ...prev.closedLoop,
                                                smartMotion: { ...prev.closedLoop.smartMotion, maxVelRps: val },
                                              }
                                            : prev.closedLoop,
                                        }));
                                      }}
                                    />
                                  </Field>
                                  <Field
                                    path={`subsystems.${selected.id}.closedLoop.smartMotion.maxAccelRpss`}
                                    label={t("subsystems.smart_accel")}
                                  >
                                    <UnitInput
                                      unit="RPS²"
                                      type="number"
                                      step={5}
                                      min={1}
                                      value={selected.closedLoop.smartMotion.maxAccelRpss}
                                      onChange={(e) => {
                                        const val = Math.max(1, Number.parseFloat(e.target.value || "80") || 80);
                                        updateSubsystem(selected.id, (prev) => ({
                                          ...prev,
                                          closedLoop: prev.closedLoop?.smartMotion
                                            ? {
                                                ...prev.closedLoop,
                                                smartMotion: { ...prev.closedLoop.smartMotion, maxAccelRpss: val },
                                              }
                                            : prev.closedLoop,
                                        }));
                                      }}
                                    />
                                  </Field>
                                  <Field
                                    path={`subsystems.${selected.id}.closedLoop.smartMotion.allowedError`}
                                    label={t("subsystems.smart_err")}
                                  >
                                    <UnitInput
                                      unit="tol"
                                      type="number"
                                      step={0.1}
                                      min={0.01}
                                      value={selected.closedLoop.smartMotion.allowedError}
                                      onChange={(e) => {
                                        const val = Math.max(0.01, Number.parseFloat(e.target.value || "1") || 1);
                                        updateSubsystem(selected.id, (prev) => ({
                                          ...prev,
                                          closedLoop: prev.closedLoop?.smartMotion
                                            ? {
                                                ...prev.closedLoop,
                                                smartMotion: { ...prev.closedLoop.smartMotion, allowedError: val },
                                              }
                                            : prev.closedLoop,
                                        }));
                                      }}
                                    />
                                  </Field>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Dual-Motor Follower */}
                        <div className="space-y-2.5 border-t border-[#22304a] pt-3">
                          <Field
                            path={`subsystems.${motorSub.id}.motor.follower.enabled`}
                            label={t("subsystems.follower_enable")}
                            layout="row"
                          >
                            <Switch
                              checked={Boolean(motorSub.motor.follower?.enabled)}
                              onCheckedChange={(checked) =>
                                updateSubsystem(motorSub.id, (prev) =>
                                  prev.motor
                                    ? {
                                        ...prev,
                                        motor: {
                                          ...prev.motor,
                                          follower: {
                                            enabled: checked,
                                            canId: prev.motor.follower?.canId ?? prev.motor.canId + 1,
                                            inverted: prev.motor.follower?.inverted ?? false,
                                          },
                                        },
                                      }
                                    : prev,
                                )
                              }
                            />
                          </Field>
                          {motorSub.motor.follower?.enabled && (
                            <div className="grid grid-cols-2 gap-3">
                              <Field
                                path={`subsystems.${motorSub.id}.motor.follower.canId`}
                                label={t("subsystems.follower_can_id")}
                              >
                                <UnitInput
                                  unit="CAN"
                                  type="number"
                                  min={1}
                                  max={62}
                                  value={motorSub.motor.follower.canId}
                                  onChange={(e) => {
                                    const canId = Math.min(62, Math.max(1, Number.parseInt(e.target.value || "1", 10) || 1));
                                    updateSubsystem(motorSub.id, (prev) =>
                                      prev.motor
                                        ? {
                                            ...prev,
                                            motor: {
                                              ...prev.motor,
                                              follower: {
                                                enabled: true,
                                                canId,
                                                inverted: prev.motor.follower?.inverted ?? false,
                                              },
                                            },
                                          }
                                        : prev,
                                    );
                                  }}
                                />
                              </Field>
                              <Field
                                path={`subsystems.${motorSub.id}.motor.follower.inverted`}
                                label={t("subsystems.follower_inverted")}
                              >
                                <div className="flex h-9 items-center justify-between rounded-md border border-[#22304a] bg-[#0b0f17] px-3">
                                  <span className="text-xs text-slate-300">Invertido</span>
                                  <Switch
                                    checked={Boolean(motorSub.motor.follower.inverted)}
                                    onCheckedChange={(checked) =>
                                      updateSubsystem(motorSub.id, (prev) =>
                                        prev.motor
                                          ? {
                                              ...prev,
                                              motor: {
                                                ...prev.motor,
                                                follower: {
                                                  enabled: true,
                                                  canId: prev.motor.follower?.canId ?? prev.motor.canId + 1,
                                                  inverted: checked,
                                                },
                                              },
                                            }
                                          : prev,
                                      )
                                    }
                                  />
                                </div>
                              </Field>
                            </div>
                          )}
                        </div>

                        {/* Proteção & Un-Jam */}
                        <div className="space-y-2.5 border-t border-[#22304a] pt-3">
                          <Field
                            path={`subsystems.${selected.id}.protection.stallReversalEnabled`}
                            label="Proteção & Stall Reversal"
                            layout="row"
                          >
                            <Switch
                              checked={Boolean(selected.protection?.stallReversalEnabled)}
                              onCheckedChange={(checked) =>
                                updateSubsystem(selected.id, (prev) => ({
                                  ...prev,
                                  protection: {
                                    ...(prev.protection ?? {}),
                                    stallReversalEnabled: checked,
                                    stallCurrentAmps: prev.protection?.stallCurrentAmps ?? 35,
                                    stallTimeSec: prev.protection?.stallTimeSec ?? 0.25,
                                    reverseTimeSec: prev.protection?.reverseTimeSec ?? 0.35,
                                    reverseOutput: prev.protection?.reverseOutput ?? 0.3,
                                  },
                                }))
                              }
                            />
                          </Field>
                          {selected.protection?.stallReversalEnabled && (
                            <div className="grid grid-cols-2 gap-2.5">
                              <Field
                                path={`subsystems.${selected.id}.protection.stallCurrentAmps`}
                                label={t("subsystems.stall_current")}
                              >
                                <UnitInput
                                  unit="Stall A"
                                  type="number"
                                  step={1}
                                  min={5}
                                  value={selected.protection.stallCurrentAmps ?? 35}
                                  onChange={(e) => {
                                    const val = Math.max(5, Number.parseFloat(e.target.value || "35") || 35);
                                    updateSubsystem(selected.id, (prev) => ({
                                      ...prev,
                                      protection: { ...(prev.protection ?? {}), stallCurrentAmps: val },
                                    }));
                                  }}
                                />
                              </Field>
                              <Field
                                path={`subsystems.${selected.id}.protection.stallTimeSec`}
                                label={t("subsystems.stall_time")}
                              >
                                <UnitInput
                                  unit="Stall s"
                                  type="number"
                                  step={0.05}
                                  min={0.05}
                                  value={selected.protection.stallTimeSec ?? 0.25}
                                  onChange={(e) => {
                                    const val = Math.max(0.05, Number.parseFloat(e.target.value || "0.25") || 0.25);
                                    updateSubsystem(selected.id, (prev) => ({
                                      ...prev,
                                      protection: { ...(prev.protection ?? {}), stallTimeSec: val },
                                    }));
                                  }}
                                />
                              </Field>
                              <Field
                                path={`subsystems.${selected.id}.protection.reverseTimeSec`}
                                label={t("subsystems.reverse_time")}
                              >
                                <UnitInput
                                  unit="Rev s"
                                  type="number"
                                  step={0.05}
                                  min={0.05}
                                  value={selected.protection.reverseTimeSec ?? 0.35}
                                  onChange={(e) => {
                                    const val = Math.max(0.05, Number.parseFloat(e.target.value || "0.35") || 0.35);
                                    updateSubsystem(selected.id, (prev) => ({
                                      ...prev,
                                      protection: { ...(prev.protection ?? {}), reverseTimeSec: val },
                                    }));
                                  }}
                                />
                              </Field>
                              <Field
                                path={`subsystems.${selected.id}.protection.reverseOutput`}
                                label={t("subsystems.reverse_output")}
                              >
                                <UnitInput
                                  unit="Rev"
                                  type="number"
                                  step={0.05}
                                  min={0}
                                  max={1}
                                  value={selected.protection.reverseOutput ?? 0.3}
                                  onChange={(e) => {
                                    const parsed = Number.parseFloat(e.target.value);
                                    const val = Number.isFinite(parsed)
                                      ? Math.min(1, Math.max(0, parsed))
                                      : 0;
                                    updateSubsystem(selected.id, (prev) => ({
                                      ...prev,
                                      protection: { ...(prev.protection ?? {}), reverseOutput: val },
                                    }));
                                  }}
                                />
                              </Field>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2.5">
                            <Field
                              path={`subsystems.${selected.id}.protection.currentWarningAmps`}
                              label={t("subsystems.current_warning")}
                            >
                              <UnitInput
                                unit="Warn A"
                                type="number"
                                step={1}
                                min={0}
                                value={selected.protection?.currentWarningAmps ?? 0}
                                onChange={(e) => {
                                  const raw = Number.parseFloat(e.target.value || "0") || 0;
                                  updateSubsystem(selected.id, (prev) => ({
                                    ...prev,
                                    protection: {
                                      ...(prev.protection ?? {}),
                                      currentWarningAmps: raw > 0 ? raw : undefined,
                                    },
                                  }));
                                }}
                              />
                            </Field>
                            <Field
                              path={`subsystems.${selected.id}.protection.openLoopRampSec`}
                              label={t("subsystems.open_loop_ramp")}
                            >
                              <UnitInput
                                unit="Ramp s"
                                type="number"
                                step={0.05}
                                min={0}
                                value={selected.protection?.openLoopRampSec ?? 0}
                                onChange={(e) => {
                                  const raw = Number.parseFloat(e.target.value || "0") || 0;
                                  updateSubsystem(selected.id, (prev) => ({
                                    ...prev,
                                    protection: {
                                      ...(prev.protection ?? {}),
                                      openLoopRampSec: raw > 0 ? raw : undefined,
                                    },
                                  }));
                                }}
                              />
                            </Field>
                          </div>
                        </div>

                        <div className="space-y-2.5 border-t border-[#22304a] pt-3">
                          <Field
                            path={`subsystems.${motorSub.id}.selfTest.enabled`}
                            label={t("subsystems.selftest_enable")}
                            layout="row"
                          >
                            <Switch
                              checked={motorSub.selfTest.enabled}
                              onCheckedChange={(checked) =>
                                updateSubsystem(motorSub.id, (prev) =>
                                  prev.selfTest
                                    ? { ...prev, selfTest: { ...prev.selfTest, enabled: checked } }
                                    : prev,
                                )
                              }
                            />
                          </Field>
                          {motorSub.selfTest.enabled && (
                            <div className="grid grid-cols-2 gap-3">
                              <Field
                                path={`subsystems.${motorSub.id}.selfTest.output`}
                                label={t("subsystems.selftest_output")}
                              >
                                <UnitInput
                                  unit="%"
                                  type="number"
                                  step={0.05}
                                  min={-1}
                                  max={1}
                                  value={motorSub.selfTest.output}
                                  onChange={(e) =>
                                    updateSubsystem(motorSub.id, (prev) =>
                                      prev.selfTest
                                        ? {
                                            ...prev,
                                            selfTest: {
                                              ...prev.selfTest,
                                              output: Math.min(
                                                1,
                                                Math.max(-1, Number.parseFloat(e.target.value || "0.3") || 0.3),
                                              ),
                                            },
                                          }
                                        : prev,
                                    )
                                  }
                                />
                              </Field>
                              <Field
                                path={`subsystems.${motorSub.id}.selfTest.minVelocityRps`}
                                label={t("subsystems.selftest_min_rps")}
                              >
                                <UnitInput
                                  unit="RPS"
                                  type="number"
                                  step={0.5}
                                  min={0}
                                  value={motorSub.selfTest.minVelocityRps}
                                  onChange={(e) =>
                                    updateSubsystem(motorSub.id, (prev) =>
                                      prev.selfTest
                                        ? {
                                            ...prev,
                                            selfTest: {
                                              ...prev.selfTest,
                                              minVelocityRps: Math.max(
                                                0,
                                                Number.parseFloat(e.target.value || "5") || 5,
                                              ),
                                            },
                                          }
                                        : prev,
                                    )
                                  }
                                />
                              </Field>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                        </div>
                      );
                    })() : null}
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
                  <div
                    key="code-empty"
                    className="flex flex-1 items-center justify-center p-6 text-sm text-slate-400 animate-fade-in"
                  >
                    Selecione um subsistema para visualizar os arquivos Java gerados.
                  </div>
                ) : (
                  <div key="code" className="flex flex-1 flex-col min-h-0 animate-fade-in">
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
                <div key="summary" className="flex-1 overflow-auto p-4 animate-fade-in">
                  {project.subsystems.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">
                      Nenhum subsistema configurado.
                    </p>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-[#22304a] text-slate-400 font-mono">
                        <tr>
                          <th className="py-2 pr-2">Nome</th>
                          <th className="py-2 px-2">Tipo</th>
                          <th className="py-2 px-2">Vendor</th>
                          <th className="py-2 px-2">CAN</th>
                          <th className="py-2 px-2">Limite</th>
                          <th className="py-2 pl-2">Neutro</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#22304a] font-mono">
                        {project.drivetrain?.enabled && (
                          <tr
                            onClick={() => setSelectedSubsystemId("drivetrain")}
                            className="bg-sky-950/20 hover:bg-[#19253d] cursor-pointer"
                          >
                            <td className="py-2.5 pr-2 font-sans font-medium text-sky-300">Drive</td>
                            <td className="py-2.5 px-2 text-slate-300">{project.drivetrain.type}</td>
                            <td className="py-2.5 px-2 text-slate-300">
                              {project.drivetrain.motorVendor}
                            </td>
                            <td className="py-2.5 px-2 text-[#93c5fd]">
                              {project.drivetrain.gyro.type === "pigeon2"
                                ? `Pigeon ${project.drivetrain.gyro.canId}`
                                : project.drivetrain.gyro.type}
                            </td>
                            <td className="py-2.5 px-2 text-slate-300">
                              {project.drivetrain.currentLimitAmps}A
                            </td>
                            <td className="py-2.5 pl-2 text-slate-300">brake</td>
                          </tr>
                        )}
                        {project.subsystems.map((sub) => (
                          <tr
                            key={sub.id}
                            onClick={() => setSelectedSubsystemId(sub.id)}
                            className="hover:bg-[#19253d] cursor-pointer"
                          >
                            <td className="py-2.5 pr-2 font-sans font-medium text-white">
                              {sub.name}
                            </td>
                            <td className="py-2.5 px-2 capitalize text-slate-300">{sub.type}</td>
                            <td className="py-2.5 px-2 text-slate-300">
                              {isLedSubsystem(sub) ? sub.leds.driver : sub.motor?.vendor}
                            </td>
                            <td className="py-2.5 px-2 text-[#93c5fd]">
                              {isLedSubsystem(sub)
                                ? sub.leds.driver === "candle"
                                  ? sub.leds.canId ?? 30
                                  : `PWM ${sub.leds.pwmPort ?? 0}`
                                : sub.motor?.canId}
                            </td>
                            <td className="py-2.5 px-2 text-slate-300">
                              {isLedSubsystem(sub)
                                ? `${sub.leds.ledCount} LEDs`
                                : `${sub.motor?.currentLimitAmps ?? 40}A`}
                            </td>
                            <td className="py-2.5 pl-2 capitalize text-slate-300">
                              {isLedSubsystem(sub) ? "—" : sub.motor?.neutralMode}
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
