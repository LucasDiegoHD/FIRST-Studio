"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Cog, Cpu, FileCode2, FolderOpen, Layers, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeViewer } from "@/components/studio/code-viewer";
import { useProject } from "@/context/project-context";
import { CiprixProjectSchema } from "@/lib/schema/ciprix-project";

type DemoRequest = "IDLE" | "INTAKE" | "EJECT";
const DEMO_ORDER: DemoRequest[] = ["INTAKE", "EJECT", "IDLE"];

const DEMO_STATES: Record<
  DemoRequest,
  { rollerReq: string; rollerState: string; pct: number; amps: number; rpm: number; codeSnippet: string }
> = {
  IDLE: {
    rollerReq: "STOP",
    rollerState: "STOPPED",
    pct: 0,
    amps: 0,
    rpm: 0,
    codeSnippet: `// SuperStructure -> Roller (IDLE)
fsm.state(RollerState.STOPPED)
    .onEnter(() -> io.controlMotor().stop());`,
  },
  INTAKE: {
    rollerReq: "INTAKE",
    rollerState: "INTAKING",
    pct: 0.6,
    amps: 18,
    rpm: 2400,
    codeSnippet: `// SuperStructure -> Roller (INTAKE)
fsm.state(RollerState.INTAKING)
    .onEnter(() -> io.controlMotor().runPercentOutput(RollerConstants.INTAKE_OUTPUT));`,
  },
  EJECT: {
    rollerReq: "EJECT",
    rollerState: "EJECTING",
    pct: -0.5,
    amps: 14,
    rpm: -2000,
    codeSnippet: `// SuperStructure -> Roller (EJECT)
fsm.state(RollerState.EJECTING)
    .onEnter(() -> io.controlMotor().runPercentOutput(RollerConstants.EJECT_OUTPUT));`,
  },
};

