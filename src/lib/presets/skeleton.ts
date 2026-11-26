import { toUpperSnake } from "../generator/java-utils";
import type {
  CiprixProject,
  SubsystemConfig,
  SubsystemType,
  XboxButton,
} from "../schema/ciprix-project";

export function createSkeletonPreset(): CiprixProject {
  return {
    schemaVersion: 1,
    project: {
      name: "skeleton",
      teamNumber: 0,
      year: 2026,
      packageName: "frc.robot",
      simMode: "SIM",
      tuningMode: true,
      controllerDeadband: 0.08,
      defaultAlliance: "Blue",
      fieldLengthMeters: 16.541,
      fieldWidthMeters: 8.069,
    },
    subsystems: [
      {
        id: "roller",
        name: "Roller",
        type: "roller",
        motor: {
          vendor: "talonfx",
          canId: 10,
          canBus: "",
          currentLimitAmps: 40,
          neutralMode: "coast",
          inverted: false,
          gearRatio: 3.0,
          moiKgM2: 0.001,
        },
        fsm: {
          initialState: "STOPPED",
          initialRequest: "STOP",
          states: [
            {
              name: "STOPPED",
              onEnter: { type: "stop" },
            },
            {
              name: "INTAKING",
              onEnter: {
                type: "percentOutput",
                constantName: "INTAKE_OUTPUT",
                value: 0.6,
              },
            },
            {
              name: "EJECTING",
              onEnter: {
                type: "percentOutput",
                constantName: "EJECT_OUTPUT",
                value: -0.5,
              },
            },
          ],
          requests: ["STOP", "INTAKE", "EJECT"],
          bindings: [
            {
              request: "STOP",
              entryState: "STOPPED",
              goalState: "STOPPED",
              intermediateStates: [],
            },
            {
              request: "INTAKE",
              entryState: "INTAKING",
              goalState: "INTAKING",
              intermediateStates: [],
            },
            {
              request: "EJECT",
              entryState: "EJECTING",
              goalState: "EJECTING",
              intermediateStates: [],
            },
          ],
        },
        selfTest: {
          enabled: true,
          output: 0.3,
          minVelocityRps: 5,
        },
      },
    ],
    superstructure: {
      requests: ["IDLE", "INTAKE", "EJECT"],
      states: ["IDLE", "INTAKING", "EJECTING"],
      initialState: "IDLE",
      initialRequest: "IDLE",
      stateActions: {
        IDLE: { roller: "STOP" },
        INTAKING: { roller: "INTAKE" },
        EJECTING: { roller: "EJECT" },
      },
      bindings: [
        { request: "IDLE", entryState: "IDLE" },
        { request: "INTAKE", entryState: "INTAKING" },
        { request: "EJECT", entryState: "EJECTING" },
      ],
    },
    controls: {
      pilotPriority: [
        { id: "pilot-eject", button: "rightBumper", request: "EJECT" },
        { id: "pilot-intake", button: "leftBumper", request: "INTAKE" },
      ],
      copilotOverrides: [
        {
          id: "copilot-intake",
          button: "a",
          subsystemId: "roller",
          request: "INTAKE",
        },
        {
          id: "copilot-eject",
          button: "b",
          subsystemId: "roller",
          request: "EJECT",
        },
      ],
    },
    features: {
      driveContextStub: false,
    },
  };
}

export function createBlankPreset(): CiprixProject {
  return {
    schemaVersion: 1,
    project: {
      name: "my-robot",
      teamNumber: 0,
      year: 2026,
      packageName: "frc.robot",
      simMode: "SIM",
      tuningMode: true,
      controllerDeadband: 0.08,
      defaultAlliance: "Blue",
      fieldLengthMeters: 16.541,
      fieldWidthMeters: 8.069,
    },
    subsystems: [],
    superstructure: {
      requests: ["IDLE"],
      states: ["IDLE"],
      initialState: "IDLE",
      initialRequest: "IDLE",
      stateActions: {
        IDLE: {},
      },
      bindings: [{ request: "IDLE", entryState: "IDLE" }],
    },
    controls: {
      pilotPriority: [],
      copilotOverrides: [],
    },
    features: {
      driveContextStub: false,
    },
  };
}

const BASE_NAMES: Record<SubsystemType, string> = {
  roller: "Roller",
  shooter: "Shooter",
  arm: "Arm",
  elevator: "Elevator",
  climber: "Climber",
  turret: "Turret",
  wrist: "Wrist",
  indexer: "Indexer",
  hood: "Hood",
  generic: "Motor",
};

