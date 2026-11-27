"use client";

import React, { useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Code2, Cog, Compass, Gamepad2, ImageDown, MapPin, Plus, Radar, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Hint } from "@/components/ui/hint";
import { Select } from "@/components/ui/select";
import { useProject } from "@/context/project-context";
import { requestToCommandMethod, toPascalCase } from "@/lib/generator/java-utils";
import {
  getPrimaryMotorAction,
  isMotorSubsystem,
  type PilotCondition,
  type SubsystemAction,
  type XboxButton,
} from "@/lib/schema/ciprix-project";
import { CodeViewer } from "./code-viewer";
import { XboxControllerSvg, type MappedButtonInfo } from "./xbox-svg";

function isAnalogTrigger(btn?: XboxButton): boolean {
  return btn === "leftTrigger" || btn === "rightTrigger";
}

function formatReaction(action: SubsystemAction | undefined): { label: string; dir: number } {
  if (!action || action.type === "stop") return { label: "0%", dir: 0 };
  switch (action.type) {
    case "percentOutput": {
      const pct = Math.round(action.value * 100);
      return { label: pct > 0 ? `+${pct}%` : `${pct}%`, dir: action.value };
    }
    case "velocityRpm":
      return { label: `${Math.round(action.value)} RPM`, dir: action.value };
    case "positionDeg":
    case "smartPositionDeg":
      return { label: `${action.value}°`, dir: action.value === 0 ? 0 : 1 };
    case "positionRot":
    case "smartPositionRot":
      return { label: `${action.value} rot`, dir: action.value === 0 ? 0 : 1 };
  }
}

const XBOX_BUTTONS: { value: XboxButton; label: string; fullName: string }[] = [
  { value: "a", label: "A", fullName: "A Button" },
  { value: "b", label: "B", fullName: "B Button" },
  { value: "x", label: "X", fullName: "X Button" },
  { value: "y", label: "Y", fullName: "Y Button" },
  { value: "leftBumper", label: "LB", fullName: "Left Bumper" },
  { value: "rightBumper", label: "RB", fullName: "Right Bumper" },
  { value: "leftTrigger", label: "LT", fullName: "Left Trigger" },
  { value: "rightTrigger", label: "RT", fullName: "Right Trigger" },
  { value: "leftStick", label: "LS", fullName: "Left Stick Click (L3)" },
  { value: "rightStick", label: "RS", fullName: "Right Stick Click (R3)" },
  { value: "povUp", label: "D-Up", fullName: "D-Pad Up" },
  { value: "povDown", label: "D-Down", fullName: "D-Pad Down" },
  { value: "povLeft", label: "D-Left", fullName: "D-Pad Left" },
  { value: "povRight", label: "D-Right", fullName: "D-Pad Right" },
  { value: "start", label: "Start", fullName: "Menu (Start)" },
  { value: "back", label: "Back", fullName: "View (Back)" },
];

