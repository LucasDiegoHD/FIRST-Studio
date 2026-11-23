"use client";

import React from "react";
import type { XboxButton } from "@/lib/schema/ciprix-project";

export function XboxControllerSvg({
  mappedButtons,
  selectedButton,
  onSelectButton,
}: {
  mappedButtons: Map<XboxButton, string>;
  selectedButton: XboxButton;
  onSelectButton: (button: XboxButton) => void;
}) {
  const btnStyle = (btn: XboxButton) => {
    const isSelected = selectedButton === btn;
    const isMapped = mappedButtons.has(btn);
    return {
      fill: isSelected ? "#1d4278" : isMapped ? "#142c4f" : "#080c14",
      stroke: isSelected ? "#60a5fa" : isMapped ? "#3b6bb5" : "#1f2c42",
      strokeWidth: isSelected ? 2 : 1.25,
      filter: isSelected || isMapped ? "url(#btn-glow)" : undefined,
    };
  };

  const labelFor = (btn: XboxButton) => mappedButtons.get(btn);

  return (
    <svg viewBox="0 0 540 295" className="w-full max-w-[500px] select-none">
      <defs>
        <filter id="btn-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#3b82f6" floodOpacity="0.65" />
        </filter>
      </defs>

      {/* Triggers */}
      <g onClick={() => onSelectButton("leftTrigger")} className="cursor-pointer">
        <rect x="118" y="16" width="66" height="24" rx="6" {...btnStyle("leftTrigger")} />
        <text x="151" y="32" textAnchor="middle" fill="#cbd5e1" fontSize="11" fontFamily="monospace">
          LT
        </text>
      </g>
      <g onClick={() => onSelectButton("rightTrigger")} className="cursor-pointer">
        <rect x="356" y="16" width="66" height="24" rx="6" {...btnStyle("rightTrigger")} />
        <text x="389" y="32" textAnchor="middle" fill="#cbd5e1" fontSize="11" fontFamily="monospace">
          RT
        </text>
      </g>

      {/* Bumpers + callout labels */}
      <g onClick={() => onSelectButton("leftBumper")} className="cursor-pointer">
        <rect x="104" y="48" width="92" height="24" rx="8" {...btnStyle("leftBumper")} />
        <text x="150" y="64" textAnchor="middle" fill="#f8fafc" fontSize="11" fontFamily="monospace">
          LB
        </text>
        {labelFor("leftBumper") && (
          <text x="96" y="64" textAnchor="end" fill="#93c5fd" fontSize="10" fontFamily="monospace">
            {labelFor("leftBumper")}
          </text>
        )}
      </g>
      <g onClick={() => onSelectButton("rightBumper")} className="cursor-pointer">
        <rect x="344" y="48" width="92" height="24" rx="8" {...btnStyle("rightBumper")} />
        <text x="390" y="64" textAnchor="middle" fill="#f8fafc" fontSize="11" fontFamily="monospace">
          RB
        </text>
        {labelFor("rightBumper") && (
          <text x="444" y="64" textAnchor="start" fill="#93c5fd" fontSize="10" fontFamily="monospace">
            {labelFor("rightBumper")}
          </text>
        )}
      </g>

      {/* Controller Shell */}
      <path
        d="M 128 78 C 92 78, 70 122, 66 198 C 64 238, 94 258, 124 242 C 150 228, 174 198, 206 198 L 334 198 C 366 198, 390 228, 416 242 C 446 258, 476 238, 474 198 C 470 122, 448 78, 412 78 Z"
        fill="#060910"
        stroke="#24324a"
        strokeWidth="1.6"
      />

      {/* Left Stick */}
      <circle cx="154" cy="130" r="24" fill="#090d16" stroke="#1b2434" strokeWidth="1.4" />
      <circle cx="154" cy="130" r="14" fill="#0d1320" stroke="#243147" strokeWidth="1" />

      {/* Right Stick */}
      <circle cx="330" cy="168" r="22" fill="#090d16" stroke="#1b2434" strokeWidth="1.4" />
      <circle cx="330" cy="168" r="13" fill="#0d1320" stroke="#243147" strokeWidth="1" />

      {/* Back / Start */}
      <g onClick={() => onSelectButton("back")} className="cursor-pointer">
        <rect x="222" y="116" width="24" height="14" rx="4" {...btnStyle("back")} />
        <text x="234" y="126" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">
          BK
        </text>
      </g>
      <g onClick={() => onSelectButton("start")} className="cursor-pointer">
        <rect x="294" y="116" width="24" height="14" rx="4" {...btnStyle("start")} />
        <text x="306" y="126" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">
          ST
        </text>
      </g>
      <circle cx="270" cy="108" r="10" fill="#0d1729" stroke="#264f8a" />

      {/* D-Pad */}
      <g onClick={() => onSelectButton("povUp")} className="cursor-pointer">
        <rect x="198" y="142" width="22" height="20" rx="3" {...btnStyle("povUp")} />
        <text x="209" y="156" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
          ▲
        </text>
      </g>
      <g onClick={() => onSelectButton("povDown")} className="cursor-pointer">
        <rect x="198" y="182" width="22" height="20" rx="3" {...btnStyle("povDown")} />
        <text x="209" y="196" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
          ▼
        </text>
      </g>
      <g onClick={() => onSelectButton("povLeft")} className="cursor-pointer">
        <rect x="176" y="162" width="22" height="20" rx="3" {...btnStyle("povLeft")} />
        <text x="187" y="176" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
          ◀
        </text>
      </g>
      <g onClick={() => onSelectButton("povRight")} className="cursor-pointer">
        <rect x="220" y="162" width="22" height="20" rx="3" {...btnStyle("povRight")} />
        <text x="231" y="176" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
          ▶
        </text>
      </g>

      {/* ABXY + dynamic mapping labels */}
      <g onClick={() => onSelectButton("y")} className="cursor-pointer">
        <circle cx="386" cy="102" r="14" {...btnStyle("y")} />
        <text x="386" y="106" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="600" fontFamily="monospace">
          Y
        </text>
        {labelFor("y") && (
          <text x="410" y="106" textAnchor="start" fill="#93c5fd" fontSize="10" fontFamily="monospace">
            {labelFor("y")}
          </text>
        )}
      </g>
      <g onClick={() => onSelectButton("x")} className="cursor-pointer">
        <circle cx="358" cy="128" r="14" {...btnStyle("x")} />
        <text x="358" y="132" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="600" fontFamily="monospace">
          X
        </text>
        {labelFor("x") && (
          <text x="336" y="132" textAnchor="end" fill="#93c5fd" fontSize="10" fontFamily="monospace">
            {labelFor("x")}
          </text>
        )}
      </g>
      <g onClick={() => onSelectButton("b")} className="cursor-pointer">
        <circle cx="414" cy="128" r="14" {...btnStyle("b")} />
        <text x="414" y="132" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="600" fontFamily="monospace">
          B
        </text>
        {labelFor("b") && (
          <text x="436" y="132" textAnchor="start" fill="#93c5fd" fontSize="10" fontFamily="monospace">
            {labelFor("b")}
          </text>
        )}
      </g>
      <g onClick={() => onSelectButton("a")} className="cursor-pointer">
        <circle cx="386" cy="154" r="14" {...btnStyle("a")} />
        <text x="386" y="158" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="600" fontFamily="monospace">
          A
        </text>
        {labelFor("a") && (
          <text x="386" y="182" textAnchor="middle" fill="#93c5fd" fontSize="10" fontFamily="monospace">
            {labelFor("a")}
          </text>
        )}
      </g>
    </svg>
  );
}
