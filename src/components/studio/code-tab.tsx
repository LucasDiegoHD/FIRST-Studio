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
    <ul className={depth > 0 ? "ml-2.5 border-l border-[#172030] pl-2" : ""}>
      {folderNames.map((folder) => (
        <li key={folder} className="mt-1">
          <div className="flex items-center gap-1.5 px-1.5 py-0.5 text-[11px] font-mono text-[#6b7689]">
            <Folder className="h-3 w-3 text-[#4d6b99] shrink-0" />
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
            className={`w-full flex items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] font-mono transition-colors cursor-pointer ${
              activePath === file.fullPath
                ? "bg-[#142c4f]/70 text-white"
                : "text-[#9aa5b6] hover:bg-[#0c121e]"
            }`}
          >
            <FileCode2 className="h-3 w-3 text-[#6384b6] shrink-0" />
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
    <div className="flex h-full flex-col bg-black">
      {/* Top Metrics & Export Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#172030] bg-[#05070b] px-4 py-2.5 shrink-0">
        <div className="flex flex-wrap items-center gap-5 font-mono text-[11px]">
          <div>
            <span className="text-[#6b7689]">Equipe: </span>
            <strong className="text-slate-100">#{project.project.teamNumber}</strong>
          </div>
          <div>
            <span className="text-[#6b7689]">Arquivos: </span>
            <strong className="text-slate-100">{generatedFiles.length}</strong>
          </div>
          <div>
            <span className="text-[#6b7689]">Vendordeps: </span>
            <strong className="text-[#93c5fd]">
              {vendordeps.map((d) => d.replace(".json", "")).join(" · ")}
            </strong>
          </div>
          <div>
            <span className="text-[#6b7689]">Validação: </span>
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
          <Download className="h-3.5 w-3.5" />
          {exporting ? t("header.exporting") : t("code.download_zip")}
        </Button>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-[245px] shrink-0 overflow-y-auto border-r border-[#172030] bg-[#04060a] p-2.5">
          <TreeBranch node={tree} activePath={activePath} onSelect={setSelectedFilePath} />
        </div>
        <CodeViewer filePath={activePath} content={activeContent} className="flex-1 min-w-0" />
      </div>
    </div>
  );
}