export function ControlsTab() {
  const { project, generatedFiles, updateProject, t } = useProject();
  const [port, setPort] = useState<"pilot" | "copilot">("pilot");
  const [selectedButton, setSelectedButton] = useState<XboxButton>("rightBumper");
  const [hoveredButton, setHoveredButton] = useState<XboxButton | null>(null);
  const [showJava, setShowJava] = useState(false);
  const [exportingCard, setExportingCard] = useState(false);
  const xboxSvgRef = useRef<SVGSVGElement | null>(null);

  const handleExportPitCard = async () => {
    const svgEl = xboxSvgRef.current;
    if (!svgEl) return;
    setExportingCard(true);
    try {
      const cloned = svgEl.cloneNode(true) as SVGSVGElement;
      cloned.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      const xml = new XMLSerializer().serializeToString(cloned);
      const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);

      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = svgUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = 1520;
      canvas.height = 980;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(svgUrl);
        return;
      }

      ctx.fillStyle = "#0b0f17";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#0f1624";
      ctx.fillRect(0, 0, canvas.width, 96);
      ctx.strokeStyle = "#22304a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 96);
      ctx.lineTo(canvas.width, 96);
      ctx.stroke();

      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 30px sans-serif";
      const roleLabel = port === "pilot" ? "PILOTO (XBOX 0)" : "COPILOTO (XBOX 1)";
      ctx.fillText(
        `${project.project.name || "FIRST Studio"} #${project.project.teamNumber} · ${roleLabel}`,
        48,
        58,
      );
      ctx.fillStyle = "#93c5fd";
      ctx.font = "18px monospace";
      ctx.textAlign = "right";
      ctx.fillText("FIRST Studio · Ciprix 2026.3.0", canvas.width - 48, 56);
      ctx.textAlign = "left";

      ctx.drawImage(img, 80, 120, 1360, 770);
      URL.revokeObjectURL(svgUrl);

      const summary = Array.from(mappedButtons.entries())
        .map(([btn, info]) => {
          const short = XBOX_BUTTONS.find((b) => b.value === btn)?.label ?? btn;
          return `${short}: ${info.label}`;
        })
        .join("   |   ");

      ctx.fillStyle = "#0f1624";
      ctx.fillRect(0, 908, canvas.width, 72);
      ctx.strokeStyle = "#22304a";
      ctx.beginPath();
      ctx.moveTo(0, 908);
      ctx.lineTo(canvas.width, 908);
      ctx.stroke();

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "16px monospace";
      ctx.fillText(summary || "Sem botões mapeados", 48, 950, canvas.width - 96);

      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = `${project.project.name || "first-studio"}-${port}-pit-card.png`;
      a.click();
    } finally {
      setExportingCard(false);
    }
  };

  const mappedButtons = useMemo(() => {
    const map = new Map<XboxButton, MappedButtonInfo>();
    if (port === "pilot") {
      project.controls.pilotPriority.forEach((p, idx) => {
        if (p.source !== "sensor" && p.button && !map.has(p.button)) {
          const thr =
            isAnalogTrigger(p.button) && p.triggerThreshold !== undefined
              ? ` (${Math.round(p.triggerThreshold * 100)}%)`
              : "";
          map.set(p.button, { label: `${p.request}${thr}`, priority: idx + 1 });
        }
      });
      if (project.drivetrain?.enabled) {
        const { resetGyroButton, toggleFieldOrientedButton } = project.drivetrain.controls;
        if (resetGyroButton && !map.has(resetGyroButton)) {
          map.set(resetGyroButton, { label: "Zero Gyro" });
        }
        if (toggleFieldOrientedButton && !map.has(toggleFieldOrientedButton)) {
          map.set(toggleFieldOrientedButton, { label: "Field/Robot" });
        }
      }
    } else {
      for (const ov of project.controls.copilotOverrides) {
        if (!map.has(ov.button)) {
          const sub = project.subsystems.find((s) => s.id === ov.subsystemId);
          const thr =
            isAnalogTrigger(ov.button) && ov.triggerThreshold !== undefined
              ? ` (${Math.round(ov.triggerThreshold * 100)}%)`
              : "";
          map.set(ov.button, { label: `${sub?.name ?? "?"}.${ov.request}${thr}` });
        }
      }
    }
    return map;
  }, [port, project.controls, project.subsystems, project.drivetrain]);

  const movePilot = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= project.controls.pilotPriority.length) return;
    updateProject((prev) => {
      const next = [...prev.controls.pilotPriority];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return { ...prev, controls: { ...prev.controls, pilotPriority: next } };
    });
  };

  const quickBindPilot = (request: string) => {
    updateProject((prev) => {
      const existingIdx = prev.controls.pilotPriority.findIndex(
        (p) => p.source !== "sensor" && p.button === selectedButton,
      );
      if (existingIdx >= 0) {
        return {
          ...prev,
          controls: {
            ...prev.controls,
            pilotPriority: prev.controls.pilotPriority.map((item, idx) =>
              idx === existingIdx ? { ...item, request } : item,
            ),
          },
        };
      }
      return {
        ...prev,
        controls: {
          ...prev.controls,
          pilotPriority: [
            ...prev.controls.pilotPriority,
            { id: `pilot-${Date.now()}`, source: "button", button: selectedButton, request },
          ],
        },
      };
    });
  };

  const quickBindCopilot = (subsystemId: string, request: string) => {
    updateProject((prev) => {
      const existingIdx = prev.controls.copilotOverrides.findIndex(
        (ov) => ov.button === selectedButton,
      );
      if (existingIdx >= 0) {
        return {
          ...prev,
          controls: {
            ...prev.controls,
            copilotOverrides: prev.controls.copilotOverrides.map((item, idx) =>
              idx === existingIdx ? { ...item, subsystemId, request } : item,
            ),
          },
        };
      }
      return {
        ...prev,
        controls: {
          ...prev.controls,
          copilotOverrides: [
            ...prev.controls.copilotOverrides,
            { id: `copilot-${Date.now()}`, button: selectedButton, subsystemId, request },
          ],
        },
      };
    });
  };

  const motorSubsystems = useMemo(
    () => project.subsystems.filter(isMotorSubsystem),
    [project.subsystems],
  );
  const sensorOwners = useMemo(
    () => project.subsystems.filter((s) => (s.sensors?.length ?? 0) > 0),
    [project.subsystems],
  );
  const zones = useMemo(() => project.zones ?? [], [project.zones]);

  const liveReaction = useMemo(() => {
    if (port === "pilot") {
      const pilotMatch = project.controls.pilotPriority.find(
        (p) => p.source !== "sensor" && p.button === selectedButton,
      );
      if (!pilotMatch) return null;
      const robotState =
        project.superstructure.bindings.find((b) => b.request === pilotMatch.request)?.entryState ??
        project.superstructure.initialState;
      const firstSub = motorSubsystems[0];
      if (!firstSub) {
        return { summary: `${pilotMatch.request} → ${robotState}`, pct: 0 };
      }
      const subReq =
        project.superstructure.stateActions[robotState]?.[firstSub.id] ??
        firstSub.fsm.initialRequest;
      const stName =
        firstSub.fsm.bindings.find((b) => b.request === subReq)?.goalState ??
        firstSub.fsm.initialState;
      const stObj = firstSub.fsm.states.find((s) => s.name === stName);
      const reaction = formatReaction(getPrimaryMotorAction(stObj));
      return {
        summary: `${pilotMatch.request} → ${firstSub.name}: ${stName} (${reaction.label})`,
        pct: reaction.dir,
      };
    }

    const copilotMatch = project.controls.copilotOverrides.find((ov) => ov.button === selectedButton);
    if (!copilotMatch) return null;
    const sub = motorSubsystems.find((s) => s.id === copilotMatch.subsystemId);
    if (!sub) return null;
    const stName =
      sub.fsm.bindings.find((b) => b.request === copilotMatch.request)?.goalState ??
      sub.fsm.initialState;
    const stObj = sub.fsm.states.find((s) => s.name === stName);
    const reaction = formatReaction(getPrimaryMotorAction(stObj));
    return {
      summary: `${sub.name}.${copilotMatch.request} → ${stName} (${reaction.label})`,
      pct: reaction.dir,
    };
  }, [port, selectedButton, project, motorSubsystems]);

  const copilotChoices = useMemo(
    () =>
      motorSubsystems.flatMap((sub) =>
        sub.fsm.requests.map((req) => ({
          subsystemId: sub.id,
          subsystemName: sub.name,
          request: req,
        })),
      ),
    [motorSubsystems],
  );

  const previewFile = useMemo(() => {
    const targetName =
      port === "pilot" ? "SuperStructureCommands.java" : "RobotContainer.java";
    return generatedFiles.find((f) => f.path.endsWith(targetName)) ?? generatedFiles[0];
  }, [port, generatedFiles]);

  const selectedBtnMeta = XBOX_BUTTONS.find((b) => b.value === selectedButton);
  const currentPilotRule = project.controls.pilotPriority.find(
    (p) => p.source !== "sensor" && p.button === selectedButton,
  );
  const currentCopilotRule = project.controls.copilotOverrides.find(
    (ov) => ov.button === selectedButton,
  );

  const portSwitcher = (
    <div className="flex items-center gap-1.5 rounded-lg border border-[#22304a] bg-[#0f1624] p-1">
      <button
        type="button"
        onClick={() => setPort("pilot")}
        className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-[13px] font-medium cursor-pointer transition-all ${
          port === "pilot"
            ? "bg-[#142c4f] border border-[#60a5fa]/70 text-white shadow-sm"
            : "border border-transparent text-slate-400 hover:text-white"
        }`}
      >
        <Gamepad2 className="h-4 w-4" />
        <span>{t("controls.pilot_title")}</span>
        <Badge variant={port === "pilot" ? "default" : "secondary"} className="px-1.5 py-0 text-[11px]">
          {project.controls.pilotPriority.length}
        </Badge>
      </button>
      <button
        type="button"
        onClick={() => setPort("copilot")}
        className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-[13px] font-medium cursor-pointer transition-all ${
          port === "copilot"
            ? "bg-[#142c4f] border border-[#60a5fa]/70 text-white shadow-sm"
            : "border border-transparent text-slate-400 hover:text-white"
        }`}
      >
        <Gamepad2 className="h-4 w-4" />
        <span>{t("controls.copilot_title")}</span>
        <Badge
          variant={port === "copilot" ? "default" : "secondary"}
          className="px-1.5 py-0 text-[11px]"
        >
          {project.controls.copilotOverrides.length}
        </Badge>
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Controles do Xbox"
        description="Clique nos botões do controle para mapear comandos do piloto e overrides do copiloto."
        actions={portSwitcher}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Interactive Stage: Xbox Series X + Quick-Bind Dock */}
        <Card className="xl:col-span-7 overflow-hidden bg-studio-glow">
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 border-b border-[#22304a] bg-[#0f1624]/80 py-4">
            <CardTitle className="text-lg">
              {port === "pilot" ? "Controle do Piloto (Port 0)" : "Controle do Copiloto (Port 1)"}
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportPitCard}
                  disabled={exportingCard}
                  className="h-8 px-2.5 text-xs"
                >
                  <ImageDown className="h-3.5 w-3.5" />
                  <span>{exportingCard ? t("controls.pit_card_exporting") : t("controls.pit_card")}</span>
                </Button>
                <Hint hintKey="btn.pit_card" />
              </div>
              <Badge variant="outline">
                {port === "pilot" ? "SuperStructureCommands" : "@AutoCommandFactory"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 p-6">
            <div className="flex items-center justify-center py-2">
              <XboxControllerSvg
                svgRef={xboxSvgRef}
                mappedButtons={mappedButtons}
                selectedButton={selectedButton}
                hoveredButton={hoveredButton}
                onSelectButton={setSelectedButton}
                onHoverButton={setHoveredButton}
              />
            </div>

            {/* Interactive Quick-Bind + Live Reaction Dock */}
            <div className="rounded-xl border border-[#2c3f61] bg-[#0f1624]/95 p-4 space-y-3 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="rounded-md border border-[#3b6bb5] bg-[#142c4f] px-2.5 py-0.5 font-mono text-xs font-semibold text-white">
                    {selectedBtnMeta?.label ?? selectedButton}
                  </span>
                  <span className="text-[13px] text-slate-300">{selectedBtnMeta?.fullName}</span>
                </div>

                {liveReaction ? (
                  <div className="flex items-center gap-2 rounded-md border border-[#2c3f61] bg-[#0b0f17] px-3 py-1 font-mono text-xs text-[#93c5fd]">
                    <Cog
                      className={`h-3.5 w-3.5 ${
                        liveReaction.pct > 0
                          ? "text-[#60a5fa] animate-motor-cw"
                          : liveReaction.pct < 0
                            ? "text-[#60a5fa] animate-motor-ccw"
                            : "text-slate-500"
                      }`}
                    />
                    <span>{liveReaction.summary}</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">
                    Clique num comando abaixo para vincular
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {port === "pilot"
                  ? project.superstructure.requests.map((req) => {
                      const active = currentPilotRule?.request === req;
                      return (
                        <button
                          key={req}
                          type="button"
                          onClick={() => quickBindPilot(req)}
                          className={`rounded-md border px-3 py-1.5 font-mono text-xs transition-all cursor-pointer ${
                            active
                              ? "border-[#60a5fa] bg-[#142c4f] text-white"
                              : "border-[#253552] bg-[#0b0f17] text-slate-300 hover:border-[#3b6bb5] hover:text-white"
                          }`}
                        >
                          {active ? "✓ " : "+ "}
                          {req}
                        </button>
                      );
                    })
                  : copilotChoices.map((choice) => {
                      const active =
                        currentCopilotRule?.subsystemId === choice.subsystemId &&
                        currentCopilotRule?.request === choice.request;
                      return (
                        <button
                          key={`${choice.subsystemId}-${choice.request}`}
                          type="button"
                          onClick={() => quickBindCopilot(choice.subsystemId, choice.request)}
                          className={`rounded-md border px-3 py-1.5 font-mono text-xs transition-all cursor-pointer ${
                            active
                              ? "border-[#60a5fa] bg-[#142c4f] text-white"
                              : "border-[#253552] bg-[#0b0f17] text-slate-300 hover:border-[#3b6bb5] hover:text-white"
                          }`}
                        >
                          {active ? "✓ " : "+ "}
                          {choice.subsystemName}.{choice.request}
                        </button>
                      );
                    })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Priority / Override Rules + Drivetrain Sticks + On-Demand Java Card */}
        <div className="xl:col-span-5 space-y-6">
          {port === "pilot" && project.drivetrain?.enabled && (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-[#22304a] pb-3">
                <div className="flex items-center gap-2">
                  <Compass className="h-4 w-4 text-sky-400" />
                  <CardTitle className="text-base">Tração (Sticks do Piloto)</CardTitle>
                </div>
                <Badge variant="outline">{project.drivetrain.type}</Badge>
              </CardHeader>
              <CardContent className="space-y-3 pt-4 text-xs">
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-[#22304a] bg-[#0f1624] p-2.5 font-mono">
                  <div>
                    <p className="text-[10px] text-slate-400">LEFT STICK</p>
                    <p className="text-slate-200">Translação X/Y</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">RIGHT STICK</p>
                    <p className="text-slate-200">
                      {project.drivetrain.assistants.headingStickRotation
                        ? "HeadingStick"
                        : "Rotação Omega"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field path="drivetrain.controls.resetGyroButton" label="Zerar Gyro">
                    <Select
                      className="h-8 text-xs font-mono"
                      value={project.drivetrain.controls.resetGyroButton ?? ""}
                      onChange={(e) =>
                        updateProject((prev) =>
                          prev.drivetrain
                            ? {
                                ...prev,
                                drivetrain: {
                                  ...prev.drivetrain,
                                  controls: {
                                    ...prev.drivetrain.controls,
                                    resetGyroButton: (e.target.value || undefined) as
                                      | XboxButton
                                      | undefined,
                                  },
                                },
                              }
                            : prev,
                        )
                      }
                    >
                      <option value="">(Nenhum)</option>
                      {XBOX_BUTTONS.map((btn) => (
                        <option key={btn.value} value={btn.value}>
                          {btn.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    path="drivetrain.controls.toggleFieldOrientedButton"
                    label="Field / Robot"
                  >
                    <Select
                      className="h-8 text-xs font-mono"
                      value={project.drivetrain.controls.toggleFieldOrientedButton ?? ""}
                      onChange={(e) =>
                        updateProject((prev) =>
                          prev.drivetrain
                            ? {
                                ...prev,
                                drivetrain: {
                                  ...prev.drivetrain,
                                  controls: {
                                    ...prev.drivetrain.controls,
                                    toggleFieldOrientedButton: (e.target.value || undefined) as
                                      | XboxButton
                                      | undefined,
                                  },
                                },
                              }
                            : prev,
                        )
                      }
                    >
                      <option value="">(Nenhum)</option>
                      {XBOX_BUTTONS.map((btn) => (
                        <option key={btn.value} value={btn.value}>
                          {btn.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-[#22304a] pb-4">
              <div>
                <CardTitle className="text-lg">
                  {port === "pilot" ? t("controls.pilot_title") : t("controls.copilot_title")}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {port === "pilot" && sensorOwners.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 text-xs"
                    onClick={() => {
                      const firstOwner = sensorOwners[0];
                      const firstSensor = firstOwner?.sensors?.[0];
                      if (!firstOwner || !firstSensor) return;
                      updateProject((prev) => ({
                        ...prev,
                        controls: {
                          ...prev.controls,
                          pilotPriority: [
                            ...prev.controls.pilotPriority,
                            {
                              id: `pilot-sensor-${Date.now().toString(36)}`,
                              source: "sensor",
                              sensorOwnerId: firstOwner.id,
                              sensorId: firstSensor.id,
                              sensorTrigger: "whileTrue",
                              request: prev.superstructure.requests[0] ?? "IDLE",
                            },
                          ],
                        },
                      }));
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 text-cyan-300" />
                    Sensor
                  </Button>
                )}
                {port === "pilot" && zones.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 text-xs"
                    onClick={() => {
                      const firstZone = zones[0];
                      if (!firstZone) return;
                      updateProject((prev) => ({
                        ...prev,
                        controls: {
                          ...prev.controls,
                          pilotPriority: [
                            ...prev.controls.pilotPriority,
                            {
                              id: `pilot-zone-${Date.now().toString(36)}`,
                              source: "zone",
                              zoneId: firstZone.id,
                              zoneTrigger: "inZone",
                              request: prev.superstructure.requests[0] ?? "IDLE",
                            },
                          ],
                        },
                      }));
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 text-emerald-300" />
                    Zona
                  </Button>
                )}
                <Badge variant="outline">
                  {port === "pilot" ? "prioridade" : "whileTrue()"}
                </Badge>
                <Button
                  size="sm"
                  variant={showJava ? "secondary" : "outline"}
                  onClick={() => setShowJava((v) => !v)}
                  className="h-8 px-2.5 text-xs"
                >
                  <Code2 className="h-3.5 w-3.5" />
                  {showJava ? "Ocultar Java" : "Ver Java"}
                </Button>
              </div>
            </CardHeader>

            <CardContent key={port} className="pt-5 animate-fade-in">
              {port === "pilot" ? (
                project.controls.pilotPriority.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-[#253552] bg-[#0f1624] p-6 text-center text-[13px] text-slate-400">
                    Selecione um botão no controle e clique num request para mapear.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {project.controls.pilotPriority.map((rule, idx) => {
                      const isSensor = rule.source === "sensor";
                      const isZone = rule.source === "zone";
                      const isButton = !isSensor && !isZone;
                      const ruleButton = rule.button ?? "a";
                      const selectedOwner = sensorOwners.find((s) => s.id === rule.sensorOwnerId);
                      return (
                        <div
                          key={rule.id}
                          onClick={() => {
                            if (isButton && rule.button) setSelectedButton(rule.button);
                          }}
                          onMouseEnter={() => {
                            if (isButton && rule.button) setHoveredButton(rule.button);
                          }}
                          onMouseLeave={() => setHoveredButton(null)}
                          className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2.5 transition-all cursor-pointer ${
                            isButton && selectedButton === rule.button
                              ? "border-[#60a5fa] bg-[#19253d]"
                              : isButton && hoveredButton === rule.button
                                ? "border-[#3b6bb5] bg-[#152036]"
                                : "border-[#22304a] bg-[#0f1624] hover:border-[#3b6bb5]"
                          }`}
                        >
                          <span className="rounded bg-[#142c4f] px-2 py-0.5 font-mono text-[11px] text-[#93c5fd]">
                            #{idx + 1}
                          </span>
                          {isZone ? (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="flex flex-1 flex-wrap items-center gap-1.5"
                            >
                              <MapPin className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
                              <Select
                                className="h-8 w-32 font-mono text-[11px]"
                                value={rule.zoneId ?? ""}
                                onChange={(e) =>
                                  updateProject((prev) => ({
                                    ...prev,
                                    controls: {
                                      ...prev.controls,
                                      pilotPriority: prev.controls.pilotPriority.map((item) =>
                                        item.id === rule.id
                                          ? { ...item, zoneId: e.target.value }
                                          : item,
                                      ),
                                    },
                                  }))
                                }
                              >
                                {zones.map((z) => (
                                  <option key={z.id} value={z.id}>
                                    {z.name}
                                  </option>
                                ))}
                              </Select>
                              <Select
                                className="h-8 w-28 font-mono text-[11px]"
                                value={rule.zoneTrigger ?? "inZone"}
                                onChange={(e) =>
                                  updateProject((prev) => ({
                                    ...prev,
                                    controls: {
                                      ...prev.controls,
                                      pilotPriority: prev.controls.pilotPriority.map((item) =>
                                        item.id === rule.id
                                          ? {
                                              ...item,
                                              zoneTrigger: e.target.value as
                                                | "inZone"
                                                | "enteredZone"
                                                | "leftZone",
                                            }
                                          : item,
                                      ),
                                    },
                                  }))
                                }
                              >
                                <option value="inZone">inZone</option>
                                <option value="enteredZone">enteredZone</option>
                                <option value="leftZone">leftZone</option>
                              </Select>
                            </div>
                          ) : isSensor ? (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="flex flex-1 flex-wrap items-center gap-1.5"
                            >
                              <Radar className="h-3.5 w-3.5 text-cyan-300 shrink-0" />
                              <Select
                                className="h-8 w-28 font-mono text-[11px]"
                                value={rule.sensorOwnerId ?? ""}
                                onChange={(e) => {
                                  const nextOwner = sensorOwners.find(
                                    (s) => s.id === e.target.value,
                                  );
                                  updateProject((prev) => ({
                                    ...prev,
                                    controls: {
                                      ...prev.controls,
                                      pilotPriority: prev.controls.pilotPriority.map((item) =>
                                        item.id === rule.id
                                          ? {
                                              ...item,
                                              sensorOwnerId: e.target.value,
                                              sensorId: nextOwner?.sensors?.[0]?.id,
                                            }
                                          : item,
                                      ),
                                    },
                                  }));
                                }}
                              >
                                {sensorOwners.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                              </Select>
                              <Select
                                className="h-8 w-28 font-mono text-[11px]"
                                value={rule.sensorId ?? ""}
                                onChange={(e) =>
                                  updateProject((prev) => ({
                                    ...prev,
                                    controls: {
                                      ...prev.controls,
                                      pilotPriority: prev.controls.pilotPriority.map((item) =>
                                        item.id === rule.id
                                          ? { ...item, sensorId: e.target.value }
                                          : item,
                                      ),
                                    },
                                  }))
                                }
                              >
                                {(selectedOwner?.sensors ?? []).map((sen) => (
                                  <option key={sen.id} value={sen.id}>
                                    {sen.name}
                                  </option>
                                ))}
                              </Select>
                              <Select
                                className="h-8 w-24 font-mono text-[11px]"
                                value={rule.sensorTrigger ?? "whileTrue"}
                                onChange={(e) =>
                                  updateProject((prev) => ({
                                    ...prev,
                                    controls: {
                                      ...prev.controls,
                                      pilotPriority: prev.controls.pilotPriority.map((item) =>
                                        item.id === rule.id
                                          ? {
                                              ...item,
                                              sensorTrigger: e.target.value as
                                                | "whileTrue"
                                                | "onTrue"
                                                | "whileFalse"
                                                | "onFalse",
                                            }
                                          : item,
                                      ),
                                    },
                                  }))
                                }
                              >
                                <option value="whileTrue">whileTrue</option>
                                <option value="onTrue">onTrue</option>
                                <option value="whileFalse">whileFalse</option>
                                <option value="onFalse">onFalse</option>
                              </Select>
                            </div>
                          ) : (
                            <Select
                              className="w-24 h-8 font-mono text-xs"
                              value={ruleButton}
                              onChange={(e) => {
                                const nextBtn = e.target.value as XboxButton;
                                updateProject((prev) => ({
                                  ...prev,
                                  controls: {
                                    ...prev.controls,
                                    pilotPriority: prev.controls.pilotPriority.map((item) =>
                                      item.id === rule.id
                                        ? {
                                            ...item,
                                            button: nextBtn,
                                            triggerThreshold: isAnalogTrigger(nextBtn)
                                              ? item.triggerThreshold
                                              : undefined,
                                          }
                                        : item,
                                    ),
                                  },
                                }));
                              }}
                            >
                              {XBOX_BUTTONS.map((btn) => (
                                <option key={btn.value} value={btn.value}>
                                  {btn.label}
                                </option>
                              ))}
                            </Select>
                          )}
                          <span className="font-mono text-xs text-slate-500">→</span>
                          <Select
                            className="flex-1 min-w-[90px] font-mono h-8 text-xs"
                            value={rule.request}
                            onChange={(e) =>
                              updateProject((prev) => ({
                                ...prev,
                                controls: {
                                  ...prev.controls,
                                  pilotPriority: prev.controls.pilotPriority.map((item) =>
                                    item.id === rule.id ? { ...item, request: e.target.value } : item,
                                  ),
                                },
                              }))
                            }
                          >
                            {project.superstructure.requests.map((req) => (
                              <option key={req} value={req}>
                                {req}
                              </option>
                            ))}
                          </Select>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={idx === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              movePilot(idx, -1);
                            }}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={idx === project.controls.pilotPriority.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              movePilot(idx, 1);
                            }}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-1.5 font-mono text-[10px]"
                            title="Adicionar condição E"
                            onClick={(e) => {
                              e.stopPropagation();
                              const firstOwner = sensorOwners[0];
                              const firstSensor = firstOwner?.sensors?.[0];
                              const firstZone = zones[0];
                              const nextCond: PilotCondition =
                                firstOwner && firstSensor
                                  ? {
                                      id: `cond-${Date.now().toString(36)}`,
                                      kind: "sensor",
                                      sensorOwnerId: firstOwner.id,
                                      sensorId: firstSensor.id,
                                      negated: true,
                                    }
                                  : firstZone
                                    ? {
                                        id: `cond-${Date.now().toString(36)}`,
                                        kind: "zone",
                                        zoneId: firstZone.id,
                                      }
                                    : {
                                        id: `cond-${Date.now().toString(36)}`,
                                        kind: "button",
                                        button: "leftBumper",
                                      };
                              updateProject((prev) => ({
                                ...prev,
                                controls: {
                                  ...prev.controls,
                                  pilotPriority: prev.controls.pilotPriority.map((item) =>
                                    item.id === rule.id
                                      ? {
                                          ...item,
                                          andConditions: [...(item.andConditions ?? []), nextCond],
                                        }
                                      : item,
                                  ),
                                },
                              }));
                            }}
                          >
                            + E
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateProject((prev) => ({
                                ...prev,
                                controls: {
                                  ...prev.controls,
                                  pilotPriority: prev.controls.pilotPriority.filter(
                                    (p) => p.id !== rule.id,
                                  ),
                                },
                              }));
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                          </Button>
                          {(rule.andConditions ?? []).length > 0 && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="basis-full space-y-1.5 border-t border-[#22304a]/70 pt-2 mt-0.5"
                            >
                              {(rule.andConditions ?? []).map((cond, cIdx) => {
                                const condOwner =
                                  cond.kind === "sensor"
                                    ? sensorOwners.find((s) => s.id === cond.sensorOwnerId)
                                    : undefined;
                                return (
                                  <div
                                    key={cond.id}
                                    className="flex flex-wrap items-center gap-1.5 text-[11px]"
                                  >
                                    <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-300">
                                      E
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateProject((prev) => ({
                                          ...prev,
                                          controls: {
                                            ...prev.controls,
                                            pilotPriority: prev.controls.pilotPriority.map((item) =>
                                              item.id === rule.id
                                                ? {
                                                    ...item,
                                                    andConditions: (item.andConditions ?? []).map(
                                                      (c, i) =>
                                                        i === cIdx
                                                          ? { ...c, negated: !c.negated }
                                                          : c,
                                                    ),
                                                  }
                                                : item,
                                            ),
                                          },
                                        }))
                                      }
                                      className={`rounded border px-1.5 py-0.5 font-mono text-[10px] cursor-pointer ${
                                        cond.negated
                                          ? "border-rose-500/60 bg-rose-500/15 text-rose-300"
                                          : "border-[#253552] bg-[#0b0f17] text-slate-400"
                                      }`}
                                    >
                                      {cond.negated ? "NÃO (!)" : "SIM"}
                                    </button>
                                    <Select
                                      className="h-7 w-24 font-mono text-[11px]"
                                      value={cond.kind}
                                      onChange={(e) => {
                                        const nextKind = e.target.value as PilotCondition["kind"];
                                        const firstOwner = sensorOwners[0];
                                        const firstSensor = firstOwner?.sensors?.[0];
                                        const firstZone = zones[0];
                                        const replacement: PilotCondition =
                                          nextKind === "sensor" && firstOwner && firstSensor
                                            ? {
                                                id: cond.id,
                                                kind: "sensor",
                                                sensorOwnerId: firstOwner.id,
                                                sensorId: firstSensor.id,
                                                negated: cond.negated,
                                              }
                                            : nextKind === "zone" && firstZone
                                              ? {
                                                  id: cond.id,
                                                  kind: "zone",
                                                  zoneId: firstZone.id,
                                                  negated: cond.negated,
                                                }
                                              : {
                                                  id: cond.id,
                                                  kind: "button",
                                                  button: "leftBumper",
                                                  negated: cond.negated,
                                                };
                                        updateProject((prev) => ({
                                          ...prev,
                                          controls: {
                                            ...prev.controls,
                                            pilotPriority: prev.controls.pilotPriority.map((item) =>
                                              item.id === rule.id
                                                ? {
                                                    ...item,
                                                    andConditions: (item.andConditions ?? []).map(
                                                      (c, i) => (i === cIdx ? replacement : c),
                                                    ),
                                                  }
                                                : item,
                                            ),
                                          },
                                        }));
                                      }}
                                    >
                                      <option value="button">Botão</option>
                                      {sensorOwners.length > 0 && (
                                        <option value="sensor">Sensor</option>
                                      )}
                                      {zones.length > 0 && <option value="zone">Zona</option>}
                                    </Select>

                                    {cond.kind === "button" && (
                                      <Select
                                        className="h-7 w-24 font-mono text-[11px]"
                                        value={cond.button}
                                        onChange={(e) =>
                                          updateProject((prev) => ({
                                            ...prev,
                                            controls: {
                                              ...prev.controls,
                                              pilotPriority: prev.controls.pilotPriority.map(
                                                (item) =>
                                                  item.id === rule.id
                                                    ? {
                                                        ...item,
                                                        andConditions: (
                                                          item.andConditions ?? []
                                                        ).map((c, i) =>
                                                          i === cIdx && c.kind === "button"
                                                            ? {
                                                                ...c,
                                                                button: e.target
                                                                  .value as XboxButton,
                                                              }
                                                            : c,
                                                        ),
                                                      }
                                                    : item,
                                              ),
                                            },
                                          }))
                                        }
                                      >
                                        {XBOX_BUTTONS.map((btn) => (
                                          <option key={btn.value} value={btn.value}>
                                            {btn.label}
                                          </option>
                                        ))}
                                      </Select>
                                    )}

                                    {cond.kind === "sensor" && (
                                      <>
                                        <Select
                                          className="h-7 w-24 font-mono text-[11px]"
                                          value={cond.sensorOwnerId}
                                          onChange={(e) => {
                                            const nextOwner = sensorOwners.find(
                                              (s) => s.id === e.target.value,
                                            );
                                            updateProject((prev) => ({
                                              ...prev,
                                              controls: {
                                                ...prev.controls,
                                                pilotPriority: prev.controls.pilotPriority.map(
                                                  (item) =>
                                                    item.id === rule.id
                                                      ? {
                                                          ...item,
                                                          andConditions: (
                                                            item.andConditions ?? []
                                                          ).map((c, i) =>
                                                            i === cIdx && c.kind === "sensor"
                                                              ? {
                                                                  ...c,
                                                                  sensorOwnerId: e.target.value,
                                                                  sensorId:
                                                                    nextOwner?.sensors?.[0]?.id ??
                                                                    "",
                                                                }
                                                              : c,
                                                          ),
                                                        }
                                                      : item,
                                                ),
                                              },
                                            }));
                                          }}
                                        >
                                          {sensorOwners.map((s) => (
                                            <option key={s.id} value={s.id}>
                                              {s.name}
                                            </option>
                                          ))}
                                        </Select>
                                        <Select
                                          className="h-7 w-24 font-mono text-[11px]"
                                          value={cond.sensorId}
                                          onChange={(e) =>
                                            updateProject((prev) => ({
                                              ...prev,
                                              controls: {
                                                ...prev.controls,
                                                pilotPriority: prev.controls.pilotPriority.map(
                                                  (item) =>
                                                    item.id === rule.id
                                                      ? {
                                                          ...item,
                                                          andConditions: (
                                                            item.andConditions ?? []
                                                          ).map((c, i) =>
                                                            i === cIdx && c.kind === "sensor"
                                                              ? { ...c, sensorId: e.target.value }
                                                              : c,
                                                          ),
                                                        }
                                                      : item,
                                                ),
                                              },
                                            }))
                                          }
                                        >
                                          {(condOwner?.sensors ?? []).map((sen) => (
                                            <option key={sen.id} value={sen.id}>
                                              {sen.name}
                                            </option>
                                          ))}
                                        </Select>
                                      </>
                                    )}

                                    {cond.kind === "zone" && (
                                      <Select
                                        className="h-7 w-28 font-mono text-[11px]"
                                        value={cond.zoneId}
                                        onChange={(e) =>
                                          updateProject((prev) => ({
                                            ...prev,
                                            controls: {
                                              ...prev.controls,
                                              pilotPriority: prev.controls.pilotPriority.map(
                                                (item) =>
                                                  item.id === rule.id
                                                    ? {
                                                        ...item,
                                                        andConditions: (
                                                          item.andConditions ?? []
                                                        ).map((c, i) =>
                                                          i === cIdx && c.kind === "zone"
                                                            ? { ...c, zoneId: e.target.value }
                                                            : c,
                                                        ),
                                                      }
                                                    : item,
                                              ),
                                            },
                                          }))
                                        }
                                      >
                                        {zones.map((z) => (
                                          <option key={z.id} value={z.id}>
                                            {z.name}
                                          </option>
                                        ))}
                                      </Select>
                                    )}

                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 ml-auto"
                                      onClick={() =>
                                        updateProject((prev) => ({
                                          ...prev,
                                          controls: {
                                            ...prev.controls,
                                            pilotPriority: prev.controls.pilotPriority.map((item) =>
                                              item.id === rule.id
                                                ? {
                                                    ...item,
                                                    andConditions: (
                                                      item.andConditions ?? []
                                                    ).filter((_, i) => i !== cIdx),
                                                  }
                                                : item,
                                            ),
                                          },
                                        }))
                                      }
                                    >
                                      <Trash2 className="h-3 w-3 text-rose-400" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {isButton && isAnalogTrigger(ruleButton) && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="flex basis-full items-center gap-2 border-t border-[#22304a]/70 pt-2 mt-0.5 text-[11px] text-slate-300"
                            >
                              <span className="font-mono text-[10px] uppercase text-slate-400 shrink-0">
                                Gatilho ≥
                              </span>
                              <input
                                type="range"
                                min={5}
                                max={100}
                                step={5}
                                value={Math.round((rule.triggerThreshold ?? 0.5) * 100)}
                                onChange={(e) => {
                                  const thr = Math.round(Number.parseInt(e.target.value, 10)) / 100;
                                  updateProject((prev) => ({
                                    ...prev,
                                    controls: {
                                      ...prev.controls,
                                      pilotPriority: prev.controls.pilotPriority.map((item) =>
                                        item.id === rule.id ? { ...item, triggerThreshold: thr } : item,
                                      ),
                                    },
                                  }));
                                }}
                                className="flex-1"
                              />
                              <span className="w-20 text-right font-mono text-[11px] text-[#93c5fd] shrink-0">
                                {Math.round((rule.triggerThreshold ?? 0.5) * 100)}% (
                                {(rule.triggerThreshold ?? 0.5).toFixed(2)})
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : project.controls.copilotOverrides.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[#253552] bg-[#0f1624] p-6 text-center text-[13px] text-slate-400">
                  Selecione um botão no controle e clique num comando de subsistema para mapear.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {project.controls.copilotOverrides.map((ov) => {
                    const sub = motorSubsystems.find((s) => s.id === ov.subsystemId);
                    const subClass = sub ? toPascalCase(sub.name) : "Subsystem";
                    const cmdSig = `${subClass}Commands.${requestToCommandMethod(ov.request)}(...)`;
                    return (
                      <div
                        key={ov.id}
                        onClick={() => setSelectedButton(ov.button)}
                        onMouseEnter={() => setHoveredButton(ov.button)}
                        onMouseLeave={() => setHoveredButton(null)}
                        className={`space-y-1.5 rounded-lg border px-3 py-2.5 transition-all cursor-pointer ${
                          selectedButton === ov.button
                            ? "border-[#60a5fa] bg-[#19253d]"
                            : hoveredButton === ov.button
                              ? "border-[#3b6bb5] bg-[#152036]"
                              : "border-[#22304a] bg-[#0f1624] hover:border-[#3b6bb5]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Select
                            className="w-24 h-8 font-mono text-xs"
                            value={ov.button}
                            onChange={(e) => {
                              const nextBtn = e.target.value as XboxButton;
                              updateProject((prev) => ({
                                ...prev,
                                controls: {
                                  ...prev.controls,
                                  copilotOverrides: prev.controls.copilotOverrides.map((item) =>
                                    item.id === ov.id
                                      ? {
                                          ...item,
                                          button: nextBtn,
                                          triggerThreshold: isAnalogTrigger(nextBtn)
                                            ? item.triggerThreshold
                                            : undefined,
                                        }
                                      : item,
                                  ),
                                },
                              }));
                            }}
                          >
                            {XBOX_BUTTONS.map((btn) => (
                              <option key={btn.value} value={btn.value}>
                                {btn.label}
                              </option>
                            ))}
                          </Select>
                          <Select
                            className="flex-1 h-8 text-xs"
                            value={ov.subsystemId}
                            onChange={(e) => {
                              const nextSub = motorSubsystems.find(
                                (s) => s.id === e.target.value,
                              );
                              updateProject((prev) => ({
                                ...prev,
                                controls: {
                                  ...prev.controls,
                                  copilotOverrides: prev.controls.copilotOverrides.map((item) =>
                                    item.id === ov.id
                                      ? {
                                          ...item,
                                          subsystemId: e.target.value,
                                          request: nextSub?.fsm.requests[0] ?? "STOP",
                                        }
                                      : item,
                                  ),
                                },
                              }));
                            }}
                          >
                            {motorSubsystems.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </Select>
                          <Select
                            className="flex-1 font-mono h-8 text-xs"
                            value={ov.request}
                            onChange={(e) =>
                              updateProject((prev) => ({
                                ...prev,
                                controls: {
                                  ...prev.controls,
                                  copilotOverrides: prev.controls.copilotOverrides.map((item) =>
                                    item.id === ov.id ? { ...item, request: e.target.value } : item,
                                  ),
                                },
                              }))
                            }
                          >
                            {(sub?.fsm.requests ?? []).map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </Select>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateProject((prev) => ({
                                ...prev,
                                controls: {
                                  ...prev.controls,
                                  copilotOverrides: prev.controls.copilotOverrides.filter(
                                    (item) => item.id !== ov.id,
                                  ),
                                },
                              }));
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                          </Button>
                        </div>
                        <p className="font-mono text-[11px] text-slate-400">{cmdSig}</p>
                        {isAnalogTrigger(ov.button) && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-2 border-t border-[#22304a]/70 pt-2 text-[11px] text-slate-300"
                          >
                            <span className="font-mono text-[10px] uppercase text-slate-400 shrink-0">
                              Gatilho ≥
                            </span>
                            <input
                              type="range"
                              min={5}
                              max={100}
                              step={5}
                              value={Math.round((ov.triggerThreshold ?? 0.5) * 100)}
                              onChange={(e) => {
                                const thr = Math.round(Number.parseInt(e.target.value, 10)) / 100;
                                updateProject((prev) => ({
                                  ...prev,
                                  controls: {
                                    ...prev.controls,
                                    copilotOverrides: prev.controls.copilotOverrides.map((item) =>
                                      item.id === ov.id ? { ...item, triggerThreshold: thr } : item,
                                    ),
                                  },
                                }));
                              }}
                              className="flex-1"
                            />
                            <span className="w-20 text-right font-mono text-[11px] text-[#93c5fd] shrink-0">
                              {Math.round((ov.triggerThreshold ?? 0.5) * 100)}% (
                              {(ov.triggerThreshold ?? 0.5).toFixed(2)})
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {showJava && previewFile && (
            <Card className="h-[380px] flex flex-col overflow-hidden animate-fade-in">
              <CodeViewer
                filePath={previewFile.path}
                content={previewFile.content}
                className="flex-1"
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
