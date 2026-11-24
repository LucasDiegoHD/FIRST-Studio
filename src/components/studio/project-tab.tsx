"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { UnitInput } from "@/components/ui/unit-input";
import { useProject } from "@/context/project-context";

export function ProjectTab() {
  const { project, updateProject, t } = useProject();
  const meta = project.project;

  const updateMeta = <K extends keyof typeof meta>(key: K, value: (typeof meta)[K]) => {
    updateProject((prev) => ({
      ...prev,
      project: { ...prev.project, [key]: value },
    }));
  };

  return (
    <div className="h-full overflow-y-auto bg-[#0f1624]">
      <div className="mx-auto max-w-2xl divide-y divide-[#22304a] px-6 py-4">
        <section className="py-5 space-y-4">
          <div>
            <h2 className="text-[15px] font-semibold text-white">{t("project.identity_title")}</h2>
            <p className="text-[13px] text-slate-400">{t("project.identity_desc")}</p>
          </div>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">{t("project.name")}</label>
              <Input
                value={meta.name}
                onChange={(e) => updateMeta("name", e.target.value)}
                placeholder="skeleton"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">{t("project.team_number")}</label>
              <UnitInput
                unit="#"
                type="number"
                min={0}
                max={99999}
                value={meta.teamNumber}
                onChange={(e) =>
                  updateMeta("teamNumber", Math.max(0, Number.parseInt(e.target.value || "0", 10) || 0))
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">{t("project.package_name")}</label>
              <Input
                value={meta.packageName}
                onChange={(e) => updateMeta("packageName", e.target.value.trim())}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">{t("project.year")}</label>
              <Input value={meta.year} disabled className="font-mono" />
            </div>
          </div>
        </section>

        <section className="py-5 space-y-4">
          <div>
            <h2 className="text-[15px] font-semibold text-white">{t("project.sim_title")}</h2>
            <p className="text-[13px] text-slate-400">{t("project.sim_desc")}</p>
          </div>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">{t("project.sim_mode")}</label>
              <Select
                value={meta.simMode}
                onChange={(e) => updateMeta("simMode", e.target.value as "SIM" | "REPLAY")}
              >
                <option value="SIM">Mode.SIM</option>
                <option value="REPLAY">Mode.REPLAY</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">{t("project.deadband")}</label>
              <UnitInput
                unit="db"
                type="number"
                step={0.01}
                min={0}
                max={0.5}
                value={meta.controllerDeadband}
                onChange={(e) =>
                  updateMeta(
                    "controllerDeadband",
                    Math.min(0.5, Math.max(0, Number.parseFloat(e.target.value || "0") || 0)),
                  )
                }
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[13px] text-slate-200">{t("project.tuning_mode")}</span>
            <Switch
              checked={meta.tuningMode}
              onCheckedChange={(checked) => updateMeta("tuningMode", checked)}
            />
          </div>
        </section>

        <section className="py-5 space-y-4">
          <div>
            <h2 className="text-[15px] font-semibold text-white">{t("project.field_title")}</h2>
            <p className="text-[13px] text-slate-400">{t("project.field_desc")}</p>
          </div>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">{t("project.default_alliance")}</label>
              <Select
                value={meta.defaultAlliance}
                onChange={(e) => updateMeta("defaultAlliance", e.target.value as "Blue" | "Red")}
              >
                <option value="Blue">Blue</option>
                <option value="Red">Red</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">{t("project.field_length")}</label>
              <UnitInput
                unit="m"
                type="number"
                step={0.001}
                min={1}
                value={meta.fieldLengthMeters}
                onChange={(e) =>
                  updateMeta(
                    "fieldLengthMeters",
                    Math.max(1, Number.parseFloat(e.target.value || "16.541") || 16.541),
                  )
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">{t("project.field_width")}</label>
              <UnitInput
                unit="m"
                type="number"
                step={0.001}
                min={1}
                value={meta.fieldWidthMeters}
                onChange={(e) =>
                  updateMeta(
                    "fieldWidthMeters",
                    Math.max(1, Number.parseFloat(e.target.value || "8.069") || 8.069),
                  )
                }
              />
            </div>
          </div>
        </section>

        <section className="py-5 space-y-3">
          <h2 className="text-[15px] font-semibold text-white">{t("project.features_title")}</h2>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-slate-200">{t("project.drive_stub")}</span>
            <Switch
              checked={project.features.driveContextStub}
              onCheckedChange={(checked) =>
                updateProject((prev) => ({
                  ...prev,
                  features: { ...prev.features, driveContextStub: checked },
                }))
              }
            />
          </div>
        </section>
      </div>
    </div>
  );
}
