import { mergeCustomBlocks, stripCustomBlocks } from "./custom-blocks";

export const MANIFEST_PATH = ".firststudio/manifest.json";

export interface ManifestFileRecord {
  sha256: string;
  strippedSha256: string;
  updatedAt: string;
}

export interface FirstStudioManifest {
  schemaVersion: 1;
  projectName: string;
  generatedAt: string;
  files: Record<string, ManifestFileRecord>;
}

export interface LineDiffSummary {
  added: number;
  removed: number;
  preview: string[];
}

export type SyncEntryStatus = "create" | "unchanged" | "update" | "conflict";
export type ConflictReason = "modified_outside_studio" | "untracked_existing";
export type ConflictResolution = "keep_disk" | "overwrite";

export interface PlannedSyncEntry {
  path: string;
  status: SyncEntryStatus;
  reason?: ConflictReason;
  nextContent: string;
  diskContent?: string;
  nextSha256: string;
  nextStrippedSha256: string;
  preservedCustomBlocks: string[];
  diff?: LineDiffSummary;
}

export async function sha256Hex(content: string | Uint8Array): Promise<string> {
  const bytes =
    typeof content === "string"
      ? new TextEncoder().encode(content)
      : content;
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", copy.buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function parseManifest(raw: string | null): FirstStudioManifest | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<FirstStudioManifest>;
    if (
      parsed &&
      parsed.schemaVersion === 1 &&
      typeof parsed.projectName === "string" &&
      parsed.files &&
      typeof parsed.files === "object"
    ) {
      return {
        schemaVersion: 1,
        projectName: parsed.projectName,
        generatedAt: typeof parsed.generatedAt === "string" ? parsed.generatedAt : "",
        files: parsed.files,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function computeSimpleLineDiff(
  before: string,
  after: string,
  maxPreviewLines = 24,
): LineDiffSummary {
  const beforeLines = before.split(/\r?\n/);
  const afterLines = after.split(/\r?\n/);

  const beforeCounts = new Map<string, number>();
  for (const line of beforeLines) {
    beforeCounts.set(line, (beforeCounts.get(line) ?? 0) + 1);
  }
  const afterCounts = new Map<string, number>();
  for (const line of afterLines) {
    afterCounts.set(line, (afterCounts.get(line) ?? 0) + 1);
  }

  let removed = 0;
  let added = 0;
  const preview: string[] = [];

  for (const line of beforeLines) {
    const remainingInAfter = afterCounts.get(line) ?? 0;
    if (remainingInAfter > 0) {
      afterCounts.set(line, remainingInAfter - 1);
    } else {
      removed++;
      if (preview.length < maxPreviewLines) {
        preview.push(`- ${line}`);
      }
    }
  }

  for (const line of afterLines) {
    const remainingInBefore = beforeCounts.get(line) ?? 0;
    if (remainingInBefore > 0) {
      beforeCounts.set(line, remainingInBefore - 1);
    } else {
      added++;
      if (preview.length < maxPreviewLines) {
        preview.push(`+ ${line}`);
      }
    }
  }

  return { added, removed, preview };
}

export async function planFolderSync(
  generatedFiles: { path: string; content: string }[],
  diskFiles: Record<string, string | undefined>,
  manifest: FirstStudioManifest | null,
): Promise<PlannedSyncEntry[]> {
  const entries: PlannedSyncEntry[] = [];

  for (const gen of generatedFiles) {
    const diskContent = diskFiles[gen.path];
    if (diskContent === undefined) {
      const [nextSha256, nextStrippedSha256] = await Promise.all([
        sha256Hex(gen.content),
        sha256Hex(stripCustomBlocks(gen.content)),
      ]);
      entries.push({
        path: gen.path,
        status: "create",
        nextContent: gen.content,
        nextSha256,
        nextStrippedSha256,
        preservedCustomBlocks: [],
        diff: computeSimpleLineDiff("", gen.content),
      });
      continue;
    }

    const { merged, preservedNames } = mergeCustomBlocks(
      gen.content,
      diskContent,
      gen.path,
    );

    const [diskSha256, diskStrippedSha256, nextSha256, nextStrippedSha256] =
      await Promise.all([
        sha256Hex(diskContent),
        sha256Hex(stripCustomBlocks(diskContent)),
        sha256Hex(merged),
        sha256Hex(stripCustomBlocks(merged)),
      ]);

    if (diskSha256 === nextSha256) {
      entries.push({
        path: gen.path,
        status: "unchanged",
        nextContent: merged,
        diskContent,
        nextSha256,
        nextStrippedSha256,
        preservedCustomBlocks: preservedNames,
      });
      continue;
    }

    const record = manifest?.files[gen.path];
    if (record) {
      const cleanOutsideCustom =
        diskSha256 === record.sha256 ||
        diskStrippedSha256 === record.strippedSha256;

      if (cleanOutsideCustom) {
        entries.push({
          path: gen.path,
          status: "update",
          nextContent: merged,
          diskContent,
          nextSha256,
          nextStrippedSha256,
          preservedCustomBlocks: preservedNames,
          diff: computeSimpleLineDiff(diskContent, merged),
        });
      } else {
        entries.push({
          path: gen.path,
          status: "conflict",
          reason: "modified_outside_studio",
          nextContent: merged,
          diskContent,
          nextSha256,
          nextStrippedSha256,
          preservedCustomBlocks: preservedNames,
          diff: computeSimpleLineDiff(diskContent, merged),
        });
      }
      continue;
    }

    // No manifest record yet for an already existing file on disk
    entries.push({
      path: gen.path,
      status: "conflict",
      reason: "untracked_existing",
      nextContent: merged,
      diskContent,
      nextSha256,
      nextStrippedSha256,
      preservedCustomBlocks: preservedNames,
      diff: computeSimpleLineDiff(diskContent, merged),
    });
  }

  return entries;
}

export function buildNextManifest(
  projectName: string,
  prevManifest: FirstStudioManifest | null,
  entries: PlannedSyncEntry[],
  resolutions: Record<string, ConflictResolution>,
  nowIso = new Date().toISOString(),
): FirstStudioManifest {
  const files: Record<string, ManifestFileRecord> = {
    ...(prevManifest?.files ?? {}),
  };

  for (const entry of entries) {
    if (entry.status === "unchanged") {
      if (!files[entry.path]) {
        files[entry.path] = {
          sha256: entry.nextSha256,
          strippedSha256: entry.nextStrippedSha256,
          updatedAt: nowIso,
        };
      }
      continue;
    }

    if (entry.status === "conflict") {
      const choice = resolutions[entry.path] ?? "keep_disk";
      if (choice === "keep_disk") {
        continue;
      }
    }

    files[entry.path] = {
      sha256: entry.nextSha256,
      strippedSha256: entry.nextStrippedSha256,
      updatedAt: nowIso,
    };
  }

  return {
    schemaVersion: 1,
    projectName,
    generatedAt: nowIso,
    files,
  };
}
