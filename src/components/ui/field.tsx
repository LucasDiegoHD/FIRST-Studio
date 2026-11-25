"use client";

import React from "react";
import { useProject } from "@/context/project-context";
import { cn } from "@/lib/utils";
import { Hint } from "./hint";

export function Field({
  path,
  label,
  hintKey,
  layout = "vertical",
  className,
  controlClassName,
  children,
}: {
  path: string;
  label?: string;
  hintKey?: string;
  layout?: "vertical" | "row" | "compact";
  className?: string;
  controlClassName?: string;
  children: React.ReactNode;
}) {
  const { issues, highlightedFieldPath } = useProject();

  const matching = issues.filter((i) => i.path === path);
  const activeIssue = matching.find((i) => i.severity === "error") ?? matching[0];
  const isHighlighted = highlightedFieldPath === path;
  const resolvedHint = hintKey ?? path;

  const errorBorderClasses = activeIssue
    ? activeIssue.severity === "error"
      ? "[&_input]:border-rose-500 [&_select]:border-rose-500 [&_[data-unit-input]]:border-rose-500"
      : "[&_input]:border-amber-500 [&_select]:border-amber-500 [&_[data-unit-input]]:border-amber-500"
    : "";

  const highlightClasses = isHighlighted
    ? "ring-2 ring-rose-500 rounded-md p-1 -m-1 animate-error-pulse"
    : "";

  if (layout === "row") {
    return (
      <div data-field={path} className={cn("space-y-1.5", highlightClasses, className)}>
        <div className="flex items-center justify-between gap-4">
          {label && (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-medium text-slate-200">{label}</span>
              <Hint hintKey={resolvedHint} />
            </div>
          )}
          <div className={cn(errorBorderClasses, controlClassName)}>{children}</div>
        </div>
        {activeIssue && (
          <p
            className={cn(
              "text-[11px] leading-snug",
              activeIssue.severity === "error" ? "text-rose-400" : "text-amber-400",
            )}
          >
            {activeIssue.message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div data-field={path} className={cn("space-y-1.5", highlightClasses, className)}>
      {label && (
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-slate-300">{label}</label>
          <Hint hintKey={resolvedHint} />
        </div>
      )}
      <div className={cn(errorBorderClasses, controlClassName)}>{children}</div>
      {activeIssue && (
        <p
          className={cn(
            "text-[11px] leading-snug",
            activeIssue.severity === "error" ? "text-rose-400" : "text-amber-400",
          )}
        >
          {activeIssue.message}
        </p>
      )}
    </div>
  );
}
