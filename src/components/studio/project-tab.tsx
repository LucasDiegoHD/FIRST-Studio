"use client";

import React from "react";
import { useProject } from "@/context/project-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

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
    <div className="grid gap-5 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t("project.identity_title")}</CardTitle>
          <CardDescription>{t("project.identity_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">{t("project.name")}</label>
            <Input
              value={meta.name}
              onChange={(e) => updateMeta("name", e.target.value)}
              placeholder="skeleton"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">{t("project.team_number")}</label>
              <Input
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
              <label className="text-xs font-medium text-slate-300">{t("project.year")}</label>
              <Input value={meta.year} disabled />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">{t("project.package_name")}</label>
            <Input
              value={meta.packageName}
              onChange={(e) => updateMeta("packageName", e.target.value.trim())}
              placeholder="frc.robot"
              className="font-mono"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("project.sim_title")}</CardTitle>
          <CardDescription>{t("project.sim_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">{t("project.sim_mode")}</label>
            <Select
              value={meta.simMode}
              onChange={(e) => updateMeta("simMode", e.target.value as "SIM" | "REPLAY")}
            >
              <option value="SIM">Mode.SIM (Physics Simulation)</option>
              <option value="REPLAY">Mode.REPLAY (AdvantageKit Log Replay)</option>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2.5">
            <span className="text-xs font-medium text-slate-200">{t("project.tuning_mode")}</span>
            <Switch
              checked={meta.tuningMode}
              onCheckedChange={(checked) => updateMeta("tuningMode", checked)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">{t("project.deadband")}</label>
            <Input
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("project.field_title")}</CardTitle>
          <CardDescription>{t("project.field_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">{t("project.default_alliance")}</label>
            <Select
              value={meta.defaultAlliance}
              onChange={(e) => updateMeta("defaultAlliance", e.target.value as "Blue" | "Red")}
            >
              <option value="Blue">Alliance.Blue</option>
              <option value="Red">Alliance.Red</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">{t("project.field_length")}</label>
              <Input
                type="number"
                step={0.001}
                min={1}
                value={meta.fieldLengthMeters}
                onChange={(e) =>
                  updateMeta("fieldLengthMeters", Math.max(1, Number.parseFloat(e.target.value || "16.541") || 16.541))
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">{t("project.field_width")}</label>
              <Input
                type="number"
                step={0.001}
                min={1}
                value={meta.fieldWidthMeters}
                onChange={(e) =>
                  updateMeta("fieldWidthMeters", Math.max(1, Number.parseFloat(e.target.value || "8.069") || 8.069))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("project.features_title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-3">
            <span className="text-xs font-medium text-slate-200">{t("project.drive_stub")}</span>
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
        </CardContent>
      </Card>
    </div>
  );
}
