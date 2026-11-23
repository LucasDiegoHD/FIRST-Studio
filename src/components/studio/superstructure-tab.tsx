"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="h-full overflow-y-auto divide-y divide-[#171c26] bg-black">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">{t("super.title")}</h2>
          <p className="text-xs text-[#7c8ba1]">{t("super.desc")}</p>
        </div>
        <Button size="sm" variant="primary" onClick={addRobotPair}>
          <Plus className="h-3.5 w-3.5" />
          {t("super.add_pair")}
        </Button>
      </div>

      <div className="p-6 space-y-3">
        <h3 className="font-mono text-[11px] uppercase tracking-wider text-[#6b7689]">
          {t("super.matrix")}
        </h3>
        <div className="overflow-x-auto rounded border border-[#171c26]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#171c26] bg-[#05070b] text-[#8a94a6]">
              <tr>
                <th className="px-3 py-2 font-medium">RobotState</th>
                {project.subsystems.map((sub) => (
                  <th key={sub.id} className="px-3 py-2 font-medium">
                    {sub.name}Request
                  </th>
                ))}
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171c26]">
              {sup.states.map((stateName, rowIdx) => (
                <tr key={`${stateName}-${rowIdx}`} className="bg-[#030508] hover:bg-[#070b14]">
                  <td className="px-3 py-2">
                    <Input
                      value={stateName}
                      className="font-mono h-7 w-40"
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
                      <td key={sub.id} className="px-3 py-2">
                        <Select
                          className="font-mono h-7"
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
                  <td className="px-2 py-2">
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
                      <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-[#6b7689]">
            {t("super.bindings")}
          </h3>
          <div className="space-y-2">
            {sup.bindings.map((b, idx) => (
              <div key={`${b.request}-${idx}`} className="grid grid-cols-2 gap-2">
                <Input
                  value={b.request}
                  className="font-mono h-7"
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
                  className="font-mono h-7"
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

        <div className="space-y-3">
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-[#6b7689]">
            Mermaid (SuperStructure)
          </h3>
          <pre className="rounded border border-[#171c26] bg-[#030508] p-3 font-mono text-[11px] text-slate-300 overflow-x-auto">
            {generateSuperStructureMermaid(project)}
          </pre>
        </div>
      </div>
    </div>
  );
}