export function createNewSubsystem(
  type: SubsystemType,
  existing: SubsystemConfig[],
): SubsystemConfig {
  const usedIds = new Set(existing.map((s) => s.id));
  const usedNames = new Set(existing.map((s) => s.name.toLowerCase()));
  const usedCanIds = new Set<number>();
  for (const s of existing) {
    usedCanIds.add(s.motor.canId);
    if (s.motor.follower?.enabled) usedCanIds.add(s.motor.follower.canId);
  }

  const baseName = BASE_NAMES[type];
  let suffix = 1;
  while (
    usedNames.has((suffix === 1 ? baseName : `${baseName}${suffix}`).toLowerCase()) ||
    usedIds.has(suffix === 1 ? type : `${type}_${suffix}`)
  ) {
    suffix++;
  }

  const name = suffix === 1 ? baseName : `${baseName}${suffix}`;
  const id = suffix === 1 ? type : `${type}_${suffix}`;

  let canId = 10;
  while (usedCanIds.has(canId) && canId < 62) {
    canId++;
  }

  if (type === "roller") {
    return {
      id,
      name,
      type: "roller",
      motor: {
        vendor: "talonfx",
        canId,
        canBus: "",
        currentLimitAmps: 40,
        neutralMode: "coast",
        inverted: false,
        gearRatio: 3.0,
        moiKgM2: 0.001,
      },
      fsm: {
        initialState: "STOPPED",
        initialRequest: "STOP",
        states: [
          { name: "STOPPED", onEnter: { type: "stop" } },
          {
            name: "INTAKING",
            onEnter: { type: "percentOutput", constantName: "INTAKE_OUTPUT", value: 0.6 },
          },
          {
            name: "EJECTING",
            onEnter: { type: "percentOutput", constantName: "EJECT_OUTPUT", value: -0.5 },
          },
        ],
        requests: ["STOP", "INTAKE", "EJECT"],
        bindings: [
          { request: "STOP", entryState: "STOPPED", goalState: "STOPPED", intermediateStates: [] },
          { request: "INTAKE", entryState: "INTAKING", goalState: "INTAKING", intermediateStates: [] },
          { request: "EJECT", entryState: "EJECTING", goalState: "EJECTING", intermediateStates: [] },
        ],
      },
      selfTest: { enabled: true, output: 0.3, minVelocityRps: 5 },
    };
  }

  if (type === "shooter") {
    return {
      id,
      name,
      type: "shooter",
      motor: {
        vendor: "talonfx",
        canId,
        canBus: "",
        currentLimitAmps: 60,
        neutralMode: "coast",
        inverted: false,
        gearRatio: 1.5,
        moiKgM2: 0.005,
      },
      closedLoop: { kP: 0.08, kI: 0, kD: 0, kS: 0.15, kV: 0.12, kA: 0.01, kG: 0 },
      fsm: {
        initialState: "IDLE",
        initialRequest: "STOP",
        securityState: "IDLE",
        states: [
          { name: "IDLE", onEnter: { type: "stop" } },
          {
            name: "RAMPING",
            onEnter: { type: "velocityRpm", constantName: "SHOOT_RPM", value: 4500 },
            transitions: [
              { id: "tr-ramp-ready", targetState: "READY", trigger: "atSetpoint", debounceSec: 0.1 },
            ],
            timeoutAfterSec: 3.0,
          },
          {
            name: "READY",
            onEnter: { type: "velocityRpm", constantName: "SHOOT_RPM", value: 4500 },
          },
        ],
        requests: ["STOP", "SHOOT"],
        bindings: [
          { request: "STOP", entryState: "IDLE", goalState: "IDLE", intermediateStates: [] },
          { request: "SHOOT", entryState: "RAMPING", goalState: "READY", intermediateStates: [] },
        ],
      },
      selfTest: { enabled: true, output: 0.25, minVelocityRps: 10 },
    };
  }

  if (type === "arm") {
    return {
      id,
      name,
      type: "arm",
      motor: {
        vendor: "talonfx",
        canId,
        canBus: "",
        currentLimitAmps: 40,
        neutralMode: "brake",
        inverted: false,
        gearRatio: 50.0,
        moiKgM2: 0.08,
      },
      physics: { massKg: 4.0, lengthMeters: 0.5 },
      closedLoop: {
        kP: 8.0,
        kI: 0,
        kD: 0.2,
        kS: 0.15,
        kV: 0.8,
        kA: 0.02,
        kG: 0.35,
        minLimit: -10,
        maxLimit: 100,
        limitUnit: "deg",
      },
      fsm: {
        initialState: "STOWED",
        initialRequest: "STOW",
        states: [
          {
            name: "STOWED",
            onEnter: { type: "positionDeg", constantName: "STOW_ANGLE", value: 0 },
          },
          {
            name: "INTAKE",
            onEnter: { type: "positionDeg", constantName: "INTAKE_ANGLE", value: 25 },
          },
          {
            name: "SCORE",
            onEnter: { type: "positionDeg", constantName: "SCORE_ANGLE", value: 85 },
          },
        ],
        requests: ["STOW", "INTAKE", "SCORE"],
        bindings: [
          { request: "STOW", entryState: "STOWED", goalState: "STOWED", intermediateStates: [] },
          { request: "INTAKE", entryState: "INTAKE", goalState: "INTAKE", intermediateStates: [] },
          { request: "SCORE", entryState: "SCORE", goalState: "SCORE", intermediateStates: [] },
        ],
      },
      selfTest: { enabled: false, output: 0.15, minVelocityRps: 1 },
    };
  }

  if (type === "elevator") {
    return {
      id,
      name,
      type: "elevator",
      motor: {
        vendor: "talonfx",
        canId,
        canBus: "",
        currentLimitAmps: 50,
        neutralMode: "brake",
        inverted: false,
        gearRatio: 9.0,
        moiKgM2: 0.004,
      },
      physics: { massKg: 6.0, drumRadiusMeters: 0.025 },
      closedLoop: {
        kP: 6.0,
        kI: 0,
        kD: 0.1,
        kS: 0.12,
        kV: 0.5,
        kA: 0.02,
        kG: 0.4,
        minLimit: 0,
        maxLimit: 7.5,
        limitUnit: "rot",
      },
      fsm: {
        initialState: "BOTTOM",
        initialRequest: "HOME",
        states: [
          {
            name: "BOTTOM",
            onEnter: { type: "positionRot", constantName: "BOTTOM_POS", value: 0 },
          },
          {
            name: "MID",
            onEnter: { type: "positionRot", constantName: "MID_POS", value: 2.5 },
          },
          {
            name: "HIGH",
            onEnter: { type: "positionRot", constantName: "HIGH_POS", value: 5.5 },
          },
        ],
        requests: ["HOME", "MID", "HIGH"],
        bindings: [
          { request: "HOME", entryState: "BOTTOM", goalState: "BOTTOM", intermediateStates: [] },
          { request: "MID", entryState: "MID", goalState: "MID", intermediateStates: [] },
          { request: "HIGH", entryState: "HIGH", goalState: "HIGH", intermediateStates: [] },
        ],
      },
      selfTest: { enabled: false, output: 0.15, minVelocityRps: 1 },
    };
  }

  if (type === "climber") {
    return {
      id,
      name,
      type: "climber",
      motor: {
        vendor: "talonfx",
        canId,
        canBus: "",
        currentLimitAmps: 60,
        neutralMode: "brake",
        inverted: false,
        gearRatio: 25.0,
        moiKgM2: 0.006,
      },
      physics: { massKg: 8.0, drumRadiusMeters: 0.02 },
      fsm: {
        initialState: "IDLE",
        initialRequest: "STOP",
        states: [
          { name: "IDLE", onEnter: { type: "stop" } },
          {
            name: "EXTENDING",
            onEnter: { type: "percentOutput", constantName: "EXTEND_OUTPUT", value: 0.7 },
          },
          {
            name: "CLIMBING",
            onEnter: { type: "percentOutput", constantName: "CLIMB_OUTPUT", value: -0.8 },
          },
        ],
        requests: ["STOP", "EXTEND", "CLIMB"],
        bindings: [
          { request: "STOP", entryState: "IDLE", goalState: "IDLE", intermediateStates: [] },
          { request: "EXTEND", entryState: "EXTENDING", goalState: "EXTENDING", intermediateStates: [] },
          { request: "CLIMB", entryState: "CLIMBING", goalState: "CLIMBING", intermediateStates: [] },
        ],
      },
      selfTest: { enabled: false, output: 0.2, minVelocityRps: 1 },
    };
  }

  if (type === "turret") {
    return {
      id,
      name,
      type: "turret",
      motor: {
        vendor: "talonfx",
        canId,
        canBus: "",
        currentLimitAmps: 35,
        neutralMode: "brake",
        inverted: false,
        gearRatio: 40.0,
        moiKgM2: 0.04,
      },
      closedLoop: {
        kP: 6.0,
        kI: 0,
        kD: 0.15,
        kS: 0.12,
        kV: 0.6,
        kA: 0.01,
        kG: 0,
        minLimit: -180,
        maxLimit: 180,
        limitUnit: "deg",
        positionWrap: true,
      },
      fsm: {
        initialState: "HOME",
        initialRequest: "HOME",
        states: [
          { name: "HOME", onEnter: { type: "positionDeg", constantName: "HOME_ANGLE", value: 0 } },
          { name: "LEFT", onEnter: { type: "positionDeg", constantName: "LEFT_ANGLE", value: -45 } },
          { name: "RIGHT", onEnter: { type: "positionDeg", constantName: "RIGHT_ANGLE", value: 45 } },
        ],
        requests: ["HOME", "LEFT", "RIGHT"],
        bindings: [
          { request: "HOME", entryState: "HOME", goalState: "HOME", intermediateStates: [] },
          { request: "LEFT", entryState: "LEFT", goalState: "LEFT", intermediateStates: [] },
          { request: "RIGHT", entryState: "RIGHT", goalState: "RIGHT", intermediateStates: [] },
        ],
      },
      selfTest: { enabled: false, output: 0.15, minVelocityRps: 1 },
    };
  }

  if (type === "wrist") {
    return {
      id,
      name,
      type: "wrist",
      motor: {
        vendor: "talonfx",
        canId,
        canBus: "",
        currentLimitAmps: 30,
        neutralMode: "brake",
        inverted: false,
        gearRatio: 30.0,
        moiKgM2: 0.02,
      },
      physics: { massKg: 1.8, lengthMeters: 0.25 },
      closedLoop: {
        kP: 8.0,
        kI: 0,
        kD: 0.2,
        kS: 0.12,
        kV: 0.5,
        kA: 0.01,
        kG: 0.22,
        minLimit: -30,
        maxLimit: 120,
        limitUnit: "deg",
        smartMotion: { maxVelRps: 2.0, maxAccelRpss: 6.0, allowedError: 1.5 },
      },
      fsm: {
        initialState: "STOWED",
        initialRequest: "STOW",
        states: [
          { name: "STOWED", onEnter: { type: "smartPositionDeg", constantName: "STOW_ANGLE", value: 0 } },
          { name: "INTAKE", onEnter: { type: "smartPositionDeg", constantName: "INTAKE_ANGLE", value: 35 } },
          { name: "SCORE", onEnter: { type: "smartPositionDeg", constantName: "SCORE_ANGLE", value: 100 } },
        ],
        requests: ["STOW", "INTAKE", "SCORE"],
        bindings: [
          { request: "STOW", entryState: "STOWED", goalState: "STOWED", intermediateStates: [] },
          { request: "INTAKE", entryState: "INTAKE", goalState: "INTAKE", intermediateStates: [] },
          { request: "SCORE", entryState: "SCORE", goalState: "SCORE", intermediateStates: [] },
        ],
      },
      selfTest: { enabled: false, output: 0.15, minVelocityRps: 1 },
    };
  }

  if (type === "indexer") {
    return {
      id,
      name,
      type: "indexer",
      motor: {
        vendor: "talonfx",
        canId,
        canBus: "",
        currentLimitAmps: 35,
        neutralMode: "coast",
        inverted: false,
        gearRatio: 2.0,
        moiKgM2: 0.001,
      },
      protection: {
        stallReversalEnabled: true,
        stallCurrentAmps: 30,
        stallTimeSec: 0.35,
        reverseTimeSec: 0.25,
        reverseOutput: 0.3,
      },
      fsm: {
        initialState: "IDLE",
        initialRequest: "STOP",
        securityState: "IDLE",
        states: [
          { name: "IDLE", onEnter: { type: "stop" } },
          {
            name: "INDEXING",
            onEnter: { type: "percentOutput", constantName: "INDEX_OUTPUT", value: 0.45 },
            transitions: [
              { id: "tr-idx-cur", targetState: "HOLDING", trigger: "currentAbove", value: 24 },
            ],
          },
          { name: "HOLDING", onEnter: { type: "stop" } },
          {
            name: "FEEDING",
            onEnter: { type: "percentOutput", constantName: "FEED_OUTPUT", value: 0.85 },
          },
          {
            name: "UNJAMMING",
            onEnter: { type: "percentOutput", constantName: "UNJAM_OUTPUT", value: -0.5 },
            transitions: [
              { id: "tr-idx-unjam", targetState: "IDLE", trigger: "afterSeconds", value: 0.4 },
            ],
          },
        ],
        requests: ["STOP", "INDEX", "FEED", "UNJAM"],
        bindings: [
          { request: "STOP", entryState: "IDLE", goalState: "IDLE", intermediateStates: [] },
          { request: "INDEX", entryState: "INDEXING", goalState: "HOLDING", intermediateStates: [] },
          { request: "FEED", entryState: "FEEDING", goalState: "FEEDING", intermediateStates: [] },
          { request: "UNJAM", entryState: "UNJAMMING", goalState: "IDLE", intermediateStates: [] },
        ],
      },
      selfTest: { enabled: true, output: 0.3, minVelocityRps: 5 },
    };
  }

  if (type === "hood") {
    return {
      id,
      name,
      type: "hood",
      motor: {
        vendor: "talonfx",
        canId,
        canBus: "",
        currentLimitAmps: 20,
        neutralMode: "brake",
        inverted: false,
        gearRatio: 60.0,
        moiKgM2: 0.008,
      },
      physics: { massKg: 0.8, lengthMeters: 0.18 },
      closedLoop: {
        kP: 10.0,
        kI: 0,
        kD: 0.25,
        kS: 0.1,
        kV: 0.4,
        kA: 0.01,
        kG: 0.12,
        minLimit: 10,
        maxLimit: 65,
        limitUnit: "deg",
        smartMotion: { maxVelRps: 1.5, maxAccelRpss: 5.0, allowedError: 1.0 },
      },
      fsm: {
        initialState: "CLOSE",
        initialRequest: "CLOSE",
        states: [
          { name: "CLOSE", onEnter: { type: "smartPositionDeg", constantName: "CLOSE_ANGLE", value: 15 } },
          { name: "MID", onEnter: { type: "smartPositionDeg", constantName: "MID_ANGLE", value: 35 } },
          { name: "FAR", onEnter: { type: "smartPositionDeg", constantName: "FAR_ANGLE", value: 55 } },
        ],
        requests: ["CLOSE", "MID", "FAR"],
        bindings: [
          { request: "CLOSE", entryState: "CLOSE", goalState: "CLOSE", intermediateStates: [] },
          { request: "MID", entryState: "MID", goalState: "MID", intermediateStates: [] },
          { request: "FAR", entryState: "FAR", goalState: "FAR", intermediateStates: [] },
        ],
      },
      selfTest: { enabled: false, output: 0.15, minVelocityRps: 1 },
    };
  }

  return {
    id,
    name,
    type: "generic",
    motor: {
      vendor: "talonfx",
      canId,
      canBus: "",
      currentLimitAmps: 40,
      neutralMode: "brake",
      inverted: false,
      gearRatio: 1.0,
      moiKgM2: 0.002,
    },
    fsm: {
      initialState: "IDLE",
      initialRequest: "STOP",
      states: [
        { name: "IDLE", onEnter: { type: "stop" } },
        {
          name: "RUNNING",
          onEnter: { type: "percentOutput", constantName: "RUN_OUTPUT", value: 0.5 },
        },
      ],
      requests: ["STOP", "RUN"],
      bindings: [
        { request: "STOP", entryState: "IDLE", goalState: "IDLE", intermediateStates: [] },
        { request: "RUN", entryState: "RUNNING", goalState: "RUNNING", intermediateStates: [] },
      ],
    },
    selfTest: { enabled: true, output: 0.25, minVelocityRps: 3 },
  };
}

