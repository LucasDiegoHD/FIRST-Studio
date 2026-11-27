"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Circle,
  Code2,
  Eye,
  Hexagon,
  ImagePlus,
  Layers,
  Magnet,
  MousePointer,
  Play,
  Plus,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Square,
  Trash2,
  Wind,
  X,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useProject } from "@/context/project-context";
import {
  clamp,
  evaluateRobotInZones,
  getRebuilt2026Landmarks,
  mirrorShape,
  REBUILT_ZONE_PRESETS,
  round2,
  shapeCenter,
  translateShape,
  type FieldRect,
  type RobotPose2d,
} from "@/lib/arena/rebuilt-2026";
import { toUpperSnake } from "@/lib/generator/java-utils";
import { isEditableTarget } from "@/lib/keyboard-shortcuts";
import type {
  FieldZone,
  ZoneMirror,
  ZonePoint,
  ZoneShape,
  ZoneType,
} from "@/lib/schema/ciprix-project";
import { CodeViewer } from "./code-viewer";

type ArenaMode = "edit" | "simulate";
type ArenaInnerTab = "zones" | "edit" | "presets";
type ToolMode = "select" | "rectangle" | "circle" | "polygon";

type DragAction =
  | { kind: "drawRect"; start: ZonePoint; current: ZonePoint }
  | { kind: "drawCircle"; center: ZonePoint; radius: number }
  | { kind: "moveZone"; zoneId: string; last: ZonePoint }
  | { kind: "rectCorner"; zoneId: string; corner: "p1" | "p2" }
  | { kind: "circleRadius"; zoneId: string }
  | { kind: "polyVertex"; zoneId: string; index: number }
  | { kind: "dragRobot" };

const ZONE_META: Record<
  ZoneType,
  {
    color: string;
    label: { pt: string; en: string };
    hint: { pt: string; en: string };
    icon: React.ReactNode;
  }
> = {
  trigger: {
    color: "#38bdf8",
    label: { pt: "Gatilho", en: "Trigger" },
    hint: {
      pt: "Dispara comandos automáticos ao entrar ou ficar dentro da área.",
      en: "Triggers automated commands when inside or entering.",
    },
    icon: <Zap className="h-3.5 w-3.5 text-sky-400" />,
  },
  suction: {
    color: "#34d399",
    label: { pt: "Sucção", en: "Suction" },
    hint: {
      pt: "Puxa o robô suavemente para o centro/eixo da zona (ex.: Trench).",
      en: "Gently pulls the robot toward the zone center (e.g. Trench).",
    },
    icon: <Magnet className="h-3.5 w-3.5 text-emerald-400" />,
  },
  repulsion: {
    color: "#fb923c",
    label: { pt: "Repulsão", en: "Repulsion" },
    hint: {
      pt: "Empurra o robô para longe de obstáculos como o Hub ou postes.",
      en: "Pushes the robot away from obstacles like the Hub.",
    },
    icon: <Wind className="h-3.5 w-3.5 text-orange-400" />,
  },
  speedLimit: {
    color: "#facc15",
    label: { pt: "Freio / Limite", en: "Speed Limit" },
    hint: {
      pt: "Reduz a velocidade máxima dentro da zona (ex.: subir o Bump).",
      en: "Caps max translation speed inside the zone (e.g. Bump).",
    },
    icon: <Layers className="h-3.5 w-3.5 text-yellow-400" />,
  },
  forbidden: {
    color: "#f43f5e",
    label: { pt: "Proibida", en: "Forbidden" },
    hint: {
      pt: "Repulsão forte + aviso de alerta persistente no Driver Station.",
      en: "Strong repulsion + persistent Driver Station alert.",
    },
    icon: <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />,
  },
};

