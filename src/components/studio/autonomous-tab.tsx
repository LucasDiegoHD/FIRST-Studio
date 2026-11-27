"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  Flag,
  FolderSearch,
  Link2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Route,
  Sliders,
  Sparkles,
  Timer,
  Trash2,
  Upload,
  Wand2,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useProject } from "@/context/project-context";
import { clamp, getRebuilt2026Landmarks, round2 } from "@/lib/arena/rebuilt-2026";
import {
  appendWaypoint,
  buildRobotSimConfig,
  createDefaultPathDoc,
  degToRad,
  findClosestRelativePos,
  generatePathTrajectory,
  moveWaypointAnchor,
  moveWaypointControl,
  radToDeg,
  removeWaypoint,
  reversePathDoc,
  samplePathAtRelativePos,
  sampleTrajectoryAtTime,
  simulateAutoRoutine,
  velocityToHeatColor,
} from "@/lib/autonomous/pathplanner-engine";
import {
  parseFullPathPlannerAutoJson,
  parseFullPathPlannerPathJson,
  parsePathPlannerPathJson,
  stripAutoExtension,
} from "@/lib/autonomous/pathplanner-parser";
import { REBUILT_AUTO_TEMPLATES, type AutoTemplateDef } from "@/lib/autonomous/templates";
import {
  ensureReadWritePermission,
  loadDirectoryHandle,
  scanLocalAutoFiles,
} from "@/lib/local-folder";
import {
  createDefaultAutonomousConfig,
  type AutoNamedCommand,
  type AutonomousConfig,
  type AutoRoutine,
  type AutoRoutineSource,
  type AutoStep,
  type PathPlannerPathDoc,
  type PathPoint2d,
} from "@/lib/schema/ciprix-project";
import { CodeViewer } from "./code-viewer";
import { RebuiltFieldBackdrop } from "./rebuilt-field-svg";

type VisualizerView = "paths" | "routines" | "config";

type DragHandle =
  | { kind: "anchor"; index: number }
  | { kind: "prevControl"; index: number }
  | { kind: "nextControl"; index: number }
  | { kind: "rotTargetPos"; id: string }
  | { kind: "rotTargetHeading"; id: string }
  | { kind: "eventMarker"; id: string };

function collectCommandsFromSteps(steps: AutoStep[] | undefined): string[] {
  if (!steps) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of steps) {
    if (s.kind === "named") {
      const name = s.commandName.trim();
      if (name && !seen.has(name)) {
        seen.add(name);
        out.push(name);
      }
    }
  }
  return out;
}

interface TreeSectionProps {
  title: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}

function TreeSection({ title, count, open, onToggle, action, children }: TreeSectionProps) {
  return (
    <div className="rounded-xl border border-[#22304a] bg-[#0f1624] overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#131d31]/80 border-b border-[#22304a]/70">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-2 text-left text-xs font-semibold text-white cursor-pointer flex-1 min-w-0"
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          )}
          <span className="truncate">{title}</span>
          {count !== undefined && (
            <span className="rounded bg-[#0b111c] px-1.5 py-0.5 font-mono text-[10px] text-slate-300 border border-[#22304a]">
              {count}
            </span>
          )}
        </button>
        {action}
      </div>
      {open && <div className="p-3 space-y-2.5">{children}</div>}
    </div>
  );
}

