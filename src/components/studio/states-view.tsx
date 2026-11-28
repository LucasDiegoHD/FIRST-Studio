"use client";

import "@xyflow/react/dist/style.css";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type OnNodeDrag,
  type OnNodesChange,
  type ReactFlowInstance,
} from "@xyflow/react";
import {
  AlertTriangle,
  Code2,
  Compass,
  Gauge,
  LayoutGrid,
  Lightbulb,
  Lock,
  Network,
  Play,
  Plus,
  RotateCcw,
  ScrollText,
  Square,
  Timer,
  Trash2,
  Vibrate,
  X,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useProject } from "@/context/project-context";
import { generateSubsystemMermaid } from "@/lib/generator/mermaid";
import {
  getPrimaryMotorAction,
  isMotorSubsystem,
  type FsmTransition,
  type MotorSubsystemConfig,
  type SubsystemAction,
} from "@/lib/schema/ciprix-project";
import { CodeViewer } from "./code-viewer";
import { BindingsPanel } from "./fsm/bindings-panel";
import { RequestsPanel } from "./fsm/requests-panel";
import { formatMotorHardware, StatesPanel } from "./fsm/states-panel";
import { SuperStructureTab } from "./superstructure-tab";

type FsmInnerTab = "states" | "requests" | "bindings";
type ActionAccent = "slate" | "emerald" | "amber" | "violet";

type SelectedCanvasEdge =
  | { kind: "binding"; request: string }
  | { kind: "transition"; stateName: string; transitionId: string };

const ACCENT_STRIP: Record<ActionAccent, string> = {
  slate: "bg-slate-500/70",
  emerald: "bg-emerald-400",
  amber: "bg-amber-400",
  violet: "bg-violet-400",
};

const ACCENT_TEXT: Record<ActionAccent, string> = {
  slate: "text-slate-300",
  emerald: "text-emerald-300",
  amber: "text-amber-300",
  violet: "text-violet-300",
};

function describePrimaryAction(action: SubsystemAction): {
  headline: string;
  subtext: string | null;
  powerPercent: number | null;
  accent: ActionAccent;
  kind: SubsystemAction["type"];
} {
  switch (action.type) {
    case "stop":
      return {
        headline: "Parado",
        subtext: null,
        powerPercent: null,
        accent: "slate",
        kind: "stop",
      };
    case "percentOutput": {
      const pct = Math.round(action.value * 100);
      return {
        headline: pct >= 0 ? `Frente +${pct}%` : `Reverso ${pct}%`,
        subtext: action.constantName,
        powerPercent: pct,
        accent: pct >= 0 ? "emerald" : "amber",
        kind: "percentOutput",
      };
    }
    case "velocityRpm":
      return {
        headline: `${Math.round(action.value)} RPM`,
        subtext: action.constantName,
        powerPercent: null,
        accent: action.value >= 0 ? "emerald" : "amber",
        kind: "velocityRpm",
      };
    case "positionDeg":
    case "smartPositionDeg":
      return {
        headline: `${action.type === "smartPositionDeg" ? "SmartPos " : ""}${action.value}°`,
        subtext: action.constantName,
        powerPercent: null,
        accent: "violet",
        kind: action.type,
      };
    case "positionRot":
    case "smartPositionRot":
      return {
        headline: `${action.type === "smartPositionRot" ? "SmartPos " : ""}${action.value} rot`,
        subtext: action.constantName,
        powerPercent: null,
        accent: "violet",
        kind: action.type,
      };
  }
}

function formatTransitionLabel(tr: FsmTransition, sensorNameById: Map<string, string>): string {
  const sensorName = tr.sensorId ? (sensorNameById.get(tr.sensorId) ?? tr.sensorId) : "Sensor";
  switch (tr.trigger) {
    case "atSetpoint":
      return "Chegou no alvo";
    case "afterSeconds":
      return `Após ${tr.value ?? 0.5}s`;
    case "stalled":
      return "Travou (stall)";
    case "currentAbove":
      return `Corrente > ${tr.value ?? 35}A`;
    case "sensorTrue":
      return `${sensorName} ativo`;
    case "sensorFalse":
      return `${sensorName} livre`;
  }
}

type RequestNodeData = {
  request: string;
  isActive: boolean;
  isInitial: boolean;
  isBound: boolean;
  onTrigger: (req: string) => void;
};

