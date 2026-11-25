"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useHistoryState } from "@/hooks/useHistoryState";
import {
  applyRenameSubsystemRequest,
  applyRenameSubsystemState,
} from "@/lib/fsm-operations";
import { generateProjectFiles } from "@/lib/generator";
import type { GeneratedFile } from "@/lib/generator/subsystems/roller";
import { translate, type Locale, type TranslationKey } from "@/lib/i18n";
import {
  addSubsystemWithDefaults,
  createBlankPreset,
  createCompetitionPreset,
  createSkeletonPreset,
} from "@/lib/presets/skeleton";
import {
  CiprixProjectSchema,
  type CiprixProject,
  type SubsystemConfig,
  type SubsystemType,
} from "@/lib/schema/ciprix-project";
import { validateProject, type StudioTab, type ValidationIssue } from "@/lib/validator";

const STORAGE_KEY = "firstStudio_ciprixProject_v1";

export interface FocusFieldRequest {
  path?: string;
  tab: StudioTab;
  targetId?: string;
  advanced?: boolean;
  stateName?: string;
  seq: number;
}

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
  focusRequest: FocusFieldRequest | null;
  highlightedFieldPath: string | null;
  focusIssue: (issue: ValidationIssue) => void;
  highlightField: (path: string) => void;
  updateProject: (updater: (prev: CiprixProject) => CiprixProject) => void;
  loadProject: (next: CiprixProject) => void;
  resetToSkeleton: () => void;
  resetToBlank: () => void;
  resetToCompetition: () => void;
  addSubsystem: (type: SubsystemType) => void;
  removeSubsystem: (id: string) => void;
  reorderSubsystems: (orderedIds: string[]) => void;
  updateSubsystem: (id: string, updater: (prev: SubsystemConfig) => SubsystemConfig) => void;
  renameSubsystemState: (subsystemId: string, oldName: string, nextName: string) => void;
  renameSubsystemRequest: (subsystemId: string, oldReq: string, nextReq: string) => void;
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
  const [focusRequest, setFocusRequest] = useState<FocusFieldRequest | null>(null);
  const [highlightedFieldPath, setHighlightedFieldPath] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const resetToCompetition = useCallback(() => {
    const preset = createCompetitionPreset();
    set(preset);
    setSelectedSubsystemId(preset.subsystems[0]?.id ?? null);
  }, [set]);

  const addSubsystem = useCallback(
    (type: SubsystemType) => {
      let createdId = "";
      set((prev) => {
        const res = addSubsystemWithDefaults(prev, type);
        createdId = res.createdId;
        return res.project;
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
        subsystems: prev.subsystems.map((s) => {
          if (s.id !== id) return s;
          const updated = updater(s);
          return updated.isDefaultTemplate
            ? { ...updated, isDefaultTemplate: false }
            : updated;
        }),
      }));
    },
    [set],
  );

  const renameSubsystemState = useCallback(
    (subsystemId: string, oldName: string, nextName: string) => {
      set((prev) => applyRenameSubsystemState(prev, subsystemId, oldName, nextName));
    },
    [set],
  );

  const renameSubsystemRequest = useCallback(
    (subsystemId: string, oldReq: string, nextReq: string) => {
      set((prev) => applyRenameSubsystemRequest(prev, subsystemId, oldReq, nextReq));
    },
    [set],
  );

  const highlightField = useCallback((path: string) => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setHighlightedFieldPath(path);
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedFieldPath(null);
    }, 2000);
  }, []);

  const focusIssue = useCallback((issue: ValidationIssue) => {
    setActiveTab(issue.tab);
    if (issue.targetId) setSelectedSubsystemId(issue.targetId);
    setFocusRequest({
      path: issue.path,
      tab: issue.tab,
      targetId: issue.targetId,
      advanced: issue.advanced,
      stateName: issue.stateName,
      seq: Date.now(),
    });
  }, []);

  const t = useCallback((key: TranslationKey) => translate(locale, key), [locale]);
  const issues = useMemo(() => validateProject(project, locale), [project, locale]);
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
    focusRequest,
    highlightedFieldPath,
    focusIssue,
    highlightField,
    updateProject,
    loadProject,
    resetToSkeleton,
    resetToBlank,
    resetToCompetition,
    addSubsystem,
    removeSubsystem,
    reorderSubsystems,
    updateSubsystem,
    renameSubsystemState,
    renameSubsystemRequest,
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
