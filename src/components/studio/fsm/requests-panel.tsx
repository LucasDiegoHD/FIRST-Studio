"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useProject } from "@/context/project-context";
import { toUpperSnake } from "@/lib/generator/java-utils";
import type { MotorSubsystemConfig } from "@/lib/schema/ciprix-project";

function RequestNameInput({
  subsystemId,
  requestName,
}: {
  subsystemId: string;
  requestName: string;
}) {
  const { renameSubsystemRequest } = useProject();
  const [draft, setDraft] = useState(requestName);

  useEffect(() => {
    setDraft(requestName);
  }, [requestName]);

  const commit = () => {
    const normalized = toUpperSnake(draft);
    if (!normalized) {
      setDraft(requestName);
      return;
    }
    if (normalized !== requestName) {
      renameSubsystemRequest(subsystemId, requestName, normalized);
    }
    setDraft(normalized);
  };

  return (
    <Input
      value={draft}
      className="font-mono h-8 text-xs"
      onChange={(e) => setDraft(toUpperSnake(e.target.value))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
    />
  );
}

export function RequestsPanel({ subsystem }: { subsystem: MotorSubsystemConfig }) {
  const { updateSubsystem, t } = useProject();
  const boundSet = new Set(subsystem.fsm.bindings.map((b) => b.request));

  const patchFsm = (fn: (fsm: MotorSubsystemConfig["fsm"]) => MotorSubsystemConfig["fsm"]) => {
    updateSubsystem(subsystem.id, (prev) =>
      prev.fsm ? { ...prev, fsm: fn(prev.fsm) } : prev,
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[#22304a] bg-[#0f1624] p-3">
        <Field path={`subsystems.${subsystem.id}.fsm.initialRequest`} label={t("fsm.initial_request")}>
          <Select
            className="font-mono h-8 text-xs"
            value={subsystem.fsm.initialRequest}
            onChange={(e) =>
              patchFsm((fsm) => ({ ...fsm, initialRequest: e.target.value }))
            }
          >
            {subsystem.fsm.requests.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-300">{t("fsm.requests_title")}</span>
          <Badge variant="default">{subsystem.fsm.requests.length}</Badge>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const reqName = `REQUEST_${subsystem.fsm.requests.length + 1}`;
            patchFsm((fsm) => ({
              ...fsm,
              requests: [...fsm.requests, reqName],
            }));
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          {t("fsm.add_request")}
        </Button>
      </div>

      <p className="text-[11px] text-slate-400">{t("fsm.rename_hint")}</p>

      <div className="space-y-2">
        {subsystem.fsm.requests.map((req, idx) => {
          const isBound = boundSet.has(req);
          return (
            <Field
              key={`${req}-${idx}`}
              path={`subsystems.${subsystem.id}.fsm.requests.${req}`}
            >
              <div className="flex items-center gap-2 rounded-lg border border-[#22304a] bg-[#0f1624] p-2">
                <div className="flex-1 min-w-0">
                  <RequestNameInput subsystemId={subsystem.id} requestName={req} />
                </div>
                <Badge
                  variant={isBound ? "success" : "outline"}
                  className={isBound ? "shrink-0 text-[10px]" : "shrink-0 text-[10px] text-amber-300 border-amber-700/60"}
                >
                  {isBound ? t("fsm.bound") : t("fsm.unbound")}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={subsystem.fsm.requests.length <= 1}
                  onClick={() =>
                    patchFsm((fsm) => ({
                      ...fsm,
                      requests: fsm.requests.filter((_, i) => i !== idx),
                      bindings: fsm.bindings.filter((b) => b.request !== req),
                    }))
                  }
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                </Button>
              </div>
            </Field>
          );
        })}
      </div>
    </div>
  );
}
