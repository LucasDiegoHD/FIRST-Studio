"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Highlight, Prism, type PrismTheme } from "prism-react-renderer";
import { Button } from "@/components/ui/button";
import { useProject } from "@/context/project-context";

const studioCodeTheme: PrismTheme = {
  plain: {
    color: "#e2e8f0",
    backgroundColor: "#090e18",
  },
  styles: [
    { types: ["comment", "prolog", "doctype", "cdata"], style: { color: "#565f89" } },
    { types: ["punctuation"], style: { color: "#7c8ba1" } },
    { types: ["property", "tag", "boolean", "number", "constant", "symbol"], style: { color: "#93c5fd" } },
    { types: ["selector", "attr-name", "string", "char", "builtin"], style: { color: "#86efac" } },
    { types: ["operator", "entity", "url"], style: { color: "#a5b4fc" } },
    { types: ["atrule", "attr-value", "keyword"], style: { color: "#60a5fa" } },
    { types: ["function", "class-name"], style: { color: "#cbd5e1" } },
    { types: ["annotation"], style: { color: "#fbbf24" } },
  ],
};

function resolveLanguage(filePath: string): string {
  if (filePath.endsWith(".json")) return "json";
  if (filePath.endsWith(".java")) {
    return (Prism.languages as Record<string, unknown>).java ? "java" : "clike";
  }
  return "clike";
}

export function CodeViewer({
  filePath,
  content,
  className = "",
  hideHeader = false,
}: {
  filePath: string;
  content: string;
  className?: string;
  hideHeader?: boolean;
}) {
  const { t } = useProject();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const language = resolveLanguage(filePath);

  return (
    <div className={`flex flex-col min-h-0 bg-[#090e18] ${className}`}>
      {!hideHeader && (
        <div className="flex items-center justify-between border-b border-[#22304a] bg-[#0f1624] px-3 py-2 shrink-0">
          <span className="truncate font-mono text-xs text-slate-300">{filePath}</span>
          <Button size="sm" variant="ghost" onClick={handleCopy} className="h-7 px-2.5 text-xs">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? t("code.copied") : t("code.copy")}
          </Button>
        </div>
      )}
      <div className="flex-1 overflow-auto">
        <Highlight theme={studioCodeTheme} code={content.trimEnd()} language={language}>
          {({ tokens, getLineProps, getTokenProps }) => (
            <pre className="p-3 font-mono text-[12px] leading-[1.6] bg-[#090e18]">
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })} className="table-row">
                  <span className="table-cell w-8 select-none pr-3 text-right text-[#475266]">
                    {i + 1}
                  </span>
                  <span className="table-cell">
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </span>
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  );
}
