"use client";

import React, { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, ChevronDown, FilePlus2, FileCheck2, RefreshCw, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  ConflictResolution,
  FolderSyncPlan,
  PlannedSyncEntry,
} from "@/lib/local-folder";

interface LocalSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderName: string;
  plan: FolderSyncPlan | null;
  applying: boolean;
  onConfirm: (resolutions: Record<string, ConflictResolution>) => Promise<void>;
}

export function LocalSyncDialog({
  open,
  onOpenChange,
  folderName,
  plan,
  applying,
  onConfirm,
}: LocalSyncDialogProps) {
  const [resolutions, setResolutions] = useState<Record<string, ConflictResolution>>({});
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!plan) return;
    const defaults: Record<string, ConflictResolution> = {};
    const expanded: Record<string, boolean> = {};
    for (const entry of plan.entries) {
      if (entry.status === "conflict") {
        defaults[entry.path] = "keep_disk";
        expanded[entry.path] = true;
      }
    }
    setResolutions(defaults);
    setExpandedPaths(expanded);
  }, [plan]);

  if (!plan) return null;

  const creates = plan.entries.filter((e) => e.status === "create");
  const updates = plan.entries.filter((e) => e.status === "update");
  const conflicts = plan.entries.filter((e) => e.status === "conflict");
  const unchanged = plan.entries.filter((e) => e.status === "unchanged");
  const visibleEntries: PlannedSyncEntry[] = [...conflicts, ...updates, ...creates];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[min(94vw,46rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-[#2c3f61] bg-[#0f1624] text-slate-100 shadow-2xl">
          <div className="flex items-start justify-between gap-3 border-b border-[#22304a] px-5 py-4">
            <div>
              <Dialog.Title className="font-headline text-base font-semibold text-white">
                Sincronizar com pasta local: {folderName}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-slate-400">
                Revise os diffs antes de gravar. Blocos{" "}
                <code className="font-mono text-[#93c5fd]">FIRST-STUDIO:BEGIN custom ...</code>{" "}
                do disco são preservados automaticamente.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Fechar"
                className="rounded p-1 text-slate-400 hover:bg-[#19253d] hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-[#22304a] bg-[#0b0f17] px-5 py-2.5 text-xs font-mono">
            {plan.initializedSkeleton && (
              <Badge variant="default" className="gap-1">
                <Sparkles className="h-3 w-3" />
                Projeto WPILib completo
              </Badge>
            )}
            <Badge variant="success">{creates.length} novos</Badge>
            <Badge variant="default">{updates.length} atualizados</Badge>
            {conflicts.length > 0 && (
              <Badge variant="destructive">{conflicts.length} conflitos</Badge>
            )}
            <Badge variant="outline">{unchanged.length} sem alterações</Badge>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5">
            {visibleEntries.length === 0 ? (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-[#22304a] bg-[#0b0f17] py-10 text-xs text-emerald-300">
                <FileCheck2 className="h-4 w-4" />
                Todos os arquivos da pasta já estão idênticos ao projeto gerado.
              </div>
            ) : (
              visibleEntries.map((entry) => {
                const isConflict = entry.status === "conflict";
                const isOpen = Boolean(expandedPaths[entry.path]);
                const resolution = resolutions[entry.path] ?? "keep_disk";

                return (
                  <div
                    key={entry.path}
                    className={`rounded-lg border ${
                      isConflict
                        ? "border-amber-500/60 bg-amber-950/15"
                        : "border-[#22304a] bg-[#0b0f17]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedPaths((prev) => ({
                            ...prev,
                            [entry.path]: !isOpen,
                          }))
                        }
                        className="flex min-w-0 flex-1 items-center gap-2 text-left cursor-pointer"
                      >
                        <ChevronDown
                          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                        {isConflict ? (
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                        ) : entry.status === "create" ? (
                          <FilePlus2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                        )}
                        <span className="truncate font-mono text-xs text-white">
                          {entry.path}
                        </span>
                        {entry.preservedCustomBlocks.length > 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{entry.preservedCustomBlocks.length} custom
                          </Badge>
                        )}
                      </button>

                      <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                        {entry.diff && (
                          <span className="text-slate-400">
                            <span className="text-emerald-400">+{entry.diff.added}</span>{" "}
                            <span className="text-rose-400">-{entry.diff.removed}</span>
                          </span>
                        )}
                        {isConflict && (
                          <div className="flex rounded-md border border-[#2c3f61] bg-[#0f1624] p-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                setResolutions((prev) => ({
                                  ...prev,
                                  [entry.path]: "keep_disk",
                                }))
                              }
                              className={`rounded px-2 py-0.5 text-[11px] cursor-pointer ${
                                resolution === "keep_disk"
                                  ? "bg-amber-600/80 text-white"
                                  : "text-slate-300 hover:text-white"
                              }`}
                            >
                              Manter disco
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setResolutions((prev) => ({
                                  ...prev,
                                  [entry.path]: "overwrite",
                                }))
                              }
                              className={`rounded px-2 py-0.5 text-[11px] cursor-pointer ${
                                resolution === "overwrite"
                                  ? "bg-rose-600/80 text-white"
                                  : "text-slate-300 hover:text-white"
                              }`}
                            >
                              Sobrescrever
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {isConflict && (
                      <p className="px-9 pb-1 text-[11px] text-amber-200/90">
                        {entry.reason === "modified_outside_studio"
                          ? "Editado manualmente fora dos blocos custom no VS Code."
                          : "Arquivo já existia na pasta sem registro anterior no manifesto."}
                      </p>
                    )}

                    {isOpen && entry.diff && entry.diff.preview.length > 0 && (
                      <pre className="mx-3 mb-3 max-h-48 overflow-auto rounded border border-[#22304a] bg-[#070b12] p-2.5 font-mono text-[11px] leading-relaxed">
                        {entry.diff.preview.map((line, i) => (
                          <div
                            key={`${entry.path}-d-${i}`}
                            className={
                              line.startsWith("+ ")
                                ? "text-emerald-300"
                                : line.startsWith("- ")
                                  ? "text-rose-300"
                                  : "text-slate-400"
                            }
                          >
                            {line}
                          </div>
                        ))}
                      </pre>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[#22304a] px-5 py-3">
            <Button
              variant="outline"
              size="sm"
              disabled={applying}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={applying || (visibleEntries.length === 0 && !plan.initializedSkeleton)}
              onClick={() => void onConfirm(resolutions)}
            >
              {applying ? "Gravando..." : "Gravar na pasta"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
