"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Popover from "@radix-ui/react-popover";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  ArrowLeft,
  ArrowRight,
  Cpu,
  Download,
  FolderOpen,
  Gamepad2,
  GitBranch,
  MoreHorizontal,
  Package,
  Pencil,
  Redo2,
  RotateCcw,
  Save,
  Search,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProject } from "@/context/project-context";
import { exportProjectZip } from "@/lib/generator/zip-exporter";
import { CiprixProjectSchema } from "@/lib/schema/ciprix-project";
import type { StudioTab } from "@/lib/validator";
import { cn } from "@/lib/utils";
import { CodeTab } from "./code-tab";
import { CommandPalette } from "./command-palette";
import { ControlsTab } from "./controls-tab";
import { ProjectSettingsDialog } from "./project-settings-dialog";
import { RobotFlowView } from "./robot-flow-view";
import { StatesView } from "./states-view";

type GuidedStep = "robot" | "states" | "controls" | "export";

function tabToStep(tab: StudioTab): GuidedStep {
  if (tab === "fsm" || tab === "superstructure") return "states";
  if (tab === "controls") return "controls";
  if (tab === "code") return "export";
  return "robot";
}

export function StudioShell() {
  const {
    project,
    locale,
    setLocale,
    t,
    activeTab,
    setActiveTab,
    setSelectedSubsystemId,
    issues,
    generatedFiles,
    loadProject,
    resetToSkeleton,
    resetToBlank,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useProject();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; tone: "ok" | "err" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (text: string, tone: "ok" | "err" = "ok") => {
    setToastMsg({ text, tone });
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }

      if (e.altKey) {
        if (e.key === "1") {
          e.preventDefault();
          setActiveTab("subsystems");
          return;
        }
        if (e.key === "2") {
          e.preventDefault();
          setActiveTab("fsm");
          return;
        }
        if (e.key === "3") {
          e.preventDefault();
          setActiveTab("controls");
          return;
        }
        if (e.key === "4") {
          e.preventDefault();
          setActiveTab("code");
          return;
        }
      }

      const target = e.target as HTMLElement | null;
      const isInput =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (isInput) return;

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, setActiveTab]);

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const currentStep = tabToStep(activeTab);

  const totalFsmStates = project.subsystems.reduce((sum, s) => sum + s.fsm.states.length, 0);
  const totalBindings =
    project.controls.pilotPriority.length + project.controls.copilotOverrides.length;

  const handleSaveJson = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ciprix-project.json";
    a.click();
    URL.revokeObjectURL(url);
    showToast(t("toast.saved"));
  };

  const handleLoadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = CiprixProjectSchema.safeParse(JSON.parse(text));
      if (!parsed.success) throw new Error("Invalid schema");
      loadProject(parsed.data);
      showToast(t("toast.loaded"));
    } catch {
      showToast(t("toast.load_error"), "err");
    } finally {
      e.target.value = "";
    }
  };

  const handleDownloadZip = async () => {
    setExporting(true);
    try {
      const blob = await exportProjectZip(project);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.project.name || "first-studio-robot"}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(t("toast.zip_ready"));
    } catch {
      showToast(t("toast.zip_error"), "err");
    } finally {
      setExporting(false);
    }
  };

  const steps: {
    id: GuidedStep;
    tab: StudioTab;
    label: string;
    icon: React.ReactNode;
    badge: string;
    shortcut: string;
  }[] = [
    {
      id: "robot",
      tab: "subsystems",
      label: t("step.robot"),
      icon: <Cpu className="h-3.5 w-3.5" />,
      badge: String(project.subsystems.length),
      shortcut: "Alt+1",
    },
    {
      id: "states",
      tab: "fsm",
      label: t("step.states"),
      icon: <GitBranch className="h-3.5 w-3.5" />,
      badge: String(totalFsmStates),
      shortcut: "Alt+2",
    },
    {
      id: "controls",
      tab: "controls",
      label: t("step.controls"),
      icon: <Gamepad2 className="h-3.5 w-3.5" />,
      badge: String(totalBindings),
      shortcut: "Alt+3",
    },
    {
      id: "export",
      tab: "code",
      label: t("step.export"),
      icon: <Package className="h-3.5 w-3.5" />,
      badge: errorCount === 0 ? "OK" : `${errorCount}!`,
      shortcut: "Alt+4",
    },
  ];

  const stepIndex = steps.findIndex((s) => s.id === currentStep);
  const nextStep = steps[stepIndex + 1];
  const progressPct = ((stepIndex + 1) / steps.length) * 100;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0b0f17] text-[#f8fafc]">
      {/* Guided Studio Header (56px) */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#22304a] bg-[#0f1624]/95 backdrop-blur-md px-4 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/"
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] text-slate-300 hover:bg-[#19253d] hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("header.home")}</span>
          </Link>

          <span className="h-4 w-px bg-[#22304a]" />

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex h-8 items-center gap-2 rounded-md border border-transparent px-2.5 text-[13px] text-slate-100 hover:border-[#2c3f61] hover:bg-[#131c2e] cursor-pointer truncate"
          >
            <span className="font-semibold truncate">{project.project.name}</span>
            <span className="font-mono text-xs text-[#93c5fd]">
              #{project.project.teamNumber}
            </span>
            <Pencil className="h-3 w-3 text-slate-400" />
          </button>
        </div>

        {/* 4-Step Live Stepper with Icons & Counters */}
        <nav className="flex items-center gap-1 rounded-lg border border-[#22304a] bg-[#0b0f17] p-1 overflow-x-auto">
          {steps.map((st) => {
            const active = currentStep === st.id;
            return (
              <Tooltip.Root key={st.id}>
                <Tooltip.Trigger asChild>
                  <button
                    type="button"
                    onClick={() => setActiveTab(st.tab)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-all cursor-pointer",
                      active
                        ? "bg-[#142c4f] border border-[#60a5fa]/70 text-white shadow-[0_0_16px_-5px_rgba(59,130,246,0.55)]"
                        : "border border-transparent text-slate-400 hover:bg-[#131c2e] hover:text-white",
                    )}
                  >
                    {st.icon}
                    <span>{st.label}</span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 font-mono text-[11px]",
                        active
                          ? "bg-[#1e3f73] text-white"
                          : "bg-[#131c2e] text-slate-400",
                      )}
                    >
                      {st.badge}
                    </span>
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    sideOffset={6}
                    className="z-50 rounded border border-[#3b6bb5] bg-[#131c2e] px-2.5 py-1 font-mono text-[11px] text-slate-100 shadow-lg"
                  >
                    {st.shortcut}
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            );
          })}
        </nav>

        {/* Right Quick Utilities */}
        <div className="flex items-center gap-1.5">
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Button size="icon" variant="ghost" onClick={undo} disabled={!canUndo}>
                <Undo2 className="h-4 w-4" />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                sideOffset={6}
                className="z-50 rounded border border-[#3b6bb5] bg-[#131c2e] px-2.5 py-1 font-mono text-[11px] text-slate-100"
              >
                {t("header.undo")}
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Button size="icon" variant="ghost" onClick={redo} disabled={!canRedo}>
                <Redo2 className="h-4 w-4" />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                sideOffset={6}
                className="z-50 rounded border border-[#3b6bb5] bg-[#131c2e] px-2.5 py-1 font-mono text-[11px] text-slate-100"
              >
                {t("header.redo")}
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>

          <Button size="icon" variant="ghost" onClick={() => setPaletteOpen(true)} title="Ctrl+K">
            <Search className="h-4 w-4" />
          </Button>

          <Popover.Root>
            <Popover.Trigger asChild>
              <Button size="sm" variant="outline">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    errorCount > 0
                      ? "bg-rose-400"
                      : issues.length > 0
                        ? "bg-amber-400"
                        : "bg-emerald-400",
                  )}
                />
                <span className="font-mono text-xs">{issues.length}</span>
              </Button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                align="end"
                sideOffset={6}
                className="z-50 w-80 rounded-lg border border-[#3b6bb5]/70 bg-[#131c2e] p-3 shadow-2xl"
              >
                {issues.length === 0 ? (
                  <p className="text-[13px] text-emerald-300">{t("header.no_issues")}</p>
                ) : (
                  <ul className="space-y-1 max-h-60 overflow-y-auto">
                    {issues.map((issue) => (
                      <li key={issue.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab(issue.tab);
                            if (issue.targetId) setSelectedSubsystemId(issue.targetId);
                          }}
                          className="w-full rounded px-2.5 py-1.5 text-left text-[13px] hover:bg-[#19253d] cursor-pointer"
                        >
                          <span
                            className={
                              issue.severity === "error" ? "text-rose-300" : "text-amber-300"
                            }
                          >
                            {issue.message}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button size="icon" variant="ghost" aria-label="Menu">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={6}
                className="z-50 w-56 rounded-lg border border-[#2c3f61] bg-[#131c2e] py-1.5 shadow-2xl text-[13px]"
              >
                <DropdownMenu.Item
                  onSelect={handleSaveJson}
                  className="flex items-center gap-2.5 px-3 py-2 text-slate-200 outline-none hover:bg-[#19253d] cursor-pointer"
                >
                  <Save className="h-4 w-4 text-slate-400" />
                  {t("header.save_json")}
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2.5 px-3 py-2 text-slate-200 outline-none hover:bg-[#19253d] cursor-pointer"
                >
                  <FolderOpen className="h-4 w-4 text-slate-400" />
                  {t("header.load_json")}
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-[#22304a]" />
                <DropdownMenu.Item
                  onSelect={resetToSkeleton}
                  className="flex items-center gap-2.5 px-3 py-2 text-slate-200 outline-none hover:bg-[#19253d] cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4 text-slate-400" />
                  {t("header.preset_skeleton")}
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={resetToBlank}
                  className="flex items-center gap-2.5 px-3 py-2 text-slate-200 outline-none hover:bg-[#19253d] cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4 text-slate-400" />
                  {t("header.preset_blank")}
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-[#22304a]" />
                <DropdownMenu.Item
                  onSelect={() => setLocale(locale === "pt" ? "en" : "pt")}
                  className="flex items-center justify-between px-3 py-2 text-slate-200 outline-none hover:bg-[#19253d] cursor-pointer"
                >
                  <span>Idioma / Language</span>
                  <span className="font-mono text-xs text-slate-400">
                    {locale.toUpperCase()}
                  </span>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleLoadFile}
            className="hidden"
          />

          <Button
            size="sm"
            variant="primary"
            onClick={handleDownloadZip}
            disabled={exporting || errorCount > 0}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {exporting ? t("header.exporting") : t("header.download_zip")}
            </span>
          </Button>
        </div>
      </header>

      {/* Main Step Viewport */}
      <main className="flex-1 min-h-0 overflow-hidden bg-[#0b0f17]">
        {currentStep === "robot" && (
          <RobotFlowView
            onGoToStates={() => setActiveTab("fsm")}
            onGoToControls={() => setActiveTab("controls")}
          />
        )}
        {currentStep === "states" && (
          <StatesView
            initialTarget={activeTab === "superstructure" ? "superstructure" : "subsystem"}
          />
        )}
        {currentStep === "controls" && <ControlsTab />}
        {currentStep === "export" && (
          <CodeTab onDownloadZip={handleDownloadZip} exporting={exporting} />
        )}
      </main>

      {/* Bottom Progress & Status Bar */}
      <footer className="relative flex h-9 shrink-0 items-center justify-between border-t border-[#22304a] bg-[#0f1624] px-4 font-mono text-xs text-slate-400">
        <div
          className="absolute left-0 top-0 h-[2px] bg-[#60a5fa] transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
        <div className="flex items-center gap-3.5">
          <span>Ciprix 2026.3.0</span>
          <span>
            {generatedFiles.length} {t("status.files")}
          </span>
          <span className={errorCount > 0 ? "text-rose-400" : "text-emerald-400"}>
            {errorCount} {t("status.errors")}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-slate-500">Ctrl+K · Alt+1..4</span>
          {nextStep && (
            <Button size="sm" variant="secondary" className="h-7 px-3 text-xs" onClick={() => setActiveTab(nextStep.tab)}>
              {t("step.next")}: {nextStep.label}
              <ArrowRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </footer>

      <ProjectSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSaveJson={handleSaveJson}
        onLoadJson={() => fileInputRef.current?.click()}
        onDownloadZip={handleDownloadZip}
        onOpenProjectSettings={() => setSettingsOpen(true)}
      />

      {toastMsg && (
        <div
          className={cn(
            "fixed bottom-12 right-4 z-50 rounded-lg border px-4 py-2.5 text-[13px] shadow-xl",
            toastMsg.tone === "ok"
              ? "border-[#3b6bb5] bg-[#131c2e] text-white"
              : "border-rose-700/70 bg-rose-950/90 text-rose-200",
          )}
        >
          {toastMsg.text}
        </div>
      )}
    </div>
  );
}
