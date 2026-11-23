"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Cog, FolderOpen, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeViewer } from "@/components/studio/code-viewer";
import { useProject } from "@/context/project-context";
import { CiprixProjectSchema } from "@/lib/schema/ciprix-project";

type DemoRequest = "IDLE" | "INTAKE" | "EJECT";

const DEMO_STATES: Record<
  DemoRequest,
  { rollerReq: string; rollerState: string; pct: number; codeSnippet: string }
> = {
  IDLE: {
    rollerReq: "STOP",
    rollerState: "STOPPED",
    pct: 0,
    codeSnippet: `// SuperStructure -> Roller (IDLE)
fsm.state(RollerState.STOPPED)
    .onEnter(() -> io.controlMotor().stop());`,
  },
  INTAKE: {
    rollerReq: "INTAKE",
    rollerState: "INTAKING",
    pct: 0.6,
    codeSnippet: `// SuperStructure -> Roller (INTAKE)
fsm.state(RollerState.INTAKING)
    .onEnter(() -> io.controlMotor().runPercentOutput(RollerConstants.INTAKE_OUTPUT));`,
  },
  EJECT: {
    rollerReq: "EJECT",
    rollerState: "EJECTING",
    pct: -0.5,
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const demo = DEMO_STATES[demoReq];

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
    <div className="min-h-screen flex flex-col bg-black text-[#f3f5f8]">
      {/* Header */}
      <header className="border-b border-[#171c26] bg-[#05070b]">
        <div className="mx-auto flex h-[54px] max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-bold tracking-tight text-white">FS</span>
            <span className="text-xs font-medium text-slate-200">{t("app.title")}</span>
            <span className="hidden sm:inline font-mono text-[11px] text-[#556072]">
              Ciprix 2026.3.0
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
            {hasSavedProject && (
              <Link
                href="/studio"
                className="inline-flex items-center gap-2 rounded border border-[#1d345c] bg-[#081222] px-3 py-1.5 text-xs text-slate-200 transition-colors hover:border-[#264f8a] hover:bg-[#142c4f]/60"
              >
                <Play className="h-3 w-3 text-[#60a5fa]" />
                <span>
                  {t("home.continue")}:{" "}
                  <strong className="font-mono">{project.project.name}</strong> · Team #
                  {project.project.teamNumber}
                </span>
                <ArrowRight className="h-3 w-3 text-[#8a94a6]" />
              </Link>
            )}

            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl leading-tight">
              {t("home.hero_title")}
            </h1>

            <p className="text-sm leading-relaxed text-[#8a94a6] max-w-lg">
              {t("home.hero_desc")}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  resetToSkeleton();
                  router.push("/studio");
                }}
              >
                {t("home.new_project")}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => fileInputRef.current?.click()}
              >
                <FolderOpen className="h-3.5 w-3.5" />
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
          <div className="lg:col-span-6 rounded-lg border border-[#171c26] bg-[#05070b] overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#171c26] px-4 py-2.5">
              <span className="font-mono text-[11px] text-[#7c8ba1]">
                {t("home.demo_label")}
              </span>
              <div className="flex items-center gap-1">
                {(["IDLE", "INTAKE", "EJECT"] as const).map((req) => (
                  <button
                    key={req}
                    type="button"
                    onClick={() => setDemoReq(req)}
                    className={`rounded px-2.5 py-1 font-mono text-[11px] transition-colors cursor-pointer ${
                      demoReq === req
                        ? "bg-[#142c4f] border border-[#264f8a] text-white"
                        : "border border-[#1a2232] bg-black text-[#8a94a6] hover:text-slate-200"
                    }`}
                  >
                    {req}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Signal Flow */}
            <div className="bg-dot-matrix grid grid-cols-11 items-center gap-2 border-b border-[#171c26] px-4 py-6">
              <div className="col-span-4 rounded border border-[#1d2c46] bg-[#070b14] p-3">
                <p className="font-mono text-[10px] text-[#6b7689]">SuperStructure</p>
                <p className="mt-1 font-mono text-xs font-semibold text-white">{demoReq}</p>
              </div>

              <div className="col-span-2 flex items-center justify-center">
                <div
                  className={`h-[2px] w-full transition-colors ${
                    demo.pct !== 0 ? "bg-[#3b82f6]" : "bg-[#1e2c44]"
                  }`}
                />
              </div>

              <div className="col-span-5 rounded border border-[#264f8a] bg-[#081222] p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-white">Roller</span>
                  <Cog
                    className={`h-4 w-4 ${
                      demo.pct > 0
                        ? "text-[#60a5fa] animate-motor-cw"
                        : demo.pct < 0
                          ? "text-[#60a5fa] animate-motor-ccw"
                          : "text-[#475266]"
                    }`}
                  />
                </div>
                <p className="mt-1 font-mono text-[11px] text-[#93c5fd]">
                  {demo.rollerState} · {demo.pct > 0 ? `+${demo.pct * 100}%` : `${demo.pct * 100}%`}
                </p>
              </div>
            </div>

            <CodeViewer
              filePath="Roller.java"
              content={demo.codeSnippet}
              hideHeader
              className="max-h-40"
            />
          </div>
        </section>

        {/* Templates */}
        <section className="border-t border-[#171c26] pt-8 space-y-4">
          <h2 className="font-mono text-[11px] uppercase tracking-wider text-[#6b7689]">
            {t("home.templates_title")}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                resetToSkeleton();
                router.push("/studio");
              }}
              className="flex items-center justify-between rounded-md border border-[#171c26] bg-[#05070b] px-5 py-4 text-left transition-colors hover:border-[#264f8a] hover:bg-[#081222] cursor-pointer"
            >
              <div>
                <p className="text-sm font-medium text-white">Skeleton · Roller</p>
                <p className="mt-1 font-mono text-[11px] text-[#7c8ba1]">
                  {t("home.tpl_skeleton_desc")}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-[#6b7689] shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {
                resetToBlank();
                router.push("/studio");
              }}
              className="flex items-center justify-between rounded-md border border-[#171c26] bg-[#05070b] px-5 py-4 text-left transition-colors hover:border-[#264f8a] hover:bg-[#081222] cursor-pointer"
            >
              <div>
                <p className="text-sm font-medium text-white">{t("home.tpl_blank")}</p>
                <p className="mt-1 font-mono text-[11px] text-[#7c8ba1]">
                  {t("home.tpl_blank_desc")}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-[#6b7689] shrink-0" />
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#171c26] bg-[#05070b] py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 font-mono text-[11px] text-[#556072]">
          <span>
            {t("step.robot")} → {t("step.states")} → {t("step.controls")} → {t("step.export")}
          </span>
          <span>@AutoCommandFactory · StateSubsystem · AdvantageKit</span>
        </div>
      </footer>
    </div>
  );
}
