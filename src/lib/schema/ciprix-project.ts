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

export const FsmTransitionSchema = z.object({
  id: z.string().min(1),
  targetState: z.string().min(1),
  trigger: z.enum(["afterSeconds", "atSetpoint", "stalled", "currentAbove"]),
  value: z.number().min(0).optional(),
  debounceSec: z.number().min(0).max(10).optional(),
});
export type FsmTransition = z.infer<typeof FsmTransitionSchema>;

export const FsmStateSchema = z.object({
  name: z.string().min(1),
  onEnter: SubsystemActionSchema,
  onUpdate: SubsystemActionSchema.optional(),
  transitions: z.array(FsmTransitionSchema).optional(),
  timeoutAfterSec: z.number().positive().optional(),
});
export type FsmState = z.infer<typeof FsmStateSchema>;

export const FsmBindingSchema = z.object({
  request: z.string().min(1),
  entryState: z.string().min(1),
  goalState: z.string().min(1),
  intermediateStates: z.array(z.string()).default([]),
});
export type FsmBinding = z.infer<typeof FsmBindingSchema>;

export const SubsystemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: SubsystemTypeSchema,
  motor: z.object({
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
  }),
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
  fsm: z.object({
    initialState: z.string().min(1),
    initialRequest: z.string().min(1),
    securityState: z.string().optional(),
    states: z.array(FsmStateSchema).min(1),
    requests: z.array(z.string().min(1)).min(1),
    bindings: z.array(FsmBindingSchema),
  }),
  selfTest: z.object({
    enabled: z.boolean(),
    output: z.number().min(-1).max(1),
    minVelocityRps: z.number().min(0),
  }),
});
export type SubsystemConfig = z.infer<typeof SubsystemSchema>;

export const SuperTransitionSchema = z.object({
  id: z.string().min(1),
  fromState: z.string().min(1),
  toState: z.string().min(1),
  condition: z.enum(["allAtGoal", "subsystemAtGoal", "afterSeconds"]),
  subsystemIds: z.array(z.string()).optional(),
  seconds: z.number().positive().optional(),
});
export type SuperTransition = z.infer<typeof SuperTransitionSchema>;

export const SuperStructureSchema = z.object({
  requests: z.array(z.string().min(1)).min(1),
  states: z.array(z.string().min(1)).min(1),
  initialState: z.string().min(1),
  initialRequest: z.string().min(1),
  stateActions: z.record(z.string(), z.record(z.string(), z.string())),
  bindings: z.array(
    z.object({
      request: z.string().min(1),
      entryState: z.string().min(1),
    }),
  ),
  transitions: z.array(SuperTransitionSchema).optional(),
});
export type SuperStructureConfig = z.infer<typeof SuperStructureSchema>;

export const ControlsSchema = z.object({
  pilotPriority: z.array(
    z.object({
      id: z.string().min(1),
      button: XboxButtonSchema,
      request: z.string().min(1),
    }),
  ),
  copilotOverrides: z.array(
    z.object({
      id: z.string().min(1),
      button: XboxButtonSchema,
      subsystemId: z.string().min(1),
      request: z.string().min(1),
    }),
  ),
});
export type ControlsConfig = z.infer<typeof ControlsSchema>;

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
  schemaVersion: z.literal(1),
  project: ProjectMetaSchema,
  subsystems: z.array(SubsystemSchema),
  superstructure: SuperStructureSchema,
  controls: ControlsSchema,
  features: z.object({
    driveContextStub: z.boolean(),
  }),
});
export type CiprixProject = z.infer<typeof CiprixProjectSchema>;
