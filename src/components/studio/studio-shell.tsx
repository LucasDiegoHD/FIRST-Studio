"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  Code2,
  Cpu,
  Download,
  FolderOpen,
  Gamepad2,
  Layers,
  MoreHorizontal,
  PanelLeft,
  PanelRight,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Search,
  Settings2,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProject } from "@/context/project-context";
import { getRequiredVendordeps } from "@/lib/generator";
import { exportProjectZip } from "@/lib/generator/zip-exporter";
import { CiprixProjectSchema } from "@/lib/schema/ciprix-project";
import { cn } from "@/lib/utils";
import { ArchitectureView } from "./architecture-view";
import { CodeTab } from "./code-tab";
import { CommandPalette } from "./command-palette";
import { ControlsTab } from "./controls-tab";
import { ProjectTab } from "./project-tab";
import { SubsystemInspector, type InspectorMode } from "./subsystem-inspector";
import { SuperStructureTab } from "./superstructure-tab";

export function StudioShell() {
  const {
    project,
    locale,
    setLocale,
    t,
    activeTab,
    setActiveTab,
    selectedSubsystemId,
    setSelectedSubsystemId,
    issues,
    generatedFiles,
    loadProject,
    resetToSkeleton,
    addSubsystem,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useProject();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [inspectorMode, setInspectorMode] = useState<InspectorMode>("hardware");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; tone: "ok" | "err" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (text: string, tone: "ok" | "err" = "ok") => {
    setToastMsg({ text, tone });
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    if (activeTab === "fsm") {
      setInspectorMode("fsm");
    }
  }, [activeTab]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (mod && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setSidebarOpen((v) => !v);
        return;
      }
      if (mod && e.key === "\\") {
        e.preventDefault();
        setInspectorOpen((v) => !v);
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
  const vendordeps = useMemo(() => getRequiredVendordeps(project), [project]);
  const selectedSubsystem = project.subsystems.find((s) => s.id === selectedSubsystemId);

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

  const isArchitecture = activeTab === "subsystems" || activeTab === "fsm";
  const showRightDrawer = inspectorOpen && activeTab !== "code";

  const breadcrumbLabel = isArchitecture
    ? selectedSubsystem
      ? `${selectedSubsystem.name} / ${t(`inspector.${inspectorMode}`)}`
      : t("nav.architecture")
    : t(`tabs.${activeTab}`);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-black text-[#f3f5f8]">
      {/* Thin Top Bar (42px) */}
      <header className="flex h-[42px] shrink-0 items-center justify-between border-b border-[#171c26] bg-[#05070b] px-3">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setSidebarOpen((v) => !v)}
            title="Ctrl+B"
          >
            <PanelLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="font-mono text-xs font-bold tracking-tight text-white">FS</span>
          <ChevronRight className="h-3.5 w-3.5 text-[#465164]" />
          <button
            type="button"
            onClick={() => setActiveTab("subsystems")}
            className="truncate text-xs font-medium text-slate-200 hover:text-white cursor-pointer"
          >
            {project.project.name}
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-[#465164]" />
          <span className="truncate text-xs text-[#8a94a6]">{breadcrumbLabel}</span>
        </div>

        {/* Center Command Palette Trigger */}
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="hidden md:flex items-center gap-6 rounded border border-[#1a2232] bg-[#000000] px-2.5 py-1 text-[11px] text-[#7c8ba1] transition-colors hover:border-[#264f8a] hover:text-slate-200 cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Search className="h-3 w-3" />
            {t("cmd.placeholder")}
          </span>
          <kbd className="font-mono text-[10px] text-[#556072]">Ctrl+K</kbd>
        </button>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setChecklistOpen((v) => !v);
                setMenuOpen(false);
              }}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  errorCount > 0 ? "bg-rose-400" : issues.length > 0 ? "bg-amber-400" : "bg-emerald-400",
                )}
              />
              <span className="font-mono text-[11px]">{issues.length}</span>
            </Button>
            {checklistOpen && (
              <div className="absolute right-0 mt-1.5 w-80 rounded-md border border-[#264f8a] bg-[#060910] p-2.5 shadow-2xl z-40">
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
                            setChecklistOpen(false);
                          }}
                          className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-[#0c121e] cursor-pointer"
                        >
                          <span className={issue.severity === "error" ? "text-rose-300" : "text-amber-300"}>
                            {issue.message}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {activeTab !== "code" && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setInspectorOpen((v) => !v)}
              title="Ctrl+\"
            >
              <PanelRight className="h-3.5 w-3.5" />
            </Button>
          )}

          <div className="relative">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setMenuOpen((v) => !v);
                setChecklistOpen(false);
              }}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
            {menuOpen && (
              <div className="absolute right-0 mt-1.5 w-52 rounded-md border border-[#1d2432] bg-[#060910] py-1 shadow-2xl z-40 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    handleSaveJson();
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-slate-200 hover:bg-[#0c121e] cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5 text-[#7c8ba1]" />
                  {t("header.save_json")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-slate-200 hover:bg-[#0c121e] cursor-pointer"
                >
                  <FolderOpen className="h-3.5 w-3.5 text-[#7c8ba1]" />
                  {t("header.load_json")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetToSkeleton();
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-slate-200 hover:bg-[#0c121e] cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-[#7c8ba1]" />
                  {t("header.preset_skeleton")}
                </button>
                <div className="my-1 border-t border-[#171c26]" />
                <button
                  type="button"
                  disabled={!canUndo}
                  onClick={() => {
                    undo();
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-slate-200 hover:bg-[#0c121e] disabled:opacity-40 cursor-pointer"
                >
                  <Undo2 className="h-3.5 w-3.5 text-[#7c8ba1]" />
                  {t("header.undo")}
                </button>
                <button
                  type="button"
                  disabled={!canRedo}
                  onClick={() => {
                    redo();
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-slate-200 hover:bg-[#0c121e] disabled:opacity-40 cursor-pointer"
                >
                  <Redo2 className="h-3.5 w-3.5 text-[#7c8ba1]" />
                  {t("header.redo")}
                </button>
                <div className="my-1 border-t border-[#171c26]" />
                <button
                  type="button"
                  onClick={() => {
                    setLocale(locale === "pt" ? "en" : "pt");
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left text-slate-200 hover:bg-[#0c121e] cursor-pointer"
                >
                  <span>Idioma / Language</span>
                  <span className="font-mono text-[10px] text-[#7c8ba1]">{locale.toUpperCase()}</span>
                </button>
              </div>
            )}
          </div>

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
            {exporting ? t("header.exporting") : t("header.download_zip")}
          </Button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 min-h-0">
        {/* Left Navigation Sidebar (AdvantageScope-inspired) */}
        {sidebarOpen && (
          <aside className="flex w-[228px] shrink-0 flex-col justify-between border-r border-[#171c26] bg-[#05070b] p-2.5 overflow-y-auto">
            <div className="space-y-5">
              <div className="space-y-0.5">
                <p className="px-2 pb-1 font-mono text-[10px] uppercase tracking-wider text-[#556072]">
                  {t("nav.architecture")}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("subsystems")}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors cursor-pointer",
                    isArchitecture
                      ? "bg-[#142c4f]/65 text-white border border-[#264f8a]/70"
                      : "text-[#9aa5b6] hover:bg-[#0c121e] hover:text-slate-100 border border-transparent",
                  )}
                >
                  <Cpu className="h-3.5 w-3.5" />
                  <span>{t("nav.architecture")}</span>
                </button>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center justify-between px-2 pb-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#556072]">
                    {t("nav.subsystems")}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      addSubsystem("roller");
                      setActiveTab("subsystems");
                      setInspectorOpen(true);
                    }}
                    className="rounded p-0.5 text-[#7c8ba1] hover:bg-[#0c121e] hover:text-white cursor-pointer"
                    title={`+ ${t("subsystems.roller")}`}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                {project.subsystems.map((sub) => {
                  const active = isArchitecture && selectedSubsystemId === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        setSelectedSubsystemId(sub.id);
                        setActiveTab("subsystems");
                        setInspectorOpen(true);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded px-2 py-1.5 text-xs transition-colors cursor-pointer",
                        active
                          ? "bg-[#142c4f]/50 text-white"
                          : "text-[#9aa5b6] hover:bg-[#0c121e] hover:text-slate-100",
                      )}
                    >
                      <span className="truncate">{sub.name}</span>
                      <span className="font-mono text-[10px] text-[#6b7689]">
                        #{sub.motor.canId}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-0.5">
                <p className="px-2 pb-1 font-mono text-[10px] uppercase tracking-wider text-[#556072]">
                  {t("nav.coordination")}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("superstructure")}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors cursor-pointer",
                    activeTab === "superstructure"
                      ? "bg-[#142c4f]/65 text-white border border-[#264f8a]/70"
                      : "text-[#9aa5b6] hover:bg-[#0c121e] hover:text-slate-100 border border-transparent",
                  )}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>SuperStructure</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("controls")}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors cursor-pointer",
                    activeTab === "controls"
                      ? "bg-[#142c4f]/65 text-white border border-[#264f8a]/70"
                      : "text-[#9aa5b6] hover:bg-[#0c121e] hover:text-slate-100 border border-transparent",
                  )}
                >
                  <Gamepad2 className="h-3.5 w-3.5" />
                  <span>{t("tabs.controls")}</span>
                </button>
              </div>

              <div className="space-y-0.5">
                <p className="px-2 pb-1 font-mono text-[10px] uppercase tracking-wider text-[#556072]">
                  {t("nav.output")}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("code")}
                  className={cn(
                    "flex w-full items-center justify-between rounded px-2 py-1.5 text-xs transition-colors cursor-pointer",
                    activeTab === "code"
                      ? "bg-[#142c4f]/65 text-white border border-[#264f8a]/70"
                      : "text-[#9aa5b6] hover:bg-[#0c121e] hover:text-slate-100 border border-transparent",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Code2 className="h-3.5 w-3.5" />
                    {t("nav.files")}
                  </span>
                  <span className="font-mono text-[10px] text-[#6b7689]">
                    {generatedFiles.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("project")}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors cursor-pointer",
                    activeTab === "project"
                      ? "bg-[#142c4f]/65 text-white border border-[#264f8a]/70"
                      : "text-[#9aa5b6] hover:bg-[#0c121e] hover:text-slate-100 border border-transparent",
                  )}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  <span>{t("nav.project")}</span>
                </button>
              </div>
            </div>

            <div className="border-t border-[#171c26] pt-2.5 px-1.5">
              <p className="font-mono text-[10px] text-[#556072] leading-relaxed">
                {vendordeps.map((v) => v.replace(".json", "")).join(" · ")}
              </p>
            </div>
          </aside>
        )}

        {/* Center Viewport */}
        <main className="flex-1 min-w-0 min-h-0 overflow-hidden bg-black">
          {isArchitecture && (
            <ArchitectureView
              onSelectSubsystem={(id) => {
                setSelectedSubsystemId(id);
                setInspectorOpen(true);
              }}
            />
          )}
          {activeTab === "superstructure" && <SuperStructureTab />}
          {activeTab === "controls" && <ControlsTab />}
          {activeTab === "code" && (
            <CodeTab onDownloadZip={handleDownloadZip} exporting={exporting} />
          )}
          {activeTab === "project" && <ProjectTab />}
        </main>

        {/* Contextual Right Drawer */}
        {showRightDrawer && (
          <SubsystemInspector mode={inspectorMode} onModeChange={setInspectorMode} />
        )}
      </div>

      {/* Bottom Status Bar (26px) */}
      <footer className="flex h-[26px] shrink-0 items-center justify-between border-t border-[#171c26] bg-[#05070b] px-3 font-mono text-[10px] text-[#6b7689]">
        <div className="flex items-center gap-3">
          <span>Team #{project.project.teamNumber}</span>
          <span>Ciprix 2026.3.0</span>
          <span>
            {generatedFiles.length} {t("status.files")}
          </span>
          <span className={errorCount > 0 ? "text-rose-400" : "text-emerald-400"}>
            {errorCount} {t("status.errors")}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <span>Ctrl+K Palette</span>
          <span>Ctrl+B Sidebar</span>
          <span>Ctrl+\ Inspector</span>
        </div>
      </footer>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSaveJson={handleSaveJson}
        onLoadJson={() => fileInputRef.current?.click()}
        onDownloadZip={handleDownloadZip}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onToggleInspector={() => setInspectorOpen((v) => !v)}
        onOpenSubsystemFsm={(id) => {
          setSelectedSubsystemId(id);
          setActiveTab("subsystems");
          setInspectorMode("fsm");
          setInspectorOpen(true);
        }}
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
