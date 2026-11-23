import React from "react";
import { cn } from "@/lib/utils";

export interface UnitInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  unit: string;
}

export function UnitInput({ unit, className, ...props }: UnitInputProps) {
  return (
    <div
      className={cn(
        "flex h-8 w-full items-center rounded border border-[#1b2230] bg-[#070a10] transition-colors focus-within:border-[#264f8a]",
        className,
      )}
    >
      <input
        className="h-full w-full min-w-0 bg-transparent px-2.5 text-xs font-mono text-slate-100 placeholder:text-[#505969] focus:outline-none disabled:cursor-not-allowed disabled:opacity-45"
        {...props}
      />
      <span className="shrink-0 select-none border-l border-[#171c26] px-2 text-[11px] font-mono text-[#6b7689]">
        {unit}
      </span>
    </div>
  );
}
