import React from "react";
import { cn } from "@/lib/utils";

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-9 w-full rounded-md border border-[#253552] bg-[#0c121f] px-2.5 py-1.5 text-sm text-[#f8fafc] transition-colors focus-visible:outline-none focus-visible:border-[#3b6bb5] disabled:cursor-not-allowed disabled:opacity-45",
        className,
      )}
      {...props}
    />
  );
}
