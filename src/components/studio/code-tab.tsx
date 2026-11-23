"use client";

import React, { useMemo, useState } from "react";
import { Check, Copy, Download, FileCode2, Folder } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProject } from "@/context/project-context";
import { getRequiredVendordeps } from "@/lib/generator";

interface TreeNode {
  folders: Record<string, TreeNode>;
  files: { name: string; fullPath: string }[];
}

function buildTree(paths: string[]): TreeNode {
  const root: TreeNode = { folders: {}, files: [] };
  for (const fullPath of paths) {
    const parts = fullPath.split("/").filter(Boolean);
    let node = root;
    parts.forEach((part, idx) => {
      if (idx === parts.length - 1) {
        node.files.push({ name: part, fullPath });
      } else {
        if (!node.folders[part]) node.folders[part] = { folders: {}, files: [] };
        node = node.folders[part];
      }
    });
  }
  return root;
}

function TreeBranch({
  node,
  activePath,
  onSelect,
  depth = 0,
}: {
  node: TreeNode;
  activePath: string;
  onSelect: (path: string) => void;
  depth?: number;
}) {
  const folderNames = Object.keys(node.folders).sort();
  const files = [...node.files].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ul className={depth > 0 ? "pl-3 border-l border-slate-800 ml-2" : ""}>
      {folderNames.map((folder) => (
        <li key={folder} className="mt-1">
          <div className="flex items-center gap-1.5 px-1.5 py-0.5 text-xs font-medium text-slate-400">
            <Folder className="h-3.5 w-3.5 text-amber-400/90 shrink-0" />
            <span>{folder}</span>
          </div>
          <TreeBranch
            node={node.folders[folder]}
            activePath={activePath}
            onSelect={onSelect}
            depth={depth + 1}
          />
        </li>
      ))}
      {files.map((file) => (
        <li key={file.fullPath}>
          <button
            type="button"
            onClick={() => onSelect(file.fullPath)}
            className={`w-full flex items-center gap-1.5 rounded px-2 py-1 text-left text-xs font-mono transition-colors cursor-pointer ${
              activePath === file.fullPath
                ? "bg-sky-500/20 text-sky-200"
                : "text-slate-300 hover:bg-slate-800/80"
            }`}
          >
            <FileCode2 className="h-3.5 w-3.5 text-sky-400/80 shrink-0" />
            <span className="truncate">{file.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

const JAVA_KEYWORDS =
  /\b(package|import|public|private|protected|class|interface|extends|implements|enum|final|static|void|return|new|switch|case|default|if|else|boolean|int|double|true|false)\b/;

function highlightLine(line: string): React.ReactNode {
  const trimmed = line.trimStart();
  if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
    return <span className="text-slate-500">{line}</span>;
  }

  const tokens = line.split(/(\s+|"[^"]*"|@[A-Za-z_][A-Za-z0-9_]*)/g);
  return tokens.map((token, idx) => {
    if (!token) return null;
    if (token.startsWith('"') && token.endsWith('"')) {
      return (
        <span key={idx} className="text-emerald-300">
          {token}
        </span>
      );
    }
    if (token.startsWith("@")) {
      return (
        <span key={idx} className="text-amber-300">
          {token}
        </span>
      );
    }
    if (JAVA_KEYWORDS.test(token)) {
      return (
        <span key={idx} className="text-sky-400">
          {token}
        </span>
      );
    }
    return <React.Fragment key={idx}>{token}</React.Fragment>;
  });
}

export function CodeTab({
  onDownloadZip,
  exporting,
}: {
  onDownloadZip: () => void;
  exporting: boolean;
}) {
  const { project, generatedFiles, issues, t } = useProject();
  const [selectedPath, setSelectedPath] = useState<string>(
    generatedFiles[0]?.path ?? "ciprix-project.json",
  );
  const [copied, setCopied] = useState(false);

  const fileMap = useMemo(
    () => new Map(generatedFiles.map((f) => [f.path, f.content])),
    [generatedFiles],
  );

  const activePath = fileMap.has(selectedPath)
    ? selectedPath
    : generatedFiles[0]?.path ?? "";
  const activeContent = fileMap.get(activePath) ?? "";

  const tree = useMemo(
    () => buildTree(generatedFiles.map((f) => f.path)),
    [generatedFiles],
  );

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const vendordeps = useMemo(() => getRequiredVendordeps(project), [project]);

  const handleCopy = async () => {
    if (!activeContent) return;
    await navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      <div className="lg:col-span-4 space-y-5">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>{t("code.validation_title")}</CardTitle>
            <Badge variant={errorCount === 0 ? "success" : "error"}>
              {errorCount === 0 ? "OK" : `${errorCount} erros`}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {vendordeps.map((dep) => (
                <Badge key={dep} variant="info">
                  {dep.replace(".json", "")}
                </Badge>
              ))}
            </div>
            {issues.length > 0 && (
              <ul className="space-y-1.5 max-h-40 overflow-y-auto text-xs">
                {issues.map((issue) => (
                  <li
                    key={issue.id}
                    className={
                      issue.severity === "error" ? "text-rose-300" : "text-amber-300"
                    }
                  >
                    • {issue.message}
                  </li>
                ))}
              </ul>
            )}
            <Button
              variant="primary"
              className="w-full"
              onClick={onDownloadZip}
              disabled={exporting || errorCount > 0}
            >
              <Download className="h-4 w-4" />
              {exporting ? t("header.exporting") : t("code.download_zip")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("code.tree_title")}</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[420px] overflow-y-auto">
            <TreeBranch node={tree} activePath={activePath} onSelect={setSelectedPath} />
          </CardContent>
        </Card>
      </div>

      <Card className="lg:col-span-8 flex flex-col min-h-[540px]">
        <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-slate-800/80 pb-3">
          <span className="font-mono text-xs text-slate-300 truncate">{activePath}</span>
          <Button size="sm" variant="outline" onClick={handleCopy}>
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? t("code.copied") : t("code.copy")}
          </Button>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-auto max-h-[580px]">
          <pre className="p-4 font-mono text-xs leading-6 text-slate-200">
            <code>
              {activeContent.split("\n").map((line, i) => (
                <div key={i} className="table-row">
                  <span className="table-cell select-none pr-4 text-right text-slate-600 w-8">
                    {i + 1}
                  </span>
                  <span className="table-cell">{highlightLine(line)}</span>
                </div>
              ))}
            </code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
