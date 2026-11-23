"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Code2,
  Cpu,
  Download,
  FileCode2,
  FolderOpen,
  Gamepad2,
  GitBranch,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings2,
  Undo2,
} from "lucide-react";
import { useProject } from "@/context/project-context";

interface PaletteItem {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
}

export function CommandPalette({
  open,
  onClose,
  onSaveJson,
  onLoadJson,
  onDownloadZip,
  onOpenProjectSettings,
}: {
  open: boolean;
  onClose: () => void;
  onSaveJson: () => void;
  onLoadJson: () => void;
  onDownloadZip: () => void;
  onOpenProjectSettings: () => void;
}) {
  const {
    project,
    generatedFiles,
    locale,
    setLocale,
    setActiveTab,
    setSelectedSubsystemId,
    setSelectedFilePath,
    addSubsystem,
    resetToSkeleton,
    undo,
    redo,
    t,
  } = useProject();

  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const items = useMemo<PaletteItem[]>(() => {
    const list: PaletteItem[] = [
      {
        id: "nav-robot",
        group: "Etapas",
        label: t("step.robot"),
        hint: "1",
        icon: <Cpu className="h-3.5 w-3.5" />,
        run: () => setActiveTab("subsystems"),
      },
      {
        id: "nav-states",
        group: "Etapas",
        label: t("step.states"),
        hint: "2",
        icon: <GitBranch className="h-3.5 w-3.5" />,
        run: () => setActiveTab("fsm"),
      },
      {
        id: "nav-controls",
        group: "Etapas",
        label: t("step.controls"),
        hint: "3",
        icon: <Gamepad2 className="h-3.5 w-3.5" />,
        run: () => setActiveTab("controls"),
      },
      {
        id: "nav-export",
        group: "Etapas",
        label: t("step.export"),
        hint: "4",
        icon: <Code2 className="h-3.5 w-3.5" />,
        run: () => setActiveTab("code"),
      },
      {
        id: "nav-project",
        group: "Etapas",
        label: t("tabs.project"),
        icon: <Settings2 className="h-3.5 w-3.5" />,
        run: onOpenProjectSettings,
      },
    ];

    for (const sub of project.subsystems) {
      list.push({
        id: `sub-hw-${sub.id}`,
        group: t("nav.subsystems"),
        label: `${sub.name} — Hardware`,
        hint: `CAN ${sub.motor.canId}`,
        icon: <Cpu className="h-3.5 w-3.5" />,
        run: () => {
          setSelectedSubsystemId(sub.id);
          setActiveTab("subsystems");
        },
      });
      list.push({
        id: `sub-fsm-${sub.id}`,
        group: t("nav.subsystems"),
        label: `${sub.name} — FSM`,
        hint: `${sub.fsm.states.length} states`,
        icon: <GitBranch className="h-3.5 w-3.5" />,
        run: () => {
          setSelectedSubsystemId(sub.id);
          setActiveTab("fsm");
        },
      });
    }

    for (const file of generatedFiles) {
      const short = file.path.split("/").pop() ?? file.path;
      list.push({
        id: `file-${file.path}`,
        group: t("nav.files"),
        label: short,
        hint: file.path,
        icon: <FileCode2 className="h-3.5 w-3.5" />,
        run: () => {
          setSelectedFilePath(file.path);
          setActiveTab("code");
        },
      });
    }

    list.push(
      {
        id: "act-add-roller",
        group: "Ações",
        label: `+ ${t("subsystems.roller")}`,
        icon: <Plus className="h-3.5 w-3.5" />,
        run: () => {
          addSubsystem("roller");
          setActiveTab("subsystems");
        },
      },
      {
        id: "act-zip",
        group: "Ações",
        label: t("header.download_zip"),
        icon: <Download className="h-3.5 w-3.5" />,
        run: onDownloadZip,
      },
      {
        id: "act-save",
        group: "Ações",
        label: t("header.save_json"),
        icon: <Save className="h-3.5 w-3.5" />,
        run: onSaveJson,
      },
      {
        id: "act-load",
        group: "Ações",
        label: t("header.load_json"),
        icon: <FolderOpen className="h-3.5 w-3.5" />,
        run: onLoadJson,
      },
      {
        id: "act-reset",
        group: "Ações",
        label: t("header.preset_skeleton"),
        icon: <RotateCcw className="h-3.5 w-3.5" />,
        run: resetToSkeleton,
      },
      {
        id: "act-undo",
        group: "Ações",
        label: t("header.undo"),
        hint: "Ctrl+Z",
        icon: <Undo2 className="h-3.5 w-3.5" />,
        run: undo,
      },
      {
        id: "act-redo",
        group: "Ações",
        label: t("header.redo"),
        hint: "Ctrl+Y",
        icon: <Undo2 className="h-3.5 w-3.5" />,
        run: redo,
      },
      {
        id: "act-lang",
        group: "Ações",
        label: `Idioma / Language (${locale === "pt" ? "EN" : "PT"})`,
        icon: <Settings2 className="h-3.5 w-3.5" />,
        run: () => setLocale(locale === "pt" ? "en" : "pt"),
      },
    );

    return list;
  }, [
    project.subsystems,
    generatedFiles,
    locale,
    t,
    setActiveTab,
    setSelectedSubsystemId,
    setSelectedFilePath,
    addSubsystem,
    resetToSkeleton,
    undo,
    redo,
    setLocale,
    onSaveJson,
    onLoadJson,
    onDownloadZip,
    onOpenProjectSettings,
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 14);
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q) ||
        (item.hint?.toLowerCase().includes(q) ?? false),
    );
  }, [items, query]);

  if (!open) return null;

  const activeIdx = Math.min(cursor, Math.max(0, filtered.length - 1));

  const execute = (item: PaletteItem | undefined) => {
    if (!item) return;
    item.run();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 pt-[12vh] px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-lg border border-[#264f8a] bg-[#060910] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onClose();
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setCursor((c) => Math.min(filtered.length - 1, c + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setCursor((c) => Math.max(0, c - 1));
          } else if (e.key === "Enter") {
            e.preventDefault();
            execute(filtered[activeIdx]);
          }
        }}
      >
        <div className="flex items-center gap-2 border-b border-[#171c26] px-3 py-2.5">
          <Search className="h-3.5 w-3.5 text-[#6b7689]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            placeholder={t("cmd.placeholder")}
            className="w-full bg-transparent text-xs text-slate-100 placeholder:text-[#556072] focus:outline-none"
          />
          <span className="rounded border border-[#1d2432] px-1.5 py-0.5 font-mono text-[10px] text-[#6b7689]">
            ESC
          </span>
        </div>

        <div className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-[#6b7689]">{t("cmd.no_results")}</p>
          ) : (
            filtered.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onMouseEnter={() => setCursor(idx)}
                onClick={() => execute(item)}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                  idx === activeIdx
                    ? "bg-[#142c4f]/70 text-white"
                    : "text-slate-300 hover:bg-[#0c121e]"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[#7c8ba1] shrink-0">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                  <span className="text-[10px] text-[#556072] shrink-0">{item.group}</span>
                </div>
                {item.hint && (
                  <span className="truncate max-w-[180px] font-mono text-[10px] text-[#7c8ba1]">
                    {item.hint}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