export function createCompetitionPreset(): CiprixProject {
  const shooter = createNewSubsystem("shooter", []);
  const hood = createNewSubsystem("hood", [shooter]);
  const indexer = createNewSubsystem("indexer", [shooter, hood]);

  return {
    schemaVersion: 1,
    project: {
      name: "competition-shooter",
      teamNumber: 9047,
      year: 2026,
      packageName: "frc.robot",
      simMode: "SIM",
      tuningMode: true,
      controllerDeadband: 0.08,
      defaultAlliance: "Blue",
      fieldLengthMeters: 16.541,
      fieldWidthMeters: 8.069,
    },
    subsystems: [shooter, hood, indexer],
    superstructure: {
      requests: ["IDLE", "INTAKING", "SHOOT"],
      states: ["IDLE", "INTAKING", "PREP_SHOOT", "SHOOTING"],
      initialState: "IDLE",
      initialRequest: "IDLE",
      stateActions: {
        IDLE: { [shooter.id]: "STOP", [hood.id]: "CLOSE", [indexer.id]: "STOP" },
        INTAKING: { [shooter.id]: "STOP", [hood.id]: "CLOSE", [indexer.id]: "INDEX" },
        PREP_SHOOT: { [shooter.id]: "SHOOT", [hood.id]: "FAR", [indexer.id]: "STOP" },
        SHOOTING: { [shooter.id]: "SHOOT", [hood.id]: "FAR", [indexer.id]: "FEED" },
      },
      bindings: [
        { request: "IDLE", entryState: "IDLE" },
        { request: "INTAKING", entryState: "INTAKING" },
        { request: "SHOOT", entryState: "PREP_SHOOT" },
      ],
      transitions: [
        {
          id: "tr-super-prep-shoot",
          fromState: "PREP_SHOOT",
          toState: "SHOOTING",
          condition: "subsystemAtGoal",
          subsystemIds: [shooter.id, hood.id],
        },
      ],
    },
    controls: {
      pilotPriority: [
        { id: "pilot-shoot", button: "rightTrigger", request: "SHOOT" },
        { id: "pilot-intake", button: "leftTrigger", request: "INTAKING" },
      ],
      copilotOverrides: [
        { id: "cop-unjam", button: "x", subsystemId: indexer.id, request: "UNJAM" },
      ],
    },
    features: {
      driveContextStub: false,
    },
  };
}

