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
      fill: isSelected ? "#1c3c6b" : isMapped ? "#142c4f" : "#0a0e16",
      stroke: isSelected ? "#60a5fa" : isMapped ? "#264f8a" : "#1f2a3d",
      strokeWidth: isSelected ? 1.8 : 1.2,
    };
  };

  return (
    <svg viewBox="0 0 460 280" className="w-full max-w-[440px] select-none">
      {/* Triggers */}
      <g onClick={() => onSelectButton("leftTrigger")} className="cursor-pointer">
        <rect x="78" y="14" width="66" height="24" rx="6" {...btnStyle("leftTrigger")} />
        <text x="111" y="30" textAnchor="middle" fill="#cbd5e1" fontSize="11" fontFamily="monospace">
          LT
        </text>
      </g>
      <g onClick={() => onSelectButton("rightTrigger")} className="cursor-pointer">
        <rect x="316" y="14" width="66" height="24" rx="6" {...btnStyle("rightTrigger")} />
        <text x="349" y="30" textAnchor="middle" fill="#cbd5e1" fontSize="11" fontFamily="monospace">
          RT
        </text>
      </g>

      {/* Bumpers */}
      <g onClick={() => onSelectButton("leftBumper")} className="cursor-pointer">
        <rect x="64" y="46" width="92" height="24" rx="8" {...btnStyle("leftBumper")} />
        <text x="110" y="62" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontFamily="monospace">
          LB
        </text>
      </g>
      <g onClick={() => onSelectButton("rightBumper")} className="cursor-pointer">
        <rect x="304" y="46" width="92" height="24" rx="8" {...btnStyle("rightBumper")} />
        <text x="350" y="62" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontFamily="monospace">
          RB
        </text>
      </g>

      {/* Controller Shell */}
      <path
        d="M 88 76 C 52 76, 30 120, 26 196 C 24 236, 54 256, 84 240 C 110 226, 134 196, 166 196 L 294 196 C 326 196, 350 226, 376 240 C 406 256, 436 236, 434 196 C 430 120, 408 76, 372 76 Z"
        fill="#060910"
        stroke="#1f2a3d"
        strokeWidth="1.6"
      />

      {/* Left Stick (decorative) */}
      <circle cx="114" cy="128" r="24" fill="#090d16" stroke="#1b2434" strokeWidth="1.4" />
      <circle cx="114" cy="128" r="14" fill="#0d1320" stroke="#243147" strokeWidth="1" />

      {/* Right Stick (decorative) */}
      <circle cx="290" cy="166" r="22" fill="#090d16" stroke="#1b2434" strokeWidth="1.4" />
      <circle cx="290" cy="166" r="13" fill="#0d1320" stroke="#243147" strokeWidth="1" />

      {/* Back / Start */}
      <g onClick={() => onSelectButton("back")} className="cursor-pointer">
        <rect x="182" y="114" width="24" height="14" rx="4" {...btnStyle("back")} />
        <text x="194" y="124" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">
          BK
        </text>
      </g>
      <g onClick={() => onSelectButton("start")} className="cursor-pointer">
        <rect x="254" y="114" width="24" height="14" rx="4" {...btnStyle("start")} />
        <text x="266" y="124" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">
          ST
        </text>
      </g>
      <circle cx="230" cy="106" r="10" fill="#0a0e16" stroke="#1f2a3d" />

      {/* D-Pad */}
      <g onClick={() => onSelectButton("povUp")} className="cursor-pointer">
        <rect x="158" y="140" width="22" height="20" rx="3" {...btnStyle("povUp")} />
        <text x="169" y="154" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
          ▲
        </text>
      </g>
      <g onClick={() => onSelectButton("povDown")} className="cursor-pointer">
        <rect x="158" y="180" width="22" height="20" rx="3" {...btnStyle("povDown")} />
        <text x="169" y="194" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
          ▼
        </text>
      </g>
      <g onClick={() => onSelectButton("povLeft")} className="cursor-pointer">
        <rect x="136" y="160" width="22" height="20" rx="3" {...btnStyle("povLeft")} />
        <text x="147" y="174" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
          ◀
        </text>
      </g>
      <g onClick={() => onSelectButton("povRight")} className="cursor-pointer">
        <rect x="180" y="160" width="22" height="20" rx="3" {...btnStyle("povRight")} />
        <text x="191" y="174" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
          ▶
        </text>
      </g>

      {/* ABXY */}
      <g onClick={() => onSelectButton("y")} className="cursor-pointer">
        <circle cx="346" cy="100" r="14" {...btnStyle("y")} />
        <text x="346" y="104" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="600" fontFamily="monospace">
          Y
        </text>
      </g>
      <g onClick={() => onSelectButton("x")} className="cursor-pointer">
        <circle cx="318" cy="126" r="14" {...btnStyle("x")} />
        <text x="318" y="130" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="600" fontFamily="monospace">
          X
        </text>
      </g>
      <g onClick={() => onSelectButton("b")} className="cursor-pointer">
        <circle cx="374" cy="126" r="14" {...btnStyle("b")} />
        <text x="374" y="130" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="600" fontFamily="monospace">
          B
        </text>
      </g>
      <g onClick={() => onSelectButton("a")} className="cursor-pointer">
        <circle cx="346" cy="152" r="14" {...btnStyle("a")} />
        <text x="346" y="156" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="600" fontFamily="monospace">
          A
        </text>
      </g>
    </svg>
  );
}
