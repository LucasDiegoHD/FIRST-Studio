"use client";

import React from "react";
import type { XboxButton } from "@/lib/schema/ciprix-project";

export interface MappedButtonInfo {
  label: string;
  priority?: number;
}

interface CalloutAnchor {
  bx: number;
  by: number;
  lx: number;
  ly: number;
  align: "start" | "end";
}

const CALLOUTS: Record<XboxButton, CalloutAnchor> = {
  leftTrigger: { bx: 245, by: 50, lx: 145, ly: 44, align: "end" },
  rightTrigger: { bx: 515, by: 50, lx: 615, ly: 44, align: "start" },
  leftBumper: { bx: 222, by: 88, lx: 130, ly: 96, align: "end" },
  rightBumper: { bx: 538, by: 88, lx: 630, ly: 96, align: "start" },
  leftStick: { bx: 256, by: 184, lx: 130, ly: 138, align: "end" },
  rightStick: { bx: 446, by: 254, lx: 630, ly: 340, align: "start" },
  povUp: { bx: 314, by: 230, lx: 130, ly: 176, align: "end" },
  povLeft: { bx: 288, by: 256, lx: 130, ly: 224, align: "end" },
  povRight: { bx: 340, by: 256, lx: 130, ly: 272, align: "end" },
  povDown: { bx: 314, by: 282, lx: 130, ly: 320, align: "end" },
  y: { bx: 502, by: 150, lx: 630, ly: 150, align: "start" },
  b: { bx: 538, by: 186, lx: 630, ly: 196, align: "start" },
  a: { bx: 502, by: 222, lx: 630, ly: 244, align: "start" },
  x: { bx: 466, by: 186, lx: 630, ly: 292, align: "start" },
  back: { bx: 334, by: 182, lx: 275, ly: 392, align: "end" },
  start: { bx: 426, by: 182, lx: 485, ly: 392, align: "start" },
};