const PRIMARY_REQUEST_BY_TYPE: Record<SubsystemType, string> = {
  roller: "INTAKE",
  shooter: "SHOOT",
  arm: "SCORE",
  elevator: "HIGH",
  climber: "CLIMB",
  turret: "RIGHT",
  wrist: "SCORE",
  indexer: "FEED",
  hood: "FAR",
  generic: "RUN",
};

const PILOT_BUTTON_ORDER: XboxButton[] = [
  "rightBumper",
  "leftBumper",
  "rightTrigger",
  "leftTrigger",
  "a",
  "b",
  "x",
  "y",
  "povUp",
  "povDown",
  "povLeft",
  "povRight",
  "leftStick",
  "rightStick",
  "start",
  "back",
];

const COPILOT_BUTTON_ORDER: XboxButton[] = [
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
  "leftStick",
  "rightStick",
  "start",
  "back",
];

export function addSubsystemWithDefaults(
  project: CiprixProject,
  type: SubsystemType,
): { project: CiprixProject; createdId: string } {
  const created: SubsystemConfig = {
    ...createNewSubsystem(type, project.subsystems),
    isDefaultTemplate: true,
  };

  const preferred = PRIMARY_REQUEST_BY_TYPE[type];
  const primaryReq = created.fsm.requests.includes(preferred)
    ? preferred
    : created.fsm.requests.find((r) => r !== created.fsm.initialRequest);

  const nextStateActions: Record<string, Record<string, string>> = {};
  for (const stateName of project.superstructure.states) {
    nextStateActions[stateName] = {
      ...(project.superstructure.stateActions[stateName] ?? {}),
      [created.id]: created.fsm.initialRequest,
    };
  }

  const nextRequests = [...project.superstructure.requests];
  const nextStates = [...project.superstructure.states];
  const nextBindings = [...project.superstructure.bindings];
  let superName: string | undefined;

  if (primaryReq) {
    const existingReqSet = new Set(nextRequests);
    const existingStateSet = new Set(nextStates);
    const isFree = (candidate: string) =>
      !existingReqSet.has(candidate) && !existingStateSet.has(candidate);

    const prefixed = `${toUpperSnake(created.name)}_${primaryReq}`;
    let candidate = isFree(primaryReq) ? primaryReq : prefixed;
    let suffix = 2;
    while (!isFree(candidate)) {
      candidate = `${prefixed}_${suffix}`;
      suffix++;
    }
    superName = candidate;

    nextRequests.push(superName);
    nextStates.push(superName);
    nextBindings.push({ request: superName, entryState: superName });

    const row: Record<string, string> = {};
    for (const sub of project.subsystems) {
      row[sub.id] = sub.fsm.initialRequest;
    }
    row[created.id] = primaryReq;
    nextStateActions[superName] = row;
  }

  const nextPilotPriority = [...project.controls.pilotPriority];
  const usedPilotButtons = new Set(nextPilotPriority.map((p) => p.button));
  const freePilot = PILOT_BUTTON_ORDER.find((b) => !usedPilotButtons.has(b));
  if (superName && freePilot) {
    nextPilotPriority.push({
      id: `pilot-${created.id}-${Date.now().toString(36)}`,
      button: freePilot,
      request: superName,
    });
  }

  const nextCopilotOverrides = [...project.controls.copilotOverrides];
  const usedCopilotButtons = new Set(nextCopilotOverrides.map((c) => c.button));
  const copilotRequests = created.fsm.requests
    .filter((r) => r !== created.fsm.initialRequest)
    .slice(0, 2);

  copilotRequests.forEach((req, idx) => {
    const freeCopilot = COPILOT_BUTTON_ORDER.find((b) => !usedCopilotButtons.has(b));
    if (!freeCopilot) return;
    usedCopilotButtons.add(freeCopilot);
    nextCopilotOverrides.push({
      id: `copilot-${created.id}-${idx}-${Date.now().toString(36)}`,
      button: freeCopilot,
      subsystemId: created.id,
      request: req,
    });
  });

  return {
    createdId: created.id,
    project: {
      ...project,
      subsystems: [...project.subsystems, created],
      superstructure: {
        ...project.superstructure,
        requests: nextRequests,
        states: nextStates,
        stateActions: nextStateActions,
        bindings: nextBindings,
      },
      controls: {
        pilotPriority: nextPilotPriority,
        copilotOverrides: nextCopilotOverrides,
      },
    },
  };
}

