import type { CiprixProject, SubsystemConfig, SubsystemType } from "../schema/ciprix-project";

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
  generic: "Motor",
};

export function createNewSubsystem(
  type: SubsystemType,
  existing: SubsystemConfig[],
): SubsystemConfig {
  const usedIds = new Set(existing.map((s) => s.id));
  const usedNames = new Set(existing.map((s) => s.name.toLowerCase()));
  const usedCanIds = new Set(existing.map((s) => s.motor.canId));

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
        states: [
          { name: "IDLE", onEnter: { type: "stop" } },
          {
            name: "WARMUP",
            onEnter: { type: "velocityRpm", constantName: "WARMUP_RPM", value: 2000 },
          },
          {
            name: "SHOOTING",
            onEnter: { type: "velocityRpm", constantName: "SHOOT_RPM", value: 4500 },
          },
        ],
        requests: ["STOP", "WARMUP", "SHOOT"],
        bindings: [
          { request: "STOP", entryState: "IDLE", goalState: "IDLE", intermediateStates: [] },
          { request: "WARMUP", entryState: "WARMUP", goalState: "WARMUP", intermediateStates: [] },
          { request: "SHOOT", entryState: "SHOOTING", goalState: "SHOOTING", intermediateStates: [] },
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
