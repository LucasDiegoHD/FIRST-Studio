"use client";

import React, { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import * as Tooltip from "@radix-ui/react-tooltip";
import { HelpCircle, Info } from "lucide-react";
import { useProject } from "@/context/project-context";
import { getHelpEntry } from "@/lib/help/catalog";
import { cn } from "@/lib/utils";

export function Hint({
  hintKey,
  tone = "default",
  className,
}: {
  hintKey: string;
  tone?: "default" | "warning";
  className?: string;
}) {
  const { locale, t } = useProject();
  const [pinned, setPinned] = useState(false);

  const entry = getHelpEntry(hintKey, locale);
  if (!entry) return null;

  const isWarning = tone === "warning";
  const Icon = isWarning ? Info : HelpCircle;

  const body = (
    <div className="space-y-1.5 text-left">
      <p className="text-xs leading-snug text-slate-100">
        {!isWarning && <span className="font-semibold text-[#93c5fd]">{t("hint.what")}: </span>}
        {entry.what}
      </p>
      <p className="text-[11px] leading-snug text-slate-300">
        {!isWarning && <span className="font-semibold text-slate-200">{t("hint.why")}: </span>}
        {entry.why}
      </p>
      {entry.typical && (
        <p className="pt-0.5 text-[11px] text-slate-400">
          {t("hint.typical")}:{" "}
          <span className="rounded border border-[#253552] bg-[#0b0f17] px-1.5 py-0.5 font-mono text-[10px] text-[#93c5fd]">
            {entry.typical}
          </span>
        </p>
      )}
    </div>
  );

  const contentClass = cn(
    "z-50 max-w-xs rounded-lg border bg-[#0f1624] p-3 shadow-2xl animate-fade-in",
    isWarning ? "border-amber-500/70" : "border-[#3b6bb5]",
  );

  return (
    <Popover.Root open={pinned} onOpenChange={setPinned}>
      <Tooltip.Root open={pinned ? false : undefined}>
        <Tooltip.Trigger asChild>
          <Popover.Trigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              aria-label={`${t("hint.what")}: ${entry.what}`}
              className={cn(
                "inline-flex items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-1 cursor-help",
                isWarning
                  ? "text-amber-400 hover:text-amber-300 focus-visible:ring-amber-400"
                  : "text-slate-400 hover:text-[#93c5fd] focus-visible:ring-[#60a5fa]",
                pinned && (isWarning ? "text-amber-300" : "text-[#60a5fa]"),
                className,
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          </Popover.Trigger>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content side="top" sideOffset={6} className={contentClass}>
            {body}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
      <Popover.Portal>
        <Popover.Content
          side="top"
          sideOffset={6}
          onClick={(e) => e.stopPropagation()}
          className={contentClass}
        >
          {body}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
