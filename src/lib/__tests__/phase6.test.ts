import { describe, expect, it } from "vitest";
import {
  buildRobotSimConfig,
  generatePathTrajectory,
  simulateAutoRoutine,
} from "../autonomous/pathplanner-engine";
import {
  parseFullPathPlannerPathJson,
  parsePathPlannerAutoJson,
  parsePathPlannerPathJson,
  stripAutoExtension,
} from "../autonomous/pathplanner-parser";
import { REBUILT_AUTO_TEMPLATES } from "../autonomous/templates";
import { generateProjectFiles, getRequiredVendordeps } from "../generator";
import { generatePathPlannerPathJsonFile } from "../generator/autonomous";
import { createDefaultDrivetrain } from "../presets/drivetrain";
import { createSkeletonPreset } from "../presets/skeleton";
import {
  CiprixProjectSchema,
  createDefaultAutonomousConfig,
  type DrivetrainType,
} from "../schema/ciprix-project";
import { validateProject } from "../validator";

describe("Phase 6: PathPlanner & Choreo Autonomous", () => {
  it("parses nested PathPlanner .auto and .path files for named commands and path names", () => {
    const autoJson = JSON.stringify({
      version: "2025.0",
      command: {
        type: "sequential",
        data: {
          commands: [
            { type: "named", data: { name: "ResetGyro" } },
            {
              type: "parallel",
              data: {
                commands: [
                  { type: "path", data: { pathName: "ToCenterFuel" } },
                  { type: "named", data: { name: "IntakeOn" } },
                ],
              },
            },
            {
              type: "deadline",
              data: {
                commands: [
                  { type: "path", data: { pathName: "ReturnAndScore" } },
                  { type: "named", data: { name: "IntakeOn" } },
                  { type: "named", data: { name: "ScoreHigh" } },
                ],
              },
            },
          ],
        },
      },
    });

    const parsedAuto = parsePathPlannerAutoJson(autoJson);
    expect(parsedAuto.namedCommands).toEqual(["ResetGyro", "IntakeOn", "ScoreHigh"]);
    expect(parsedAuto.pathNames).toEqual(["ToCenterFuel", "ReturnAndScore"]);

    const pathJson = JSON.stringify({
      eventMarkers: [
        {
          name: "spin",
          waypointRelativePos: 0.4,
          command: { type: "named", data: { name: "SpinFlywheel" } },
        },
      ],
    });
    expect(parsePathPlannerPathJson(pathJson).namedCommands).toEqual(["SpinFlywheel"]);
    expect(stripAutoExtension("TwoPiece.auto")).toBe("TwoPiece");
    expect(stripAutoExtension("Sprint.traj")).toBe("Sprint");
  });

  it("emits AutoBuilder, LocalADStarAK, and PathplannerLib.json across all 5 drivetrain bases", () => {
    const bases: DrivetrainType[] = [
      "ctre_swerve",
      "yagsl",
      "akit_swerve",
      "differential",
      "mecanum",
    ];

    for (const base of bases) {
      const project = createSkeletonPreset();
      project.drivetrain = createDefaultDrivetrain(base);
      project.autonomous = {
        ...createDefaultAutonomousConfig(),
        enabled: true,
        useLocalADStarAK: true,
        translationPid: { kP: 4.5, kI: 0.1, kD: 0.2 },
        rotationPid: { kP: 3.8, kI: 0, kD: 0.05 },
      };

      const parsed = CiprixProjectSchema.safeParse(project);
      expect(parsed.success, `${base} schema`).toBe(true);
      expect(getRequiredVendordeps(project)).toContain("PathplannerLib.json");

      const files = generateProjectFiles(project);
      const driveJava = files.find((f) => f.path.endsWith("/drive/Drive.java"))?.content ?? "";
      expect(driveJava, `${base} AutoBuilder`).toContain("AutoBuilder.configure(");
      expect(driveJava, `${base} resetPose`).toContain("public void resetPose(Pose2d pose)");
      expect(driveJava, `${base} driveRobotRelative`).toContain(
        "public void driveRobotRelative(ChassisSpeeds speeds)",
      );
      expect(driveJava, `${base} LocalADStarAK`).toContain(
        "Pathfinding.setPathfinder(new LocalADStarAK());",
      );
      if (base === "differential") {
        expect(driveJava).toContain("new PPLTVController(");
      } else {
        expect(driveJava).toContain("new PPHolonomicDriveController(");
        expect(driveJava).toContain("new PIDConstants(4.5, 0.1, 0.2)");
      }
    }
  });

  it("generates AutonomousSetup.java registering NamedCommands before PathPlannerAuto & ChoreoAuto", () => {
    const project = createSkeletonPreset();
    project.drivetrain = createDefaultDrivetrain("ctre_swerve");
    project.autonomous = {
      ...createDefaultAutonomousConfig(),
      enabled: true,
      chooserName: "MatchAuto",
      chooserSlots: 2,
      defaultAutoId: "r-pp",
      namedCommands: [
        {
          id: "nc-1",
          name: "IntakeOn",
          request: "INTAKE",
          waitForGoal: true,
          timeoutSec: 2.5,
        },
        {
          id: "nc-2",
          name: "StopAll",
          request: "STOP",
          waitForGoal: false,
          timeoutSec: 1.0,
        },
      ],
      routines: [
        {
          id: "r-pp",
          name: "2 Piece Center",
          fileName: "TwoPieceCenter",
          source: "pathplanner",
        },
        {
          id: "r-ch",
          name: "Choreo Sprint",
          fileName: "ChoreoSprint",
          source: "choreo",
        },
      ],
    };

    const files = generateProjectFiles(project);
    const setupJava =
      files.find((f) => f.path.endsWith("/auto/AutonomousSetup.java"))?.content ?? "";

    expect(setupJava).toContain('NamedCommands.registerCommand(\n        "IntakeOn"');
    expect(setupJava).toContain("SuperStructureCommands.autoRequest(superStructure, RobotRequest.INTAKE, true, 2.5)");
    expect(setupJava).toContain('new AutoEngine("MatchAuto", 2);');
    expect(setupJava).toContain('autoEngine.addDefaultPart("2 Piece Center", () -> new PathPlannerAuto("TwoPieceCenter"));');
    expect(setupJava).toContain('autoEngine.addPart("Choreo Sprint", () -> new ChoreoAuto("ChoreoSprint"));');
    expect(setupJava.indexOf("NamedCommands.registerCommand")).toBeLessThan(
      setupJava.indexOf("autoEngine.addDefaultPart"),
    );

    const containerJava =
      files.find((f) => f.path.endsWith("/RobotContainer.java"))?.content ?? "";
    expect(containerJava).toContain("autonomousSetup = new AutonomousSetup(superStructure);");
    expect(containerJava).toContain("return autonomousSetup.getAutonomousCommand();");
  });

  it("wires SuperStructureCommands autoRequest and respects keepAutomationsInAuto", () => {
    const project = createSkeletonPreset();
    if (project.subsystems[0]?.motor) project.subsystems[0].motor.canId = 25;
    project.drivetrain = createDefaultDrivetrain("ctre_swerve");
    project.subsystems[0].sensors = [
      { id: "s1", name: "pieceSensor", type: "dio", channel: 0, inverted: false },
    ];
    project.controls.pilotPriority.push({
      id: "auto-rule",
      source: "sensor",
      sensorOwnerId: project.subsystems[0].id,
      sensorId: "s1",
      sensorTrigger: "whileTrue",
      request: "INTAKE",
    });

    project.autonomous = {
      ...createDefaultAutonomousConfig(),
      enabled: true,
      keepAutomationsInAuto: true,
    };
    const keepFiles = generateProjectFiles(project);
    const cmdsKeep =
      keepFiles.find((f) => f.path.endsWith("/commands/SuperStructureCommands.java"))?.content ?? "";
    expect(cmdsKeep).toContain("if (DriverStation.isAutonomous()) {");
    expect(cmdsKeep).toContain("Sensor.getAsBoolean()");
    expect(cmdsKeep).toContain("public static Command autoRequest(");

    project.autonomous.keepAutomationsInAuto = false;
    const blockFiles = generateProjectFiles(project);
    const cmdsBlock =
      blockFiles.find((f) => f.path.endsWith("/commands/SuperStructureCommands.java"))?.content ?? "";
    expect(cmdsBlock).toContain("if (DriverStation.isAutonomous()) {\n                return;");
  });

  it("validates missing RobotRequest, duplicate NamedCommands, unmapped auto commands, and disabled drivetrain", () => {
    const project = createSkeletonPreset();
    const dt = createDefaultDrivetrain("ctre_swerve");
    dt.enabled = false;
    project.drivetrain = dt;
    project.autonomous = {
      ...createDefaultAutonomousConfig(),
      enabled: true,
      namedCommands: [
        { id: "c1", name: "DupCmd", request: "NONEXISTENT_REQ", waitForGoal: false, timeoutSec: 2 },
        { id: "c2", name: "DupCmd", request: "STOP", waitForGoal: false, timeoutSec: 2 },
      ],
      routines: [
        {
          id: "r1",
          name: "Missing Routine",
          fileName: "MissingAuto",
          source: "pathplanner",
          missingFile: true,
          discoveredNamedCommands: ["UnmappedCmd"],
        },
      ],
    };

    const issues = validateProject(project, "pt");
    const ids = issues.map((i) => i.id);
    expect(ids).toContain("auto-needs-drivetrain");
    expect(ids).toContain("auto-cmd-req-c1");
    expect(ids).toContain("auto-cmd-dup-c2");
    expect(ids).toContain("auto-routine-missing-r1");
    expect(ids).toContain("auto-unmapped-cmd-r1-UnmappedCmd");
  });

  it("emits PathPlanner settings.json, .auto JSON from routine steps, and adapts REBUILT 2026 templates", () => {
    const project = createSkeletonPreset();
    project.drivetrain = createDefaultDrivetrain("ctre_swerve");
    const tpl = REBUILT_AUTO_TEMPLATES.find((t) => t.id === "score-depot")!;
    const built = tpl.build(
      project.project.fieldLengthMeters,
      project.project.fieldWidthMeters,
      project.superstructure.requests,
    );

    project.autonomous = {
      ...createDefaultAutonomousConfig(),
      enabled: true,
      generateSettingsJson: true,
      routines: [{ ...built.routine, id: "r-tpl" }],
      namedCommands: built.namedCommands.map((nc, i) => ({ ...nc, id: `nc-t-${i}` })),
    };

    const files = generateProjectFiles(project);
    const settingsFile = files.find((f) => f.path === "src/main/deploy/pathplanner/settings.json");
    expect(settingsFile).toBeDefined();
    const settingsJson = JSON.parse(settingsFile!.content) as Record<string, unknown>;
    expect(settingsJson.holonomicMode).toBe(true);
    expect(settingsJson.driveMotorType).toBe("krakenX60");

    const autoFile = files.find(
      (f) => f.path === "src/main/deploy/pathplanner/autos/OnePieceDepot.auto",
    );
    expect(autoFile).toBeDefined();
    const parsedAuto = parsePathPlannerAutoJson(autoFile!.content);
    expect(parsedAuto.pathNames).toEqual(["StartToHub", "HubToDepot", "DepotToHub"]);
    expect(parsedAuto.namedCommands).toEqual(["ScoreFuel", "IntakeOn", "StopAll"]);
  });

  it("generates velocity-profiled PathPlanner trajectories, .path JSON 2025.0 round-trip, and break warnings", () => {
    const project = createSkeletonPreset();
    project.drivetrain = createDefaultDrivetrain("ctre_swerve");
    const tpl = REBUILT_AUTO_TEMPLATES.find((t) => t.id === "score-depot")!;
    const built = tpl.build(
      project.project.fieldLengthMeters,
      project.project.fieldWidthMeters,
      project.superstructure.requests,
    );
    const docs = built.paths.map((p, i) => ({ ...p, id: `p-${i}` }));
    project.autonomous = {
      ...createDefaultAutonomousConfig(),
      enabled: true,
      paths: docs,
      routines: [{ ...built.routine, id: "r-sim" }],
    };

    const simCfg = buildRobotSimConfig(project, docs[1]);
    const traj = generatePathTrajectory(docs[1], simCfg);
    expect(traj.states.length).toBeGreaterThan(20);
    expect(traj.totalTimeSec).toBeGreaterThan(0.5);
    expect(traj.totalDistanceM).toBeGreaterThan(1.0);
    for (let i = 1; i < traj.states.length; i += 1) {
      expect(traj.states[i].timeSec).toBeGreaterThanOrEqual(traj.states[i - 1].timeSec);
      expect(traj.states[i].velMps).toBeLessThanOrEqual(simCfg.maxVel + 0.01);
      expect(traj.states[i].moduleAnglesRad).toHaveLength(4);
    }

    const pathFile = generatePathPlannerPathJsonFile(docs[1], project);
    expect(pathFile?.path).toBe("src/main/deploy/pathplanner/paths/HubToDepot.path");
    const parsedBack = parseFullPathPlannerPathJson(pathFile!.content, "HubToDepot");
    expect(parsedBack).not.toBeNull();
    expect(parsedBack!.waypoints).toHaveLength(docs[1].waypoints.length);
    expect(parsedBack!.rotationTargets[0]?.rotationDegrees).toBe(180);
    expect(parsedBack!.eventMarkers[0]?.commandName).toBe("IntakeOn");

    const cleanSim = simulateAutoRoutine(
      project.autonomous.routines[0],
      docs,
      project,
      project.project.fieldLengthMeters,
      project.project.fieldWidthMeters,
    );
    expect(cleanSim.totalTimeSec).toBeGreaterThan(1.5);
    expect(cleanSim.breaks).toHaveLength(0);

    // Introduce intentional break between two disconnected paths
    const disjointDocs = [
      docs[0],
      {
        ...docs[1],
        id: "p-jump",
        waypoints: [
          { anchor: { x: 8.5, y: 6.0 }, prevControl: null, nextControl: { x: 9.0, y: 6.0 } },
          { anchor: { x: 10.5, y: 6.0 }, prevControl: { x: 10.0, y: 6.0 }, nextControl: null },
        ],
      },
    ];
    const breakSim = simulateAutoRoutine(
      project.autonomous.routines[0],
      disjointDocs,
      project,
      project.project.fieldLengthMeters,
      project.project.fieldWidthMeters,
    );
    expect(breakSim.breaks.length).toBeGreaterThan(0);
    expect(breakSim.breaks[0].gapMeters).toBeGreaterThan(0.25);
  });
});
