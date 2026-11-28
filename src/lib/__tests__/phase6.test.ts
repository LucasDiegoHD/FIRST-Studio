import { describe, expect, it } from "vitest";
import {
  buildRobotSimConfig,
  generatePathTrajectory,
  reversePathDoc,
  simulateAutoRoutine,
} from "../autonomous/pathplanner-engine";
import {
  parseFullPathPlannerAutoJson,
  parseFullPathPlannerPathJson,
  parsePathPlannerAutoJson,
  parsePathPlannerPathJson,
  stripAutoExtension,
} from "../autonomous/pathplanner-parser";
import { evaluateRobotInZones } from "../arena/rebuilt-2026";
import { REBUILT_AUTO_TEMPLATES } from "../autonomous/templates";
import { generateProjectFiles, getRequiredVendordeps } from "../generator";
import {
  generateAutonomousSetupFile,
  generatePathPlannerPathJsonFile,
} from "../generator/autonomous";
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

  it("aims continuously toward pointTowardsZones, reverses zones, and round-trips zoned markers", () => {
    const project = createSkeletonPreset();
    project.drivetrain = createDefaultDrivetrain("ctre_swerve");
    const targetPt = { x: 4.6, y: 4.03 };
    const pathDoc = {
      id: "p-aim",
      name: "StrafeAimHub",
      waypoints: [
        { anchor: { x: 2.0, y: 2.0 }, prevControl: null, nextControl: { x: 2.4, y: 3.0 } },
        { anchor: { x: 2.0, y: 6.0 }, prevControl: { x: 2.4, y: 5.0 }, nextControl: null },
      ],
      rotationTargets: [],
      pointTowardsZones: [
        {
          id: "pz-1",
          name: "Mirar Hub",
          fieldPosition: targetPt,
          minWaypointRelativePos: 0.1,
          maxWaypointRelativePos: 0.9,
          rotationOffsetDegrees: 0,
        },
      ],
      eventMarkers: [
        {
          id: "em-zone",
          name: "IntakeSpan",
          commandName: "IntakeSpan",
          request: "INTAKE",
          waypointRelativePos: 0.2,
          endWaypointRelativePos: 0.8,
          waitForGoal: false,
          timeoutSec: 2.5,
        },
      ],
      idealStartingState: { velocity: 0, rotation: 0 },
      goalEndState: { velocity: 0, rotation: 45 },
    };

    const simCfg = buildRobotSimConfig(project, pathDoc);
    const traj = generatePathTrajectory(pathDoc, simCfg);
    const midSamples = traj.states.filter(
      (s) => s.waypointRelativePos >= 0.15 && s.waypointRelativePos <= 0.85,
    );
    expect(midSamples.length).toBeGreaterThan(5);
    for (const st of midSamples) {
      const expectedAngle = Math.atan2(targetPt.y - st.y, targetPt.x - st.x);
      let diff = expectedAngle - st.rotationRad;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      expect(Math.abs(diff)).toBeLessThan(0.05);
    }

    expect(traj.markerEvents[0]?.timeSec).toBeLessThan(traj.markerEvents[0]?.endTimeSec ?? 0);

    const reversed = reversePathDoc(pathDoc);
    expect(reversed.pointTowardsZones?.[0]?.minWaypointRelativePos).toBeCloseTo(0.1, 2);
    expect(reversed.pointTowardsZones?.[0]?.maxWaypointRelativePos).toBeCloseTo(0.9, 2);
    expect(reversed.eventMarkers[0]?.waypointRelativePos).toBeCloseTo(0.2, 2);
    expect(reversed.eventMarkers[0]?.endWaypointRelativePos).toBeCloseTo(0.8, 2);
    expect(reversed.goalEndState?.rotation).toBe(0);
    expect(reversed.idealStartingState?.rotation).toBe(45);

    const exported = generatePathPlannerPathJsonFile(pathDoc, project);
    expect(exported).not.toBeNull();
    const parsedBack = parseFullPathPlannerPathJson(exported!.content, "StrafeAimHub");
    expect(parsedBack?.pointTowardsZones).toHaveLength(1);
    expect(parsedBack?.pointTowardsZones?.[0]?.fieldPosition).toEqual(targetPt);
    expect(parsedBack?.eventMarkers[0]?.endWaypointRelativePos).toBeCloseTo(0.8, 2);

    const parsedAuto = parseFullPathPlannerAutoJson(
      JSON.stringify({
        version: "2025.0",
        command: { type: "sequential", data: { commands: [{ type: "path", data: { pathName: "StrafeAimHub" } }] } },
      }),
    );
    expect(parsedAuto.pathNames).toEqual(["StrafeAimHub"]);
  });

  it("registers Event Markers bound directly to RobotRequest in AutonomousSetup and validates missing requests", () => {
    const project = createSkeletonPreset();
    project.drivetrain = createDefaultDrivetrain("ctre_swerve");
    project.autonomous = {
      ...createDefaultAutonomousConfig(),
      enabled: true,
      paths: [
        {
          id: "p-ev",
          name: "MarkerReqPath",
          waypoints: [
            { anchor: { x: 2.0, y: 4.0 }, prevControl: null, nextControl: { x: 2.6, y: 4.0 } },
            { anchor: { x: 4.0, y: 4.0 }, prevControl: { x: 3.4, y: 4.0 }, nextControl: null },
          ],
          rotationTargets: [],
          eventMarkers: [
            {
              id: "em-req",
              name: "SpinIntake",
              commandName: "SpinIntake",
              request: "INTAKE",
              waypointRelativePos: 0.5,
              waitForGoal: true,
              timeoutSec: 2.0,
            },
          ],
        },
      ],
    };

    const setup = generateAutonomousSetupFile(project);
    expect(setup?.content).toContain('NamedCommands.registerCommand(\n        "SpinIntake"');
    expect(setup?.content).toContain(
      "SuperStructureCommands.autoRequest(superStructure, RobotRequest.INTAKE, true, 2.0)",
    );

    const cleanIssues = validateProject(project, "pt").filter((i) => i.tab === "autonomous");
    expect(cleanIssues).toHaveLength(0);

    project.autonomous.paths![0].eventMarkers[0].request = "MISSING_REQ";
    const errIssues = validateProject(project, "pt").filter((i) => i.tab === "autonomous");
    expect(errIssues.some((i) => i.id === "auto-marker-req-p-ev-em-req")).toBe(true);
  });

  it("emits real-time AD* button pathfinding (LocalADStarAK, navgrid.json, settings.json, RobotContainer) even when autonomous is off", () => {
    const project = createSkeletonPreset();
    const dt = createDefaultDrivetrain("ctre_swerve");
    dt.teleopPathfinding = [
      {
        id: "ad-outpost",
        name: "Ir Outpost",
        controller: "pilot",
        button: "x",
        triggerMode: "whileTrue",
        mode: "pose",
        x: 1.1,
        y: 1.05,
        rotationDeg: 180,
        allianceFlip: true,
        goalEndVelocityMps: 0,
        maxVelocityMps: 3.5,
        onArrivalRequest: "INTAKE",
      },
    ];
    project.drivetrain = dt;
    project.autonomous = { ...createDefaultAutonomousConfig(), enabled: false };

    expect(getRequiredVendordeps(project)).toContain("PathplannerLib.json");
    const files = generateProjectFiles(project);

    const driveJava = files.find((f) => f.path.endsWith("/drive/Drive.java"))?.content ?? "";
    expect(driveJava).toContain("Pathfinding.setPathfinder(new LocalADStarAK());");
    expect(driveJava).toContain("AutoBuilder.configure(");
    expect(driveJava).toContain("public Command pathfindToFieldPose(");
    expect(driveJava).toContain("public Command pathfindThenFollow(");

    const containerJava = files.find((f) => f.path.endsWith("/RobotContainer.java"))?.content ?? "";
    expect(containerJava).toContain("pilot.x().whileTrue(drive.pathfindToFieldPose(");
    expect(containerJava).toContain("RobotRequest.INTAKE");

    const navgridFile = files.find((f) => f.path === "src/main/deploy/pathplanner/navgrid.json");
    expect(navgridFile).toBeDefined();
    const navgrid = JSON.parse(navgridFile!.content) as {
      nodeSizeMeters: number;
      grid: boolean[][];
      field_size: { x: number; y: number };
    };
    expect(navgrid.nodeSizeMeters).toBe(0.2);
    expect(navgrid.grid.length).toBeGreaterThan(20);
    expect(navgrid.grid.some((row) => row.some(Boolean))).toBe(true);
    expect(files.some((f) => f.path === "src/main/deploy/pathplanner/settings.json")).toBe(true);
  });

  it("supports robot border magnet zones (FieldZones, RobotContainer gate, and perimeter bumper physics)", () => {
    const project = createSkeletonPreset();
    project.drivetrain = createDefaultDrivetrain("akit_swerve");
    project.zones = [
      {
        id: "z-mag",
        name: "OUTPOST_MAGNET",
        type: "magnet",
        shape: { kind: "rectangle", x1: 0.0, y1: 0.4, x2: 1.0, y2: 1.6 },
        mirror: "both",
        magnetSide: "front",
        magnetRangeMeters: 0.55,
        strength: 0.6,
        magnetButton: "leftBumper",
      },
    ];

    const files = generateProjectFiles(project);
    const fz = files.find((f) => f.path.endsWith("/field/FieldZones.java"))?.content ?? "";
    expect(fz).toContain("private static Translation2d applyBorderMagnet(");
    expect(fz).toContain("zonePoly.getClosestPoint(borderField)");
    expect(fz).toContain("TranslationModifier.fieldToDriver(");
    expect(fz).toContain("public void setMagnetGate(ZoneId id, BooleanSupplier gate)");

    const rc = files.find((f) => f.path.endsWith("/RobotContainer.java"))?.content ?? "";
    expect(rc).toContain("fieldZones.setMagnetGate(ZoneId.OUTPOST_MAGNET, () -> pilot.leftBumper().getAsBoolean());");

    // Robot center at x=1.65 (outside rect x2=1.0), facing left (theta=Math.PI), front bumper at x=1.29 -> gap=0.29 <= 0.55
    const evalInsideRange = evaluateRobotInZones(
      project.zones,
      { x: 1.65, y: 1.0 },
      "Blue",
      16.541,
      8.069,
      Math.PI,
      0.36,
      0.36,
    );
    expect(evalInsideRange.activeZones.map((z) => z.id)).toContain("z-mag");
    expect(evalInsideRange.magnetSnap).toBeDefined();
    expect(evalInsideRange.magnetSnap!.gapMeters).toBeCloseTo(0.29, 2);
    expect(evalInsideRange.forceVec.x).toBeLessThan(-0.1);
  });

  it("keeps Anti-Tipping disabled by default and emits AntiTippingAccel / AntiTipping when enabled", () => {
    const defaultDt = createDefaultDrivetrain("ctre_swerve");
    expect(defaultDt.antiTipping?.enabled).toBe(false);

    const project = createSkeletonPreset();
    project.drivetrain = {
      ...defaultDt,
      antiTipping: {
        enabled: true,
        mode: "accel",
        tippingThresholdDeg: 9.5,
        maxCorrectionSpeedMps: 2.2,
        kP: 0.25,
        comHeightMeters: 0.3,
        dynamicAccelLimits: true,
      },
    };
    const accelFiles = generateProjectFiles(project);
    const accelDrive = accelFiles.find((f) => f.path.endsWith("/drive/Drive.java"))?.content ?? "";
    expect(accelDrive).toContain("import org.ciprix.util.security.antitipping.AntiTippingAccel;");
    expect(accelDrive).toContain("antiTipping.calculate(getRotation3d(), getAccelX(), getAccelY(), this)");
    expect(accelDrive).toContain("antiTipping.reset();");

    project.drivetrain = {
      ...createDefaultDrivetrain("akit_swerve"),
      antiTipping: {
        enabled: true,
        mode: "simple",
        tippingThresholdDeg: 11,
        maxCorrectionSpeedMps: 1.8,
        kP: 0.2,
        comHeightMeters: 0.25,
        dynamicAccelLimits: false,
      },
    };
    const simpleFiles = generateProjectFiles(project);
    const simpleDrive = simpleFiles.find((f) => f.path.endsWith("/drive/Drive.java"))?.content ?? "";
    const gyroIo = simpleFiles.find((f) => f.path.endsWith("/drive/GyroIO.java"))?.content ?? "";
    expect(simpleDrive).toContain("import org.ciprix.util.security.antitipping.AntiTipping;");
    expect(simpleDrive).toContain("antiTipping.calculate(getRotation3d())");
    expect(gyroIo).toContain("public Rotation3d rotation3d = new Rotation3d();");
  });
});
