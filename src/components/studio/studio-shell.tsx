"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Popover from "@radix-ui/react-popover";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  AlertTriangle,
  Award,
  CheckCircle,
  FolderOpen,
  Gamepad2,
  GitBranch,
  Globe,
  Home,
  Keyboard,
  LayoutGrid,
  LayoutTemplate,
  Map as MapIcon,
  Package,
  PanelLeft,
  Redo2,
  Rocket,
  Save,
  Search,
  Settings2,
  Trash2,
  Undo2,
  WifiOff,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProject } from "@/context/project-context";
import { useBridgeStatus } from "@/hooks/useBridgeStatus";
import { exportProjectZip } from "@/lib/generator/zip-exporter";
import {
  actionToTab,
  isEditableTarget,
  resolveShortcutAction,
  SHORTCUT_GUIDE,
} from "@/lib/keyboard-shortcuts";
import type { SubsystemConfig } from "@/lib/schema/ciprix-project";
import { parseProjectWithMigration } from "@/lib/schema/migrations";
import type { StudioTab } from "@/lib/validator";
import { cn } from "@/lib/utils";
import { ArenaTab } from "./arena-tab";
import { CodeTab } from "./code-tab";
import { CommandPalette } from "./command-palette";
import { ControlsTab } from "./controls-tab";
import { ProjectSettingsDialog } from "./project-settings-dialog";
import { RobotFlowView } from "./robot-flow-view";
import { StatesView } from "./states-view";

type GuidedStep = "robot" | "states" | "arena" | "controls" | "export";

function tabToStep(tab: StudioTab): GuidedStep {
  if (tab === "fsm" || tab === "superstructure") return "states";
  if (tab === "arena") return "arena";
  if (tab === "controls") return "controls";
  if (tab === "code") return "export";
  return "robot";
}

