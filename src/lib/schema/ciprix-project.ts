import { z } from "zod";

export const MotorVendorSchema = z.enum(["talonfx", "sparkmax", "talonsrx"]);
export type MotorVendor = z.infer<typeof MotorVendorSchema>;

export const XboxButtonSchema = z.enum([
  "a",
  "b",
  "x",
  "y",
  "leftBumper",
  "rightBumper",
  "leftTrigger",
  "rightTrigger",
  "leftStick",
  "rightStick",
  "povUp",
  "povDown",
  "povLeft",
  "povRight",
  "start",
  "back",
]);
export type XboxButton = z.infer<typeof XboxButtonSchema>;

export const SubsystemTypeSchema = z.enum([
  "roller",
  "shooter",
  "arm",
  "elevator",
  "climber",
  "turret",
  "wrist",
  "indexer",
  "hood",
  "leds",
  "generic",
]);
export type SubsystemType = z.infer<typeof SubsystemTypeSchema>;

export const SubsystemActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("stop"),
  }),
  z.object({
    type: z.literal("percentOutput"),
    constantName: z.string().min(1),
    value: z.number().min(-1).max(1),
  }),
  z.object({
    type: z.literal("velocityRpm"),
    constantName: z.string().min(1),
    value: z.number().min(-10000).max(10000),
  }),
  z.object({
    type: z.literal("positionDeg"),
    constantName: z.string().min(1),
    value: z.number().min(-360).max(360),
  }),
  z.object({
    type: z.literal("positionRot"),
    constantName: z.string().min(1),
    value: z.number().min(-100).max(200),
  }),
  z.object({
    type: z.literal("smartPositionDeg"),
    constantName: z.string().min(1),
    value: z.number().min(-360).max(360),
  }),
  z.object({
    type: z.literal("smartPositionRot"),
    constantName: z.string().min(1),
    value: z.number().min(-100).max(200),
  }),
]);
export type SubsystemAction = z.infer<typeof SubsystemActionSchema>;

export const ActionTimingSchema = z.enum(["enter", "periodic", "exit"]);
export type ActionTiming = z.infer<typeof ActionTimingSchema>;

export const LedPatternSchema = z.enum([
  "solid",
  "blink",
  "breathe",
  "rainbow",
  "progressBar",
  "alliance",
]);
export type LedPattern = z.infer<typeof LedPatternSchema>;

export const RumblePatternSchema = z.enum([
  "continuous",
  "pulses",
  "zigZag",
  "rampUp",
  "lightConfirm",
  "heavyWarning",
]);
export type RumblePattern = z.infer<typeof RumblePatternSchema>;

export const LedEffectActionFields = {
  ledSubsystemId: z.string().min(1),
  pattern: LedPatternSchema,
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondaryColorHex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  periodSec: z.number().min(0.05).max(10),
  priority: z.number().int().min(0).max(100),
};

export const LogEffectActionFields = {
  key: z.string().min(1),
  level: z.enum(["info", "warning", "error"]),
  message: z.string().min(1),
  alertOnDriverStation: z.boolean(),
};

export const RumbleEffectActionFields = {
  controller: z.enum(["pilot", "copilot", "both"]),
  pattern: RumblePatternSchema,
  intensity: z.number().min(0).max(1),
  lightIntensity: z.number().min(0).max(1).optional(),
  seconds: z.number().min(0.05).max(5),
  pulseCount: z.number().int().min(1).max(20).optional(),
  priority: z.number().int().min(0).max(100),
};

export const StateActionSchema = z.discriminatedUnion("kind", [
  z.object({
    id: z.string().min(1),
    kind: z.literal("motor"),
    when: ActionTimingSchema.default("enter"),
    action: SubsystemActionSchema,
  }),
  z.object({
    id: z.string().min(1),
    kind: z.literal("leds"),
    when: ActionTimingSchema.default("enter"),
    ...LedEffectActionFields,
  }),
  z.object({
    id: z.string().min(1),
    kind: z.literal("log"),
    when: ActionTimingSchema.default("enter"),
    ...LogEffectActionFields,
  }),
  z.object({
    id: z.string().min(1),
    kind: z.literal("rumble"),
    when: ActionTimingSchema.default("enter"),
    ...RumbleEffectActionFields,
  }),
]);
export type StateAction = z.infer<typeof StateActionSchema>;

export const SuperStateEffectSchema = z.discriminatedUnion("kind", [
  z.object({
    id: z.string().min(1),
    kind: z.literal("leds"),
    when: ActionTimingSchema.default("enter"),
    ...LedEffectActionFields,
  }),
  z.object({
    id: z.string().min(1),
    kind: z.literal("log"),
    when: ActionTimingSchema.default("enter"),
    ...LogEffectActionFields,
  }),
  z.object({
    id: z.string().min(1),
    kind: z.literal("rumble"),
    when: ActionTimingSchema.default("enter"),
    ...RumbleEffectActionFields,
  }),
]);
export type SuperStateEffect = z.infer<typeof SuperStateEffectSchema>;

