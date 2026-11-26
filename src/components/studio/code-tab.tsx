"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Download, FileCode2, Folder, FolderOpen, FolderSync, Rocket, Unlink } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useProject } from "@/context/project-context";
import { getRequiredVendordeps } from "@/lib/generator";
import {
  applyFolderSyncPlan,
  clearDirectoryHandle,
  ensureReadWritePermission,
  isFileSystemAccessSupported,
  loadDirectoryHandle,
  pickLocalDirectory,
  prepareFolderSyncPlan,
  readTextFile,
  saveDirectoryHandle,
  type ConflictResolution,
  type FolderSyncPlan,
  type NativeDirectoryHandle,
} from "@/lib/local-folder";
import { parseProjectWithMigration } from "@/lib/schema/migrations";
import { BridgeDeployPanel } from "./bridge-deploy-panel";
import { CodeViewer } from "./code-viewer";
import { LocalSyncDialog } from "./local-sync-dialog";

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
    <ul className={depth > 0 ? "ml-2 border-l border-[#22304a] pl-2" : ""}>
      {folderNames.map((folder) => {
        let label = folder;
        let current = node.folders[folder];
        while (current.files.length === 0) {
          const subFolders = Object.keys(current.folders);
          if (subFolders.length !== 1) break;
          label += `/${subFolders[0]}`;
          current = current.folders[subFolders[0]];
        }
        return (
          <li key={folder} className="mt-1">
            <div
              title={label}
              className="flex items-center gap-1.5 px-1.5 py-0.5 text-xs font-mono text-slate-400"
            >
              <Folder className="h-3.5 w-3.5 text-[#60a5fa] shrink-0" />
              <span className="truncate">{label}</span>
            </div>
            <TreeBranch
              node={current}
              activePath={activePath}
              onSelect={onSelect}
              depth={depth + 1}
            />
          </li>
        );
      })}
      {files.map((file) => (
        <li key={file.fullPath}>
          <button
            type="button"
            title={file.name}
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
  const {
    project,
    generatedFiles,
    selectedFilePath,
    setSelectedFilePath,
    loadProject,
    issues,
    t,
  } = useProject();

  const [fsSupported, setFsSupported] = useState(false);
  const [dirHandle, setDirHandle] = useState<NativeDirectoryHandle | null>(null);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [syncPlan, setSyncPlan] = useState<FolderSyncPlan | null>(null);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showBridge, setShowBridge] = useState(false);
  const [folderFeedback, setFolderFeedback] = useState<string | null>(null);

  useEffect(() => {
    const supported = isFileSystemAccessSupported();
    setFsSupported(supported);
    if (!supported) return;

    void loadDirectoryHandle().then(async (saved) => {
      if (!saved) return;
      setDirHandle(saved);
      const granted = await ensureReadWritePermission(saved, false);
      setNeedsReconnect(!granted);
    });
  }, []);

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

  const ensureActiveHandle = async (): Promise<NativeDirectoryHandle | null> => {
    const target = dirHandle ?? (await pickLocalDirectory());
    const ok = await ensureReadWritePermission(target, true);
    if (!ok) {
      setFolderFeedback("Permissão de leitura/escrita negada para a pasta.");
      return null;
    }
    await saveDirectoryHandle(target);
    setDirHandle(target);
    setNeedsReconnect(false);
    return target;
  };

  const handleConnectFolder = async () => {
    setFolderFeedback(null);
    try {
      const picked =
        dirHandle && needsReconnect ? dirHandle : await pickLocalDirectory();
      const ok = await ensureReadWritePermission(picked, true);
      if (!ok) {
        setFolderFeedback("Permissão negada pelo navegador.");
        return;
      }
      await saveDirectoryHandle(picked);
      setDirHandle(picked);
      setNeedsReconnect(false);

      const jsonText = await readTextFile(picked, "ciprix-project.json");
      if (jsonText) {
        setFolderFeedback(
          `Pasta "${picked.name}" conectada (contém ciprix-project.json — clique em Abrir ou Salvar).`,
        );
      } else {
        setFolderFeedback(
          `Pasta "${picked.name}" conectada. Clique em "Salvar na pasta" para gravar o projeto.`,
        );
      }
    } catch {
      // Cancelled by user
    }
  };

  const handleLoadFromFolder = async () => {
    setFolderFeedback(null);
    try {
      const handle = await ensureActiveHandle();
      if (!handle) return;
      const jsonText = await readTextFile(handle, "ciprix-project.json");
      if (!jsonText) {
        setFolderFeedback(`Nenhum ciprix-project.json encontrado em "${handle.name}".`);
        return;
      }
      const parsed = parseProjectWithMigration(JSON.parse(jsonText));
      if (!parsed.ok) {
        setFolderFeedback("Arquivo ciprix-project.json inválido nesta pasta.");
        return;
      }
      loadProject(parsed.data);
      setFolderFeedback(`Projeto carregado de "${handle.name}".`);
    } catch (err) {
      setFolderFeedback(
        err instanceof Error ? err.message : "Falha ao abrir projeto da pasta.",
      );
    }
  };

  const handleOpenSyncDialog = async () => {
    setFolderFeedback(null);
    try {
      const handle = await ensureActiveHandle();
      if (!handle) return;
      const plan = await prepareFolderSyncPlan(handle, project);
      setSyncPlan(plan);
      setSyncDialogOpen(true);
    } catch (err) {
      setFolderFeedback(
        err instanceof Error ? err.message : "Falha ao preparar sincronização.",
      );
    }
  };

  const handleConfirmSync = async (
    resolutions: Record<string, ConflictResolution>,
  ) => {
    if (!dirHandle || !syncPlan) return;
    setSyncing(true);
    try {
      const res = await applyFolderSyncPlan(
        dirHandle,
        project.project.name,
        syncPlan,
        resolutions,
      );
      setSyncDialogOpen(false);
      setFolderFeedback(
        `Sincronizado em "${dirHandle.name}": ${res.writtenCount} gravados` +
          (res.preservedCustomFileCount > 0
            ? `, ${res.preservedCustomFileCount} com blocos custom preservados`
            : "") +
          (res.skippedConflicts > 0 ? `, ${res.skippedConflicts} mantidos do disco.` : "."),
      );
    } catch (err) {
      setFolderFeedback(err instanceof Error ? err.message : "Erro ao gravar na pasta.");
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnectFolder = async () => {
    await clearDirectoryHandle();
    setDirHandle(null);
    setNeedsReconnect(false);
    setFolderFeedback(null);
  };

  const handleAutoSyncBeforeBridge = async (): Promise<boolean> => {
    if (!dirHandle) return true;
    const plan = await prepareFolderSyncPlan(dirHandle, project);
    const hasConflict = plan.entries.some((e) => e.status === "conflict");
    if (hasConflict) {
      setSyncPlan(plan);
      setSyncDialogOpen(true);
      return false;
    }
    await applyFolderSyncPlan(dirHandle, project.project.name, plan, {});
    return true;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exportar Projeto"
        description="Revise os arquivos Ciprix 2026.3.0 gerados e baixe o projeto pronto para WPILib."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {fsSupported && (
              <>
                {!dirHandle || needsReconnect ? (
                  <Button size="sm" variant="outline" onClick={() => void handleConnectFolder()}>
                    <FolderOpen className="h-4 w-4 text-[#60a5fa]" />
                    {dirHandle && needsReconnect
                      ? `Reconectar ${dirHandle.name}`
                      : "Conectar pasta local"}
                  </Button>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={() => void handleLoadFromFolder()}>
                      <FolderOpen className="h-4 w-4 text-slate-300" />
                      Abrir ({dirHandle.name})
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={errorCount > 0}
                      onClick={() => void handleOpenSyncDialog()}
                    >
                      <FolderSync className="h-4 w-4 text-emerald-300" />
                      Salvar na pasta
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Desconectar pasta local"
                      onClick={() => void handleDisconnectFolder()}
                    >
                      <Unlink className="h-4 w-4 text-slate-400" />
                    </Button>
                  </>
                )}
              </>
            )}

            <Button
              size="sm"
              variant={showBridge ? "secondary" : "outline"}
              disabled={errorCount > 0}
              onClick={() => setShowBridge((v) => !v)}
            >
              <Rocket className="h-4 w-4 text-cyan-300" />
              Enviar ao Robô (Bridge)
            </Button>

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
        }
      />

      {folderFeedback && (
        <div className="rounded-lg border border-[#3b6bb5]/60 bg-[#131c2e] px-4 py-2.5 text-xs text-slate-200">
          {folderFeedback}
        </div>
      )}

      {showBridge && (
        <BridgeDeployPanel
          project={project}
          hasLocalFolder={Boolean(dirHandle && !needsReconnect)}
          onSyncLocalBeforeRun={handleAutoSyncBeforeBridge}
        />
      )}

      {/* Metrics Strip Card */}
      <Card className="px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
          <div className="flex flex-wrap items-center gap-6">
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
          </div>

          <Badge variant={errorCount === 0 ? "success" : "destructive"}>
            {errorCount === 0 ? "Validação OK" : `${errorCount} erros`}
          </Badge>
        </div>
      </Card>

      {/* File Tree + CodeViewer Card */}
      <Card className="flex h-[600px] min-h-[600px] overflow-hidden">
        <div className="w-[320px] lg:w-[350px] shrink-0 overflow-auto border-r border-[#22304a] bg-[#0f1624] p-3">
          <TreeBranch node={tree} activePath={activePath} onSelect={setSelectedFilePath} />
        </div>
        <CodeViewer filePath={activePath} content={activeContent} className="flex-1 min-w-0" />
      </Card>

      <LocalSyncDialog
        open={syncDialogOpen}
        onOpenChange={setSyncDialogOpen}
        folderName={dirHandle?.name ?? "local"}
        plan={syncPlan}
        applying={syncing}
        onConfirm={handleConfirmSync}
      />
    </div>
  );
}
