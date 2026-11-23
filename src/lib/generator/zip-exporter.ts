import JSZip from "jszip";
import type { CiprixProject } from "../schema/ciprix-project";
import { generateProjectFiles, getRequiredVendordeps } from "./index";

const STATIC_TEXT_FILES = [
  "build.gradle",
  "gradlew",
  "gradlew.bat",
  "gradle/wrapper/gradle-wrapper.properties",
  "src/main/deploy/README.txt",
] as const;

async function fetchStaticAsset(path: string, binary = false): Promise<string | ArrayBuffer> {
  const response = await fetch(`/skeleton/${path}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch template asset: /skeleton/${path} (${response.status})`);
  }
  return binary ? response.arrayBuffer() : response.text();
}

export async function exportProjectZip(project: CiprixProject): Promise<Blob> {
  const zip = new JSZip();

  const textAssets = await Promise.all(
    STATIC_TEXT_FILES.map(async (path) => ({
      path,
      content: await fetchStaticAsset(path, false),
    })),
  );

  for (const asset of textAssets) {
    zip.file(asset.path, asset.content, {
      unixPermissions: asset.path === "gradlew" ? 0o755 : 0o644,
    });
  }

  const jarBuffer = await fetchStaticAsset("gradle/wrapper/gradle-wrapper.jar", true);
  zip.file("gradle/wrapper/gradle-wrapper.jar", jarBuffer);

  const vendordeps = getRequiredVendordeps(project);
  const vendordepAssets = await Promise.all(
    vendordeps.map(async (file) => ({
      path: `vendordeps/${file}`,
      content: await fetchStaticAsset(`vendordeps/${file}`, false),
    })),
  );

  for (const v of vendordepAssets) {
    zip.file(v.path, v.content);
  }

  for (const generated of generateProjectFiles(project)) {
    zip.file(generated.path, generated.content);
  }

  return zip.generateAsync({ type: "blob", platform: "UNIX" });
}
