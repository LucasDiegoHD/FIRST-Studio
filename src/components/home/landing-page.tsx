"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Cog, Cpu, FileCode2, FolderOpen, Layers, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProject } from "@/context/project-context";
import { parseProjectWithMigration } from "@/lib/schema/migrations";

type DemoRequest = "IDLE" | "INTAKE" | "EJECT";
const DEMO_ORDER: DemoRequest[] = ["INTAKE", "EJECT", "IDLE"];

const DEMO_STATES: Record<
  DemoRequest,
  { rollerReq: string; rollerState: string; pct: number; amps: number; rpm: number }
> = {
  IDLE: {
    rollerReq: "STOP",
    rollerState: "STOPPED",
    pct: 0,
    amps: 0,
    rpm: 0,
  },
  INTAKE: {
    rollerReq: "INTAKE",
    rollerState: "INTAKING",
    pct: 0.6,
    amps: 18,
    rpm: 2400,
  },
  EJECT: {
    rollerReq: "EJECT",
    rollerState: "EJECTING",
    pct: -0.5,
    amps: 14,
    rpm: -2000,
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
    resetToCompetition,
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
      const parsed = parseProjectWithMigration(JSON.parse(await file.text()));
      if (!parsed.ok) throw new Error("Invalid");
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
    <div className="min-h-screen flex flex-col bg-studio-glow text-[#f8fafc]">
      {/* Header */}
      <header className="border-b border-[#22304a] bg-[#0f1624]/90 bg-pattern backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[#3b6bb5] bg-[#142c4f] font-headline text-xs font-bold text-white">
              FS
            </span>
            <span className="font-headline text-[16px] font-bold text-white">{t("app.title")}</span>
            <span className="hidden sm:inline font-mono text-xs text-slate-400">
              · Ciprix 2026.3.0
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              size="sm"
              variant="ghost"
              className="font-mono"
              onClick={() => setLocale(locale === "pt" ? "en" : "pt")}
            >
              {locale.toUpperCase()}
            </Button>
            <Link href="/studio">
              <Button size="sm" variant="secondary">
                {t("home.open_studio")}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-16 px-6 py-14 animate-page-enter">
        <section className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
          {/* Left Hero */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#3b6bb5]/70 bg-[#131c2e] px-3.5 py-1 font-mono text-xs text-[#93c5fd]">
              <span className="h-2 w-2 rounded-full bg-[#60a5fa] animate-pulse" />
              Ciprix 2026.3.0 · FRC Visual Architecture
            </div>

            {hasSavedProject && (
              <div>
                <Link
                  href="/studio"
                  className="inline-flex items-center gap-2 rounded-md border border-[#3b6bb5]/70 bg-[#131c2e] px-3.5 py-2 text-[13px] text-slate-100 transition-colors hover:border-[#60a5fa] hover:bg-[#19253d]"
                >
                  <Play className="h-3.5 w-3.5 text-[#60a5fa]" />
                  <span>
                    {t("home.continue")}:{" "}
                    <strong className="font-mono">{project.project.name}</strong> · Team #
                    {project.project.teamNumber}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-[#93c5fd]" />
                </Link>
              </div>
            )}

            <h1 className="font-headline text-4xl sm:text-5xl font-bold tracking-tight leading-[1.08] bg-gradient-to-r from-white via-slate-100 to-[#93c5fd] bg-clip-text text-transparent">
              {t("home.hero_title")}
            </h1>

            <p className="text-base leading-relaxed text-slate-300 max-w-lg">
              {t("home.hero_desc")}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button
                variant="primary"
                size="md"
                className="h-10 px-5 text-sm"
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
                className="h-10 px-5 text-sm"
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
            {loadError && <p className="text-[13px] text-rose-400">{loadError}</p>}
          </div>

          {/* Right Interactive Demo */}
          <div className="lg:col-span-6 rounded-xl border border-[#2c3f61] bg-[#131c2e] glow-accent overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#22304a] bg-[#0f1624] px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="font-headline text-xs font-semibold uppercase tracking-wide text-slate-300">{t("home.demo_label")}</span>
                <button
                  type="button"
                  onClick={() => setAutoCycle((a) => !a)}
                  className={`rounded border px-2 py-0.5 font-mono text-[11px] cursor-pointer transition-colors ${
                    autoCycle
                      ? "border-[#3b6bb5] bg-[#142c4f] text-white"
                      : "border-[#253552] bg-[#0b0f17] text-slate-400 hover:text-white"
                  }`}
                >
                  {autoCycle ? "AUTO ON" : "AUTO OFF"}
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                {DEMO_ORDER.map((req) => (
                  <button
                    key={req}
                    type="button"
                    onClick={() => handleManualDemo(req)}
                    className={`rounded-md px-3 py-1 font-mono text-xs transition-all cursor-pointer ${
                      demoReq === req
                        ? "bg-[#142c4f] border border-[#60a5fa] text-white shadow-[0_0_14px_-3px_rgba(59,130,246,0.65)]"
                        : "border border-[#253552] bg-[#0b0f17] text-slate-400 hover:text-white"
                    }`}
                  >
                    {req}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Signal Flow */}
            <div className="bg-dot-matrix grid grid-cols-12 items-center gap-3 border-b border-[#22304a] px-5 py-9">
              <div className="col-span-4 rounded-lg border border-[#3b6bb5]/70 bg-[#131c2e] p-4 shadow-md">
                <p className="font-mono text-[11px] text-slate-400">SuperStructure</p>
                <p className="mt-1.5 font-mono text-sm font-bold text-white">{demoReq}</p>
              </div>

              <div className="col-span-3 flex items-center justify-center">
                <svg viewBox="0 0 80 16" className="w-full h-4">
                  <line
                    x1="0"
                    y1="8"
                    x2="78"
                    y2="8"
                    stroke={demo.pct !== 0 ? "#60a5fa" : "#2c3f61"}
                    strokeWidth="2.2"
                    className={demo.pct !== 0 ? "animate-flow-dash" : ""}
                  />
                </svg>
              </div>

              <div className="col-span-5 rounded-lg border border-[#3b6bb5] bg-[#16233b] p-4 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-white">Roller</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#3b6bb5] bg-[#142c4f]">
                    <Cog
                      className={`h-4 w-4 ${
                        demo.pct > 0
                          ? "text-[#93c5fd] animate-motor-cw"
                          : demo.pct < 0
                            ? "text-[#93c5fd] animate-motor-ccw"
                            : "text-slate-500"
                      }`}
                    />
                  </div>
                </div>
                <p className="mt-1.5 font-mono text-xs text-[#93c5fd]">
                  {demo.rollerState} · {demo.pct > 0 ? `+${demo.pct * 100}%` : `${demo.pct * 100}%`}
                </p>
                <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-[#0b0f17] border border-[#22304a]">
                  <div
                    className="h-full bg-[#60a5fa] transition-all duration-300"
                    style={{ width: `${Math.abs(demo.pct) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between bg-[#0f1624] px-5 py-3 font-mono text-xs text-slate-400">
              <span>
                Output:{" "}
                <strong className="text-white">
                  {demo.pct > 0 ? `+${demo.pct * 100}%` : `${demo.pct * 100}%`}
                </strong>
              </span>
              <span>
                Est. <strong className="text-white">{demo.amps} A</strong>
              </span>
              <span>
                <strong className="text-white">{demo.rpm} RPM</strong>
              </span>
            </div>
          </div>
        </section>

        {/* Templates */}
        <section className="border-t border-[#22304a] pt-8 space-y-4">
          <h2 className="font-mono text-xs uppercase tracking-wider text-slate-400">
            {t("home.templates_title")}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => {
                resetToSkeleton();
                router.push("/studio");
              }}
              className="group flex items-center justify-between rounded-xl border border-[#253552] bg-[#131c2e] px-5 py-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#60a5fa] hover:bg-[#19253d] hover:shadow-[0_0_24px_-8px_rgba(59,130,246,0.45)] cursor-pointer"
            >
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#3b6bb5] bg-[#142c4f] text-[#93c5fd]">
                  <Cpu className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-headline text-[16px] font-semibold text-white">Skeleton · Roller</p>
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#93c5fd]">
                      <FileCode2 className="h-3.5 w-3.5" />
                      14 arquivos
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] text-slate-400">
                    {t("home.tpl_skeleton_desc")}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-white shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {
                resetToCompetition();
                router.push("/studio");
              }}
              className="group flex items-center justify-between rounded-xl border border-[#3b6bb5]/80 bg-[#131c2e] px-5 py-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#60a5fa] hover:bg-[#19253d] hover:shadow-[0_0_24px_-8px_rgba(59,130,246,0.45)] cursor-pointer"
            >
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#60a5fa] bg-[#142c4f] text-white">
                  <Cog className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-headline text-[16px] font-semibold text-white">Competition</p>
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#93c5fd]">
                      <FileCode2 className="h-3.5 w-3.5" />
                      24 arquivos
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] text-slate-400">
                    Shooter + Hood + Indexer · SmartMotion · atGoal Interlocks
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-white shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {
                resetToBlank();
                router.push("/studio");
              }}
              className="group flex items-center justify-between rounded-xl border border-[#253552] bg-[#131c2e] px-5 py-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#60a5fa] hover:bg-[#19253d] hover:shadow-[0_0_24px_-8px_rgba(59,130,246,0.45)] cursor-pointer"
            >
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#2c3f61] bg-[#0f1624] text-slate-300">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-headline text-[16px] font-semibold text-white">{t("home.tpl_blank")}</p>
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-400">
                      <FileCode2 className="h-3.5 w-3.5" />
                      9 arquivos
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] text-slate-400">
                    {t("home.tpl_blank_desc")}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-white shrink-0" />
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#22304a] bg-[#0f1624] bg-pattern py-3.5">
        <div className="mx-auto flex flex-wrap max-w-6xl items-center justify-between gap-3 px-6 font-mono text-xs text-slate-400">
          <span>
            {t("step.robot")} → {t("step.states")} → {t("step.controls")} → {t("step.export")}
          </span>
          <div className="flex items-center gap-4">
            <span>@AutoCommandFactory · StateSubsystem · AdvantageKit</span>
            <Link href="/credits" className="text-[#93c5fd] hover:text-white transition-colors">
              {t("nav.credits")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
