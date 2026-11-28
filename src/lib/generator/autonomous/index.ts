import type {
  AutoNamedCommand,
  AutonomousConfig,
  AutoRoutine,
  AutoStep,
  CiprixProject,
  PathPlannerPathDoc,
} from "../../schema/ciprix-project";
import type { GeneratedFile } from "../subsystems/roller";

/** Combines explicit `auto.namedCommands` with Event Markers bound directly to a `RobotRequest`. */
export function resolveEffectiveNamedCommands(auto: AutonomousConfig): AutoNamedCommand[] {
  const out: AutoNamedCommand[] = [...auto.namedCommands];
  const seen = new Set(auto.namedCommands.map((c) => c.name.trim()).filter(Boolean));
  for (const p of auto.paths ?? []) {
    for (const em of p.eventMarkers) {
      const cmd = em.commandName.trim();
      const req = em.request?.trim();
      if (cmd && req && !seen.has(cmd)) {
        seen.add(cmd);
        out.push({
          id: `em-nc-${em.id}`,
          name: cmd,
          request: req,
          waitForGoal: Boolean(em.waitForGoal),
          timeoutSec: em.timeoutSec ?? 2.5,
        });
      }
    }
  }
  return out;
}

function escapeJavaString(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, "\\n");
}

function formatDouble(v: number): string {
  return Number.isInteger(v) ? `${v}.0` : String(v);
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

function stepToPathPlannerJson(step: AutoStep) {
  if (step.kind === "path") {
    return {
      type: "path",
      data: { pathName: step.pathName },
    };
  }
  if (step.kind === "named") {
    return {
      type: "named",
      data: { name: step.commandName },
    };
  }
  return {
    type: "wait",
    data: { waitTime: step.seconds },
  };
}

export function generatePathPlannerAutoJsonFile(
  routine: AutoRoutine,
): GeneratedFile | null {
  if (routine.source !== "pathplanner" || !routine.steps || routine.steps.length === 0) {
    return null;
  }
  const cleanFile = routine.fileName.trim().replace(/\.(auto|traj)$/i, "");
  if (!cleanFile) return null;

  const doc = {
    version: "2025.0",
    command: {
      type: "sequential",
      data: {
        commands: routine.steps.map(stepToPathPlannerJson),
      },
    },
    resetOdom: true,
    folder: null,
    choreoAuto: false,
  };

  return {
    path: `src/main/deploy/pathplanner/autos/${cleanFile}.auto`,
    content: JSON.stringify(doc, null, 2) + "\n",
  };
}

export function generatePathPlannerPathJsonFile(
  pathDoc: PathPlannerPathDoc,
  project: CiprixProject,
): GeneratedFile | null {
  const cleanName = pathDoc.name.trim().replace(/\.(path|auto|traj)$/i, "");
  if (!cleanName || pathDoc.waypoints.length < 2) return null;

  const dt = project.drivetrain;
  const maxAngVelDeg = dt
    ? round3((dt.maxAngularSpeedRadPerSec * 180) / Math.PI)
    : 540.0;
  const maxAngAccelDeg = dt
    ? round3((dt.maxAngularAccelRadPerSec2 * 180) / Math.PI)
    : 720.0;

  const doc = {
    version: "2025.0",
    waypoints: pathDoc.waypoints.map((wp) => ({
      anchor: { x: round3(wp.anchor.x), y: round3(wp.anchor.y) },
      prevControl: wp.prevControl
        ? { x: round3(wp.prevControl.x), y: round3(wp.prevControl.y) }
        : null,
      nextControl: wp.nextControl
        ? { x: round3(wp.nextControl.x), y: round3(wp.nextControl.y) }
        : null,
      isLocked: wp.isLocked ?? false,
      linkedName: wp.linkedName ?? null,
    })),
    rotationTargets: pathDoc.rotationTargets.map((rt) => ({
      waypointRelativePos: round3(rt.waypointRelativePos),
      rotation: round3(rt.rotationDegrees),
    })),
    constraintZones: [],
    pointTowardsZones: (pathDoc.pointTowardsZones ?? []).map((z) => ({
      fieldPosition: {
        x: round3(z.fieldPosition.x),
        y: round3(z.fieldPosition.y),
      },
      rotationOffset: round3(z.rotationOffsetDegrees ?? 0),
      minWaypointRelativePos: round3(Math.min(z.minWaypointRelativePos, z.maxWaypointRelativePos)),
      maxWaypointRelativePos: round3(Math.max(z.minWaypointRelativePos, z.maxWaypointRelativePos)),
      name: z.name,
    })),
    eventMarkers: pathDoc.eventMarkers.map((em) => ({
      name: em.name,
      waypointRelativePos: round3(em.waypointRelativePos),
      endWaypointRelativePos:
        typeof em.endWaypointRelativePos === "number"
          ? round3(em.endWaypointRelativePos)
          : null,
      command: {
        type: "named",
        data: { name: em.commandName },
      },
    })),
    globalConstraints: {
      maxVelocity: round3(pathDoc.globalConstraints?.maxVelocity ?? dt?.maxSpeedMps ?? 3.5),
      maxAcceleration: round3(
        pathDoc.globalConstraints?.maxAcceleration ?? dt?.maxLinearAccelMps2 ?? 3.0,
      ),
      maxAngularVelocity: round3(
        pathDoc.globalConstraints?.maxAngularVelocity ?? maxAngVelDeg,
      ),
      maxAngularAcceleration: round3(
        pathDoc.globalConstraints?.maxAngularAcceleration ?? maxAngAccelDeg,
      ),
      nominalVoltage: 12.0,
      unlimited: false,
    },
    goalEndState: {
      velocity: round3(pathDoc.goalEndState?.velocity ?? 0.0),
      rotation: round3(pathDoc.goalEndState?.rotation ?? 0.0),
    },
    reversed: Boolean(pathDoc.reversed),
    folder: null,
    idealStartingState: {
      velocity: round3(pathDoc.idealStartingState?.velocity ?? 0.0),
      rotation: round3(pathDoc.idealStartingState?.rotation ?? 0.0),
    },
    useDefaultConstraints: pathDoc.useDefaultConstraints ?? true,
  };

  return {
    path: `src/main/deploy/pathplanner/paths/${cleanName}.path`,
    content: JSON.stringify(doc, null, 2) + "\n",
  };
}

export function generatePathPlannerSettingsJsonFile(
  project: CiprixProject,
): GeneratedFile | null {
  const dt = project.drivetrain;
  if (!dt?.enabled) return null;

  const halfL = round3(dt.wheelBaseMeters / 2);
  const halfW = round3(dt.trackWidthMeters / 2);
  const driveMotorType = dt.motorVendor === "talonfx" ? "krakenX60" : "NEO";
  const holonomicMode = dt.type !== "differential";

  const settings = {
    robotWidth: round3(dt.trackWidthMeters + 0.16),
    robotLength: round3(dt.wheelBaseMeters + 0.16),
    holonomicMode,
    pathFolders: [],
    autoFolders: [],
    defaultMaxVel: round3(dt.maxSpeedMps),
    defaultMaxAccel: round3(dt.maxLinearAccelMps2),
    defaultMaxAngVel: round3((dt.maxAngularSpeedRadPerSec * 180) / Math.PI),
    defaultMaxAngAccel: round3((dt.maxAngularAccelRadPerSec2 * 180) / Math.PI),
    defaultNominalVoltage: 12.0,
    robotMass: 54.0,
    robotMOI: 6.5,
    robotTrackwidth: round3(dt.trackWidthMeters),
    driveWheelRadius: round3(dt.wheelDiameterMeters / 2),
    driveGearing: round3(dt.driveGearRatio),
    maxDriveSpeed: round3(dt.maxSpeedMps),
    driveMotorType,
    driveCurrentLimit: dt.currentLimitAmps,
    wheelCOF: 1.2,
    flModuleX: halfL,
    flModuleY: halfW,
    frModuleX: halfL,
    frModuleY: -halfW,
    blModuleX: -halfL,
    blModuleY: halfW,
    brModuleX: -halfL,
    brModuleY: -halfW,
    bumperOffsetX: 0.0,
    bumperOffsetY: 0.0,
    robotFeatures: [],
  };

  return {
    path: "src/main/deploy/pathplanner/settings.json",
    content: JSON.stringify(settings, null, 2) + "\n",
  };
}

/**
 * Generates `AutonomousSetup.java` with PathPlanner `NamedCommands` registration
 * and Ciprix `AutoEngine` + `PathPlannerAuto` / `ChoreoAuto` routine wiring.
 */
export function generateAutonomousSetupFile(
  project: CiprixProject,
): GeneratedFile | null {
  const auto = project.autonomous;
  if (!auto?.enabled || !project.drivetrain?.enabled) return null;

  const pkg = project.project.packageName;
  const pkgPath = pkg.replace(/\./g, "/");
  const chooserName = escapeJavaString(auto.chooserName.trim() || "Auto");
  const slots = Math.min(5, Math.max(1, Math.round(auto.chooserSlots || 1)));

  const effectiveNamedCommands = resolveEffectiveNamedCommands(auto);
  const hasPathPlanner = auto.routines.some((r) => r.source === "pathplanner");
  const hasChoreo = auto.routines.some((r) => r.source === "choreo");
  const hasNamed = effectiveNamedCommands.length > 0;

  const importSet = new Set<string>([
    "import edu.wpi.first.wpilibj2.command.Command;",
    "import edu.wpi.first.wpilibj2.command.Commands;",
    "import org.ciprix.util.AutoEngine;",
    `import ${pkg}.subsystems.superstructure.SuperStructure;`,
  ]);

  if (hasNamed) {
    importSet.add("import com.pathplanner.lib.auto.NamedCommands;");
    importSet.add(`import ${pkg}.Constants.RobotRequest;`);
    importSet.add(`import ${pkg}.commands.SuperStructureCommands;`);
  }
  if (hasPathPlanner) {
    importSet.add("import com.pathplanner.lib.commands.PathPlannerAuto;");
  }
  if (hasChoreo) {
    importSet.add("import org.ciprix.util.ChoreoAuto;");
  }

  const namedCommandLines = effectiveNamedCommands.map((cmd) => {
    const escaped = escapeJavaString(cmd.name.trim());
    return `    NamedCommands.registerCommand(\n        "${escaped}",\n        SuperStructureCommands.autoRequest(superStructure, RobotRequest.${cmd.request}, ${cmd.waitForGoal}, ${formatDouble(cmd.timeoutSec)}));`;
  });

  const defaultRoutine = auto.defaultAutoId
    ? auto.routines.find((r) => r.id === auto.defaultAutoId)
    : undefined;

  const routineSupplier = (source: "pathplanner" | "choreo", fileName: string) => {
    const cleanFile = escapeJavaString(fileName.trim().replace(/\.(auto|traj)$/i, ""));
    return source === "choreo"
      ? `() -> new ChoreoAuto("${cleanFile}")`
      : `() -> new PathPlannerAuto("${cleanFile}")`;
  };

  const partLines: string[] = [];
  if (defaultRoutine) {
    partLines.push(
      `    autoEngine.addDefaultPart("${escapeJavaString(defaultRoutine.name)}", ${routineSupplier(defaultRoutine.source, defaultRoutine.fileName)});`,
    );
    partLines.push(`    autoEngine.addPart("None", Commands::none);`);
  } else {
    partLines.push(`    autoEngine.addDefaultPart("None", Commands::none);`);
  }

  for (const r of auto.routines) {
    if (defaultRoutine && r.id === defaultRoutine.id) continue;
    partLines.push(
      `    autoEngine.addPart("${escapeJavaString(r.name)}", ${routineSupplier(r.source, r.fileName)});`,
    );
  }

  const bodyLines = [
    ...(namedCommandLines.length > 0 ? [...namedCommandLines, ""] : []),
    `    this.autoEngine = new AutoEngine("${chooserName}", ${slots});`,
    ...partLines,
  ].join("\n");

  const content = `package ${pkg}.auto;

${Array.from(importSet).sort().join("\n")}

/** PathPlanner / Choreo autonomous configuration using Ciprix {@link AutoEngine}. */
public class AutonomousSetup {
  private final AutoEngine autoEngine;

  public AutonomousSetup(SuperStructure superStructure) {
${bodyLines}
  }

  public Command getAutonomousCommand() {
    return autoEngine.build();
  }

  public AutoEngine getAutoEngine() {
    return autoEngine;
  }
}
`;

  return {
    path: `src/main/java/${pkgPath}/auto/AutonomousSetup.java`,
    content,
  };
}

/**
 * Generates `AutonomousSetup.java`, `deploy/pathplanner/settings.json` (when enabled),
 * and `.auto` JSON files for routines edited with visual step sequences.
 */
export function generateAutonomousFiles(project: CiprixProject): GeneratedFile[] {
  const auto = project.autonomous;
  if (!auto?.enabled || !project.drivetrain?.enabled) return [];

  const files: GeneratedFile[] = [];
  const setupJava = generateAutonomousSetupFile(project);
  if (setupJava) files.push(setupJava);

  if (auto.generateSettingsJson !== false) {
    const settingsFile = generatePathPlannerSettingsJsonFile(project);
    if (settingsFile) files.push(settingsFile);
  }

  for (const r of auto.routines) {
    const autoJson = generatePathPlannerAutoJsonFile(r);
    if (autoJson) files.push(autoJson);
  }

  for (const p of auto.paths ?? []) {
    const pathJson = generatePathPlannerPathJsonFile(p, project);
    if (pathJson) files.push(pathJson);
  }

  return files;
}
