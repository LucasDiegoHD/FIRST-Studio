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
import { ArrowRight, Cog, Gamepad2, Layers, Plus, Redo2, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { UnitInput } from "@/components/ui/unit-input";
import { useProject } from "@/context/project-context";
import { toPackageSegment } from "@/lib/generator/java-utils";
import type { MotorVendor, SubsystemConfig } from "@/lib/schema/ciprix-project";
import { CodeViewer } from "./code-viewer";

type XboxNodeData = {
  pilotCount: number;
  copilotCount: number;
  buttons: { label: string; request: string }[];
  simRequest: string;
  onSimulate: (req: string) => void;
  onOpenControls: () => void;
};

type SuperNodeData = {
  requests: string[];
  simRequest: string;
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
    <div className="w-[210px] rounded-md border border-[#1b2434] bg-[#060910] p-3 text-left">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
          <Gamepad2 className="h-3.5 w-3.5 text-[#60a5fa]" />
          Xbox 0 / 1
        </span>
        <button
          type="button"
          onClick={data.onOpenControls}
          className="font-mono text-[10px] text-[#60a5fa] hover:underline cursor-pointer"
        >
          editar
        </button>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1">
        {data.buttons.length === 0 ? (
          <span className="font-mono text-[10px] text-[#556072]">sem botões</span>
        ) : (
          data.buttons.map((b) => (
            <button
              key={b.label + b.request}
              type="button"
              onClick={() => data.onSimulate(b.request)}
              className={`rounded border px-1.5 py-0.5 font-mono text-[10px] transition-colors cursor-pointer ${
                data.simRequest === b.request
                  ? "border-[#3b82f6] bg-[#142c4f] text-white"
                  : "border-[#1c2434] bg-black text-[#8a94a6] hover:text-white"
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
    <div className="w-[220px] rounded-md border border-[#1f3458] bg-[#080f1d] p-3 text-left">
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
          <Layers className="h-3.5 w-3.5 text-[#60a5fa]" />
          SuperStructure
        </span>
        <button
          type="button"
          onClick={data.onOpenStates}
          className="font-mono text-[10px] text-[#60a5fa] hover:underline cursor-pointer"
        >
          matriz
        </button>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1">
        {data.requests.map((req) => (
          <button
            key={req}
            type="button"
            onClick={() => data.onSimulate(req)}
            className={`rounded border px-1.5 py-0.5 font-mono text-[10px] transition-colors cursor-pointer ${
              data.simRequest === req
                ? "border-[#3b82f6] bg-[#142c4f] text-white"
                : "border-[#1c2434] bg-black text-[#8a94a6] hover:text-white"
            }`}
          >
            {req}
          </button>
        ))}
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
      className={`w-[250px] rounded-md border p-3 text-left transition-colors cursor-pointer ${
        selected
          ? "border-[#3b82f6] bg-[#0b192e]"
          : outputPct !== 0
            ? "border-[#264f8a] bg-[#081222]"
            : "border-[#1a2232] bg-[#070a11] hover:border-[#2c3b57]"
      }`}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Cog
            className={`h-4 w-4 shrink-0 ${
              outputPct > 0
                ? "text-[#60a5fa] animate-motor-cw"
                : outputPct < 0
                  ? "text-[#60a5fa] animate-motor-ccw"
                  : "text-[#4c576b]"
            }`}
          />
          <span className="truncate text-xs font-semibold text-white">{subsystem.name}</span>
        </div>
        <span
          className={`font-mono text-[10px] ${
            errorCount > 0 ? "text-rose-400" : "text-[#6b7689]"
          }`}
        >
          {errorCount > 0 ? `${errorCount} err` : `CAN ${subsystem.motor.canId}`}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-[#171c26] pt-2 font-mono text-[10px]">
        <span className="text-[#8a94a6]">
          {vendor} · {subsystem.motor.currentLimitAmps}A
        </span>
        <span className={outputPct !== 0 ? "text-[#93c5fd]" : "text-[#6b7689]"}>
          {activeRequest} → {activeStateName} (
          {outputPct > 0 ? `+${Math.round(outputPct * 100)}%` : `${Math.round(outputPct * 100)}%`})
        </span>
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
    undo,
    redo,
    canUndo,
    canRedo,
    t,
  } = useProject();

  const [simRequest, setSimRequest] = useState<string>(project.superstructure.initialRequest);
  const [inspectorTab, setInspectorTab] = useState<"hardware" | "java">("hardware");
  const [selectedJavaIdx, setSelectedJavaIdx] = useState(0);
  const positionsRef = useRef<Record<string, { x: number; y: number }>>({});

  const activeSimRequest = project.superstructure.requests.includes(simRequest)
    ? simRequest
    : project.superstructure.initialRequest;

  const activeRobotState =
    project.superstructure.bindings.find((b) => b.request === activeSimRequest)?.entryState ??
    project.superstructure.initialState;

  const computedNodes = useMemo<Node[]>(() => {
    const xboxPos = positionsRef.current["xbox"] ?? { x: 40, y: 120 };
    const superPos = positionsRef.current["superstructure"] ?? { x: 320, y: 120 };

    const list: Node[] = [
      {
        id: "xbox",
        type: "xboxNode",
        position: xboxPos,
        data: {
          pilotCount: project.controls.pilotPriority.length,
          copilotCount: project.controls.copilotOverrides.length,
          buttons: project.controls.pilotPriority.map((p) => ({
            label: p.button.replace("Bumper", "B").replace("Trigger", "T").toUpperCase(),
            request: p.request,
          })),
          simRequest: activeSimRequest,
          onSimulate: setSimRequest,
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
          onSimulate: setSimRequest,
          onOpenStates: onGoToStates,
        },
      },
    ];

    project.subsystems.forEach((sub, idx) => {
      const subId = `sub-${sub.id}`;
      const defaultY = 60 + idx * 120;
      const pos = positionsRef.current[subId] ?? { x: 630, y: defaultY };

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
          stroke: isDriving ? "#3b82f6" : "#1e3150",
          strokeWidth: isDriving ? 2 : 1.25,
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
          stroke: active ? "#3b82f6" : "#1e3150",
          strokeWidth: active ? 2 : 1.25,
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

  return (
    <div className="flex h-full min-h-0 bg-black">
      {/* React Flow Canvas */}
      <div className="relative flex-1 min-w-0 h-full">
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
          <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="rgba(255,255,255,0.09)" />
          <Controls showInteractive={false} />

          <Panel position="top-left">
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-[#171c26] bg-[#05070b]/95 px-2.5 py-1.5">
              <span className="font-mono text-[10px] uppercase text-[#6b7689] mr-1">Simular:</span>
              {project.superstructure.requests.map((req) => (
                <button
                  key={req}
                  type="button"
                  onClick={() => setSimRequest(req)}
                  className={`rounded px-2 py-0.5 font-mono text-[11px] transition-colors cursor-pointer ${
                    activeSimRequest === req
                      ? "bg-[#142c4f] border border-[#264f8a] text-white"
                      : "border border-[#1a2232] bg-black text-[#8a94a6] hover:text-white"
                  }`}
                >
                  {req}
                </button>
              ))}
            </div>
          </Panel>

          <Panel position="bottom-center">
            <div className="flex items-center gap-1 rounded-md border border-[#171c26] bg-[#05070b] px-2 py-1">
              <Button size="sm" variant="primary" onClick={() => addSubsystem("roller")}>
                <Plus className="h-3 w-3" />
                {t("subsystems.roller")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => addSubsystem("generic")}>
                <Plus className="h-3 w-3" />
                {t("subsystems.generic")}
              </Button>
              <span className="mx-1 h-4 w-px bg-[#171c26]" />
              <Button size="icon" variant="ghost" onClick={undo} disabled={!canUndo}>
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" onClick={redo} disabled={!canRedo}>
                <Redo2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Right Hardware / Live Java Inspector */}
      <aside className="flex h-full w-[370px] shrink-0 flex-col border-l border-[#171c26] bg-[#05070b]">
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center gap-3">
            <p className="text-xs text-[#6b7689]">{t("subsystems.select_prompt")}</p>
            <Button size="sm" variant="primary" onClick={() => addSubsystem("roller")}>
              <Plus className="h-3.5 w-3.5" />
              {t("subsystems.roller")}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-[#171c26] px-3.5 py-2">
              <span className="truncate text-xs font-semibold text-white">{selected.name}</span>
              <div className="flex rounded border border-[#1a2232] bg-black p-0.5">
                <button
                  type="button"
                  onClick={() => setInspectorTab("hardware")}
                  className={`rounded px-2 py-0.5 text-[11px] cursor-pointer ${
                    inspectorTab === "hardware" ? "bg-[#142c4f] text-white" : "text-[#7c8ba1]"
                  }`}
                >
                  {t("inspector.hardware")}
                </button>
                <button
                  type="button"
                  onClick={() => setInspectorTab("java")}
                  className={`rounded px-2 py-0.5 text-[11px] cursor-pointer ${
                    inspectorTab === "java" ? "bg-[#142c4f] text-white" : "text-[#7c8ba1]"
                  }`}
                >
                  {t("inspector.java")}
                </button>
              </div>
            </div>

            {inspectorTab === "hardware" ? (
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
                        <option value="talonfx">Talon FX</option>
                        <option value="sparkmax">SPARK MAX</option>
                        <option value="talonsrx">Talon SRX</option>
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
                            motor: {
                              ...prev.motor,
                              neutralMode: e.target.value as "coast" | "brake",
                            },
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

                <div className="space-y-2 p-4">
                  <Button variant="primary" size="sm" className="w-full" onClick={onGoToStates}>
                    {t("step.states")}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
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
            ) : (
              <div className="flex flex-1 flex-col min-h-0">
                <div className="flex items-center gap-1 overflow-x-auto border-b border-[#171c26] px-2.5 py-1.5 shrink-0">
                  {subJavaFiles.map((f, idx) => (
                    <button
                      key={f.path}
                      type="button"
                      onClick={() => setSelectedJavaIdx(idx)}
                      className={`rounded px-2 py-0.5 font-mono text-[10px] whitespace-nowrap cursor-pointer ${
                        (subJavaFiles[selectedJavaIdx] ? selectedJavaIdx === idx : idx === 0)
                          ? "bg-[#142c4f] text-white"
                          : "text-[#7c8ba1]"
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
            )}
          </>
        )}
      </aside>
    </div>
  );
}
