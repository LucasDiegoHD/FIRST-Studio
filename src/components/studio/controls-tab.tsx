"use client";

import React from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useProject } from "@/context/project-context";
import type { XboxButton } from "@/lib/schema/ciprix-project";

const XBOX_BUTTONS: { value: XboxButton; label: string }[] = [
  { value: "a", label: "A" },
  { value: "b", label: "B" },
  { value: "x", label: "X" },
  { value: "y", label: "Y" },
  { value: "leftBumper", label: "Left Bumper (LB)" },
  { value: "rightBumper", label: "Right Bumper (RB)" },
  { value: "leftTrigger", label: "Left Trigger (LT)" },
  { value: "rightTrigger", label: "Right Trigger (RT)" },
  { value: "povUp", label: "D-Pad Up" },
  { value: "povDown", label: "D-Pad Down" },
  { value: "povLeft", label: "D-Pad Left" },
  { value: "povRight", label: "D-Pad Right" },
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

  const addPilotRule = () => {
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
  };

  const addCopilotOverride = () => {
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
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>{t("controls.pilot_title")}</CardTitle>
            <CardDescription>{t("controls.pilot_desc")}</CardDescription>
          </div>
          <Button size="sm" onClick={addPilotRule}>
            <Plus className="h-3.5 w-3.5" />
            {t("controls.add_pilot")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {project.controls.pilotPriority.map((rule, idx) => (
            <div
              key={rule.id}
              className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/60 p-2.5"
            >
              <Badge variant="info">#{idx + 1}</Badge>
              <Select
                className="flex-1 text-xs h-8"
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
                className="flex-1 font-mono text-xs h-8"
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>{t("controls.copilot_title")}</CardTitle>
            <CardDescription>{t("controls.copilot_desc")}</CardDescription>
          </div>
          <Button size="sm" onClick={addCopilotOverride} disabled={project.subsystems.length === 0}>
            <Plus className="h-3.5 w-3.5" />
            {t("controls.add_copilot")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {project.controls.copilotOverrides.map((ov) => {
            const sub = project.subsystems.find((s) => s.id === ov.subsystemId);
            return (
              <div
                key={ov.id}
                className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/60 p-2.5"
              >
                <Select
                  className="w-36 text-xs h-8"
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
                  className="flex-1 text-xs h-8"
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
                  className="flex-1 font-mono text-xs h-8"
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
        </CardContent>
      </Card>
    </div>
  );
}
