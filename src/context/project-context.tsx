"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useHistoryState } from "@/hooks/useHistoryState";
import { generateProjectFiles } from "@/lib/generator";
import type { GeneratedFile } from "@/lib/generator/subsystems/roller";
import { translate, type Locale, type TranslationKey } from "@/lib/i18n";
import { createBlankPreset, createNewSubsystem, createSkeletonPreset } from "@/lib/presets/skeleton";
import {
  CiprixProjectSchema,
  type CiprixProject,
  type SubsystemConfig,
} from "@/lib/schema/ciprix-project";
import { validateProject, type StudioTab, type ValidationIssue } from "@/lib/validator";

const STORAGE_KEY = "firstStudio_ciprixProject_v1";

interface ProjectContextValue {
  project: CiprixProject;
  hasSavedProject: boolean;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
  activeTab: StudioTab;
  setActiveTab: (tab: StudioTab) => void;
  selectedSubsystemId: string | null;
  setSelectedSubsystemId: (id: string | null) => void;
  selectedFilePath: string | null;
  setSelectedFilePath: (path: string | null) => void;
  issues: ValidationIssue[];
  generatedFiles: GeneratedFile[];
  updateProject: (updater: (prev: CiprixProject) => CiprixProject) => void;
  loadProject: (next: CiprixProject) => void;
  resetToSkeleton: () => void;
  resetToBlank: () => void;
  addSubsystem: (type: "roller" | "generic") => void;
  removeSubsystem: (id: string) => void;
  reorderSubsystems: (orderedIds: string[]) => void;
  updateSubsystem: (id: string, updater: (prev: SubsystemConfig) => SubsystemConfig) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const initialPreset = useMemo(() => createSkeletonPreset(), []);
  const { state: project, set, undo, redo, canUndo, canRedo } =
    useHistoryState<CiprixProject>(initialPreset);

  const [hydrated, setHydrated] = useState(false);
  const [hasSavedProject, setHasSavedProject] = useState(false);
  const [locale, setLocale] = useState<Locale>("pt");
  const [activeTab, setActiveTab] = useState<StudioTab>("subsystems");
  const [selectedSubsystemId, setSelectedSubsystemId] = useState<string | null>(
    initialPreset.subsystems[0]?.id ?? null,
  );
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = CiprixProjectSchema.safeParse(JSON.parse(raw));
        if (parsed.success) {
          set(parsed.data, true);
          setSelectedSubsystemId(parsed.data.subsystems[0]?.id ?? null);
          setHasSavedProject(true);
        }
      }
    } catch {
      // Fallback safely to skeleton preset
    }
    setHydrated(true);
  }, [set]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch {
      // Ignore storage quota errors
    }
  }, [project, hydrated]);

  const updateProject = useCallback(
    (updater: (prev: CiprixProject) => CiprixProject) => {
      set(updater);
    },
    [set],
  );

  const loadProject = useCallback(
    (next: CiprixProject) => {
      set(next);
      setSelectedSubsystemId(next.subsystems[0]?.id ?? null);
      setHasSavedProject(true);
    },
    [set],
  );

  const resetToSkeleton = useCallback(() => {
    const preset = createSkeletonPreset();
    set(preset);
    setSelectedSubsystemId(preset.subsystems[0]?.id ?? null);
  }, [set]);

  const resetToBlank = useCallback(() => {
    const preset = createBlankPreset();
    set(preset);
    setSelectedSubsystemId(null);
  }, [set]);

  const addSubsystem = useCallback(
    (type: "roller" | "generic") => {
      let createdId = "";
      set((prev) => {
        const created = createNewSubsystem(type, prev.subsystems);
        createdId = created.id;
        const nextActions = { ...prev.superstructure.stateActions };
        for (const stateName of prev.superstructure.states) {
          nextActions[stateName] = {
            ...(nextActions[stateName] ?? {}),
            [created.id]: created.fsm.initialRequest,
          };
        }
        return {
          ...prev,
          subsystems: [...prev.subsystems, created],
          superstructure: {
            ...prev.superstructure,
            stateActions: nextActions,
          },
        };
      });
      if (createdId) setSelectedSubsystemId(createdId);
    },
    [set],
  );

  const removeSubsystem = useCallback(
    (id: string) => {
      set((prev) => {
        const nextSubsystems = prev.subsystems.filter((s) => s.id !== id);
        const nextActions: Record<string, Record<string, string>> = {};
        for (const [stateName, map] of Object.entries(prev.superstructure.stateActions)) {
          const rest = { ...map };
          delete rest[id];
          nextActions[stateName] = rest;
        }
        return {
          ...prev,
          subsystems: nextSubsystems,
          superstructure: {
            ...prev.superstructure,
            stateActions: nextActions,
          },
          controls: {
            ...prev.controls,
            copilotOverrides: prev.controls.copilotOverrides.filter(
              (ov) => ov.subsystemId !== id,
            ),
          },
        };
      });
      setSelectedSubsystemId((curr) => (curr === id ? null : curr));
    },
    [set],
  );

  const reorderSubsystems = useCallback(
    (orderedIds: string[]) => {
      set((prev) => {
        const byId = new Map(prev.subsystems.map((s) => [s.id, s]));
        const reordered = orderedIds
          .map((id) => byId.get(id))
          .filter((s): s is SubsystemConfig => Boolean(s));
        return { ...prev, subsystems: reordered };
      });
    },
    [set],
  );

  const updateSubsystem = useCallback(
    (id: string, updater: (prev: SubsystemConfig) => SubsystemConfig) => {
      set((prev) => ({
        ...prev,
        subsystems: prev.subsystems.map((s) => (s.id === id ? updater(s) : s)),
      }));
    },
    [set],
  );

  const t = useCallback((key: TranslationKey) => translate(locale, key), [locale]);
  const issues = useMemo(() => validateProject(project), [project]);
  const generatedFiles = useMemo(() => generateProjectFiles(project), [project]);

  const value: ProjectContextValue = {
    project,
    hasSavedProject,
    locale,
    setLocale,
    t,
    activeTab,
    setActiveTab,
    selectedSubsystemId,
    setSelectedSubsystemId,
    selectedFilePath,
    setSelectedFilePath,
    issues,
    generatedFiles,
    updateProject,
    loadProject,
    resetToSkeleton,
    resetToBlank,
    addSubsystem,
    removeSubsystem,
    reorderSubsystems,
    updateSubsystem,
    undo,
    redo,
    canUndo,
    canRedo,
  };

  return (
    <ProjectContext.Provider value={value}>
      {hydrated ? children : null}
    </ProjectContext.Provider>
  );
}

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used inside ProjectProvider");
  return ctx;
}
