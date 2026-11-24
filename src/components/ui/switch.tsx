import React from "react";
import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onCheckedChange,
  id,
  className,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  id?: string;
  className?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#3b6bb5]",
        checked
          ? "bg-[#142c4f] border-[#3b6bb5]"
          : "bg-[#0c121f] border-[#253552]",
        className,
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-3.5 w-3.5 rounded-full bg-white transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
