"use client";

import React from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { useProject } from "@/context/project-context";
import type { SubsystemConfig } from "@/lib/schema/ciprix-project";

export function BindingsPanel({ subsystem }: { subsystem: SubsystemConfig }) {
  const { updateSubsystem, t } = useProject();
  const stateNames = subsystem.fsm.states.map((s) => s.name);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-300">{t("fsm.bindings_title")}</span>
          <Badge variant="default">{subsystem.fsm.bindings.length}</Badge>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const unbound = subsystem.fsm.requests.find(
              (r) => !subsystem.fsm.bindings.some((b) => b.request === r),
            );
            const fallbackReq = unbound ?? subsystem.fsm.requests[0] ?? "STOP";
            const fallbackState = stateNames[0] ?? subsystem.fsm.initialState;
            updateSubsystem(subsystem.id, (prev) => ({
              ...prev,
              fsm: {
                ...prev.fsm,
                bindings: [
                  ...prev.fsm.bindings,
                  {
                    request: fallbackReq,
                    entryState: fallbackState,
                    goalState: fallbackState,
                    intermediateStates: [],
                  },
                ],
              },
            }));
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          {t("fsm.add_binding")}
        </Button>
      </div>

      <div className="space-y-2.5">
        {subsystem.fsm.bindings.map((binding, idx) => (
          <Field
            key={`${binding.request}-${idx}`}
            path={`subsystems.${subsystem.id}.fsm.bindings.${binding.request}`}
          >
            <div className="space-y-2 rounded-lg border border-[#22304a] bg-[#0f1624] p-2.5">
              <div className="grid grid-cols-12 gap-1.5 items-center">
                <div className="col-span-4 space-y-1">
                  <span className="block font-mono text-[10px] uppercase text-slate-400">
                    {t("fsm.col_request")}
                  </span>
                  <Select
                    value={binding.request}
                    className="font-mono h-8 text-xs"
                    onChange={(e) =>
                      updateSubsystem(subsystem.id, (prev) => ({
                        ...prev,
                        fsm: {
                          ...prev.fsm,
                          bindings: prev.fsm.bindings.map((b, i) =>
                            i === idx ? { ...b, request: e.target.value } : b,
                          ),
                        },
                      }))
                    }
                  >
                    {subsystem.fsm.requests.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="col-span-3 space-y-1">
                  <span className="block font-mono text-[10px] uppercase text-slate-400">
                    {t("fsm.col_entry")}
                  </span>
                  <Select
                    value={binding.entryState}
                    className="font-mono h-8 text-xs"
                    onChange={(e) =>
                      updateSubsystem(subsystem.id, (prev) => ({
                        ...prev,
                        fsm: {
                          ...prev.fsm,
                          bindings: prev.fsm.bindings.map((b, i) =>
                            i === idx ? { ...b, entryState: e.target.value } : b,
                          ),
                        },
                      }))
                    }
                  >
                    {stateNames.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="col-span-4 space-y-1">
                  <span className="block font-mono text-[10px] uppercase text-slate-400">
                    {t("fsm.col_goal")}
                  </span>
                  <Select
                    value={binding.goalState}
                    className="font-mono h-8 text-xs"
                    onChange={(e) =>
                      updateSubsystem(subsystem.id, (prev) => ({
                        ...prev,
                        fsm: {
                          ...prev.fsm,
                          bindings: prev.fsm.bindings.map((b, i) =>
                            i === idx ? { ...b, goalState: e.target.value } : b,
                          ),
                        },
                      }))
                    }
                  >
                    {stateNames.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="col-span-1 flex justify-end pt-4">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={subsystem.fsm.bindings.length <= 1}
                    onClick={() =>
                      updateSubsystem(subsystem.id, (prev) => ({
                        ...prev,
                        fsm: {
                          ...prev.fsm,
                          bindings: prev.fsm.bindings.filter((_, i) => i !== idx),
                        },
                      }))
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 border-t border-[#22304a]/70 pt-2">
                <span className="font-mono text-[10px] uppercase text-slate-400 mr-1">
                  {t("fsm.col_intermediate")}:
                </span>
                {binding.intermediateStates.map((inter, interIdx) => (
                  <span
                    key={`${inter}-${interIdx}`}
                    className="inline-flex items-center gap-1 rounded border border-[#3b6bb5]/60 bg-[#142c4f]/60 px-2 py-0.5 font-mono text-[11px] text-slate-100"
                  >
                    {inter}
                    <button
                      type="button"
                      onClick={() =>
                        updateSubsystem(subsystem.id, (prev) => ({
                          ...prev,
                          fsm: {
                            ...prev.fsm,
                            bindings: prev.fsm.bindings.map((b, i) =>
                              i === idx
                                ? {
                                    ...b,
                                    intermediateStates: b.intermediateStates.filter(
                                      (_, si) => si !== interIdx,
                                    ),
                                  }
                                : b,
                            ),
                          },
                        }))
                      }
                      className="text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <Select
                  value=""
                  className="h-6 w-28 font-mono text-[11px]"
                  onChange={(e) => {
                    const chosen = e.target.value;
                    if (!chosen) return;
                    updateSubsystem(subsystem.id, (prev) => ({
                      ...prev,
                      fsm: {
                        ...prev.fsm,
                        bindings: prev.fsm.bindings.map((b, i) =>
                          i === idx && !b.intermediateStates.includes(chosen)
                            ? {
                                ...b,
                                intermediateStates: [...b.intermediateStates, chosen],
                              }
                            : b,
                        ),
                      },
                    }));
                  }}
                >
                  <option value="">+ estado</option>
                  {stateNames
                    .filter((s) => !binding.intermediateStates.includes(s))
                    .map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                </Select>
              </div>
            </div>
          </Field>
        ))}
      </div>
    </div>
  );
}
