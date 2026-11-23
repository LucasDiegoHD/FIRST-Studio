import fs from "node:fs/promises";
import path from "node:path";
import { generateProjectFiles, getRequiredVendordeps } from "../src/lib/generator";
import { createSkeletonPreset } from "../src/lib/presets/skeleton";

const STATIC_FILES = [
  "build.gradle",
  "gradlew",
  "gradlew.bat",
  "gradle/wrapper/gradle-wrapper.jar",
  "gradle/wrapper/gradle-wrapper.properties",
  "src/main/deploy/README.txt",
];

async function writeFileEnsuringDir(destPath: string, content: string | Buffer) {
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.writeFile(destPath, content);
}

async function main() {
  const outDir = path.resolve(process.argv[2] ?? ".tmp/generated-skeleton");
  const skeletonDir = path.resolve(process.cwd(), "public/skeleton");
  const preset = createSkeletonPreset();

  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });

  for (const relPath of STATIC_FILES) {
    const src = path.join(skeletonDir, relPath);
    const dest = path.join(outDir, relPath);
    const data = await fs.readFile(src);
    await writeFileEnsuringDir(dest, data);
  }

  await fs.chmod(path.join(outDir, "gradlew"), 0o755);

  for (const dep of getRequiredVendordeps(preset)) {
    const src = path.join(skeletonDir, "vendordeps", dep);
    const dest = path.join(outDir, "vendordeps", dep);
    const data = await fs.readFile(src);
    await writeFileEnsuringDir(dest, data);
  }

  for (const generated of generateProjectFiles(preset)) {
    await writeFileEnsuringDir(path.join(outDir, generated.path), generated.content);
  }

  console.log(`Exported Ciprix skeleton project to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
