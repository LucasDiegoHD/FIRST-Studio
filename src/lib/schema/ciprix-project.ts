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

export const SubsystemActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("stop"),
  }),
  z.object({
    type: z.literal("percentOutput"),
    constantName: z.string().min(1),
    value: z.number().min(-1).max(1),
  }),
]);
export type SubsystemAction = z.infer<typeof SubsystemActionSchema>;

export const FsmStateSchema = z.object({
  name: z.string().min(1),
  onEnter: SubsystemActionSchema,
  onUpdate: SubsystemActionSchema.optional(),
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
  type: z.enum(["roller", "generic"]),
  motor: z.object({
    vendor: MotorVendorSchema,
    canId: z.number().int().min(0).max(62),
    canBus: z.string(),
    currentLimitAmps: z.number().int().min(1).max(120),
    neutralMode: z.enum(["coast", "brake"]),
    inverted: z.boolean(),
    gearRatio: z.number().positive(),
    moiKgM2: z.number().positive(),
  }),
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
