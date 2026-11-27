"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Compass,
  Cpu,
  Eye,
  FileUp,
  HelpCircle,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { UnitInput } from "@/components/ui/unit-input";
import { useProject } from "@/context/project-context";
import { parseTunerConstantsJava } from "@/lib/drivetrain/tuner-parser";
import { createDefaultDrivetrain, DRIVETRAIN_PRESETS } from "@/lib/presets/drivetrain";
import type {
  DrivetrainConfig,
  DrivetrainType,
  GyroType,
  MotorVendor,
  XboxButton,
} from "@/lib/schema/ciprix-project";

type DrivetrainSubTab = "base" | "modules" | "assistants" | "vision";

const XBOX_BUTTON_OPTIONS: { value: XboxButton; label: string }[] = [
  { value: "a", label: "A" },
  { value: "b", label: "B" },
  { value: "x", label: "X" },
  { value: "y", label: "Y" },
  { value: "leftBumper", label: "LB" },
  { value: "rightBumper", label: "RB" },
  { value: "leftTrigger", label: "LT" },
  { value: "rightTrigger", label: "RT" },
  { value: "back", label: "Back" },
  { value: "start", label: "Start" },
  { value: "povUp", label: "D-Pad Up" },
  { value: "povDown", label: "D-Pad Down" },
  { value: "povLeft", label: "D-Pad Left" },
  { value: "povRight", label: "D-Pad Right" },
  { value: "leftStick", label: "L-Stick" },
  { value: "rightStick", label: "R-Stick" },
];

const MODULE_CORNERS: { key: "fl" | "fr" | "bl" | "br"; label: string }[] = [
  { key: "fl", label: "FL · Frente Esq." },
  { key: "fr", label: "FR · Frente Dir." },
  { key: "bl", label: "BL · Trás Esq." },
  { key: "br", label: "BR · Trás Dir." },
];

function classifyDtPath(path?: string): DrivetrainSubTab {
  if (!path) return "base";
  if (path.startsWith("drivetrain.modules.") || path.startsWith("drivetrain.differential.")) {
    return "modules";
  }
  if (path.startsWith("drivetrain.assistants.") || path.startsWith("drivetrain.controls.")) {
    return "assistants";
  }
  if (path.startsWith("drivetrain.vision.")) {
    return "vision";
  }
  return "base";
}