export function AutonomousTab() {
  const { project, generatedFiles, issues, updateProject, setActiveTab, locale } = useProject();
  const fieldL = project.project.fieldLengthMeters;
  const fieldW = project.project.fieldWidthMeters;

  const [view, setView] = useState<VisualizerView>("paths");
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  // PathPlanner painter & editor toggles
  const [simAlliance, setSimAlliance] = useState<"Blue" | "Red">(
    project.project.defaultAlliance,
  );
  const [showVelocity, setShowVelocity] = useState(true);
  const [showModules, setShowModules] = useState(true);
  const [showRadius, setShowRadius] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [addPointMode, setAddPointMode] = useState(false);

  // Path tree accordion state
  const [openWpTree, setOpenWpTree] = useState(true);
  const [openRotTree, setOpenRotTree] = useState(true);
  const [openMarkerTree, setOpenMarkerTree] = useState(true);
  const [openLimitsTree, setOpenLimitsTree] = useState(false);

  // Selected items on canvas
  const [selectedWpIdx, setSelectedWpIdx] = useState<number>(0);
  const [selectedRotId, setSelectedRotId] = useState<string | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragHandle | null>(null);

  // Seekbar playback state
  const [simPlaying, setSimPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<0.5 | 1 | 2>(1);
  const [simTimeSec, setSimTimeSec] = useState(0);

  // Folder scan & file import state
  const [scanStatus, setScanStatus] = useState<{ text: string; tone: "ok" | "err" } | null>(null);
  const [scanning, setScanning] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const auto: AutonomousConfig = useMemo(
    () => project.autonomous ?? createDefaultAutonomousConfig(),
    [project.autonomous],
  );
  const paths = useMemo(() => auto.paths ?? [], [auto.paths]);
  const dtEnabled = Boolean(project.drivetrain?.enabled);
  const superRequests = project.superstructure.requests;
  const landmarks = useMemo(() => getRebuilt2026Landmarks(fieldL, fieldW), [fieldL, fieldW]);

  const activePath =
    paths.find((p) => p.id === selectedPathId) ?? paths[0] ?? null;

  const activeRoutine =
    auto.routines.find((r) => r.id === selectedRoutineId) ??
    auto.routines.find((r) => r.id === auto.defaultAutoId) ??
    auto.routines[0] ??
    null;

  const activeSteps = useMemo(() => activeRoutine?.steps ?? [], [activeRoutine]);

  // Simulate current PathPlanner path
  const activeSimConfig = useMemo(
    () => buildRobotSimConfig(project, activePath ?? undefined),
    [project, activePath],
  );
  const pathTrajectory = useMemo(
    () => (activePath ? generatePathTrajectory(activePath, activeSimConfig) : null),
    [activePath, activeSimConfig],
  );

  // Simulate current Multi-Path Auto Routine
  const autoSimulation = useMemo(
    () => simulateAutoRoutine(activeRoutine, paths, project, fieldL, fieldW),
    [activeRoutine, paths, project, fieldL, fieldW],
  );

  const activeTotalTimeSec =
    view === "paths"
      ? (pathTrajectory?.totalTimeSec ?? 0)
      : autoSimulation.totalTimeSec;

  const clampedSimTime =
    activeTotalTimeSec > 0 ? clamp(simTimeSec, 0, activeTotalTimeSec) : 0;

  // 60 FPS PreviewSeekbar animation loop
  useEffect(() => {
    if (!simPlaying || activeTotalTimeSec <= 0.05) return;
    let rafId = 0;
    let lastTs = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000)) * playbackSpeed;
      lastTs = now;
      setSimTimeSec((prev) => {
        const next = prev + dt;
        if (next >= activeTotalTimeSec) {
          return 0; // loop continuously like PathPlanner PreviewSeekbar.repeat()
        }
        return next;
      });
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [simPlaying, activeTotalTimeSec, playbackSpeed]);

  // Sample robot state at current seekbar time
  const sampledPathState = useMemo(() => {
    if (!pathTrajectory) return null;
    return sampleTrajectoryAtTime(pathTrajectory, clampedSimTime);
  }, [pathTrajectory, clampedSimTime]);

  const sampledAuto = useMemo(
    () => autoSimulation.sampleAt(clampedSimTime),
    [autoSimulation, clampedSimTime],
  );

  const currentRobotState = view === "paths" ? sampledPathState : sampledAuto.state;
  const activeMarkerCommand = useMemo(() => {
    if (view === "routines") return sampledAuto.activeCommand;
    if (!pathTrajectory || !sampledPathState) return null;
    const hit = pathTrajectory.markerEvents.find(
      (ev) => Math.abs(ev.timeSec - sampledPathState.timeSec) <= 0.35,
    );
    return hit?.commandName ?? null;
  }, [view, sampledAuto.activeCommand, pathTrajectory, sampledPathState]);

  const autoGeneratedFiles = useMemo(
    () =>
      generatedFiles.filter(
        (f) =>
          f.path.endsWith("/auto/AutonomousSetup.java") ||
          f.path === "src/main/deploy/pathplanner/settings.json" ||
          f.path.startsWith("src/main/deploy/pathplanner/autos/") ||
          f.path.startsWith("src/main/deploy/pathplanner/paths/"),
      ),
    [generatedFiles],
  );

  const activeViewerFile =
    autoGeneratedFiles.find((f) => f.path === selectedFilePath) ?? autoGeneratedFiles[0] ?? null;

  const mappedByName = useMemo(
    () => new Map(auto.namedCommands.map((c) => [c.name.trim(), c])),
    [auto.namedCommands],
  );

  const unmappedDiscovered = useMemo(() => {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const r of auto.routines) {
      for (const cmd of r.discoveredNamedCommands ?? []) {
        if (!mappedByName.has(cmd) && !seen.has(cmd)) {
          seen.add(cmd);
          out.push(cmd);
        }
      }
    }
    for (const p of paths) {
      for (const em of p.eventMarkers) {
        if (!mappedByName.has(em.commandName) && !seen.has(em.commandName)) {
          seen.add(em.commandName);
          out.push(em.commandName);
        }
      }
    }
    return out;
  }, [auto.routines, paths, mappedByName]);

  const tabIssues = useMemo(() => {
    const autoIssues = issues.filter((i) => i.tab === "autonomous");
    let routines = 0;
    let commands = 0;
    let pid = 0;
    for (const iss of autoIssues) {
      const p = iss.path ?? "";
      if (p.includes(".namedCommands.")) commands += 1;
      else if (p.includes(".routines.")) routines += 1;
      else pid += 1;
    }
    return { routines, commands, pid };
  }, [issues]);

  const patchAuto = useCallback(
    (updater: (prev: AutonomousConfig) => AutonomousConfig) => {
      updateProject((prev) => ({
        ...prev,
        autonomous: updater(prev.autonomous ?? createDefaultAutonomousConfig()),
      }));
    },
    [updateProject],
  );

  const updateActivePath = useCallback(
    (updater: (prev: PathPlannerPathDoc) => PathPlannerPathDoc) => {
      if (!activePath) return;
      patchAuto((prev) => ({
        ...prev,
        paths: (prev.paths ?? []).map((p) => (p.id === activePath.id ? updater(p) : p)),
      }));
    },
    [activePath, patchAuto],
  );

  const uniquePathName = useCallback(
    (base: string, existingPaths: PathPlannerPathDoc[]) => {
      const used = new Set(existingPaths.map((p) => p.name));
      if (!used.has(base)) return base;
      let idx = 2;
      while (used.has(`${base}_${idx}`)) idx += 1;
      return `${base}_${idx}`;
    },
    [],
  );

  const createNewPath = () => {
    const id = `path-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const name = uniquePathName(`Trajeto_${paths.length + 1}`, paths);
    const tpl = createDefaultPathDoc(name, fieldL, fieldW);
    const created: PathPlannerPathDoc = { ...tpl, id };
    patchAuto((prev) => ({
      ...prev,
      enabled: true,
      paths: [...(prev.paths ?? []), created],
    }));
    setSelectedPathId(id);
    setSelectedWpIdx(0);
    setSimTimeSec(0);
    setSimPlaying(false);
    setView("paths");
  };

  const duplicateActivePath = () => {
    if (!activePath) return;
    const id = `path-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const name = uniquePathName(`${activePath.name}_Copy`, paths);
    const copy: PathPlannerPathDoc = {
      ...JSON.parse(JSON.stringify(activePath)),
      id,
      name,
    };
    patchAuto((prev) => ({
      ...prev,
      paths: [...(prev.paths ?? []), copy],
    }));
    setSelectedPathId(id);
  };

  const deleteActivePath = () => {
    if (!activePath) return;
    const nextList = paths.filter((p) => p.id !== activePath.id);
    patchAuto((prev) => ({
      ...prev,
      paths: (prev.paths ?? []).filter((p) => p.id !== activePath.id),
    }));
    setSelectedPathId(nextList[0]?.id ?? null);
  };

  const addNamedCommand = (cmdName = "", targetReq?: string) => {
    const clean = cmdName.trim() || `Cmd_${auto.namedCommands.length + 1}`;
    if (cmdName.trim() && mappedByName.has(clean)) return;
    const nextCmd: AutoNamedCommand = {
      id: `nc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      name: clean,
      request: targetReq ?? superRequests[0] ?? "STOP",
      waitForGoal: false,
      timeoutSec: 3.0,
    };
    patchAuto((prev) => ({
      ...prev,
      enabled: true,
      namedCommands: [...prev.namedCommands, nextCmd],
    }));
  };

  const generateCommandsFromSuperStructure = () => {
    const existingReqs = new Set(auto.namedCommands.map((c) => c.request));
    const additions: AutoNamedCommand[] = [];
    for (const req of superRequests) {
      if (!existingReqs.has(req)) {
        additions.push({
          id: `nc-${req.toLowerCase()}-${Date.now().toString(36)}`,
          name: req,
          request: req,
          waitForGoal: false,
          timeoutSec: 2.5,
        });
      }
    }
    if (additions.length === 0) return;
    patchAuto((prev) => ({
      ...prev,
      enabled: true,
      namedCommands: [...prev.namedCommands, ...additions],
    }));
  };

  const applyTemplate = (tpl: AutoTemplateDef, switchTo?: VisualizerView) => {
    const built = tpl.build(fieldL, fieldW, superRequests);
    const id = `auto-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 4)}`;
    const usedNames = new Set(auto.routines.map((r) => r.fileName));
    let fileName = built.routine.fileName;
    if (usedNames.has(fileName)) {
      let n = 2;
      while (usedNames.has(`${fileName}_${n}`)) n += 1;
      fileName = `${fileName}_${n}`;
    }

    let firstAddedPathId: string | null = null;
    patchAuto((prev) => {
      const existingCmds = new Set(prev.namedCommands.map((c) => c.name.trim()));
      const newCmds: AutoNamedCommand[] = built.namedCommands
        .filter((nc) => !existingCmds.has(nc.name))
        .map((nc, idx) => ({
          ...nc,
          id: `nc-tpl-${Date.now().toString(36)}-${idx}`,
        }));

      const existingPathNames = new Set((prev.paths ?? []).map((p) => p.name));
      const addedPaths: PathPlannerPathDoc[] = built.paths
        .filter((bp) => !existingPathNames.has(bp.name))
        .map((bp, idx) => {
          const pid = `path-tpl-${Date.now().toString(36)}-${idx}`;
          if (!firstAddedPathId) firstAddedPathId = pid;
          return { ...bp, id: pid };
        });

      const nextRoutine: AutoRoutine = {
        ...built.routine,
        id,
        fileName,
        missingFile: false,
      };
      return {
        ...prev,
        enabled: true,
        paths: [...(prev.paths ?? []), ...addedPaths],
        routines: [...prev.routines, nextRoutine],
        defaultAutoId: prev.defaultAutoId ?? id,
        namedCommands: [...prev.namedCommands, ...newCmds],
      };
    });

    setSelectedRoutineId(id);
    if (firstAddedPathId) {
      setSelectedPathId(firstAddedPathId);
    } else if (built.paths[0]) {
      const match = paths.find((p) => p.name === built.paths[0].name);
      if (match) setSelectedPathId(match.id);
    }
    setSimTimeSec(0);
    setSimPlaying(true);
    if (switchTo) setView(switchTo);
  };

  const addRoutine = () => {
    const idx = auto.routines.length + 1;
    const id = `auto-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 4)}`;
    const fileName = `AutoRoutine_${idx}`;
    const refPath = activePath ?? paths[0];
    const nextRoutine: AutoRoutine = {
      id,
      name: fileName,
      fileName,
      source: "pathplanner",
      steps: refPath
        ? [
            {
              id: `step-${Date.now().toString(36)}`,
              kind: "path",
              pathName: refPath.name,
              durationSec: 2.2,
              startX: refPath.waypoints[0].anchor.x,
              startY: refPath.waypoints[0].anchor.y,
              endX: refPath.waypoints[refPath.waypoints.length - 1].anchor.x,
              endY: refPath.waypoints[refPath.waypoints.length - 1].anchor.y,
            },
          ]
        : [
            {
              id: `step-${Date.now().toString(36)}`,
              kind: "path",
              pathName: `Segment_${idx}`,
              durationSec: 2.2,
              startX: round2(landmarks.blueAllianceLineX - 0.5),
              startY: round2(fieldW * 0.5),
              endX: round2(landmarks.blueAllianceLineX + 1.8),
              endY: round2(fieldW * 0.5),
            },
          ],
      missingFile: false,
    };
    patchAuto((prev) => ({
      ...prev,
      enabled: true,
      routines: [...prev.routines, nextRoutine],
      defaultAutoId: prev.defaultAutoId ?? id,
    }));
    setSelectedRoutineId(id);
  };

  const updateRoutineSteps = (routineId: string, updater: (prev: AutoStep[]) => AutoStep[]) => {
    patchAuto((prev) => ({
      ...prev,
      routines: prev.routines.map((r) => {
        if (r.id !== routineId) return r;
        const nextSteps = updater(r.steps ?? []);
        return {
          ...r,
          steps: nextSteps,
          discoveredNamedCommands: collectCommandsFromSteps(nextSteps),
        };
      }),
    }));
  };

  const handleScanLocalFolder = async () => {
    setScanning(true);
    setScanStatus(null);
    try {
      const handle = await loadDirectoryHandle();
      if (!handle) {
        setScanStatus({
          tone: "err",
          text:
            locale === "pt"
              ? "Nenhuma pasta local conectada. Conecte em Exportar ou importe .path/.auto/.traj."
              : "No connected local folder. Connect one in Export or import .path/.auto/.traj.",
        });
        return;
      }
      const ok = await ensureReadWritePermission(handle, true);
      if (!ok) {
        setScanStatus({
          tone: "err",
          text: "Permissão negada para ler a pasta conectada.",
        });
        return;
      }

      const scanned = await scanLocalAutoFiles(handle);
      patchAuto((prev) => {
        const scannedAutoMap = new Map(scanned.autos.map((a) => [a.fileName, a.namedCommands]));
        const scannedChoreoSet = new Set(scanned.choreos.map((c) => c.fileName));

        const updatedExisting: AutoRoutine[] = prev.routines.map((r) => {
          const base = stripAutoExtension(r.fileName);
          if (r.source === "pathplanner") {
            const found = scannedAutoMap.get(base);
            if (found !== undefined) {
              return { ...r, missingFile: false, discoveredNamedCommands: found };
            }
            return { ...r, missingFile: true };
          }
          if (scannedChoreoSet.has(base)) {
            return { ...r, missingFile: false };
          }
          return { ...r, missingFile: true };
        });

        const existingKeys = new Set(
          updatedExisting.map((r) => `${r.source}:${stripAutoExtension(r.fileName)}`),
        );
        const addedRoutines: AutoRoutine[] = [];
        for (const a of scanned.autos) {
          if (!existingKeys.has(`pathplanner:${a.fileName}`)) {
            addedRoutines.push({
              id: `auto-${Date.now().toString(36)}-${addedRoutines.length}`,
              name: a.fileName,
              fileName: a.fileName,
              source: "pathplanner",
              discoveredNamedCommands: a.namedCommands,
              missingFile: false,
            });
          }
        }
        for (const c of scanned.choreos) {
          if (!existingKeys.has(`choreo:${c.fileName}`)) {
            addedRoutines.push({
              id: `choreo-${Date.now().toString(36)}-${addedRoutines.length}`,
              name: c.fileName,
              fileName: c.fileName,
              source: "choreo",
              missingFile: false,
            });
          }
        }

        const routines = [...updatedExisting, ...addedRoutines];
        return {
          ...prev,
          enabled: true,
          routines,
          defaultAutoId: prev.defaultAutoId ?? routines[0]?.id,
        };
      });

      setScanStatus({
        tone: "ok",
        text: `${scanned.autos.length} .auto + ${scanned.choreos.length} Choreo (${scanned.allNamedCommands.length} NamedCommands).`,
      });
    } catch {
      setScanStatus({ tone: "err", text: "Falha ao ler pasta pathplanner/choreo." });
    } finally {
      setScanning(false);
    }
  };

  const handleImportFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (fileList.length === 0) return;

    const pathCmds = new Map<string, string[]>();
    const importedPaths: PathPlannerPathDoc[] = [];
    const parsedAutos: {
      baseName: string;
      namedCommands: string[];
      pathNames: string[];
      steps: AutoStep[];
    }[] = [];
    const parsedChoreos: string[] = [];

    for (const file of fileList) {
      const lower = file.name.toLowerCase();
      const base = stripAutoExtension(file.name);
      if (lower.endsWith(".traj")) {
        parsedChoreos.push(base);
        continue;
      }
      const txt = await file.text();
      if (lower.endsWith(".path")) {
        pathCmds.set(base, parsePathPlannerPathJson(txt).namedCommands);
        const fullPath = parseFullPathPlannerPathJson(txt, base);
        if (fullPath) importedPaths.push(fullPath);
      } else if (lower.endsWith(".auto")) {
        parsedAutos.push({ baseName: base, ...parseFullPathPlannerAutoJson(txt) });
      }
    }

    patchAuto((prev) => {
      const existingRoutines = new Set(prev.routines.map((r) => `${r.source}:${r.fileName}`));
      const existingPaths = new Set((prev.paths ?? []).map((p) => p.name));
      const newPaths = importedPaths.filter((p) => !existingPaths.has(p.name));

      const additions: AutoRoutine[] = [];
      for (const a of parsedAutos) {
        const merged = new Set(a.namedCommands);
        for (const pName of a.pathNames) {
          for (const cmd of pathCmds.get(stripAutoExtension(pName)) ?? []) merged.add(cmd);
        }
        if (!existingRoutines.has(`pathplanner:${a.baseName}`)) {
          additions.push({
            id: `auto-${Date.now().toString(36)}-${additions.length}`,
            name: a.baseName,
            fileName: a.baseName,
            source: "pathplanner",
            steps: a.steps.length > 0 ? a.steps : undefined,
            discoveredNamedCommands: Array.from(merged),
            missingFile: false,
          });
        }
      }
      for (const cName of parsedChoreos) {
        if (!existingRoutines.has(`choreo:${cName}`)) {
          additions.push({
            id: `choreo-${Date.now().toString(36)}-${additions.length}`,
            name: cName,
            fileName: cName,
            source: "choreo",
            missingFile: false,
          });
        }
      }

      const routines = [...prev.routines, ...additions];
      return {
        ...prev,
        enabled: true,
        paths: [...(prev.paths ?? []), ...newPaths],
        routines,
        defaultAutoId: prev.defaultAutoId ?? routines[0]?.id,
      };
    });

    if (importedPaths[0]) {
      setSelectedPathId(importedPaths[0].id);
      setView("paths");
    }

    setScanStatus({
      tone: "ok",
      text: `Importado(s): ${importedPaths.length} .path · ${parsedAutos.length} .auto · ${parsedChoreos.length} .traj.`,
    });
  };

  // Field coordinate conversion & Alliance perspective helpers
  const dispPt = useCallback(
    (pt: PathPoint2d): PathPoint2d =>
      simAlliance === "Red" ? { x: fieldL - pt.x, y: fieldW - pt.y } : pt,
    [simAlliance, fieldL, fieldW],
  );

  const unflipPt = useCallback(
    (pt: PathPoint2d): PathPoint2d =>
      simAlliance === "Red" ? { x: fieldL - pt.x, y: fieldW - pt.y } : pt,
    [simAlliance, fieldL, fieldW],
  );

  const dispAngleRad = useCallback(
    (rad: number): number => (simAlliance === "Red" ? rad + Math.PI : rad),
    [simAlliance],
  );

  const toFieldPoint = useCallback(
    (clientX: number, clientY: number, allowSnap = true): PathPoint2d | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const local = pt.matrixTransform(ctm.inverse());
      const screenFieldX = clamp(local.x, 0.05, fieldL - 0.05);
      const screenFieldY = clamp(fieldW - local.y, 0.05, fieldW - 0.05);
      const bluePt = unflipPt({ x: screenFieldX, y: screenFieldY });
      const snap = (v: number) => (allowSnap && snapEnabled ? Math.round(v / 0.05) * 0.05 : v);
      return {
        x: round2(clamp(snap(bluePt.x), 0.1, fieldL - 0.1)),
        y: round2(clamp(snap(bluePt.y), 0.1, fieldW - 0.1)),
      };
    },
    [fieldL, fieldW, snapEnabled, unflipPt],
  );

  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (view !== "paths" || !activePath) return;
    if (addPointMode || e.shiftKey) {
      const p = toFieldPoint(e.clientX, e.clientY, true);
      if (!p) return;
      updateActivePath((prev) => ({
        ...prev,
        waypoints: appendWaypoint(prev.waypoints, p, fieldL, fieldW),
      }));
      setSelectedWpIdx(activePath.waypoints.length);
      if (addPointMode) setAddPointMode(false);
    }
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!drag || view !== "paths" || !activePath) return;
    const p = toFieldPoint(e.clientX, e.clientY, drag.kind === "anchor");
    if (!p) return;

    if (drag.kind === "anchor") {
      updateActivePath((prev) => ({
        ...prev,
        waypoints: moveWaypointAnchor(prev.waypoints, drag.index, p, fieldL, fieldW),
      }));
    } else if (drag.kind === "prevControl" || drag.kind === "nextControl") {
      const side = drag.kind === "prevControl" ? "prev" : "next";
      updateActivePath((prev) => ({
        ...prev,
        waypoints: moveWaypointControl(
          prev.waypoints,
          drag.index,
          side,
          p,
          fieldL,
          fieldW,
          e.altKey,
        ),
      }));
    } else if (drag.kind === "rotTargetPos") {
      const relPos = findClosestRelativePos(activePath.waypoints, p);
      updateActivePath((prev) => ({
        ...prev,
        rotationTargets: prev.rotationTargets.map((rt) =>
          rt.id === drag.id ? { ...rt, waypointRelativePos: relPos } : rt,
        ),
      }));
    } else if (drag.kind === "rotTargetHeading") {
      const target = activePath.rotationTargets.find((rt) => rt.id === drag.id);
      if (!target) return;
      const anchor = samplePathAtRelativePos(activePath.waypoints, target.waypointRelativePos);
      const deg = Math.round(radToDeg(Math.atan2(p.y - anchor.y, p.x - anchor.x)));
      updateActivePath((prev) => ({
        ...prev,
        rotationTargets: prev.rotationTargets.map((rt) =>
          rt.id === drag.id ? { ...rt, rotationDegrees: deg } : rt,
        ),
      }));
    } else if (drag.kind === "eventMarker") {
      const relPos = findClosestRelativePos(activePath.waypoints, p);
      updateActivePath((prev) => ({
        ...prev,
        eventMarkers: prev.eventMarkers.map((em) =>
          em.id === drag.id ? { ...em, waypointRelativePos: relPos } : em,
        ),
      }));
    }
  };

  const handleSvgMouseUp = () => {
    if (drag) setDrag(null);
  };

  const renderAnimatedRobot = () => {
    if (!currentRobotState) return null;
    const posePt = dispPt({ x: currentRobotState.x, y: currentRobotState.y });
    const poseThetaRad = dispAngleRad(currentRobotState.rotationRad);
    const rotDegSvg = (-poseThetaRad * 180) / Math.PI;
    const halfL = activeSimConfig.robotLength / 2;
    const halfW = activeSimConfig.robotWidth / 2;
    const modL = activeSimConfig.wheelBase / 2;
    const modW = activeSimConfig.trackWidth / 2;
    const modOffsets: PathPoint2d[] = [
      { x: modL, y: modW },
      { x: modL, y: -modW },
      { x: -modL, y: modW },
      { x: -modL, y: -modW },
    ];
    const allianceColor = simAlliance === "Blue" ? "#3b82f6" : "#ef4444";

    return (
      <g className="pointer-events-none">
        {activeMarkerCommand && (
          <g>
            <circle
              cx={posePt.x}
              cy={fieldW - posePt.y}
              r={Math.max(halfL, halfW) * 1.45}
              fill="#fbbf24"
              fillOpacity={0.14}
              stroke="#fbbf24"
              strokeWidth={0.04}
            />
            <rect
              x={clamp(posePt.x - 1.1, 0.1, fieldL - 2.3)}
              y={Math.max(0.1, fieldW - posePt.y - halfW - 0.62)}
              width={2.2}
              height={0.36}
              rx={0.08}
              fill="#0c192c"
              stroke="#fbbf24"
              strokeWidth={0.03}
            />
            <text
              x={clamp(posePt.x, 1.2, fieldL - 1.2)}
              y={Math.max(0.28, fieldW - posePt.y - halfW - 0.44)}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#fde68a"
              fontSize={0.175}
              fontFamily="monospace"
              fontWeight={700}
            >
              ⚡ {activeMarkerCommand}
            </text>
          </g>
        )}

        <g transform={`translate(${posePt.x}, ${fieldW - posePt.y}) rotate(${rotDegSvg})`}>
          {/* Bumper silhouette */}
          <rect
            x={-halfL}
            y={-halfW}
            width={activeSimConfig.robotLength}
            height={activeSimConfig.robotWidth}
            rx={0.08}
            fill="#0f172a"
            fillOpacity={0.92}
            stroke={allianceColor}
            strokeWidth={0.09}
          />
          {/* Inner chassis */}
          <rect
            x={-modL}
            y={-modW}
            width={activeSimConfig.wheelBase}
            height={activeSimConfig.trackWidth}
            rx={0.04}
            fill="#1e293b"
          />
          {/* Front direction chevron */}
          <polygon
            points={`${halfL - 0.08},0 ${halfL - 0.28},-0.12 ${halfL - 0.28},0.12`}
            fill="#f8fafc"
          />
          {/* Swerve module wheels when holonomic */}
          {showModules &&
            activeSimConfig.holonomic &&
            modOffsets.map((m, idx) => {
              const modFieldRad = currentRobotState.moduleAnglesRad[idx] ?? currentRobotState.rotationRad;
              const localModDeg = (-(modFieldRad - currentRobotState.rotationRad) * 180) / Math.PI;
              return (
                <g key={idx} transform={`translate(${m.x}, ${-m.y}) rotate(${localModDeg})`}>
                  <rect
                    x={-0.085}
                    y={-0.04}
                    width={0.17}
                    height={0.08}
                    rx={0.02}
                    fill="#38bdf8"
                    stroke="#0284c7"
                    strokeWidth={0.015}
                  />
                </g>
              );
            })}
          <text
            x={-0.05}
            y={0}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#e2e8f0"
            fontSize={0.16}
            fontFamily="monospace"
            fontWeight={700}
          >
            #{project.project.teamNumber}
          </text>
        </g>
      </g>
    );
  };

  const modeSwitcher = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-lg border border-[#22304a] bg-[#0f1624] p-1">
        {(
          [
            { id: "paths", label: locale === "pt" ? "Trajetos (.path)" : "Paths (.path)" },
            { id: "routines", label: locale === "pt" ? "Rotinas (.auto)" : "Autos (.auto)" },
            { id: "config", label: locale === "pt" ? "Config & Código" : "Config & Code" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setView(tab.id);
              setSimPlaying(false);
              setSimTimeSec(0);
              setDrag(null);
            }}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium cursor-pointer transition-all ${
              view === tab.id
                ? "bg-[#142c4f] border border-[#60a5fa]/70 text-white shadow-sm"
                : "border border-transparent text-slate-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Button
        size="sm"
        variant={auto.enabled ? "primary" : "outline"}
        className="h-8 px-3 text-xs"
        onClick={() => patchAuto((prev) => ({ ...prev, enabled: !prev.enabled }))}
      >
        <Route className="h-3.5 w-3.5" />
        {auto.enabled ? "Autônomos Ativos" : "Ativar Autônomos"}
      </Button>
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Autônomos · PathPlanner Visualizer"
        description={
          locale === "pt"
            ? "Editor visual estilo PathPlanner: desenhe curvas Bézier, veja velocidade e módulos swerve, posicione eventos e simule os 15s da partida."
            : "PathPlanner-style visualizer: edit Bézier splines, preview speed & swerve modules, place events, and simulate the 15s autonomous period."
        }
        actions={modeSwitcher}
      />

      {!auto.enabled && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              Autônomos ainda não incluídos no código Java exportado — você já pode desenhar e simular normalmente aqui.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => patchAuto((prev) => ({ ...prev, enabled: true }))}
          >
            Ativar na Exportação
          </Button>
        </div>
      )}

      {!dtEnabled && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              Drivetrain desativado: usando dimensões padrão (0,62 m) na prévia. Ative a tração na aba Robô para gerar AutoBuilder e settings.json.
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={() => setActiveTab("subsystems")}>
            Ir para Robô
          </Button>
        </div>
      )}

      {/* Quick Starter Strip when no paths/routines exist */}
      {paths.length === 0 && auto.routines.length === 0 && view !== "config" && (
        <div className="rounded-xl border border-sky-500/35 bg-[#0f192d] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-sky-100">
            <Sparkles className="h-4 w-4 text-sky-400 shrink-0" />
            <span>Comece rápido carregando um modelo <strong>REBUILT 2026</strong> direto no campo:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {REBUILT_AUTO_TEMPLATES.map((tpl) => (
              <Button
                key={tpl.id}
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs border-sky-500/40 hover:border-sky-400"
                onClick={() => applyTemplate(tpl)}
              >
                <Plus className="h-3 w-3 text-sky-400" />
                {tpl.title[locale]}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* ==================== VISUALIZER STAGE (PATHS OR ROUTINES) ==================== */}
      {view !== "config" ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* LEFT (8 cols): PathPlanner Field Canvas + PreviewSeekbar */}
          <Card className="xl:col-span-8 overflow-hidden bg-[#0b0f17] border-[#22304a]">
            {/* Fixed Single-Row PathPlanner Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#22304a] bg-[#0f1624] px-3.5 py-2.5">
              {view === "paths" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={activePath?.id ?? ""}
                    onChange={(e) => {
                      setSelectedPathId(e.target.value);
                      setSelectedWpIdx(0);
                      setSimTimeSec(0);
                      setSimPlaying(false);
                    }}
                    className="h-7 rounded-md border border-[#22304a] bg-[#0b111c] px-2.5 text-xs font-mono text-white focus:border-[#60a5fa] outline-none"
                  >
                    {paths.length === 0 ? (
                      <option value="">(Nenhum trajeto)</option>
                    ) : (
                      paths.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}.path
                        </option>
                      ))
                    )}
                  </select>

                  <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={createNewPath}>
                    <Plus className="h-3 w-3" />
                    Novo .path
                  </Button>

                  {activePath && (
                    <button
                      type="button"
                      onClick={() => setAddPointMode((v) => !v)}
                      title="Clique no campo ou segure Shift + Clique para adicionar ponto"
                      className={`inline-flex h-7 items-center gap-1 rounded-md border px-2.5 text-xs font-medium cursor-pointer transition-colors ${
                        addPointMode
                          ? "bg-emerald-600/25 border-emerald-400 text-emerald-200"
                          : "border-[#22304a] text-slate-300 hover:text-white hover:bg-[#19253d]/60"
                      }`}
                    >
                      <Plus className="h-3 w-3" />
                      {addPointMode ? "Clique no campo..." : "+ Ponto"}
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={activeRoutine?.id ?? ""}
                    onChange={(e) => {
                      setSelectedRoutineId(e.target.value);
                      setSimTimeSec(0);
                      setSimPlaying(false);
                    }}
                    className="h-7 rounded-md border border-[#22304a] bg-[#0b111c] px-2.5 text-xs font-mono text-white focus:border-[#60a5fa] outline-none"
                  >
                    {auto.routines.length === 0 ? (
                      <option value="">(Nenhuma rotina)</option>
                    ) : (
                      auto.routines.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.fileName}.{r.source === "choreo" ? "traj" : "auto"})
                        </option>
                      ))
                    )}
                  </select>
                  <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={addRoutine}>
                    <Plus className="h-3 w-3" />
                    Nova Rotina
                  </Button>
                </div>
              )}

              {/* PathPlanner Paint Layer Toggles */}
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowVelocity((v) => !v)}
                  className={`inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-medium cursor-pointer transition-colors ${
                    showVelocity
                      ? "bg-[#142c4f]/80 text-[#93c5fd] border-[#3b6bb5]/60"
                      : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#19253d]/60"
                  }`}
                >
                  Velocidade
                </button>
                <button
                  type="button"
                  onClick={() => setShowModules((v) => !v)}
                  className={`inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-medium cursor-pointer transition-colors ${
                    showModules
                      ? "bg-[#142c4f]/80 text-[#93c5fd] border-[#3b6bb5]/60"
                      : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#19253d]/60"
                  }`}
                >
                  Módulos
                </button>
                <button
                  type="button"
                  onClick={() => setShowRadius((v) => !v)}
                  className={`inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-medium cursor-pointer transition-colors ${
                    showRadius
                      ? "bg-[#142c4f]/80 text-[#93c5fd] border-[#3b6bb5]/60"
                      : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#19253d]/60"
                  }`}
                >
                  Raio
                </button>
                {view === "paths" && (
                  <button
                    type="button"
                    onClick={() => setSnapEnabled((v) => !v)}
                    className={`inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-medium cursor-pointer transition-colors ${
                      snapEnabled
                        ? "bg-[#142c4f]/80 text-[#93c5fd] border-[#3b6bb5]/60"
                        : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#19253d]/60"
                    }`}
                  >
                    {snapEnabled ? "Snap 5cm" : "Livre"}
                  </button>
                )}
                <div className="flex items-center rounded-md border border-[#22304a] bg-[#0b0f17] p-0.5 text-[11px] ml-1">
                  <button
                    type="button"
                    onClick={() => setSimAlliance("Blue")}
                    className={`rounded px-2 py-0.5 font-medium cursor-pointer ${
                      simAlliance === "Blue" ? "bg-blue-600/80 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Azul
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimAlliance("Red")}
                    className={`rounded px-2 py-0.5 font-medium cursor-pointer ${
                      simAlliance === "Red" ? "bg-rose-600/80 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Vermelho
                  </button>
                </div>
              </div>
            </div>

            {/* Interactive SVG Field Stage */}
            <div className="relative bg-[#070b12] px-3 py-2.5">
              {view === "routines" && autoSimulation.breaks.length > 0 && (
                <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-lg border border-amber-500/60 bg-amber-950/90 px-3 py-1.5 text-[11px] text-amber-100 shadow-lg backdrop-blur-sm">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>
                    Salto de {autoSimulation.breaks[0].gapMeters.toFixed(2)} m entre{" "}
                    <strong className="font-mono">{autoSimulation.breaks[0].fromPathName}</strong> e{" "}
                    <strong className="font-mono">{autoSimulation.breaks[0].toPathName}</strong>
                  </span>
                </div>
              )}

              <svg
                ref={svgRef}
                viewBox={`-1.1 -0.42 ${fieldL + 1.92} ${fieldW + 0.94}`}
                onMouseDown={handleSvgMouseDown}
                onMouseMove={handleSvgMouseMove}
                onMouseUp={handleSvgMouseUp}
                onMouseLeave={handleSvgMouseUp}
                className={`w-full h-auto block select-none ${
                  addPointMode ? "cursor-crosshair" : "cursor-default"
                }`}
              >
                <RebuiltFieldBackdrop fieldL={fieldL} fieldW={fieldW} showRebuilt showGrid idPrefix="pp" />

                {/* ---------- PATHS MODE RENDERING ---------- */}
                {view === "paths" && activePath && pathTrajectory && (
                  <g>
                    {/* Robot Clearance Radius Sweep */}
                    {showRadius && pathTrajectory.states.length > 1 && (
                      <polyline
                        points={pathTrajectory.states
                          .map((st) => {
                            const pt = dispPt({ x: st.x, y: st.y });
                            return `${pt.x},${fieldW - pt.y}`;
                          })
                          .join(" ")}
                        fill="none"
                        stroke="#64748b"
                        strokeOpacity={0.22}
                        strokeWidth={Math.hypot(activeSimConfig.robotLength, activeSimConfig.robotWidth)}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="pointer-events-none"
                      />
                    )}

                    {/* Trajectory Curve */}
                    {pathTrajectory.states.length > 1 && (
                      <polyline
                        points={pathTrajectory.states
                          .map((st) => {
                            const pt = dispPt({ x: st.x, y: st.y });
                            return `${pt.x},${fieldW - pt.y}`;
                          })
                          .join(" ")}
                        fill="none"
                        stroke="#60a5fa"
                        strokeOpacity={showVelocity ? 0.55 : 0.9}
                        strokeWidth={0.075}
                        strokeLinecap="round"
                        className="pointer-events-none"
                      />
                    )}

                    {/* Velocity State Dots (PathPlanner Red->Orange->Yellow->Green) */}
                    {showVelocity &&
                      pathTrajectory.states
                        .filter((_, idx) => idx % 2 === 0 || idx === pathTrajectory.states.length - 1)
                        .map((st, idx) => {
                          const pt = dispPt({ x: st.x, y: st.y });
                          const norm = st.velMps / Math.max(0.5, pathTrajectory.maxVelMps);
                          return (
                            <circle
                              key={`vel-${idx}`}
                              cx={pt.x}
                              cy={fieldW - pt.y}
                              r={0.075}
                              fill={velocityToHeatColor(norm)}
                              className="pointer-events-none"
                            />
                          );
                        })}

                    {/* Rotation Targets (Ghost silhouette + draggable heading knob) */}
                    {activePath.rotationTargets.map((rt) => {
                      const pos = samplePathAtRelativePos(activePath.waypoints, rt.waypointRelativePos);
                      const dPos = dispPt(pos);
                      const dRotRad = dispAngleRad(degToRad(rt.rotationDegrees));
                      const knobRaw = {
                        x: pos.x + 0.65 * Math.cos(degToRad(rt.rotationDegrees)),
                        y: pos.y + 0.65 * Math.sin(degToRad(rt.rotationDegrees)),
                      };
                      const dKnob = dispPt(knobRaw);
                      const isSel = rt.id === selectedRotId;
                      return (
                        <g key={rt.id}>
                          <line
                            x1={dPos.x}
                            y1={fieldW - dPos.y}
                            x2={dKnob.x}
                            y2={fieldW - dKnob.y}
                            stroke="#a855f7"
                            strokeWidth={0.04}
                            className="pointer-events-none"
                          />
                          <g
                            transform={`translate(${dPos.x}, ${fieldW - dPos.y}) rotate(${(-dRotRad * 180) / Math.PI})`}
                            className="cursor-grab"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setSelectedRotId(rt.id);
                              setOpenRotTree(true);
                              setDrag({ kind: "rotTargetPos", id: rt.id });
                            }}
                          >
                            <rect
                              x={-activeSimConfig.robotLength / 2}
                              y={-activeSimConfig.robotWidth / 2}
                              width={activeSimConfig.robotLength}
                              height={activeSimConfig.robotWidth}
                              rx={0.07}
                              fill="#a855f7"
                              fillOpacity={isSel ? 0.22 : 0.1}
                              stroke={isSel ? "#f59e0b" : "#c084fc"}
                              strokeWidth={isSel ? 0.055 : 0.035}
                              strokeDasharray="0.14 0.08"
                            />
                            <polygon
                              points={`${activeSimConfig.robotLength / 2 - 0.08},0 ${activeSimConfig.robotLength / 2 - 0.26},-0.1 ${activeSimConfig.robotLength / 2 - 0.26},0.1`}
                              fill="#e9d5ff"
                            />
                          </g>
                          <circle
                            cx={dKnob.x}
                            cy={fieldW - dKnob.y}
                            r={0.13}
                            fill={isSel ? "#f59e0b" : "#c084fc"}
                            stroke="#0b0f17"
                            strokeWidth={0.04}
                            className="cursor-pointer"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setSelectedRotId(rt.id);
                              setDrag({ kind: "rotTargetHeading", id: rt.id });
                            }}
                          />
                        </g>
                      );
                    })}

                    {/* Event Markers (Diamond pins draggable along spline) */}
                    {activePath.eventMarkers.map((em) => {
                      const pos = samplePathAtRelativePos(activePath.waypoints, em.waypointRelativePos);
                      const dPos = dispPt(pos);
                      const isSel = em.id === selectedMarkerId;
                      return (
                        <g
                          key={em.id}
                          className="cursor-grab"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setSelectedMarkerId(em.id);
                            setOpenMarkerTree(true);
                            setDrag({ kind: "eventMarker", id: em.id });
                          }}
                        >
                          <polygon
                            points={`${dPos.x},${fieldW - dPos.y - 0.19} ${dPos.x + 0.19},${fieldW - dPos.y} ${dPos.x},${fieldW - dPos.y + 0.19} ${dPos.x - 0.19},${fieldW - dPos.y}`}
                            fill={isSel ? "#f59e0b" : "#facc15"}
                            stroke="#0b0f17"
                            strokeWidth={0.045}
                          />
                          <rect
                            x={clamp(dPos.x - 0.8, 0.05, fieldL - 1.65)}
                            y={Math.max(0.05, fieldW - dPos.y - 0.56)}
                            width={1.6}
                            height={0.3}
                            rx={0.06}
                            fill="#0c1526"
                            fillOpacity={0.9}
                            stroke={isSel ? "#f59e0b" : "#eab308"}
                            strokeWidth={0.025}
                          />
                          <text
                            x={clamp(dPos.x, 0.85, fieldL - 0.85)}
                            y={Math.max(0.2, fieldW - dPos.y - 0.41)}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill="#fef08a"
                            fontSize={0.155}
                            fontFamily="monospace"
                            fontWeight={700}
                          >
                            ⚡ {em.commandName}
                          </text>
                        </g>
                      );
                    })}

                    {/* Bézier Tangent Handles & Waypoint Anchors */}
                    {activePath.waypoints.map((wp, idx) => {
                      const a = dispPt(wp.anchor);
                      const prevC = wp.prevControl ? dispPt(wp.prevControl) : null;
                      const nextC = wp.nextControl ? dispPt(wp.nextControl) : null;
                      const isStart = idx === 0;
                      const isEnd = idx === activePath.waypoints.length - 1;
                      const isSel = idx === selectedWpIdx;
                      const anchorFill = isStart ? "#22c55e" : isEnd ? "#ef4444" : "#38bdf8";

                      return (
                        <g key={`wp-${idx}`}>
                          {prevC && (
                            <>
                              <line
                                x1={a.x}
                                y1={fieldW - a.y}
                                x2={prevC.x}
                                y2={fieldW - prevC.y}
                                stroke="#94a3b8"
                                strokeOpacity={0.7}
                                strokeWidth={0.032}
                              />
                              <circle
                                cx={prevC.x}
                                cy={fieldW - prevC.y}
                                r={0.115}
                                fill="#0f172a"
                                stroke="#93c5fd"
                                strokeWidth={0.04}
                                className="cursor-grab active:cursor-grabbing"
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setSelectedWpIdx(idx);
                                  setDrag({ kind: "prevControl", index: idx });
                                }}
                              />
                            </>
                          )}
                          {nextC && (
                            <>
                              <line
                                x1={a.x}
                                y1={fieldW - a.y}
                                x2={nextC.x}
                                y2={fieldW - nextC.y}
                                stroke="#94a3b8"
                                strokeOpacity={0.7}
                                strokeWidth={0.032}
                              />
                              <circle
                                cx={nextC.x}
                                cy={fieldW - nextC.y}
                                r={0.115}
                                fill="#0f172a"
                                stroke="#38bdf8"
                                strokeWidth={0.04}
                                className="cursor-grab active:cursor-grabbing"
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setSelectedWpIdx(idx);
                                  setDrag({ kind: "nextControl", index: idx });
                                }}
                              />
                            </>
                          )}
                          <circle
                            cx={a.x}
                            cy={fieldW - a.y}
                            r={isSel ? 0.21 : 0.165}
                            fill={anchorFill}
                            stroke={isSel ? "#f59e0b" : "#0b0f17"}
                            strokeWidth={isSel ? 0.065 : 0.045}
                            className="cursor-move"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setSelectedWpIdx(idx);
                              setOpenWpTree(true);
                              setDrag({ kind: "anchor", index: idx });
                            }}
                          />
                        </g>
                      );
                    })}
                  </g>
                )}

                {/* ---------- ROUTINES MODE RENDERING (ALL AUTO PATHS + BREAK WARNINGS) ---------- */}
                {view === "routines" && (
                  <g>
                    {autoSimulation.segments.map((seg, segIdx) => {
                      if (seg.kind !== "path" || !seg.trajectory) return null;
                      const isActiveSeg = segIdx === sampledAuto.activeSegmentIndex;
                      const ptsStr = seg.trajectory.states
                        .map((st) => {
                          const pt = dispPt({ x: st.x, y: st.y });
                          return `${pt.x},${fieldW - pt.y}`;
                        })
                        .join(" ");
                      const firstPt = dispPt({
                        x: seg.trajectory.states[0].x,
                        y: seg.trajectory.states[0].y,
                      });
                      const lastSt = seg.trajectory.states[seg.trajectory.states.length - 1];
                      const lastPt = dispPt({ x: lastSt.x, y: lastSt.y });

                      return (
                        <g
                          key={`${seg.stepId}-${segIdx}`}
                          className="cursor-pointer"
                          onClick={() => {
                            if (seg.pathDoc && !seg.pathDoc.id.startsWith("fallback-")) {
                              setSelectedPathId(seg.pathDoc.id);
                              setView("paths");
                              setSimPlaying(false);
                              setSimTimeSec(0);
                            }
                          }}
                        >
                          {showRadius && (
                            <polyline
                              points={ptsStr}
                              fill="none"
                              stroke="#64748b"
                              strokeOpacity={0.16}
                              strokeWidth={Math.hypot(
                                activeSimConfig.robotLength,
                                activeSimConfig.robotWidth,
                              )}
                              strokeLinecap="round"
                            />
                          )}
                          <polyline
                            points={ptsStr}
                            fill="none"
                            stroke={isActiveSeg ? "#38bdf8" : "#64748b"}
                            strokeOpacity={isActiveSeg ? 0.95 : 0.55}
                            strokeWidth={isActiveSeg ? 0.085 : 0.055}
                            strokeLinecap="round"
                          />
                          {showVelocity &&
                            isActiveSeg &&
                            seg.trajectory.states
                              .filter((_, idx) => idx % 2 === 0)
                              .map((st, idx) => {
                                const pt = dispPt({ x: st.x, y: st.y });
                                const norm = st.velMps / Math.max(0.5, seg.trajectory!.maxVelMps);
                                return (
                                  <circle
                                    key={`rvel-${segIdx}-${idx}`}
                                    cx={pt.x}
                                    cy={fieldW - pt.y}
                                    r={0.07}
                                    fill={velocityToHeatColor(norm)}
                                  />
                                );
                              })}
                          <circle cx={firstPt.x} cy={fieldW - firstPt.y} r={0.14} fill="#22c55e" stroke="#0b0f17" strokeWidth={0.03} />
                          <circle cx={lastPt.x} cy={fieldW - lastPt.y} r={0.14} fill="#ef4444" stroke="#0b0f17" strokeWidth={0.03} />
                        </g>
                      );
                    })}

                    {/* Break Warnings (dashed orange connector matching _paintBreakWarning) */}
                    {autoSimulation.breaks.map((brk, idx) => {
                      const a = dispPt(brk.from);
                      const b = dispPt(brk.to);
                      return (
                        <g key={`brk-${idx}`} className="pointer-events-none">
                          <line
                            x1={a.x}
                            y1={fieldW - a.y}
                            x2={b.x}
                            y2={fieldW - b.y}
                            stroke="#f59e0b"
                            strokeWidth={0.055}
                            strokeDasharray="0.16 0.12"
                          />
                          <circle cx={(a.x + b.x) / 2} cy={fieldW - (a.y + b.y) / 2} r={0.2} fill="#f59e0b" />
                          <text
                            x={(a.x + b.x) / 2}
                            y={fieldW - (a.y + b.y) / 2}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill="#0b0f17"
                            fontSize={0.22}
                            fontWeight={900}
                          >
                            !
                          </text>
                        </g>
                      );
                    })}

                    {/* Event marker diamonds along routine */}
                    {autoSimulation.events.map((ev) => {
                      const pt = dispPt({ x: ev.x, y: ev.y });
                      return (
                        <polygon
                          key={`rev-${ev.id}`}
                          points={`${pt.x},${fieldW - pt.y - 0.15} ${pt.x + 0.15},${fieldW - pt.y} ${pt.x},${fieldW - pt.y + 0.15} ${pt.x - 0.15},${fieldW - pt.y}`}
                          fill="#facc15"
                          stroke="#0b0f17"
                          strokeWidth={0.035}
                          className="pointer-events-none"
                        />
                      );
                    })}
                  </g>
                )}

                {/* Animated FRC Robot Silhouette */}
                {renderAnimatedRobot()}
              </svg>
            </div>

            {/* Bottom PathPlanner PreviewSeekbar & RuntimeTelemetry */}
            <div className="border-t border-[#22304a] bg-[#0f1624] px-4 py-2.5 space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant={simPlaying ? "secondary" : "primary"}
                    className="h-7 px-2.5 text-xs"
                    disabled={activeTotalTimeSec <= 0.05}
                    onClick={() => {
                      if (clampedSimTime >= activeTotalTimeSec - 0.02) {
                        setSimTimeSec(0);
                      }
                      setSimPlaying((p) => !p);
                    }}
                  >
                    {simPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    {simPlaying ? "Pausar" : "Simular"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    disabled={activeTotalTimeSec <= 0.05}
                    onClick={() => {
                      setSimTimeSec(0);
                      setSimPlaying(true);
                    }}
                    title="Reiniciar"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </div>

                <div className="flex items-center rounded-md border border-[#22304a] bg-[#0b0f17] p-0.5 text-[10px] font-mono">
                  {([0.5, 1, 2] as const).map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => setPlaybackSpeed(spd)}
                      className={`rounded px-1.5 py-0.5 cursor-pointer ${
                        playbackSpeed === spd ? "bg-[#142c4f] text-white" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {spd}×
                    </button>
                  ))}
                </div>

                <div className="relative flex-1 min-w-[160px] flex items-center">
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0.1, activeTotalTimeSec)}
                    step={0.02}
                    value={clampedSimTime}
                    onChange={(e) => {
                      setSimPlaying(false);
                      setSimTimeSec(Number(e.target.value));
                    }}
                    className="w-full cursor-pointer accent-sky-400"
                  />
                </div>

                <span className="font-mono tabular-nums text-[11px] text-white shrink-0">
                  {clampedSimTime.toFixed(2)}s / {activeTotalTimeSec.toFixed(2)}s
                </span>

                {view === "routines" && (
                  <span
                    className={`rounded px-2 py-0.5 font-mono text-[10px] shrink-0 border ${
                      activeTotalTimeSec > 15
                        ? "bg-rose-500/20 border-rose-500/50 text-rose-200"
                        : "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                    }`}
                  >
                    {activeTotalTimeSec <= 15
                      ? `15s OK (${(15 - activeTotalTimeSec).toFixed(1)}s folga)`
                      : `+${(activeTotalTimeSec - 15).toFixed(1)}s > 15s`}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 border-t border-[#1d2a42] pt-2">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Início
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-sky-400" />
                    Waypoint
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    Fim
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-purple-400" />
                    Rotação
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-yellow-400" />
                    Evento
                  </span>
                </div>
                <span className="font-mono tabular-nums text-slate-300">
                  {currentRobotState
                    ? `Pose (${currentRobotState.x.toFixed(2)}m, ${currentRobotState.y.toFixed(2)}m, ${Math.round(
                        radToDeg(currentRobotState.rotationRad),
                      )}°) · ${currentRobotState.velMps.toFixed(2)} m/s${
                        pathTrajectory && view === "paths"
                          ? ` · ${pathTrajectory.totalDistanceM.toFixed(2)} m`
                          : ""
                      }`
                    : "Shift+Clique no campo adiciona waypoint · Alt+Arrastar quebra tangente"}
                </span>
              </div>
            </div>
          </Card>

          {/* RIGHT (4 cols): PathPlanner Collapsible Tree Inspector */}
          <div className="xl:col-span-4 space-y-3">
            {view === "paths" ? (
              !activePath ? (
                <Card className="bg-[#0f1624] border-[#22304a]">
                  <CardContent className="py-8 text-center space-y-3">
                    <Route className="h-7 w-7 text-sky-400 mx-auto" />
                    <p className="text-xs text-slate-300">
                      Nenhum arquivo <span className="font-mono">.path</span> criado ainda.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button size="sm" onClick={createNewPath}>
                        <Plus className="h-3.5 w-3.5" />
                        Criar Trajeto (.path)
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => applyTemplate(REBUILT_AUTO_TEMPLATES[2], "paths")}
                      >
                        <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                        2 Peças Trench 2026
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Waypoints Tree */}
                  <TreeSection
                    title="Waypoints (Bézier)"
                    count={activePath.waypoints.length}
                    open={openWpTree}
                    onToggle={() => setOpenWpTree((v) => !v)}
                    action={
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => updateActivePath((p) => reversePathDoc(p))}
                          title="Inverter direção do trajeto"
                        >
                          <RotateCcw className="h-2.5 w-2.5" />
                          Inverter
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => {
                            const last = activePath.waypoints[activePath.waypoints.length - 1];
                            updateActivePath((p) => ({
                              ...p,
                              waypoints: appendWaypoint(
                                p.waypoints,
                                {
                                  x: clamp(last.anchor.x + 1.4, 0.4, fieldL - 0.4),
                                  y: clamp(last.anchor.y, 0.4, fieldW - 0.4),
                                },
                                fieldL,
                                fieldW,
                              ),
                            }));
                            setSelectedWpIdx(activePath.waypoints.length);
                          }}
                        >
                          <Plus className="h-2.5 w-2.5" />
                          Ponto
                        </Button>
                      </div>
                    }
                  >
                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
                      {activePath.waypoints.map((wp, idx) => {
                        const isStart = idx === 0;
                        const isEnd = idx === activePath.waypoints.length - 1;
                        const isSel = idx === selectedWpIdx;
                        return (
                          <div
                            key={`wprow-${idx}`}
                            onClick={() => setSelectedWpIdx(idx)}
                            className={`rounded-lg border px-2.5 py-2 transition-colors cursor-pointer space-y-1.5 ${
                              isSel
                                ? "border-[#60a5fa] bg-[#142c4f]/50"
                                : "border-[#22304a] bg-[#0b111c] hover:border-slate-600"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white">
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    isStart ? "bg-emerald-400" : isEnd ? "bg-rose-400" : "bg-sky-400"
                                  }`}
                                />
                                <span>
                                  {isStart ? "Start Point" : isEnd ? "End Point" : `Waypoint #${idx}`}
                                </span>
                              </div>
                              {activePath.waypoints.length > 2 && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-5 w-5"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateActivePath((p) => ({
                                      ...p,
                                      waypoints: removeWaypoint(p.waypoints, idx),
                                    }));
                                    setSelectedWpIdx(0);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3 text-rose-400" />
                                </Button>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-1.5">
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-[10px] text-slate-400 w-4">X</span>
                                <Input
                                  type="number"
                                  step="0.05"
                                  className="h-6 px-2 text-[11px] font-mono"
                                  value={wp.anchor.x}
                                  onChange={(e) => {
                                    const x = Number(e.target.value);
                                    if (!Number.isFinite(x)) return;
                                    updateActivePath((p) => ({
                                      ...p,
                                      waypoints: moveWaypointAnchor(
                                        p.waypoints,
                                        idx,
                                        { x, y: wp.anchor.y },
                                        fieldL,
                                        fieldW,
                                      ),
                                    }));
                                  }}
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-[10px] text-slate-400 w-4">Y</span>
                                <Input
                                  type="number"
                                  step="0.05"
                                  className="h-6 px-2 text-[11px] font-mono"
                                  value={wp.anchor.y}
                                  onChange={(e) => {
                                    const y = Number(e.target.value);
                                    if (!Number.isFinite(y)) return;
                                    updateActivePath((p) => ({
                                      ...p,
                                      waypoints: moveWaypointAnchor(
                                        p.waypoints,
                                        idx,
                                        { x: wp.anchor.x, y },
                                        fieldL,
                                        fieldW,
                                      ),
                                    }));
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </TreeSection>

                  {/* Rotation Targets Tree */}
                  <TreeSection
                    title="Rotation Targets"
                    count={activePath.rotationTargets.length}
                    open={openRotTree}
                    onToggle={() => setOpenRotTree((v) => !v)}
                    action={
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => {
                          const id = `rt-${Date.now().toString(36)}`;
                          const pos = round2((activePath.waypoints.length - 1) * 0.5);
                          updateActivePath((p) => ({
                            ...p,
                            rotationTargets: [
                              ...p.rotationTargets,
                              { id, waypointRelativePos: pos, rotationDegrees: 0 },
                            ],
                          }));
                          setSelectedRotId(id);
                          setOpenRotTree(true);
                        }}
                      >
                        <Plus className="h-2.5 w-2.5" />
                        Alvo Rot.
                      </Button>
                    }
                  >
                    {activePath.rotationTargets.length === 0 ? (
                      <p className="text-[11px] text-slate-400">
                        Nenhum alvo de rotação intermediário (apenas ângulo inicial e final).
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {activePath.rotationTargets.map((rt, idx) => (
                          <div
                            key={rt.id}
                            onClick={() => setSelectedRotId(rt.id)}
                            className={`rounded-lg border p-2 space-y-1.5 cursor-pointer ${
                              rt.id === selectedRotId
                                ? "border-purple-400 bg-purple-950/30"
                                : "border-[#22304a] bg-[#0b111c]"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="font-semibold text-purple-200">
                                Rotação #{idx + 1} · {rt.rotationDegrees}°
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-5 w-5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateActivePath((p) => ({
                                    ...p,
                                    rotationTargets: p.rotationTargets.filter((x) => x.id !== rt.id),
                                  }));
                                }}
                              >
                                <Trash2 className="h-3 w-3 text-rose-400" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-12 gap-2 items-center">
                              <span className="col-span-3 font-mono text-[10px] text-slate-400">
                                Pos {rt.waypointRelativePos.toFixed(2)}
                              </span>
                              <input
                                type="range"
                                min={0.05}
                                max={Math.max(0.2, activePath.waypoints.length - 1.05)}
                                step={0.05}
                                value={rt.waypointRelativePos}
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  updateActivePath((p) => ({
                                    ...p,
                                    rotationTargets: p.rotationTargets.map((x) =>
                                      x.id === rt.id ? { ...x, waypointRelativePos: v } : x,
                                    ),
                                  }));
                                }}
                                className="col-span-5 accent-purple-400"
                              />
                              <Input
                                type="number"
                                step="5"
                                className="col-span-4 h-6 px-1.5 text-[11px] font-mono"
                                value={rt.rotationDegrees}
                                onChange={(e) => {
                                  const deg = Number(e.target.value);
                                  if (!Number.isFinite(deg)) return;
                                  updateActivePath((p) => ({
                                    ...p,
                                    rotationTargets: p.rotationTargets.map((x) =>
                                      x.id === rt.id ? { ...x, rotationDegrees: deg } : x,
                                    ),
                                  }));
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TreeSection>

                  {/* Event Markers Tree */}
                  <TreeSection
                    title="Event Markers"
                    count={activePath.eventMarkers.length}
                    open={openMarkerTree}
                    onToggle={() => setOpenMarkerTree((v) => !v)}
                    action={
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => {
                          const defaultCmd =
                            auto.namedCommands[0]?.name ?? superRequests[0] ?? "IntakeOn";
                          const id = `em-${Date.now().toString(36)}`;
                          updateActivePath((p) => ({
                            ...p,
                            eventMarkers: [
                              ...p.eventMarkers,
                              {
                                id,
                                name: defaultCmd,
                                commandName: defaultCmd,
                                waypointRelativePos: round2((p.waypoints.length - 1) * 0.5),
                              },
                            ],
                          }));
                          setSelectedMarkerId(id);
                          setOpenMarkerTree(true);
                        }}
                      >
                        <Plus className="h-2.5 w-2.5" />
                        Evento
                      </Button>
                    }
                  >
                    {activePath.eventMarkers.length === 0 ? (
                      <p className="text-[11px] text-slate-400">
                        Posicione NamedCommands para disparar no meio da curva (ex.: IntakeOn, ScoreFuel).
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {activePath.eventMarkers.map((em) => (
                          <div
                            key={em.id}
                            onClick={() => setSelectedMarkerId(em.id)}
                            className={`rounded-lg border p-2 space-y-1.5 cursor-pointer ${
                              em.id === selectedMarkerId
                                ? "border-yellow-400 bg-yellow-950/25"
                                : "border-[#22304a] bg-[#0b111c]"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-[11px] font-semibold text-yellow-200 flex items-center gap-1">
                                <Zap className="h-3 w-3 text-yellow-400" />
                                Pos {em.waypointRelativePos.toFixed(2)}
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-5 w-5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateActivePath((p) => ({
                                    ...p,
                                    eventMarkers: p.eventMarkers.filter((x) => x.id !== em.id),
                                  }));
                                }}
                              >
                                <Trash2 className="h-3 w-3 text-rose-400" />
                              </Button>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={Math.max(0.2, activePath.waypoints.length - 1)}
                              step={0.05}
                              value={em.waypointRelativePos}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                updateActivePath((p) => ({
                                  ...p,
                                  eventMarkers: p.eventMarkers.map((x) =>
                                    x.id === em.id ? { ...x, waypointRelativePos: v } : x,
                                  ),
                                }));
                              }}
                              className="w-full accent-yellow-400"
                            />
                            <div className="flex items-center gap-1.5">
                              <Input
                                className="h-6 px-2 text-[11px] font-mono"
                                value={em.commandName}
                                placeholder="NamedCommand"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateActivePath((p) => ({
                                    ...p,
                                    eventMarkers: p.eventMarkers.map((x) =>
                                      x.id === em.id ? { ...x, commandName: val, name: val } : x,
                                    ),
                                  }));
                                }}
                              />
                              {auto.namedCommands.length > 0 && (
                                <select
                                  value={em.commandName}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    updateActivePath((p) => ({
                                      ...p,
                                      eventMarkers: p.eventMarkers.map((x) =>
                                        x.id === em.id ? { ...x, commandName: val, name: val } : x,
                                      ),
                                    }));
                                  }}
                                  className="h-6 rounded border border-[#22304a] bg-[#0f1624] px-1.5 text-[10px] font-mono text-slate-200"
                                >
                                  {!auto.namedCommands.some((c) => c.name === em.commandName) && (
                                    <option value={em.commandName}>{em.commandName}</option>
                                  )}
                                  {auto.namedCommands.map((c) => (
                                    <option key={c.id} value={c.name}>
                                      {c.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TreeSection>

                  {/* End States & Constraints Tree */}
                  <TreeSection
                    title="Estados, Limites & Arquivo"
                    open={openLimitsTree}
                    onToggle={() => setOpenLimitsTree((v) => !v)}
                  >
                    <div className="space-y-2.5 text-xs">
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 mb-1">
                          Nome do arquivo (.path)
                        </label>
                        <Input
                          className="h-7 text-xs font-mono"
                          value={activePath.name}
                          onChange={(e) => {
                            const nextName = e.target.value;
                            updateActivePath((p) => ({ ...p, name: nextName }));
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-mono text-slate-400 mb-1">
                            Start Rot (°)
                          </label>
                          <Input
                            type="number"
                            step="5"
                            className="h-7 text-xs font-mono"
                            value={activePath.idealStartingState?.rotation ?? 0}
                            onChange={(e) => {
                              const rot = Number(e.target.value);
                              if (!Number.isFinite(rot)) return;
                              updateActivePath((p) => ({
                                ...p,
                                idealStartingState: {
                                  velocity: p.idealStartingState?.velocity ?? 0,
                                  rotation: rot,
                                },
                              }));
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-slate-400 mb-1">
                            Goal End Rot (°)
                          </label>
                          <Input
                            type="number"
                            step="5"
                            className="h-7 text-xs font-mono"
                            value={activePath.goalEndState?.rotation ?? 0}
                            onChange={(e) => {
                              const rot = Number(e.target.value);
                              if (!Number.isFinite(rot)) return;
                              updateActivePath((p) => ({
                                ...p,
                                goalEndState: {
                                  velocity: p.goalEndState?.velocity ?? 0,
                                  rotation: rot,
                                },
                              }));
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-slate-400 mb-1">
                            Start Vel (m/s)
                          </label>
                          <Input
                            type="number"
                            step="0.2"
                            min={0}
                            className="h-7 text-xs font-mono"
                            value={activePath.idealStartingState?.velocity ?? 0}
                            onChange={(e) => {
                              const vel = Math.max(0, Number(e.target.value) || 0);
                              updateActivePath((p) => ({
                                ...p,
                                idealStartingState: {
                                  velocity: vel,
                                  rotation: p.idealStartingState?.rotation ?? 0,
                                },
                              }));
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-slate-400 mb-1">
                            Goal End Vel (m/s)
                          </label>
                          <Input
                            type="number"
                            step="0.2"
                            min={0}
                            className="h-7 text-xs font-mono"
                            value={activePath.goalEndState?.velocity ?? 0}
                            onChange={(e) => {
                              const vel = Math.max(0, Number(e.target.value) || 0);
                              updateActivePath((p) => ({
                                ...p,
                                goalEndState: {
                                  velocity: vel,
                                  rotation: p.goalEndState?.rotation ?? 0,
                                },
                              }));
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-2 text-[11px] text-slate-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={activePath.useDefaultConstraints !== false}
                            onChange={(e) =>
                              updateActivePath((p) => ({
                                ...p,
                                useDefaultConstraints: e.target.checked,
                              }))
                            }
                          />
                          Usar limites padrão do Drivetrain
                        </label>
                        <label className="flex items-center gap-1.5 text-[11px] text-slate-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(activePath.reversed)}
                            onChange={(e) =>
                              updateActivePath((p) => ({ ...p, reversed: e.target.checked }))
                            }
                          />
                          Ré
                        </label>
                      </div>

                      {activePath.useDefaultConstraints === false && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <label className="block text-[10px] font-mono text-slate-400 mb-1">
                              Max Vel (m/s)
                            </label>
                            <Input
                              type="number"
                              step="0.2"
                              min={0.5}
                              className="h-7 text-xs font-mono"
                              value={activePath.globalConstraints?.maxVelocity ?? 3.5}
                              onChange={(e) => {
                                const v = Math.max(0.5, Number(e.target.value) || 0.5);
                                updateActivePath((p) => ({
                                  ...p,
                                  globalConstraints: {
                                    maxVelocity: v,
                                    maxAcceleration: p.globalConstraints?.maxAcceleration ?? 3.0,
                                    maxAngularVelocity:
                                      p.globalConstraints?.maxAngularVelocity ?? 540,
                                    maxAngularAcceleration:
                                      p.globalConstraints?.maxAngularAcceleration ?? 720,
                                  },
                                }));
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-mono text-slate-400 mb-1">
                              Max Accel (m/s²)
                            </label>
                            <Input
                              type="number"
                              step="0.2"
                              min={0.5}
                              className="h-7 text-xs font-mono"
                              value={activePath.globalConstraints?.maxAcceleration ?? 3.0}
                              onChange={(e) => {
                                const a = Math.max(0.5, Number(e.target.value) || 0.5);
                                updateActivePath((p) => ({
                                  ...p,
                                  globalConstraints: {
                                    maxVelocity: p.globalConstraints?.maxVelocity ?? 3.5,
                                    maxAcceleration: a,
                                    maxAngularVelocity:
                                      p.globalConstraints?.maxAngularVelocity ?? 540,
                                    maxAngularAcceleration:
                                      p.globalConstraints?.maxAngularAcceleration ?? 720,
                                  },
                                }));
                              }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#22304a]">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-xs"
                          onClick={duplicateActivePath}
                        >
                          <Copy className="h-3 w-3" />
                          Duplicar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-xs text-rose-300 border-rose-500/40"
                          onClick={deleteActivePath}
                        >
                          <Trash2 className="h-3 w-3" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </TreeSection>
                </>
              )
            ) : (
              /* ---------- ROUTINES TREE INSPECTOR ---------- */
              <>
                <TreeSection
                  title="Modelos REBUILT 2026"
                  open
                  onToggle={() => {}}
                >
                  <div className="grid grid-cols-1 gap-1.5">
                    {REBUILT_AUTO_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => applyTemplate(tpl)}
                        className="flex items-center justify-between gap-2 rounded-lg border border-[#22304a] bg-[#0b111c] px-2.5 py-2 text-left hover:border-[#60a5fa] cursor-pointer transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-white truncate">
                            {tpl.title[locale]}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {tpl.description[locale]}
                          </p>
                        </div>
                        <Plus className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                </TreeSection>

                {activeRoutine && (
                  <>
                    <TreeSection
                      title="Sequência (.auto Sequential)"
                      count={activeSteps.length}
                      open
                      onToggle={() => {}}
                      action={
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-1.5 text-[10px]"
                            onClick={() => {
                              const firstPath = paths[0];
                              updateRoutineSteps(activeRoutine.id, (prev) => [
                                ...prev,
                                {
                                  id: `st-${Date.now().toString(36)}`,
                                  kind: "path",
                                  pathName: firstPath?.name ?? `Path_${prev.length + 1}`,
                                  durationSec: 2.2,
                                  startX: firstPath?.waypoints[0]?.anchor.x ?? 2.0,
                                  startY: firstPath?.waypoints[0]?.anchor.y ?? 4.0,
                                  endX:
                                    firstPath?.waypoints[firstPath.waypoints.length - 1]?.anchor.x ??
                                    4.0,
                                  endY:
                                    firstPath?.waypoints[firstPath.waypoints.length - 1]?.anchor.y ??
                                    4.0,
                                },
                              ]);
                            }}
                          >
                            + Trajeto
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-1.5 text-[10px]"
                            onClick={() =>
                              updateRoutineSteps(activeRoutine.id, (prev) => [
                                ...prev,
                                {
                                  id: `st-${Date.now().toString(36)}`,
                                  kind: "named",
                                  commandName: auto.namedCommands[0]?.name ?? "IntakeOn",
                                  durationSec: 1.0,
                                },
                              ])
                            }
                          >
                            + Cmd
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-1.5 text-[10px]"
                            onClick={() =>
                              updateRoutineSteps(activeRoutine.id, (prev) => [
                                ...prev,
                                {
                                  id: `st-${Date.now().toString(36)}`,
                                  kind: "wait",
                                  seconds: 0.5,
                                },
                              ])
                            }
                          >
                            + Espera
                          </Button>
                        </div>
                      }
                    >
                      {activeSteps.length === 0 ? (
                        <p className="text-[11px] text-slate-400">
                          Adicione trajetos <span className="font-mono">.path</span>, NamedCommands ou esperas em ordem.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                          {activeSteps.map((step, idx) => (
                            <div
                              key={step.id}
                              className="rounded-lg border border-[#22304a] bg-[#0b111c] px-2.5 py-2 space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-[10px] font-semibold text-slate-300 flex items-center gap-1">
                                  #{idx + 1} ·{" "}
                                  {step.kind === "path" ? (
                                    <span className="text-sky-300 flex items-center gap-1">
                                      <Route className="h-3 w-3" /> Trajeto
                                    </span>
                                  ) : step.kind === "named" ? (
                                    <span className="text-amber-300 flex items-center gap-1">
                                      <Zap className="h-3 w-3" /> Comando
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 flex items-center gap-1">
                                      <Timer className="h-3 w-3" /> Espera
                                    </span>
                                  )}
                                </span>
                                <div className="flex items-center gap-0.5">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-5 w-5"
                                    disabled={idx === 0}
                                    onClick={() =>
                                      updateRoutineSteps(activeRoutine.id, (prev) => {
                                        const arr = [...prev];
                                        [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                                        return arr;
                                      })
                                    }
                                  >
                                    <ArrowUp className="h-2.5 w-2.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-5 w-5"
                                    disabled={idx === activeSteps.length - 1}
                                    onClick={() =>
                                      updateRoutineSteps(activeRoutine.id, (prev) => {
                                        const arr = [...prev];
                                        [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
                                        return arr;
                                      })
                                    }
                                  >
                                    <ArrowDown className="h-2.5 w-2.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-5 w-5"
                                    onClick={() =>
                                      updateRoutineSteps(activeRoutine.id, (prev) =>
                                        prev.filter((s) => s.id !== step.id),
                                      )
                                    }
                                  >
                                    <Trash2 className="h-3 w-3 text-rose-400" />
                                  </Button>
                                </div>
                              </div>

                              {step.kind === "path" ? (
                                <div className="flex items-center gap-1.5">
                                  {paths.length > 0 ? (
                                    <select
                                      value={step.pathName}
                                      onChange={(e) => {
                                        const chosen = paths.find((p) => p.name === e.target.value);
                                        updateRoutineSteps(activeRoutine.id, (prev) =>
                                          prev.map((s) =>
                                            s.id === step.id
                                              ? {
                                                  ...step,
                                                  pathName: e.target.value,
                                                  startX: chosen?.waypoints[0]?.anchor.x ?? step.startX,
                                                  startY: chosen?.waypoints[0]?.anchor.y ?? step.startY,
                                                  endX:
                                                    chosen?.waypoints[chosen.waypoints.length - 1]
                                                      ?.anchor.x ?? step.endX,
                                                  endY:
                                                    chosen?.waypoints[chosen.waypoints.length - 1]
                                                      ?.anchor.y ?? step.endY,
                                                }
                                              : s,
                                          ),
                                        );
                                      }}
                                      className="flex-1 h-7 rounded border border-[#22304a] bg-[#0f1624] px-2 text-xs font-mono text-white"
                                    >
                                      {!paths.some((p) => p.name === step.pathName) && (
                                        <option value={step.pathName}>{step.pathName}</option>
                                      )}
                                      {paths.map((p) => (
                                        <option key={p.id} value={p.name}>
                                          {p.name}.path
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <Input
                                      className="h-7 text-xs font-mono flex-1"
                                      value={step.pathName}
                                      onChange={(e) =>
                                        updateRoutineSteps(activeRoutine.id, (prev) =>
                                          prev.map((s) =>
                                            s.id === step.id
                                              ? { ...step, pathName: e.target.value }
                                              : s,
                                          ),
                                        )
                                      }
                                    />
                                  )}
                                </div>
                              ) : step.kind === "named" ? (
                                <div className="grid grid-cols-12 gap-1.5">
                                  <Input
                                    className="col-span-8 h-7 text-xs font-mono"
                                    value={step.commandName}
                                    onChange={(e) =>
                                      updateRoutineSteps(activeRoutine.id, (prev) =>
                                        prev.map((s) =>
                                          s.id === step.id
                                            ? { ...step, commandName: e.target.value }
                                            : s,
                                        ),
                                      )
                                    }
                                  />
                                  <Input
                                    type="number"
                                    step="0.2"
                                    min={0.1}
                                    className="col-span-4 h-7 text-xs font-mono"
                                    value={step.durationSec}
                                    onChange={(e) =>
                                      updateRoutineSteps(activeRoutine.id, (prev) =>
                                        prev.map((s) =>
                                          s.id === step.id
                                            ? {
                                                ...step,
                                                durationSec: Math.max(0.1, Number(e.target.value) || 0.1),
                                              }
                                            : s,
                                        ),
                                      )
                                    }
                                  />
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] text-slate-400">Duração (s):</span>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min={0.1}
                                    className="h-7 w-24 text-xs font-mono"
                                    value={step.seconds}
                                    onChange={(e) =>
                                      updateRoutineSteps(activeRoutine.id, (prev) =>
                                        prev.map((s) =>
                                          s.id === step.id
                                            ? {
                                                ...step,
                                                seconds: Math.max(0.1, Number(e.target.value) || 0.1),
                                              }
                                            : s,
                                        ),
                                      )
                                    }
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </TreeSection>

                    <TreeSection
                      title="AutoEngine & Arquivo"
                      open
                      onToggle={() => {}}
                    >
                      <div className="space-y-2.5">
                        <Field path={`autonomous.routines.${activeRoutine.id}.name`} label="Nome no Dashboard">
                          <Input
                            className="h-7 text-xs"
                            value={activeRoutine.name}
                            onChange={(e) =>
                              patchAuto((prev) => ({
                                ...prev,
                                routines: prev.routines.map((x) =>
                                  x.id === activeRoutine.id ? { ...x, name: e.target.value } : x,
                                ),
                              }))
                            }
                          />
                        </Field>
                        <div className="grid grid-cols-2 gap-2">
                          <Field
                            path={`autonomous.routines.${activeRoutine.id}.fileName`}
                            label="Arquivo (sem ext.)"
                          >
                            <Input
                              className="h-7 text-xs font-mono"
                              value={activeRoutine.fileName}
                              onChange={(e) =>
                                patchAuto((prev) => ({
                                  ...prev,
                                  routines: prev.routines.map((x) =>
                                    x.id === activeRoutine.id
                                      ? { ...x, fileName: e.target.value }
                                      : x,
                                  ),
                                }))
                              }
                            />
                          </Field>
                          <Field path={`autonomous.routines.${activeRoutine.id}.source`} label="Formato">
                            <Select
                              className="h-7 text-xs"
                              value={activeRoutine.source}
                              onChange={(e) =>
                                patchAuto((prev) => ({
                                  ...prev,
                                  routines: prev.routines.map((x) =>
                                    x.id === activeRoutine.id
                                      ? { ...x, source: e.target.value as AutoRoutineSource }
                                      : x,
                                  ),
                                }))
                              }
                            >
                              <option value="pathplanner">.auto</option>
                              <option value="choreo">.traj</option>
                            </Select>
                          </Field>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <Button
                            size="sm"
                            variant={auto.defaultAutoId === activeRoutine.id ? "secondary" : "outline"}
                            className="h-7 px-2.5 text-xs"
                            onClick={() =>
                              patchAuto((prev) => ({ ...prev, defaultAutoId: activeRoutine.id }))
                            }
                          >
                            <Flag className="h-3 w-3" />
                            {auto.defaultAutoId === activeRoutine.id
                              ? "Rotina Padrão"
                              : "Definir Padrão"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-xs text-rose-300 border-rose-500/40"
                            onClick={() =>
                              patchAuto((prev) => ({
                                ...prev,
                                routines: prev.routines.filter((x) => x.id !== activeRoutine.id),
                                defaultAutoId:
                                  prev.defaultAutoId === activeRoutine.id
                                    ? undefined
                                    : prev.defaultAutoId,
                              }))
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                            Excluir
                          </Button>
                        </div>
                      </div>
                    </TreeSection>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        /* ==================== CONFIG & CÓDIGO VIEW ==================== */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#22304a] bg-[#0f1624] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleScanLocalFolder} disabled={scanning}>
                <FolderSearch className="h-3.5 w-3.5" />
                {scanning ? "Lendo pasta..." : "Ler pasta conectada"}
              </Button>
              <input
                ref={importInputRef}
                type="file"
                multiple
                accept=".auto,.path,.traj"
                className="hidden"
                onChange={handleImportFiles}
              />
              <Button size="sm" variant="outline" onClick={() => importInputRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" />
                Importar .path / .auto / .traj
              </Button>
              <Button size="sm" variant="outline" onClick={generateCommandsFromSuperStructure}>
                <Wand2 className="h-3.5 w-3.5 text-sky-400" />
                Gerar NamedCommands da SuperStructure
              </Button>
            </div>
            {scanStatus && (
              <span
                className={`text-xs font-mono ${
                  scanStatus.tone === "ok" ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                {scanStatus.text}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            {/* NamedCommands & AutoBuilder / PID / AutoEngine */}
            <div className="xl:col-span-7 space-y-4">
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Link2 className="h-4 w-4 text-sky-400" />
                    NamedCommands → SuperStructure ({auto.namedCommands.length})
                    {tabIssues.commands > 0 && (
                      <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-300">
                        {tabIssues.commands} alerta(s)
                      </span>
                    )}
                  </CardTitle>
                  <Button size="sm" onClick={() => addNamedCommand()}>
                    <Plus className="h-3.5 w-3.5" />
                    Novo Comando
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {unmappedDiscovered.length > 0 && (
                    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-amber-200">
                        Não mapeados ({unmappedDiscovered.length}):{" "}
                        <span className="font-mono">{unmappedDiscovered.join(", ")}</span>
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {unmappedDiscovered.map((name) => (
                          <Button
                            key={name}
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => addNamedCommand(name)}
                          >
                            + Ligar {name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {auto.namedCommands.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Nenhum NamedCommand configurado ainda.
                    </p>
                  ) : (
                    auto.namedCommands.map((cmd) => (
                      <div
                        key={cmd.id}
                        className="rounded-xl border border-[#22304a] bg-[#0f1624] p-3 space-y-2.5"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
                          <div className="md:col-span-4">
                            <Field path={`autonomous.namedCommands.${cmd.id}.name`} label="NamedCommand">
                              <Input
                                value={cmd.name}
                                onChange={(e) =>
                                  patchAuto((prev) => ({
                                    ...prev,
                                    namedCommands: prev.namedCommands.map((x) =>
                                      x.id === cmd.id ? { ...x, name: e.target.value } : x,
                                    ),
                                  }))
                                }
                              />
                            </Field>
                          </div>
                          <div className="md:col-span-4">
                            <Field
                              path={`autonomous.namedCommands.${cmd.id}.request`}
                              label="RobotRequest"
                            >
                              <Select
                                value={cmd.request}
                                onChange={(e) =>
                                  patchAuto((prev) => ({
                                    ...prev,
                                    namedCommands: prev.namedCommands.map((x) =>
                                      x.id === cmd.id ? { ...x, request: e.target.value } : x,
                                    ),
                                  }))
                                }
                              >
                                {!superRequests.includes(cmd.request) && (
                                  <option value={cmd.request}>{cmd.request} (faltando)</option>
                                )}
                                {superRequests.map((req) => (
                                  <option key={req} value={req}>
                                    {req}
                                  </option>
                                ))}
                              </Select>
                            </Field>
                          </div>
                          <div className="md:col-span-3">
                            <Field
                              path={`autonomous.namedCommands.${cmd.id}.timeoutSec`}
                              label="Timeout (s)"
                            >
                              <Input
                                type="number"
                                step="0.1"
                                min="0.2"
                                max="15"
                                value={cmd.timeoutSec}
                                onChange={(e) =>
                                  patchAuto((prev) => ({
                                    ...prev,
                                    namedCommands: prev.namedCommands.map((x) =>
                                      x.id === cmd.id
                                        ? { ...x, timeoutSec: Number(e.target.value) || 0.2 }
                                        : x,
                                    ),
                                  }))
                                }
                              />
                            </Field>
                          </div>
                          <div className="md:col-span-1 flex justify-end">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                patchAuto((prev) => ({
                                  ...prev,
                                  namedCommands: prev.namedCommands.filter((x) => x.id !== cmd.id),
                                }))
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                            </Button>
                          </div>
                        </div>

                        <Field path={`autonomous.namedCommands.${cmd.id}.waitForGoal`}>
                          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={cmd.waitForGoal}
                              onChange={(e) =>
                                patchAuto((prev) => ({
                                  ...prev,
                                  namedCommands: prev.namedCommands.map((x) =>
                                    x.id === cmd.id ? { ...x, waitForGoal: e.target.checked } : x,
                                  ),
                                }))
                              }
                            />
                            Esperar SuperStructure atingir alvo (atGoal) antes de seguir para o próximo passo
                          </label>
                        </Field>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Sliders className="h-4 w-4 text-sky-400" />
                    AutoEngine, PIDs & Exportação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Field path="autonomous.chooserName" label="Chave AutoEngine">
                      <Input
                        value={auto.chooserName}
                        onChange={(e) =>
                          patchAuto((prev) => ({ ...prev, chooserName: e.target.value }))
                        }
                      />
                    </Field>
                    <Field path="autonomous.chooserSlots" label="Slots sequenciais (1–5)">
                      <Input
                        type="number"
                        min={1}
                        max={5}
                        value={auto.chooserSlots}
                        onChange={(e) =>
                          patchAuto((prev) => ({
                            ...prev,
                            chooserSlots: Math.min(5, Math.max(1, Number(e.target.value) || 1)),
                          }))
                        }
                      />
                    </Field>
                    <Field path="autonomous.defaultAutoId" label="Rotina Padrão">
                      <Select
                        value={auto.defaultAutoId ?? ""}
                        onChange={(e) =>
                          patchAuto((prev) => ({
                            ...prev,
                            defaultAutoId: e.target.value || undefined,
                          }))
                        }
                      >
                        <option value="">(None / Parado)</option>
                        {auto.routines.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-[#22304a] bg-[#0f1624] p-3 space-y-2.5">
                      <span className="font-mono text-xs font-semibold text-white">
                        Translation PID (X / Y)
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        <Field path="autonomous.translationPid.kP" label="kP">
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            value={auto.translationPid.kP}
                            onChange={(e) =>
                              patchAuto((prev) => ({
                                ...prev,
                                translationPid: {
                                  ...prev.translationPid,
                                  kP: Number(e.target.value) || 0,
                                },
                              }))
                            }
                          />
                        </Field>
                        <Field path="autonomous.translationPid.kI" label="kI">
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            value={auto.translationPid.kI}
                            onChange={(e) =>
                              patchAuto((prev) => ({
                                ...prev,
                                translationPid: {
                                  ...prev.translationPid,
                                  kI: Number(e.target.value) || 0,
                                },
                              }))
                            }
                          />
                        </Field>
                        <Field path="autonomous.translationPid.kD" label="kD">
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            value={auto.translationPid.kD}
                            onChange={(e) =>
                              patchAuto((prev) => ({
                                ...prev,
                                translationPid: {
                                  ...prev.translationPid,
                                  kD: Number(e.target.value) || 0,
                                },
                              }))
                            }
                          />
                        </Field>
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#22304a] bg-[#0f1624] p-3 space-y-2.5">
                      <span className="font-mono text-xs font-semibold text-white">
                        Rotation PID (Heading)
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        <Field path="autonomous.rotationPid.kP" label="kP">
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            value={auto.rotationPid.kP}
                            onChange={(e) =>
                              patchAuto((prev) => ({
                                ...prev,
                                rotationPid: {
                                  ...prev.rotationPid,
                                  kP: Number(e.target.value) || 0,
                                },
                              }))
                            }
                          />
                        </Field>
                        <Field path="autonomous.rotationPid.kI" label="kI">
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            value={auto.rotationPid.kI}
                            onChange={(e) =>
                              patchAuto((prev) => ({
                                ...prev,
                                rotationPid: {
                                  ...prev.rotationPid,
                                  kI: Number(e.target.value) || 0,
                                },
                              }))
                            }
                          />
                        </Field>
                        <Field path="autonomous.rotationPid.kD" label="kD">
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            value={auto.rotationPid.kD}
                            onChange={(e) =>
                              patchAuto((prev) => ({
                                ...prev,
                                rotationPid: {
                                  ...prev.rotationPid,
                                  kD: Number(e.target.value) || 0,
                                },
                              }))
                            }
                          />
                        </Field>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Field path="autonomous.generateSettingsJson">
                      <label className="flex items-start gap-2 rounded-xl border border-[#22304a] bg-[#0f1624] p-3 text-xs text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={auto.generateSettingsJson !== false}
                          onChange={(e) =>
                            patchAuto((prev) => ({ ...prev, generateSettingsJson: e.target.checked }))
                          }
                        />
                        <span>Gerar settings.json calibrado</span>
                      </label>
                    </Field>
                    <Field path="autonomous.useLocalADStarAK">
                      <label className="flex items-start gap-2 rounded-xl border border-[#22304a] bg-[#0f1624] p-3 text-xs text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={auto.useLocalADStarAK}
                          onChange={(e) =>
                            patchAuto((prev) => ({ ...prev, useLocalADStarAK: e.target.checked }))
                          }
                        />
                        <span>Usar LocalADStarAK</span>
                      </label>
                    </Field>
                    <Field path="autonomous.keepAutomationsInAuto">
                      <label className="flex items-start gap-2 rounded-xl border border-[#22304a] bg-[#0f1624] p-3 text-xs text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={auto.keepAutomationsInAuto}
                          onChange={(e) =>
                            patchAuto((prev) => ({
                              ...prev,
                              keepAutomationsInAuto: e.target.checked,
                            }))
                          }
                        />
                        <span>Manter sensores/zonas no Auto</span>
                      </label>
                    </Field>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Multi-File Code & JSON Preview */}
            <Card className="xl:col-span-5 overflow-hidden">
              <CardHeader className="border-b border-[#22304a] py-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Code2 className="h-4 w-4 text-sky-400" />
                  Arquivos Gerados ({autoGeneratedFiles.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {autoGeneratedFiles.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Ative o Drivetrain e Autônomos para gerar AutonomousSetup.java, settings.json, .path e .auto.
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-1.5 border-b border-[#22304a] bg-[#0f1624] px-3 py-2">
                      {autoGeneratedFiles.map((file) => {
                        const shortName = file.path.split("/").pop() ?? file.path;
                        const active = activeViewerFile?.path === file.path;
                        return (
                          <button
                            key={file.path}
                            type="button"
                            onClick={() => setSelectedFilePath(file.path)}
                            className={`rounded-md border px-2 py-1 font-mono text-[10px] cursor-pointer transition-colors ${
                              active
                                ? "border-[#60a5fa] bg-[#142c4f] text-white"
                                : "border-[#22304a] bg-[#0b111c] text-slate-400 hover:text-white"
                            }`}
                          >
                            {shortName}
                          </button>
                        );
                      })}
                    </div>
                    {activeViewerFile && (
                      <div className="h-[460px]">
                        <CodeViewer
                          filePath={activeViewerFile.path}
                          content={activeViewerFile.content}
                        />
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
