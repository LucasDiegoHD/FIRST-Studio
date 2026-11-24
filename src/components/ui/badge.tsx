import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "outline" | "destructive" | "success";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-[#142c4f] text-[#dbeafe] border-[#3b6bb5]/70",
  secondary: "bg-[#19253d] text-slate-200 border-[#253552]",
  outline: "bg-transparent text-slate-300 border-[#2c3f61]",
  destructive: "bg-rose-950/80 text-rose-200 border-rose-700/70",
  success: "bg-emerald-950/70 text-emerald-300 border-emerald-700/60",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-xs font-semibold transition-colors",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
