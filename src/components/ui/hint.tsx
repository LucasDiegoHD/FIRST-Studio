"use client";

import React, { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import * as Tooltip from "@radix-ui/react-tooltip";
import { HelpCircle } from "lucide-react";
import { useProject } from "@/context/project-context";
import { getHelpEntry } from "@/lib/help/catalog";
import { cn } from "@/lib/utils";

export function Hint({
  hintKey,
  className,
}: {
  hintKey: string;
  className?: string;
}) {
  const { locale, t } = useProject();
  const [pinned, setPinned] = useState(false);

  const entry = getHelpEntry(hintKey, locale);
  if (!entry) return null;

  const body = (
    <div className="space-y-1.5 text-left">
      <p className="text-xs leading-snug text-slate-100">
        <span className="font-semibold text-[#93c5fd]">{t("hint.what")}: </span>
        {entry.what}
      </p>
      <p className="text-[11px] leading-snug text-slate-300">
        <span className="font-semibold text-slate-200">{t("hint.why")}: </span>
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
                "inline-flex items-center justify-center rounded-full text-slate-400 transition-colors hover:text-[#93c5fd] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#60a5fa] cursor-help",
                pinned && "text-[#60a5fa]",
                className,
              )}
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </Popover.Trigger>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            sideOffset={6}
            className="z-50 max-w-xs rounded-lg border border-[#3b6bb5] bg-[#0f1624] p-3 shadow-2xl animate-fade-in"
          >
            {body}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
      <Popover.Portal>
        <Popover.Content
          side="top"
          sideOffset={6}
          onClick={(e) => e.stopPropagation()}
          className="z-50 max-w-xs rounded-lg border border-[#3b6bb5] bg-[#0f1624] p-3 shadow-2xl animate-fade-in"
        >
          {body}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
