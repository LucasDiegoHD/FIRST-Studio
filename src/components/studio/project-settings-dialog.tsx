"use client";

import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useProject } from "@/context/project-context";
import { ProjectTab } from "./project-tab";

export function ProjectSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useProject();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#0b0f17]/80 backdrop-blur-xs" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[92vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-[#2c3f61] bg-[#0f1624] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#22304a] px-5 py-3.5">
            <Dialog.Title className="text-[15px] font-semibold text-white">
              {t("tabs.project")}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded p-1.5 text-slate-400 hover:bg-[#19253d] hover:text-white cursor-pointer"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ProjectTab />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
