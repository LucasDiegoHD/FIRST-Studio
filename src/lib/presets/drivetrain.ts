import type { DrivetrainConfig, DrivetrainType } from "../schema/ciprix-project";

export function createDefaultDrivetrain(
  type: DrivetrainType = "ctre_swerve",
): DrivetrainConfig {
  return {
    enabled: true,
    type,
    motorVendor: type === "differential" || type === "mecanum" ? "sparkmax" : "talonfx",
    canBus: type === "ctre_swerve" ? "canivore" : "",
    gyro: {
      type: type === "ctre_swerve" ? "pigeon2" : "navx",
      canId: 1,
      canBus: type === "ctre_swerve" ? "canivore" : "",
    },
    maxSpeedMps: type === "differential" ? 3.8 : 4.6,
    maxAngularSpeedRadPerSec: 8.5,
    maxLinearAccelMps2: 12.0,
    maxAngularAccelRadPerSec2: 18.0,
    wheelDiameterMeters: type === "differential" ? 0.1524 : 0.1016,
    driveGearRatio: type === "differential" ? 8.45 : 6.75,
    steerGearRatio: 21.4285,
    trackWidthMeters: 0.56,
    wheelBaseMeters: 0.56,
    currentLimitAmps: 60,
    fieldOrientedDefault: true,
    assistants: {
      throttleMap: true,
      headingStickRotation: false,
      pidRotation: true,
      rotKp: 6.0,
      rotKi: 0.0,
      rotKd: 0.2,
      accelerationLimits: true,
    },
    controls: {
      resetGyroButton: "start",
      toggleFieldOrientedButton: "back",
    },
    modules: {
      fl: {
        driveCanId: 2,
        steerCanId: 3,
        encoderCanId: 4,
        encoderOffsetRot: 0.0,
        driveInverted: false,
        steerInverted: true,
      },
      fr: {
        driveCanId: 5,
        steerCanId: 6,
        encoderCanId: 7,
        encoderOffsetRot: 0.0,
        driveInverted: true,
        steerInverted: true,
      },
      bl: {
        driveCanId: 8,
        steerCanId: 9,
        encoderCanId: 10,
        encoderOffsetRot: 0.0,
        driveInverted: false,
        steerInverted: true,
      },
      br: {
        driveCanId: 11,
        steerCanId: 12,
        encoderCanId: 13,
        encoderOffsetRot: 0.0,
        driveInverted: true,
        steerInverted: true,
      },
    },
    differential: {
      leftLeaderId: 2,
      leftFollowerId: 3,
      rightLeaderId: 4,
      rightFollowerId: 5,
      leftInverted: false,
      rightInverted: true,
    },
    vision: {
      enabled: false,
      cameras: [
        {
          id: "cam-front",
          name: "Front",
          ntName: "limelight-front",
          stdDevFactor: 1.0,
        },
      ],
    },
    antiTipping: {
      enabled: false,
      mode: "accel",
      tippingThresholdDeg: 10.0,
      maxCorrectionSpeedMps: 2.0,
      kP: 0.2,
      comHeightMeters: 0.25,
      dynamicAccelLimits: true,
    },
    teleopPathfinding: [],
  };
}

export interface DrivetrainQuickPreset {
  id: string;
  label: string;
  apply: (curr: DrivetrainConfig) => DrivetrainConfig;
}

export const DRIVETRAIN_PRESETS: DrivetrainQuickPreset[] = [
  {
    id: "mk4i_l2",
    label: "SDS MK4i L2 (Kraken/Falcon)",
    apply: (curr) => ({
      ...curr,
      type: curr.type === "differential" || curr.type === "mecanum" ? "ctre_swerve" : curr.type,
      motorVendor: "talonfx",
      wheelDiameterMeters: 0.1016,
      driveGearRatio: 6.75,
      steerGearRatio: 21.4285,
      maxSpeedMps: 4.6,
    }),
  },
  {
    id: "maxswerve",
    label: "REV MAXSwerve (NEO)",
    apply: (curr) => ({
      ...curr,
      type: "yagsl",
      motorVendor: "sparkmax",
      wheelDiameterMeters: 0.0762,
      driveGearRatio: 4.71,
      steerGearRatio: 9424 / 203,
      maxSpeedMps: 4.4,
    }),
  },
  {
    id: "kitbot_tank",
    label: "KitBot Tank 6\" (8.45:1)",
    apply: (curr) => ({
      ...curr,
      type: "differential",
      motorVendor: "sparkmax",
      wheelDiameterMeters: 0.1524,
      driveGearRatio: 8.45,
      maxSpeedMps: 3.8,
      trackWidthMeters: 0.56,
    }),
  },
  {
    id: "mecanum_basic",
    label: "Mecanum 6\" (8.45:1)",
    apply: (curr) => ({
      ...curr,
      type: "mecanum",
      motorVendor: "sparkmax",
      wheelDiameterMeters: 0.1524,
      driveGearRatio: 8.45,
      maxSpeedMps: 3.6,
    }),
  },
];
