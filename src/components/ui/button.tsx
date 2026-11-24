import React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-white text-[#0b0f17] border border-white hover:bg-slate-200 shadow-sm font-semibold",
  secondary:
    "bg-[#142c4f] text-white border border-[#3b6bb5]/70 hover:bg-[#1a3a68] hover:border-[#60a5fa] font-medium",
  outline:
    "bg-[#131c2e] text-slate-100 border border-[#253552] hover:border-[#3b6bb5] hover:bg-[#19253d]",
  ghost:
    "bg-transparent text-slate-400 border border-transparent hover:text-white hover:bg-[#131c2e]",
  destructive:
    "bg-transparent text-rose-400 border border-rose-900/60 hover:bg-rose-950/50 hover:border-rose-700/70",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] rounded-md",
  md: "h-9 px-4 text-sm rounded-md",
  icon: "h-8 w-8 rounded-md",
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
