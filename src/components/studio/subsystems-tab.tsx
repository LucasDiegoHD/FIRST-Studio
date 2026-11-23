"use client";

import React from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Boxes, Cpu, GripVertical, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useProject } from "@/context/project-context";
import type { MotorVendor, SubsystemConfig } from "@/lib/schema/ciprix-project";
import { cn } from "@/lib/utils";

function SortableSubsystemCard({
  subsystem,
  selected,
  errorCount,
  onSelect,
}: {
  subsystem: SubsystemConfig;
  selected: boolean;
  errorCount: number;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: subsystem.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const vendorLabel =
    subsystem.motor.vendor === "talonfx"
      ? "Talon FX"
      : subsystem.motor.vendor === "sparkmax"
        ? "SPARK MAX"
        : "Talon SRX";

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={cn(
        "group relative flex flex-col justify-between rounded-xl border p-4 cursor-pointer transition-all select-none",
        selected
          ? "border-sky-400 bg-sky-500/10 shadow-md shadow-sky-500/10"
          : "border-slate-700/70 bg-slate-900/85 hover:border-slate-500",
        isDragging && "opacity-60 scale-[1.02] z-20",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30">
            <Cpu className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-100">{subsystem.name}</p>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide">{subsystem.type}</p>
          </div>
        </div>

        <button
          type="button"
          aria-label="Drag subsystem"
          onClick={(e) => e.stopPropagation()}
          {...attributes}
          {...listeners}
          className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-200 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <Badge variant="info">{vendorLabel}</Badge>
        <Badge>CAN {subsystem.motor.canId}</Badge>
        <Badge>{subsystem.motor.currentLimitAmps}A</Badge>
        {errorCount > 0 && <Badge variant="error">{errorCount} err</Badge>}
      </div>
    </div>
  );
}

export function SubsystemsTab() {
  const {
    project,
    selectedSubsystemId,
    setSelectedSubsystemId,
    addSubsystem,
    removeSubsystem,
    reorderSubsystems,
    updateSubsystem,
    issues,
    t,
  } = useProject();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const selected =
    project.subsystems.find((s) => s.id === selectedSubsystemId) ??
    project.subsystems[0] ??
    null;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = project.subsystems.map((s) => s.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    reorderSubsystems(arrayMove(ids, oldIndex, newIndex));
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* Left palette */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>{t("subsystems.palette")}</CardTitle>
          <CardDescription>{t("subsystems.palette_hint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(["roller", "generic"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => addSubsystem(kind)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-left transition-colors hover:border-sky-500/60 hover:bg-slate-900 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-100">
                  {kind === "roller" ? t("subsystems.roller") : t("subsystems.generic")}
                </span>
                <Plus className="h-4 w-4 text-sky-400" />
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {kind === "roller" ? t("subsystems.roller_desc") : t("subsystems.generic_desc")}
              </p>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Center canvas */}
      <Card className="lg:col-span-5 flex flex-col">
        <CardHeader>
          <CardTitle>{t("subsystems.canvas_title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="bg-engineering-grid min-h-[340px] rounded-xl border border-slate-800 p-5">
            {project.subsystems.length === 0 ? (
              <div className="flex h-[290px] flex-col items-center justify-center text-center text-slate-400">
                <Boxes className="h-10 w-10 text-slate-600 mb-2" />
                <p className="text-sm">{t("subsystems.canvas_empty")}</p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={project.subsystems.map((s) => s.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {project.subsystems.map((sub) => {
                      const errCount = issues.filter(
                        (i) => i.targetId === sub.id && i.severity === "error",
                      ).length;
                      return (
                        <SortableSubsystemCard
                          key={sub.id}
                          subsystem={sub}
                          selected={selected?.id === sub.id}
                          errorCount={errCount}
                          onSelect={() => setSelectedSubsystemId(sub.id)}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Right hardware config */}
      <Card className="lg:col-span-4">
        <CardHeader>
          <CardTitle>{t("subsystems.config_title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!selected ? (
            <p className="text-xs text-slate-400">{t("subsystems.select_prompt")}</p>
          ) : (
            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">{t("subsystems.name")}</label>
                <Input
                  value={selected.name}
                  onChange={(e) =>
                    updateSubsystem(selected.id, (prev) => ({
                      ...prev,
                      name: e.target.value.replace(/\s+/g, ""),
                    }))
                  }
                  className="font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">{t("subsystems.vendor")}</label>
                  <Select
                    value={selected.motor.vendor}
                    onChange={(e) =>
                      updateSubsystem(selected.id, (prev) => ({
                        ...prev,
                        motor: { ...prev.motor, vendor: e.target.value as MotorVendor },
                      }))
                    }
                  >
                    <option value="talonfx">CTRE Talon FX (Phoenix 6)</option>
                    <option value="sparkmax">REV SPARK MAX</option>
                    <option value="talonsrx">CTRE Talon SRX (Phoenix 5)</option>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">{t("subsystems.can_id")}</label>
                  <Input
                    type="number"
                    min={0}
                    max={62}
                    value={selected.motor.canId}
                    onChange={(e) =>
                      updateSubsystem(selected.id, (prev) => ({
                        ...prev,
                        motor: {
                          ...prev.motor,
                          canId: Math.min(62, Math.max(0, Number.parseInt(e.target.value || "0", 10) || 0)),
                        },
                      }))
                    }
                  />
                </div>
              </div>

              {selected.motor.vendor === "talonfx" && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">{t("subsystems.can_bus")}</label>
                  <Input
                    value={selected.motor.canBus}
                    placeholder="rio (default)"
                    onChange={(e) =>
                      updateSubsystem(selected.id, (prev) => ({
                        ...prev,
                        motor: { ...prev.motor, canBus: e.target.value },
                      }))
                    }
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">{t("subsystems.current_limit")}</label>
                  <Input
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
                  <label className="text-xs font-medium text-slate-300">{t("subsystems.neutral_mode")}</label>
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

              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2">
                <span className="text-xs font-medium text-slate-200">{t("subsystems.inverted")}</span>
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
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">{t("subsystems.gear_ratio")}</label>
                  <Input
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
                  <label className="text-xs font-medium text-slate-300">{t("subsystems.moi")}</label>
                  <Input
                    type="number"
                    step={0.0005}
                    min={0.0001}
                    value={selected.motor.moiKgM2}
                    onChange={(e) =>
                      updateSubsystem(selected.id, (prev) => ({
                        ...prev,
                        motor: {
                          ...prev.motor,
                          moiKgM2: Math.max(0.0001, Number.parseFloat(e.target.value || "0.001") || 0.001),
                        },
                      }))
                    }
                  />
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-200">{t("subsystems.selftest_enable")}</span>
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
                      <label className="text-[11px] text-slate-400">{t("subsystems.selftest_output")}</label>
                      <Input
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
                              output: Math.min(1, Math.max(-1, Number.parseFloat(e.target.value || "0.3") || 0.3)),
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">{t("subsystems.selftest_min_rps")}</label>
                      <Input
                        type="number"
                        step={0.5}
                        min={0}
                        value={selected.selfTest.minVelocityRps}
                        onChange={(e) =>
                          updateSubsystem(selected.id, (prev) => ({
                            ...prev,
                            selfTest: {
                              ...prev.selfTest,
                              minVelocityRps: Math.max(0, Number.parseFloat(e.target.value || "5") || 5),
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
