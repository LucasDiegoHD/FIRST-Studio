import type { CiprixProject } from "../schema/ciprix-project";
import { generateAutonomousFiles } from "./autonomous";
import { generateCoreRobotFiles } from "./core/robot-files";
import { generateDrivetrainFiles } from "./drivetrain";
import { JAVA_FILE_HEADER } from "./java-utils";
import { generateLedArbiterFile } from "./leds";
import { generateSubsystemFiles } from "./registry";
import { generateRumbleArbiterFile } from "./rumble";
import type { GeneratedFile } from "./subsystems/roller";
import { generateFieldZonesFile } from "./zones";

export function projectUsesLedArbiter(project: CiprixProject): boolean {
  if (project.subsystems.some((s) => s.type === "leds")) return true;
  if (
    project.subsystems.some((s) =>
      s.fsm?.states.some((st) => st.actions.some((a) => a.kind === "leds")),
    )
  ) {
    return true;
  }
  return Object.values(project.superstructure.stateEffects ?? {}).some((list) =>
    list.some((e) => e.kind === "leds"),
  );
}

export function projectUsesRumbleArbiter(project: CiprixProject): boolean {
  if (
    project.subsystems.some((s) =>
      s.fsm?.states.some((st) => st.actions.some((a) => a.kind === "rumble")),
    )
  ) {
    return true;
  }
  return Object.values(project.superstructure.stateEffects ?? {}).some((list) =>
    list.some((e) => e.kind === "rumble"),
  );
}

export function getRequiredVendordeps(project: CiprixProject): string[] {
  const deps = new Set<string>([
    "AdvantageKit.json",
    "Ciprix.json",
    "WPILibNewCommands.json",
  ]);

  for (const sub of project.subsystems) {
    if (sub.motor?.vendor === "talonfx") deps.add("Phoenix6-26.3.0.json");
    if (sub.motor?.vendor === "sparkmax") deps.add("REVLib.json");
    if (sub.motor?.vendor === "talonsrx") deps.add("Phoenix5-5.36.0.json");
    if (sub.leds?.driver === "candle") deps.add("Phoenix6-26.3.0.json");
    for (const sensor of sub.sensors ?? []) {
      if (sensor.type === "canrange") deps.add("Phoenix6-26.3.0.json");
      if (sensor.type === "lasercan") deps.add("libgrapplefrc2026.json");
    }
  }

  const dt = project.drivetrain;
  if (dt?.enabled) {
    if (dt.motorVendor === "talonfx" || dt.type === "ctre_swerve" || dt.gyro.type === "pigeon2") {
      deps.add("Phoenix6-26.3.0.json");
    }
    if (dt.motorVendor === "sparkmax") deps.add("REVLib.json");
    if (dt.motorVendor === "talonsrx") deps.add("Phoenix5-5.36.0.json");
    if (dt.gyro.type === "navx") deps.add("Studica-2026.0.0.json");
    if (dt.type === "yagsl") {
      deps.add("yagsl-2026.4.1.json");
      deps.add("ReduxLib.json");
      deps.add("REVLib.json");
      deps.add("ThriftyLib.json");
    }
    if (project.autonomous?.enabled || (dt.teleopPathfinding?.length ?? 0) > 0) {
      deps.add("PathplannerLib.json");
    }
  }

  return Array.from(deps).sort();
}

export function generateProjectFiles(project: CiprixProject): GeneratedFile[] {
  const files: GeneratedFile[] = [...generateCoreRobotFiles(project)];
  const zones = project.zones ?? [];
  const hasZones = zones.length > 0;

  if (projectUsesLedArbiter(project)) {
    files.push(generateLedArbiterFile(project.project.packageName));
  }
  if (projectUsesRumbleArbiter(project)) {
    files.push(generateRumbleArbiterFile(project.project.packageName));
  }
  if (hasZones) {
    files.push(generateFieldZonesFile(zones, project.project.packageName, project.drivetrain));
  }

  files.push(...generateAutonomousFiles(project));

  files.push(
    ...generateDrivetrainFiles(
      project.drivetrain,
      project.project.packageName,
      hasZones && Boolean(project.drivetrain?.enabled),
      project.autonomous,
    ),
  );

  for (const subsystem of project.subsystems) {
    files.push(...generateSubsystemFiles(subsystem, project.project.packageName));
  }

  return files.map((file) =>
    file.path.endsWith(".java") && !file.content.startsWith(JAVA_FILE_HEADER)
      ? { ...file, content: `${JAVA_FILE_HEADER}${file.content}` }
      : file,
  );
}
