"use client";

import React, { useMemo, useState } from "react";
import { Vibrate } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { RumblePattern } from "@/lib/schema/ciprix-project";

interface RumblePreviewProps {
  pattern: RumblePattern;
  intensity: number;
  lightIntensity?: number;
  seconds: number;
  pulseCount?: number;
  locale: Locale;
}

interface RumbleSlice {
  startMs: number;
  durationMs: number;
  strong: number;
  weak: number;
}

function samplePattern(
  pattern: RumblePattern,
  intensity: number,
  lightIntensity: number | undefined,
  seconds: number,
  pulseCount: number,
): { heavy: [number, number][]; light: [number, number][]; slices: RumbleSlice[] } {
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const heavyAmp = clamp(intensity);
  const lightAmp = clamp(lightIntensity ?? intensity);
  const totalMs = Math.max(100, Math.round(seconds * 1000));
  const heavy: [number, number][] = [];
  const light: [number, number][] = [];
  const slices: RumbleSlice[] = [];

  if (pattern === "continuous") {
    heavy.push([0, heavyAmp], [1, heavyAmp]);
    light.push([0, lightAmp], [1, lightAmp]);
    slices.push({ startMs: 0, durationMs: totalMs, strong: heavyAmp, weak: lightAmp });
    return { heavy, light, slices };
  }

  if (pattern === "lightConfirm") {
    heavy.push([0, 0], [0.1, 0.3], [0.35, 0.3], [0.4, 0], [0.55, 0], [0.6, 0.45], [0.9, 0.45], [0.95, 0]);
    light.push([0, 0], [0.1, 0.5], [0.35, 0.5], [0.4, 0], [0.55, 0], [0.6, 0.6], [0.9, 0.6], [0.95, 0]);
    slices.push({ startMs: 0, durationMs: 120, strong: 0.3, weak: 0.5 });
    slices.push({ startMs: 180, durationMs: 140, strong: 0.45, weak: 0.6 });
    return { heavy, light, slices };
  }

  if (pattern === "heavyWarning") {
    for (let i = 0; i < 3; i++) {
      const a = i / 3;
      const b = a + 0.22;
      heavy.push([a, 0.95], [b, 0.95], [b + 0.02, 0]);
      light.push([a, 0.7], [b, 0.7], [b + 0.02, 0]);
      slices.push({ startMs: i * 220, durationMs: 150, strong: 0.95, weak: 0.7 });
    }
    return { heavy, light, slices };
  }

  if (pattern === "pulses") {
    const count = Math.max(1, Math.min(20, pulseCount));
    const stepMs = Math.max(40, Math.round(totalMs / (count * 2)));
    for (let i = 0; i < count; i++) {
      const a = i / count;
      const onEnd = a + 0.5 / count;
      const offEnd = (i + 1) / count;
      heavy.push([a, 0], [a + 0.01, heavyAmp], [onEnd, heavyAmp], [onEnd + 0.01, 0], [offEnd, 0]);
      light.push([a, 0], [a + 0.01, heavyAmp * 0.7], [onEnd, heavyAmp * 0.7], [onEnd + 0.01, 0], [offEnd, 0]);
      slices.push({
        startMs: i * stepMs * 2,
        durationMs: stepMs,
        strong: heavyAmp,
        weak: heavyAmp * 0.7,
      });
    }
    return { heavy, light, slices };
  }

  if (pattern === "zigZag") {
    const segs = 6;
    const stepMs = Math.max(40, Math.round(totalMs / segs));
    for (let i = 0; i < segs; i++) {
      const a = i / segs;
      const b = (i + 1) / segs;
      const isHeavy = i % 2 === 0;
      heavy.push([a, isHeavy ? heavyAmp : 0], [b, isHeavy ? heavyAmp : 0]);
      light.push([a, isHeavy ? 0 : heavyAmp], [b, isHeavy ? 0 : heavyAmp]);
      slices.push({
        startMs: i * stepMs,
        durationMs: stepMs,
        strong: isHeavy ? heavyAmp : 0,
        weak: isHeavy ? 0 : heavyAmp,
      });
    }
    return { heavy, light, slices };
  }

  // rampUp
  const steps = 6;
  const stepMs = Math.max(40, Math.round(totalMs / steps));
  for (let i = 0; i < steps; i++) {
    const frac = (i + 1) / steps;
    heavy.push([i / steps, heavyAmp * frac]);
    light.push([i / steps, lightAmp * frac]);
    slices.push({
      startMs: i * stepMs,
      durationMs: stepMs,
      strong: heavyAmp * frac,
      weak: lightAmp * frac,
    });
  }
  heavy.push([1, heavyAmp]);
  light.push([1, lightAmp]);
  return { heavy, light, slices };
}