export function StudioShell({
  activeRoute = "studio",
  children,
}: {
  activeRoute?: "studio" | "credits";
  children?: React.ReactNode;
}) {
  const router = useRouter();
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
    focusRequest,
    focusIssue,
    highlightField,
    loadProject,
    duplicateSubsystem,
    removeSubsystem,
    reorderSubsystems,
    resetToSkeleton,
    resetToBlank,
    resetToCompetition,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useProject();

  const navigateToTab = useCallback(
    (tab: StudioTab) => {
      setActiveTab(tab);
      if (activeRoute !== "studio") {
        router.push("/studio");
      }
    },
    [activeRoute, router, setActiveTab],
  );

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [pendingDeleteSub, setPendingDeleteSub] = useState<SubsystemConfig | null>(null);
  const [exporting, setExporting] = useState(false);
  const [bridgeOpenSignal, setBridgeOpenSignal] = useState(0);
  const [bridgeDeploySignal, setBridgeDeploySignal] = useState(0);
  const bridgeStatus = useBridgeStatus(project.project.teamNumber);
  const [toastMsg, setToastMsg] = useState<{
    text: string;
    tone: "ok" | "err";
    canUndoAction?: boolean;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (text: string, tone: "ok" | "err" = "ok", canUndoAction = false) => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToastMsg({ text, tone, canUndoAction });
      toastTimerRef.current = setTimeout(
        () => setToastMsg(null),
        canUndoAction ? 4000 : 3000,
      );
    },
    [],
  );

  const handleDuplicateSubsystem = useCallback(
    (sub: SubsystemConfig) => {
      duplicateSubsystem(sub.id);
      showToast(t("toast.duplicated"), "ok", true);
    },
    [duplicateSubsystem, showToast, t],
  );

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const currentStep = tabToStep(activeTab);

  const handleSaveJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ciprix-project.json";
    a.click();
    URL.revokeObjectURL(url);
    showToast(t("toast.saved"));
  }, [project, showToast, t]);

  const handleDownloadZip = useCallback(async () => {
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
  }, [project, showToast, t]);

  useEffect(() => {
    const selectedSub =
      project.subsystems.find((s) => s.id === selectedSubsystemId) ??
      project.subsystems[0] ??
      null;

    const onKeyDown = (e: KeyboardEvent) => {
      const action = resolveShortcutAction(
        {
          key: e.key,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
        },
        {
          activeRoute,
          currentStep,
          hasSelectedSubsystem: Boolean(selectedSub),
          hasOpenModal: Boolean(
            settingsOpen || paletteOpen || shortcutsOpen || pendingDeleteSub || checklistOpen,
          ),
          isEditable: isEditableTarget(e.target),
        },
      );
      if (!action) return;

      e.preventDefault();

      const nextTab = actionToTab(action);
      if (nextTab) {
        navigateToTab(nextTab);
        return;
      }

      switch (action) {
        case "palette":
          setPaletteOpen((v) => !v);
          break;
        case "shortcutsHelp":
          setShortcutsOpen((v) => !v);
          break;
        case "saveJson":
          handleSaveJson();
          break;
        case "exportZip":
          if (!exporting && errorCount === 0) void handleDownloadZip();
          break;
        case "undo":
          if (canUndo) {
            undo();
            showToast(t("toast.undone"));
          }
          break;
        case "redo":
          if (canRedo) {
            redo();
            showToast(t("toast.redone"));
          }
          break;
        case "deleteSubsystem":
          if (selectedSub) setPendingDeleteSub(selectedSub);
          break;
        case "duplicateSubsystem":
          if (selectedSub) handleDuplicateSubsystem(selectedSub);
          break;
        case "prevSubsystem":
        case "nextSubsystem": {
          if (!selectedSub || project.subsystems.length <= 1) break;
          const idx = project.subsystems.findIndex((s) => s.id === selectedSub.id);
          const delta = action === "prevSubsystem" ? -1 : 1;
          const nextIdx = (idx + delta + project.subsystems.length) % project.subsystems.length;
          setSelectedSubsystemId(project.subsystems[nextIdx].id);
          break;
        }
        case "moveSubsystemLeft":
        case "moveSubsystemRight": {
          if (!selectedSub || project.subsystems.length <= 1) break;
          const idx = project.subsystems.findIndex((s) => s.id === selectedSub.id);
          const targetIdx = idx + (action === "moveSubsystemLeft" ? -1 : 1);
          if (targetIdx < 0 || targetIdx >= project.subsystems.length) break;
          const ids = project.subsystems.map((s) => s.id);
          const [moved] = ids.splice(idx, 1);
          ids.splice(targetIdx, 0, moved);
          reorderSubsystems(ids);
          break;
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    activeRoute,
    canRedo,
    canUndo,
    checklistOpen,
    currentStep,
    errorCount,
    exporting,
    handleDownloadZip,
    handleDuplicateSubsystem,
    handleSaveJson,
    navigateToTab,
    paletteOpen,
    pendingDeleteSub,
    project.subsystems,
    redo,
    reorderSubsystems,
    selectedSubsystemId,
    setSelectedSubsystemId,
    settingsOpen,
    shortcutsOpen,
    showToast,
    t,
    undo,
  ]);

  useEffect(() => {
    if (!focusRequest) return;
    if (focusRequest.tab === "project") {
      setSettingsOpen(true);
    }
    const targetPath = focusRequest.path;
    if (!targetPath) return;

    const timer = setTimeout(() => {
      const container = document.querySelector<HTMLElement>(
        `[data-field="${CSS.escape(targetPath)}"]`,
      );
      if (!container) return;
      container.scrollIntoView({ behavior: "smooth", block: "center" });
      const control = container.querySelector<HTMLElement>("input, select, button, textarea");
      control?.focus({ preventScroll: true });
      highlightField(targetPath);
    }, 90);

    return () => clearTimeout(timer);
  }, [focusRequest, highlightField]);

  const totalFsmStates = project.subsystems.reduce(
    (sum, s) => sum + (s.fsm?.states.length ?? 0),
    0,
  );
  const totalBindings =
    project.controls.pilotPriority.length + project.controls.copilotOverrides.length;

  const handleLoadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseProjectWithMigration(JSON.parse(text));
      if (!parsed.ok) throw new Error("Invalid schema");
      loadProject(parsed.data);
      showToast(t("toast.loaded"));
    } catch {
      showToast(t("toast.load_error"), "err");
    } finally {
      e.target.value = "";
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
      id: "arena",
      tab: "arena",
      label: "Arena",
      icon: <MapIcon className="h-4 w-4 shrink-0" />,
      badge: String(project.zones?.length ?? 0),
      shortcut: "Alt+3",
    },
    {
      id: "controls",
      tab: "controls",
      label: "Controles",
      icon: <Gamepad2 className="h-4 w-4 shrink-0" />,
      badge: String(totalBindings),
      shortcut: "Alt+4",
    },
    {
      id: "export",
      tab: "code",
      label: "Exportar",
      icon: <Package className="h-4 w-4 shrink-0" />,
      badge: errorCount === 0 ? "OK" : `${errorCount}!`,
      badgeVariant: errorCount === 0 ? "success" : "destructive",
      shortcut: "Alt+5",
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
          const active = activeRoute === "studio" && currentStep === item.id;
          const btn = (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                navigateToTab(item.tab);
                if (isMobile) setMobileMenuOpen(false);
              }}
              className={cn(
                "relative flex w-full items-center rounded-lg text-[13px] font-medium transition-all duration-150 active:scale-[0.98] cursor-pointer",
                collapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5",
                active
                  ? "bg-[#142c4f] border border-[#3b6bb5] text-white shadow-sm"
                  : "border border-transparent text-slate-300 hover:bg-[#19253d] hover:text-white",
              )}
            >
              {active && !collapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-[#60a5fa]" />
              )}
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

        <Tooltip.Root open={collapsed ? undefined : false}>
          <Tooltip.Trigger asChild>
            <Link
              href="/credits"
              onClick={() => {
                if (isMobile) setMobileMenuOpen(false);
              }}
              className={cn(
                "relative flex w-full items-center rounded-lg text-[13px] font-medium transition-all",
                collapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2.5",
                activeRoute === "credits"
                  ? "bg-[#142c4f] border border-[#3b6bb5] text-white shadow-sm"
                  : "border border-transparent text-slate-300 hover:bg-[#19253d] hover:text-white",
              )}
            >
              {activeRoute === "credits" && !collapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-[#60a5fa]" />
              )}
              <Award className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{t("nav.credits")}</span>}
            </Link>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              side="right"
              sideOffset={8}
              className="z-50 rounded-md border border-[#3b6bb5] bg-[#131c2e] px-2.5 py-1.5 text-xs text-white shadow-xl"
            >
              {t("nav.credits")}
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
          "hidden md:flex shrink-0 flex-col border-r border-[#22304a] transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          sidebarCollapsed ? "w-[72px]" : "w-64",
        )}
      >
        {renderSidebarBody(sidebarCollapsed)}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex md:hidden bg-[#0b0f17]/80 backdrop-blur-xs animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside
            className="w-68 h-full border-r border-[#22304a] animate-slide-in-left"
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
                {activeRoute === "credits" ? t("nav.credits") : activeNav.label}
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
                    onSelect={() => {
                      resetToSkeleton();
                      showToast(t("header.preset_skeleton"), "ok", true);
                    }}
                    className="flex items-center justify-between px-3 py-2 text-slate-200 outline-none hover:bg-[#19253d] cursor-pointer"
                  >
                    <span>{t("header.preset_skeleton")}</span>
                    <span className="font-mono text-[10px] text-[#93c5fd]">Roller</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={() => {
                      resetToCompetition();
                      showToast("Competition", "ok", true);
                    }}
                    className="flex items-center justify-between px-3 py-2 text-slate-200 outline-none hover:bg-[#19253d] cursor-pointer"
                  >
                    <span>Competition</span>
                    <span className="font-mono text-[10px] text-emerald-400">Shooter · Hood</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={() => {
                      resetToBlank();
                      showToast(t("header.preset_blank"), "ok", true);
                    }}
                    className="flex items-center justify-between px-3 py-2 text-slate-200 outline-none hover:bg-[#19253d] cursor-pointer"
                  >
                    <span>{t("header.preset_blank")}</span>
                    <span className="font-mono text-[10px] text-slate-400">Vazio</span>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* Health Checklist Popover */}
            <Popover.Root open={checklistOpen} onOpenChange={setChecklistOpen}>
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
                              setChecklistOpen(false);
                              focusIssue(issue);
                              if (activeRoute !== "studio" && issue.tab !== "project") {
                                router.push("/studio");
                              }
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

            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setShortcutsOpen(true)}
                  aria-label={t("shortcuts.title")}
                >
                  <Keyboard className="h-4 w-4" />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  sideOffset={6}
                  className="z-50 rounded border border-[#3b6bb5] bg-[#131c2e] px-2.5 py-1 font-mono text-xs text-slate-100"
                >
                  {t("shortcuts.button")}
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

            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                {bridgeStatus.robotConnected ? (
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={errorCount > 0}
                    onClick={() => {
                      navigateToTab("code");
                      setBridgeDeploySignal((n) => n + 1);
                    }}
                    className="ml-1 bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/70"
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-200 animate-pulse shrink-0" />
                    <Rocket className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{t("header.deploy_code")}</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigateToTab("code");
                      setBridgeOpenSignal((n) => n + 1);
                    }}
                    className="ml-1 border-[#2c3f61] bg-[#0f1624] text-slate-300 hover:border-[#3b6bb5] hover:text-white"
                  >
                    <span className="h-2 w-2 rounded-full bg-rose-400/90 shrink-0" />
                    <WifiOff className="h-3.5 w-3.5 text-slate-400" />
                    <span className="hidden sm:inline">{t("header.robot_disconnected")}</span>
                  </Button>
                )}
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  sideOffset={6}
                  className="z-50 rounded border border-[#3b6bb5] bg-[#131c2e] px-2.5 py-1 text-xs text-slate-100 shadow-lg"
                >
                  {bridgeStatus.robotConnected
                    ? `roboRIO: ${bridgeStatus.address} (${bridgeStatus.mode})`
                    : t("header.robot_disconnected_hint")}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </div>
        </header>

        {/* Scrollable Workspace Content */}
        <main className="flex-1 overflow-y-auto overflow-x-clip bg-[#0b0f17] p-6 lg:p-8">
          <div
            key={activeRoute === "credits" ? "credits" : currentStep}
            className="mx-auto max-w-[1440px] space-y-6 animate-page-enter"
          >
            {activeRoute === "credits" && children ? (
              children
            ) : (
              <>
                {currentStep === "robot" && (
                  <RobotFlowView
                    onGoToStates={() => setActiveTab("fsm")}
                    onGoToControls={() => setActiveTab("controls")}
                    onRequestDeleteSubsystem={(sub) => setPendingDeleteSub(sub)}
                    onDuplicateSubsystem={handleDuplicateSubsystem}
                  />
                )}
                {currentStep === "states" && (
                  <StatesView
                    initialTarget={activeTab === "superstructure" ? "superstructure" : "subsystem"}
                  />
                )}
                {currentStep === "arena" && <ArenaTab />}
                {currentStep === "controls" && <ControlsTab />}
                {currentStep === "export" && (
                  <CodeTab
                    onDownloadZip={handleDownloadZip}
                    exporting={exporting}
                    openBridgeSignal={bridgeOpenSignal}
                    deploySignal={bridgeDeploySignal}
                  />
                )}
              </>
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

      <Dialog.Root
        open={pendingDeleteSub !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteSub(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-[#0b0f17]/80 backdrop-blur-xs animate-fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-[360px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-[#2c3f61] bg-[#0f1624] shadow-2xl">
            <div className="h-1 w-full bg-rose-500/90" />
            <div className="p-5 space-y-4">
              <div className="flex flex-col items-center text-center space-y-2.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-rose-500/40 bg-rose-500/15 text-rose-400">
                  <Trash2 className="h-5 w-5" />
                </div>
                <Dialog.Title className="font-headline text-base font-semibold text-white">
                  {t("confirm.delete_sub_title")}
                </Dialog.Title>
                {pendingDeleteSub && (
                  <div className="inline-flex flex-wrap items-center justify-center gap-1.5 rounded-lg border border-[#22304a] bg-[#131c2e] px-3 py-1.5 font-mono text-xs">
                    <span className="font-semibold text-white">{pendingDeleteSub.name}</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-[#93c5fd]">
                      {pendingDeleteSub.leds
                        ? pendingDeleteSub.leds.driver === "candle"
                          ? `CAN ${pendingDeleteSub.leds.canId ?? 30}`
                          : `PWM ${pendingDeleteSub.leds.pwmPort ?? 0}`
                        : `CAN ${pendingDeleteSub.motor?.canId ?? 0}`}
                    </span>
                    <span className="text-slate-500">·</span>
                    <span className="capitalize text-slate-300">{pendingDeleteSub.type}</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-400">
                      {pendingDeleteSub.leds
                        ? pendingDeleteSub.leds.driver
                        : pendingDeleteSub.motor?.vendor === "talonfx"
                          ? "TalonFX"
                          : pendingDeleteSub.motor?.vendor === "sparkmax"
                            ? "SparkMax"
                            : "TalonSRX"}
                    </span>
                  </div>
                )}
                <Dialog.Description className="text-xs leading-relaxed text-slate-300">
                  {t("confirm.delete_sub_desc")}
                </Dialog.Description>
                <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <kbd className="rounded border border-[#2c3f61] bg-[#131c2e] px-1.5 py-0.5 font-mono text-[10px] text-[#93c5fd]">
                    Ctrl+Z
                  </kbd>
                  <span>{t("confirm.undo_hint")}</span>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  autoFocus
                  className="w-full justify-between px-3"
                  onClick={() => setPendingDeleteSub(null)}
                >
                  <span>{t("confirm.cancel")}</span>
                  <kbd className="rounded border border-[#253552] bg-[#0b0f17] px-1 py-0.5 font-mono text-[10px] text-slate-400">
                    Esc
                  </kbd>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    if (!pendingDeleteSub) return;
                    removeSubsystem(pendingDeleteSub.id);
                    setPendingDeleteSub(null);
                    showToast(t("toast.deleted"), "ok", true);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t("confirm.delete")}
                </Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-[#0b0f17]/80 backdrop-blur-xs animate-fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#2c3f61] bg-[#0f1624] p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-[#22304a] pb-3">
              <div>
                <Dialog.Title className="font-headline text-base font-semibold text-white">
                  {t("shortcuts.title")}
                </Dialog.Title>
                <Dialog.Description className="mt-0.5 text-xs text-slate-400">
                  {t("shortcuts.desc")}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded p-1 text-slate-400 hover:bg-[#19253d] hover:text-white cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>
            <ul className="space-y-2">
              {SHORTCUT_GUIDE.map((item) => (
                <li
                  key={item.labelKey}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[#22304a] bg-[#131c2e] px-3 py-2 text-xs"
                >
                  <span className="text-slate-200">{t(item.labelKey)}</span>
                  <span className="flex items-center gap-1 shrink-0">
                    {item.keys.map((k) => (
                      <kbd
                        key={k}
                        className="rounded border border-[#3b6bb5]/60 bg-[#0b0f17] px-1.5 py-0.5 font-mono text-[11px] text-[#93c5fd]"
                      >
                        {k}
                      </kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {toastMsg && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border px-4 py-2.5 text-[13px] shadow-2xl animate-toast-in",
            toastMsg.tone === "ok"
              ? "border-[#3b6bb5] bg-[#131c2e] text-white"
              : "border-rose-700/70 bg-rose-950/90 text-rose-200",
          )}
        >
          <span>{toastMsg.text}</span>
          {toastMsg.canUndoAction && canUndo && (
            <button
              type="button"
              onClick={() => {
                undo();
                setToastMsg(null);
              }}
              className="rounded border border-[#3b6bb5] bg-[#142c4f] px-2 py-0.5 font-mono text-xs font-semibold text-[#93c5fd] hover:bg-[#1d3f70] hover:text-white cursor-pointer"
            >
              {t("toast.undo_action")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
