import React from "react";
import { cn } from "@/lib/utils";

export interface UnitInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  unit: string;
}

export function UnitInput({ unit, className, ...props }: UnitInputProps) {
  return (
    <div
      data-unit-input=""
      className={cn(
        "flex h-9 w-full items-center rounded-md border border-[#253552] bg-[#0c121f] transition-colors focus-within:border-[#3b6bb5]",
        className,
      )}
    >
      <input
        className="h-full w-full min-w-0 bg-transparent px-3 text-sm font-mono text-[#f8fafc] placeholder:text-slate-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-45"
        {...props}
      />
      <span className="shrink-0 select-none border-l border-[#22304a] px-2.5 text-xs font-mono text-slate-400">
        {unit}
      </span>
    </div>
  );
}