export function LandingPage() {
  const router = useRouter();
  const {
    project,
    hasSavedProject,
    locale,
    setLocale,
    loadProject,
    resetToSkeleton,
    resetToBlank,
    t,
  } = useProject();

  const [demoReq, setDemoReq] = useState<DemoRequest>("INTAKE");
  const [autoCycle, setAutoCycle] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!autoCycle) return;
    const id = setInterval(() => {
      setDemoReq((curr) => DEMO_ORDER[(DEMO_ORDER.indexOf(curr) + 1) % DEMO_ORDER.length]);
    }, 2400);
    return () => clearInterval(id);
  }, [autoCycle]);

  const demo = DEMO_STATES[demoReq];

  const handleManualDemo = (req: DemoRequest) => {
    setAutoCycle(false);
    setDemoReq(req);
  };

  const handleOpenFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = CiprixProjectSchema.safeParse(JSON.parse(await file.text()));
      if (!parsed.success) throw new Error("Invalid");
      loadProject(parsed.data);
      setLoadError(null);
      router.push("/studio");
    } catch {
      setLoadError(t("toast.load_error"));
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-studio-glow text-[#f3f5f8]">
      {/* Header */}
      <header className="border-b border-[#172030] bg-[#05070b]/90 backdrop-blur-md">
        <div className="mx-auto flex h-[54px] max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[#264f8a] bg-[#142c4f] font-mono text-xs font-bold text-white">
              FS
            </span>
            <span className="text-sm font-semibold text-white">{t("app.title")}</span>
            <span className="hidden sm:inline font-mono text-[11px] text-[#7c8ba1]">
              · Ciprix 2026.3.0
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="font-mono"
              onClick={() => setLocale(locale === "pt" ? "en" : "pt")}
            >
              {locale.toUpperCase()}
            </Button>
            <Link href="/studio">
              <Button size="sm" variant="primary">
                {t("home.open_studio")}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-14 px-6 py-12">
        <section className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
          {/* Left Hero */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#264f8a]/80 bg-[#0b1629] px-3 py-1 font-mono text-[11px] text-[#93c5fd]">
              <span className="h-2 w-2 rounded-full bg-[#3b82f6] animate-pulse" />
              Ciprix 2026.3.0 · FRC Visual Architecture
            </div>

            {hasSavedProject && (
              <div>
                <Link
                  href="/studio"
                  className="inline-flex items-center gap-2 rounded-md border border-[#264f8a] bg-[#142c4f]/45 px-3 py-1.5 text-xs text-slate-100 transition-colors hover:bg-[#142c4f]/80"
                >
                  <Play className="h-3 w-3 text-[#60a5fa]" />
                  <span>
                    {t("home.continue")}:{" "}
                    <strong className="font-mono">{project.project.name}</strong> · Team #
                    {project.project.teamNumber}
                  </span>
                  <ArrowRight className="h-3 w-3 text-[#93c5fd]" />
                </Link>
              </div>
            )}

            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.08] bg-gradient-to-r from-white via-slate-100 to-[#7cb3ff] bg-clip-text text-transparent">
              {t("home.hero_title")}
            </h1>

            <p className="text-base leading-relaxed text-[#9aa5b6] max-w-lg">
              {t("home.hero_desc")}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                size="md"
                className="h-9 px-4 text-sm"
                onClick={() => {
                  resetToSkeleton();
                  router.push("/studio");
                }}
              >
                {t("home.new_project")}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="md"
                className="h-9 px-4 text-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <FolderOpen className="h-4 w-4" />
                {t("home.open_json")}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleOpenFile}
                className="hidden"
              />
            </div>
            {loadError && <p className="text-xs text-rose-400">{loadError}</p>}
          </div>

          {/* Right Interactive Demo */}
          <div className="lg:col-span-6 rounded-lg border border-[#264f8a]/80 bg-[#05070b] glow-accent overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#172030] px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-[#9aa5b6]">{t("home.demo_label")}</span>
                <button
                  type="button"
                  onClick={() => setAutoCycle((a) => !a)}
                  className={`rounded border px-1.5 py-0.5 font-mono text-[10px] cursor-pointer ${
                    autoCycle
                      ? "border-[#3b82f6] bg-[#142c4f] text-white"
                      : "border-[#1d2738] bg-black text-[#6b7689]"
                  }`}
                >
                  {autoCycle ? "AUTO ON" : "AUTO OFF"}
                </button>
              </div>
              <div className="flex items-center gap-1">
                {DEMO_ORDER.map((req) => (
                  <button
                    key={req}
                    type="button"
                    onClick={() => handleManualDemo(req)}
                    className={`rounded px-2.5 py-1 font-mono text-[11px] transition-all cursor-pointer ${
                      demoReq === req
                        ? "bg-[#142c4f] border border-[#3b82f6] text-white shadow-[0_0_12px_-3px_rgba(59,130,246,0.7)]"
                        : "border border-[#1a2232] bg-black text-[#8a94a6] hover:text-white"
                    }`}
                  >
                    {req}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Signal Flow */}
            <div className="bg-dot-matrix grid grid-cols-12 items-center gap-2 border-b border-[#172030] px-4 py-6">
              <div className="col-span-4 rounded-md border border-[#264f8a] bg-[#081222] p-3">
                <p className="font-mono text-[10px] text-[#7c8ba1]">SuperStructure</p>
                <p className="mt-1 font-mono text-xs font-bold text-white">{demoReq}</p>
              </div>

              <div className="col-span-3 flex items-center justify-center">
                <svg viewBox="0 0 80 16" className="w-full h-4">
                  <line
                    x1="0"
                    y1="8"
                    x2="78"
                    y2="8"
                    stroke={demo.pct !== 0 ? "#3b82f6" : "#1e2c44"}
                    strokeWidth="2"
                    className={demo.pct !== 0 ? "animate-flow-dash" : ""}
                  />
                </svg>
              </div>

              <div className="col-span-5 rounded-md border border-[#3b6bb5] bg-[#0c1a30] p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-white">Roller</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#264f8a] bg-[#142c4f]/70">
                    <Cog
                      className={`h-4 w-4 ${
                        demo.pct > 0
                          ? "text-[#93c5fd] animate-motor-cw"
                          : demo.pct < 0
                            ? "text-[#93c5fd] animate-motor-ccw"
                            : "text-[#475266]"
                      }`}
                    />
                  </div>
                </div>
                <p className="mt-1 font-mono text-[11px] text-[#93c5fd]">
                  {demo.rollerState} · {demo.pct > 0 ? `+${demo.pct * 100}%` : `${demo.pct * 100}%`}
                </p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/70">
                  <div
                    className="h-full bg-[#3b82f6] transition-all duration-300"
                    style={{ width: `${Math.abs(demo.pct) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-b border-[#171c26] bg-[#04070d] px-4 py-1.5 font-mono text-[11px] text-[#8a94a6]">
              <span>
                Output:{" "}
                <strong className="text-slate-100">
                  {demo.pct > 0 ? `+${demo.pct * 100}%` : `${demo.pct * 100}%`}
                </strong>
              </span>
              <span>
                Est. <strong className="text-slate-100">{demo.amps} A</strong>
              </span>
              <span>
                <strong className="text-slate-100">{demo.rpm} RPM</strong>
              </span>
            </div>

            <CodeViewer
              filePath="Roller.java"
              content={demo.codeSnippet}
              hideHeader
              className="max-h-36"
            />
          </div>
        </section>

        {/* Templates */}
        <section className="border-t border-[#172030] pt-8 space-y-4">
          <h2 className="font-mono text-[11px] uppercase tracking-wider text-[#7c8ba1]">
            {t("home.templates_title")}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                resetToSkeleton();
                router.push("/studio");
              }}
              className="group flex items-center justify-between rounded-lg border border-[#1a2538] bg-[#060911] px-5 py-4 text-left transition-all hover:border-[#2563eb] hover:bg-[#0b1629] hover:shadow-[0_0_24px_-8px_rgba(37,99,235,0.5)] cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#264f8a] bg-[#142c4f]/70 text-[#93c5fd]">
                  <Cpu className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">Skeleton · Roller</p>
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#7cb3ff]">
                      <FileCode2 className="h-3 w-3" />
                      14 arquivos
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-[#8a94a6]">
                    {t("home.tpl_skeleton_desc")}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-[#7c8ba1] transition-transform group-hover:translate-x-1 group-hover:text-white shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {
                resetToBlank();
                router.push("/studio");
              }}
              className="group flex items-center justify-between rounded-lg border border-[#1a2538] bg-[#060911] px-5 py-4 text-left transition-all hover:border-[#2563eb] hover:bg-[#0b1629] hover:shadow-[0_0_24px_-8px_rgba(37,99,235,0.5)] cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#1f2c42] bg-[#0b1322] text-[#8a94a6]">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">{t("home.tpl_blank")}</p>
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#7c8ba1]">
                      <FileCode2 className="h-3 w-3" />
                      9 arquivos
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-[#8a94a6]">
                    {t("home.tpl_blank_desc")}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-[#7c8ba1] transition-transform group-hover:translate-x-1 group-hover:text-white shrink-0" />
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#172030] bg-[#05070b] py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 font-mono text-[11px] text-[#6b7689]">
          <span>
            {t("step.robot")} → {t("step.states")} → {t("step.controls")} → {t("step.export")}
          </span>
          <span>@AutoCommandFactory · StateSubsystem · AdvantageKit</span>
        </div>
      </footer>
    </div>
  );
}
