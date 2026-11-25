import { describe, expect, it } from "vitest";
import { resolveShortcutAction } from "../keyboard-shortcuts";

const BASE_CTX = {
  activeRoute: "studio" as const,
  currentStep: "robot" as const,
  hasSelectedSubsystem: true,
  hasOpenModal: false,
  isEditable: false,
};

function keyEvent(
  key: string,
  mods: Partial<{
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
  }> = {},
) {
  return {
    key,
    ctrlKey: Boolean(mods.ctrlKey),
    metaKey: Boolean(mods.metaKey),
    shiftKey: Boolean(mods.shiftKey),
    altKey: Boolean(mods.altKey),
  };
}

describe("Studio keyboard shortcuts", () => {
  it("resolves undo, redo, save, export, and help shortcuts outside editable inputs", () => {
    expect(resolveShortcutAction(keyEvent("z", { ctrlKey: true }), BASE_CTX)).toBe("undo");
    expect(resolveShortcutAction(keyEvent("Z", { ctrlKey: true, shiftKey: true }), BASE_CTX)).toBe("redo");
    expect(resolveShortcutAction(keyEvent("y", { ctrlKey: true }), BASE_CTX)).toBe("redo");
    expect(resolveShortcutAction(keyEvent("s", { ctrlKey: true }), BASE_CTX)).toBe("saveJson");
    expect(resolveShortcutAction(keyEvent("e", { ctrlKey: true }), BASE_CTX)).toBe("exportZip");
    expect(resolveShortcutAction(keyEvent("?"), BASE_CTX)).toBe("shortcutsHelp");
  });

  it("triggers deleteSubsystem on Backspace or Delete only on robot step without open modal or input focus", () => {
    expect(resolveShortcutAction(keyEvent("Backspace"), BASE_CTX)).toBe("deleteSubsystem");
    expect(resolveShortcutAction(keyEvent("Delete"), BASE_CTX)).toBe("deleteSubsystem");

    expect(
      resolveShortcutAction(keyEvent("Backspace"), { ...BASE_CTX, isEditable: true }),
    ).toBeNull();
    expect(
      resolveShortcutAction(keyEvent("Backspace"), { ...BASE_CTX, hasOpenModal: true }),
    ).toBeNull();
    expect(
      resolveShortcutAction(keyEvent("Backspace"), { ...BASE_CTX, currentStep: "controls" }),
    ).toBeNull();
    expect(
      resolveShortcutAction(keyEvent("Backspace"), { ...BASE_CTX, hasSelectedSubsystem: false }),
    ).toBeNull();
  });

  it("keeps Ctrl+K and Ctrl+S active in inputs while preserving native Ctrl+Z inside inputs", () => {
    const editable = { ...BASE_CTX, isEditable: true };
    expect(resolveShortcutAction(keyEvent("k", { ctrlKey: true }), editable)).toBe("palette");
    expect(resolveShortcutAction(keyEvent("s", { ctrlKey: true }), editable)).toBe("saveJson");
    expect(resolveShortcutAction(keyEvent("z", { ctrlKey: true }), editable)).toBeNull();
  });

  it("supports arrow selection and Alt+arrow subsystem reordering", () => {
    expect(resolveShortcutAction(keyEvent("ArrowLeft"), BASE_CTX)).toBe("prevSubsystem");
    expect(resolveShortcutAction(keyEvent("ArrowRight"), BASE_CTX)).toBe("nextSubsystem");
    expect(resolveShortcutAction(keyEvent("ArrowLeft", { altKey: true }), BASE_CTX)).toBe(
      "moveSubsystemLeft",
    );
    expect(resolveShortcutAction(keyEvent("ArrowRight", { altKey: true }), BASE_CTX)).toBe(
      "moveSubsystemRight",
    );
    expect(resolveShortcutAction(keyEvent("1", { altKey: true }), BASE_CTX)).toBe(
      "tab:subsystems",
    );
  });
});