export function duplicateSubsystemWithDefaults(
  project: CiprixProject,
  sourceId: string,
): { project: CiprixProject; createdId: string } | null {
  const sourceIdx = project.subsystems.findIndex((s) => s.id === sourceId);
  if (sourceIdx === -1) return null;

  const source = project.subsystems[sourceIdx];
  const usedIds = new Set(project.subsystems.map((s) => s.id));
  const usedNames = new Set(project.subsystems.map((s) => s.name.toLowerCase()));
  const usedCanIds = new Set<number>();
  for (const s of project.subsystems) {
    usedCanIds.add(s.motor.canId);
    if (s.motor.follower?.enabled) usedCanIds.add(s.motor.follower.canId);
  }

  const baseName = source.name.replace(/\d+$/, "") || BASE_NAMES[source.type];
  let suffix = 2;
  while (
    usedNames.has(`${baseName}${suffix}`.toLowerCase()) ||
    usedIds.has(`${source.type}_${suffix}`)
  ) {
    suffix++;
  }
  const nextName = `${baseName}${suffix}`;
  const nextId = `${source.type}_${suffix}`;

  let nextCanId = 10;
  while (usedCanIds.has(nextCanId) && nextCanId < 62) {
    nextCanId++;
  }
  usedCanIds.add(nextCanId);

  const clone: SubsystemConfig = structuredClone(source);
  clone.id = nextId;
  clone.name = nextName;
  clone.isDefaultTemplate = false;
  clone.motor.canId = nextCanId;

  if (clone.motor.follower?.enabled) {
    let followerCanId = nextCanId + 1;
    while (usedCanIds.has(followerCanId) && followerCanId < 62) {
      followerCanId++;
    }
    usedCanIds.add(followerCanId);
    clone.motor.follower.canId = followerCanId;
  }

  const nextSubsystems = [...project.subsystems];
  nextSubsystems.splice(sourceIdx + 1, 0, clone);

  const nextStateActions: Record<string, Record<string, string>> = {};
  for (const stateName of project.superstructure.states) {
    nextStateActions[stateName] = {
      ...(project.superstructure.stateActions[stateName] ?? {}),
      [clone.id]: clone.fsm.initialRequest,
    };
  }

  return {
    createdId: clone.id,
    project: {
      ...project,
      subsystems: nextSubsystems,
      superstructure: {
        ...project.superstructure,
        stateActions: nextStateActions,
      },
    },
  };
}
