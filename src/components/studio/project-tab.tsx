"use client";

import React from "react";
import { Field } from "@/components/ui/field";
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
            <Field path="project.name" label={t("project.name")}>
              <Input
                value={meta.name}
                onChange={(e) => updateMeta("name", e.target.value)}
                placeholder="skeleton"
              />
            </Field>
            <Field path="project.teamNumber" label={t("project.team_number")}>
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
            </Field>
            <Field path="project.packageName" label={t("project.package_name")}>
              <Input
                value={meta.packageName}
                onChange={(e) => updateMeta("packageName", e.target.value.trim())}
                className="font-mono"
              />
            </Field>
            <Field path="project.year" label={t("project.year")}>
              <Input value={meta.year} disabled className="font-mono" />
            </Field>
          </div>
        </section>

        <section className="py-5 space-y-4">
          <div>
            <h2 className="text-[15px] font-semibold text-white">{t("project.sim_title")}</h2>
            <p className="text-[13px] text-slate-400">{t("project.sim_desc")}</p>
          </div>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field path="project.simMode" label={t("project.sim_mode")}>
              <Select
                value={meta.simMode}
                onChange={(e) => updateMeta("simMode", e.target.value as "SIM" | "REPLAY")}
              >
                <option value="SIM">Mode.SIM</option>
                <option value="REPLAY">Mode.REPLAY</option>
              </Select>
            </Field>
            <Field path="project.controllerDeadband" label={t("project.deadband")}>
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
            </Field>
          </div>
          <Field path="project.tuningMode" label={t("project.tuning_mode")} layout="row" className="pt-1">
            <Switch
              checked={meta.tuningMode}
              onCheckedChange={(checked) => updateMeta("tuningMode", checked)}
            />
          </Field>
        </section>

        <section className="py-5 space-y-4">
          <div>
            <h2 className="text-[15px] font-semibold text-white">{t("project.field_title")}</h2>
            <p className="text-[13px] text-slate-400">{t("project.field_desc")}</p>
          </div>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <Field path="project.defaultAlliance" label={t("project.default_alliance")}>
              <Select
                value={meta.defaultAlliance}
                onChange={(e) => updateMeta("defaultAlliance", e.target.value as "Blue" | "Red")}
              >
                <option value="Blue">Blue</option>
                <option value="Red">Red</option>
              </Select>
            </Field>
            <Field path="project.fieldLengthMeters" label={t("project.field_length")}>
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
            </Field>
            <Field path="project.fieldWidthMeters" label={t("project.field_width")}>
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
            </Field>
          </div>
        </section>

        <section className="py-5 space-y-3">
          <h2 className="text-[15px] font-semibold text-white">{t("project.features_title")}</h2>
          <Field path="features.driveContextStub" label={t("project.drive_stub")} layout="row">
            <Switch
              checked={project.features.driveContextStub}
              onCheckedChange={(checked) =>
                updateProject((prev) => ({
                  ...prev,
                  features: { ...prev.features, driveContextStub: checked },
                }))
              }
            />
          </Field>
        </section>
      </div>
    </div>
  );
}
