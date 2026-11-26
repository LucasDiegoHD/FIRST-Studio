import type { TranslationKey } from "./i18n";
import type { StudioTab } from "./validator";

export type ShortcutAction =
  | "palette"
  | "shortcutsHelp"
  | "undo"
  | "redo"
  | "saveJson"
  | "exportZip"
  | "deleteSubsystem"
  | "duplicateSubsystem"
  | "prevSubsystem"
  | "nextSubsystem"
  | "moveSubsystemLeft"
  | "moveSubsystemRight"
  | "tab:subsystems"
  | "tab:fsm"
  | "tab:controls"
  | "tab:code";

export interface ShortcutKeyInput {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

export interface ShortcutContext {
  activeRoute: "studio" | "credits";
  currentStep: "robot" | "states" | "controls" | "export";
  hasSelectedSubsystem: boolean;
  hasOpenModal: boolean;
  isEditable: boolean;
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object") return false;
  const el = target as {
    tagName?: string;
    isContentEditable?: boolean;
    getAttribute?: (name: string) => string | null;
  };
  const tag = el.tagName?.toUpperCase();
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  if (typeof el.getAttribute === "function" && el.getAttribute("role") === "textbox") {
    return true;
  }
  return false;
}

export function resolveShortcutAction(
  input: ShortcutKeyInput,
  ctx: ShortcutContext,
): ShortcutAction | null {
  const mod = input.ctrlKey || input.metaKey;
  const key = input.key.toLowerCase();

  if (mod && !input.altKey && key === "k") return "palette";
  if (mod && !input.altKey && key === "s") return "saveJson";

  if (ctx.hasOpenModal) return null;

  if (input.altKey && !mod) {
    if (key === "1") return "tab:subsystems";
    if (key === "2") return "tab:fsm";
    if (key === "3") return "tab:controls";
    if (key === "4") return "tab:code";
  }

  if (ctx.isEditable) return null;

  if (mod && !input.altKey) {
    if (key === "z") return input.shiftKey ? "redo" : "undo";
    if (key === "y" && !input.shiftKey) return "redo";
    if (key === "e" && !input.shiftKey) return "exportZip";
    if (
      key === "d" &&
      !input.shiftKey &&
      ctx.activeRoute === "studio" &&
      ctx.currentStep === "robot" &&
      ctx.hasSelectedSubsystem
    ) {
      return "duplicateSubsystem";
    }
    return null;
  }

  if (!mod && !input.altKey && input.key === "?") {
    return "shortcutsHelp";
  }

  if (ctx.activeRoute !== "studio" || !ctx.hasSelectedSubsystem) {
    return null;
  }

  if (!mod && !input.altKey && !input.shiftKey) {
    if ((input.key === "Backspace" || input.key === "Delete") && ctx.currentStep === "robot") {
      return "deleteSubsystem";
    }
    if (
      input.key === "ArrowLeft" &&
      (ctx.currentStep === "robot" || ctx.currentStep === "states")
    ) {
      return "prevSubsystem";
    }
    if (
      input.key === "ArrowRight" &&
      (ctx.currentStep === "robot" || ctx.currentStep === "states")
    ) {
      return "nextSubsystem";
    }
  }

  if (input.altKey && !mod && ctx.currentStep === "robot") {
    if (input.key === "ArrowLeft") return "moveSubsystemLeft";
    if (input.key === "ArrowRight") return "moveSubsystemRight";
  }

  return null;
}

export function actionToTab(action: ShortcutAction): StudioTab | null {
  if (action === "tab:subsystems") return "subsystems";
  if (action === "tab:fsm") return "fsm";
  if (action === "tab:controls") return "controls";
  if (action === "tab:code") return "code";
  return null;
}

export const SHORTCUT_GUIDE: { keys: string[]; labelKey: TranslationKey }[] = [
  { keys: ["Ctrl", "Z"], labelKey: "shortcuts.undo" },
  { keys: ["Ctrl", "Y"], labelKey: "shortcuts.redo" },
  { keys: ["Backspace"], labelKey: "shortcuts.delete_sub" },
  { keys: ["Ctrl", "D"], labelKey: "shortcuts.duplicate_sub" },
  { keys: ["←", "→"], labelKey: "shortcuts.switch_sub" },
  { keys: ["Alt", "← / →"], labelKey: "shortcuts.reorder_sub" },
  { keys: ["Alt", "1–4"], labelKey: "shortcuts.switch_tabs" },
  { keys: ["Ctrl", "K"], labelKey: "shortcuts.palette" },
  { keys: ["Ctrl", "S"], labelKey: "shortcuts.save" },
  { keys: ["Ctrl", "E"], labelKey: "shortcuts.export" },
  { keys: ["?"], labelKey: "shortcuts.help" },
];
