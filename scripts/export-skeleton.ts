import fs from "node:fs/promises";
import path from "node:path";
import { generateProjectFiles, getRequiredVendordeps } from "../src/lib/generator";
import {
  createBlankPreset,
  createCompetitionPreset,
  createSkeletonPreset,
} from "../src/lib/presets/skeleton";
import type { CiprixProject } from "../src/lib/schema/ciprix-project";

const STATIC_FILES = [
  "build.gradle",
  "gradlew",
  "gradlew.bat",
  "gradle/wrapper/gradle-wrapper.jar",
  "gradle/wrapper/gradle-wrapper.properties",
  "src/main/deploy/README.txt",
];

type PresetName = "skeleton" | "competition" | "blank";

function parseArgs(argv: string[]): { outDir: string; presetName: PresetName } {
  let outDirArg: string | undefined;
  let presetName: PresetName = "skeleton";

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--preset" && argv[i + 1]) {
      const val = argv[i + 1] as PresetName;
      if (val === "skeleton" || val === "competition" || val === "blank") {
        presetName = val;
      } else {
        throw new Error(`Unknown preset "${val}". Expected skeleton | competition | blank.`);
      }
      i++;
    } else if (!arg.startsWith("--") && !outDirArg) {
      outDirArg = arg;
    }
  }

  return {
    outDir: path.resolve(outDirArg ?? `.tmp/generated-${presetName}`),
    presetName,
  };
}

function buildPreset(name: PresetName): CiprixProject {
  if (name === "competition") return createCompetitionPreset();
  if (name === "blank") return createBlankPreset();
  return createSkeletonPreset();
}

async function writeFileEnsuringDir(destPath: string, content: string | Buffer) {
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.writeFile(destPath, content);
}

async function main() {
  const { outDir, presetName } = parseArgs(process.argv.slice(2));
  const skeletonDir = path.resolve(process.cwd(), "public/skeleton");
  const preset = buildPreset(presetName);

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

  console.log(`Exported Ciprix "${presetName}" project to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