export function DrivetrainPanel() {
  const { project, issues, focusRequest, updateProject, t } = useProject();
  const tunerInputRef = useRef<HTMLInputElement>(null);
  const [subTab, setSubTab] = useState<DrivetrainSubTab>("base");
  const [tunerStatus, setTunerStatus] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  const dt = project.drivetrain;

  useEffect(() => {
    if (!focusRequest?.path?.startsWith("drivetrain.")) return;
    setSubTab(classifyDtPath(focusRequest.path));
  }, [focusRequest]);

  const tabErrors = useMemo(() => {
    const counts: Record<DrivetrainSubTab, number> = {
      base: 0,
      modules: 0,
      assistants: 0,
      vision: 0,
    };
    for (const issue of issues) {
      if (issue.severity !== "error") continue;
      if (issue.targetId === "drivetrain" || issue.path?.startsWith("drivetrain.")) {
        counts[classifyDtPath(issue.path)] += 1;
      }
    }
    return counts;
  }, [issues]);

  const setDrivetrain = (updater: (curr: DrivetrainConfig) => DrivetrainConfig) => {
    updateProject((prev) => {
      const current = prev.drivetrain ?? createDefaultDrivetrain("ctre_swerve");
      const next = updater(current);
      return {
        ...prev,
        drivetrain: next,
        features: {
          ...prev.features,
          driveContextStub: !next.enabled,
        },
      };
    });
  };

  const handleEnableWithPreset = (presetId?: string) => {
    updateProject((prev) => {
      let next = createDefaultDrivetrain("ctre_swerve");
      const preset = DRIVETRAIN_PRESETS.find((p) => p.id === presetId);
      if (preset) next = preset.apply(next);
      return {
        ...prev,
        drivetrain: { ...next, enabled: true },
        features: { ...prev.features, driveContextStub: false },
      };
    });
  };

  const handleTunerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const text = await file.text();
    const parsed = parseTunerConstantsJava(text);
    const modCount = Object.keys(parsed.modules).length;
    if (
      modCount === 0 &&
      parsed.pigeonId === undefined &&
      parsed.driveGearRatio === undefined &&
      parsed.maxSpeedMps === undefined
    ) {
      setTunerStatus("Nenhuma constante reconhecida em TunerConstants.java.");
      return;
    }

    setDrivetrain((curr) => ({
      ...curr,
      enabled: true,
      type: "ctre_swerve",
      motorVendor: "talonfx",
      canBus: parsed.canBus ?? curr.canBus,
      gyro: {
        ...curr.gyro,
        type: parsed.pigeonId !== undefined ? "pigeon2" : curr.gyro.type,
        canId: parsed.pigeonId ?? curr.gyro.canId,
        canBus: parsed.canBus ?? curr.gyro.canBus,
      },
      driveGearRatio: parsed.driveGearRatio ?? curr.driveGearRatio,
      steerGearRatio: parsed.steerGearRatio ?? curr.steerGearRatio,
      wheelDiameterMeters: parsed.wheelDiameterMeters ?? curr.wheelDiameterMeters,
      maxSpeedMps: parsed.maxSpeedMps ?? curr.maxSpeedMps,
      modules: {
        fl: { ...curr.modules.fl, ...parsed.modules.fl },
        fr: { ...curr.modules.fr, ...parsed.modules.fr },
        bl: { ...curr.modules.bl, ...parsed.modules.bl },
        br: { ...curr.modules.br, ...parsed.modules.br },
      },
      tunerConstantsRaw: text,
    }));

    setTunerStatus(
      `Importado: ${modCount} módulos${parsed.pigeonId !== undefined ? ` · Pigeon ${parsed.pigeonId}` : ""}${parsed.canBus ? ` · CAN "${parsed.canBus}"` : ""}`,
    );
  };

  if (!dt) {
    return (
      <>
        <CardHeader className="border-b border-[#22304a] pb-4">
          <div className="flex items-center gap-3">
            <Compass className="h-5 w-5 text-sky-400" />
            <CardTitle>{t("drivetrain.title")}</CardTitle>
            <Badge variant="outline">Stub</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 py-6">
          <p className="text-xs leading-relaxed text-slate-300">
            Ative o Drivetrain completo para gerar <span className="font-mono">Drive.java</span> com{" "}
            <span className="font-mono">DriveContext</span>,{" "}
            <span className="font-mono">DriveAccelerationLimits</span>, assistentes Ciprix, bindings
            no <span className="font-mono">RobotContainer</span> e visão Limelight opcional.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="sm" onClick={() => handleEnableWithPreset("mk4i_l2")}>
              <Sparkles className="h-3.5 w-3.5" />
              {t("drivetrain.enable")} (MK4i L2)
            </Button>
            {DRIVETRAIN_PRESETS.filter((p) => p.id !== "mk4i_l2").map((preset) => (
              <Button
                key={preset.id}
                variant="outline"
                size="sm"
                onClick={() => handleEnableWithPreset(preset.id)}
              >
                {preset.label.replace(/\s*\([^)]*\)$/, "")}
              </Button>
            ))}
          </div>
        </CardContent>
      </>
    );
  }

  const isSwerve =
    dt.type === "ctre_swerve" || dt.type === "yagsl" || dt.type === "akit_swerve";

  const tabs: {
    id: DrivetrainSubTab;
    label: string;
    icon: React.ReactNode;
    badge?: string;
    errors: number;
  }[] = [
    {
      id: "base",
      label: "Base & Física",
      icon: <Compass className="h-3.5 w-3.5" />,
      errors: tabErrors.base,
    },
    {
      id: "modules",
      label: dt.type === "differential" ? "Motores" : "Módulos",
      icon: <Cpu className="h-3.5 w-3.5" />,
      badge: dt.type === "differential" ? "Tank" : "4×",
      errors: tabErrors.modules,
    },
    {
      id: "assistants",
      label: "Assistentes",
      icon: <SlidersHorizontal className="h-3.5 w-3.5" />,
      errors: tabErrors.assistants,
    },
    {
      id: "vision",
      label: "Visão",
      icon: <Eye className="h-3.5 w-3.5" />,
      badge: dt.vision.enabled ? String(dt.vision.cameras.length) : "OFF",
      errors: tabErrors.vision,
    },
  ];

  return (
    <>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2.5 space-y-0 border-b border-[#22304a] py-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <Compass className="h-4 w-4 text-sky-400 shrink-0" />
          <CardTitle className="text-base">{t("drivetrain.title")}</CardTitle>
          <Badge variant={dt.enabled ? "success" : "outline"} className="text-[10px]">
            {dt.enabled ? "Ativo" : "Stub"}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Field path="drivetrain.enabled" label="Gerar Drive" layout="row">
            <Switch
              checked={dt.enabled}
              onCheckedChange={(checked) => setDrivetrain((curr) => ({ ...curr, enabled: checked }))}
            />
          </Field>
          <input
            ref={tunerInputRef}
            type="file"
            accept=".java,.txt"
            className="hidden"
            onChange={handleTunerUpload}
          />
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-xs"
            onClick={() => tunerInputRef.current?.click()}
            title="Importar IDs CAN, offsets e reduções direto do Phoenix Tuner X"
          >
            <FileUp className="h-3.5 w-3.5" />
            TunerConstants
          </Button>
          <Button
            size="icon"
            variant={guideOpen ? "secondary" : "ghost"}
            className="h-7 w-7"
            onClick={() => setGuideOpen((v) => !v)}
            title="De onde tirar esses dados?"
          >
            <HelpCircle className="h-3.5 w-3.5 text-sky-400" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-3.5">
        {tunerStatus && (
          <div className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-200">
            {tunerStatus}
          </div>
        )}

        {guideOpen && (
          <div className="rounded-xl border border-[#22304a] bg-[#0b0f17] px-3.5 py-2.5 text-xs text-slate-400 space-y-1">
            <p>
              <strong className="text-slate-200">CTRE Swerve:</strong> gere o{" "}
              <span className="font-mono">TunerConstants.java</span> no Phoenix Tuner X e clique em{" "}
              <em>TunerConstants</em> acima para preencher módulos, offsets e Pigeon ID.
            </p>
            <p>
              <strong className="text-slate-200">Reduções:</strong> SDS MK4i L2 usa{" "}
              <span className="font-mono">6.75:1</span> / <span className="font-mono">21.43:1</span>{" "}
              (roda <span className="font-mono">0.1016 m</span>). REV MAXSwerve 3&quot; usa{" "}
              <span className="font-mono">4.71:1</span> (<span className="font-mono">0.0762 m</span>).
            </p>
            <p>
              <strong className="text-slate-200">Limelight:</strong> informe na aba <em>Visão</em> o
              mesmo hostname NetworkTables configurado em <span className="font-mono">limelight.local:5801</span>.
            </p>
          </div>
        )}

        {/* Compact Preset Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#22304a] bg-[#0f1624] px-3 py-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
            Presets
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {DRIVETRAIN_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[11px]"
                title={preset.label}
                onClick={() => setDrivetrain((curr) => preset.apply({ ...curr, enabled: true }))}
              >
                {preset.label.replace(/\s*\([^)]*\)$/, "")}
              </Button>
            ))}
          </div>
        </div>

        {!dt.enabled ? (
          <p className="rounded-lg border border-dashed border-[#22304a] bg-[#0b0f17] p-4 text-center text-xs text-slate-400">
            Modo Stub ativo: apenas o marcador de <span className="font-mono">DriveContext</span> é
            gerado no <span className="font-mono">RobotContainer</span>. Ative <em>Gerar Drive</em>{" "}
            acima ou clique em um preset.
          </p>
        ) : (
          <>
            {/* 4 Sub-tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 rounded-lg border border-[#22304a] bg-[#0b0f17] p-1">
              {tabs.map((item) => {
                const active = subTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSubTab(item.id)}
                    className={`flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium cursor-pointer transition-all ${
                      active
                        ? "bg-[#142c4f] border border-[#3b6bb5] text-white shadow-sm"
                        : "border border-transparent text-slate-400 hover:bg-[#19253d] hover:text-white"
                    }`}
                  >
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                    {item.errors > 0 ? (
                      <span className="rounded-full bg-rose-600 px-1.5 py-0 font-mono text-[10px] font-bold text-white">
                        {item.errors}
                      </span>
                    ) : item.badge ? (
                      <span className="rounded bg-[#0b0f17]/80 px-1.5 py-0 font-mono text-[10px] text-slate-300">
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* Sub-tab 1: Base & Physics */}
            {subTab === "base" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field path="drivetrain.type" label="Base / Arquitetura">
                    <Select
                      className="h-8 text-xs"
                      value={dt.type}
                      onChange={(e) => {
                        const nextType = e.target.value as DrivetrainType;
                        setDrivetrain((curr) => ({
                          ...curr,
                          type: nextType,
                          motorVendor:
                            nextType === "ctre_swerve"
                              ? "talonfx"
                              : nextType === "differential" || nextType === "mecanum"
                                ? "sparkmax"
                                : curr.motorVendor,
                        }));
                      }}
                    >
                      <option value="ctre_swerve">CTRE Phoenix Swerve</option>
                      <option value="yagsl">YAGSL Swerve (JSON + Studio)</option>
                      <option value="akit_swerve">AdvantageKit Swerve</option>
                      <option value="differential">Differential / Tank</option>
                      <option value="mecanum">Mecanum 4 Rodas</option>
                    </Select>
                  </Field>

                  <Field path="drivetrain.motorVendor" label="Controlador de Motor">
                    <Select
                      className="h-8 text-xs"
                      value={dt.motorVendor}
                      onChange={(e) =>
                        setDrivetrain((curr) => ({
                          ...curr,
                          motorVendor: e.target.value as MotorVendor,
                        }))
                      }
                    >
                      <option value="talonfx">Talon FX (Kraken / Falcon)</option>
                      <option value="sparkmax">SPARK MAX (NEO)</option>
                      <option value="talonsrx">Talon SRX (CIM / Bag)</option>
                    </Select>
                  </Field>

                  <Field path="drivetrain.canBus" label="Barramento CAN">
                    <Input
                      value={dt.canBus}
                      placeholder="rio ou canivore"
                      className="h-8 font-mono text-xs"
                      onChange={(e) =>
                        setDrivetrain((curr) => ({ ...curr, canBus: e.target.value.trim() }))
                      }
                    />
                  </Field>

                  <Field path="drivetrain.currentLimitAmps" label="Limite de Corrente">
                    <UnitInput
                      type="number"
                      unit="A"
                      value={dt.currentLimitAmps}
                      min={10}
                      max={120}
                      step={5}
                      className="h-8 text-xs"
                      onChange={(e) => {
                        const v = Number.parseInt(e.target.value, 10);
                        if (Number.isFinite(v)) {
                          setDrivetrain((curr) => ({ ...curr, currentLimitAmps: v }));
                        }
                      }}
                    />
                  </Field>

                  <Field path="drivetrain.gyro.type" label="Giroscópio">
                    <Select
                      className="h-8 text-xs"
                      value={dt.gyro.type}
                      onChange={(e) =>
                        setDrivetrain((curr) => ({
                          ...curr,
                          gyro: { ...curr.gyro, type: e.target.value as GyroType },
                        }))
                      }
                    >
                      <option value="pigeon2">CTRE Pigeon 2 (CAN)</option>
                      <option value="navx">Studica NavX / NavX2 (MXP)</option>
                      <option value="adis16470">ADIS16470 (SPI roboRIO)</option>
                    </Select>
                  </Field>

                  {dt.gyro.type === "pigeon2" && (
                    <div className="grid grid-cols-2 gap-2">
                      <Field path="drivetrain.gyro.canId" label="Pigeon ID">
                        <UnitInput
                          type="number"
                          unit="ID"
                          value={dt.gyro.canId}
                          min={0}
                          max={62}
                          step={1}
                          className="h-8 text-xs"
                          onChange={(e) => {
                            const v = Number.parseInt(e.target.value, 10);
                            if (Number.isFinite(v)) {
                              setDrivetrain((curr) => ({
                                ...curr,
                                gyro: { ...curr.gyro, canId: v },
                              }));
                            }
                          }}
                        />
                      </Field>
                      <Field path="drivetrain.gyro.canBus" label="Pigeon Bus">
                        <Input
                          value={dt.gyro.canBus}
                          placeholder="canivore"
                          className="h-8 font-mono text-xs"
                          onChange={(e) =>
                            setDrivetrain((curr) => ({
                              ...curr,
                              gyro: { ...curr.gyro, canBus: e.target.value.trim() },
                            }))
                          }
                        />
                      </Field>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-[#22304a] bg-[#0f1624] p-3.5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                      Cinemática &amp; Limites Físicos
                    </p>
                    <Field
                      path="drivetrain.fieldOrientedDefault"
                      label="Field-Oriented"
                      layout="row"
                    >
                      <Switch
                        checked={dt.fieldOrientedDefault}
                        onCheckedChange={(checked) =>
                          setDrivetrain((curr) => ({ ...curr, fieldOrientedDefault: checked }))
                        }
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <Field path="drivetrain.maxSpeedMps" label="Vel. Máx">
                      <UnitInput
                        type="number"
                        unit="m/s"
                        value={dt.maxSpeedMps}
                        min={0.5}
                        max={10}
                        step={0.1}
                        className="h-8 text-xs"
                        onChange={(e) => {
                          const v = Number.parseFloat(e.target.value);
                          if (Number.isFinite(v)) {
                            setDrivetrain((curr) => ({ ...curr, maxSpeedMps: v }));
                          }
                        }}
                      />
                    </Field>
                    <Field path="drivetrain.maxAngularSpeedRadPerSec" label="Giro Máx">
                      <UnitInput
                        type="number"
                        unit="rad/s"
                        value={dt.maxAngularSpeedRadPerSec}
                        min={1}
                        max={25}
                        step={0.5}
                        className="h-8 text-xs"
                        onChange={(e) => {
                          const v = Number.parseFloat(e.target.value);
                          if (Number.isFinite(v)) {
                            setDrivetrain((curr) => ({ ...curr, maxAngularSpeedRadPerSec: v }));
                          }
                        }}
                      />
                    </Field>
                    <Field path="drivetrain.wheelDiameterMeters" label="Diâm. Roda">
                      <UnitInput
                        type="number"
                        unit="m"
                        value={dt.wheelDiameterMeters}
                        min={0.05}
                        max={0.3}
                        step={0.005}
                        className="h-8 text-xs"
                        onChange={(e) => {
                          const v = Number.parseFloat(e.target.value);
                          if (Number.isFinite(v)) {
                            setDrivetrain((curr) => ({ ...curr, wheelDiameterMeters: v }));
                          }
                        }}
                      />
                    </Field>
                    <Field path="drivetrain.driveGearRatio" label="Redução Tração">
                      <UnitInput
                        type="number"
                        unit=":1"
                        value={dt.driveGearRatio}
                        min={1}
                        max={40}
                        step={0.05}
                        className="h-8 text-xs"
                        onChange={(e) => {
                          const v = Number.parseFloat(e.target.value);
                          if (Number.isFinite(v)) {
                            setDrivetrain((curr) => ({ ...curr, driveGearRatio: v }));
                          }
                        }}
                      />
                    </Field>
                    {isSwerve && (
                      <Field path="drivetrain.steerGearRatio" label="Redução Direção">
                        <UnitInput
                          type="number"
                          unit=":1"
                          value={dt.steerGearRatio}
                          min={1}
                          max={60}
                          step={0.1}
                          className="h-8 text-xs"
                          onChange={(e) => {
                            const v = Number.parseFloat(e.target.value);
                            if (Number.isFinite(v)) {
                              setDrivetrain((curr) => ({ ...curr, steerGearRatio: v }));
                            }
                          }}
                        />
                      </Field>
                    )}
                    <Field path="drivetrain.trackWidthMeters" label="Track Width">
                      <UnitInput
                        type="number"
                        unit="m"
                        value={dt.trackWidthMeters}
                        min={0.2}
                        max={1.5}
                        step={0.01}
                        className="h-8 text-xs"
                        onChange={(e) => {
                          const v = Number.parseFloat(e.target.value);
                          if (Number.isFinite(v)) {
                            setDrivetrain((curr) => ({ ...curr, trackWidthMeters: v }));
                          }
                        }}
                      />
                    </Field>
                    <Field path="drivetrain.wheelBaseMeters" label="Entre-Eixos">
                      <UnitInput
                        type="number"
                        unit="m"
                        value={dt.wheelBaseMeters}
                        min={0.2}
                        max={1.5}
                        step={0.01}
                        className="h-8 text-xs"
                        onChange={(e) => {
                          const v = Number.parseFloat(e.target.value);
                          if (Number.isFinite(v)) {
                            setDrivetrain((curr) => ({ ...curr, wheelBaseMeters: v }));
                          }
                        }}
                      />
                    </Field>
                    <Field path="drivetrain.maxLinearAccelMps2" label="Acel. Linear">
                      <UnitInput
                        type="number"
                        unit="m/s²"
                        value={dt.maxLinearAccelMps2}
                        min={1}
                        max={40}
                        step={0.5}
                        className="h-8 text-xs"
                        onChange={(e) => {
                          const v = Number.parseFloat(e.target.value);
                          if (Number.isFinite(v)) {
                            setDrivetrain((curr) => ({ ...curr, maxLinearAccelMps2: v }));
                          }
                        }}
                      />
                    </Field>
                    <Field path="drivetrain.maxAngularAccelRadPerSec2" label="Acel. Angular">
                      <UnitInput
                        type="number"
                        unit="rad/s²"
                        value={dt.maxAngularAccelRadPerSec2}
                        min={1}
                        max={80}
                        step={1}
                        className="h-8 text-xs"
                        onChange={(e) => {
                          const v = Number.parseFloat(e.target.value);
                          if (Number.isFinite(v)) {
                            setDrivetrain((curr) => ({ ...curr, maxAngularAccelRadPerSec2: v }));
                          }
                        }}
                      />
                    </Field>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tab 2: Modules / Tank Motors */}
            {subTab === "modules" &&
              (dt.type === "differential" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-[#22304a] bg-[#0f1624] p-3.5 space-y-3">
                    <p className="font-mono text-xs font-semibold text-[#93c5fd]">Lado Esquerdo</p>
                    <div className="grid grid-cols-2 gap-2.5">
                      <Field path="drivetrain.differential.leftLeaderId" label="Líder">
                        <UnitInput
                          type="number"
                          unit="ID"
                          value={dt.differential.leftLeaderId}
                          min={0}
                          max={62}
                          step={1}
                          className="h-8 text-xs"
                          onChange={(e) => {
                            const v = Number.parseInt(e.target.value, 10);
                            if (Number.isFinite(v)) {
                              setDrivetrain((curr) => ({
                                ...curr,
                                differential: { ...curr.differential, leftLeaderId: v },
                              }));
                            }
                          }}
                        />
                      </Field>
                      <Field path="drivetrain.differential.leftFollowerId" label="Follower">
                        <Input
                          type="number"
                          min={0}
                          max={62}
                          placeholder="Opc."
                          value={dt.differential.leftFollowerId ?? ""}
                          className="h-8 font-mono text-xs"
                          onChange={(e) => {
                            const raw = e.target.value.trim();
                            setDrivetrain((curr) => ({
                              ...curr,
                              differential: {
                                ...curr.differential,
                                leftFollowerId: raw ? Number.parseInt(raw, 10) : undefined,
                              },
                            }));
                          }}
                        />
                      </Field>
                    </div>
                    <Field
                      path="drivetrain.differential.leftInverted"
                      label="Inverter Esquerda"
                      layout="row"
                    >
                      <Switch
                        checked={dt.differential.leftInverted}
                        onCheckedChange={(checked) =>
                          setDrivetrain((curr) => ({
                            ...curr,
                            differential: { ...curr.differential, leftInverted: checked },
                          }))
                        }
                      />
                    </Field>
                  </div>

                  <div className="rounded-xl border border-[#22304a] bg-[#0f1624] p-3.5 space-y-3">
                    <p className="font-mono text-xs font-semibold text-[#93c5fd]">Lado Direito</p>
                    <div className="grid grid-cols-2 gap-2.5">
                      <Field path="drivetrain.differential.rightLeaderId" label="Líder">
                        <UnitInput
                          type="number"
                          unit="ID"
                          value={dt.differential.rightLeaderId}
                          min={0}
                          max={62}
                          step={1}
                          className="h-8 text-xs"
                          onChange={(e) => {
                            const v = Number.parseInt(e.target.value, 10);
                            if (Number.isFinite(v)) {
                              setDrivetrain((curr) => ({
                                ...curr,
                                differential: { ...curr.differential, rightLeaderId: v },
                              }));
                            }
                          }}
                        />
                      </Field>
                      <Field path="drivetrain.differential.rightFollowerId" label="Follower">
                        <Input
                          type="number"
                          min={0}
                          max={62}
                          placeholder="Opc."
                          value={dt.differential.rightFollowerId ?? ""}
                          className="h-8 font-mono text-xs"
                          onChange={(e) => {
                            const raw = e.target.value.trim();
                            setDrivetrain((curr) => ({
                              ...curr,
                              differential: {
                                ...curr.differential,
                                rightFollowerId: raw ? Number.parseInt(raw, 10) : undefined,
                              },
                            }));
                          }}
                        />
                      </Field>
                    </div>
                    <Field
                      path="drivetrain.differential.rightInverted"
                      label="Inverter Direita"
                      layout="row"
                    >
                      <Switch
                        checked={dt.differential.rightInverted}
                        onCheckedChange={(checked) =>
                          setDrivetrain((curr) => ({
                            ...curr,
                            differential: { ...curr.differential, rightInverted: checked },
                          }))
                        }
                      />
                    </Field>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-center">
                    <span className="rounded-full border border-[#22304a] bg-[#0b0f17] px-3 py-0.5 font-mono text-[10px] uppercase tracking-wider text-sky-400">
                      ↑ Frente do Robô
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {MODULE_CORNERS.map(({ key, label }) => {
                      const mod = dt.modules[key];
                      return (
                        <div
                          key={key}
                          className="rounded-lg border border-[#253552] bg-[#0f1624] p-3 space-y-2"
                        >
                          <p className="font-mono text-xs font-semibold text-[#93c5fd]">{label}</p>
                          <div className="grid grid-cols-3 gap-2">
                            <Field path={`drivetrain.modules.${key}.driveCanId`} label="Drive">
                              <Input
                                type="number"
                                min={0}
                                max={62}
                                value={mod.driveCanId}
                                className="h-7 font-mono text-xs"
                                onChange={(e) =>
                                  setDrivetrain((curr) => ({
                                    ...curr,
                                    modules: {
                                      ...curr.modules,
                                      [key]: {
                                        ...curr.modules[key],
                                        driveCanId: Number.parseInt(e.target.value, 10) || 0,
                                      },
                                    },
                                  }))
                                }
                              />
                            </Field>
                            {isSwerve && (
                              <>
                                <Field path={`drivetrain.modules.${key}.steerCanId`} label="Steer">
                                  <Input
                                    type="number"
                                    min={0}
                                    max={62}
                                    value={mod.steerCanId}
                                    className="h-7 font-mono text-xs"
                                    onChange={(e) =>
                                      setDrivetrain((curr) => ({
                                        ...curr,
                                        modules: {
                                          ...curr.modules,
                                          [key]: {
                                            ...curr.modules[key],
                                            steerCanId: Number.parseInt(e.target.value, 10) || 0,
                                          },
                                        },
                                      }))
                                    }
                                  />
                                </Field>
                                <Field
                                  path={`drivetrain.modules.${key}.encoderCanId`}
                                  label="Encoder"
                                >
                                  <Input
                                    type="number"
                                    min={0}
                                    max={62}
                                    value={mod.encoderCanId}
                                    className="h-7 font-mono text-xs"
                                    onChange={(e) =>
                                      setDrivetrain((curr) => ({
                                        ...curr,
                                        modules: {
                                          ...curr.modules,
                                          [key]: {
                                            ...curr.modules[key],
                                            encoderCanId: Number.parseInt(e.target.value, 10) || 0,
                                          },
                                        },
                                      }))
                                    }
                                  />
                                </Field>
                              </>
                            )}
                          </div>
                          {isSwerve && (
                            <div className="grid grid-cols-3 gap-2 items-end">
                              <Field
                                path={`drivetrain.modules.${key}.encoderOffsetRot`}
                                label="Offset"
                              >
                                <Input
                                  type="number"
                                  step="0.0001"
                                  min={-1}
                                  max={1}
                                  value={mod.encoderOffsetRot}
                                  className="h-7 font-mono text-xs"
                                  onChange={(e) =>
                                    setDrivetrain((curr) => ({
                                      ...curr,
                                      modules: {
                                        ...curr.modules,
                                        [key]: {
                                          ...curr.modules[key],
                                          encoderOffsetRot: Number.parseFloat(e.target.value) || 0,
                                        },
                                      },
                                    }))
                                  }
                                />
                              </Field>
                              <Field
                                path={`drivetrain.modules.${key}.driveInverted`}
                                label="Inv.D"
                                layout="row"
                              >
                                <Switch
                                  checked={mod.driveInverted}
                                  onCheckedChange={(checked) =>
                                    setDrivetrain((curr) => ({
                                      ...curr,
                                      modules: {
                                        ...curr.modules,
                                        [key]: { ...curr.modules[key], driveInverted: checked },
                                      },
                                    }))
                                  }
                                />
                              </Field>
                              <Field
                                path={`drivetrain.modules.${key}.steerInverted`}
                                label="Inv.S"
                                layout="row"
                              >
                                <Switch
                                  checked={mod.steerInverted}
                                  onCheckedChange={(checked) =>
                                    setDrivetrain((curr) => ({
                                      ...curr,
                                      modules: {
                                        ...curr.modules,
                                        [key]: { ...curr.modules[key], steerInverted: checked },
                                      },
                                    }))
                                  }
                                />
                              </Field>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

            {/* Sub-tab 3: Assistants & Pilot Buttons */}
            {subTab === "assistants" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-[#22304a] bg-[#0f1624] p-3.5 space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#93c5fd]">
                    Assistentes Ciprix (org.ciprix.util.drivetrain)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field
                      path="drivetrain.assistants.throttleMap"
                      label="ThrottleMapModifier"
                      layout="row"
                    >
                      <Switch
                        checked={dt.assistants.throttleMap}
                        onCheckedChange={(checked) =>
                          setDrivetrain((curr) => ({
                            ...curr,
                            assistants: { ...curr.assistants, throttleMap: checked },
                          }))
                        }
                      />
                    </Field>
                    <Field
                      path="drivetrain.assistants.accelerationLimits"
                      label="DriveAccelerationLimits"
                      layout="row"
                    >
                      <Switch
                        checked={dt.assistants.accelerationLimits}
                        onCheckedChange={(checked) =>
                          setDrivetrain((curr) => ({
                            ...curr,
                            assistants: { ...curr.assistants, accelerationLimits: checked },
                          }))
                        }
                      />
                    </Field>
                    <Field
                      path="drivetrain.assistants.pidRotation"
                      label="PIDRotation"
                      layout="row"
                    >
                      <Switch
                        checked={dt.assistants.pidRotation}
                        onCheckedChange={(checked) =>
                          setDrivetrain((curr) => ({
                            ...curr,
                            assistants: { ...curr.assistants, pidRotation: checked },
                          }))
                        }
                      />
                    </Field>
                    <Field
                      path="drivetrain.assistants.headingStickRotation"
                      label="HeadingStickRotation"
                      layout="row"
                    >
                      <Switch
                        checked={dt.assistants.headingStickRotation}
                        onCheckedChange={(checked) =>
                          setDrivetrain((curr) => ({
                            ...curr,
                            assistants: { ...curr.assistants, headingStickRotation: checked },
                          }))
                        }
                      />
                    </Field>
                  </div>

                  {(dt.assistants.pidRotation || dt.assistants.headingStickRotation) && (
                    <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-[#22304a]">
                      <Field path="drivetrain.assistants.rotKp" label="Rot kP">
                        <Input
                          type="number"
                          step="0.1"
                          value={dt.assistants.rotKp}
                          className="h-8 font-mono text-xs"
                          onChange={(e) =>
                            setDrivetrain((curr) => ({
                              ...curr,
                              assistants: {
                                ...curr.assistants,
                                rotKp: Number.parseFloat(e.target.value) || 0,
                              },
                            }))
                          }
                        />
                      </Field>
                      <Field path="drivetrain.assistants.rotKi" label="Rot kI">
                        <Input
                          type="number"
                          step="0.01"
                          value={dt.assistants.rotKi}
                          className="h-8 font-mono text-xs"
                          onChange={(e) =>
                            setDrivetrain((curr) => ({
                              ...curr,
                              assistants: {
                                ...curr.assistants,
                                rotKi: Number.parseFloat(e.target.value) || 0,
                              },
                            }))
                          }
                        />
                      </Field>
                      <Field path="drivetrain.assistants.rotKd" label="Rot kD">
                        <Input
                          type="number"
                          step="0.01"
                          value={dt.assistants.rotKd}
                          className="h-8 font-mono text-xs"
                          onChange={(e) =>
                            setDrivetrain((curr) => ({
                              ...curr,
                              assistants: {
                                ...curr.assistants,
                                rotKd: Number.parseFloat(e.target.value) || 0,
                              },
                            }))
                          }
                        />
                      </Field>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field
                    path="drivetrain.controls.resetGyroButton"
                    label="Botão Piloto: Zerar Gyro"
                  >
                    <Select
                      className="h-8 text-xs font-mono"
                      value={dt.controls.resetGyroButton ?? ""}
                      onChange={(e) =>
                        setDrivetrain((curr) => ({
                          ...curr,
                          controls: {
                            ...curr.controls,
                            resetGyroButton: (e.target.value || undefined) as
                              | XboxButton
                              | undefined,
                          },
                        }))
                      }
                    >
                      <option value="">(Nenhum)</option>
                      {XBOX_BUTTON_OPTIONS.map((b) => (
                        <option key={b.value} value={b.value}>
                          {b.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    path="drivetrain.controls.toggleFieldOrientedButton"
                    label="Botão Piloto: Field/Robot"
                  >
                    <Select
                      className="h-8 text-xs font-mono"
                      value={dt.controls.toggleFieldOrientedButton ?? ""}
                      onChange={(e) =>
                        setDrivetrain((curr) => ({
                          ...curr,
                          controls: {
                            ...curr.controls,
                            toggleFieldOrientedButton: (e.target.value || undefined) as
                              | XboxButton
                              | undefined,
                          },
                        }))
                      }
                    >
                      <option value="">(Nenhum)</option>
                      {XBOX_BUTTON_OPTIONS.map((b) => (
                        <option key={b.value} value={b.value}>
                          {b.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              </div>
            )}

            {/* Sub-tab 4: AprilTag Vision */}
            {subTab === "vision" && (
              <div className="rounded-xl border border-[#22304a] bg-[#0f1624] p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-emerald-400" />
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                      Visão AprilTag (Limelight · k2026RebuiltWelded)
                    </p>
                  </div>
                  <Field path="drivetrain.vision.enabled" label="Ativar" layout="row">
                    <Switch
                      checked={dt.vision.enabled}
                      onCheckedChange={(checked) =>
                        setDrivetrain((curr) => ({
                          ...curr,
                          vision: { ...curr.vision, enabled: checked },
                        }))
                      }
                    />
                  </Field>
                </div>

                {!dt.vision.enabled ? (
                  <p className="rounded-lg border border-dashed border-[#22304a] bg-[#0b0f17] p-4 text-center text-xs text-slate-400">
                    Ative acima para adicionar câmeras Limelight com fusão automática de pose via{" "}
                    <span className="font-mono">AprilTagVision</span>.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {dt.vision.cameras.map((cam, idx) => (
                      <div
                        key={cam.id}
                        className="grid grid-cols-12 gap-2 items-end rounded-lg border border-[#253552] bg-[#0b0f17] p-2.5"
                      >
                        <div className="col-span-4">
                          <Field path={`drivetrain.vision.cameras.${cam.id}.name`} label="Nome">
                            <Input
                              value={cam.name}
                              className="h-8 text-xs font-mono"
                              onChange={(e) =>
                                setDrivetrain((curr) => ({
                                  ...curr,
                                  vision: {
                                    ...curr.vision,
                                    cameras: curr.vision.cameras.map((c, i) =>
                                      i === idx ? { ...c, name: e.target.value } : c,
                                    ),
                                  },
                                }))
                              }
                            />
                          </Field>
                        </div>
                        <div className="col-span-5">
                          <Field
                            path={`drivetrain.vision.cameras.${cam.id}.ntName`}
                            label="Limelight Host"
                          >
                            <Input
                              value={cam.ntName}
                              className="h-8 text-xs font-mono"
                              onChange={(e) =>
                                setDrivetrain((curr) => ({
                                  ...curr,
                                  vision: {
                                    ...curr.vision,
                                    cameras: curr.vision.cameras.map((c, i) =>
                                      i === idx ? { ...c, ntName: e.target.value.trim() } : c,
                                    ),
                                  },
                                }))
                              }
                            />
                          </Field>
                        </div>
                        <div className="col-span-2">
                          <Field
                            path={`drivetrain.vision.cameras.${cam.id}.stdDevFactor`}
                            label="Peso"
                          >
                            <Input
                              type="number"
                              step="0.1"
                              min={0.1}
                              max={10}
                              value={cam.stdDevFactor}
                              className="h-8 text-xs font-mono"
                              onChange={(e) =>
                                setDrivetrain((curr) => ({
                                  ...curr,
                                  vision: {
                                    ...curr.vision,
                                    cameras: curr.vision.cameras.map((c, i) =>
                                      i === idx
                                        ? {
                                            ...c,
                                            stdDevFactor: Number.parseFloat(e.target.value) || 1.0,
                                          }
                                        : c,
                                    ),
                                  },
                                }))
                              }
                            />
                          </Field>
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() =>
                              setDrivetrain((curr) => ({
                                ...curr,
                                vision: {
                                  ...curr.vision,
                                  cameras: curr.vision.cameras.filter((c) => c.id !== cam.id),
                                },
                              }))
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setDrivetrain((curr) => ({
                          ...curr,
                          vision: {
                            ...curr.vision,
                            cameras: [
                              ...curr.vision.cameras,
                              {
                                id: `cam-${Date.now().toString(36)}`,
                                name: `Cam${curr.vision.cameras.length + 1}`,
                                ntName: `limelight-${curr.vision.cameras.length + 1}`,
                                stdDevFactor: 1.0,
                              },
                            ],
                          },
                        }))
                      }
                    >
                      <Camera className="h-3.5 w-3.5" />
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar Limelight
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </>
  );
}
