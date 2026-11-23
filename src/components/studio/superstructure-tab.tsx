"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useProject } from "@/context/project-context";
import { toUpperSnake } from "@/lib/generator/java-utils";
import { generateSuperStructureMermaid } from "@/lib/generator/mermaid";

export function SuperStructureTab() {
  const { project, updateProject, t } = useProject();
  const sup = project.superstructure;

  const addRobotPair = () => {
    const idx = sup.states.length + 1;
    const req = `CUSTOM_REQ_${idx}`;
    const st = `CUSTOM_STATE_${idx}`;
    const defaultRow: Record<string, string> = {};
    for (const sub of project.subsystems) {
      defaultRow[sub.id] = sub.fsm.initialRequest;
    }

    updateProject((prev) => ({
      ...prev,
      superstructure: {
        ...prev.superstructure,
        requests: [...prev.superstructure.requests, req],
        states: [...prev.superstructure.states, st],
        stateActions: { ...prev.superstructure.stateActions, [st]: defaultRow },
        bindings: [...prev.superstructure.bindings, { request: req, entryState: st }],
      },
    }));
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{t("super.title")}</CardTitle>
            <CardDescription>{t("super.desc")}</CardDescription>
          </div>
          <Button size="sm" onClick={addRobotPair}>
            <Plus className="h-3.5 w-3.5" />
            {t("super.add_pair")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
              {t("super.matrix")}
            </h4>
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400">
                  <tr>
                    <th className="p-3 font-medium">RobotState</th>
                    {project.subsystems.map((sub) => (
                      <th key={sub.id} className="p-3 font-medium">
                        {sub.name}Request
                      </th>
                    ))}
                    <th className="p-3 w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {sup.states.map((stateName, rowIdx) => (
                    <tr key={`${stateName}-${rowIdx}`} className="bg-slate-950/40">
                      <td className="p-2.5">
                        <Input
                          value={stateName}
                          className="font-mono text-xs h-8 w-40"
                          onChange={(e) => {
                            const nextName = toUpperSnake(e.target.value);
                            updateProject((prev) => {
                              const nextActions = { ...prev.superstructure.stateActions };
                              const row = nextActions[stateName] ?? {};
                              delete nextActions[stateName];
                              nextActions[nextName] = row;
                              return {
                                ...prev,
                                superstructure: {
                                  ...prev.superstructure,
                                  initialState:
                                    prev.superstructure.initialState === stateName
                                      ? nextName
                                      : prev.superstructure.initialState,
                                  states: prev.superstructure.states.map((s, i) =>
                                    i === rowIdx ? nextName : s,
                                  ),
                                  stateActions: nextActions,
                                  bindings: prev.superstructure.bindings.map((b) =>
                                    b.entryState === stateName ? { ...b, entryState: nextName } : b,
                                  ),
                                },
                              };
                            });
                          }}
                        />
                      </td>
                      {project.subsystems.map((sub) => {
                        const currentReq =
                          sup.stateActions[stateName]?.[sub.id] ?? sub.fsm.initialRequest;
                        return (
                          <td key={sub.id} className="p-2.5">
                            <Select
                              className="font-mono text-xs h-8"
                              value={currentReq}
                              onChange={(e) =>
                                updateProject((prev) => ({
                                  ...prev,
                                  superstructure: {
                                    ...prev.superstructure,
                                    stateActions: {
                                      ...prev.superstructure.stateActions,
                                      [stateName]: {
                                        ...(prev.superstructure.stateActions[stateName] ?? {}),
                                        [sub.id]: e.target.value,
                                      },
                                    },
                                  },
                                }))
                              }
                            >
                              {sub.fsm.requests.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </Select>
                          </td>
                        );
                      })}
                      <td className="p-2.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={sup.states.length <= 1}
                          onClick={() =>
                            updateProject((prev) => {
                              const nextActions = { ...prev.superstructure.stateActions };
                              delete nextActions[stateName];
                              return {
                                ...prev,
                                superstructure: {
                                  ...prev.superstructure,
                                  states: prev.superstructure.states.filter((_, i) => i !== rowIdx),
                                  stateActions: nextActions,
                                  bindings: prev.superstructure.bindings.filter(
                                    (b) => b.entryState !== stateName,
                                  ),
                                },
                              };
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4 text-rose-400" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                {t("super.bindings")}
              </h4>
              <div className="space-y-2">
                {sup.bindings.map((b, idx) => (
                  <div key={`${b.request}-${idx}`} className="grid grid-cols-2 gap-2">
                    <Input
                      value={b.request}
                      className="font-mono text-xs h-8"
                      onChange={(e) => {
                        const nextReq = toUpperSnake(e.target.value);
                        const oldReq = b.request;
                        updateProject((prev) => ({
                          ...prev,
                          superstructure: {
                            ...prev.superstructure,
                            initialRequest:
                              prev.superstructure.initialRequest === oldReq
                                ? nextReq
                                : prev.superstructure.initialRequest,
                            requests: prev.superstructure.requests.map((r) =>
                              r === oldReq ? nextReq : r,
                            ),
                            bindings: prev.superstructure.bindings.map((item, i) =>
                              i === idx ? { ...item, request: nextReq } : item,
                            ),
                          },
                          controls: {
                            ...prev.controls,
                            pilotPriority: prev.controls.pilotPriority.map((p) =>
                              p.request === oldReq ? { ...p, request: nextReq } : p,
                            ),
                          },
                        }));
                      }}
                    />
                    <Select
                      className="font-mono text-xs h-8"
                      value={b.entryState}
                      onChange={(e) =>
                        updateProject((prev) => ({
                          ...prev,
                          superstructure: {
                            ...prev.superstructure,
                            bindings: prev.superstructure.bindings.map((item, i) =>
                              i === idx ? { ...item, entryState: e.target.value } : item,
                            ),
                          },
                        }))
                      }
                    >
                      {sup.states.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                Mermaid (SuperStructure)
              </h4>
              <pre className="rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-sky-200 overflow-x-auto">
                {generateSuperStructureMermaid(project)}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
