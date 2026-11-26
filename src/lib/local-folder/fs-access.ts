import { generateProjectFiles, getRequiredVendordeps } from "../generator";
import type { CiprixProject } from "../schema/ciprix-project";
import {
  MANIFEST_PATH,
  buildNextManifest,
  parseManifest,
  planFolderSync,
  type ConflictResolution,
  type FirstStudioManifest,
  type PlannedSyncEntry,
} from "./manifest";

export type PermissionMode = "read" | "readwrite";
export type PermissionStateValue = "granted" | "denied" | "prompt";

export interface NativeWritableFileStream {
  write(data: string | Uint8Array | ArrayBuffer): Promise<void>;
  close(): Promise<void>;
}

export interface NativeFileHandle {
  kind: "file";
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<NativeWritableFileStream>;
}

export interface NativeDirectoryHandle {
  kind: "directory";
  name: string;
  getDirectoryHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<NativeDirectoryHandle>;
  getFileHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<NativeFileHandle>;
  queryPermission?: (descriptor: {
    mode?: PermissionMode;
  }) => Promise<PermissionStateValue>;
  requestPermission?: (descriptor: {
    mode?: PermissionMode;
  }) => Promise<PermissionStateValue>;
}

interface WindowWithFsAccess extends Window {
  showDirectoryPicker?: (options?: {
    mode?: PermissionMode;
  }) => Promise<NativeDirectoryHandle>;
}

const STATIC_TEXT_ASSETS = [
  "build.gradle",
  "gradlew",
  "gradlew.bat",
  "gradle/wrapper/gradle-wrapper.properties",
  "src/main/deploy/README.txt",
] as const;

export function isFileSystemAccessSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as WindowWithFsAccess).showDirectoryPicker === "function"
  );
}

export async function pickLocalDirectory(): Promise<NativeDirectoryHandle> {
  const win = window as WindowWithFsAccess;
  if (!win.showDirectoryPicker) {
    throw new Error("File System Access API not supported in this browser");
  }
  return win.showDirectoryPicker({ mode: "readwrite" });
}

export async function ensureReadWritePermission(
  handle: NativeDirectoryHandle,
  requestIfNeeded: boolean,
): Promise<boolean> {
  if (typeof handle.queryPermission === "function") {
    const current = await handle.queryPermission({ mode: "readwrite" });
    if (current === "granted") return true;
  }
  if (!requestIfNeeded) return false;
  if (typeof handle.requestPermission === "function") {
    const asked = await handle.requestPermission({ mode: "readwrite" });
    return asked === "granted";
  }
  return true;
}

function splitRelPath(relPath: string): { dirs: string[]; fileName: string } {
  const parts = relPath.split("/").filter(Boolean);
  if (parts.length === 0) {
    throw new Error(`Invalid relative file path: "${relPath}"`);
  }
  return {
    dirs: parts.slice(0, -1),
    fileName: parts[parts.length - 1],
  };
}

async function resolveFileHandle(
  root: NativeDirectoryHandle,
  relPath: string,
  create: boolean,
): Promise<NativeFileHandle | null> {
  const { dirs, fileName } = splitRelPath(relPath);
  let dir = root;
  for (const seg of dirs) {
    try {
      dir = await dir.getDirectoryHandle(seg, { create });
    } catch {
      return null;
    }
  }
  try {
    return await dir.getFileHandle(fileName, { create });
  } catch {
    return null;
  }
}

export async function readTextFile(
  root: NativeDirectoryHandle,
  relPath: string,
): Promise<string | null> {
  const handle = await resolveFileHandle(root, relPath, false);
  if (!handle) return null;
  const file = await handle.getFile();
  return file.text();
}

export async function fileExists(
  root: NativeDirectoryHandle,
  relPath: string,
): Promise<boolean> {
  const handle = await resolveFileHandle(root, relPath, false);
  return handle !== null;
}

export async function writeTextFile(
  root: NativeDirectoryHandle,
  relPath: string,
  content: string,
): Promise<void> {
  const handle = await resolveFileHandle(root, relPath, true);
  if (!handle) {
    throw new Error(`Could not open writable file handle for ${relPath}`);
  }
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}

export async function writeBinaryFile(
  root: NativeDirectoryHandle,
  relPath: string,
  data: ArrayBuffer,
): Promise<void> {
  const handle = await resolveFileHandle(root, relPath, true);
  if (!handle) {
    throw new Error(`Could not open writable binary file handle for ${relPath}`);
  }
  const writable = await handle.createWritable();
  await writable.write(data);
  await writable.close();
}