function RequestFlowNode({ data }: NodeProps<Node<RequestNodeData>>) {
  return (
    <div
      onClick={() => data.onTrigger(data.request)}
      className={`group relative w-[184px] rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer ${
        !data.isBound
          ? "border-dashed border-amber-500/75 bg-amber-950/20 hover:border-amber-400"
          : data.isActive
            ? "border-[#60a5fa] bg-[#142c4f] shadow-[0_0_22px_-6px_rgba(59,130,246,0.75)]"
            : "border-[#2b3f63] bg-[#11192b] hover:border-[#60a5fa]/70"
      }`}
    >
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {data.isActive ? (
            <Zap className="h-3.5 w-3.5 shrink-0 text-sky-400" />
          ) : (
            <Play className="h-3 w-3 shrink-0 text-slate-400 group-hover:text-sky-300" />
          )}
          <span className="truncate font-mono text-xs font-semibold text-white">
            {data.request}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {data.isInitial && (
            <span className="rounded bg-[#142c4f] border border-[#3b6bb5]/70 px-1.5 py-0.5 font-mono text-[9px] uppercase text-[#93c5fd]">
              padrão
            </span>
          )}
          {data.isActive && <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />}
        </div>
      </div>
      <p
        className={`mt-1 text-[10px] truncate ${
          !data.isBound
            ? "text-amber-300"
            : data.isActive
              ? "text-sky-300"
              : "text-slate-400"
        }`}
      >
        {!data.isBound
          ? "Sem ligação · arraste →"
          : data.isActive
            ? "Comando ativo"
            : "Clique p/ testar · arraste →"}
      </p>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-[#0b0f17] !bg-sky-400 hover:!scale-125 transition-transform"
      />
    </div>
  );
}

type FsmStateNodeData = {
  label: string;
  motorTag: string;
  headline: string;
  subtext: string | null;
  powerPercent: number | null;
  accent: ActionAccent;
  primaryKind: SubsystemAction["type"];
  hasLed: boolean;
  hasLog: boolean;
  hasRumble: boolean;
  timeoutSec: number | null;
  transitionCount: number;
  isInitial: boolean;
  isSecurity: boolean;
  isActive: boolean;
  isSelected: boolean;
  errorCount: number;
  onSelect: (name: string) => void;
};

function renderPrimaryIcon(kind: SubsystemAction["type"], powerPercent: number | null, accent: ActionAccent) {
  const color = ACCENT_TEXT[accent];
  if (kind === "stop") return <Square className={`h-3.5 w-3.5 shrink-0 ${color}`} />;
  if (kind === "velocityRpm") return <Gauge className={`h-3.5 w-3.5 shrink-0 ${color}`} />;
  if (
    kind === "positionDeg" ||
    kind === "positionRot" ||
    kind === "smartPositionDeg" ||
    kind === "smartPositionRot"
  ) {
    return <Compass className={`h-3.5 w-3.5 shrink-0 ${color}`} />;
  }
  if ((powerPercent ?? 0) < 0) {
    return <RotateCcw className={`h-3.5 w-3.5 shrink-0 ${color}`} />;
  }
  return <Play className={`h-3.5 w-3.5 shrink-0 ${color}`} />;
}

function FsmStateFlowNode({ data }: NodeProps<Node<FsmStateNodeData>>) {
  const showFooter =
    data.hasLed ||
    data.hasRumble ||
    data.hasLog ||
    data.timeoutSec !== null ||
    data.isActive ||
    data.isSelected;

  const pctAbs = data.powerPercent !== null ? Math.min(100, Math.abs(data.powerPercent)) : 0;

  return (
    <div
      onClick={() => data.onSelect(data.label)}
      className={`group relative w-[252px] rounded-xl border overflow-hidden text-left transition-all cursor-pointer ${
        data.errorCount > 0
          ? "border-rose-500 ring-1 ring-rose-500/60 bg-[#1c1624]"
          : data.isActive
            ? "border-[#60a5fa] bg-[#142c4f] shadow-[0_0_24px_-6px_rgba(59,130,246,0.7)]"
            : data.isSelected
              ? "border-[#60a5fa]/80 ring-1 ring-[#60a5fa]/35 bg-[#18233a]"
              : "border-[#253552] bg-[#131c2e] hover:border-[#3b6bb5]"
      }`}
    >
      <div
        className={`absolute inset-y-0 left-0 w-1 ${
          data.errorCount > 0 ? "bg-rose-500" : ACCENT_STRIP[data.accent]
        }`}
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-[#0b0f17] !bg-slate-400 hover:!bg-sky-400"
      />

      <div className="pl-3.5 pr-3 py-2.5 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between gap-1.5">
          <span className="truncate font-mono text-[13px] font-semibold text-white">
            {data.label}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {data.errorCount > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-600 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                <AlertTriangle className="h-2.5 w-2.5" />
                {data.errorCount}
              </span>
            )}
            {data.isInitial && (
              <span className="rounded bg-[#142c4f] border border-[#3b6bb5]/70 px-1.5 py-0.5 font-mono text-[9px] uppercase text-[#93c5fd]">
                Inicial
              </span>
            )}
            {data.isSecurity && (
              <span className="rounded bg-amber-950/70 border border-amber-600/60 px-1.5 py-0.5 font-mono text-[9px] uppercase text-amber-300">
                Seg
              </span>
            )}
          </div>
        </div>

        {/* Visual Action Box */}
        <div className="rounded-lg border border-[#22304a]/80 bg-[#0b111c]/90 px-2.5 py-2 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              {renderPrimaryIcon(data.primaryKind, data.powerPercent, data.accent)}
              <span className={`truncate text-xs font-medium ${ACCENT_TEXT[data.accent]}`}>
                {data.headline}
              </span>
            </div>
            <span className="shrink-0 font-mono text-[9px] text-slate-400">
              {data.motorTag}
            </span>
          </div>

          {data.powerPercent !== null && (
            <div className="relative h-1.5 w-full rounded-full bg-[#192338] overflow-hidden">
              <div className="absolute inset-y-0 left-1/2 w-px bg-slate-500/60 z-10" />
              {data.powerPercent >= 0 ? (
                <div
                  className="absolute inset-y-0 left-1/2 rounded-r-full bg-emerald-400"
                  style={{ width: `${pctAbs / 2}%` }}
                />
              ) : (
                <div
                  className="absolute inset-y-0 right-1/2 rounded-l-full bg-amber-400"
                  style={{ width: `${pctAbs / 2}%` }}
                />
              )}
            </div>
          )}

          {data.subtext && (
            <p className="truncate font-mono text-[10px] text-slate-500">{data.subtext}</p>
          )}
        </div>

        {/* Footer Extras & Status */}
        {showFooter && (
          <div className="flex items-center justify-between gap-2 text-[10px]">
            <div className="flex items-center gap-1 min-w-0">
              {data.hasLed && (
                <span className="inline-flex items-center gap-0.5 rounded bg-lime-950/60 border border-lime-700/40 px-1.5 py-0.5 text-lime-300">
                  <Lightbulb className="h-2.5 w-2.5" />
                  LED
                </span>
              )}
              {data.hasRumble && (
                <span className="inline-flex items-center gap-0.5 rounded bg-cyan-950/60 border border-cyan-700/40 px-1.5 py-0.5 text-cyan-300">
                  <Vibrate className="h-2.5 w-2.5" />
                </span>
              )}
              {data.hasLog && (
                <span className="inline-flex items-center gap-0.5 rounded bg-amber-950/60 border border-amber-700/40 px-1.5 py-0.5 text-amber-300">
                  <ScrollText className="h-2.5 w-2.5" />
                </span>
              )}
              {data.timeoutSec !== null && (
                <span className="inline-flex items-center gap-0.5 rounded bg-rose-950/60 border border-rose-700/40 px-1.5 py-0.5 font-mono text-rose-300">
                  <Timer className="h-2.5 w-2.5" />
                  {data.timeoutSec}s
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0 font-mono text-[9px] uppercase tracking-wider">
              {data.isActive && <span className="text-sky-300">Ativo</span>}
              {data.isSelected && <span className="text-[#93c5fd]">Editando</span>}
            </div>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className={`!h-3 !w-3 !border-2 !border-[#0b0f17] !bg-cyan-400 hover:!scale-125 transition-all ${
          data.transitionCount > 0 || data.timeoutSec !== null
            ? "opacity-100"
            : "opacity-30 group-hover:opacity-100"
        }`}
      />
    </div>
  );
}

const fsmNodeTypes = {
  requestNode: RequestFlowNode,
  fsmState: FsmStateFlowNode,
};

export function StatesView({
  initialTarget = "subsystem",
  forcedInnerTab = null,
}: {
  initialTarget?: "subsystem" | "superstructure";
  forcedInnerTab?: { tab: FsmInnerTab; seq: number } | null;
}) {
  const {
    project,
    selectedSubsystemId,
    setSelectedSubsystemId,
    updateSubsystem,
    generatedFiles,
    issues,
    focusRequest,
    t,
  } = useProject();

  const [target, setTarget] = useState<"subsystem" | "superstructure">(initialTarget);
  const [innerTab, setInnerTab] = useState<FsmInnerTab>("states");
  const [selectedStateName, setSelectedStateName] = useState<string | null>(null);
  const [simRequest, setSimRequest] = useState<string | null>(null);
  const [simStateOverride, setSimStateOverride] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<SelectedCanvasEdge | null>(null);
  const [layoutTick, setLayoutTick] = useState(0);
  const [showMermaid, setShowMermaid] = useState(false);
  const [showSuperJava, setShowSuperJava] = useState(false);
  const posRef = useRef<Record<string, { x: number; y: number }>>({});
  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);

  useEffect(() => {
    setTarget(initialTarget);
  }, [initialTarget]);

  useEffect(() => {
    if (!forcedInnerTab) return;
    setTarget("subsystem");
    setInnerTab(forcedInnerTab.tab);
  }, [forcedInnerTab]);

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

  const motorHw = useMemo(
    () => (activeSub ? formatMotorHardware(activeSub) : null),
    [activeSub],
  );

  const patchFsm = useCallback(
    (fn: (fsm: MotorSubsystemConfig["fsm"]) => MotorSubsystemConfig["fsm"]) => {
      if (!activeSub) return;
      updateSubsystem(activeSub.id, (prev) =>
        prev.fsm ? { ...prev, fsm: fn(prev.fsm) } : prev,
      );
    },
    [activeSub, updateSubsystem],
  );

  const activeRequest =
    simRequest && activeSub?.fsm.requests.includes(simRequest)
      ? simRequest
      : (activeSub?.fsm.initialRequest ?? null);

  const activeBinding = activeSub?.fsm.bindings.find((b) => b.request === activeRequest);
  const baseSimState =
    activeBinding?.goalState ?? activeBinding?.entryState ?? activeSub?.fsm.initialState ?? null;
  const validOverride =
    simStateOverride && activeSub?.fsm.states.some((s) => s.name === simStateOverride)
      ? simStateOverride
      : null;
  const activeSimState = validOverride ?? baseSimState;

  const activeStateObj =
    activeSub?.fsm.states.find((s) => s.name === selectedStateName) ??
    activeSub?.fsm.states[0] ??
    null;

  const activeSimStateObj =
    activeSub?.fsm.states.find((s) => s.name === activeSimState) ?? null;

  const sensorNameById = useMemo(
    () => new Map((activeSub?.sensors ?? []).map((s) => [s.id, s.name])),
    [activeSub?.sensors],
  );

  const computedNodes = useMemo<Node[]>(() => {
    if (!activeSub) return [];
    const list: Node[] = [];
    const boundReqSet = new Set(activeSub.fsm.bindings.map((b) => b.request));
    const entryStateSet = new Set<string>([
      activeSub.fsm.initialState,
      ...activeSub.fsm.bindings.map((b) => b.entryState),
    ]);

    const stateYByName = new Map<string, number>();
    let primaryIdx = 0;
    let secondaryIdx = 0;
    activeSub.fsm.states.forEach((st) => {
      const id = `state-${st.name}`;
      const isPrimary = entryStateSet.has(st.name);
      const defaultPos = isPrimary
        ? { x: 286, y: 24 + primaryIdx++ * 168 }
        : { x: 610, y: 24 + secondaryIdx++ * 168 };
      const pos = posRef.current[id] ?? defaultPos;
      stateYByName.set(st.name, pos.y);

      const errorCount = issues.filter(
        (i) => i.targetId === activeSub.id && i.stateName === st.name && i.severity === "error",
      ).length;
      const summary = describePrimaryAction(getPrimaryMotorAction(st));

      list.push({
        id,
        type: "fsmState",
        position: pos,
        data: {
          label: st.name,
          motorTag: motorHw?.shortTag ?? "",
          headline: summary.headline,
          subtext: summary.subtext,
          powerPercent: summary.powerPercent,
          accent: summary.accent,
          primaryKind: summary.kind,
          hasLed: st.actions.some((a) => a.kind === "leds"),
          hasLog: st.actions.some((a) => a.kind === "log"),
          hasRumble: st.actions.some((a) => a.kind === "rumble"),
          timeoutSec: st.timeoutAfterSec ?? null,
          transitionCount: st.transitions?.length ?? 0,
          isInitial: st.name === activeSub.fsm.initialState,
          isSecurity: st.name === activeSub.fsm.securityState,
          isActive: st.name === activeSimState,
          isSelected: activeStateObj?.name === st.name,
          errorCount,
          onSelect: (name: string) => {
            setSelectedStateName(name);
            setInnerTab("states");
          },
        } satisfies FsmStateNodeData,
      });
    });

    const bindingByReq = new Map(activeSub.fsm.bindings.map((b) => [b.request, b]));
    const usedReqYs: number[] = [];
    let fallbackY = 28;
    activeSub.fsm.requests.forEach((req) => {
      const id = `req-${req}`;
      const stored = posRef.current[id];
      let pos = stored;
      if (!pos) {
        const entryTarget = bindingByReq.get(req)?.entryState;
        const targetY = entryTarget !== undefined ? stateYByName.get(entryTarget) : undefined;
        let y = targetY !== undefined ? targetY + 28 : fallbackY;
        while (usedReqYs.some((ry) => Math.abs(y - ry) < 84)) {
          const conflicting = usedReqYs.find((ry) => Math.abs(y - ry) < 84)!;
          y = conflicting + 92;
        }
        usedReqYs.push(y);
        fallbackY = Math.max(fallbackY, y + 92);
        pos = { x: 24, y };
      }

      list.unshift({
        id,
        type: "requestNode",
        position: pos,
        data: {
          request: req,
          isActive: activeRequest === req && validOverride === null,
          isInitial: req === activeSub.fsm.initialRequest,
          isBound: boundReqSet.has(req),
          onTrigger: (r: string) => {
            setSimRequest(r);
            setSimStateOverride(null);
            setSelectedEdge({ kind: "binding", request: r });
          },
        } satisfies RequestNodeData,
      });
    });

    void layoutTick;
    return list;
  }, [activeSub, motorHw, activeRequest, activeSimState, validOverride, activeStateObj, issues, layoutTick]);

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
    const list: Edge[] = [];

    activeSub.fsm.bindings.forEach((b, idx) => {
      const isFired = b.request === activeRequest && validOverride === null;
      const isEdgeSelected =
        selectedEdge?.kind === "binding" && selectedEdge.request === b.request;
      const stroke = isEdgeSelected ? "#93c5fd" : isFired ? "#60a5fa" : "#2f4770";

      list.push({
        id: `e-bind-${b.request}-${idx}`,
        source: `req-${b.request}`,
        target: `state-${b.entryState}`,
        animated: isFired,
        markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15, color: stroke },
        data: { kind: "binding", request: b.request } satisfies SelectedCanvasEdge,
        style: {
          stroke,
          strokeWidth: isEdgeSelected ? 2.8 : isFired ? 2.2 : 1.5,
        },
      });

      const steps = [b.entryState, ...b.intermediateStates];
      if (b.goalState !== steps[steps.length - 1]) {
        steps.push(b.goalState);
      }
      for (let i = 0; i < steps.length - 1; i++) {
        list.push({
          id: `e-seq-${b.request}-${idx}-${i}`,
          source: `state-${steps[i]}`,
          target: `state-${steps[i + 1]}`,
          label: `Etapa ${i + 1} (${b.request})`,
          animated: isFired,
          markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: "#38bdf8" },
          labelStyle: { fill: "#7dd3fc", fontSize: 10, fontFamily: "monospace" },
          labelBgStyle: { fill: "#0f1624", fillOpacity: 0.95 },
          style: {
            stroke: "#38bdf8",
            strokeWidth: 1.5,
            strokeDasharray: "4 3",
          },
        });
      }
    });

    for (const st of activeSub.fsm.states) {
      for (const tr of st.transitions ?? []) {
        const isEdgeSelected =
          selectedEdge?.kind === "transition" &&
          selectedEdge.stateName === st.name &&
          selectedEdge.transitionId === tr.id;
        const stroke = isEdgeSelected ? "#67e8f9" : "#22d3ee";
        list.push({
          id: `e-tr-${st.name}-${tr.id}`,
          source: `state-${st.name}`,
          target: `state-${tr.targetState}`,
          label: formatTransitionLabel(tr, sensorNameById),
          animated: st.name === activeSimState,
          markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15, color: stroke },
          data: {
            kind: "transition",
            stateName: st.name,
            transitionId: tr.id,
          } satisfies SelectedCanvasEdge,
          labelStyle: {
            fill: isEdgeSelected ? "#ffffff" : "#67e8f9",
            fontSize: 10,
            fontFamily: "sans-serif",
          },
          labelBgStyle: {
            fill: isEdgeSelected ? "#164e63" : "#0f1624",
            fillOpacity: 0.95,
          },
          style: {
            stroke,
            strokeWidth: isEdgeSelected ? 2.8 : 1.7,
            strokeDasharray: "5 3",
          },
        });
      }
      if (st.timeoutAfterSec && activeSub.fsm.securityState) {
        list.push({
          id: `e-to-${st.name}`,
          source: `state-${st.name}`,
          target: `state-${activeSub.fsm.securityState}`,
          label: `Timeout ${st.timeoutAfterSec}s`,
          markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: "#fb7185" },
          labelStyle: { fill: "#fda4af", fontSize: 10, fontFamily: "sans-serif" },
          labelBgStyle: { fill: "#0f1624", fillOpacity: 0.95 },
          style: {
            stroke: "#fb7185",
            strokeWidth: 1.5,
            strokeDasharray: "3 3",
          },
        });
      }
    }

    return list;
  }, [activeSub, activeRequest, validOverride, activeSimState, selectedEdge, sensorNameById]);

  const isValidConnection = useCallback((connection: Connection | Edge) => {
    if (!connection.source || !connection.target) return false;
    if (connection.source === connection.target) return false;
    if (connection.source.startsWith("req-") && connection.target.startsWith("state-")) {
      return true;
    }
    if (connection.source.startsWith("state-") && connection.target.startsWith("state-")) {
      return true;
    }
    return false;
  }, []);

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!activeSub || !connection.source || !connection.target) return;
      if (connection.source.startsWith("req-") && connection.target.startsWith("state-")) {
        const reqName = connection.source.slice(4);
        const stateName = connection.target.slice(6);
        patchFsm((fsm) => {
          const exists = fsm.bindings.some((b) => b.request === reqName);
          return {
            ...fsm,
            bindings: exists
              ? fsm.bindings.map((b) =>
                  b.request === reqName
                    ? { ...b, entryState: stateName, goalState: stateName, intermediateStates: [] }
                    : b,
                )
              : [
                  ...fsm.bindings,
                  {
                    request: reqName,
                    entryState: stateName,
                    goalState: stateName,
                    intermediateStates: [],
                  },
                ],
          };
        });
        setSimRequest(reqName);
        setSimStateOverride(null);
        setSelectedEdge({ kind: "binding", request: reqName });
        return;
      }

      if (
        connection.source.startsWith("state-") &&
        connection.target.startsWith("state-") &&
        connection.source !== connection.target
      ) {
        const fromState = connection.source.slice(6);
        const toState = connection.target.slice(6);
        const sensors = activeSub.sensors ?? [];
        const newTr: FsmTransition = sensors.length > 0
          ? {
              id: `tr-${Date.now().toString(36)}`,
              trigger: "sensorTrue",
              sensorId: sensors[0].id,
              targetState: toState,
            }
          : {
              id: `tr-${Date.now().toString(36)}`,
              trigger: "afterSeconds",
              value: 0.5,
              targetState: toState,
            };

        patchFsm((fsm) => ({
          ...fsm,
          states: fsm.states.map((st) =>
            st.name === fromState
              ? { ...st, transitions: [...(st.transitions ?? []), newTr] }
              : st,
          ),
        }));
        setSelectedStateName(fromState);
        setSelectedEdge({ kind: "transition", stateName: fromState, transitionId: newTr.id });
      }
    },
    [activeSub, patchFsm],
  );

  const handleEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    const raw = edge.data as SelectedCanvasEdge | undefined;
    if (!raw) return;
    if (raw.kind === "binding") {
      setSelectedEdge({ kind: "binding", request: raw.request });
    } else if (raw.kind === "transition") {
      setSelectedStateName(raw.stateName);
      setSelectedEdge({
        kind: "transition",
        stateName: raw.stateName,
        transitionId: raw.transitionId,
      });
    }
  }, []);

  const handleAutoOrganize = useCallback(() => {
    posRef.current = {};
    setLayoutTick((v) => v + 1);
    setTimeout(() => {
      rfInstanceRef.current?.fitView({ padding: 0.2, duration: 220 });
    }, 30);
  }, []);

  const selectedBindingObj =
    selectedEdge?.kind === "binding"
      ? activeSub?.fsm.bindings.find((b) => b.request === selectedEdge.request)
      : undefined;

  const selectedTransitionObj =
    selectedEdge?.kind === "transition"
      ? activeSub?.fsm.states
          .find((s) => s.name === selectedEdge.stateName)
          ?.transitions?.find((tr) => tr.id === selectedEdge.transitionId)
      : undefined;

  const superJavaFile = useMemo(
    () => generatedFiles.find((f) => f.path.endsWith("SuperStructure.java")),
    [generatedFiles],
  );

  const tabErrors = useMemo(() => {
    if (!activeSub) return { states: 0, requests: 0, bindings: 0 };
    const subErrors = issues.filter(
      (i) => i.targetId === activeSub.id && i.severity === "error",
    );
    let requests = 0;
    let bindings = 0;
    let states = 0;
    for (const err of subErrors) {
      const p = err.path ?? "";
      if (p.includes(".fsm.requests.") || p.includes(".fsm.initialRequest")) {
        requests += 1;
      } else if (p.includes(".fsm.bindings.")) {
        bindings += 1;
      } else if (err.stateName || p.includes(".fsm.")) {
        states += 1;
      }
    }
    return { states, requests, bindings };
  }, [activeSub, issues]);

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
              setSimStateOverride(null);
              setSelectedEdge(null);
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

  const simTransitions = activeSimStateObj?.transitions ?? [];
  const simTimeoutTarget =
    activeSimStateObj?.timeoutAfterSec && activeSub?.fsm.securityState
      ? { seconds: activeSimStateObj.timeoutAfterSec, target: activeSub.fsm.securityState }
      : null;

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
          {/* Left Interactive Visual Logic Builder or Mermaid */}
          <Card className="xl:col-span-7 h-[620px] flex flex-col overflow-hidden">
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#22304a] bg-[#0f1624] px-3.5 py-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-[11px]"
                  onClick={() => {
                    const stateName = `STATE_${activeSub.fsm.states.length + 1}`;
                    patchFsm((fsm) => ({
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
                    setSelectedStateName(stateName);
                    setInnerTab("states");
                  }}
                >
                  <Plus className="h-3 w-3" />
                  Estado
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-[11px]"
                  onClick={() => {
                    const reqName = `REQUEST_${activeSub.fsm.requests.length + 1}`;
                    patchFsm((fsm) => ({
                      ...fsm,
                      requests: [...fsm.requests, reqName],
                    }));
                    setInnerTab("requests");
                  }}
                >
                  <Plus className="h-3 w-3" />
                  Comando
                </Button>
                {!showMermaid && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-[11px] text-slate-300"
                    onClick={handleAutoOrganize}
                    title="Reorganizar colunas automaticamente"
                  >
                    <LayoutGrid className="h-3 w-3" />
                    Organizar
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {motorHw && (
                  <span
                    className="hidden md:inline-flex items-center gap-1 rounded-md border border-[#2c3f61] bg-[#131d31] px-2 py-0.5 font-mono text-[10px] text-[#93c5fd]"
                    title="Motor configurado no Editor do Robô (fixo neste subsistema)"
                  >
                    <Lock className="h-2.5 w-2.5 shrink-0" />
                    {motorHw.fullTag}
                  </span>
                )}
                {activeSimState && (
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-md border border-[#22304a] bg-[#0b111c] px-2 py-0.5 font-mono text-[11px] text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                    {activeSimState}
                  </span>
                )}
                <Button
                  size="sm"
                  variant={showMermaid ? "secondary" : "outline"}
                  className="h-7 px-2.5 font-mono text-[11px] shrink-0"
                  onClick={() => setShowMermaid((v) => !v)}
                >
                  {showMermaid ? (
                    <>
                      <Network className="h-3.5 w-3.5" />
                      {t("fsm.diagram_preview")}
                    </>
                  ) : (
                    <>
                      <Code2 className="h-3.5 w-3.5" />
                      toMermaid()
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Interactive Simulation Step Strip */}
            {!showMermaid && (simTransitions.length > 0 || simTimeoutTarget || validOverride) && (
              <div className="flex flex-wrap items-center gap-1.5 border-b border-[#22304a] bg-[#0d1526] px-3.5 py-1.5 text-[11px]">
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 mr-1">
                  Simular em {activeSimState}:
                </span>
                {simTransitions.map((tr) => (
                  <button
                    key={tr.id}
                    type="button"
                    onClick={() => setSimStateOverride(tr.targetState)}
                    className="rounded border border-cyan-700/60 bg-cyan-950/40 px-2 py-0.5 text-cyan-200 hover:border-cyan-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {formatTransitionLabel(tr, sensorNameById)} → {tr.targetState}
                  </button>
                ))}
                {simTimeoutTarget && (
                  <button
                    type="button"
                    onClick={() => setSimStateOverride(simTimeoutTarget.target)}
                    className="rounded border border-rose-700/60 bg-rose-950/40 px-2 py-0.5 text-rose-200 hover:border-rose-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Timeout {simTimeoutTarget.seconds}s → {simTimeoutTarget.target}
                  </button>
                )}
                {validOverride && (
                  <button
                    type="button"
                    onClick={() => setSimStateOverride(null)}
                    className="ml-auto rounded border border-[#253552] bg-[#131c2e] px-2 py-0.5 text-slate-300 hover:text-white cursor-pointer"
                  >
                    Voltar ao comando
                  </button>
                )}
              </div>
            )}

            {showMermaid ? (
              <div className="flex flex-1 flex-col overflow-auto p-5 bg-[#0b0f17] animate-fade-in">
                <pre className="rounded-lg border border-[#22304a] bg-[#131c2e] p-4 font-mono text-xs text-slate-200">
                  {generateSubsystemMermaid(activeSub)}
                </pre>
              </div>
            ) : (
              <div className="flex-1 min-h-0 h-full w-full bg-[#0b0f17]">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onInit={(inst) => {
                    rfInstanceRef.current = inst;
                  }}
                  onNodesChange={onNodesChange}
                  onNodeDragStop={onNodeDragStop}
                  onConnect={handleConnect}
                  isValidConnection={isValidConnection}
                  onEdgeClick={handleEdgeClick}
                  onPaneClick={() => setSelectedEdge(null)}
                  nodeTypes={fsmNodeTypes}
                  connectionLineType={ConnectionLineType.SmoothStep}
                  connectionLineStyle={{ stroke: "#38bdf8", strokeWidth: 2 }}
                  deleteKeyCode={null}
                  fitView
                  fitViewOptions={{ padding: 0.2 }}
                >
                  <Background
                    variant={BackgroundVariant.Dots}
                    gap={24}
                    size={1}
                    color="rgba(148,163,184,0.14)"
                  />
                  <Controls showInteractive={false} />
                </ReactFlow>
              </div>
            )}

            {/* Inline Quick-Edit Rule Bar for Selected Edge */}
            {!showMermaid && selectedBindingObj && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#3b6bb5]/60 bg-[#121e33] px-3.5 py-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] font-semibold text-sky-300">
                    {selectedBindingObj.request}
                  </span>
                  <span className="text-slate-400">leva ao estado</span>
                  <Select
                    value={selectedBindingObj.entryState}
                    className="h-7 py-0 w-36 font-mono text-xs"
                    onChange={(e) => {
                      const nextState = e.target.value;
                      patchFsm((fsm) => ({
                        ...fsm,
                        bindings: fsm.bindings.map((b) =>
                          b.request === selectedBindingObj.request
                            ? { ...b, entryState: nextState, goalState: nextState, intermediateStates: [] }
                            : b,
                        ),
                      }));
                    }}
                  >
                    {activeSub.fsm.states.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[11px] text-rose-400 hover:text-rose-300"
                    disabled={activeSub.fsm.bindings.length <= 1}
                    onClick={() => {
                      patchFsm((fsm) => ({
                        ...fsm,
                        bindings: fsm.bindings.filter((b) => b.request !== selectedBindingObj.request),
                      }));
                      setSelectedEdge(null);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                    Remover
                  </Button>
                  <button
                    type="button"
                    onClick={() => setSelectedEdge(null)}
                    className="rounded p-1 text-slate-400 hover:text-white cursor-pointer"
                    aria-label="Fechar"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {!showMermaid &&
              selectedEdge?.kind === "transition" &&
              selectedTransitionObj && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-cyan-600/50 bg-[#0f1f2e] px-3.5 py-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] text-cyan-300">
                      {selectedEdge.stateName} → {selectedTransitionObj.targetState}
                    </span>
                    <span className="text-slate-400">quando</span>
                    <Select
                      value={selectedTransitionObj.trigger}
                      className="h-7 py-0 w-40 text-xs"
                      onChange={(e) => {
                        const nextTrigger = e.target.value as FsmTransition["trigger"];
                        patchFsm((fsm) => ({
                          ...fsm,
                          states: fsm.states.map((st) =>
                            st.name === selectedEdge.stateName
                              ? {
                                  ...st,
                                  transitions: (st.transitions ?? []).map((tr) =>
                                    tr.id === selectedEdge.transitionId
                                      ? {
                                          ...tr,
                                          trigger: nextTrigger,
                                          value:
                                            nextTrigger === "afterSeconds"
                                              ? tr.value ?? 0.5
                                              : nextTrigger === "currentAbove"
                                                ? tr.value ?? 35
                                                : undefined,
                                          sensorId:
                                            nextTrigger === "sensorTrue" || nextTrigger === "sensorFalse"
                                              ? tr.sensorId ?? activeSub.sensors?.[0]?.id
                                              : undefined,
                                        }
                                      : tr,
                                  ),
                                }
                              : st,
                          ),
                        }));
                      }}
                    >
                      <option value="atSetpoint">Chegou no alvo</option>
                      <option value="afterSeconds">Após tempo (s)</option>
                      <option value="stalled">Travou (stall)</option>
                      <option value="currentAbove">Corrente acima (A)</option>
                      {(activeSub.sensors ?? []).length > 0 && (
                        <>
                          <option value="sensorTrue">Sensor ativo</option>
                          <option value="sensorFalse">Sensor livre</option>
                        </>
                      )}
                    </Select>

                    {(selectedTransitionObj.trigger === "afterSeconds" ||
                      selectedTransitionObj.trigger === "currentAbove") && (
                      <Input
                        type="number"
                        step={selectedTransitionObj.trigger === "afterSeconds" ? 0.1 : 1}
                        min={0.05}
                        value={
                          selectedTransitionObj.value ??
                          (selectedTransitionObj.trigger === "afterSeconds" ? 0.5 : 35)
                        }
                        className="h-7 py-0 w-20 font-mono text-xs"
                        onChange={(e) => {
                          const val = Math.max(
                            0.05,
                            Number.parseFloat(e.target.value || "0.5") || 0.5,
                          );
                          patchFsm((fsm) => ({
                            ...fsm,
                            states: fsm.states.map((st) =>
                              st.name === selectedEdge.stateName
                                ? {
                                    ...st,
                                    transitions: (st.transitions ?? []).map((tr) =>
                                      tr.id === selectedEdge.transitionId
                                        ? { ...tr, value: val }
                                        : tr,
                                    ),
                                  }
                                : st,
                            ),
                          }));
                        }}
                      />
                    )}

                    {(selectedTransitionObj.trigger === "sensorTrue" ||
                      selectedTransitionObj.trigger === "sensorFalse") && (
                      <Select
                        value={selectedTransitionObj.sensorId ?? activeSub.sensors?.[0]?.id ?? ""}
                        className="h-7 py-0 w-32 font-mono text-xs"
                        onChange={(e) =>
                          patchFsm((fsm) => ({
                            ...fsm,
                            states: fsm.states.map((st) =>
                              st.name === selectedEdge.stateName
                                ? {
                                    ...st,
                                    transitions: (st.transitions ?? []).map((tr) =>
                                      tr.id === selectedEdge.transitionId
                                        ? { ...tr, sensorId: e.target.value }
                                        : tr,
                                    ),
                                  }
                                : st,
                            ),
                          }))
                        }
                      >
                        {(activeSub.sensors ?? []).map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </Select>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[11px] text-rose-400 hover:text-rose-300"
                      onClick={() => {
                        patchFsm((fsm) => ({
                          ...fsm,
                          states: fsm.states.map((st) =>
                            st.name === selectedEdge.stateName
                              ? {
                                  ...st,
                                  transitions: (st.transitions ?? []).filter(
                                    (tr) => tr.id !== selectedEdge.transitionId,
                                  ),
                                }
                              : st,
                          ),
                        }));
                        setSelectedEdge(null);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                      Excluir
                    </Button>
                    <button
                      type="button"
                      onClick={() => setSelectedEdge(null)}
                      className="rounded p-1 text-slate-400 hover:text-white cursor-pointer"
                      aria-label="Fechar"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

            {/* Bottom Legend Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#22304a] bg-[#0f1624] px-3.5 py-2 text-[11px] text-slate-400">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-3 rounded-full bg-[#60a5fa]" />
                  Comando → Estado
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0.5 w-3 border-t-2 border-dashed border-[#22d3ee]" />
                  Transição
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0.5 w-3 border-t-2 border-dotted border-[#fb7185]" />
                  Timeout
                </span>
              </div>
              <span className="text-slate-500">
                Arraste os pontos laterais para conectar · Clique numa linha para editar
              </span>
            </div>
          </Card>

          {/* Right Split 3-Tab FSM Editor */}
          <Card data-tour="fsm-editor" className="xl:col-span-5">
            <CardHeader className="border-b border-[#22304a] p-2">
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#0b0f17] p-1">
                {(
                  [
                    {
                      id: "states",
                      label: t("fsm.tab_states"),
                      count: activeSub.fsm.states.length,
                      errors: tabErrors.states,
                    },
                    {
                      id: "requests",
                      label: t("fsm.tab_requests"),
                      count: activeSub.fsm.requests.length,
                      errors: tabErrors.requests,
                    },
                    {
                      id: "bindings",
                      label: t("fsm.tab_bindings"),
                      count: activeSub.fsm.bindings.length,
                      errors: tabErrors.bindings,
                    },
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
                    {tab.errors > 0 && (
                      <span className="rounded-full bg-rose-600 px-1.5 py-0.2 font-mono text-[10px] font-bold text-white">
                        {tab.errors}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              {innerTab === "states" && (
                <StatesPanel
                  subsystem={activeSub}
                  selectedStateName={activeStateObj?.name ?? null}
                  onSelectState={setSelectedStateName}
                />
              )}
              {innerTab === "requests" && (
                <RequestsPanel
                  subsystem={activeSub}
                  onSwitchToBindings={() => setInnerTab("bindings")}
                />
              )}
              {innerTab === "bindings" && <BindingsPanel subsystem={activeSub} />}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
