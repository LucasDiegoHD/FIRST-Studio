"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Popover from "@radix-ui/react-popover";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  FolderOpen,
  MoreHorizontal,
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
  }, [undo, redo]);

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const currentStep = tabToStep(activeTab);

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

  const steps: { id: GuidedStep; tab: StudioTab; label: string }[] = [
    { id: "robot", tab: "subsystems", label: t("step.robot") },
    { id: "states", tab: "fsm", label: t("step.states") },
    { id: "controls", tab: "controls", label: t("step.controls") },
    { id: "export", tab: "code", label: t("step.export") },
  ];

  const stepIndex = steps.findIndex((s) => s.id === currentStep);
  const nextStep = steps[stepIndex + 1];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-black text-[#f3f5f8]">
      {/* Guided Studio Header (48px) */}
      <header className="flex h-[48px] shrink-0 items-center justify-between border-b border-[#171c26] bg-[#05070b] px-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/"
            className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs text-[#8a94a6] hover:bg-[#0c121e] hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("header.home")}</span>
          </Link>

          <span className="h-4 w-px bg-[#171c26]" />

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex h-7 items-center gap-1.5 rounded px-2 text-xs text-slate-200 hover:bg-[#0c121e] cursor-pointer truncate"
          >
            <span className="font-medium truncate">{project.project.name}</span>
            <span className="font-mono text-[11px] text-[#6b7689]">
              #{project.project.teamNumber}
            </span>
            <Pencil className="h-3 w-3 text-[#6b7689]" />
          </button>
        </div>

        {/* 4-Step Linear Navigation */}
        <nav className="flex items-center gap-1 rounded-md border border-[#171c26] bg-black p-0.5 overflow-x-auto">
          {steps.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setActiveTab(st.tab)}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer",
                currentStep === st.id
                  ? "bg-[#142c4f] border border-[#264f8a] text-white"
                  : "border border-transparent text-[#8a94a6] hover:text-slate-100",
              )}
            >
              {st.label}
            </button>
          ))}
        </nav>

        {/* Right Actions with Radix Popover & Dropdown */}
        <div className="flex items-center gap-1.5">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setPaletteOpen(true)}
            title="Ctrl+K"
          >
            <Search className="h-3.5 w-3.5" />
          </Button>

          <Popover.Root>
            <Popover.Trigger asChild>
              <Button size="sm" variant="ghost">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    errorCount > 0
                      ? "bg-rose-400"
                      : issues.length > 0
                        ? "bg-amber-400"
                        : "bg-emerald-400",
                  )}
                />
                <span className="font-mono text-[11px]">{issues.length}</span>
              </Button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                align="end"
                sideOffset={6}
                className="z-50 w-80 rounded-md border border-[#264f8a] bg-[#060910] p-2.5 shadow-2xl"
              >
                {issues.length === 0 ? (
                  <p className="text-xs text-emerald-300">{t("header.no_issues")}</p>
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
                          className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-[#0c121e] cursor-pointer"
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
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={6}
                className="z-50 w-52 rounded-md border border-[#1d2432] bg-[#060910] py-1 shadow-2xl text-xs"
              >
                <DropdownMenu.Item
                  onSelect={handleSaveJson}
                  className="flex items-center gap-2 px-3 py-1.5 text-slate-200 outline-none hover:bg-[#0c121e] cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5 text-[#7c8ba1]" />
                  {t("header.save_json")}
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-1.5 text-slate-200 outline-none hover:bg-[#0c121e] cursor-pointer"
                >
                  <FolderOpen className="h-3.5 w-3.5 text-[#7c8ba1]" />
                  {t("header.load_json")}
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-[#171c26]" />
                <DropdownMenu.Item
                  onSelect={resetToSkeleton}
                  className="flex items-center gap-2 px-3 py-1.5 text-slate-200 outline-none hover:bg-[#0c121e] cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-[#7c8ba1]" />
                  {t("header.preset_skeleton")}
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={resetToBlank}
                  className="flex items-center gap-2 px-3 py-1.5 text-slate-200 outline-none hover:bg-[#0c121e] cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-[#7c8ba1]" />
                  {t("header.preset_blank")}
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-[#171c26]" />
                <DropdownMenu.Item
                  disabled={!canUndo}
                  onSelect={undo}
                  className="flex items-center gap-2 px-3 py-1.5 text-slate-200 outline-none hover:bg-[#0c121e] data-[disabled]:opacity-40 cursor-pointer"
                >
                  <Undo2 className="h-3.5 w-3.5 text-[#7c8ba1]" />
                  {t("header.undo")}
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  disabled={!canRedo}
                  onSelect={redo}
                  className="flex items-center gap-2 px-3 py-1.5 text-slate-200 outline-none hover:bg-[#0c121e] data-[disabled]:opacity-40 cursor-pointer"
                >
                  <Redo2 className="h-3.5 w-3.5 text-[#7c8ba1]" />
                  {t("header.redo")}
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-[#171c26]" />
                <DropdownMenu.Item
                  onSelect={() => setLocale(locale === "pt" ? "en" : "pt")}
                  className="flex items-center justify-between px-3 py-1.5 text-slate-200 outline-none hover:bg-[#0c121e] cursor-pointer"
                >
                  <span>Idioma / Language</span>
                  <span className="font-mono text-[10px] text-[#7c8ba1]">
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
      <main className="flex-1 min-h-0 overflow-hidden bg-black">
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

      {/* Bottom Status Bar */}
      <footer className="flex h-[28px] shrink-0 items-center justify-between border-t border-[#171c26] bg-[#05070b] px-3 font-mono text-[10px] text-[#6b7689]">
        <div className="flex items-center gap-3">
          <span>Ciprix 2026.3.0</span>
          <span>
            {generatedFiles.length} {t("status.files")}
          </span>
          <span className={errorCount > 0 ? "text-rose-400" : "text-emerald-400"}>
            {errorCount} {t("status.errors")}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline">Ctrl+K Palette</span>
          {nextStep && (
            <button
              type="button"
              onClick={() => setActiveTab(nextStep.tab)}
              className="inline-flex items-center gap-1 text-[#93c5fd] hover:text-white cursor-pointer"
            >
              {t("step.next")}: {nextStep.label}
              <ArrowRight className="h-3 w-3" />
            </button>
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
            "fixed bottom-9 right-4 z-50 rounded border px-3 py-2 text-xs shadow-lg",
            toastMsg.tone === "ok"
              ? "border-[#264f8a] bg-[#081222] text-slate-100"
              : "border-rose-700/70 bg-rose-950/90 text-rose-200",
          )}
        >
          {toastMsg.text}
        </div>
      )}
    </div>
  );
}
