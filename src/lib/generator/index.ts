import type { CiprixProject } from "../schema/ciprix-project";
import { generateCoreRobotFiles } from "./core/robot-files";
import { JAVA_FILE_HEADER } from "./java-utils";
import { generateSubsystemFiles } from "./registry";
import type { GeneratedFile } from "./subsystems/roller";

export function getRequiredVendordeps(project: CiprixProject): string[] {
  const deps = new Set<string>([
    "AdvantageKit.json",
    "Ciprix.json",
    "WPILibNewCommands.json",
  ]);

  for (const sub of project.subsystems) {
    if (sub.motor.vendor === "talonfx") deps.add("Phoenix6-26.3.0.json");
    if (sub.motor.vendor === "sparkmax") deps.add("REVLib.json");
    if (sub.motor.vendor === "talonsrx") deps.add("Phoenix5-5.36.0.json");
  }

  return Array.from(deps).sort();
}

export function generateProjectFiles(project: CiprixProject): GeneratedFile[] {
  const files: GeneratedFile[] = [...generateCoreRobotFiles(project)];

  for (const subsystem of project.subsystems) {
    files.push(...generateSubsystemFiles(subsystem, project.project.packageName));
  }

  return files.map((file) =>
    file.path.endsWith(".java") && !file.content.startsWith(JAVA_FILE_HEADER)
      ? { ...file, content: `${JAVA_FILE_HEADER}${file.content}` }
      : file,
  );
}
