import type { SubsystemType } from "./schema/ciprix-project";

export interface SubsystemTheme {
  barBg: string;
  iconText: string;
  badgeBg: string;
  borderActive: string;
  fillBg: string;
}

const THEMES: Record<SubsystemType, SubsystemTheme> = {
  roller: {
    barBg: "bg-cyan-400",
    iconText: "text-cyan-300",
    badgeBg: "bg-cyan-950/60 text-cyan-200 border-cyan-700/60",
    borderActive: "border-cyan-400/80",
    fillBg: "bg-cyan-500/10",
  },
  indexer: {
    barBg: "bg-sky-400",
    iconText: "text-sky-300",
    badgeBg: "bg-sky-950/60 text-sky-200 border-sky-700/60",
    borderActive: "border-sky-400/80",
    fillBg: "bg-sky-500/10",
  },
  shooter: {
    barBg: "bg-amber-400",
    iconText: "text-amber-300",
    badgeBg: "bg-amber-950/60 text-amber-200 border-amber-700/60",
    borderActive: "border-amber-400/80",
    fillBg: "bg-amber-500/10",
  },
  arm: {
    barBg: "bg-violet-400",
    iconText: "text-violet-300",
    badgeBg: "bg-violet-950/60 text-violet-200 border-violet-700/60",
    borderActive: "border-violet-400/80",
    fillBg: "bg-violet-500/10",
  },
  wrist: {
    barBg: "bg-fuchsia-400",
    iconText: "text-fuchsia-300",
    badgeBg: "bg-fuchsia-950/60 text-fuchsia-200 border-fuchsia-700/60",
    borderActive: "border-fuchsia-400/80",
    fillBg: "bg-fuchsia-500/10",
  },
  elevator: {
    barBg: "bg-emerald-400",
    iconText: "text-emerald-300",
    badgeBg: "bg-emerald-950/60 text-emerald-200 border-emerald-700/60",
    borderActive: "border-emerald-400/80",
    fillBg: "bg-emerald-500/10",
  },
  turret: {
    barBg: "bg-indigo-400",
    iconText: "text-indigo-300",
    badgeBg: "bg-indigo-950/60 text-indigo-200 border-indigo-700/60",
    borderActive: "border-indigo-400/80",
    fillBg: "bg-indigo-500/10",
  },
  hood: {
    barBg: "bg-blue-400",
    iconText: "text-blue-300",
    badgeBg: "bg-blue-950/60 text-blue-200 border-blue-700/60",
    borderActive: "border-blue-400/80",
    fillBg: "bg-blue-500/10",
  },
  climber: {
    barBg: "bg-rose-400",
    iconText: "text-rose-300",
    badgeBg: "bg-rose-950/60 text-rose-200 border-rose-700/60",
    borderActive: "border-rose-400/80",
    fillBg: "bg-rose-500/10",
  },
  leds: {
    barBg: "bg-lime-400",
    iconText: "text-lime-300",
    badgeBg: "bg-lime-950/60 text-lime-200 border-lime-700/60",
    borderActive: "border-lime-400/80",
    fillBg: "bg-lime-500/10",
  },
  generic: {
    barBg: "bg-slate-400",
    iconText: "text-slate-300",
    badgeBg: "bg-slate-900/70 text-slate-200 border-slate-600/60",
    borderActive: "border-slate-400/80",
    fillBg: "bg-slate-500/10",
  },
};

export function getSubsystemTheme(type: SubsystemType): SubsystemTheme {
  return THEMES[type] ?? THEMES.generic;
}
