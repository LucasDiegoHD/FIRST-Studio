import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseTunerConstantsJava } from "../drivetrain/tuner-parser";
import { generateProjectFiles, getRequiredVendordeps } from "../generator";
import { createDefaultDrivetrain } from "../presets/drivetrain";
import { createSkeletonPreset } from "../presets/skeleton";
import {
  CiprixProjectSchema,
  DrivetrainTypeSchema,
  type DrivetrainType,
} from "../schema/ciprix-project";
import { validateProject } from "../validator";

describe("Phase 4 — Drivetrain, DriveContext, Assistants, TunerConstants, and Vision", () => {
  it("parses Phoenix Tuner X TunerConstants.java into module CAN IDs, offsets, gyro, and speeds", () => {
    const sampleTuner = `
      public class TunerConstants {
        private static final CANBus kCANBus = new CANBus("driveCanivore");
        public static final LinearVelocity kSpeedAt12Volts = MetersPerSecond.of(5.12);
        private static final double kDriveGearRatio = 6.12;
        private static final double kSteerGearRatio = 21.42857;
        private static final Distance kWheelRadius = Inches.of(2.0);
        private static final int kPigeonId = 15;
        private static final boolean kInvertLeftSide = false;
        private static final boolean kInvertRightSide = true;

        private static final int kFrontLeftDriveMotorId = 10;
        private static final int kFrontLeftSteerMotorId = 11;
        private static final int kFrontLeftEncoderId = 12;
        private static final Angle kFrontLeftEncoderOffset = Rotations.of(-0.1234);
        private static final boolean kFrontLeftSteerMotorInverted = true;

        private static final int kFrontRightDriveMotorId = 20;
        private static final int kFrontRightSteerMotorId = 21;
        private static final int kFrontRightEncoderId = 22;
        private static final Angle kFrontRightEncoderOffset = Rotations.of(0.4567);
        private static final boolean kFrontRightSteerMotorInverted = true;

        private static final int kBackLeftDriveMotorId = 30;
        private static final int kBackLeftSteerMotorId = 31;
        private static final int kBackLeftEncoderId = 32;
        private static final Angle kBackLeftEncoderOffset = Rotations.of(0.01);
        private static final boolean kBackLeftSteerMotorInverted = false;

        private static final int kBackRightDriveMotorId = 40;
        private static final int kBackRightSteerMotorId = 41;
        private static final int kBackRightEncoderId = 42;
        private static final Angle kBackRightEncoderOffset = Rotations.of(-0.33);
        private static final boolean kBackRightSteerMotorInverted = true;
      }
    `;

    const parsed = parseTunerConstantsJava(sampleTuner);
    expect(parsed.canBus).toBe("driveCanivore");
    expect(parsed.pigeonId).toBe(15);
    expect(parsed.maxSpeedMps).toBeCloseTo(5.12, 2);
    expect(parsed.driveGearRatio).toBeCloseTo(6.12, 2);
    expect(parsed.steerGearRatio).toBeCloseTo(21.42857, 4);
    expect(parsed.wheelDiameterMeters).toBeCloseTo(0.1016, 4);
    expect(parsed.modules.fl).toEqual({
      driveCanId: 10,
      steerCanId: 11,
      encoderCanId: 12,
      encoderOffsetRot: -0.1234,
      steerInverted: true,
      driveInverted: false,
    });
    expect(parsed.modules.br?.driveCanId).toBe(40);
    expect(parsed.modules.br?.encoderOffsetRot).toBe(-0.33);
  });

  it("generates compiling Drive.java with DriveContext, DriveAccelerationLimits, assistants, and RobotContainer wiring for all 5 bases", () => {
    const types: DrivetrainType[] = [...DrivetrainTypeSchema.options];
    for (const type of types) {
      const base = createSkeletonPreset();
      const dt = createDefaultDrivetrain(type);
      dt.assistants.throttleMap = true;
      dt.assistants.headingStickRotation = type === "ctre_swerve";
      dt.assistants.pidRotation = true;
      dt.assistants.accelerationLimits = true;
      base.drivetrain = dt;
      base.features.driveContextStub = false;

      const parsed = CiprixProjectSchema.parse(base);
      const files = generateProjectFiles(parsed);
      const driveFile = files.find((f) => f.path.endsWith("/subsystems/drive/Drive.java"));
      const containerFile = files.find((f) => f.path.endsWith("/RobotContainer.java"));

      expect(driveFile, `Drive.java missing for ${type}`).toBeDefined();
      expect(driveFile!.content).toContain("implements DriveContext, DriveAccelerationLimits");
      expect(driveFile!.content).toContain('Logger.recordOutput("Drive/Pose"');
      expect(driveFile!.content).toContain('Logger.recordOutput("Drive/ChassisSpeeds"');
      expect(driveFile!.content).toContain("ThrottleMapModifier");
      expect(driveFile!.content).toContain("PIDRotation");
      if (type === "ctre_swerve") {
        expect(driveFile!.content).toContain("HeadingStickRotation");
      }

      expect(containerFile).toBeDefined();
      expect(containerFile!.content).toContain("private final Drive drive;");
      expect(containerFile!.content).toContain("drive.driveTeleopCommand(");
      expect(containerFile!.content).toContain("drive::zeroHeading");
      expect(containerFile!.content).toContain("drive::toggleFieldOriented");
    }
  });

  it("generates YAGSL deploy JSON files and includes required 2026 vendordeps", () => {
    const project = createSkeletonPreset();
    project.drivetrain = createDefaultDrivetrain("yagsl");
    project.drivetrain.gyro.type = "navx";
    project.features.driveContextStub = false;

    const files = generateProjectFiles(project);
    const swerveJson = files.find((f) => f.path === "src/main/deploy/swerve/swervedrive.json");
    expect(swerveJson).toBeDefined();
    expect(JSON.parse(swerveJson!.content)).toMatchObject({
      imu: { type: "navx" },
    });

    const vendordeps = getRequiredVendordeps(project);
    expect(vendordeps).toContain("yagsl-2026.4.1.json");
    expect(vendordeps).toContain("ReduxLib.json");
    expect(vendordeps).toContain("REVLib.json");
    expect(vendordeps).toContain("ThriftyLib.json");
    expect(vendordeps).toContain("Studica-2026.0.0.json");

    for (const vd of [
      "yagsl-2026.4.1.json",
      "ReduxLib.json",
      "ThriftyLib.json",
      "Studica-2026.0.0.json",
    ]) {
      const fullPath = path.join(process.cwd(), "public", "skeleton", "vendordeps", vd);
      expect(fs.existsSync(fullPath), `${vd} exists on disk`).toBe(true);
      const json = JSON.parse(fs.readFileSync(fullPath, "utf8")) as { frcYear: string };
      expect(json.frcYear).toBe("2026");
    }
  });

  it("wires AprilTagVision and VisionIOLimelight in RobotContainer when vision is enabled", () => {
    const project = createSkeletonPreset();
    project.drivetrain = createDefaultDrivetrain("ctre_swerve");
    project.drivetrain.vision = {
      enabled: true,
      cameras: [
        { id: "cam-1", name: "Front", ntName: "limelight-front", stdDevFactor: 1.0 },
        { id: "cam-2", name: "Back", ntName: "limelight-back", stdDevFactor: 1.5 },
      ],
    };

    const files = generateProjectFiles(project);
    const container = files.find((f) => f.path.endsWith("/RobotContainer.java"));
    expect(container).toBeDefined();
    expect(container!.content).toContain("private final AprilTagVision vision;");
    expect(container!.content).toContain("AprilTagFields.k2026RebuiltWelded");
    expect(container!.content).toContain('new VisionIOLimelight("limelight-front", drive::getRotation)');
    expect(container!.content).toContain('new VisionIOLimelight("limelight-back", drive::getRotation)');
    expect(container!.content).toContain("case REPLAY -> new VisionIO() {};");
  });

  it("flags drivetrain CAN ID collisions and pilot button conflicts", () => {
    const project = createSkeletonPreset();
    project.drivetrain = createDefaultDrivetrain("ctre_swerve");
    // Place Roller motor and Pigeon2 on same CAN bus & ID
    project.drivetrain.canBus = "rio";
    project.drivetrain.gyro = { type: "pigeon2", canId: 10, canBus: "rio" };
    // Collide drivetrain resetGyroButton with pilot priority binding "a"
    project.controls.pilotPriority = [
      {
        id: "p-test",
        source: "button",
        button: "a",
        request: project.superstructure.requests[0] ?? "IDLE",
      },
    ];
    project.drivetrain.controls.resetGyroButton = "a";

    const issues = validateProject(project, "en");
    expect(issues.some((i) => i.id.startsWith("dt-can-dup-") && i.severity === "error")).toBe(true);
    expect(issues.some((i) => i.id === "dt-btn-reset-gyro-dup" && i.severity === "warning")).toBe(true);
  });
});
