import React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "outline" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[#142c4f] text-slate-50 border border-[#264f8a] hover:bg-[#1c3c6b] font-medium",
  outline:
    "bg-[#070a10] text-slate-200 border border-[#1d2432] hover:border-[#2c384e] hover:bg-[#0c111b]",
  ghost:
    "bg-transparent text-[#8a94a6] border border-transparent hover:text-slate-100 hover:bg-[#0c111b]",
  destructive:
    "bg-transparent text-rose-400 border border-rose-900/60 hover:bg-rose-950/50 hover:border-rose-700/70",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-7 px-2.5 text-xs rounded",
  md: "h-8 px-3 text-xs rounded",
  icon: "h-7 w-7 rounded",
};

export function Button({
  className,
  variant = "outline",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#264f8a] disabled:pointer-events-none disabled:opacity-40 cursor-pointer",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
