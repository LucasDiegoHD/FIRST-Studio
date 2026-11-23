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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Redo2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProject } from "@/context/project-context";
import type { SubsystemConfig } from "@/lib/schema/ciprix-project";
import { cn } from "@/lib/utils";

function SortableSubsystemNode({
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
      ? "TalonFX"
      : subsystem.motor.vendor === "sparkmax"
        ? "SparkMax"
        : "TalonSRX";

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={cn(
        "group relative rounded-md border px-3.5 py-2.5 transition-colors cursor-pointer select-none",
        selected
          ? "bg-[#0a1526] border-[#264f8a]"
          : "bg-[#070a11] border-[#1a2232] hover:border-[#29354d] hover:bg-[#090d16]",
        isDragging && "opacity-60 z-20",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              "h-2 w-2 rounded-full shrink-0",
              errorCount > 0
                ? "bg-rose-400"
                : selected
                  ? "bg-sky-400"
                  : "bg-[#264f8a]",
            )}
          />
          <span className="truncate text-xs font-semibold text-slate-100">{subsystem.name}</span>
          <span className="font-mono text-[10px] text-[#6b7689]">
            {vendorLabel} · CAN {subsystem.motor.canId} · {subsystem.motor.currentLimitAmps}A ·{" "}
            {subsystem.motor.neutralMode}
          </span>
        </div>

        <button
          type="button"
          aria-label="Reorder subsystem"
          onClick={(e) => e.stopPropagation()}
          {...attributes}
          {...listeners}
          className="rounded p-0.5 text-[#4f596b] hover:text-slate-200 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </div>

      <p className="mt-1.5 truncate font-mono text-[10px] text-[#7c8ba1]">
        {subsystem.fsm.states.map((s) => s.name).join(" · ")}
      </p>
    </div>
  );
}

export function ArchitectureView({
  onSelectSubsystem,
}: {
  onSelectSubsystem: (id: string) => void;
}) {
  const {
    project,
    selectedSubsystemId,
    reorderSubsystems,
    addSubsystem,
    setActiveTab,
    issues,
    undo,
    redo,
    canUndo,
    canRedo,
    t,
  } = useProject();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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
    <div className="bg-dot-matrix relative flex h-full flex-col justify-between overflow-auto p-6">
      <div className="mx-auto my-auto w-full max-w-4xl">
        <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
          {/* Column 1: Xbox Controls */}
          <div className="lg:col-span-3">
            <button
              type="button"
              onClick={() => setActiveTab("controls")}
              className="w-full rounded-md border border-[#1a2232] bg-[#070a11] px-3.5 py-3 text-left transition-colors hover:border-[#264f8a] hover:bg-[#0a1526] cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-100">Xbox 0 / 1</span>
                <span className="font-mono text-[10px] text-[#6b7689]">Controller</span>
              </div>
              <p className="mt-1.5 font-mono text-[11px] text-[#7c8ba1]">
                {project.controls.pilotPriority.length} pilot ·{" "}
                {project.controls.copilotOverrides.length} copilot
              </p>
            </button>
          </div>

          {/* Connector 1 -> 2 */}
          <div className="hidden lg:flex lg:col-span-1 items-center justify-center">
            <svg viewBox="0 0 48 16" className="w-full h-4">
              <line x1="0" y1="8" x2="46" y2="8" stroke="#1e355a" strokeWidth="1.25" />
              <circle cx="44" cy="8" r="2.2" fill="#264f8a" />
            </svg>
          </div>

          {/* Column 2: SuperStructure */}
          <div className="lg:col-span-3">
            <button
              type="button"
              onClick={() => setActiveTab("superstructure")}
              className="w-full rounded-md border border-[#1d2c46] bg-[#080d17] px-3.5 py-3 text-left transition-colors hover:border-[#264f8a] hover:bg-[#0a1526] cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-100">SuperStructure</span>
                <span className="font-mono text-[10px] text-[#6b7689]">FSM</span>
              </div>
              <p className="mt-1.5 truncate font-mono text-[11px] text-[#7c8ba1]">
                {project.superstructure.states.join(" · ")}
              </p>
            </button>
          </div>

          {/* Connector 2 -> 3 */}
          <div className="hidden lg:flex lg:col-span-1 items-center justify-center">
            <svg viewBox="0 0 48 96" className="w-full h-24">
              <path d="M 0 48 C 22 48, 22 18, 46 18" fill="none" stroke="#1e355a" strokeWidth="1.25" />
              <line x1="0" y1="48" x2="46" y2="48" stroke="#1e355a" strokeWidth="1.25" />
              <path d="M 0 48 C 22 48, 22 78, 46 78" fill="none" stroke="#1e355a" strokeWidth="1.25" />
            </svg>
          </div>

          {/* Column 3: Subsystems */}
          <div className="lg:col-span-4 space-y-2.5">
            {project.subsystems.length === 0 ? (
              <div className="rounded-md border border-dashed border-[#1d2432] bg-[#05070b] p-5 text-center text-xs text-[#6b7689]">
                {t("subsystems.canvas_empty")}
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={project.subsystems.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {project.subsystems.map((sub) => {
                      const errCount = issues.filter(
                        (i) => i.targetId === sub.id && i.severity === "error",
                      ).length;
                      return (
                        <SortableSubsystemNode
                          key={sub.id}
                          subsystem={sub}
                          selected={selectedSubsystemId === sub.id}
                          errorCount={errCount}
                          onSelect={() => onSelectSubsystem(sub.id)}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => addSubsystem("roller")}
                className="flex items-center justify-center gap-1.5 rounded border border-dashed border-[#1d2432] bg-[#05070b] py-1.5 text-[11px] text-[#8a94a6] transition-colors hover:border-[#264f8a] hover:bg-[#0a1526] hover:text-slate-100 cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                {t("subsystems.roller")}
              </button>
              <button
                type="button"
                onClick={() => addSubsystem("generic")}
                className="flex items-center justify-center gap-1.5 rounded border border-dashed border-[#1d2432] bg-[#05070b] py-1.5 text-[11px] text-[#8a94a6] transition-colors hover:border-[#264f8a] hover:bg-[#0a1526] hover:text-slate-100 cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                {t("subsystems.generic")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating bottom toolbar (Stately-inspired) */}
      <div className="mx-auto mt-6 flex items-center gap-1 rounded-md border border-[#171c26] bg-[#05070b] px-2 py-1">
        <Button size="sm" variant="ghost" onClick={() => addSubsystem("roller")}>
          <Plus className="h-3 w-3" />
          {t("subsystems.roller")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => addSubsystem("generic")}>
          <Plus className="h-3 w-3" />
          {t("subsystems.generic")}
        </Button>
        <span className="mx-1 h-4 w-px bg-[#171c26]" />
        <Button size="icon" variant="ghost" onClick={undo} disabled={!canUndo} title={t("header.undo")}>
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" onClick={redo} disabled={!canRedo} title={t("header.redo")}>
          <Redo2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
