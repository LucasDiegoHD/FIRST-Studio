"use client";

import React from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useProject } from "@/context/project-context";
import type { XboxButton } from "@/lib/schema/ciprix-project";

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

  return (
    <div className="grid h-full grid-cols-1 divide-y divide-[#171c26] bg-black lg:grid-cols-2 lg:divide-y-0 lg:divide-x">
      {/* Pilot */}
      <div className="flex flex-col overflow-y-auto p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">{t("controls.pilot_title")}</h2>
            <p className="text-xs text-[#7c8ba1]">{t("controls.pilot_desc")}</p>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              const firstReq = project.superstructure.requests[0] ?? "IDLE";
              updateProject((prev) => ({
                ...prev,
                controls: {
                  ...prev.controls,
                  pilotPriority: [
                    ...prev.controls.pilotPriority,
                    { id: `pilot-${Date.now()}`, button: "x", request: firstReq },
                  ],
                },
              }));
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("controls.add_pilot")}
          </Button>
        </div>

        <div className="divide-y divide-[#171c26] rounded border border-[#171c26] bg-[#05070b]">
          {project.controls.pilotPriority.map((rule, idx) => (
            <div key={rule.id} className="flex items-center gap-2 px-3 py-2">
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
              <Button size="icon" variant="ghost" disabled={idx === 0} onClick={() => movePilot(idx, -1)}>
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                disabled={idx === project.controls.pilotPriority.length - 1}
                onClick={() => movePilot(idx, 1)}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() =>
                  updateProject((prev) => ({
                    ...prev,
                    controls: {
                      ...prev.controls,
                      pilotPriority: prev.controls.pilotPriority.filter((p) => p.id !== rule.id),
                    },
                  }))
                }
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-400" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Copilot */}
      <div className="flex flex-col overflow-y-auto p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">{t("controls.copilot_title")}</h2>
            <p className="text-xs text-[#7c8ba1]">{t("controls.copilot_desc")}</p>
          </div>
          <Button
            size="sm"
            variant="primary"
            disabled={project.subsystems.length === 0}
            onClick={() => {
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
                      button: "x",
                      subsystemId: firstSub.id,
                      request: firstSub.fsm.requests[0] ?? "STOP",
                    },
                  ],
                },
              }));
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("controls.add_copilot")}
          </Button>
        </div>

        <div className="divide-y divide-[#171c26] rounded border border-[#171c26] bg-[#05070b]">
          {project.controls.copilotOverrides.map((ov) => {
            const sub = project.subsystems.find((s) => s.id === ov.subsystemId);
            return (
              <div key={ov.id} className="flex items-center gap-2 px-3 py-2">
                <Select
                  className="w-28 h-7"
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
                  onClick={() =>
                    updateProject((prev) => ({
                      ...prev,
                      controls: {
                        ...prev.controls,
                        copilotOverrides: prev.controls.copilotOverrides.filter(
                          (item) => item.id !== ov.id,
                        ),
                      },
                    }))
                  }
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
