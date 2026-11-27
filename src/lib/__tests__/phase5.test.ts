import { describe, expect, it } from "vitest";
import {
  evaluateRobotInZones,
  getRebuilt2026Landmarks,
  isPointInZone,
  REBUILT_ZONE_PRESETS,
} from "../arena/rebuilt-2026";
import { generateProjectFiles } from "../generator";
import { generateSuperStructureMermaid } from "../generator/mermaid";
import { createDefaultDrivetrain } from "../presets/drivetrain";
import { createSkeletonPreset } from "../presets/skeleton";
import { CiprixProjectSchema, FieldZoneSchema, type FieldZone } from "../schema/ciprix-project";
import { validateProject } from "../validator";

function makeSampleZones(): FieldZone[] {
  return [
    {
      id: "z-collect",
      name: "COLLECT_ZONE",
      type: "trigger",
      shape: { kind: "rectangle", x1: 0.5, y1: 1.0, x2: 3.0, y2: 3.5 },
      mirror: "both",
    },
    {
      id: "z-reef",
      name: "REEF_SUCTION",
      type: "suction",
      shape: { kind: "circle", cx: 4.5, cy: 4.0, radius: 1.1 },
      mirror: "x",
      strength: 0.45,
    },
    {
      id: "z-bump",
      name: "BUMP_SLOW",
      type: "speedLimit",
      shape: {
        kind: "polygon",
        vertices: [
          { x: 6.0, y: 2.0 },
          { x: 7.5, y: 2.0 },
          { x: 7.0, y: 4.0 },
        ],
      },
      mirror: "y",
      speedFactor: 0.45,
    },
    {
      id: "z-repel",
      name: "PILLAR_REPEL",
      type: "repulsion",
      shape: { kind: "circle", cx: 5.5, cy: 6.0, radius: 0.8 },
      mirror: "none",
      strength: 0.7,
    },
    {
      id: "z-forbid",
      name: "NO_ENTRY",
      type: "forbidden",
      shape: { kind: "rectangle", x1: 7.5, y1: 5.5, x2: 9.0, y2: 7.5 },
      mirror: "both",
      strength: 0.9,
      alertMessage: "Perigo: área proibida!",
    },
  ];
}

