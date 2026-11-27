"use client";

import React, { useMemo } from "react";
import { getRebuilt2026Landmarks, type FieldRect } from "@/lib/arena/rebuilt-2026";

interface RebuiltFieldBackdropProps {
  fieldL: number;
  fieldW: number;
  showRebuilt?: boolean;
  showGrid?: boolean;
  idPrefix?: string;
}

/**
 * Shared 2026 REBUILT SVG field backdrop (carpet, 1m grid, alliance zones,
 * Neutral Zone FUEL, Trenches, Bumps, Hubs, Towers, Depots, Outposts, DS bays).
 */
export function RebuiltFieldBackdrop({
  fieldL,
  fieldW,
  showRebuilt = true,
  showGrid = true,
  idPrefix = "pp",
}: RebuiltFieldBackdropProps) {
  const landmarks = useMemo(() => getRebuilt2026Landmarks(fieldL, fieldW), [fieldL, fieldW]);

  const gridLinesX = useMemo(() => {
    const xs: number[] = [];
    for (let x = 1; x < fieldL; x += 1) xs.push(x);
    return xs;
  }, [fieldL]);

  const gridLinesY = useMemo(() => {
    const ys: number[] = [];
    for (let y = 1; y < fieldW; y += 1) ys.push(y);
    return ys;
  }, [fieldW]);

  const svgRect = (r: FieldRect, props: React.SVGProps<SVGRectElement>) => (
    <rect
      x={Math.min(r.x1, r.x2)}
      y={fieldW - Math.max(r.y1, r.y2)}
      width={Math.abs(r.x2 - r.x1)}
      height={Math.abs(r.y2 - r.y1)}
      {...props}
    />
  );

  const renderOctagonHub = (key: string, rect: FieldRect, alliance: "Blue" | "Red") => {
    const minX = Math.min(rect.x1, rect.x2);
    const maxX = Math.max(rect.x1, rect.x2);
    const minY = fieldW - Math.max(rect.y1, rect.y2);
    const maxY = fieldW - Math.min(rect.y1, rect.y2);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const w = maxX - minX;
    const h = maxY - minY;
    const c = Math.min(w, h) * 0.22;
    const pts = [
      `${minX + c},${minY}`,
      `${maxX - c},${minY}`,
      `${maxX},${minY + c}`,
      `${maxX},${maxY - c}`,
      `${maxX - c},${maxY}`,
      `${minX + c},${maxY}`,
      `${minX},${maxY - c}`,
      `${minX},${minY + c}`,
    ].join(" ");
    const stroke = alliance === "Blue" ? "#60a5fa" : "#f87171";
    const fill = alliance === "Blue" ? "#172e6e" : "#6b1520";
    const ring = alliance === "Blue" ? "#93c5fd" : "#fca5a5";
    return (
      <g key={key} className="pointer-events-none">
        <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={0.05} />
        <circle
          cx={cx}
          cy={cy}
          r={Math.min(w, h) * 0.34}
          fill="#090f1c"
          stroke={ring}
          strokeWidth={0.035}
        />
        <circle
          cx={cx}
          cy={cy}
          r={Math.min(w, h) * 0.19}
          fill="none"
          stroke={stroke}
          strokeOpacity={0.45}
          strokeWidth={0.025}
          strokeDasharray="0.08 0.06"
        />
        <rect x={minX - 0.02} y={cy - 0.08} width={0.04} height={0.16} fill="#f8fafc" fillOpacity={0.85} />
        <rect x={maxX - 0.02} y={cy - 0.08} width={0.04} height={0.16} fill="#f8fafc" fillOpacity={0.85} />
        <rect x={cx - 0.08} y={minY - 0.02} width={0.16} height={0.04} fill="#f8fafc" fillOpacity={0.85} />
        <rect x={cx - 0.08} y={maxY - 0.02} width={0.16} height={0.04} fill="#f8fafc" fillOpacity={0.85} />
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#f8fafc"
          fontSize={0.2}
          fontFamily="monospace"
          fontWeight={700}
        >
          HUB
        </text>
      </g>
    );
  };

  const renderVerticalWallZone = (
    key: string,
    rect: FieldRect,
    label: string,
    alliance: "Blue" | "Red",
    stroke: string,
    fill: string,
    textOffsetX = 0,
    extra?: React.ReactNode,
  ) => {
    const cx = (rect.x1 + rect.x2) / 2 + textOffsetX;
    const cy = fieldW - (rect.y1 + rect.y2) / 2;
    const rot = alliance === "Blue" ? -90 : 90;
    return (
      <g key={key} className="pointer-events-none">
        {svgRect(rect, {
          rx: 0.05,
          fill,
          fillOpacity: 0.9,
          stroke,
          strokeWidth: 0.04,
        })}
        {extra}
        <text
          x={cx}
          y={cy}
          transform={`rotate(${rot} ${cx} ${cy})`}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#e2e8f0"
          fillOpacity={0.92}
          fontSize={0.175}
          fontFamily="monospace"
          fontWeight={700}
        >
          {label}
        </text>
      </g>
    );
  };

  return (
    <g className="pointer-events-none select-none">
      <defs>
        <linearGradient id={`${idPrefix}-carpet-grad`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0f1b38" />
          <stop offset="25%" stopColor="#0b1322" />
          <stop offset="75%" stopColor="#0b1322" />
          <stop offset="100%" stopColor="#26111c" />
        </linearGradient>
        <linearGradient id={`${idPrefix}-blue-bump-grad`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#172554" />
          <stop offset="50%" stopColor="#2563eb" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#172554" />
        </linearGradient>
        <linearGradient id={`${idPrefix}-red-bump-grad`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#450a0a" />
          <stop offset="50%" stopColor="#dc2626" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#450a0a" />
        </linearGradient>
      </defs>

      <rect x={0} y={0} width={fieldL} height={fieldW} fill={`url(#${idPrefix}-carpet-grad)`} />

      {showRebuilt && (
        <g>
          <rect
            x={0}
            y={0}
            width={landmarks.blueAllianceLineX}
            height={fieldW}
            fill="#1d4ed8"
            fillOpacity={0.045}
          />
          <rect
            x={landmarks.redAllianceLineX}
            y={0}
            width={fieldL - landmarks.redAllianceLineX}
            height={fieldW}
            fill="#dc2626"
            fillOpacity={0.045}
          />
          <text
            x={landmarks.blueAllianceLineX * 0.52}
            y={0.42}
            textAnchor="middle"
            fill="#60a5fa"
            fillOpacity={0.24}
            fontSize={0.22}
            fontFamily="monospace"
            fontWeight={700}
          >
            BLUE ALLIANCE
          </text>
          <text
            x={(fieldL + landmarks.redAllianceLineX) / 2 - 0.1}
            y={0.42}
            textAnchor="middle"
            fill="#f87171"
            fillOpacity={0.24}
            fontSize={0.22}
            fontFamily="monospace"
            fontWeight={700}
          >
            RED ALLIANCE
          </text>
        </g>
      )}

      {/* 1m Grid & Metric Rulers */}
      <text
        x={0}
        y={fieldW + 0.3}
        textAnchor="middle"
        fill="#475569"
        fontSize={0.175}
        fontFamily="monospace"
      >
        0m
      </text>
      {gridLinesX.map((x) => (
        <g key={`gx-${x}`}>
          {showGrid && (
            <line
              x1={x}
              y1={0}
              x2={x}
              y2={fieldW}
              stroke="#1e2d4a"
              strokeOpacity={0.32}
              strokeWidth={0.02}
            />
          )}
          {x % 2 === 0 && (
            <>
              <line x1={x} y1={fieldW} x2={x} y2={fieldW + 0.1} stroke="#334155" strokeWidth={0.025} />
              <text
                x={x}
                y={fieldW + 0.3}
                textAnchor="middle"
                fill="#475569"
                fontSize={0.175}
                fontFamily="monospace"
              >
                {x}m
              </text>
            </>
          )}
        </g>
      ))}
      {gridLinesY.map((y) => (
        <g key={`gy-${y}`}>
          {showGrid && (
            <line
              x1={0}
              y1={fieldW - y}
              x2={fieldL}
              y2={fieldW - y}
              stroke="#1e2d4a"
              strokeOpacity={0.32}
              strokeWidth={0.02}
            />
          )}
          {y % 2 === 0 && (
            <>
              <line
                x1={-0.68}
                y1={fieldW - y}
                x2={-0.6}
                y2={fieldW - y}
                stroke="#334155"
                strokeWidth={0.025}
              />
              <text
                x={-0.88}
                y={fieldW - y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#475569"
                fontSize={0.175}
                fontFamily="monospace"
              >
                {y}m
              </text>
            </>
          )}
        </g>
      ))}

      {showRebuilt && (
        <g opacity={0.76}>
          {[0, 1, 2].map((slot) => {
            const slotY = (fieldW / 3) * slot + fieldW / 6;
            return (
              <g key={`ds-${slot}`}>
                <rect
                  x={-0.52}
                  y={slotY - 0.55}
                  width={0.34}
                  height={1.1}
                  rx={0.05}
                  fill="#0f1f44"
                  stroke="#3b82f6"
                  strokeOpacity={0.55}
                  strokeWidth={0.03}
                />
                <text
                  x={-0.35}
                  y={slotY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#93c5fd"
                  fontSize={0.18}
                  fontFamily="monospace"
                  fontWeight={700}
                >
                  B{3 - slot}
                </text>
                <rect
                  x={fieldL + 0.18}
                  y={slotY - 0.55}
                  width={0.34}
                  height={1.1}
                  rx={0.05}
                  fill="#3f101a"
                  stroke="#ef4444"
                  strokeOpacity={0.55}
                  strokeWidth={0.03}
                />
                <text
                  x={fieldL + 0.35}
                  y={slotY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#fca5a5"
                  fontSize={0.18}
                  fontFamily="monospace"
                  fontWeight={700}
                >
                  R{slot + 1}
                </text>
              </g>
            );
          })}

          <line
            x1={landmarks.blueAllianceLineX}
            y1={0}
            x2={landmarks.blueAllianceLineX}
            y2={fieldW}
            stroke="#3b82f6"
            strokeOpacity={0.45}
            strokeWidth={0.04}
          />
          <line
            x1={landmarks.redAllianceLineX}
            y1={0}
            x2={landmarks.redAllianceLineX}
            y2={fieldW}
            stroke="#ef4444"
            strokeOpacity={0.45}
            strokeWidth={0.04}
          />
          <line
            x1={landmarks.centerX}
            y1={0}
            x2={landmarks.centerX}
            y2={fieldW}
            stroke="#334155"
            strokeWidth={0.04}
            strokeDasharray="0.24 0.18"
          />

          {svgRect(landmarks.neutralFuelZone, {
            rx: 0.14,
            fill: "#eab308",
            fillOpacity: 0.045,
            stroke: "#eab308",
            strokeOpacity: 0.28,
            strokeWidth: 0.03,
            strokeDasharray: "0.18 0.14",
          })}
          {[0, 1, 2, 3, 4, 5].map((row) =>
            [-0.48, -0.16, 0.16, 0.48].map((dx, col) => (
              <circle
                key={`nf-${row}-${col}`}
                cx={landmarks.centerX + dx}
                cy={fieldW / 2 - 1.5 + row * 0.6}
                r={0.075}
                fill="#facc15"
                fillOpacity={0.62}
                stroke="#fef08a"
                strokeOpacity={0.45}
                strokeWidth={0.018}
              />
            )),
          )}
          <text
            x={landmarks.centerX}
            y={0.42}
            textAnchor="middle"
            fill="#94a3b8"
            fillOpacity={0.55}
            fontSize={0.22}
            fontFamily="monospace"
            fontWeight={700}
          >
            NEUTRAL ZONE · FUEL
          </text>

          {landmarks.blueTrenches.map((t, i) => {
            const cx = (t.x1 + t.x2) / 2;
            const cy = fieldW - (t.y1 + t.y2) / 2;
            const topY = fieldW - Math.max(t.y1, t.y2);
            const botY = fieldW - Math.min(t.y1, t.y2);
            return (
              <g key={`blue-trench-${i}`}>
                {svgRect(t, { rx: 0.05, fill: "#0d1b36", stroke: "#60a5fa", strokeWidth: 0.04 })}
                <line x1={t.x1} y1={topY + 0.12} x2={t.x2} y2={topY + 0.12} stroke="#93c5fd" strokeOpacity={0.45} strokeWidth={0.05} />
                <line x1={t.x1} y1={botY - 0.12} x2={t.x2} y2={botY - 0.12} stroke="#93c5fd" strokeOpacity={0.45} strokeWidth={0.05} />
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="#bfdbfe" fontSize={0.19} fontFamily="monospace" fontWeight={700}>
                  TRENCH
                </text>
              </g>
            );
          })}
          {landmarks.redTrenches.map((t, i) => {
            const cx = (t.x1 + t.x2) / 2;
            const cy = fieldW - (t.y1 + t.y2) / 2;
            const topY = fieldW - Math.max(t.y1, t.y2);
            const botY = fieldW - Math.min(t.y1, t.y2);
            return (
              <g key={`red-trench-${i}`}>
                {svgRect(t, { rx: 0.05, fill: "#291019", stroke: "#f87171", strokeWidth: 0.04 })}
                <line x1={t.x1} y1={topY + 0.12} x2={t.x2} y2={topY + 0.12} stroke="#fca5a5" strokeOpacity={0.45} strokeWidth={0.05} />
                <line x1={t.x1} y1={botY - 0.12} x2={t.x2} y2={botY - 0.12} stroke="#fca5a5" strokeOpacity={0.45} strokeWidth={0.05} />
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="#fecaca" fontSize={0.19} fontFamily="monospace" fontWeight={700}>
                  TRENCH
                </text>
              </g>
            );
          })}

          {landmarks.blueBumps.map((b, i) => {
            const cx = (b.x1 + b.x2) / 2;
            const cy = fieldW - (b.y1 + b.y2) / 2;
            return (
              <g key={`blue-bump-${i}`}>
                {svgRect(b, { rx: 0.04, fill: `url(#${idPrefix}-blue-bump-grad)`, stroke: "#475569", strokeWidth: 0.035 })}
                <rect x={cx - 0.36} y={cy - 0.15} width={0.72} height={0.3} rx={0.06} fill="#0b1220" fillOpacity={0.75} />
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="#cbd5e1" fontSize={0.18} fontFamily="monospace" fontWeight={700}>
                  BUMP
                </text>
              </g>
            );
          })}
          {landmarks.redBumps.map((b, i) => {
            const cx = (b.x1 + b.x2) / 2;
            const cy = fieldW - (b.y1 + b.y2) / 2;
            return (
              <g key={`red-bump-${i}`}>
                {svgRect(b, { rx: 0.04, fill: `url(#${idPrefix}-red-bump-grad)`, stroke: "#475569", strokeWidth: 0.035 })}
                <rect x={cx - 0.36} y={cy - 0.15} width={0.72} height={0.3} rx={0.06} fill="#0b1220" fillOpacity={0.75} />
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="#cbd5e1" fontSize={0.18} fontFamily="monospace" fontWeight={700}>
                  BUMP
                </text>
              </g>
            );
          })}

          {renderOctagonHub("blue-hub", landmarks.blueHub, "Blue")}
          {renderOctagonHub("red-hub", landmarks.redHub, "Red")}

          {[
            { key: "blue-tower", rect: landmarks.blueTower, fill: "#172554", stroke: "#60a5fa" },
            { key: "red-tower", rect: landmarks.redTower, fill: "#450a0a", stroke: "#f87171" },
          ].map((tw) => {
            const cx = (tw.rect.x1 + tw.rect.x2) / 2;
            const cy = fieldW - (tw.rect.y1 + tw.rect.y2) / 2;
            return (
              <g key={tw.key}>
                {svgRect(tw.rect, { rx: 0.05, fill: tw.fill, stroke: tw.stroke, strokeWidth: 0.04 })}
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="#e2e8f0" fontSize={0.19} fontFamily="monospace" fontWeight={700}>
                  TOWER
                </text>
              </g>
            );
          })}

          {renderVerticalWallZone("blue-depot", landmarks.blueDepot, "DEPOT", "Blue", "#eab308", "#1e293b", -0.12)}
          {renderVerticalWallZone("red-depot", landmarks.redDepot, "DEPOT", "Red", "#eab308", "#1e293b", 0.12)}
          {renderVerticalWallZone("blue-outpost", landmarks.blueOutpost, "OUTPOST", "Blue", "#38bdf8", "#0f1f38")}
          {renderVerticalWallZone("red-outpost", landmarks.redOutpost, "OUTPOST", "Red", "#fb7185", "#34101c")}
        </g>
      )}

      <rect x={0} y={0} width={0.12} height={fieldW} fill="#3b82f6" />
      <rect x={fieldL - 0.12} y={0} width={0.12} height={fieldW} fill="#ef4444" />
      <rect x={0} y={0} width={fieldL} height={fieldW} fill="none" stroke="#3b6bb5" strokeWidth={0.05} />
      <circle cx={0.12} cy={fieldW - 0.12} r={0.11} fill="#60a5fa" />
    </g>
  );
}
