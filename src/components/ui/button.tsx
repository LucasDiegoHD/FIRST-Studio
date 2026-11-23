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
    "bg-gradient-to-b from-[#1d3f73] to-[#142c4f] text-white border border-[#3b6bb5] hover:from-[#254f8f] hover:to-[#183561] shadow-[0_0_20px_-6px_rgba(37,99,235,0.65)] font-semibold",
  outline:
    "bg-[#070b12] text-slate-100 border border-[#1d2738] hover:border-[#345994] hover:bg-[#0c1424]",
  ghost:
    "bg-transparent text-[#9aa5b6] border border-transparent hover:text-white hover:bg-[#0c1424]",
  destructive:
    "bg-transparent text-rose-400 border border-rose-900/60 hover:bg-rose-950/50 hover:border-rose-700/70",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-7 px-2.5 text-xs rounded-md",
  md: "h-8 px-3.5 text-xs rounded-md",
  icon: "h-7 w-7 rounded-md",
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
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#3b82f6] disabled:pointer-events-none disabled:opacity-40 cursor-pointer",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