export function ArenaTab() {
  const { project, generatedFiles, updateProject, setActiveTab, locale } = useProject();
  const fieldL = project.project.fieldLengthMeters;
  const fieldW = project.project.fieldWidthMeters;
  const zones = useMemo(() => project.zones ?? [], [project.zones]);

  const [mode, setMode] = useState<ArenaMode>("edit");
  const [innerTab, setInnerTab] = useState<ArenaInnerTab>(
    zones.length > 0 ? "zones" : "presets",
  );
  const [tool, setTool] = useState<ToolMode>("select");
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showMirror, setShowMirror] = useState(true);
  const [showRebuilt, setShowRebuilt] = useState(true);
  const [showJava, setShowJava] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(
    zones[0]?.id ?? null,
  );
  const [polyDraft, setPolyDraft] = useState<ZonePoint[]>([]);
  const [cursorField, setCursorField] = useState<ZonePoint | null>(null);
  const [drag, setDrag] = useState<DragAction | null>(null);
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState(0.5);

  // Simulation state (REBUILT 2026)
  const [simAlliance, setSimAlliance] = useState<"Blue" | "Red">(
    project.project.defaultAlliance,
  );
  const [robotPose, setRobotPose] = useState<RobotPose2d>(() => ({
    x: round2(Math.min(2.2, fieldL * 0.15)),
    y: round2(fieldW / 2),
    thetaRad: 0,
  }));
  const pressedKeysRef = useRef<Set<string>>(new Set());

  const svgRef = useRef<SVGSVGElement | null>(null);
  const bgInputRef = useRef<HTMLInputElement | null>(null);

  const activeZoneId = zones.some((z) => z.id === selectedZoneId)
    ? selectedZoneId
    : (zones[0]?.id ?? null);
  const selectedZone = zones.find((z) => z.id === activeZoneId) ?? null;

  const landmarks = useMemo(
    () => getRebuilt2026Landmarks(fieldL, fieldW),
    [fieldL, fieldW],
  );

  const simEval = useMemo(
    () => evaluateRobotInZones(zones, robotPose, simAlliance, fieldL, fieldW),
    [zones, robotPose, simAlliance, fieldL, fieldW],
  );

  useEffect(() => {
    return () => {
      if (bgImageUrl) URL.revokeObjectURL(bgImageUrl);
    };
  }, [bgImageUrl]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPolyDraft([]);
        setDrag(null);
        return;
      }
      if (mode === "simulate" && !isEditableTarget(e.target)) {
        const k = e.key.toLowerCase();
        if (
          ["w", "a", "s", "d", "q", "e", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(
            k,
          )
        ) {
          e.preventDefault();
          pressedKeysRef.current.add(k);
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      pressedKeysRef.current.delete(e.key.toLowerCase());
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "simulate") return;
    let rafId = 0;
    let lastTs = performance.now();
    const maxSpeed = project.drivetrain?.maxSpeedMps ?? 4.2;

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      const keys = pressedKeysRef.current;

      let ix = 0;
      let iy = 0;
      let omega = 0;
      if (keys.has("d") || keys.has("arrowright")) ix += 1;
      if (keys.has("a") || keys.has("arrowleft")) ix -= 1;
      if (keys.has("w") || keys.has("arrowup")) iy += 1;
      if (keys.has("s") || keys.has("arrowdown")) iy -= 1;
      if (keys.has("q")) omega += 2.6;
      if (keys.has("e")) omega -= 2.6;

      if (ix !== 0 || iy !== 0 || omega !== 0) {
        const mag = Math.hypot(ix, iy) || 1;
        ix /= mag;
        iy /= mag;
        setRobotPose((prev) => {
          const ev = evaluateRobotInZones(zones, prev, simAlliance, fieldL, fieldW);
          const vx = (ix + ev.forceVec.x) * maxSpeed * ev.speedFactor;
          const vy = (iy + ev.forceVec.y) * maxSpeed * ev.speedFactor;
          return {
            x: round2(clamp(prev.x + vx * dt, 0.42, fieldL - 0.42)),
            y: round2(clamp(prev.y + vy * dt, 0.42, fieldW - 0.42)),
            thetaRad: prev.thetaRad + omega * dt,
          };
        });
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [mode, zones, simAlliance, fieldL, fieldW, project.drivetrain?.maxSpeedMps]);

  const toFieldPoint = useCallback(
    (clientX: number, clientY: number, useSnap = true): ZonePoint | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const local = pt.matrixTransform(ctm.inverse());
      const rawX = clamp(local.x, 0, fieldL);
      const rawY = clamp(fieldW - local.y, 0, fieldW);
      const snap = (v: number) =>
        useSnap && snapEnabled ? Math.round(v / 0.05) * 0.05 : v;
      return {
        x: round2(clamp(snap(rawX), 0, fieldL)),
        y: round2(clamp(snap(rawY), 0, fieldW)),
      };
    },
    [fieldL, fieldW, snapEnabled],
  );

  const uniqueZoneName = useCallback(
    (baseName: string) => {
      const used = new Set(zones.map((z) => z.name.toUpperCase()));
      if (!used.has(baseName)) return baseName;
      let idx = 2;
      while (used.has(`${baseName}_${idx}`)) idx += 1;
      return `${baseName}_${idx}`;
    },
    [zones],
  );

  const addZoneObject = useCallback(
    (partial: Omit<FieldZone, "id">, openEditor = true) => {
      const id = `zone-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
      const next: FieldZone = {
        ...partial,
        id,
        name: uniqueZoneName(partial.name),
      };
      updateProject((prev) => ({
        ...prev,
        zones: [...(prev.zones ?? []), next],
      }));
      setSelectedZoneId(id);
      setTool("select");
      if (openEditor) setInnerTab("edit");
    },
    [uniqueZoneName, updateProject],
  );

  const createZone = useCallback(
    (shape: ZoneShape, defaultType: ZoneType = "trigger") => {
      addZoneObject({
        name: `ZONE_${zones.length + 1}`,
        type: defaultType,
        shape,
        mirror: "both",
        colorHex: ZONE_META[defaultType].color,
      });
    },
    [addZoneObject, zones.length],
  );

  const updateZone = useCallback(
    (zoneId: string, updater: (prev: FieldZone) => FieldZone) => {
      updateProject((prev) => ({
        ...prev,
        zones: (prev.zones ?? []).map((z) => (z.id === zoneId ? updater(z) : z)),
      }));
    },
    [updateProject],
  );

  const deleteZone = useCallback(
    (zoneId: string) => {
      updateProject((prev) => ({
        ...prev,
        zones: (prev.zones ?? []).filter((z) => z.id !== zoneId),
      }));
      if (selectedZoneId === zoneId) setSelectedZoneId(null);
    },
    [selectedZoneId, updateProject],
  );

  const finishPolygon = useCallback(
    (pts: ZonePoint[]) => {
      if (pts.length < 3) return;
      createZone({ kind: "polygon", vertices: pts });
      setPolyDraft([]);
    },
    [createZone],
  );

  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (mode !== "edit") return;
    const p = toFieldPoint(e.clientX, e.clientY);
    if (!p) return;

    if (tool === "rectangle") {
      setDrag({ kind: "drawRect", start: p, current: p });
    } else if (tool === "circle") {
      setDrag({ kind: "drawCircle", center: p, radius: 0.25 });
    } else if (tool === "polygon") {
      if (polyDraft.length >= 3) {
        const first = polyDraft[0];
        if (Math.hypot(p.x - first.x, p.y - first.y) <= 0.25) {
          finishPolygon(polyDraft);
          return;
        }
      }
      setPolyDraft((prev) => [...prev, p]);
    }
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const p = toFieldPoint(e.clientX, e.clientY, mode === "edit");
    if (!p) return;
    setCursorField(p);
    if (!drag) return;

    if (drag.kind === "dragRobot") {
      setRobotPose((prev) => ({
        ...prev,
        x: round2(clamp(p.x, 0.42, fieldL - 0.42)),
        y: round2(clamp(p.y, 0.42, fieldW - 0.42)),
      }));
    } else if (drag.kind === "drawRect") {
      setDrag({ ...drag, current: p });
    } else if (drag.kind === "drawCircle") {
      const r = round2(Math.max(0.1, Math.hypot(p.x - drag.center.x, p.y - drag.center.y)));
      setDrag({ ...drag, radius: r });
    } else if (drag.kind === "moveZone") {
      const dx = p.x - drag.last.x;
      const dy = p.y - drag.last.y;
      if (dx === 0 && dy === 0) return;
      updateZone(drag.zoneId, (z) => ({
        ...z,
        shape: translateShape(z.shape, dx, dy, fieldL, fieldW),
      }));
      setDrag({ ...drag, last: p });
    } else if (drag.kind === "rectCorner") {
      updateZone(drag.zoneId, (z) => {
        if (z.shape.kind !== "rectangle") return z;
        return {
          ...z,
          shape:
            drag.corner === "p1"
              ? { ...z.shape, x1: p.x, y1: p.y }
              : { ...z.shape, x2: p.x, y2: p.y },
        };
      });
    } else if (drag.kind === "circleRadius") {
      updateZone(drag.zoneId, (z) => {
        if (z.shape.kind !== "circle") return z;
        const r = round2(Math.max(0.1, Math.hypot(p.x - z.shape.cx, p.y - z.shape.cy)));
        return { ...z, shape: { ...z.shape, radius: r } };
      });
    } else if (drag.kind === "polyVertex") {
      updateZone(drag.zoneId, (z) => {
        if (z.shape.kind !== "polygon") return z;
        return {
          ...z,
          shape: {
            kind: "polygon",
            vertices: z.shape.vertices.map((v, idx) => (idx === drag.index ? p : v)),
          },
        };
      });
    }
  };

  const handleSvgMouseUp = () => {
    if (!drag) return;
    if (drag.kind === "drawRect") {
      const w = Math.abs(drag.current.x - drag.start.x);
      const h = Math.abs(drag.current.y - drag.start.y);
      if (w >= 0.1 && h >= 0.1) {
        createZone({
          kind: "rectangle",
          x1: Math.min(drag.start.x, drag.current.x),
          y1: Math.min(drag.start.y, drag.current.y),
          x2: Math.max(drag.start.x, drag.current.x),
          y2: Math.max(drag.start.y, drag.current.y),
        });
      }
    } else if (drag.kind === "drawCircle") {
      if (drag.radius >= 0.1) {
        createZone({
          kind: "circle",
          cx: drag.center.x,
          cy: drag.center.y,
          radius: drag.radius,
        });
      }
    }
    setDrag(null);
  };

  const fieldZonesFile = useMemo(
    () => generatedFiles.find((f) => f.path.endsWith("/field/FieldZones.java")) ?? null,
    [generatedFiles],
  );

  const svgRect = (
    r: FieldRect,
    props: React.SVGProps<SVGRectElement>,
  ) => (
    <rect
      x={Math.min(r.x1, r.x2)}
      y={fieldW - Math.max(r.y1, r.y2)}
      width={Math.abs(r.x2 - r.x1)}
      height={Math.abs(r.y2 - r.y1)}
      {...props}
    />
  );

  const renderShapeSvg = (
    shape: ZoneShape,
    color: string,
    opts: {
      dashed?: boolean;
      selected?: boolean;
      activeSim?: boolean;
      label?: string;
    },
  ) => {
    const strokeDasharray = opts.dashed ? "0.22 0.14" : undefined;
    const fillOpacity = opts.dashed
      ? 0.08
      : opts.activeSim
        ? 0.42
        : opts.selected
          ? 0.3
          : 0.18;
    const strokeWidth = opts.activeSim ? 0.085 : opts.selected ? 0.065 : 0.04;
    const center = shapeCenter(shape);

    return (
      <>
        {shape.kind === "rectangle" &&
          svgRect(shape, {
            rx: 0.06,
            fill: color,
            fillOpacity,
            stroke: color,
            strokeWidth,
            strokeDasharray,
          })}
        {shape.kind === "circle" && (
          <circle
            cx={shape.cx}
            cy={fieldW - shape.cy}
            r={shape.radius}
            fill={color}
            fillOpacity={fillOpacity}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
          />
        )}
        {shape.kind === "polygon" && (
          <polygon
            points={shape.vertices.map((v) => `${v.x},${fieldW - v.y}`).join(" ")}
            fill={color}
            fillOpacity={fillOpacity}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
          />
        )}
        {opts.label && (
          <g className="pointer-events-none select-none">
            <rect
              x={center.x - Math.max(0.75, opts.label.length * 0.095)}
              y={fieldW - center.y - 0.24}
              width={Math.max(1.5, opts.label.length * 0.19)}
              height={0.48}
              rx={0.1}
              fill="#0b0f17"
              fillOpacity={0.78}
              stroke={color}
              strokeOpacity={0.6}
              strokeWidth={0.025}
            />
            <text
              x={center.x}
              y={fieldW - center.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#f8fafc"
              fontSize={0.27}
              fontFamily="monospace"
              fontWeight={700}
            >
              {opts.label}
            </text>
          </g>
        )}
      </>
    );
  };

  const gridLinesX = useMemo(() => {
    const xs: number[] = [];
    for (let x = 1; x < fieldL; x += 1) xs.push(x);
    return xs;
  }, [fieldL]);

  const gridLinesY = useMemo(() => {
    const ys: number[] = [];
    for (let y = 1; y < fieldW; y += 1) ys.push(y);
    return ys;
  }, [fieldW]);

  const modeSwitcher = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-lg border border-[#22304a] bg-[#0f1624] p-1">
        <button
          type="button"
          onClick={() => {
            setMode("edit");
            setDrag(null);
          }}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium cursor-pointer transition-all ${
            mode === "edit"
              ? "bg-[#142c4f] border border-[#60a5fa]/70 text-white shadow-sm"
              : "border border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <MousePointer className="h-3.5 w-3.5" />
          {locale === "pt" ? "Editar Zonas" : "Edit Zones"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("simulate");
            setPolyDraft([]);
            setDrag(null);
          }}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium cursor-pointer transition-all ${
            mode === "simulate"
              ? "bg-[#142c4f] border border-[#60a5fa]/70 text-white shadow-sm"
              : "border border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Play className="h-3.5 w-3.5 text-emerald-400" />
          {locale === "pt" ? "Simular REBUILT 2026" : "Simulate REBUILT 2026"}
        </button>
      </div>
      {fieldZonesFile && (
        <Button
          size="sm"
          variant={showJava ? "secondary" : "outline"}
          className="h-8 px-2.5 text-xs"
          onClick={() => setShowJava((v) => !v)}
        >
          <Code2 className="h-3.5 w-3.5" />
          FieldZones.java
        </Button>
      )}
    </div>
  );

  const renderOctagonHub = (
    key: string,
    rect: FieldRect,
    alliance: "Blue" | "Red",
  ) => {
    const minX = Math.min(rect.x1, rect.x2);
    const maxX = Math.max(rect.x1, rect.x2);
    const minY = fieldW - Math.max(rect.y1, rect.y2);
    const maxY = fieldW - Math.min(rect.y1, rect.y2);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const w = maxX - minX;
    const h = maxY - minY;
    const c = Math.min(w, h) * 0.22;
    const pts = [
      `${minX + c},${minY}`,
      `${maxX - c},${minY}`,
      `${maxX},${minY + c}`,
      `${maxX},${maxY - c}`,
      `${maxX - c},${maxY}`,
      `${minX + c},${maxY}`,
      `${minX},${maxY - c}`,
      `${minX},${minY + c}`,
    ].join(" ");
    const stroke = alliance === "Blue" ? "#60a5fa" : "#f87171";
    const fill = alliance === "Blue" ? "#172e6e" : "#6b1520";
    const ring = alliance === "Blue" ? "#93c5fd" : "#fca5a5";
    return (
      <g key={key} className="pointer-events-none">
        <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={0.05} />
        <circle
          cx={cx}
          cy={cy}
          r={Math.min(w, h) * 0.34}
          fill="#090f1c"
          stroke={ring}
          strokeWidth={0.035}
        />
        <circle
          cx={cx}
          cy={cy}
          r={Math.min(w, h) * 0.19}
          fill="none"
          stroke={stroke}
          strokeOpacity={0.45}
          strokeWidth={0.025}
          strokeDasharray="0.08 0.06"
        />
        {/* Cardinal AprilTag markers */}
        <rect x={minX - 0.02} y={cy - 0.08} width={0.04} height={0.16} fill="#f8fafc" fillOpacity={0.85} />
        <rect x={maxX - 0.02} y={cy - 0.08} width={0.04} height={0.16} fill="#f8fafc" fillOpacity={0.85} />
        <rect x={cx - 0.08} y={minY - 0.02} width={0.16} height={0.04} fill="#f8fafc" fillOpacity={0.85} />
        <rect x={cx - 0.08} y={maxY - 0.02} width={0.16} height={0.04} fill="#f8fafc" fillOpacity={0.85} />
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#f8fafc"
          fontSize={0.2}
          fontFamily="monospace"
          fontWeight={700}
        >
          HUB
        </text>
      </g>
    );
  };

  const renderVerticalWallZone = (
    key: string,
    rect: FieldRect,
    label: string,
    alliance: "Blue" | "Red",
    stroke: string,
    fill: string,
    textOffsetX = 0,
    extra?: React.ReactNode,
  ) => {
    const cx = (rect.x1 + rect.x2) / 2 + textOffsetX;
    const cy = fieldW - (rect.y1 + rect.y2) / 2;
    const rot = alliance === "Blue" ? -90 : 90;
    return (
      <g key={key} className="pointer-events-none">
        {svgRect(rect, {
          rx: 0.05,
          fill,
          fillOpacity: 0.9,
          stroke,
          strokeWidth: 0.04,
        })}
        {extra}
        <text
          x={cx}
          y={cy}
          transform={`rotate(${rot} ${cx} ${cy})`}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#e2e8f0"
          fillOpacity={0.92}
          fontSize={0.175}
          fontFamily="monospace"
          fontWeight={700}
          letterSpacing={0.02}
        >
          {label}
        </text>
      </g>
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={locale === "pt" ? "Arena 2026 · REBUILT" : "Arena 2026 · REBUILT"}
        description={
          locale === "pt"
            ? "Desenhe ou use modelos prontos do campo oficial (16,54 m × 8,07 m) e teste seu robô ao vivo."
            : "Draw or apply 2026 REBUILT field presets (16.54 m × 8.07 m) and test your robot live."
        }
        actions={modeSwitcher}
      />

      {!project.drivetrain?.enabled && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              {locale === "pt"
                ? "Drivetrain desativado no projeto: você já pode simular aqui, mas ative a tração na aba Robô para rodar FieldZones no robô real."
                : "Drivetrain is disabled: you can simulate here, and enable a drivetrain in the Robot tab to wire FieldZones to your real robot."}
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={() => setActiveTab("subsystems")}>
            {locale === "pt" ? "Ativar Drivetrain" : "Enable Drivetrain"}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left: Blueprint Stage */}
        <Card className="xl:col-span-8 overflow-hidden bg-[#0b0f17] border-[#22304a]">
          {/* Compact Blueprint Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#22304a] bg-[#0f1624]/95 px-4 py-2.5">
            {mode === "edit" ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: "select", label: "Mover", icon: <MousePointer className="h-3.5 w-3.5" /> },
                    { id: "rectangle", label: "Retângulo", icon: <Square className="h-3.5 w-3.5" /> },
                    { id: "circle", label: "Círculo", icon: <Circle className="h-3.5 w-3.5" /> },
                    { id: "polygon", label: "Polígono", icon: <Hexagon className="h-3.5 w-3.5" /> },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setTool(item.id);
                      setPolyDraft([]);
                    }}
                    className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium cursor-pointer transition-all ${
                      tool === item.id
                        ? "border-[#60a5fa]/80 bg-[#142c4f] text-white shadow-sm"
                        : "border-[#22304a] bg-[#0b0f17] text-slate-300 hover:border-[#3b6bb5] hover:text-white"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
                {tool === "polygon" && polyDraft.length >= 3 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 px-2.5 text-xs text-emerald-300"
                    onClick={() => finishPolygon(polyDraft)}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Fechar ({polyDraft.length})
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-md border border-[#22304a] bg-[#0b0f17] p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setSimAlliance("Blue");
                      setRobotPose({
                        x: round2(Math.min(2.2, fieldL * 0.15)),
                        y: round2(fieldW / 2),
                        thetaRad: 0,
                      });
                    }}
                    className={`rounded px-2.5 py-1 font-medium cursor-pointer transition-colors ${
                      simAlliance === "Blue"
                        ? "bg-blue-600/80 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Aliança Azul
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSimAlliance("Red");
                      setRobotPose({
                        x: round2(Math.max(fieldL - 2.2, fieldL * 0.85)),
                        y: round2(fieldW / 2),
                        thetaRad: Math.PI,
                      });
                    }}
                    className={`rounded px-2.5 py-1 font-medium cursor-pointer transition-colors ${
                      simAlliance === "Red"
                        ? "bg-rose-600/80 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Aliança Vermelha
                  </button>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={() =>
                    setRobotPose({
                      x:
                        simAlliance === "Blue"
                          ? round2(Math.min(2.2, fieldL * 0.15))
                          : round2(Math.max(fieldL - 2.2, fieldL * 0.85)),
                      y: round2(fieldW / 2),
                      thetaRad: simAlliance === "Blue" ? 0 : Math.PI,
                    })
                  }
                >
                  <RotateCcw className="h-3 w-3" />
                  Resetar
                </Button>
                <Badge variant="outline" className="font-mono text-[11px]">
                  Zones/Current: {simEval.currentZone?.name ?? "NONE"}
                </Badge>
                {simEval.speedFactor < 1 && (
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 font-mono text-[11px]">
                    Vel ×{simEval.speedFactor.toFixed(2)}
                  </Badge>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                size="sm"
                variant={showRebuilt ? "secondary" : "outline"}
                className="h-7 px-2 text-[11px]"
                onClick={() => setShowRebuilt((v) => !v)}
              >
                REBUILT 2026
              </Button>
              {mode === "edit" && (
                <Button
                  size="sm"
                  variant={snapEnabled ? "secondary" : "outline"}
                  className="h-7 px-2 text-[11px]"
                  onClick={() => setSnapEnabled((v) => !v)}
                >
                  {snapEnabled ? "Snap 5cm" : "Livre"}
                </Button>
              )}
              <Button
                size="sm"
                variant={showMirror ? "secondary" : "outline"}
                className="h-7 px-2 text-[11px]"
                onClick={() => setShowMirror((v) => !v)}
              >
                <Eye className="h-3 w-3" />
                Espelho
              </Button>
              <input
                ref={bgInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (bgImageUrl) URL.revokeObjectURL(bgImageUrl);
                  setBgImageUrl(URL.createObjectURL(file));
                  e.target.value = "";
                }}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[11px]"
                onClick={() => bgInputRef.current?.click()}
              >
                <ImagePlus className="h-3 w-3" />
                Imagem
              </Button>
              {bgImageUrl && (
                <>
                  <input
                    type="range"
                    min={15}
                    max={95}
                    step={5}
                    value={Math.round(bgOpacity * 100)}
                    onChange={(e) => setBgOpacity(Number(e.target.value) / 100)}
                    className="w-12"
                    title="Opacidade da imagem"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => {
                      URL.revokeObjectURL(bgImageUrl);
                      setBgImageUrl(null);
                    }}
                  >
                    <X className="h-3 w-3 text-slate-400" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {mode === "simulate" && simEval.forbiddenAlerts.length > 0 && (
            <div className="flex items-center gap-2 border-b border-rose-500/40 bg-rose-950/70 px-4 py-2 text-xs text-rose-200 animate-pulse">
              <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />
              <span className="font-mono font-semibold">PersistentAlert:</span>
              <span>{simEval.forbiddenAlerts[0]}</span>
            </div>
          )}

          <CardContent className="p-3.5 space-y-3">
            <div className="rounded-xl border border-[#1e2d48] bg-[#070b12] p-2 shadow-inner">
              <svg
                ref={svgRef}
                viewBox={`-1.1 -0.42 ${fieldL + 1.92} ${fieldW + 0.94}`}
                onMouseDown={handleSvgMouseDown}
                onMouseMove={handleSvgMouseMove}
                onMouseUp={handleSvgMouseUp}
                onMouseLeave={() => {
                  setCursorField(null);
                  if (drag) handleSvgMouseUp();
                }}
                onDoubleClick={() => {
                  if (mode === "edit" && tool === "polygon" && polyDraft.length >= 3) {
                    finishPolygon(polyDraft);
                  }
                }}
                className={`w-full h-auto block select-none ${
                  mode === "simulate"
                    ? "cursor-grab"
                    : tool === "select"
                      ? "cursor-default"
                      : "cursor-crosshair"
                }`}
              >
                <defs>
                  <linearGradient id="carpet-grad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#0f1b38" />
                    <stop offset="25%" stopColor="#0b1322" />
                    <stop offset="75%" stopColor="#0b1322" />
                    <stop offset="100%" stopColor="#26111c" />
                  </linearGradient>
                  <linearGradient id="blue-bump-grad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#172554" />
                    <stop offset="50%" stopColor="#2563eb" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#172554" />
                  </linearGradient>
                  <linearGradient id="red-bump-grad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#450a0a" />
                    <stop offset="50%" stopColor="#dc2626" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#450a0a" />
                  </linearGradient>
                  <marker
                    id="force-arrow-suction"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="4"
                    markerHeight="4"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#34d399" />
                  </marker>
                  <marker
                    id="force-arrow-repel"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="4"
                    markerHeight="4"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#fb7185" />
                  </marker>
                </defs>

                {/* Carpet base */}
                <rect x={0} y={0} width={fieldL} height={fieldW} fill="url(#carpet-grad)" />

                {/* Alliance Zones soft tint + watermarks */}
                {showRebuilt && (
                  <g className="pointer-events-none select-none">
                    <rect
                      x={0}
                      y={0}
                      width={landmarks.blueAllianceLineX}
                      height={fieldW}
                      fill="#1d4ed8"
                      fillOpacity={0.07}
                    />
                    <rect
                      x={landmarks.redAllianceLineX}
                      y={0}
                      width={fieldL - landmarks.redAllianceLineX}
                      height={fieldW}
                      fill="#dc2626"
                      fillOpacity={0.07}
                    />
                    <text
                      x={landmarks.blueAllianceLineX * 0.52}
                      y={0.42}
                      textAnchor="middle"
                      fill="#60a5fa"
                      fillOpacity={0.35}
                      fontSize={0.22}
                      fontFamily="monospace"
                      fontWeight={700}
                    >
                      BLUE ALLIANCE
                    </text>
                    <text
                      x={(fieldL + landmarks.redAllianceLineX) / 2 - 0.1}
                      y={0.42}
                      textAnchor="middle"
                      fill="#f87171"
                      fillOpacity={0.35}
                      fontSize={0.22}
                      fontFamily="monospace"
                      fontWeight={700}
                    >
                      RED ALLIANCE
                    </text>
                  </g>
                )}

                {bgImageUrl && (
                  <image
                    href={bgImageUrl}
                    x={0}
                    y={0}
                    width={fieldL}
                    height={fieldW}
                    preserveAspectRatio="none"
                    opacity={bgOpacity}
                  />
                )}

                {/* 1m Grid & Metric Rulers */}
                <text
                  x={0}
                  y={fieldW + 0.3}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize={0.2}
                  fontFamily="monospace"
                >
                  0m
                </text>
                {gridLinesX.map((x) => (
                  <g key={`gx-${x}`}>
                    <line
                      x1={x}
                      y1={0}
                      x2={x}
                      y2={fieldW}
                      stroke="#1e2d4a"
                      strokeOpacity={0.7}
                      strokeWidth={0.02}
                    />
                    {x % 2 === 0 && (
                      <>
                        <line
                          x1={x}
                          y1={fieldW}
                          x2={x}
                          y2={fieldW + 0.1}
                          stroke="#475569"
                          strokeWidth={0.025}
                        />
                        <text
                          x={x}
                          y={fieldW + 0.3}
                          textAnchor="middle"
                          fill="#64748b"
                          fontSize={0.2}
                          fontFamily="monospace"
                        >
                          {x}m
                        </text>
                      </>
                    )}
                  </g>
                ))}
                {gridLinesY.map((y) => (
                  <g key={`gy-${y}`}>
                    <line
                      x1={0}
                      y1={fieldW - y}
                      x2={fieldL}
                      y2={fieldW - y}
                      stroke="#1e2d4a"
                      strokeOpacity={0.7}
                      strokeWidth={0.02}
                    />
                    {y % 2 === 0 && (
                      <>
                        <line
                          x1={-0.68}
                          y1={fieldW - y}
                          x2={-0.6}
                          y2={fieldW - y}
                          stroke="#475569"
                          strokeWidth={0.025}
                        />
                        <text
                          x={-0.88}
                          y={fieldW - y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#64748b"
                          fontSize={0.2}
                          fontFamily="monospace"
                        >
                          {y}m
                        </text>
                      </>
                    )}
                  </g>
                ))}

                {/* 2026 REBUILT Field Elements */}
                {showRebuilt && (
                  <g className="pointer-events-none select-none">
                    {/* Driver Station Bays */}
                    {[0, 1, 2].map((slot) => {
                      const slotY = (fieldW / 3) * slot + fieldW / 6;
                      return (
                        <g key={`ds-${slot}`}>
                          <rect
                            x={-0.52}
                            y={slotY - 0.55}
                            width={0.34}
                            height={1.1}
                            rx={0.05}
                            fill="#0f1f44"
                            stroke="#3b82f6"
                            strokeOpacity={0.55}
                            strokeWidth={0.03}
                          />
                          <text
                            x={-0.35}
                            y={slotY}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill="#93c5fd"
                            fontSize={0.18}
                            fontFamily="monospace"
                            fontWeight={700}
                          >
                            B{3 - slot}
                          </text>
                          <rect
                            x={fieldL + 0.18}
                            y={slotY - 0.55}
                            width={0.34}
                            height={1.1}
                            rx={0.05}
                            fill="#3f101a"
                            stroke="#ef4444"
                            strokeOpacity={0.55}
                            strokeWidth={0.03}
                          />
                          <text
                            x={fieldL + 0.35}
                            y={slotY}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill="#fca5a5"
                            fontSize={0.18}
                            fontFamily="monospace"
                            fontWeight={700}
                          >
                            R{slot + 1}
                          </text>
                        </g>
                      );
                    })}

                    {/* Alliance starting lines & center line */}
                    <line
                      x1={landmarks.blueAllianceLineX}
                      y1={0}
                      x2={landmarks.blueAllianceLineX}
                      y2={fieldW}
                      stroke="#3b82f6"
                      strokeOpacity={0.45}
                      strokeWidth={0.04}
                    />
                    <line
                      x1={landmarks.redAllianceLineX}
                      y1={0}
                      x2={landmarks.redAllianceLineX}
                      y2={fieldW}
                      stroke="#ef4444"
                      strokeOpacity={0.45}
                      strokeWidth={0.04}
                    />
                    <line
                      x1={landmarks.centerX}
                      y1={0}
                      x2={landmarks.centerX}
                      y2={fieldW}
                      stroke="#334155"
                      strokeWidth={0.04}
                      strokeDasharray="0.24 0.18"
                    />

                    {/* Neutral Zone FUEL cluster (4 x 6 symmetrical grid) */}
                    {svgRect(landmarks.neutralFuelZone, {
                      rx: 0.14,
                      fill: "#eab308",
                      fillOpacity: 0.045,
                      stroke: "#eab308",
                      strokeOpacity: 0.28,
                      strokeWidth: 0.03,
                      strokeDasharray: "0.18 0.14",
                    })}
                    {[0, 1, 2, 3, 4, 5].map((row) =>
                      [-0.48, -0.16, 0.16, 0.48].map((dx, col) => (
                        <circle
                          key={`nf-${row}-${col}`}
                          cx={landmarks.centerX + dx}
                          cy={fieldW / 2 - 1.5 + row * 0.6}
                          r={0.075}
                          fill="#facc15"
                          fillOpacity={0.62}
                          stroke="#fef08a"
                          strokeOpacity={0.45}
                          strokeWidth={0.018}
                        />
                      )),
                    )}
                    <text
                      x={landmarks.centerX}
                      y={0.42}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fillOpacity={0.55}
                      fontSize={0.22}
                      fontFamily="monospace"
                      fontWeight={700}
                    >
                      NEUTRAL ZONE · FUEL
                    </text>

                    {/* Trenches (gantry pass-throughs with 4 corner pillars) */}
                    {landmarks.blueTrenches.map((t, i) => {
                      const cx = (t.x1 + t.x2) / 2;
                      const cy = fieldW - (t.y1 + t.y2) / 2;
                      const topY = fieldW - Math.max(t.y1, t.y2);
                      const botY = fieldW - Math.min(t.y1, t.y2);
                      return (
                        <g key={`blue-trench-${i}`}>
                          {svgRect(t, {
                            rx: 0.05,
                            fill: "#0d1b36",
                            stroke: "#60a5fa",
                            strokeWidth: 0.04,
                          })}
                          <line x1={t.x1} y1={topY + 0.12} x2={t.x2} y2={topY + 0.12} stroke="#93c5fd" strokeOpacity={0.45} strokeWidth={0.05} />
                          <line x1={t.x1} y1={botY - 0.12} x2={t.x2} y2={botY - 0.12} stroke="#93c5fd" strokeOpacity={0.45} strokeWidth={0.05} />
                          <line x1={t.x1 + 0.1} y1={cy} x2={t.x2 - 0.1} y2={cy} stroke="#3b82f6" strokeOpacity={0.35} strokeWidth={0.025} strokeDasharray="0.14 0.1" />
                          <rect x={t.x1 + 0.04} y={topY + 0.04} width={0.12} height={0.12} fill="#93c5fd" fillOpacity={0.75} />
                          <rect x={t.x2 - 0.16} y={topY + 0.04} width={0.12} height={0.12} fill="#93c5fd" fillOpacity={0.75} />
                          <rect x={t.x1 + 0.04} y={botY - 0.16} width={0.12} height={0.12} fill="#93c5fd" fillOpacity={0.75} />
                          <rect x={t.x2 - 0.16} y={botY - 0.16} width={0.12} height={0.12} fill="#93c5fd" fillOpacity={0.75} />
                          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="#bfdbfe" fontSize={0.19} fontFamily="monospace" fontWeight={700}>
                            TRENCH
                          </text>
                        </g>
                      );
                    })}
                    {landmarks.redTrenches.map((t, i) => {
                      const cx = (t.x1 + t.x2) / 2;
                      const cy = fieldW - (t.y1 + t.y2) / 2;
                      const topY = fieldW - Math.max(t.y1, t.y2);
                      const botY = fieldW - Math.min(t.y1, t.y2);
                      return (
                        <g key={`red-trench-${i}`}>
                          {svgRect(t, {
                            rx: 0.05,
                            fill: "#291019",
                            stroke: "#f87171",
                            strokeWidth: 0.04,
                          })}
                          <line x1={t.x1} y1={topY + 0.12} x2={t.x2} y2={topY + 0.12} stroke="#fca5a5" strokeOpacity={0.45} strokeWidth={0.05} />
                          <line x1={t.x1} y1={botY - 0.12} x2={t.x2} y2={botY - 0.12} stroke="#fca5a5" strokeOpacity={0.45} strokeWidth={0.05} />
                          <line x1={t.x1 + 0.1} y1={cy} x2={t.x2 - 0.1} y2={cy} stroke="#ef4444" strokeOpacity={0.35} strokeWidth={0.025} strokeDasharray="0.14 0.1" />
                          <rect x={t.x1 + 0.04} y={topY + 0.04} width={0.12} height={0.12} fill="#fca5a5" fillOpacity={0.75} />
                          <rect x={t.x2 - 0.16} y={topY + 0.04} width={0.12} height={0.12} fill="#fca5a5" fillOpacity={0.75} />
                          <rect x={t.x1 + 0.04} y={botY - 0.16} width={0.12} height={0.12} fill="#fca5a5" fillOpacity={0.75} />
                          <rect x={t.x2 - 0.16} y={botY - 0.16} width={0.12} height={0.12} fill="#fca5a5" fillOpacity={0.75} />
                          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="#fecaca" fontSize={0.19} fontFamily="monospace" fontWeight={700}>
                            TRENCH
                          </text>
                        </g>
                      );
                    })}

                    {/* Bumps (two-slope speed ramps with incline chevrons) */}
                    {landmarks.blueBumps.map((b, i) => {
                      const cx = (b.x1 + b.x2) / 2;
                      const cy = fieldW - (b.y1 + b.y2) / 2;
                      const topY = fieldW - Math.max(b.y1, b.y2);
                      const botY = fieldW - Math.min(b.y1, b.y2);
                      return (
                        <g key={`blue-bump-${i}`}>
                          {svgRect(b, {
                            rx: 0.04,
                            fill: "url(#blue-bump-grad)",
                            stroke: "#475569",
                            strokeWidth: 0.035,
                          })}
                          <line x1={cx} y1={topY + 0.06} x2={cx} y2={botY - 0.06} stroke="#93c5fd" strokeOpacity={0.5} strokeWidth={0.04} />
                          <text x={cx - 0.25} y={topY + 0.35} textAnchor="middle" fill="#93c5fd" fillOpacity={0.55} fontSize={0.22} fontFamily="monospace">›</text>
                          <text x={cx + 0.25} y={topY + 0.35} textAnchor="middle" fill="#93c5fd" fillOpacity={0.55} fontSize={0.22} fontFamily="monospace">‹</text>
                          <text x={cx - 0.25} y={botY - 0.25} textAnchor="middle" fill="#93c5fd" fillOpacity={0.55} fontSize={0.22} fontFamily="monospace">›</text>
                          <text x={cx + 0.25} y={botY - 0.25} textAnchor="middle" fill="#93c5fd" fillOpacity={0.55} fontSize={0.22} fontFamily="monospace">‹</text>
                          <rect x={cx - 0.36} y={cy - 0.15} width={0.72} height={0.3} rx={0.06} fill="#0b1220" fillOpacity={0.75} />
                          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="#cbd5e1" fontSize={0.18} fontFamily="monospace" fontWeight={700}>
                            BUMP
                          </text>
                        </g>
                      );
                    })}
                    {landmarks.redBumps.map((b, i) => {
                      const cx = (b.x1 + b.x2) / 2;
                      const cy = fieldW - (b.y1 + b.y2) / 2;
                      const topY = fieldW - Math.max(b.y1, b.y2);
                      const botY = fieldW - Math.min(b.y1, b.y2);
                      return (
                        <g key={`red-bump-${i}`}>
                          {svgRect(b, {
                            rx: 0.04,
                            fill: "url(#red-bump-grad)",
                            stroke: "#475569",
                            strokeWidth: 0.035,
                          })}
                          <line x1={cx} y1={topY + 0.06} x2={cx} y2={botY - 0.06} stroke="#fca5a5" strokeOpacity={0.5} strokeWidth={0.04} />
                          <text x={cx - 0.25} y={topY + 0.35} textAnchor="middle" fill="#fca5a5" fillOpacity={0.55} fontSize={0.22} fontFamily="monospace">›</text>
                          <text x={cx + 0.25} y={topY + 0.35} textAnchor="middle" fill="#fca5a5" fillOpacity={0.55} fontSize={0.22} fontFamily="monospace">‹</text>
                          <text x={cx - 0.25} y={botY - 0.25} textAnchor="middle" fill="#fca5a5" fillOpacity={0.55} fontSize={0.22} fontFamily="monospace">›</text>
                          <text x={cx + 0.25} y={botY - 0.25} textAnchor="middle" fill="#fca5a5" fillOpacity={0.55} fontSize={0.22} fontFamily="monospace">‹</text>
                          <rect x={cx - 0.36} y={cy - 0.15} width={0.72} height={0.3} rx={0.06} fill="#0b1220" fillOpacity={0.75} />
                          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="#cbd5e1" fontSize={0.18} fontFamily="monospace" fontWeight={700}>
                            BUMP
                          </text>
                        </g>
                      );
                    })}

                    {/* Hubs */}
                    {renderOctagonHub("blue-hub", landmarks.blueHub, "Blue")}
                    {renderOctagonHub("red-hub", landmarks.redHub, "Red")}

                    {/* Towers with 3 climbing rungs + AprilTag ticks */}
                    {[
                      { key: "blue-tower", side: "Blue", rect: landmarks.blueTower, fill: "#172554", stroke: "#60a5fa", rung: "#93c5fd" },
                      { key: "red-tower", side: "Red", rect: landmarks.redTower, fill: "#450a0a", stroke: "#f87171", rung: "#fca5a5" },
                    ].map((tw) => {
                      const cx = (tw.rect.x1 + tw.rect.x2) / 2;
                      const cy = fieldW - (tw.rect.y1 + tw.rect.y2) / 2;
                      const topY = fieldW - Math.max(tw.rect.y1, tw.rect.y2);
                      const botY = fieldW - Math.min(tw.rect.y1, tw.rect.y2);
                      const faceX = tw.side === "Blue" ? tw.rect.x2 - 0.02 : tw.rect.x1 - 0.02;
                      return (
                        <g key={tw.key}>
                          {svgRect(tw.rect, { rx: 0.05, fill: tw.fill, stroke: tw.stroke, strokeWidth: 0.04 })}
                          <line x1={tw.rect.x1 + 0.25} y1={topY + 0.14} x2={tw.rect.x2 - 0.15} y2={topY + 0.14} stroke={tw.rung} strokeOpacity={0.55} strokeWidth={0.04} />
                          <line x1={tw.rect.x1 + 0.25} y1={cy - 0.24} x2={tw.rect.x2 - 0.15} y2={cy - 0.24} stroke={tw.rung} strokeOpacity={0.35} strokeWidth={0.03} />
                          <line x1={tw.rect.x1 + 0.25} y1={botY - 0.14} x2={tw.rect.x2 - 0.15} y2={botY - 0.14} stroke={tw.rung} strokeOpacity={0.55} strokeWidth={0.04} />
                          <rect x={faceX} y={cy - 0.22} width={0.04} height={0.14} fill="#f8fafc" fillOpacity={0.85} />
                          <rect x={faceX} y={cy + 0.08} width={0.04} height={0.14} fill="#f8fafc" fillOpacity={0.85} />
                          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="#e2e8f0" fontSize={0.19} fontFamily="monospace" fontWeight={700}>
                            TOWER
                          </text>
                        </g>
                      );
                    })}

                    {/* Depots (vertical label shifted to wall + 4 FUEL dots) */}
                    {renderVerticalWallZone(
                      "blue-depot",
                      landmarks.blueDepot,
                      "DEPOT",
                      "Blue",
                      "#eab308",
                      "#1e293b",
                      -0.12,
                      <g>
                        {[0.18, 0.39, 0.6, 0.81].map((dy, i) => (
                          <circle
                            key={`bd-${i}`}
                            cx={landmarks.blueDepot.x2 - 0.16}
                            cy={fieldW - (landmarks.blueDepot.y1 + dy * 1.05)}
                            r={0.06}
                            fill="#facc15"
                            fillOpacity={0.8}
                          />
                        ))}
                      </g>,
                    )}
                    {renderVerticalWallZone(
                      "red-depot",
                      landmarks.redDepot,
                      "DEPOT",
                      "Red",
                      "#eab308",
                      "#1e293b",
                      0.12,
                      <g>
                        {[0.18, 0.39, 0.6, 0.81].map((dy, i) => (
                          <circle
                            key={`rd-${i}`}
                            cx={landmarks.redDepot.x1 + 0.16}
                            cy={fieldW - (landmarks.redDepot.y1 + dy * 1.05)}
                            r={0.06}
                            fill="#facc15"
                            fillOpacity={0.8}
                          />
                        ))}
                      </g>,
                    )}

                    {/* Outposts (vertical label so it never overflows) */}
                    {renderVerticalWallZone(
                      "blue-outpost",
                      landmarks.blueOutpost,
                      "OUTPOST",
                      "Blue",
                      "#38bdf8",
                      "#0f1f38",
                    )}
                    {renderVerticalWallZone(
                      "red-outpost",
                      landmarks.redOutpost,
                      "OUTPOST",
                      "Red",
                      "#fb7185",
                      "#34101c",
                    )}
                  </g>
                )}

                {/* Perimeter walls & Origin */}
                <rect x={0} y={0} width={0.12} height={fieldW} fill="#3b82f6" />
                <rect x={fieldL - 0.12} y={0} width={0.12} height={fieldW} fill="#ef4444" />
                <rect
                  x={0}
                  y={0}
                  width={fieldL}
                  height={fieldW}
                  fill="none"
                  stroke="#3b6bb5"
                  strokeWidth={0.05}
                />
                <circle cx={0.12} cy={fieldW - 0.12} r={0.11} fill="#60a5fa" />

                {/* Mirrored Red / Opposite previews */}
                {showMirror &&
                  zones.map((z) => {
                    if (z.mirror === "none") return null;
                    const color = z.colorHex ?? ZONE_META[z.type].color;
                    const mirrored = mirrorShape(z.shape, z.mirror, fieldL, fieldW);
                    return (
                      <g key={`mirror-${z.id}`} className="pointer-events-none" opacity={0.65}>
                        {renderShapeSvg(mirrored, color, { dashed: true })}
                      </g>
                    );
                  })}

                {/* User Zones */}
                {zones.map((z) => {
                  const isSel = z.id === activeZoneId;
                  const isActiveSim =
                    mode === "simulate" && simEval.activeZones.some((az) => az.id === z.id);
                  const color = z.colorHex ?? ZONE_META[z.type].color;
                  return (
                    <g
                      key={z.id}
                      onMouseDown={(e) => {
                        if (mode !== "edit" || tool !== "select") return;
                        e.stopPropagation();
                        setSelectedZoneId(z.id);
                        const p = toFieldPoint(e.clientX, e.clientY);
                        if (p) setDrag({ kind: "moveZone", zoneId: z.id, last: p });
                      }}
                      className={mode === "edit" && tool === "select" ? "cursor-move" : undefined}
                    >
                      {renderShapeSvg(z.shape, color, {
                        selected: isSel && mode === "edit",
                        activeSim: isActiveSim,
                        label: z.name,
                      })}

                      {mode === "edit" && isSel && tool === "select" && z.shape.kind === "rectangle" && (
                        <>
                          {(
                            [
                              { key: "p1", x: z.shape.x1, y: z.shape.y1 },
                              { key: "p2", x: z.shape.x2, y: z.shape.y2 },
                            ] as const
                          ).map((h) => (
                            <circle
                              key={h.key}
                              cx={h.x}
                              cy={fieldW - h.y}
                              r={0.15}
                              fill="#f8fafc"
                              stroke={color}
                              strokeWidth={0.05}
                              className="cursor-nwse-resize"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setDrag({
                                  kind: "rectCorner",
                                  zoneId: z.id,
                                  corner: h.key,
                                });
                              }}
                            />
                          ))}
                        </>
                      )}

                      {mode === "edit" && isSel && tool === "select" && z.shape.kind === "circle" && (
                        <circle
                          cx={clamp(z.shape.cx + z.shape.radius, 0, fieldL)}
                          cy={fieldW - z.shape.cy}
                          r={0.15}
                          fill="#f8fafc"
                          stroke={color}
                          strokeWidth={0.05}
                          className="cursor-ew-resize"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setDrag({ kind: "circleRadius", zoneId: z.id });
                          }}
                        />
                      )}

                      {mode === "edit" && isSel && tool === "select" && z.shape.kind === "polygon" && (
                        <>
                          {z.shape.vertices.map((v, vIdx) => (
                            <circle
                              key={vIdx}
                              cx={v.x}
                              cy={fieldW - v.y}
                              r={0.14}
                              fill="#f8fafc"
                              stroke={color}
                              strokeWidth={0.05}
                              className="cursor-pointer"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setDrag({
                                  kind: "polyVertex",
                                  zoneId: z.id,
                                  index: vIdx,
                                });
                              }}
                            />
                          ))}
                        </>
                      )}
                    </g>
                  );
                })}

                {/* Active drawing previews */}
                {drag?.kind === "drawRect" &&
                  renderShapeSvg(
                    {
                      kind: "rectangle",
                      x1: drag.start.x,
                      y1: drag.start.y,
                      x2: drag.current.x,
                      y2: drag.current.y,
                    },
                    "#60a5fa",
                    { dashed: true },
                  )}
                {drag?.kind === "drawCircle" &&
                  renderShapeSvg(
                    {
                      kind: "circle",
                      cx: drag.center.x,
                      cy: drag.center.y,
                      radius: drag.radius,
                    },
                    "#60a5fa",
                    { dashed: true },
                  )}
                {mode === "edit" && tool === "polygon" && polyDraft.length > 0 && (
                  <g className="pointer-events-none">
                    <polyline
                      points={[...polyDraft, ...(cursorField ? [cursorField] : [])]
                        .map((v) => `${v.x},${fieldW - v.y}`)
                        .join(" ")}
                      fill="none"
                      stroke="#60a5fa"
                      strokeWidth={0.05}
                      strokeDasharray="0.2 0.12"
                    />
                    {polyDraft.map((v, idx) => (
                      <circle
                        key={idx}
                        cx={v.x}
                        cy={fieldW - v.y}
                        r={idx === 0 ? 0.16 : 0.12}
                        fill={idx === 0 ? "#34d399" : "#93c5fd"}
                      />
                    ))}
                  </g>
                )}

                {/* Simulated FRC Robot */}
                {mode === "simulate" && (() => {
                  const activeColor = simEval.currentZone
                    ? (simEval.currentZone.colorHex ?? ZONE_META[simEval.currentZone.type].color)
                    : null;
                  return (
                    <g
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDrag({ kind: "dragRobot" });
                      }}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      {activeColor && (
                        <circle
                          cx={robotPose.x}
                          cy={fieldW - robotPose.y}
                          r={0.68}
                          fill={activeColor}
                          fillOpacity={0.22}
                          stroke={activeColor}
                          strokeOpacity={0.7}
                          strokeWidth={0.03}
                        />
                      )}
                      <g
                        transform={`translate(${robotPose.x}, ${fieldW - robotPose.y}) rotate(${(-robotPose.thetaRad * 180) / Math.PI})`}
                      >
                        <rect
                          x={-0.42}
                          y={-0.42}
                          width={0.84}
                          height={0.84}
                          rx={0.09}
                          fill="#0f172a"
                          stroke={simAlliance === "Blue" ? "#3b82f6" : "#ef4444"}
                          strokeWidth={0.11}
                        />
                        <rect
                          x={-0.28}
                          y={-0.28}
                          width={0.56}
                          height={0.56}
                          rx={0.04}
                          fill="#1e293b"
                        />
                        <polygon
                          points="0.34,0 0.1,-0.13 0.1,0.13"
                          fill="#f8fafc"
                        />
                        <text
                          x={-0.06}
                          y={0}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#cbd5e1"
                          fontSize={0.17}
                          fontFamily="monospace"
                          fontWeight={700}
                        >
                          #{project.project.teamNumber}
                        </text>
                      </g>

                      {/* Suction / Repulsion force vector arrow */}
                      {Math.hypot(simEval.forceVec.x, simEval.forceVec.y) > 0.02 && (() => {
                        const hasRepel = simEval.activeZones.some(
                          (z) => z.type === "repulsion" || z.type === "forbidden",
                        );
                        return (
                          <line
                            x1={robotPose.x}
                            y1={fieldW - robotPose.y}
                            x2={robotPose.x + simEval.forceVec.x * 1.4}
                            y2={fieldW - (robotPose.y + simEval.forceVec.y * 1.4)}
                            stroke={hasRepel ? "#fb7185" : "#34d399"}
                            strokeWidth={0.075}
                            strokeLinecap="round"
                            markerEnd={hasRepel ? "url(#force-arrow-repel)" : "url(#force-arrow-suction)"}
                            className="pointer-events-none"
                          />
                        );
                      })()}
                    </g>
                  );
                })()}
              </svg>
            </div>

            {/* Legend & Live Coordinate Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
              <div className="flex flex-wrap items-center gap-3">
                {(Object.keys(ZONE_META) as ZoneType[]).map((zt) => (
                  <span key={zt} className="inline-flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: ZONE_META[zt].color }}
                    />
                    <span>{ZONE_META[zt].label[locale]}</span>
                  </span>
                ))}
              </div>
              <span className="font-mono text-slate-300">
                {mode === "simulate"
                  ? `Pose: (${robotPose.x.toFixed(2)}m, ${robotPose.y.toFixed(2)}m, ${Math.round((robotPose.thetaRad * 180) / Math.PI)}°) · WASD/Setas + Q/E ou arraste`
                  : cursorField
                    ? `X: ${cursorField.x.toFixed(2)} m · Y: ${cursorField.y.toFixed(2)} m`
                    : `${fieldL} m × ${fieldW} m`}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Right: Tabbed Inspector matching StatesView */}
        <Card className="xl:col-span-4 overflow-hidden">
          <CardHeader className="border-b border-[#22304a] p-2.5">
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: "zones", label: `${locale === "pt" ? "Zonas" : "Zones"} (${zones.length})` },
                  { id: "edit", label: locale === "pt" ? "Editar" : "Edit" },
                  { id: "presets", label: "Modelos 2026" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setInnerTab(tab.id)}
                  className={`rounded-md px-2.5 py-2 text-xs font-medium cursor-pointer transition-all ${
                    innerTab === tab.id
                      ? "bg-[#142c4f] border border-[#3b6bb5] text-white"
                      : "border border-transparent text-slate-400 hover:bg-[#19253d] hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-4">
            {innerTab === "zones" && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300">
                    {locale === "pt" ? "Zonas do Projeto" : "Project Zones"}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() =>
                      createZone({
                        kind: "rectangle",
                        x1: 1.0,
                        y1: 1.0,
                        x2: 3.0,
                        y2: 3.0,
                      })
                    }
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {locale === "pt" ? "Nova" : "New"}
                  </Button>
                </div>

                {zones.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#22304a] bg-[#0b0f17] p-5 text-center space-y-3">
                    <Sparkles className="h-5 w-5 text-[#60a5fa] mx-auto" />
                    <p className="text-xs leading-relaxed text-slate-300">
                      {locale === "pt"
                        ? "Sem zonas ainda. Use um modelo pronto da temporada REBUILT 2026 ou desenhe direto no campo."
                        : "No zones yet. Pick a 2026 REBUILT preset or draw directly on the field."}
                    </p>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setInnerTab("presets")}
                    >
                      Ver Modelos 2026
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[460px] overflow-y-auto pr-0.5">
                    {zones.map((z) => {
                      const selected = z.id === activeZoneId;
                      const meta = ZONE_META[z.type];
                      return (
                        <div
                          key={z.id}
                          onClick={() => {
                            setSelectedZoneId(z.id);
                            setInnerTab("edit");
                          }}
                          className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                            selected
                              ? "border-[#60a5fa] bg-[#142c4f]/70"
                              : "border-[#22304a] bg-[#0f1624] hover:border-[#3b6bb5]"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {meta.icon}
                            <div className="min-w-0">
                              <p className="truncate font-mono text-xs font-semibold text-white">
                                {z.name}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {meta.label[locale]} · {z.shape.kind} · mirror {z.mirror}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteZone(z.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {innerTab === "edit" && (
              selectedZone ? (
                <div className="space-y-3.5">
                  <Field
                    path={`zones.${selectedZone.id}.name`}
                    label={locale === "pt" ? "Nome da Zona" : "Zone Name"}
                  >
                    <Input
                      value={selectedZone.name}
                      className="h-8 font-mono text-xs"
                      onChange={(e) =>
                        updateZone(selectedZone.id, (z) => ({
                          ...z,
                          name: toUpperSnake(e.target.value),
                        }))
                      }
                    />
                  </Field>

                  <Field
                    path={`zones.${selectedZone.id}.type`}
                    label={locale === "pt" ? "O que faz no robô" : "Zone Behavior"}
                  >
                    <Select
                      className="h-8 text-xs"
                      value={selectedZone.type}
                      onChange={(e) => {
                        const nextType = e.target.value as ZoneType;
                        updateZone(selectedZone.id, (z) => ({
                          ...z,
                          type: nextType,
                          colorHex: ZONE_META[nextType].color,
                          strength:
                            nextType === "suction"
                              ? (z.strength ?? 0.4)
                              : nextType === "repulsion"
                                ? (z.strength ?? 0.6)
                                : nextType === "forbidden"
                                  ? (z.strength ?? 0.9)
                                  : undefined,
                          speedFactor:
                            nextType === "speedLimit" ? (z.speedFactor ?? 0.5) : undefined,
                        }));
                      }}
                    >
                      {(Object.keys(ZONE_META) as ZoneType[]).map((zt) => (
                        <option key={zt} value={zt}>
                          {ZONE_META[zt].label[locale]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <p className="rounded-md border border-[#22304a] bg-[#0b0f17] px-2.5 py-2 text-[11px] text-slate-300">
                    {ZONE_META[selectedZone.type].hint[locale]}
                  </p>

                  <Field
                    path={`zones.${selectedZone.id}.mirror`}
                    label={locale === "pt" ? "Espelhar para Vermelho" : "Mirror to Red"}
                  >
                    <Select
                      className="h-8 text-xs font-mono"
                      value={selectedZone.mirror}
                      onChange={(e) =>
                        updateZone(selectedZone.id, (z) => ({
                          ...z,
                          mirror: e.target.value as ZoneMirror,
                        }))
                      }
                    >
                      <option value="both">both (rotação 180° X + Y)</option>
                      <option value="x">x (espelho horizontal)</option>
                      <option value="y">y (espelho vertical)</option>
                      <option value="none">none (apenas Azul)</option>
                    </Select>
                  </Field>

                  {(selectedZone.type === "suction" ||
                    selectedZone.type === "repulsion" ||
                    selectedZone.type === "forbidden") && (
                    <Field
                      path={`zones.${selectedZone.id}.strength`}
                      label={locale === "pt" ? "Força (0.05 – 1.0)" : "Strength (0.05 – 1.0)"}
                    >
                      <Input
                        type="number"
                        step={0.05}
                        min={0.05}
                        max={1.0}
                        className="h-8 font-mono text-xs"
                        value={
                          selectedZone.strength ??
                          (selectedZone.type === "suction"
                            ? 0.4
                            : selectedZone.type === "forbidden"
                              ? 0.9
                              : 0.6)
                        }
                        onChange={(e) => {
                          const val = clamp(
                            Number.parseFloat(e.target.value || "0.5") || 0.5,
                            0.05,
                            1.0,
                          );
                          updateZone(selectedZone.id, (z) => ({ ...z, strength: val }));
                        }}
                      />
                    </Field>
                  )}

                  {selectedZone.type === "speedLimit" && (
                    <Field
                      path={`zones.${selectedZone.id}.speedFactor`}
                      label={locale === "pt" ? "Fator de Velocidade (0.1 – 1.0)" : "Speed Factor (0.1 – 1.0)"}
                    >
                      <Input
                        type="number"
                        step={0.05}
                        min={0.1}
                        max={1.0}
                        className="h-8 font-mono text-xs"
                        value={selectedZone.speedFactor ?? 0.5}
                        onChange={(e) => {
                          const val = clamp(
                            Number.parseFloat(e.target.value || "0.5") || 0.5,
                            0.1,
                            1.0,
                          );
                          updateZone(selectedZone.id, (z) => ({ ...z, speedFactor: val }));
                        }}
                      />
                    </Field>
                  )}

                  {selectedZone.type === "forbidden" && (
                    <Field
                      path={`zones.${selectedZone.id}.alertMessage`}
                      label={locale === "pt" ? "Mensagem PersistentAlert" : "PersistentAlert Message"}
                    >
                      <Input
                        className="h-8 text-xs"
                        placeholder={`Robot entered forbidden zone ${selectedZone.name}`}
                        value={selectedZone.alertMessage ?? ""}
                        onChange={(e) =>
                          updateZone(selectedZone.id, (z) => ({
                            ...z,
                            alertMessage: e.target.value,
                          }))
                        }
                      />
                    </Field>
                  )}

                  {selectedZone.shape.kind === "rectangle" && (
                    <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-[#22304a]">
                      <Field path={`zones.${selectedZone.id}.shape.x1`} label="X1 (m)">
                        <Input
                          type="number"
                          step={0.05}
                          className="h-8 font-mono text-xs"
                          value={selectedZone.shape.x1}
                          onChange={(e) => {
                            const x1 = Number.parseFloat(e.target.value || "0") || 0;
                            updateZone(selectedZone.id, (z) =>
                              z.shape.kind === "rectangle"
                                ? { ...z, shape: { ...z.shape, x1 } }
                                : z,
                            );
                          }}
                        />
                      </Field>
                      <Field path={`zones.${selectedZone.id}.shape.y1`} label="Y1 (m)">
                        <Input
                          type="number"
                          step={0.05}
                          className="h-8 font-mono text-xs"
                          value={selectedZone.shape.y1}
                          onChange={(e) => {
                            const y1 = Number.parseFloat(e.target.value || "0") || 0;
                            updateZone(selectedZone.id, (z) =>
                              z.shape.kind === "rectangle"
                                ? { ...z, shape: { ...z.shape, y1 } }
                                : z,
                            );
                          }}
                        />
                      </Field>
                      <Field path={`zones.${selectedZone.id}.shape.x2`} label="X2 (m)">
                        <Input
                          type="number"
                          step={0.05}
                          className="h-8 font-mono text-xs"
                          value={selectedZone.shape.x2}
                          onChange={(e) => {
                            const x2 = Number.parseFloat(e.target.value || "0") || 0;
                            updateZone(selectedZone.id, (z) =>
                              z.shape.kind === "rectangle"
                                ? { ...z, shape: { ...z.shape, x2 } }
                                : z,
                            );
                          }}
                        />
                      </Field>
                      <Field path={`zones.${selectedZone.id}.shape.y2`} label="Y2 (m)">
                        <Input
                          type="number"
                          step={0.05}
                          className="h-8 font-mono text-xs"
                          value={selectedZone.shape.y2}
                          onChange={(e) => {
                            const y2 = Number.parseFloat(e.target.value || "0") || 0;
                            updateZone(selectedZone.id, (z) =>
                              z.shape.kind === "rectangle"
                                ? { ...z, shape: { ...z.shape, y2 } }
                                : z,
                            );
                          }}
                        />
                      </Field>
                    </div>
                  )}

                  {selectedZone.shape.kind === "circle" && (
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#22304a]">
                      <Field path={`zones.${selectedZone.id}.shape.cx`} label="CX (m)">
                        <Input
                          type="number"
                          step={0.05}
                          className="h-8 font-mono text-xs"
                          value={selectedZone.shape.cx}
                          onChange={(e) => {
                            const cx = Number.parseFloat(e.target.value || "0") || 0;
                            updateZone(selectedZone.id, (z) =>
                              z.shape.kind === "circle" ? { ...z, shape: { ...z.shape, cx } } : z,
                            );
                          }}
                        />
                      </Field>
                      <Field path={`zones.${selectedZone.id}.shape.cy`} label="CY (m)">
                        <Input
                          type="number"
                          step={0.05}
                          className="h-8 font-mono text-xs"
                          value={selectedZone.shape.cy}
                          onChange={(e) => {
                            const cy = Number.parseFloat(e.target.value || "0") || 0;
                            updateZone(selectedZone.id, (z) =>
                              z.shape.kind === "circle" ? { ...z, shape: { ...z.shape, cy } } : z,
                            );
                          }}
                        />
                      </Field>
                      <Field path={`zones.${selectedZone.id}.shape.radius`} label="R (m)">
                        <Input
                          type="number"
                          step={0.05}
                          min={0.05}
                          className="h-8 font-mono text-xs"
                          value={selectedZone.shape.radius}
                          onChange={(e) => {
                            const radius = Math.max(
                              0.05,
                              Number.parseFloat(e.target.value || "0.5") || 0.5,
                            );
                            updateZone(selectedZone.id, (z) =>
                              z.shape.kind === "circle"
                                ? { ...z, shape: { ...z.shape, radius } }
                                : z,
                            );
                          }}
                        />
                      </Field>
                    </div>
                  )}

                  {selectedZone.shape.kind === "polygon" && (
                    <div className="space-y-2 pt-2 border-t border-[#22304a]">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] uppercase text-slate-400">
                          Vértices ({selectedZone.shape.vertices.length})
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[11px]"
                          onClick={() =>
                            updateZone(selectedZone.id, (z) => {
                              if (z.shape.kind !== "polygon") return z;
                              const last = z.shape.vertices[z.shape.vertices.length - 1] ?? {
                                x: 1,
                                y: 1,
                              };
                              return {
                                ...z,
                                shape: {
                                  kind: "polygon",
                                  vertices: [
                                    ...z.shape.vertices,
                                    {
                                      x: round2(clamp(last.x + 0.5, 0, fieldL)),
                                      y: round2(clamp(last.y, 0, fieldW)),
                                    },
                                  ],
                                },
                              };
                            })
                          }
                        >
                          <Plus className="h-3 w-3" />
                          Vértice
                        </Button>
                      </div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {selectedZone.shape.vertices.map((v, vIdx) => (
                          <div key={vIdx} className="flex items-center gap-1.5">
                            <span className="w-6 font-mono text-[10px] text-slate-500">
                              P{vIdx + 1}
                            </span>
                            <Input
                              type="number"
                              step={0.05}
                              className="h-7 font-mono text-xs"
                              value={v.x}
                              onChange={(e) => {
                                const x = Number.parseFloat(e.target.value || "0") || 0;
                                updateZone(selectedZone.id, (z) =>
                                  z.shape.kind === "polygon"
                                    ? {
                                        ...z,
                                        shape: {
                                          kind: "polygon",
                                          vertices: z.shape.vertices.map((pt, i) =>
                                            i === vIdx ? { ...pt, x } : pt,
                                          ),
                                        },
                                      }
                                    : z,
                                );
                              }}
                            />
                            <Input
                              type="number"
                              step={0.05}
                              className="h-7 font-mono text-xs"
                              value={v.y}
                              onChange={(e) => {
                                const y = Number.parseFloat(e.target.value || "0") || 0;
                                updateZone(selectedZone.id, (z) =>
                                  z.shape.kind === "polygon"
                                    ? {
                                        ...z,
                                        shape: {
                                          kind: "polygon",
                                          vertices: z.shape.vertices.map((pt, i) =>
                                            i === vIdx ? { ...pt, y } : pt,
                                          ),
                                        },
                                      }
                                    : z,
                                );
                              }}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 shrink-0"
                              disabled={
                                selectedZone.shape.kind === "polygon" &&
                                selectedZone.shape.vertices.length <= 3
                              }
                              onClick={() =>
                                updateZone(selectedZone.id, (z) =>
                                  z.shape.kind === "polygon" && z.shape.vertices.length > 3
                                    ? {
                                        ...z,
                                        shape: {
                                          kind: "polygon",
                                          vertices: z.shape.vertices.filter((_, i) => i !== vIdx),
                                        },
                                      }
                                    : z,
                                )
                              }
                            >
                              <Trash2 className="h-3 w-3 text-rose-400" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-[#22304a] bg-[#0b0f17] p-5 text-center text-xs text-slate-400">
                  {locale === "pt"
                    ? "Selecione uma zona no campo ou na aba Zonas para editar."
                    : "Select a zone on the field or in the Zones tab to edit."}
                </p>
              )
            )}

            {innerTab === "presets" && (
              <div className="space-y-2.5 max-h-[490px] overflow-y-auto pr-0.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-slate-400">
                    {locale === "pt"
                      ? "Medidas oficiais FRC 2026 REBUILT:"
                      : "Official FRC 2026 REBUILT presets:"}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[10px] shrink-0"
                    onClick={() => {
                      const existing = new Set(zones.map((z) => z.name.toUpperCase()));
                      const toAdd: FieldZone[] = [];
                      REBUILT_ZONE_PRESETS.forEach((preset, idx) => {
                        const created = preset.createZone(fieldL, fieldW);
                        if (!existing.has(created.name.toUpperCase())) {
                          toAdd.push({
                            ...created,
                            id: `zone-${Date.now().toString(36)}-${idx}`,
                          });
                        }
                      });
                      if (toAdd.length > 0) {
                        updateProject((prev) => ({
                          ...prev,
                          zones: [...(prev.zones ?? []), ...toAdd],
                        }));
                        setSelectedZoneId(toAdd[0].id);
                      }
                    }}
                  >
                    <Plus className="h-3 w-3" />
                    {locale === "pt" ? "Adicionar todos" : "Add all"}
                  </Button>
                </div>
                {REBUILT_ZONE_PRESETS.map((preset) => {
                  const preview = preset.createZone(fieldL, fieldW);
                  const meta = ZONE_META[preview.type];
                  const alreadyAdded = zones.some(
                    (z) => z.name.toUpperCase() === preview.name.toUpperCase(),
                  );
                  const shapeTag =
                    preview.shape.kind === "circle"
                      ? locale === "pt"
                        ? "Círculo"
                        : "Circle"
                      : locale === "pt"
                        ? "Retângulo"
                        : "Rect";
                  return (
                    <div
                      key={preset.id}
                      style={{ borderLeftColor: meta.color }}
                      className="rounded-lg border border-[#22304a] border-l-[3px] bg-[#0f1624] p-2.5 space-y-1.5 hover:border-[#3b6bb5] transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {meta.icon}
                          <span className="truncate text-xs font-semibold text-white">
                            {preset.title[locale]}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant={alreadyAdded ? "secondary" : "outline"}
                          className="h-6 px-2 text-[11px] shrink-0"
                          onClick={() => addZoneObject(preset.createZone(fieldL, fieldW))}
                        >
                          {alreadyAdded ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Plus className="h-3 w-3" />
                          )}
                          {alreadyAdded
                            ? locale === "pt"
                              ? "Duplicar"
                              : "Add copy"
                            : locale === "pt"
                              ? "Adicionar"
                              : "Add"}
                        </Button>
                      </div>
                      <p className="text-[11px] leading-snug text-slate-400">
                        {preset.description[locale]}
                      </p>
                      <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
                        <span className="rounded bg-[#0b0f17] px-1.5 py-0.5 border border-[#22304a]">
                          {preview.name}
                        </span>
                        <span>·</span>
                        <span>{shapeTag}</span>
                        <span>·</span>
                        <span>mirror {preview.mirror}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showJava && fieldZonesFile && (
        <Card className="h-[420px] flex flex-col overflow-hidden animate-fade-in">
          <CodeViewer
            filePath={fieldZonesFile.path}
            content={fieldZonesFile.content}
            className="flex-1"
          />
        </Card>
      )}
    </div>
  );
}
