"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProject } from "@/context/project-context";

const JAVA_KEYWORDS =
  /^(package|import|public|private|protected|class|interface|extends|implements|enum|final|static|void|return|new|switch|case|default|if|else|boolean|int|double|true|false)$/;

function highlightLine(line: string): React.ReactNode {
  const trimmed = line.trimStart();
  if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
    return <span className="text-[#565f89]">{line}</span>;
  }

  const tokens = line.split(/(\s+|"[^"]*"|@[A-Za-z_][A-Za-z0-9_]*)/g);
  return tokens.map((token, idx) => {
    if (!token) return null;
    if (token.startsWith('"') && token.endsWith('"')) {
      return (
        <span key={idx} className="text-[#9ece6a]">
          {token}
        </span>
      );
    }
    if (token.startsWith("@")) {
      return (
        <span key={idx} className="text-[#c0caf5]">
          {token}
        </span>
      );
    }
    if (JAVA_KEYWORDS.test(token)) {
      return (
        <span key={idx} className="text-[#7aa2f7]">
          {token}
        </span>
      );
    }
    return <React.Fragment key={idx}>{token}</React.Fragment>;
  });
}

export function CodeViewer({
  filePath,
  content,
  className = "",
}: {
  filePath: string;
  content: string;
  className?: string;
}) {
  const { t } = useProject();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className={`flex flex-col min-h-0 bg-[#030508] ${className}`}>
      <div className="flex items-center justify-between border-b border-[#171c26] bg-[#05070b] px-3 py-1.5 shrink-0">
        <span className="truncate font-mono text-[11px] text-[#8a94a6]">{filePath}</span>
        <Button size="sm" variant="ghost" onClick={handleCopy} className="h-6 px-2 text-[11px]">
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          {copied ? t("code.copied") : t("code.copy")}
        </Button>
      </div>
      <div className="flex-1 overflow-auto">
        <pre className="p-3 font-mono text-[12px] leading-[1.6] text-slate-200">
          <code>
            {content.split("\n").map((line, i) => (
              <div key={i} className="table-row">
                <span className="table-cell w-8 select-none pr-3 text-right text-[#475266]">
                  {i + 1}
                </span>
                <span className="table-cell">{highlightLine(line)}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
