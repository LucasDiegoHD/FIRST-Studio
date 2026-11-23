"use client";

import React, { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useProject } from "@/context/project-context";
import type { XboxButton } from "@/lib/schema/ciprix-project";
import { XboxControllerSvg } from "./xbox-svg";

const XBOX_BUTTONS: { value: XboxButton; label: string }[] = [
  { value: "a", label: "A" },
  { value: "b", label: "B" },
  { value: "x", label: "X" },
  { value: "y", label: "Y" },
  { value: "leftBumper", label: "LB" },
  { value: "rightBumper", label: "RB" },
  { value: "leftTrigger", label: "LT" },
  { value: "rightTrigger", label: "RT" },
  { value: "povUp", label: "D-Up" },
  { value: "povDown", label: "D-Down" },
  { value: "povLeft", label: "D-Left" },
  { value: "povRight", label: "D-Right" },
  { value: "start", label: "Start" },
  { value: "back", label: "Back" },
];

export function ControlsTab() {
  const { project, updateProject, t } = useProject();
  const [port, setPort] = useState<"pilot" | "copilot">("pilot");
  const [selectedButton, setSelectedButton] = useState<XboxButton>("rightBumper");

  const mappedButtons = useMemo(() => {
    const map = new Map<XboxButton, string>();
    if (port === "pilot") {
      for (const p of project.controls.pilotPriority) {
        map.set(p.button, p.request);
      }
    } else {
      for (const ov of project.controls.copilotOverrides) {
        const sub = project.subsystems.find((s) => s.id === ov.subsystemId);
        map.set(ov.button, `${sub?.name ?? "?"}.${ov.request}`);
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

  const bindSelectedButton = () => {
    if (port === "pilot") {
      const firstReq = project.superstructure.requests[0] ?? "IDLE";
      updateProject((prev) => ({
        ...prev,
        controls: {
          ...prev.controls,
          pilotPriority: [
            ...prev.controls.pilotPriority,
            { id: `pilot-${Date.now()}`, button: selectedButton, request: firstReq },
          ],
        },
      }));
    } else {
      const firstSub = project.subsystems[0];
      if (!firstSub) return;
      updateProject((prev) => ({
        ...prev,
        controls: {
          ...prev.controls,
          copilotOverrides: [
            ...prev.controls.copilotOverrides,
            {
              id: `copilot-${Date.now()}`,
              button: selectedButton,
              subsystemId: firstSub.id,
              request: firstSub.fsm.requests[0] ?? "STOP",
            },
          ],
        },
      }));
    }
  };

  const selectedLabel = mappedButtons.get(selectedButton);

  return (
    <div className="flex h-full flex-col bg-black">
      {/* Top Port Switcher */}
      <div className="flex items-center justify-between border-b border-[#171c26] bg-[#05070b] px-4 py-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPort("pilot")}
            className={`rounded px-3 py-1 text-xs cursor-pointer ${
              port === "pilot"
                ? "bg-[#142c4f] border border-[#264f8a] text-white"
                : "border border-[#1a2232] bg-black text-[#8a94a6]"
            }`}
          >
            {t("controls.pilot_title")}
          </button>
          <button
            type="button"
            onClick={() => setPort("copilot")}
            className={`rounded px-3 py-1 text-xs cursor-pointer ${
              port === "copilot"
                ? "bg-[#142c4f] border border-[#264f8a] text-white"
                : "border border-[#1a2232] bg-black text-[#8a94a6]"
            }`}
          >
            {t("controls.copilot_title")}
          </button>
        </div>
        <p className="hidden sm:block text-xs text-[#7c8ba1]">
          {port === "pilot" ? t("controls.pilot_desc") : t("controls.copilot_desc")}
        </p>
      </div>

      {/* Main Split */}
      <div className="grid flex-1 min-h-0 grid-cols-1 divide-y divide-[#171c26] lg:grid-cols-12 lg:divide-y-0 lg:divide-x">
        {/* Interactive Xbox SVG */}
        <div className="bg-dot-matrix lg:col-span-6 flex flex-col items-center justify-center p-6 gap-5">
          <XboxControllerSvg
            mappedButtons={mappedButtons}
            selectedButton={selectedButton}
            onSelectButton={setSelectedButton}
          />

          <div className="flex items-center justify-between gap-4 rounded border border-[#171c26] bg-[#05070b] px-4 py-2.5 w-full max-w-[420px]">
            <div className="font-mono text-xs">
              <span className="text-[#60a5fa]">
                {XBOX_BUTTONS.find((b) => b.value === selectedButton)?.label ?? selectedButton}
              </span>
              <span className="mx-2 text-[#475266]">→</span>
              <span className="text-slate-200">{selectedLabel ?? "livre"}</span>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={bindSelectedButton}
              disabled={port === "copilot" && project.subsystems.length === 0}
            >
              <Plus className="h-3.5 w-3.5" />
              {port === "pilot" ? t("controls.add_pilot") : t("controls.add_copilot")}
            </Button>
          </div>
        </div>

        {/* Binding List */}
        <div className="lg:col-span-6 overflow-y-auto bg-[#05070b] p-6 space-y-3">
          {port === "pilot" ? (
            <div className="divide-y divide-[#171c26] rounded border border-[#171c26] bg-black">
              {project.controls.pilotPriority.map((rule, idx) => (
                <div
                  key={rule.id}
                  onClick={() => setSelectedButton(rule.button)}
                  className={`flex items-center gap-2 px-3 py-2.5 transition-colors cursor-pointer ${
                    selectedButton === rule.button ? "bg-[#0a1526]" : "hover:bg-[#070b14]"
                  }`}
                >
                  <span className="w-6 font-mono text-[11px] text-[#6b7689]">#{idx + 1}</span>
                  <Select
                    className="flex-1 h-7"
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
          ) : (
            <div className="divide-y divide-[#171c26] rounded border border-[#171c26] bg-black">
              {project.controls.copilotOverrides.map((ov) => {
                const sub = project.subsystems.find((s) => s.id === ov.subsystemId);
                return (
                  <div
                    key={ov.id}
                    onClick={() => setSelectedButton(ov.button)}
                    className={`flex items-center gap-2 px-3 py-2.5 transition-colors cursor-pointer ${
                      selectedButton === ov.button ? "bg-[#0a1526]" : "hover:bg-[#070b14]"
                    }`}
                  >
                    <Select
                      className="w-24 h-7"
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
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