describe("Phase 5 — Arena Zones, Modifiers, and Combined Automations", () => {
  it("parses schema v2 with and without zones across all shapes, types, and mirror modes", () => {
    const base = createSkeletonPreset();
    expect(CiprixProjectSchema.parse(base).zones).toBeUndefined();

    const withZones = {
      ...base,
      zones: makeSampleZones(),
    };
    const parsed = CiprixProjectSchema.parse(withZones);
    expect(parsed.zones).toHaveLength(5);
    expect(parsed.zones?.[0].shape.kind).toBe("rectangle");
    expect(parsed.zones?.[1].shape.kind).toBe("circle");
    expect(parsed.zones?.[2].shape.kind).toBe("polygon");
  });

  it("generates FieldZones.java with Ciprix shapes, AllianceFlipUtil mirroring, modifiers, alerts, and logging", () => {
    const project = createSkeletonPreset();
    project.drivetrain = createDefaultDrivetrain("ctre_swerve");
    project.zones = makeSampleZones();

    const files = generateProjectFiles(project);
    const fieldZones = files.find((f) => f.path.endsWith("/field/FieldZones.java"));
    expect(fieldZones).toBeDefined();

    const code = fieldZones!.content;
    expect(code).toContain("package frc.robot.field;");
    expect(code).toContain("public enum ZoneId");
    expect(code).toContain("COLLECT_ZONE");
    expect(code).toContain("REEF_SUCTION");
    expect(code).toContain("BUMP_SLOW");
    expect(code).toContain("PILLAR_REPEL");
    expect(code).toContain("NO_ENTRY");
    expect(code).toContain("new Rectangle2d(");
    expect(code).toContain("new Circle2d(");
    expect(code).toContain("new Polygon2d(");
    expect(code).toContain("new Zone2d<>(ZoneId.COLLECT_ZONE");
    expect(code).toContain("AllianceFlipUtil.flipX(");
    expect(code).toContain("AllianceFlipUtil.flipY(");
    expect(code).toContain("AllianceFlipUtil.apply(");
    expect(code).toContain("new ZoneSuctionModifier(");
    expect(code).toContain("new ZoneRepulsionModifier(");
    expect(code).toContain('new PersistentAlert("Zones", "Perigo: área proibida!", PersistentAlert.Level.WARNING)');
    expect(code).toContain("in.times(0.45)");
    expect(code).toContain('Logger.recordOutput("Zones/Current"');
    expect(code).toContain("LogPolygon2d.logPolygon(");
    expect(code).toContain("public ZoneId current(Pose2d pose)");
    expect(code).toContain("public void periodic(Pose2d pose)");
  });

  it("wires FieldZones into Drive.java, SuperStructure.java, SuperStructureCommands.java, RobotContainer.java, and Mermaid", () => {
    const project = createSkeletonPreset();
    project.subsystems[0].motor!.canId = 25;
    project.drivetrain = createDefaultDrivetrain("akit_swerve");
    project.subsystems[0].sensors = [
      { id: "sen-piece", name: "PieceSensor", type: "dio", channel: 0, inverted: false },
    ];
    project.zones = [
      {
        id: "z-collect",
        name: "COLLECT_ZONE",
        type: "trigger",
        shape: { kind: "rectangle", x1: 0.5, y1: 1.0, x2: 3.0, y2: 3.5 },
        mirror: "both",
      },
      {
        id: "z-score",
        name: "SCORE_ZONE",
        type: "suction",
        shape: { kind: "circle", cx: 4.0, cy: 4.0, radius: 1.0 },
        mirror: "both",
        strength: 0.4,
      },
    ];
    project.superstructure.transitions = [
      {
        id: "tr-zone",
        fromState: "IDLE",
        toState: "INTAKING",
        condition: "inZone",
        zoneId: "z-collect",
      },
    ];
    project.controls.pilotPriority = [
      {
        id: "p-zone-and",
        source: "zone",
        zoneId: "z-collect",
        zoneTrigger: "inZone",
        andConditions: [
          {
            id: "c-no-piece",
            kind: "sensor",
            sensorOwnerId: "roller",
            sensorId: "sen-piece",
            negated: true,
          },
        ],
        request: "INTAKE",
      },
      {
        id: "p-zone-edge",
        source: "zone",
        zoneId: "z-score",
        zoneTrigger: "enteredZone",
        request: "EJECT",
      },
    ];

    expect(validateProject(project, "pt")).toEqual([]);

    const files = generateProjectFiles(project);
    const drive = files.find((f) => f.path.endsWith("/subsystems/drive/Drive.java"))!;
    const superFile = files.find((f) => f.path.endsWith("/SuperStructure.java"))!;
    const cmds = files.find((f) => f.path.endsWith("/SuperStructureCommands.java"))!;
    const container = files.find((f) => f.path.endsWith("/RobotContainer.java"))!;

    expect(drive.content).toContain("public void setZoneHooks(TranslationModifier modifier, Runnable periodicHook)");
    expect(drive.content).toContain("mapped = zoneModifier.apply(this, mapped);");
    expect(drive.content).toContain("zonePeriodic.run();");

    expect(superFile.content).toContain("FieldZones fieldZones, Supplier<Pose2d> poseSupplier");
    expect(superFile.content).toContain("fieldZones.inZone(ZoneId.COLLECT_ZONE, poseSupplier.get())");

    expect(cmds.content).toContain("BooleanSupplier intakeZone");

    expect(container.content).toContain("private final FieldZones fieldZones = new FieldZones();");
    expect(container.content).toContain("drive.setZoneHooks(fieldZones::applyDriveModifiers, () -> fieldZones.periodic(drive.getPose()));");
    expect(container.content).toContain("new SuperStructure(roller, fieldZones, drive::getPose)");
    expect(container.content).toContain("() -> fieldZones.inZone(ZoneId.COLLECT_ZONE, drive.getPose()) && !roller.isPieceSensorTriggered()");
    expect(container.content).toContain("new Trigger(() -> fieldZones.inZone(ZoneId.SCORE_ZONE, drive.getPose())).onTrue(");

    const mermaid = generateSuperStructureMermaid(project);
    expect(mermaid).toContain("IDLE --> INTAKING : inZone(COLLECT_ZONE)");
  });

  it("validates zone names, degenerate shapes, missing drivetrain warning, and broken zone references", () => {
    const project = createSkeletonPreset();
    project.zones = [
      {
        id: "z1",
        name: "NONE",
        type: "trigger",
        shape: { kind: "rectangle", x1: 1.0, y1: 1.0, x2: 1.01, y2: 2.0 },
        mirror: "both",
      },
    ];
    project.superstructure.transitions = [
      {
        id: "tr-missing-zone",
        fromState: "IDLE",
        toState: "INTAKING",
        condition: "outOfZone",
        zoneId: "missing-zone",
      },
    ];
    project.controls.pilotPriority = [
      {
        id: "p-missing-zone",
        source: "zone",
        zoneId: "missing-zone",
        zoneTrigger: "inZone",
        andConditions: [
          { id: "c-missing-zone", kind: "zone", zoneId: "missing-zone" },
        ],
        request: "INTAKE",
      },
    ];

    const issues = validateProject(project, "pt");
    expect(issues.some((i) => i.id === "zones-no-drivetrain" && i.severity === "warning")).toBe(true);
    expect(issues.some((i) => i.id === "zone-invalid-name-z1" && i.severity === "error")).toBe(true);
    expect(issues.some((i) => i.id === "zone-rect-degen-z1" && i.severity === "error")).toBe(true);
    expect(issues.some((i) => i.id === "super-tr-zone-tr-missing-zone" && i.severity === "error")).toBe(true);
    expect(issues.some((i) => i.id === "pilot-zone-p-missing-zone" && i.severity === "error")).toBe(true);
    expect(issues.some((i) => i.id === "pilot-and-zone-p-missing-zone-c-missing-zone" && i.severity === "error")).toBe(true);
  });

  it("provides valid 2026 REBUILT landmarks, presets, alliance mirroring, and live simulation physics", () => {
    const lm = getRebuilt2026Landmarks();
    expect(lm.blueAllianceLineX).toBeCloseTo(4.03, 2);
    expect(lm.redAllianceLineX).toBeCloseTo(16.541 - 4.03, 2);

    const project = createSkeletonPreset();
    project.subsystems[0].motor!.canId = 25;
    project.drivetrain = createDefaultDrivetrain("ctre_swerve");
    project.zones = REBUILT_ZONE_PRESETS.map((p, idx) => {
      const z = { id: `preset-${idx}`, ...p.createZone(16.541, 8.069) };
      return FieldZoneSchema.parse(z);
    });
    expect(validateProject(project, "pt")).toEqual([]);

    const trenchZone = project.zones[0];
    const trenchCenterX =
      trenchZone.shape.kind === "rectangle"
        ? (trenchZone.shape.x1 + trenchZone.shape.x2) / 2
        : 0;
    const trenchCenterY =
      trenchZone.shape.kind === "rectangle"
        ? (trenchZone.shape.y1 + trenchZone.shape.y2) / 2
        : 0;

    expect(isPointInZone(trenchZone, { x: trenchCenterX, y: trenchCenterY }, "Blue", 16.541, 8.069)).toBe(true);
    expect(
      isPointInZone(
        trenchZone,
        { x: 16.541 - trenchCenterX, y: 8.069 - trenchCenterY },
        "Red",
        16.541,
        8.069,
      ),
    ).toBe(true);

    const bumpZone = project.zones[1];
    const bumpCenter =
      bumpZone.shape.kind === "rectangle"
        ? {
            x: (bumpZone.shape.x1 + bumpZone.shape.x2) / 2,
            y: (bumpZone.shape.y1 + bumpZone.shape.y2) / 2,
          }
        : { x: 0, y: 0 };
    const slowEval = evaluateRobotInZones(project.zones, bumpCenter, "Blue", 16.541, 8.069);
    expect(slowEval.speedFactor).toBeCloseTo(0.45, 2);
    expect(slowEval.currentZone?.name).toBe("BUMP_SLOW");

    const forbiddenEval = evaluateRobotInZones(
      project.zones,
      { x: 14.0, y: 4.0 },
      "Blue",
      16.541,
      8.069,
    );
    expect(forbiddenEval.forbiddenAlerts.length).toBeGreaterThan(0);
    expect(Math.hypot(forbiddenEval.forceVec.x, forbiddenEval.forceVec.y)).toBeGreaterThan(0);
  });
});