export function XboxControllerSvg({
  mappedButtons,
  selectedButton,
  hoveredButton,
  onSelectButton,
  onHoverButton,
  svgRef,
}: {
  mappedButtons: Map<XboxButton, MappedButtonInfo>;
  selectedButton: XboxButton;
  hoveredButton: XboxButton | null;
  onSelectButton: (button: XboxButton) => void;
  onHoverButton: (button: XboxButton | null) => void;
  svgRef?: React.RefObject<SVGSVGElement | null>;
}) {
  const buttonVisual = (btn: XboxButton) => {
    const isSelected = selectedButton === btn;
    const isHovered = hoveredButton === btn;
    const isMapped = mappedButtons.has(btn);

    return {
      fill: isSelected
        ? "url(#activeButtonGrad)"
        : isHovered
          ? "#1e4275"
          : isMapped
            ? "#142c4f"
            : "url(#idleButtonGrad)",
      stroke: isSelected
        ? "#60a5fa"
        : isHovered
          ? "#60a5fa"
          : isMapped
            ? "#3b6bb5"
            : "#33496e",
      strokeWidth: isSelected ? 2 : isHovered ? 1.7 : 1.25,
      filter: isSelected || isHovered || isMapped ? "url(#activeGlow)" : undefined,
    };
  };

  const bindEvents = (btn: XboxButton) => ({
    onClick: () => onSelectButton(btn),
    onMouseEnter: () => onHoverButton(btn),
    onMouseLeave: () => onHoverButton(null),
    className: "cursor-pointer transition-all duration-150",
  });

  return (
    <svg ref={svgRef} viewBox="0 0 760 430" className="w-full max-w-[680px] select-none">
      <defs>
        <radialGradient id="ambientHalo" cx="50%" cy="48%" r="48%">
          <stop offset="0%" stopColor="#142c4f" stopOpacity="0.65" />
          <stop offset="65%" stopColor="#142c4f" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#0b0f17" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="shellGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1c2942" />
          <stop offset="40%" stopColor="#121b2d" />
          <stop offset="100%" stopColor="#0d1422" />
        </linearGradient>

        <linearGradient id="gripGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#152036" />
          <stop offset="100%" stopColor="#0d1422" />
        </linearGradient>

        <radialGradient id="stickGrad" cx="42%" cy="38%" r="60%">
          <stop offset="0%" stopColor="#263757" />
          <stop offset="65%" stopColor="#141e33" />
          <stop offset="100%" stopColor="#0d1422" />
        </radialGradient>

        <linearGradient id="idleButtonGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1b2840" />
          <stop offset="100%" stopColor="#111a2c" />
        </linearGradient>

        <linearGradient id="activeButtonGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#275ba3" />
          <stop offset="100%" stopColor="#142c4f" />
        </linearGradient>

        <filter id="activeGlow" x="-35%" y="-35%" width="170%" height="170%">
          <feDropShadow dx="0" dy="0" stdDeviation="4.5" floodColor="#3b82f6" floodOpacity="0.7" />
        </filter>
      </defs>

      {/* Ambient Dark-Blue Halo Behind Controller */}
      <ellipse cx="380" cy="220" rx="280" ry="175" fill="url(#ambientHalo)" />

      {/* Left & Right Triggers (LT / RT) */}
      <g {...bindEvents("leftTrigger")}>
        <path
          d="M 206 74 C 212 42, 238 34, 274 38 L 284 74 C 254 70, 224 73, 206 74 Z"
          {...buttonVisual("leftTrigger")}
        />
        <text x="247" y="59" textAnchor="middle" fill="#dbeafe" fontSize="11" fontWeight="600" fontFamily="monospace">
          LT
        </text>
      </g>

      <g {...bindEvents("rightTrigger")}>
        <path
          d="M 554 74 C 548 42, 522 34, 486 38 L 476 74 C 506 70, 536 73, 554 74 Z"
          {...buttonVisual("rightTrigger")}
        />
        <text x="513" y="59" textAnchor="middle" fill="#dbeafe" fontSize="11" fontWeight="600" fontFamily="monospace">
          RT
        </text>
      </g>

      {/* Sculpted Bumpers (LB / RB) hugging the shell */}
      <g {...bindEvents("leftBumper")}>
        <path
          d="M 176 106 C 188 79, 228 69, 288 74 L 294 96 C 244 92, 202 100, 180 116 Z"
          {...buttonVisual("leftBumper")}
        />
        <text x="234" y="92" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="700" fontFamily="monospace">
          LB
        </text>
      </g>

      <g {...bindEvents("rightBumper")}>
        <path
          d="M 584 106 C 572 79, 532 69, 472 74 L 466 96 C 516 92, 558 100, 580 116 Z"
          {...buttonVisual("rightBumper")}
        />
        <text x="526" y="92" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="700" fontFamily="monospace">
          RB
        </text>
      </g>

      {/* Main Ergonomic Xbox Series X Shell */}
      <path
        d="M 284 95
           C 232 95, 194 104, 176 122
           C 150 154, 134 234, 136 298
           C 138 342, 162 365, 192 356
           C 224 346, 250 296, 290 292
           L 470 292
           C 510 296, 536 346, 568 356
           C 598 365, 622 342, 624 298
           C 626 234, 610 154, 584 122
           C 566 104, 528 95, 476 95
           C 444 95, 418 101, 380 101
           C 342 101, 316 95, 284 95 Z"
        fill="url(#shellGrad)"
        stroke="#33496e"
        strokeWidth="1.8"
      />

      {/* Subtle Top Rim Highlight */}
      <path
        d="M 186 119 C 216 101, 256 98, 288 98 C 325 98, 348 104, 380 104 C 412 104, 435 98, 472 98 C 504 98, 544 101, 574 119"
        fill="none"
        stroke="#3b6bb5"
        strokeOpacity="0.45"
        strokeWidth="1"
      />

      {/* Left & Right Grip Seam Lines */}
      <path
        d="M 178 214 C 166 254, 164 304, 178 342"
        fill="none"
        stroke="#1b2638"
        strokeWidth="1.4"
      />
      <path
        d="M 582 214 C 594 254, 596 304, 582 342"
        fill="none"
        stroke="#1b2638"
        strokeWidth="1.4"
      />

      {/* Xbox Center Guide Button */}
      <g>
        <circle cx="380" cy="140" r="17" fill="#09101d" stroke="#2c4c80" strokeWidth="1.5" />
        <path
          d="M 372 132 L 388 148 M 388 132 L 372 148"
          stroke="#93c5fd"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </g>

      {/* Center Share Pill (decorative) */}
      <rect x="371" y="198" width="18" height="10" rx="3" fill="#0d1320" stroke="#223047" strokeWidth="1" />

      {/* View (Back) & Menu (Start) Buttons */}
      <g {...bindEvents("back")}>
        <circle cx="334" cy="182" r="12" {...buttonVisual("back")} />
        <rect x="328" y="177" width="8" height="7" rx="1" fill="none" stroke="#cbd5e1" strokeWidth="1.1" />
        <rect x="331" y="180" width="8" height="7" rx="1" fill="#090d16" stroke="#cbd5e1" strokeWidth="1.1" />
      </g>

      <g {...bindEvents("start")}>
        <circle cx="426" cy="182" r="12" {...buttonVisual("start")} />
        <line x1="420" y1="178" x2="432" y2="178" stroke="#cbd5e1" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="420" y1="182" x2="432" y2="182" stroke="#cbd5e1" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="420" y1="186" x2="432" y2="186" stroke="#cbd5e1" strokeWidth="1.4" strokeLinecap="round" />
      </g>

      {/* Left Analog Stick (LS / L3) */}
      <g {...bindEvents("leftStick")}>
        <circle cx="256" cy="184" r="32" fill="#05070c" stroke="#1b2538" strokeWidth="1.5" />
        <circle cx="256" cy="184" r="24" {...buttonVisual("leftStick")} />
        <circle cx="256" cy="184" r="15" fill="none" stroke="#1d2b44" strokeWidth="1" />
        <text x="256" y="188" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontWeight="700" fontFamily="monospace">
          LS
        </text>
      </g>

      {/* Right Analog Stick (RS / R3) */}
      <g {...bindEvents("rightStick")}>
        <circle cx="446" cy="254" r="32" fill="#05070c" stroke="#1b2538" strokeWidth="1.5" />
        <circle cx="446" cy="254" r="24" {...buttonVisual("rightStick")} />
        <circle cx="446" cy="254" r="15" fill="none" stroke="#1d2b44" strokeWidth="1" />
        <text x="446" y="258" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontWeight="700" fontFamily="monospace">
          RS
        </text>
      </g>

      {/* Faceted Circular Dish D-Pad */}
      <g>
        <circle cx="314" cy="256" r="32" fill="#05070c" stroke="#1e2a3f" strokeWidth="1.5" />
        <circle cx="314" cy="256" r="27" fill="#090e18" stroke="#1a2436" strokeWidth="1" />

        <g {...bindEvents("povUp")}>
          <rect x="305" y="229" width="18" height="20" rx="3" {...buttonVisual("povUp")} />
          <text x="314" y="243" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
            ▲
          </text>
        </g>
        <g {...bindEvents("povDown")}>
          <rect x="305" y="263" width="18" height="20" rx="3" {...buttonVisual("povDown")} />
          <text x="314" y="277" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
            ▼
          </text>
        </g>
        <g {...bindEvents("povLeft")}>
          <rect x="287" y="247" width="20" height="18" rx="3" {...buttonVisual("povLeft")} />
          <text x="297" y="260" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
            ◀
          </text>
        </g>
        <g {...bindEvents("povRight")}>
          <rect x="321" y="247" width="20" height="18" rx="3" {...buttonVisual("povRight")} />
          <text x="331" y="260" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
            ▶
          </text>
        </g>
        <circle cx="314" cy="256" r="6" fill="#0c1320" stroke="#1f2d45" strokeWidth="1" />
      </g>

      {/* ABXY Buttons */}
      <g {...bindEvents("y")}>
        <circle cx="502" cy="150" r="15" {...buttonVisual("y")} />
        <text x="502" y="155" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="700" fontFamily="monospace">
          Y
        </text>
      </g>
      <g {...bindEvents("x")}>
        <circle cx="466" cy="186" r="15" {...buttonVisual("x")} />
        <text x="466" y="191" textAnchor="middle" fill="#60a5fa" fontSize="12" fontWeight="700" fontFamily="monospace">
          X
        </text>
      </g>
      <g {...bindEvents("b")}>
        <circle cx="538" cy="186" r="15" {...buttonVisual("b")} />
        <text x="538" y="191" textAnchor="middle" fill="#f87171" fontSize="12" fontWeight="700" fontFamily="monospace">
          B
        </text>
      </g>
      <g {...bindEvents("a")}>
        <circle cx="502" cy="222" r="15" {...buttonVisual("a")} />
        <text x="502" y="227" textAnchor="middle" fill="#4ade80" fontSize="12" fontWeight="700" fontFamily="monospace">
          A
        </text>
      </g>

      {/* Technical Leader-Line Callouts for Mapped Buttons */}
      {Array.from(mappedButtons.entries()).map(([btn, info]) => {
        const anchor = CALLOUTS[btn];
        const isHighlighted = selectedButton === btn || hoveredButton === btn;
        const midX =
          anchor.align === "end"
            ? anchor.lx + 24
            : anchor.lx - 24;
        const pillText = info.priority ? `#${info.priority} ${info.label}` : info.label;
        const pillW = Math.max(76, pillText.length * 7.2 + 18);
        const pillX = anchor.align === "end" ? anchor.lx - pillW : anchor.lx;

        return (
          <g
            key={btn}
            onClick={() => onSelectButton(btn)}
            onMouseEnter={() => onHoverButton(btn)}
            onMouseLeave={() => onHoverButton(null)}
            className="cursor-pointer"
          >
            <path
              d={`M ${anchor.bx} ${anchor.by} L ${midX} ${anchor.ly} L ${anchor.lx} ${anchor.ly}`}
              fill="none"
              stroke={isHighlighted ? "#60a5fa" : "#264f8a"}
              strokeWidth={isHighlighted ? 1.8 : 1.2}
            />
            <circle
              cx={anchor.bx}
              cy={anchor.by}
              r={isHighlighted ? 3.5 : 2.5}
              fill={isHighlighted ? "#93c5fd" : "#3b82f6"}
            />
            <rect
              x={pillX}
              y={anchor.ly - 12}
              width={pillW}
              height={24}
              rx={5}
              fill={isHighlighted ? "#142c4f" : "#131c2e"}
              stroke={isHighlighted ? "#60a5fa" : "#3b6bb5"}
              strokeWidth={isHighlighted ? 1.6 : 1.1}
            />
            <text
              x={pillX + pillW / 2}
              y={anchor.ly + 4}
              textAnchor="middle"
              fill="#f1f5f9"
              fontSize="10.5"
              fontWeight="600"
              fontFamily="monospace"
            >
              {pillText}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