async function fetchSkeletonText(path: string): Promise<string> {
  const res = await fetch(`/skeleton/${path}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch /skeleton/${path} (${res.status})`);
  }
  return res.text();
}

async function fetchSkeletonBinary(path: string): Promise<ArrayBuffer> {
  const res = await fetch(`/skeleton/${path}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch /skeleton/${path} (${res.status})`);
  }
  return res.arrayBuffer();
}

export interface SkeletonAssetBundle {
  textFiles: { path: string; content: string }[];
  binaryFiles: { path: string; data: ArrayBuffer }[];
}

export async function collectSkeletonAssets(
  project: CiprixProject,
  includeBaseBuildFiles: boolean,
): Promise<SkeletonAssetBundle> {
  const vendordeps = getRequiredVendordeps(project);
  const textPaths: string[] = vendordeps.map((v) => `vendordeps/${v}`);
  if (includeBaseBuildFiles) {
    textPaths.push(...STATIC_TEXT_ASSETS);
  }

  const textFiles = await Promise.all(
    textPaths.map(async (path) => ({
      path,
      content: await fetchSkeletonText(path),
    })),
  );

  const binaryFiles: { path: string; data: ArrayBuffer }[] = [];
  if (includeBaseBuildFiles) {
    const jarData = await fetchSkeletonBinary("gradle/wrapper/gradle-wrapper.jar");
    binaryFiles.push({
      path: "gradle/wrapper/gradle-wrapper.jar",
      data: jarData,
    });
  }

  return { textFiles, binaryFiles };
}

export interface FolderSyncPlan {
  entries: PlannedSyncEntry[];
  prevManifest: FirstStudioManifest | null;
  binaryFiles: { path: string; data: ArrayBuffer }[];
  initializedSkeleton: boolean;
}

export async function prepareFolderSyncPlan(
  root: NativeDirectoryHandle,
  project: CiprixProject,
): Promise<FolderSyncPlan> {
  const [hasBuildGradle, rawManifest] = await Promise.all([
    fileExists(root, "build.gradle"),
    readTextFile(root, MANIFEST_PATH),
  ]);

  const prevManifest = parseManifest(rawManifest);
  const initializedSkeleton = !hasBuildGradle;
  const skeletonAssets = await collectSkeletonAssets(project, initializedSkeleton);

  const desiredFiles = [
    ...generateProjectFiles(project),
    ...skeletonAssets.textFiles,
  ];

  const diskEntries = await Promise.all(
    desiredFiles.map(async (file) => [
      file.path,
      (await readTextFile(root, file.path)) ?? undefined,
    ] as const),
  );

  const diskMap: Record<string, string | undefined> = Object.fromEntries(diskEntries);
  const entries = await planFolderSync(desiredFiles, diskMap, prevManifest);

  return {
    entries,
    prevManifest,
    binaryFiles: skeletonAssets.binaryFiles,
    initializedSkeleton,
  };
}

export interface ApplyFolderSyncResult {
  writtenCount: number;
  skippedConflicts: number;
  preservedCustomFileCount: number;
}

export async function applyFolderSyncPlan(
  root: NativeDirectoryHandle,
  projectName: string,
  plan: FolderSyncPlan,
  resolutions: Record<string, ConflictResolution>,
): Promise<ApplyFolderSyncResult> {
  let writtenCount = 0;
  let skippedConflicts = 0;
  let preservedCustomFileCount = 0;

  for (const bin of plan.binaryFiles) {
    if (!(await fileExists(root, bin.path))) {
      await writeBinaryFile(root, bin.path, bin.data);
      writtenCount++;
    }
  }

  for (const entry of plan.entries) {
    if (entry.preservedCustomBlocks.length > 0) {
      preservedCustomFileCount++;
    }
    if (entry.status === "unchanged") continue;
    if (entry.status === "conflict") {
      const choice = resolutions[entry.path] ?? "keep_disk";
      if (choice === "keep_disk") {
        skippedConflicts++;
        continue;
      }
    }
    await writeTextFile(root, entry.path, entry.nextContent);
    writtenCount++;
  }

  const nextManifest = buildNextManifest(
    projectName,
    plan.prevManifest,
    plan.entries,
    resolutions,
  );
  await writeTextFile(root, MANIFEST_PATH, JSON.stringify(nextManifest, null, 2) + "\n");

  return {
    writtenCount,
    skippedConflicts,
    preservedCustomFileCount,
  };
}