export const SensorTypeSchema = z.enum(["dio", "canrange", "lasercan"]);
export type SensorType = z.infer<typeof SensorTypeSchema>;

export const SensorConfigSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    type: z.literal("dio"),
    channel: z.number().int().min(0).max(25),
    inverted: z.boolean(),
  }),
  z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    type: z.literal("canrange"),
    canId: z.number().int().min(0).max(62),
    canBus: z.string(),
    thresholdMeters: z.number().min(0.01).max(4.0),
  }),
  z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    type: z.literal("lasercan"),
    canId: z.number().int().min(0).max(62),
    thresholdMm: z.number().int().min(10).max(4000),
  }),
]);
export type SensorConfig = z.infer<typeof SensorConfigSchema>;

export const LedHardwareConfigSchema = z.object({
  driver: z.enum(["addressableLed", "candle"]),
  pwmPort: z.number().int().min(0).max(9).optional(),
  ledCount: z.number().int().min(1).max(300),
  canId: z.number().int().min(0).max(62).optional(),
  canBus: z.string().optional(),
});
export type LedHardwareConfig = z.infer<typeof LedHardwareConfigSchema>;

export const FsmTransitionSchema = z.object({
  id: z.string().min(1),
  targetState: z.string().min(1),
  trigger: z.enum([
    "afterSeconds",
    "atSetpoint",
    "stalled",
    "currentAbove",
    "sensorTrue",
    "sensorFalse",
  ]),
  value: z.number().min(0).optional(),
  debounceSec: z.number().min(0).max(10).optional(),
  sensorId: z.string().min(1).optional(),
});
export type FsmTransition = z.infer<typeof FsmTransitionSchema>;

export const FsmStateSchema = z.object({
  name: z.string().min(1),
  actions: z.array(StateActionSchema).min(1),
  transitions: z.array(FsmTransitionSchema).optional(),
  timeoutAfterSec: z.number().positive().optional(),
  regularTimeSec: z
    .object({
      min: z.number().min(0),
      max: z.number().positive(),
    })
    .optional(),
});
export type FsmState = z.infer<typeof FsmStateSchema>;

export const FsmBindingSchema = z.object({
  request: z.string().min(1),
  entryState: z.string().min(1),
  goalState: z.string().min(1),
  intermediateStates: z.array(z.string()).default([]),
});
export type FsmBinding = z.infer<typeof FsmBindingSchema>;

export const MotorConfigSchema = z.object({
  vendor: MotorVendorSchema,
  canId: z.number().int().min(0).max(62),
  canBus: z.string(),
  currentLimitAmps: z.number().int().min(1).max(120),
  neutralMode: z.enum(["coast", "brake"]),
  inverted: z.boolean(),
  gearRatio: z.number().positive(),
  moiKgM2: z.number().positive(),
  follower: z
    .object({
      enabled: z.boolean(),
      canId: z.number().int().min(0).max(62),
      inverted: z.boolean(),
    })
    .optional(),
});
export type MotorConfig = z.infer<typeof MotorConfigSchema>;

export const SubsystemFsmSchema = z.object({
  initialState: z.string().min(1),
  initialRequest: z.string().min(1),
  securityState: z.string().optional(),
  states: z.array(FsmStateSchema).min(1),
  requests: z.array(z.string().min(1)).min(1),
  bindings: z.array(FsmBindingSchema),
});
export type SubsystemFsm = z.infer<typeof SubsystemFsmSchema>;

export const SelfTestSchema = z.object({
  enabled: z.boolean(),
  output: z.number().min(-1).max(1),
  minVelocityRps: z.number().min(0),
});
export type SelfTestConfig = z.infer<typeof SelfTestSchema>;

