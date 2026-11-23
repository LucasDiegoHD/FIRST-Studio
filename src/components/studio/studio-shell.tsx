"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Download,
  FolderOpen,
  Gamepad2,
  GitBranch,
  Layers,
  Redo2,
  RotateCcw,
  Save,
  Settings2,
  Code2,
  Undo2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProject } from "@/context/project-context";
import { exportProjectZip } from "@/lib/generator/zip-exporter";
import { CiprixProjectSchema } from "@/lib/schema/ciprix-project";
import type { StudioTab } from "@/lib/validator";
import { cn } from "@/lib/utils";
import { CodeTab } from "./code-tab";
import { ControlsTab } from "./controls-tab";
import { FsmTab } from "./fsm-tab";
import { ProjectTab } from "./project-tab";
import { SubsystemsTab } from "./subsystems-tab";
import { SuperStructureTab } from "./superstructure-tab";

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
    loadProject,
    resetToSkeleton,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useProject();

  const [exporting, setExporting] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; tone: "ok" | "err" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (text: string, tone: "ok" | "err" = "ok") => {
    setToastMsg({ text, tone });
    setTimeout(() => setToastMsg(null), 3200);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (isInput) return;

      const mod = e.ctrlKey || e.metaKey;
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

  const tabs: { id: StudioTab; label: string; icon: React.ReactNode }[] = [
    { id: "project", label: t("tabs.project"), icon: <Settings2 className="h-3.5 w-3.5" /> },
    { id: "subsystems", label: t("tabs.subsystems"), icon: <Cpu className="h-3.5 w-3.5" /> },
    { id: "fsm", label: t("tabs.fsm"), icon: <GitBranch className="h-3.5 w-3.5" /> },
    { id: "superstructure", label: t("tabs.superstructure"), icon: <Layers className="h-3.5 w-3.5" /> },
    { id: "controls", label: t("tabs.controls"), icon: <Gamepad2 className="h-3.5 w-3.5" /> },
    { id: "code", label: t("tabs.code"), icon: <Code2 className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-800/90 bg-[#090d16]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/15 border border-sky-500/35 text-sky-300 font-mono font-bold text-sm">
              FS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-slate-100">{t("app.title")}</h1>
                <Badge variant="info">Ciprix 2026.3.0</Badge>
              </div>
              <p className="text-[11px] text-slate-400">{t("app.subtitle")}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={resetToSkeleton}>
              <RotateCcw className="h-3.5 w-3.5" />
              {t("header.preset_skeleton")}
            </Button>

            <div className="relative">
              <Button
                size="sm"
                variant={errorCount > 0 ? "destructive" : "outline"}
                onClick={() => setChecklistOpen((o) => !o)}
              >
                {errorCount > 0 ? (
                  <AlertTriangle className="h-3.5 w-3.5" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                )}
                {t("header.checklist")} ({issues.length})
              </Button>
              {checklistOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-700 bg-[#0f1523] p-3 shadow-xl z-40">
                  {issues.length === 0 ? (
                    <p className="text-xs text-emerald-300">{t("header.no_issues")}</p>
                  ) : (
                    <ul className="space-y-1.5 max-h-64 overflow-y-auto">
                      {issues.map((issue) => (
                        <li key={issue.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab(issue.tab);
                              if (issue.targetId) setSelectedSubsystemId(issue.targetId);
                              setChecklistOpen(false);
                            }}
                            className="w-full rounded-md bg-slate-900/90 p-2 text-left text-xs hover:bg-slate-800 cursor-pointer"
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
                </div>
              )}
            </div>

            <Button size="icon" variant="outline" onClick={handleSaveJson} title={t("header.save_json")}>
              <Save className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              title={t("header.load_json")}
            >
              <FolderOpen className="h-4 w-4" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleLoadFile}
              className="hidden"
            />

            <Button size="icon" variant="outline" onClick={undo} disabled={!canUndo} title={t("header.undo")}>
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" onClick={redo} disabled={!canRedo} title={t("header.redo")}>
              <Redo2 className="h-4 w-4" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setLocale(locale === "pt" ? "en" : "pt")}
              className="font-mono"
            >
              {locale.toUpperCase()}
            </Button>

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
        </div>

        <nav className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer",
                activeTab === tab.id
                  ? "bg-sky-500/15 text-sky-300 border border-sky-500/35"
                  : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200 border border-transparent",
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        {activeTab === "project" && <ProjectTab />}
        {activeTab === "subsystems" && <SubsystemsTab />}
        {activeTab === "fsm" && <FsmTab />}
        {activeTab === "superstructure" && <SuperStructureTab />}
        {activeTab === "controls" && <ControlsTab />}
        {activeTab === "code" && <CodeTab onDownloadZip={handleDownloadZip} exporting={exporting} />}
      </main>

      {toastMsg && (
        <div
          className={cn(
            "fixed bottom-5 right-5 z-50 rounded-lg border px-4 py-2.5 text-xs font-medium shadow-lg",
            toastMsg.tone === "ok"
              ? "border-emerald-500/40 bg-emerald-950/90 text-emerald-200"
              : "border-rose-500/40 bg-rose-950/90 text-rose-200",
          )}
        >
          {toastMsg.text}
        </div>
      )}
    </div>
  );
}
