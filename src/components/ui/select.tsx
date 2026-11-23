import React from "react";
import { cn } from "@/lib/utils";

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-8 w-full rounded border border-[#1b2230] bg-[#070a10] px-2 py-1 text-xs text-slate-100 transition-colors focus-visible:outline-none focus-visible:border-[#264f8a] disabled:cursor-not-allowed disabled:opacity-45",
        className,
      )}
      {...props}
    />
  );
}