export const SubsystemSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    type: SubsystemTypeSchema,
    isDefaultTemplate: z.boolean().optional(),
    motor: MotorConfigSchema.optional(),
    leds: LedHardwareConfigSchema.optional(),
    sensors: z.array(SensorConfigSchema).optional(),
    closedLoop: z
      .object({
        kP: z.number(),
        kI: z.number(),
        kD: z.number(),
        kS: z.number(),
        kV: z.number(),
        kA: z.number(),
        kG: z.number(),
        minLimit: z.number().optional(),
        maxLimit: z.number().optional(),
        limitUnit: z.enum(["deg", "rot"]).optional(),
        positionWrap: z.boolean().optional(),
        smartMotion: z
          .object({
            maxVelRps: z.number().positive(),
            maxAccelRpss: z.number().positive(),
            allowedError: z.number().min(0),
          })
          .optional(),
      })
      .optional(),
    physics: z
      .object({
        massKg: z.number().positive().optional(),
        lengthMeters: z.number().positive().optional(),
        drumRadiusMeters: z.number().positive().optional(),
      })
      .optional(),
    protection: z
      .object({
        stallReversalEnabled: z.boolean().optional(),
        stallCurrentAmps: z.number().positive().optional(),
        stallTimeSec: z.number().positive().optional(),
        reverseTimeSec: z.number().positive().optional(),
        reverseOutput: z.number().min(0).max(1).optional(),
        stallDetectionEnabled: z.boolean().optional(),
        currentWarningAmps: z.number().min(0).optional(),
        openLoopRampSec: z.number().min(0).optional(),
        closedLoopRampSec: z.number().min(0).optional(),
      })
      .optional(),
    fsm: SubsystemFsmSchema.optional(),
    selfTest: SelfTestSchema.optional(),
  })
  .superRefine((sub, ctx) => {
    if (sub.type === "leds") {
      if (!sub.leds) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["leds"],
          message: "Subsistema de LEDs requer configuração de hardware leds.",
        });
      }
      return;
    }
    if (!sub.motor) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["motor"],
        message: "Subsistema de mecanismo requer configuração motor.",
      });
    }
    if (!sub.fsm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fsm"],
        message: "Subsistema de mecanismo requer máquina de estados fsm.",
      });
    }
    if (!sub.selfTest) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["selfTest"],
        message: "Subsistema de mecanismo requer selfTest.",
      });
    }
  });
export type SubsystemConfig = z.infer<typeof SubsystemSchema>;

export type MotorSubsystemConfig = SubsystemConfig & {
  type: Exclude<SubsystemType, "leds">;
  motor: MotorConfig;
  fsm: SubsystemFsm;
  selfTest: SelfTestConfig;
};

export type LedSubsystemConfig = SubsystemConfig & {
  type: "leds";
  leds: LedHardwareConfig;
};

export function isMotorSubsystem(sub: SubsystemConfig): sub is MotorSubsystemConfig {
  return sub.type !== "leds" && !!sub.motor && !!sub.fsm && !!sub.selfTest;
}

export function isLedSubsystem(sub: SubsystemConfig): sub is LedSubsystemConfig {
  return sub.type === "leds" && !!sub.leds;
}

export function getPrimaryMotorAction(state?: FsmState): SubsystemAction {
  if (!state) return { type: "stop" };
  const enterMotor = state.actions.find(
    (a): a is Extract<StateAction, { kind: "motor" }> =>
      a.kind === "motor" && a.when === "enter",
  );
  if (enterMotor) return enterMotor.action;
  const anyMotor = state.actions.find(
    (a): a is Extract<StateAction, { kind: "motor" }> => a.kind === "motor",
  );
  return anyMotor ? anyMotor.action : { type: "stop" };
}

export const SuperTransitionSchema = z.object({
  id: z.string().min(1),
  fromState: z.string().min(1),
  toState: z.string().min(1),
  condition: z.enum([
    "allAtGoal",
    "subsystemAtGoal",
    "afterSeconds",
    "sensorTrue",
    "sensorFalse",
  ]),
  subsystemIds: z.array(z.string()).optional(),
  seconds: z.number().positive().optional(),
  sensorOwnerId: z.string().min(1).optional(),
  sensorId: z.string().min(1).optional(),
});
export type SuperTransition = z.infer<typeof SuperTransitionSchema>;

export const SuperStructureSchema = z.object({
  requests: z.array(z.string().min(1)).min(1),
  states: z.array(z.string().min(1)).min(1),
  initialState: z.string().min(1),
  initialRequest: z.string().min(1),
  stateActions: z.record(z.string(), z.record(z.string(), z.string())),
  stateEffects: z.record(z.string(), z.array(SuperStateEffectSchema)).optional(),
  bindings: z.array(
    z.object({
      request: z.string().min(1),
      entryState: z.string().min(1),
    }),
  ),
  transitions: z.array(SuperTransitionSchema).optional(),
});
export type SuperStructureConfig = z.infer<typeof SuperStructureSchema>;

export const PilotPriorityBindingSchema = z.object({
  id: z.string().min(1),
  source: z.enum(["button", "sensor"]).default("button"),
  button: XboxButtonSchema.optional(),
  triggerThreshold: z.number().min(0.05).max(1.0).optional(),
  sensorOwnerId: z.string().min(1).optional(),
  sensorId: z.string().min(1).optional(),
  sensorTrigger: z.enum(["whileTrue", "onTrue", "whileFalse", "onFalse"]).optional(),
  request: z.string().min(1),
});
export type PilotPriorityBinding = z.infer<typeof PilotPriorityBindingSchema>;

