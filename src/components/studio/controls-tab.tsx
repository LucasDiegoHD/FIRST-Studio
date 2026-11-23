"use client";

import React, { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Cog, Gamepad2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useProject } from "@/context/project-context";
import { requestToCommandMethod, toPascalCase } from "@/lib/generator/java-utils";
import type { XboxButton } from "@/lib/schema/ciprix-project";
import { CodeViewer } from "./code-viewer";
import { XboxControllerSvg, type MappedButtonInfo } from "./xbox-svg";

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

  // 1-click quick bind for the selected button
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

  // Live robot feedback for currently selected button
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
      const pct = stObj?.onEnter.type === "percentOutput" ? stObj.onEnter.value : 0;
      return {
        summary: `${pilotMatch.request} → ${firstSub.name}: ${stName} (${pct > 0 ? `+${Math.round(pct * 100)}%` : `${Math.round(pct * 100)}%`})`,
        pct,
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
    const pct = stObj?.onEnter.type === "percentOutput" ? stObj.onEnter.value : 0;
    return {
      summary: `${sub.name}.${copilotMatch.request} → ${stName} (${pct > 0 ? `+${Math.round(pct * 100)}%` : `${Math.round(pct * 100)}%`})`,
      pct,
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

  return (
    <div className="grid h-full min-h-0 grid-cols-1 divide-y divide-[#172030] bg-black lg:grid-cols-12 lg:divide-y-0 lg:divide-x">
      {/* Left Interactive Stage (Xbox Series X + Quick Bind + Live Motor Feedback) */}
      <div className="bg-studio-glow relative flex flex-col justify-between overflow-y-auto p-5 lg:col-span-7">
        {/* Top Port Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-[#1a2538] bg-[#05070b] p-1">
            <button
              type="button"
              onClick={() => setPort("pilot")}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium cursor-pointer transition-all ${
                port === "pilot"
                  ? "bg-[#142c4f] border border-[#3b6bb5] text-white shadow-[0_0_16px_-4px_rgba(37,99,235,0.6)]"
                  : "border border-transparent text-[#8a94a6] hover:text-white"
              }`}
            >
              <Gamepad2 className="h-3.5 w-3.5" />
              <span>{t("controls.pilot_title")}</span>
              <span className="rounded bg-black/50 px-1.5 py-0.2 font-mono text-[10px]">
                {project.controls.pilotPriority.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setPort("copilot")}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium cursor-pointer transition-all ${
                port === "copilot"
                  ? "bg-[#142c4f] border border-[#3b6bb5] text-white shadow-[0_0_16px_-4px_rgba(37,99,235,0.6)]"
                  : "border border-transparent text-[#8a94a6] hover:text-white"
              }`}
            >
              <Gamepad2 className="h-3.5 w-3.5" />
              <span>{t("controls.copilot_title")}</span>
              <span className="rounded bg-black/50 px-1.5 py-0.2 font-mono text-[10px]">
                {project.controls.copilotOverrides.length}
              </span>
            </button>
          </div>

          <p className="font-mono text-[11px] text-[#7c8ba1]">
            {port === "pilot" ? "SuperStructureCommands" : "@AutoCommandFactory"}
          </p>
        </div>

        {/* Center Xbox Series X SVG */}
        <div className="my-auto flex items-center justify-center py-3">
          <XboxControllerSvg
            mappedButtons={mappedButtons}
            selectedButton={selectedButton}
            hoveredButton={hoveredButton}
            onSelectButton={setSelectedButton}
            onHoverButton={setHoveredButton}
          />
        </div>

        {/* Bottom Interactive Quick-Bind + Live Reaction Dock */}
        <div className="rounded-lg border border-[#264f8a]/75 bg-[#050811]/95 p-3.5 space-y-3 shadow-[0_0_24px_-10px_rgba(37,99,235,0.5)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded border border-[#3b6bb5] bg-[#142c4f] px-2 py-0.5 font-mono text-xs font-semibold text-white">
                {selectedBtnMeta?.label ?? selectedButton}
              </span>
              <span className="text-xs text-[#9aa5b6]">{selectedBtnMeta?.fullName}</span>
            </div>

            {liveReaction ? (
              <div className="flex items-center gap-2 rounded border border-[#1d345c] bg-black px-2.5 py-1 font-mono text-[11px] text-[#93c5fd]">
                <Cog
                  className={`h-3.5 w-3.5 ${
                    liveReaction.pct > 0
                      ? "text-[#60a5fa] animate-motor-cw"
                      : liveReaction.pct < 0
                        ? "text-[#60a5fa] animate-motor-ccw"
                        : "text-[#475266]"
                  }`}
                />
                <span>{liveReaction.summary}</span>
              </div>
            ) : (
              <span className="font-mono text-[11px] text-[#556072]">
                Clique num comando abaixo para vincular
              </span>
            )}
          </div>

          {/* 1-Click Action Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {port === "pilot"
              ? project.superstructure.requests.map((req) => {
                  const active = currentPilotRule?.request === req;
                  return (
                    <button
                      key={req}
                      type="button"
                      onClick={() => quickBindPilot(req)}
                      className={`rounded-md border px-2.5 py-1 font-mono text-[11px] transition-all cursor-pointer ${
                        active
                          ? "border-[#3b82f6] bg-[#142c4f] text-white"
                          : "border-[#1c2536] bg-black text-[#9aa5b6] hover:border-[#264f8a] hover:text-white"
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
                      className={`rounded-md border px-2.5 py-1 font-mono text-[11px] transition-all cursor-pointer ${
                        active
                          ? "border-[#3b82f6] bg-[#142c4f] text-white"
                          : "border-[#1c2536] bg-black text-[#9aa5b6] hover:border-[#264f8a] hover:text-white"
                      }`}
                    >
                      {active ? "✓ " : "+ "}
                      {choice.subsystemName}.{choice.request}
                    </button>
                  );
                })}
          </div>
        </div>
      </div>

      {/* Right Column: Priority / Override List + Live Java Preview */}
      <div className="flex h-full min-h-0 flex-col bg-[#05070b] lg:col-span-5">
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#7c8ba1]">
              {port === "pilot" ? t("controls.pilot_title") : t("controls.copilot_title")}
            </span>
            <span className="font-mono text-[10px] text-[#556072]">
              {port === "pilot" ? "ordem = prioridade" : "whileTrue()"}
            </span>
          </div>

          {port === "pilot" ? (
            project.controls.pilotPriority.length === 0 ? (
              <p className="rounded border border-dashed border-[#1d2738] p-5 text-center text-xs text-[#6b7689]">
                Selecione um botão no controle e clique num request para mapear.
              </p>
            ) : (
              <div className="space-y-2">
                {project.controls.pilotPriority.map((rule, idx) => (
                  <div
                    key={rule.id}
                    onClick={() => setSelectedButton(rule.button)}
                    onMouseEnter={() => setHoveredButton(rule.button)}
                    onMouseLeave={() => setHoveredButton(null)}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 transition-all cursor-pointer ${
                      selectedButton === rule.button
                        ? "border-[#3b6bb5] bg-[#142c4f]/45"
                        : hoveredButton === rule.button
                          ? "border-[#264f8a] bg-[#0b1629]"
                          : "border-[#172030] bg-black hover:border-[#264f8a]"
                    }`}
                  >
                    <span className="rounded bg-[#0d1729] px-1.5 py-0.5 font-mono text-[10px] text-[#7cb3ff]">
                      #{idx + 1}
                    </span>
                    <Select
                      className="w-24 h-7 font-mono"
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
                    <span className="font-mono text-xs text-[#556072]">→</span>
                    <Select
                      className="flex-1 font-mono h-7"
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
                            pilotPriority: prev.controls.pilotPriority.filter((p) => p.id !== rule.id),
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
            <p className="rounded border border-dashed border-[#1d2738] p-5 text-center text-xs text-[#6b7689]">
              Selecione um botão no controle e clique num comando de subsistema para mapear.
            </p>
          ) : (
            <div className="space-y-2">
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
                    className={`space-y-1.5 rounded-md border px-3 py-2 transition-all cursor-pointer ${
                      selectedButton === ov.button
                        ? "border-[#3b6bb5] bg-[#142c4f]/45"
                        : hoveredButton === ov.button
                          ? "border-[#264f8a] bg-[#0b1629]"
                          : "border-[#172030] bg-black hover:border-[#264f8a]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Select
                        className="w-24 h-7 font-mono"
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
                        className="flex-1 h-7"
                        value={ov.subsystemId}
                        onChange={(e) => {
                          const nextSub = project.subsystems.find((s) => s.id === e.target.value);
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
                        className="flex-1 font-mono h-7"
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
                    <p className="font-mono text-[10px] text-[#6b7689]">{cmdSig}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Live Java Preview */}
        {previewFile && (
          <div className="h-[44%] min-h-[200px] border-t border-[#172030] flex flex-col">
            <CodeViewer
              filePath={previewFile.path}
              content={previewFile.content}
              className="flex-1"
            />
          </div>
        )}
      </div>
    </div>
  );
}
