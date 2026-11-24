"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Popover from "@radix-ui/react-popover";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  AlertTriangle,
  CheckCircle,
  Download,
  FolderOpen,
  Gamepad2,
  GitBranch,
  Globe,
  Home,
  LayoutGrid,
  LayoutTemplate,
  Package,
  PanelLeft,
  Redo2,
  Save,
  Search,
  Settings2,
  Undo2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const navItems: {
    id: GuidedStep;
    tab: StudioTab;
    label: string;
    icon: React.ReactNode;
    badge: string;
    badgeVariant?: "default" | "success" | "destructive";
    shortcut: string;
  }[] = [
    {
      id: "robot",
      tab: "subsystems",
      label: "Editor do Robô",
      icon: <LayoutGrid className="h-4 w-4 shrink-0" />,
      badge: String(project.subsystems.length),
      shortcut: "Alt+1",
    },
    {
      id: "states",
      tab: "fsm",
      label: "Estados & FSM",
      icon: <GitBranch className="h-4 w-4 shrink-0" />,
      badge: String(totalFsmStates),
      shortcut: "Alt+2",
    },
    {
      id: "controls",
      tab: "controls",
      label: "Controles",
      icon: <Gamepad2 className="h-4 w-4 shrink-0" />,
      badge: String(totalBindings),
      shortcut: "Alt+3",
    },
    {
      id: "export",
      tab: "code",
      label: "Exportar",
      icon: <Package className="h-4 w-4 shrink-0" />,
      badge: errorCount === 0 ? "OK" : `${errorCount}!`,
      badgeVariant: errorCount === 0 ? "success" : "destructive",
      shortcut: "Alt+4",
    },
  ];

  const activeNav = navItems.find((n) => n.id === currentStep) ?? navItems[0];

  const renderSidebarBody = (collapsed: boolean, isMobile = false) => (
    <div className="flex h-full flex-col bg-[#0f1624] bg-pattern text-slate-100">
      {/* Sidebar Brand Header */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-[#22304a]",
          collapsed ? "justify-center px-2" : "justify-between px-4",
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#3b6bb5] bg-[#142c4f] font-headline text-sm font-bold text-white shadow-sm">
            FS
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate font-headline text-base font-bold text-white">
                {t("app.title")}
              </p>
              <p className="truncate font-mono text-[11px] text-[#93c5fd]">Ciprix 2026.3.0</p>
            </div>
          )}
        </div>
        {isMobile && (
          <Button size="icon" variant="ghost" onClick={() => setMobileMenuOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Sidebar Nav Menu */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {navItems.map((item) => {
          const active = currentStep === item.id;
          const btn = (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveTab(item.tab);
                if (isMobile) setMobileMenuOpen(false);
              }}
              className={cn(
                "flex w-full items-center rounded-lg text-[13px] font-medium transition-all cursor-pointer",
                collapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5",
                active
                  ? "bg-[#142c4f] border border-[#3b6bb5] text-white shadow-sm"
                  : "border border-transparent text-slate-300 hover:bg-[#19253d] hover:text-white",
              )}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                {item.icon}
                {!collapsed && <span className="truncate">{item.label}</span>}
              </span>
              {!collapsed && (
                <Badge
                  variant={item.badgeVariant ?? (active ? "default" : "secondary")}
                  className="px-2 py-0 text-[11px]"
                >
                  {item.badge}
                </Badge>
              )}
            </button>
          );

          if (!collapsed) return btn;

          return (
            <Tooltip.Root key={item.id}>
              <Tooltip.Trigger asChild>{btn}</Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  side="right"
                  sideOffset={8}
                  className="z-50 rounded-md border border-[#3b6bb5] bg-[#131c2e] px-2.5 py-1.5 text-xs text-white shadow-xl"
                >
                  <span>{item.label}</span>
                  <span className="ml-2 font-mono text-[10px] text-slate-400">{item.shortcut}</span>
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          );
        })}

        <div className="my-3 border-t border-[#22304a]" />

        <Tooltip.Root open={collapsed ? undefined : false}>
          <Tooltip.Trigger asChild>
            <button
              type="button"
              onClick={() => {
                setSettingsOpen(true);
                if (isMobile) setMobileMenuOpen(false);
              }}
              className={cn(
                "flex w-full items-center rounded-lg border border-transparent text-[13px] font-medium text-slate-300 hover:bg-[#19253d] hover:text-white transition-all cursor-pointer",
                collapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2.5",
              )}
            >
              <Settings2 className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Configurações</span>}
            </button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              side="right"
              sideOffset={8}
              className="z-50 rounded-md border border-[#3b6bb5] bg-[#131c2e] px-2.5 py-1.5 text-xs text-white shadow-xl"
            >
              Configurações do Projeto
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>

        <Tooltip.Root open={collapsed ? undefined : false}>
          <Tooltip.Trigger asChild>
            <Link
              href="/"
              className={cn(
                "flex w-full items-center rounded-lg border border-transparent text-[13px] font-medium text-slate-300 hover:bg-[#19253d] hover:text-white transition-all",
                collapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2.5",
              )}
            >
              <Home className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Página Inicial</span>}
            </Link>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              side="right"
              sideOffset={8}
              className="z-50 rounded-md border border-[#3b6bb5] bg-[#131c2e] px-2.5 py-1.5 text-xs text-white shadow-xl"
            >
              Página Inicial
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </nav>

      {/* Sidebar Project Footer */}
      <div className="shrink-0 border-t border-[#22304a] p-3">
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className={cn(
            "w-full rounded-lg border border-[#22304a] bg-[#131c2e] hover:border-[#3b6bb5] hover:bg-[#19253d] transition-all cursor-pointer text-left",
            collapsed ? "flex justify-center p-2" : "p-3 space-y-1",
          )}
        >
          {collapsed ? (
            <span className="font-mono text-xs font-bold text-[#93c5fd]">
              #{project.project.teamNumber}
            </span>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-headline text-sm font-semibold text-white">
                  {project.project.name}
                </span>
                <span className="font-mono text-xs text-[#93c5fd]">
                  #{project.project.teamNumber}
                </span>
              </div>
              <p className="font-mono text-[11px] text-slate-400">
                {generatedFiles.length} {t("status.files")} ·{" "}
                <span className={errorCount > 0 ? "text-rose-400" : "text-emerald-400"}>
                  {errorCount} {t("status.errors")}
                </span>
              </p>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#0b0f17] text-[#f8fafc]">
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={cn(
          "hidden md:flex shrink-0 flex-col border-r border-[#22304a] transition-all duration-200",
          sidebarCollapsed ? "w-[72px]" : "w-64",
        )}
      >
        {renderSidebarBody(sidebarCollapsed)}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex md:hidden bg-[#0b0f17]/80 backdrop-blur-xs"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside
            className="w-68 h-full border-r border-[#22304a]"
            onClick={(e) => e.stopPropagation()}
          >
            {renderSidebarBody(false, true)}
          </aside>
        </div>
      )}

      {/* Right Main Column */}
      <div className="flex flex-1 flex-col min-w-0 h-screen overflow-hidden">
        {/* Sticky Top Header Bar */}
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[#22304a] bg-[#0f1624]/90 bg-pattern px-4 lg:px-6 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              size="icon"
              variant="outline"
              aria-label="Toggle Sidebar"
              onClick={() => {
                if (typeof window !== "undefined" && window.innerWidth < 768) {
                  setMobileMenuOpen((v) => !v);
                } else {
                  setSidebarCollapsed((v) => !v);
                }
              }}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2.5 min-w-0">
              <span className="truncate font-headline text-base font-semibold text-white">
                {activeNav.label}
              </span>
              <Badge variant="outline" className="hidden sm:inline-flex">
                {project.project.name} #{project.project.teamNumber}
              </Badge>
            </div>
          </div>

          {/* EditorHeader Utility Cluster */}
          <div className="flex items-center gap-1.5">
            {/* Templates Dropdown */}
            <DropdownMenu.Root>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <DropdownMenu.Trigger asChild>
                    <Button size="icon" variant="outline" aria-label="Templates">
                      <LayoutTemplate className="h-4 w-4" />
                    </Button>
                  </DropdownMenu.Trigger>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    sideOffset={6}
                    className="z-50 rounded border border-[#3b6bb5] bg-[#131c2e] px-2.5 py-1 text-xs text-slate-100 shadow-lg"
                  >
                    Modelos de Projeto
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>

              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={6}
                  className="z-50 w-56 rounded-lg border border-[#2c3f61] bg-[#131c2e] py-1.5 shadow-2xl text-[13px]"
                >
                  <DropdownMenu.Item
                    onSelect={resetToSkeleton}
                    className="flex items-center justify-between px-3 py-2 text-slate-200 outline-none hover:bg-[#19253d] cursor-pointer"
                  >
                    <span>{t("header.preset_skeleton")}</span>
                    <span className="font-mono text-[10px] text-[#93c5fd]">Roller</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={resetToBlank}
                    className="flex items-center justify-between px-3 py-2 text-slate-200 outline-none hover:bg-[#19253d] cursor-pointer"
                  >
                    <span>{t("header.preset_blank")}</span>
                    <span className="font-mono text-[10px] text-slate-400">Vazio</span>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* Health Checklist Popover */}
            <Popover.Root>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <Popover.Trigger asChild>
                    <Button size="icon" variant="outline" className="relative" aria-label="Checklist">
                      {issues.length > 0 ? (
                        <AlertTriangle
                          className={cn(
                            "h-4 w-4",
                            errorCount > 0 ? "text-rose-400" : "text-amber-400",
                          )}
                        />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                      )}
                      {issues.length > 0 && (
                        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 font-mono text-[10px] font-bold text-white">
                          {issues.length}
                        </span>
                      )}
                    </Button>
                  </Popover.Trigger>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    sideOffset={6}
                    className="z-50 rounded border border-[#3b6bb5] bg-[#131c2e] px-2.5 py-1 text-xs text-slate-100 shadow-lg"
                  >
                    {t("header.checklist")}
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>

              <Popover.Portal>
                <Popover.Content
                  align="end"
                  sideOffset={6}
                  className="z-50 w-80 rounded-xl border border-[#3b6bb5]/70 bg-[#131c2e] p-3.5 shadow-2xl"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-headline text-sm font-semibold text-white">
                      Checklist do Robô
                    </span>
                    <Badge variant={errorCount > 0 ? "destructive" : "success"}>
                      {errorCount === 0 ? "OK" : `${errorCount} erros`}
                    </Badge>
                  </div>
                  {issues.length === 0 ? (
                    <p className="text-[13px] text-emerald-300">{t("header.no_issues")}</p>
                  ) : (
                    <ul className="space-y-1.5 max-h-64 overflow-y-auto">
                      {issues.map((issue) => (
                        <li key={issue.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab(issue.tab);
                              if (issue.targetId) setSelectedSubsystemId(issue.targetId);
                            }}
                            className="w-full rounded-md border border-[#22304a] bg-[#0f1624] px-3 py-2 text-left text-xs hover:border-[#3b6bb5] hover:bg-[#19253d] cursor-pointer"
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

            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Button size="icon" variant="outline" onClick={handleSaveJson} aria-label="Save JSON">
                  <Save className="h-4 w-4" />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  sideOffset={6}
                  className="z-50 rounded border border-[#3b6bb5] bg-[#131c2e] px-2.5 py-1 text-xs text-slate-100"
                >
                  {t("header.save_json")}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>

            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Load JSON"
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  sideOffset={6}
                  className="z-50 rounded border border-[#3b6bb5] bg-[#131c2e] px-2.5 py-1 text-xs text-slate-100"
                >
                  {t("header.load_json")}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>

            <span className="mx-1 hidden sm:inline-block h-6 w-px bg-[#22304a]" />

            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Button size="icon" variant="outline" onClick={undo} disabled={!canUndo} aria-label="Undo">
                  <Undo2 className="h-4 w-4" />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  sideOffset={6}
                  className="z-50 rounded border border-[#3b6bb5] bg-[#131c2e] px-2.5 py-1 font-mono text-xs text-slate-100"
                >
                  {t("header.undo")}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>

            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Button size="icon" variant="outline" onClick={redo} disabled={!canRedo} aria-label="Redo">
                  <Redo2 className="h-4 w-4" />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  sideOffset={6}
                  className="z-50 rounded border border-[#3b6bb5] bg-[#131c2e] px-2.5 py-1 font-mono text-xs text-slate-100"
                >
                  {t("header.redo")}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>

            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setPaletteOpen(true)}
                  aria-label="Command Palette"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  sideOffset={6}
                  className="z-50 rounded border border-[#3b6bb5] bg-[#131c2e] px-2.5 py-1 font-mono text-xs text-slate-100"
                >
                  Ctrl+K
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>

            <Button
              size="sm"
              variant="outline"
              className="hidden sm:inline-flex font-mono px-2.5"
              onClick={() => setLocale(locale === "pt" ? "en" : "pt")}
            >
              <Globe className="h-3.5 w-3.5 mr-1" />
              {locale.toUpperCase()}
            </Button>

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
              className="ml-1"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {exporting ? t("header.exporting") : t("header.download_zip")}
              </span>
            </Button>
          </div>
        </header>

        {/* Scrollable Workspace Content */}
        <main className="flex-1 overflow-y-auto overflow-x-clip bg-[#0b0f17] p-6 lg:p-8">
          <div className="mx-auto max-w-[1440px] space-y-6">
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
          </div>
        </main>
      </div>

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
            "fixed bottom-6 right-6 z-50 rounded-lg border px-4 py-2.5 text-[13px] shadow-2xl",
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
