"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Download,
  Maximize2,
  Minimize2,
  Plus,
  RotateCcw,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProject } from "@/context/project-context";
import { isEditableTarget } from "@/lib/keyboard-shortcuts";
import { createDefaultDrivetrain, DRIVETRAIN_PRESETS } from "@/lib/presets/drivetrain";
import { isMotorSubsystem, type FsmBinding } from "@/lib/schema/ciprix-project";
import {
  applyTutorialAutoExample,
  applyTutorialZoneExample,
  computeStrategicCardPlacement,
  evaluateTutorialStep,
  hasAnyUserAutonomous,
  resolveStepTourTarget,
  TUTORIAL_EXAMPLE_AUTO_ID,
  TUTORIAL_EXAMPLE_ZONE_ID,
  TUTORIAL_STEPS,
} from "@/lib/tutorial/steps";

interface CutoutRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function TutorialOverlay({
  open,
  stepIndex,
  onStepChange,
  onClose,
  onComplete,
  onResetSkeleton,
  onResetBlank,
  onDownloadZip,
  exporting = false,
}: {
  open: boolean;
  stepIndex: number;
  onStepChange: (nextIndex: number) => void;
  onClose: () => void;
  onComplete: () => void;
  onResetSkeleton: () => void;
  onResetBlank: () => void;
  onDownloadZip?: () => void;
  exporting?: boolean;
}) {
  const {
    project,
    issues,
    locale,
    selectedSubsystemId,
    focusIssue,
    addSubsystem,
    updateSubsystem,
    updateProject,
    t,
  } = useProject();

  const [cutout, setCutout] = useState<CutoutRect | null>(null);
  const [viewport, setViewport] = useState<{ w: number; h: number }>({ w: 1280, h: 800 });
  const [minimized, setMinimized] = useState(false);
  const [measuredCardH, setMeasuredCardH] = useState(275);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const contentRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const safeIndex = Math.max(0, Math.min(TUTORIAL_STEPS.length - 1, stepIndex));
  const step = TUTORIAL_STEPS[safeIndex];
  const copy = step.copy[locale];
  const primaryTarget = resolveStepTourTarget(step, project);
  const isLast = safeIndex === TUTORIAL_STEPS.length - 1;

  const evaluation = useMemo(
    () => evaluateTutorialStep(step.id, project, issues, locale),
    [step.id, project, issues, locale],
  );

  const motorSubs = useMemo(() => project.subsystems.filter(isMotorSubsystem), [project.subsystems]);
  const activeMotorSub = useMemo(
    () => motorSubs.find((s) => s.id === selectedSubsystemId) ?? motorSubs[0] ?? null,
    [motorSubs, selectedSubsystemId],
  );

  useEffect(() => {
    setDragOffset({ x: 0, y: 0 });
  }, [safeIndex]);

  useEffect(() => {
    if (!open) {
      setCutout(null);
      return;
    }

    let ro: ResizeObserver | null = null;
    let scrolled = false;

    const findTarget = (): HTMLElement | null => {
      const exact = document.querySelector<HTMLElement>(
        `[data-tour="${CSS.escape(primaryTarget)}"]`,
      );
      if (exact) return exact;
      if (step.fallbackTourTarget) {
        return document.querySelector<HTMLElement>(
          `[data-tour="${CSS.escape(step.fallbackTourTarget)}"]`,
        );
      }
      return null;
    };

    const updateLayout = (shouldScroll = false) => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
      const el = findTarget();
      if (!el) {
        setCutout(null);
        return;
      }
      if (shouldScroll && !scrolled) {
        scrolled = true;
        const scrollBlock =
          step.tab === "project" || step.id === "export-deploy" ? "nearest" : "center";
        el.scrollIntoView({ behavior: "smooth", block: scrollBlock });
      }
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) {
        setCutout(null);
        return;
      }
      const pad = 2;
      setCutout({
        top: Math.max(4, r.top - pad),
        left: Math.max(4, r.left - pad),
        width: r.width + pad * 2,
        height: r.height + pad * 2,
      });

      if (!ro) {
        ro = new ResizeObserver(() => updateLayout(false));
        ro.observe(el);
      }
    };

    const timer1 = setTimeout(() => updateLayout(true), 90);
    const timer2 = setTimeout(() => updateLayout(false), 320);
    const onViewportChange = () => updateLayout(false);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
      ro?.disconnect();
    };
  }, [
    open,
    safeIndex,
    primaryTarget,
    step.tab,
    step.id,
    step.fallbackTourTarget,
    project.subsystems.length,
  ]);

  useEffect(() => {
    if (!open) return;
    const node = contentRef.current;
    if (!node) return;
    const syncHeight = () => {
      const h = node.getBoundingClientRect().height;
      if (h > 0) setMeasuredCardH(Math.round(h));
    };
    syncHeight();
    const ro = new ResizeObserver(syncHeight);
    ro.observe(node);
    return () => ro.disconnect();
  }, [open, safeIndex, minimized, evaluation.valid]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        e.stopPropagation();
        if (evaluation.valid && !isLast) onStepChange(safeIndex + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        e.stopPropagation();
        if (safeIndex > 0) onStepChange(safeIndex - 1);
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, evaluation.valid, isLast, onStepChange, safeIndex]);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const start = dragStartRef.current;
      if (!start) return;
      setDragOffset({
        x: start.origX + (e.clientX - start.startX),
        y: start.origY + (e.clientY - start.startY),
      });
    };
    const onPointerUp = () => {
      dragStartRef.current = null;
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  if (!open) return null;

  const cardW = Math.min(viewport.w - 32, viewport.w >= 1520 ? 460 : 410);
  const effectiveCardH = minimized ? 60 : measuredCardH;
  const basePos = computeStrategicCardPlacement(
    cutout,
    viewport.w,
    viewport.h,
    cardW,
    effectiveCardH,
    Boolean(step.preferCenter),
  );
  const finalLeft = Math.max(16, Math.min(viewport.w - 16 - cardW, basePos.left + dragOffset.x));
  const finalTop = Math.max(20, Math.min(viewport.h - 60, basePos.top + dragOffset.y));

  const renderFooterLeftAction = () => {
    if (step.id === "project-team") {
      return (
        <div className="flex flex-wrap items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-slate-300 hover:text-white"
            onClick={onResetSkeleton}
          >
            {t("tutorial.start_skeleton")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-slate-400 hover:text-white"
            onClick={onResetBlank}
          >
            {t("tutorial.start_blank")}
          </Button>
        </div>
      );
    }

    if (step.id === "drivetrain" && !project.drivetrain?.enabled) {
      return (
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2.5 text-xs"
          onClick={() => {
            const preset = DRIVETRAIN_PRESETS.find((p) => p.id === "mk4i_l2");
            updateProject((prev) => {
              const base = createDefaultDrivetrain("ctre_swerve");
              const applied = preset ? preset.apply(base) : base;
              return {
                ...prev,
                drivetrain: { ...applied, enabled: true },
                features: { ...prev.features, driveContextStub: false },
              };
            });
          }}
        >
          <Plus className="h-3 w-3 text-sky-400" />
          Swerve MK4i
        </Button>
      );
    }

    if (step.id === "subsystem-hardware" && !activeMotorSub) {
      return (
        <div className="flex items-center gap-1.5">
          {(["roller", "arm"] as const).map((kind) => (
            <Button
              key={kind}
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs capitalize"
              onClick={() => addSubsystem(kind)}
            >
              <Plus className="h-3 w-3 text-sky-400" />
              {kind}
            </Button>
          ))}
        </div>
      );
    }

    if (step.id === "sensors" && activeMotorSub && (activeMotorSub.sensors?.length ?? 0) === 0) {
      return (
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2.5 text-xs"
          onClick={() => {
            updateSubsystem(activeMotorSub.id, (prev) => ({
              ...prev,
              sensors: [
                ...(prev.sensors ?? []),
                {
                  id: `sen-${Date.now().toString(36)}`,
                  name: "hasPiece",
                  type: "dio",
                  channel: 0,
                  inverted: true,
                },
              ],
            }));
          }}
        >
          <Plus className="h-3 w-3 text-sky-400" />
          Beam Break (DIO)
        </Button>
      );
    }

    if (step.id === "fsm-bindings" && activeMotorSub) {
      const boundSet = new Set(activeMotorSub.fsm.bindings.map((b) => b.request));
      const hasUnbound = activeMotorSub.fsm.requests.some((r) => !boundSet.has(r));
      if (hasUnbound) {
        return (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-xs"
            onClick={() =>
              updateSubsystem(activeMotorSub.id, (prev) => {
                if (!prev.fsm) return prev;
                const existing = new Set(prev.fsm.bindings.map((b) => b.request));
                const target = prev.fsm.initialState || prev.fsm.states[0]?.name || "IDLE";
                const added: FsmBinding[] = prev.fsm.requests
                  .filter((r) => !existing.has(r))
                  .map((r) => ({
                    request: r,
                    entryState: target,
                    goalState: target,
                    intermediateStates: [],
                  }));
                return {
                  ...prev,
                  fsm: {
                    ...prev.fsm,
                    bindings: [...prev.fsm.bindings, ...added],
                  },
                };
              })
            }
          >
            <Zap className="h-3 w-3 text-amber-300" />
            {locale === "pt" ? "Ligar pendentes" : "Bind unbound"}
          </Button>
        );
      }
    }

    if (step.id === "zones") {
      const zones = project.zones ?? [];
      if (zones.length === 0) {
        return (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-xs"
            onClick={() => updateProject(applyTutorialZoneExample)}
          >
            <Plus className="h-3 w-3 text-sky-400" />
            {locale === "pt" ? "Usar exemplo no projeto" : "Use example in project"}
          </Button>
        );
      }
      if (zones.some((z) => z.id === TUTORIAL_EXAMPLE_ZONE_ID)) {
        return (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-slate-400 hover:text-white"
            onClick={() =>
              updateProject((prev) => ({
                ...prev,
                zones: (prev.zones ?? []).filter((z) => z.id !== TUTORIAL_EXAMPLE_ZONE_ID),
              }))
            }
          >
            {locale === "pt" ? "Remover exemplo" : "Remove example"}
          </Button>
        );
      }
    }

    if (step.id === "autonomous") {
      const routines = project.autonomous?.routines ?? [];
      if (!hasAnyUserAutonomous(project)) {
        return (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-xs"
            onClick={() => updateProject(applyTutorialAutoExample)}
          >
            <Plus className="h-3 w-3 text-sky-400" />
            {locale === "pt" ? "Usar exemplo no projeto" : "Use example in project"}
          </Button>
        );
      }
      if (routines.some((r) => r.id === TUTORIAL_EXAMPLE_AUTO_ID)) {
        return (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-slate-400 hover:text-white"
            onClick={() =>
              updateProject((prev) => {
                if (!prev.autonomous) return prev;
                const nextRoutines = prev.autonomous.routines.filter(
                  (r) => r.id !== TUTORIAL_EXAMPLE_AUTO_ID,
                );
                const nextPaths = (prev.autonomous.paths ?? []).filter(
                  (p) => !p.id.startsWith("path-tutorial-"),
                );
                const nextCmds = prev.autonomous.namedCommands.filter(
                  (c) => !c.id.startsWith("nc-tutorial-"),
                );
                return {
                  ...prev,
                  autonomous: {
                    ...prev.autonomous,
                    enabled: nextRoutines.length > 0 ? prev.autonomous.enabled : false,
                    defaultAutoId:
                      prev.autonomous.defaultAutoId === TUTORIAL_EXAMPLE_AUTO_ID
                        ? nextRoutines[0]?.id
                        : prev.autonomous.defaultAutoId,
                    routines: nextRoutines,
                    paths: nextPaths,
                    namedCommands: nextCmds,
                  },
                };
              })
            }
          >
            {locale === "pt" ? "Remover exemplo" : "Remove example"}
          </Button>
        );
      }
    }

    if (step.id === "export-deploy" && onDownloadZip) {
      return (
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2.5 text-xs"
          disabled={exporting || !evaluation.valid}
          onClick={onDownloadZip}
        >
          <Download className="h-3 w-3" />
          {exporting ? t("header.exporting") : t("header.download_zip")}
        </Button>
      );
    }

    if (safeIndex > 0) {
      return (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs text-slate-400 hover:text-white"
          onClick={() => onStepChange(0)}
        >
          <RotateCcw className="h-3 w-3" />
          {t("tutorial.restart")}
        </Button>
      );
    }

    return <span />;
  };

  return (
    <>
      <svg
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[60] h-screen w-screen"
      >
        <defs>
          <mask id="fs-tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {cutout && (
              <rect
                x={cutout.left}
                y={cutout.top}
                width={cutout.width}
                height={cutout.height}
                rx={13}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(6, 10, 18, 0.72)"
          mask="url(#fs-tour-spotlight-mask)"
        />
        {cutout && (
          <rect
            x={cutout.left}
            y={cutout.top}
            width={cutout.width}
            height={cutout.height}
            rx={13}
            fill="none"
            stroke="#60a5fa"
            strokeWidth={1.5}
          />
        )}
      </svg>

      <Popover.Root open={open} modal={false}>
        <Popover.Anchor asChild>
          <div
            aria-hidden="true"
            className="pointer-events-none fixed z-[61]"
            style={{ top: finalTop, left: finalLeft + cardW / 2, width: 1, height: 1 }}
          />
        </Popover.Anchor>

        <Popover.Portal>
          <Popover.Content
            ref={contentRef}
            data-tutorial-card="true"
            side="bottom"
            align="center"
            sideOffset={0}
            avoidCollisions={false}
            style={{ width: cardW }}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
            onFocusOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={onClose}
            className="z-[70] overflow-hidden rounded-2xl border border-[#2c436b] bg-[#0e1626]/98 text-slate-100 shadow-[0_24px_60px_rgba(0,0,0,0.85)] backdrop-blur-md outline-none animate-pop-in"
          >
            {/* Minimal Draggable Header */}
            <div
              onPointerDown={(e) => {
                if ((e.target as HTMLElement).closest("button")) return;
                dragStartRef.current = {
                  startX: e.clientX,
                  startY: e.clientY,
                  origX: dragOffset.x,
                  origY: dragOffset.y,
                };
              }}
              onDoubleClick={() => setDragOffset({ x: 0, y: 0 })}
              className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 cursor-grab active:cursor-grabbing select-none"
            >
              {minimized ? (
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono text-xs font-medium text-sky-400 shrink-0">
                    {safeIndex + 1}/{TUTORIAL_STEPS.length}
                  </span>
                  <h3 className="truncate font-headline text-sm font-semibold text-white">
                    {copy.title}
                  </h3>
                </div>
              ) : (
                <div className="min-w-0 space-y-0.5">
                  <span className="block font-mono text-xs font-medium text-sky-400">
                    {t("tutorial.step_of")} {safeIndex + 1} / {TUTORIAL_STEPS.length}
                  </span>
                  <h3 className="truncate font-headline text-lg font-semibold text-white">
                    {copy.title}
                  </h3>
                </div>
              )}

              <div className="flex items-center gap-1 shrink-0">
                {minimized && (
                  <div className="flex items-center gap-1 mr-1">
                    {safeIndex > 0 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => onStepChange(safeIndex - 1)}
                        aria-label={t("tutorial.prev")}
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-7 w-7 bg-sky-500 text-slate-950 border-sky-400 hover:bg-sky-400"
                      disabled={!evaluation.valid}
                      onClick={() => (isLast ? onComplete() : onStepChange(safeIndex + 1))}
                      aria-label={isLast ? t("tutorial.finish") : t("tutorial.next")}
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setMinimized((v) => !v)}
                  className="rounded p-1.5 text-slate-400 hover:bg-[#19253d] hover:text-white cursor-pointer"
                  aria-label={minimized ? "Expand tutorial" : "Minimize tutorial"}
                >
                  {minimized ? (
                    <Maximize2 className="h-3.5 w-3.5" />
                  ) : (
                    <Minimize2 className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded p-1.5 text-slate-400 hover:bg-[#19253d] hover:text-white cursor-pointer"
                  aria-label="Close tutorial"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {!minimized && (
              <>
                {/* Quiet 12-Step Progress Rail */}
                <div className="grid grid-cols-12 gap-1 px-5 pb-1">
                  {TUTORIAL_STEPS.map((s, idx) => {
                    const isCurrent = idx === safeIndex;
                    const canJump = idx < safeIndex || (idx === safeIndex + 1 && evaluation.valid);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        disabled={!canJump && !isCurrent}
                        title={`${idx + 1}. ${s.copy[locale].title}`}
                        onClick={() => {
                          if (canJump) onStepChange(idx);
                        }}
                        className={`h-1 rounded-full transition-colors ${
                          isCurrent
                            ? "bg-sky-400"
                            : idx < safeIndex
                              ? "bg-sky-500/45 hover:bg-sky-400/70 cursor-pointer"
                              : canJump
                                ? "bg-slate-700 hover:bg-sky-400/50 cursor-pointer"
                                : "bg-slate-800/80 cursor-not-allowed"
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Unboxed Scannable Body */}
                <div className="px-5 py-4 space-y-3">
                  <p className="text-[14px] leading-relaxed text-slate-100">{copy.whatToFill}</p>
                  <p className="text-[13px] leading-relaxed text-slate-400">{copy.whyItMatters}</p>

                  <div className="flex items-start gap-2.5 rounded-lg border-l-2 border-sky-400 bg-sky-500/[0.07] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-sky-100/95">
                    <Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400" />
                    <p>
                      <strong className="font-semibold text-sky-300">
                        {locale === "pt" ? "No robô: " : "On the robot: "}
                      </strong>
                      {copy.whereOnRobot}
                    </p>
                  </div>

                  {!evaluation.valid && (
                    <button
                      type="button"
                      onClick={() => {
                        if (evaluation.relatedIssues[0]) {
                          focusIssue(evaluation.relatedIssues[0]);
                        }
                      }}
                      className="flex w-full items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-950/35 px-3 py-2 text-left text-xs text-amber-200 hover:border-amber-400 transition-colors cursor-pointer"
                    >
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                      <span>{evaluation.blockingReason}</span>
                    </button>
                  )}
                </div>

                {/* Quiet Contextual Footer */}
                <div className="flex items-center justify-between gap-2 border-t border-[#1e2c45] px-5 py-3">
                  <div>{renderFooterLeftAction()}</div>

                  <div className="flex items-center gap-2 shrink-0">
                    {safeIndex > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2.5 text-xs text-slate-300 hover:text-white"
                        onClick={() => onStepChange(safeIndex - 1)}
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        {t("tutorial.prev")}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 px-3.5 text-xs bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold border-sky-400"
                      disabled={!evaluation.valid}
                      onClick={() => (isLast ? onComplete() : onStepChange(safeIndex + 1))}
                    >
                      <span>{isLast ? t("tutorial.finish") : t("tutorial.next")}</span>
                      {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </>
  );
}