function toPolylinePoints(coords: [number, number][], w = 220, h = 40): string {
  return coords
    .map(([x, y]) => `${(x * w).toFixed(1)},${(h - 4 - y * (h - 8)).toFixed(1)}`)
    .join(" ");
}

export function RumblePreview({
  pattern,
  intensity,
  lightIntensity,
  seconds,
  pulseCount = 3,
  locale,
}: RumblePreviewProps) {
  const [status, setStatus] = useState<"idle" | "playing" | "no_gamepad">("idle");

  const { heavy, light, slices } = useMemo(
    () => samplePattern(pattern, intensity, lightIntensity, seconds, pulseCount),
    [pattern, intensity, lightIntensity, seconds, pulseCount],
  );

  const handleTest = () => {
    const pads = typeof navigator !== "undefined" ? navigator.getGamepads?.() : undefined;
    const pad = pads ? Array.from(pads).find((p) => p && p.connected) : undefined;
    const actuator = (
      pad as unknown as {
        vibrationActuator?: {
          playEffect?: (
            type: string,
            params: {
              startDelay: number;
              duration: number;
              strongMagnitude: number;
              weakMagnitude: number;
            },
          ) => Promise<unknown>;
        };
      }
    )?.vibrationActuator;

    if (!actuator?.playEffect) {
      setStatus("no_gamepad");
      setTimeout(() => setStatus("idle"), 2400);
      return;
    }

    setStatus("playing");
    let maxEnd = 300;
    for (const s of slices) {
      maxEnd = Math.max(maxEnd, s.startMs + s.durationMs);
      setTimeout(() => {
        void actuator.playEffect?.("dual-rumble", {
          startDelay: 0,
          duration: s.durationMs,
          strongMagnitude: s.strong,
          weakMagnitude: s.weak,
        });
      }, s.startMs);
    }
    setTimeout(() => setStatus("idle"), maxEnd + 80);
  };

  return (
    <div className="rounded border border-[#22304a] bg-[#0b111c] p-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
          {locale === "pt" ? "Prévia de Vibração" : "Rumble Preview"}
        </span>
        <button
          type="button"
          onClick={handleTest}
          disabled={status === "playing"}
          className="inline-flex items-center gap-1 rounded border border-[#324669] bg-[#141e30] px-2 py-0.5 text-[10px] text-slate-200 hover:border-cyan-500/60 hover:text-white disabled:opacity-50"
        >
          <Vibrate className="h-3 w-3 text-cyan-300" />
          {status === "playing"
            ? locale === "pt"
              ? "Vibrando..."
              : "Playing..."
            : locale === "pt"
              ? "Testar no Controle"
              : "Test Controller"}
        </button>
      </div>

      <svg
        viewBox="0 0 220 40"
        className="h-10 w-full rounded bg-[#070b12]"
        preserveAspectRatio="none"
      >
        <line x1="0" y1="36" x2="220" y2="36" stroke="#1e293b" strokeWidth="1" />
        <polyline
          fill="none"
          stroke="#f59e0b"
          strokeWidth="1.4"
          strokeDasharray="3 2"
          points={toPolylinePoints(light)}
        />
        <polyline
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2"
          points={toPolylinePoints(heavy)}
        />
      </svg>

      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
        <span className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-sky-300">
            <span className="h-1.5 w-2.5 rounded-sm bg-sky-400" /> Heavy
          </span>
          <span className="inline-flex items-center gap-1 text-amber-300">
            <span className="h-0.5 w-2.5 bg-amber-400" /> Light
          </span>
        </span>
        {status === "no_gamepad" ? (
          <span className="text-amber-300">
            {locale === "pt"
              ? "Conecte um controle Xbox e aperte um botão"
              : "Connect an Xbox gamepad & press any button"}
          </span>
        ) : (
          <span>{seconds.toFixed(2)}s</span>
        )}
      </div>
    </div>
  );
}
