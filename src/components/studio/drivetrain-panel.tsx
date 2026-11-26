"use client";

import React, { useRef, useState } from "react";
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Compass,
  Eye,
  FileUp,
  HelpCircle,
  Plus,
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
  { key: "fl", label: "FL (Frente Esq.)" },
  { key: "fr", label: "FR (Frente Dir.)" },
  { key: "bl", label: "BL (Trás Esq.)" },
  { key: "br", label: "BR (Trás Dir.)" },
];

export function DrivetrainPanel() {
  const { project, updateProject, t } = useProject();
  const tunerInputRef = useRef<HTMLInputElement>(null);
  const [tunerStatus, setTunerStatus] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  const dt = project.drivetrain;

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
        <CardContent className="space-y-4 py-8">
          <p className="text-sm text-slate-300">
            Ative o Drivetrain completo para gerar <span className="font-mono">Drive.java</span> com{" "}
            <span className="font-mono">DriveContext</span>,{" "}
            <span className="font-mono">DriveAccelerationLimits</span>, assistentes Ciprix (
            <span className="font-mono">ThrottleMapModifier</span>,{" "}
            <span className="font-mono">PIDRotation</span>), bindings no{" "}
            <span className="font-mono">RobotContainer</span> e câmera Limelight opcional.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="sm" onClick={() => handleEnableWithPreset("mk4i_l2")}>
              <Sparkles className="h-4 w-4" />
              {t("drivetrain.enable")} (MK4i L2)
            </Button>
            {DRIVETRAIN_PRESETS.filter((p) => p.id !== "mk4i_l2").map((preset) => (
              <Button
                key={preset.id}
                variant="outline"
                size="sm"
                onClick={() => handleEnableWithPreset(preset.id)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </>
    );
  }

  const isSwerve =
    dt.type === "ctre_swerve" || dt.type === "yagsl" || dt.type === "akit_swerve";

  return (
    <>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0 border-b border-[#22304a] pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <Compass className="h-5 w-5 text-sky-400 shrink-0" />
          <CardTitle>{t("drivetrain.title")}</CardTitle>
          <Badge variant={dt.enabled ? "success" : "outline"}>
            {dt.enabled ? "DriveContext Ativo" : "Stub"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
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
            onClick={() => tunerInputRef.current?.click()}
            title="Importar IDs CAN, offsets e reduções direto do Phoenix Tuner X"
          >
            <FileUp className="h-3.5 w-3.5" />
            {t("drivetrain.import_tuner")}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-5">
        {tunerStatus && (
          <div className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs text-sky-200">
            {tunerStatus}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#22304a] bg-[#0f1624] p-3">
          <Field path="drivetrain.enabled" label="Gerar Drive.java + DriveContext" layout="row">
            <Switch
              checked={dt.enabled}
              onCheckedChange={(checked) => setDrivetrain((curr) => ({ ...curr, enabled: checked }))}
            />
          </Field>
          <div className="flex flex-wrap items-center gap-1.5">
            {DRIVETRAIN_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[11px]"
                onClick={() => setDrivetrain((curr) => preset.apply({ ...curr, enabled: true }))}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        {dt.enabled && (
          <>
            {/* Base, Vendor, Gyro */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field path="drivetrain.type" label="Base / Arquitetura">
                <Select
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
                  className="font-mono"
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
                <div className="grid grid-cols-2 gap-3">
                  <Field path="drivetrain.gyro.canId" label="Pigeon CAN ID">
                    <UnitInput
                      type="number"
                      unit="ID"
                      value={dt.gyro.canId}
                      min={0}
                      max={62}
                      step={1}
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
                      className="font-mono"
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

            {/* Kinematics & Speeds */}
            <div className="rounded-xl border border-[#22304a] bg-[#0f1624] p-4 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Cinemática &amp; Limites físicos
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field path="drivetrain.maxSpeedMps" label="Vel. Máx">
                  <UnitInput
                    type="number"
                    unit="m/s"
                    value={dt.maxSpeedMps}
                    min={0.5}
                    max={10}
                    step={0.1}
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
                      onChange={(e) => {
                        const v = Number.parseFloat(e.target.value);
                        if (Number.isFinite(v)) {
                          setDrivetrain((curr) => ({ ...curr, steerGearRatio: v }));
                        }
                      }}
                    />
                  </Field>
                )}
                <Field path="drivetrain.trackWidthMeters" label="Largura (Track)">
                  <UnitInput
                    type="number"
                    unit="m"
                    value={dt.trackWidthMeters}
                    min={0.2}
                    max={1.5}
                    step={0.01}
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
                    onChange={(e) => {
                      const v = Number.parseFloat(e.target.value);
                      if (Number.isFinite(v)) {
                        setDrivetrain((curr) => ({ ...curr, wheelBaseMeters: v }));
                      }
                    }}
                  />
                </Field>
                <Field path="drivetrain.maxLinearAccelMps2" label="Acel. Linear Máx">
                  <UnitInput
                    type="number"
                    unit="m/s²"
                    value={dt.maxLinearAccelMps2}
                    min={1}
                    max={40}
                    step={0.5}
                    onChange={(e) => {
                      const v = Number.parseFloat(e.target.value);
                      if (Number.isFinite(v)) {
                        setDrivetrain((curr) => ({ ...curr, maxLinearAccelMps2: v }));
                      }
                    }}
                  />
                </Field>
                <Field path="drivetrain.maxAngularAccelRadPerSec2" label="Acel. Angular Máx">
                  <UnitInput
                    type="number"
                    unit="rad/s²"
                    value={dt.maxAngularAccelRadPerSec2}
                    min={1}
                    max={80}
                    step={1}
                    onChange={(e) => {
                      const v = Number.parseFloat(e.target.value);
                      if (Number.isFinite(v)) {
                        setDrivetrain((curr) => ({ ...curr, maxAngularAccelRadPerSec2: v }));
                      }
                    }}
                  />
                </Field>
              </div>
              <Field path="drivetrain.fieldOrientedDefault" label="Iniciar em Field-Oriented" layout="row">
                <Switch
                  checked={dt.fieldOrientedDefault}
                  onCheckedChange={(checked) =>
                    setDrivetrain((curr) => ({ ...curr, fieldOrientedDefault: checked }))
                  }
                />
              </Field>
            </div>

            {/* Ciprix Driving Assistants */}
            <div className="rounded-xl border border-[#22304a] bg-[#0f1624] p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#93c5fd]">
                Assistentes Ciprix (org.ciprix.util.drivetrain)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field path="drivetrain.assistants.throttleMap" label="ThrottleMapModifier" layout="row">
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
                <Field path="drivetrain.assistants.accelerationLimits" label="DriveAccelerationLimits" layout="row">
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
                <Field path="drivetrain.assistants.pidRotation" label="PIDRotation (manter ângulo)" layout="row">
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
                <Field path="drivetrain.assistants.headingStickRotation" label="HeadingStickRotation" layout="row">
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
                <div className="grid grid-cols-3 gap-3 pt-1">
                  <Field path="drivetrain.assistants.rotKp" label="Rot kP">
                    <Input
                      type="number"
                      step="0.1"
                      value={dt.assistants.rotKp}
                      className="font-mono"
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
                      className="font-mono"
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
                      className="font-mono"
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

            {/* Pilot Drivetrain Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field path="drivetrain.controls.resetGyroButton" label="Botão Piloto: Zerar Gyro">
                <Select
                  value={dt.controls.resetGyroButton ?? ""}
                  onChange={(e) =>
                    setDrivetrain((curr) => ({
                      ...curr,
                      controls: {
                        ...curr.controls,
                        resetGyroButton: (e.target.value || undefined) as XboxButton | undefined,
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

            {/* Motors / Modules Hardware */}
            {dt.type === "differential" ? (
              <div className="rounded-xl border border-[#22304a] bg-[#0f1624] p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Motores Tank / Differential
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Field path="drivetrain.differential.leftLeaderId" label="Esq. Líder">
                    <UnitInput
                      type="number"
                      unit="ID"
                      value={dt.differential.leftLeaderId}
                      min={0}
                      max={62}
                      step={1}
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
                  <Field path="drivetrain.differential.leftFollowerId" label="Esq. Follower">
                    <Input
                      type="number"
                      min={0}
                      max={62}
                      placeholder="Opc."
                      value={dt.differential.leftFollowerId ?? ""}
                      className="font-mono"
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
                  <Field path="drivetrain.differential.rightLeaderId" label="Dir. Líder">
                    <UnitInput
                      type="number"
                      unit="ID"
                      value={dt.differential.rightLeaderId}
                      min={0}
                      max={62}
                      step={1}
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
                  <Field path="drivetrain.differential.rightFollowerId" label="Dir. Follower">
                    <Input
                      type="number"
                      min={0}
                      max={62}
                      placeholder="Opc."
                      value={dt.differential.rightFollowerId ?? ""}
                      className="font-mono"
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
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <Field path="drivetrain.differential.leftInverted" label="Inverter Esquerda" layout="row">
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
                  <Field path="drivetrain.differential.rightInverted" label="Inverter Direita" layout="row">
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
              <div className="rounded-xl border border-[#22304a] bg-[#0f1624] p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {isSwerve ? "Módulos Swerve (FL · FR · BL · BR)" : "Rodas Mecanum (FL · FR · BL · BR)"}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {MODULE_CORNERS.map(({ key, label }) => {
                    const mod = dt.modules[key];
                    return (
                      <div
                        key={key}
                        className="rounded-lg border border-[#253552] bg-[#0b0f17] p-3 space-y-2.5"
                      >
                        <p className="font-mono text-xs font-semibold text-[#93c5fd]">{label}</p>
                        <div className="grid grid-cols-3 gap-2">
                          <Field path={`drivetrain.modules.${key}.driveCanId`} label="Drive ID">
                            <Input
                              type="number"
                              min={0}
                              max={62}
                              value={mod.driveCanId}
                              className="h-8 font-mono text-xs"
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
                              <Field path={`drivetrain.modules.${key}.steerCanId`} label="Steer ID">
                                <Input
                                  type="number"
                                  min={0}
                                  max={62}
                                  value={mod.steerCanId}
                                  className="h-8 font-mono text-xs"
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
                                label="Encoder ID"
                              >
                                <Input
                                  type="number"
                                  min={0}
                                  max={62}
                                  value={mod.encoderCanId}
                                  className="h-8 font-mono text-xs"
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
                              label="Offset (rot)"
                            >
                              <Input
                                type="number"
                                step="0.0001"
                                min={-1}
                                max={1}
                                value={mod.encoderOffsetRot}
                                className="h-8 font-mono text-xs"
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
                              label="Inv. Drive"
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
                              label="Inv. Steer"
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
            )}

            {/* AprilTag Vision (Limelight) */}
            <div className="rounded-xl border border-[#22304a] bg-[#0f1624] p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-emerald-400" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                    Visão AprilTag (Limelight · org.ciprix.vision)
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

              {dt.vision.enabled && (
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

            {/* Guide: where to get these numbers */}
            <div className="rounded-xl border border-[#22304a] bg-[#0b0f17]">
              <button
                type="button"
                onClick={() => setGuideOpen((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
              >
                <span className="inline-flex items-center gap-2">
                  <HelpCircle className="h-3.5 w-3.5 text-sky-400" />
                  De onde tirar esses dados? (Tuner X · Datasheet · Limelight)
                </span>
                {guideOpen ? (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </button>
              {guideOpen && (
                <div className="border-t border-[#22304a] px-4 py-3 text-xs text-slate-400 space-y-1.5">
                  <p>
                    <strong className="text-slate-200">CTRE Swerve:</strong> gere o{" "}
                    <span className="font-mono">TunerConstants.java</span> no Phoenix Tuner X Swerve
                    Generator e clique em <em>Importar TunerConstants.java</em> acima — os 4 módulos,
                    offsets magnéticos e Pigeon ID são preenchidos sozinhos.
                  </p>
                  <p>
                    <strong className="text-slate-200">Reduções &amp; roda:</strong> SDS MK4i L2 usa{" "}
                    <span className="font-mono">6.75:1</span> tração,{" "}
                    <span className="font-mono">21.43:1</span> direção e roda{" "}
                    <span className="font-mono">0.1016 m</span> (4&quot;). REV MAXSwerve 3&quot; usa{" "}
                    <span className="font-mono">4.71:1</span> e{" "}
                    <span className="font-mono">0.0762 m</span>.
                  </p>
                  <p>
                    <strong className="text-slate-200">Limelight:</strong> configure a posição 3D da
                    câmera na interface web (<span className="font-mono">limelight.local:5801</span>
                    ) e informe aqui o hostname exato em NetworkTables.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </>
  );
}
