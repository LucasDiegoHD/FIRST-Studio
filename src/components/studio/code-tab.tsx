"use client";

import React, { useMemo } from "react";
import { Download, FileCode2, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProject } from "@/context/project-context";
import { getRequiredVendordeps } from "@/lib/generator";
import { CodeViewer } from "./code-viewer";

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
    <ul className={depth > 0 ? "ml-2.5 border-l border-[#22304a] pl-2" : ""}>
      {folderNames.map((folder) => (
        <li key={folder} className="mt-1">
          <div className="flex items-center gap-1.5 px-1.5 py-0.5 text-xs font-mono text-slate-400">
            <Folder className="h-3.5 w-3.5 text-[#60a5fa] shrink-0" />
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
            className={`w-full flex items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs font-mono transition-colors cursor-pointer ${
              activePath === file.fullPath
                ? "bg-[#142c4f] text-white"
                : "text-slate-300 hover:bg-[#19253d]"
            }`}
          >
            <FileCode2 className="h-3.5 w-3.5 text-[#93c5fd] shrink-0" />
            <span className="truncate">{file.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function CodeTab({
  onDownloadZip,
  exporting,
}: {
  onDownloadZip: () => void;
  exporting: boolean;
}) {
  const { project, generatedFiles, selectedFilePath, setSelectedFilePath, issues, t } =
    useProject();

  const fileMap = useMemo(
    () => new Map(generatedFiles.map((f) => [f.path, f.content])),
    [generatedFiles],
  );

  const activePath =
    selectedFilePath && fileMap.has(selectedFilePath)
      ? selectedFilePath
      : (generatedFiles[0]?.path ?? "");
  const activeContent = fileMap.get(activePath) ?? "";

  const tree = useMemo(
    () => buildTree(generatedFiles.map((f) => f.path)),
    [generatedFiles],
  );

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const vendordeps = useMemo(() => getRequiredVendordeps(project), [project]);

  return (
    <div className="flex h-full flex-col bg-[#0b0f17]">
      {/* Top Metrics & Export Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#22304a] bg-[#131c2e] px-5 py-3 shrink-0">
        <div className="flex flex-wrap items-center gap-5 font-mono text-xs">
          <div>
            <span className="text-slate-400">Equipe: </span>
            <strong className="text-white">#{project.project.teamNumber}</strong>
          </div>
          <div>
            <span className="text-slate-400">Arquivos: </span>
            <strong className="text-white">{generatedFiles.length}</strong>
          </div>
          <div>
            <span className="text-slate-400">Vendordeps: </span>
            <strong className="text-[#93c5fd]">
              {vendordeps.map((d) => d.replace(".json", "")).join(" · ")}
            </strong>
          </div>
          <div>
            <span className="text-slate-400">Validação: </span>
            <strong className={errorCount === 0 ? "text-emerald-400" : "text-rose-400"}>
              {errorCount === 0 ? "OK" : `${errorCount} erros`}
            </strong>
          </div>
        </div>

        <Button
          size="md"
          variant="primary"
          onClick={onDownloadZip}
          disabled={exporting || errorCount > 0}
        >
          <Download className="h-4 w-4" />
          {exporting ? t("header.exporting") : t("code.download_zip")}
        </Button>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-[260px] shrink-0 overflow-y-auto border-r border-[#22304a] bg-[#0f1624] p-3">
          <TreeBranch node={tree} activePath={activePath} onSelect={setSelectedFilePath} />
        </div>
        <CodeViewer filePath={activePath} content={activeContent} className="flex-1 min-w-0" />
      </div>
    </div>
  );
}