export const ControlsSchema = z.object({
  pilotPriority: z.array(PilotPriorityBindingSchema),
  copilotOverrides: z.array(
    z.object({
      id: z.string().min(1),
      button: XboxButtonSchema,
      triggerThreshold: z.number().min(0.05).max(1.0).optional(),
      subsystemId: z.string().min(1),
      request: z.string().min(1),
    }),
  ),
});
export type ControlsConfig = z.infer<typeof ControlsSchema>;

export const DrivetrainTypeSchema = z.enum([
  "ctre_swerve",
  "yagsl",
  "akit_swerve",
  "differential",
  "mecanum",
]);
export type DrivetrainType = z.infer<typeof DrivetrainTypeSchema>;

export const GyroTypeSchema = z.enum(["pigeon2", "navx", "adis16470"]);
export type GyroType = z.infer<typeof GyroTypeSchema>;

export const SwerveModuleConfigSchema = z.object({
  driveCanId: z.number().int().min(0).max(62),
  steerCanId: z.number().int().min(0).max(62),
  encoderCanId: z.number().int().min(0).max(62),
  encoderOffsetRot: z.number().min(-1).max(1),
  driveInverted: z.boolean(),
  steerInverted: z.boolean(),
});
export type SwerveModuleConfig = z.infer<typeof SwerveModuleConfigSchema>;

export const VisionCameraSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  ntName: z.string().min(1),
  stdDevFactor: z.number().positive().max(10),
});
export type VisionCameraConfig = z.infer<typeof VisionCameraSchema>;

export const DrivetrainConfigSchema = z.object({
  enabled: z.boolean(),
  type: DrivetrainTypeSchema,
  motorVendor: MotorVendorSchema,
  canBus: z.string(),
  gyro: z.object({
    type: GyroTypeSchema,
    canId: z.number().int().min(0).max(62),
    canBus: z.string(),
  }),
  maxSpeedMps: z.number().positive().max(12),
  maxAngularSpeedRadPerSec: z.number().positive().max(30),
  maxLinearAccelMps2: z.number().positive().max(50),
  maxAngularAccelRadPerSec2: z.number().positive().max(100),
  wheelDiameterMeters: z.number().positive().max(0.5),
  driveGearRatio: z.number().positive().max(100),
  steerGearRatio: z.number().positive().max(100),
  trackWidthMeters: z.number().positive().max(2),
  wheelBaseMeters: z.number().positive().max(2),
  currentLimitAmps: z.number().int().min(10).max(120),
  fieldOrientedDefault: z.boolean(),
  assistants: z.object({
    throttleMap: z.boolean(),
    headingStickRotation: z.boolean(),
    pidRotation: z.boolean(),
    rotKp: z.number().min(0),
    rotKi: z.number().min(0),
    rotKd: z.number().min(0),
    accelerationLimits: z.boolean(),
  }),
  controls: z.object({
    resetGyroButton: XboxButtonSchema.optional(),
    toggleFieldOrientedButton: XboxButtonSchema.optional(),
  }),
  modules: z.object({
    fl: SwerveModuleConfigSchema,
    fr: SwerveModuleConfigSchema,
    bl: SwerveModuleConfigSchema,
    br: SwerveModuleConfigSchema,
  }),
  differential: z.object({
    leftLeaderId: z.number().int().min(0).max(62),
    leftFollowerId: z.number().int().min(0).max(62).optional(),
    rightLeaderId: z.number().int().min(0).max(62),
    rightFollowerId: z.number().int().min(0).max(62).optional(),
    leftInverted: z.boolean(),
    rightInverted: z.boolean(),
  }),
  tunerConstantsRaw: z.string().optional(),
  vision: z.object({
    enabled: z.boolean(),
    cameras: z.array(VisionCameraSchema),
  }),
});
export type DrivetrainConfig = z.infer<typeof DrivetrainConfigSchema>;

export const ProjectMetaSchema = z.object({
  name: z.string().min(1),
  teamNumber: z.number().int().min(0).max(99999),
  year: z.literal(2026),
  packageName: z.string().min(1),
  simMode: z.enum(["SIM", "REPLAY"]),
  tuningMode: z.boolean(),
  controllerDeadband: z.number().min(0).max(0.5),
  defaultAlliance: z.enum(["Blue", "Red"]),
  fieldLengthMeters: z.number().positive(),
  fieldWidthMeters: z.number().positive(),
});
export type ProjectMeta = z.infer<typeof ProjectMetaSchema>;

export const CiprixProjectSchema = z.object({
  schemaVersion: z.literal(2),
  project: ProjectMetaSchema,
  drivetrain: DrivetrainConfigSchema.optional(),
  subsystems: z.array(SubsystemSchema),
  superstructure: SuperStructureSchema,
  controls: ControlsSchema,
  features: z.object({
    driveContextStub: z.boolean(),
  }),
});
export type CiprixProject = z.infer<typeof CiprixProjectSchema>;
