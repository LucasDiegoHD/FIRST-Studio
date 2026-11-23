import type { CiprixProject, SubsystemConfig } from "../schema/ciprix-project";

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

export function createNewSubsystem(
  type: "roller" | "generic",
  existing: SubsystemConfig[],
): SubsystemConfig {
  const usedIds = new Set(existing.map((s) => s.id));
  const usedNames = new Set(existing.map((s) => s.name.toLowerCase()));
  const usedCanIds = new Set(existing.map((s) => s.motor.canId));

  const baseName = type === "roller" ? "Roller" : "Motor";
  let suffix = 1;
  while (
    usedNames.has(
      (suffix === 1 && type === "roller" ? baseName : `${baseName}${suffix}`).toLowerCase(),
    ) ||
    usedIds.has(suffix === 1 && type === "roller" ? "roller" : `${type}_${suffix}`)
  ) {
    suffix++;
  }

  const name = suffix === 1 && type === "roller" ? baseName : `${baseName}${suffix}`;
  const id = suffix === 1 && type === "roller" ? "roller" : `${type}_${suffix}`;

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
