"use client";

import React, { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Code2, Cog, Gamepad2, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useProject } from "@/context/project-context";
import { requestToCommandMethod, toPascalCase } from "@/lib/generator/java-utils";
import type { SubsystemAction, XboxButton } from "@/lib/schema/ciprix-project";
import { CodeViewer } from "./code-viewer";
import { XboxControllerSvg, type MappedButtonInfo } from "./xbox-svg";

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

  const mappedButtons = useMemo(() => {
    const map = new Map<XboxButton, MappedButtonInfo>();
    if (port === "pilot") {
      project.controls.pilotPriority.forEach((p, idx) => {
        if (!map.has(p.button)) {
          map.set(p.button, { label: p.request, priority: idx + 1 });
        }
      });
    } else {
      for (const ov of project.controls.copilotOverrides) {
        if (!map.has(ov.button)) {
          const sub = project.subsystems.find((s) => s.id === ov.subsystemId);
          map.set(ov.button, { label: `${sub?.name ?? "?"}.${ov.request}` });
        }
      }
    }
    return map;
  }, [port, project.controls, project.subsystems]);

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
      const existingIdx = prev.controls.pilotPriority.findIndex((p) => p.button === selectedButton);
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
            { id: `pilot-${Date.now()}`, button: selectedButton, request },
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

  const liveReaction = useMemo(() => {
    if (port === "pilot") {
      const pilotMatch = project.controls.pilotPriority.find((p) => p.button === selectedButton);
      if (!pilotMatch) return null;
      const robotState =
        project.superstructure.bindings.find((b) => b.request === pilotMatch.request)?.entryState ??
        project.superstructure.initialState;
      const firstSub = project.subsystems[0];
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
      const reaction = formatReaction(stObj?.onEnter);
      return {
        summary: `${pilotMatch.request} → ${firstSub.name}: ${stName} (${reaction.label})`,
        pct: reaction.dir,
      };
    }

    const copilotMatch = project.controls.copilotOverrides.find((ov) => ov.button === selectedButton);
    if (!copilotMatch) return null;
    const sub = project.subsystems.find((s) => s.id === copilotMatch.subsystemId);
    if (!sub) return null;
    const stName =
      sub.fsm.bindings.find((b) => b.request === copilotMatch.request)?.goalState ??
      sub.fsm.initialState;
    const stObj = sub.fsm.states.find((s) => s.name === stName);
    const reaction = formatReaction(stObj?.onEnter);
    return {
      summary: `${sub.name}.${copilotMatch.request} → ${stName} (${reaction.label})`,
      pct: reaction.dir,
    };
  }, [port, selectedButton, project]);

  const copilotChoices = useMemo(
    () =>
      project.subsystems.flatMap((sub) =>
        sub.fsm.requests.map((req) => ({
          subsystemId: sub.id,
          subsystemName: sub.name,
          request: req,
        })),
      ),
    [project.subsystems],
  );

  const previewFile = useMemo(() => {
    const targetName =
      port === "pilot" ? "SuperStructureCommands.java" : "RobotContainer.java";
    return generatedFiles.find((f) => f.path.endsWith(targetName)) ?? generatedFiles[0];
  }, [port, generatedFiles]);

  const selectedBtnMeta = XBOX_BUTTONS.find((b) => b.value === selectedButton);
  const currentPilotRule = project.controls.pilotPriority.find((p) => p.button === selectedButton);
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
          <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-[#22304a] bg-[#0f1624]/80 py-4">
            <CardTitle className="text-lg">
              {port === "pilot" ? "Controle do Piloto (Port 0)" : "Controle do Copiloto (Port 1)"}
            </CardTitle>
            <Badge variant="outline">
              {port === "pilot" ? "SuperStructureCommands" : "@AutoCommandFactory"}
            </Badge>
          </CardHeader>

          <CardContent className="space-y-5 p-6">
            <div className="flex items-center justify-center py-2">
              <XboxControllerSvg
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

        {/* Right Column: Priority / Override Rules + On-Demand Java Card */}
        <div className="xl:col-span-5 space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-[#22304a] pb-4">
              <div>
                <CardTitle className="text-lg">
                  {port === "pilot" ? t("controls.pilot_title") : t("controls.copilot_title")}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
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
                    {project.controls.pilotPriority.map((rule, idx) => (
                      <div
                        key={rule.id}
                        onClick={() => setSelectedButton(rule.button)}
                        onMouseEnter={() => setHoveredButton(rule.button)}
                        onMouseLeave={() => setHoveredButton(null)}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-all cursor-pointer ${
                          selectedButton === rule.button
                            ? "border-[#60a5fa] bg-[#19253d]"
                            : hoveredButton === rule.button
                              ? "border-[#3b6bb5] bg-[#152036]"
                              : "border-[#22304a] bg-[#0f1624] hover:border-[#3b6bb5]"
                        }`}
                      >
                        <span className="rounded bg-[#142c4f] px-2 py-0.5 font-mono text-[11px] text-[#93c5fd]">
                          #{idx + 1}
                        </span>
                        <Select
                          className="w-24 h-8 font-mono text-xs"
                          value={rule.button}
                          onChange={(e) =>
                            updateProject((prev) => ({
                              ...prev,
                              controls: {
                                ...prev.controls,
                                pilotPriority: prev.controls.pilotPriority.map((item) =>
                                  item.id === rule.id
                                    ? { ...item, button: e.target.value as XboxButton }
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
                        <span className="font-mono text-xs text-slate-500">→</span>
                        <Select
                          className="flex-1 font-mono h-8 text-xs"
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
                      </div>
                    ))}
                  </div>
                )
              ) : project.controls.copilotOverrides.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[#253552] bg-[#0f1624] p-6 text-center text-[13px] text-slate-400">
                  Selecione um botão no controle e clique num comando de subsistema para mapear.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {project.controls.copilotOverrides.map((ov) => {
                    const sub = project.subsystems.find((s) => s.id === ov.subsystemId);
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
                            onChange={(e) =>
                              updateProject((prev) => ({
                                ...prev,
                                controls: {
                                  ...prev.controls,
                                  copilotOverrides: prev.controls.copilotOverrides.map((item) =>
                                    item.id === ov.id
                                      ? { ...item, button: e.target.value as XboxButton }
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
                          <Select
                            className="flex-1 h-8 text-xs"
                            value={ov.subsystemId}
                            onChange={(e) => {
                              const nextSub = project.subsystems.find(
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
                            {project.subsystems.map((s) => (
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
