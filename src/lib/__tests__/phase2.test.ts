import { describe, expect, it } from "vitest";
import { generateProjectFiles, getRequiredVendordeps } from "../generator";
import { createBlankPreset, createNewSubsystem, createSkeletonPreset } from "../presets/skeleton";
import { CiprixProjectSchema, isMotorSubsystem } from "../schema/ciprix-project";
import { migrateV1toV2, parseProjectWithMigration } from "../schema/migrations";
import { validateProject } from "../validator";

describe("Phase 2 — Schema v2, Multi-Action FSM, LEDs, Rumble, and Sensors", () => {
  it("migrates schema v1 projects with onEnter/onUpdate into schema v2 actions", () => {
    const v1Raw = {
      schemaVersion: 1,
      project: {
        name: "legacy-bot",
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
            gearRatio: 3,
            moiKgM2: 0.001,
          },
          fsm: {
            initialState: "STOPPED",
            initialRequest: "STOP",
            states: [
              { name: "STOPPED", onEnter: { type: "stop" } },
              {
                name: "INTAKING",
                onEnter: { type: "percentOutput", constantName: "INTAKE_OUT", value: 0.7 },
                onUpdate: { type: "percentOutput", constantName: "HOLD_OUT", value: 0.2 },
              },
            ],
            requests: ["STOP", "INTAKE"],
            bindings: [
              { request: "STOP", entryState: "STOPPED", goalState: "STOPPED", intermediateStates: [] },
              { request: "INTAKE", entryState: "INTAKING", goalState: "INTAKING", intermediateStates: [] },
            ],
          },
          selfTest: { enabled: true, output: 0.3, minVelocityRps: 5 },
        },
      ],
      superstructure: {
        requests: ["IDLE", "INTAKE"],
        states: ["IDLE", "INTAKING"],
        initialState: "IDLE",
        initialRequest: "IDLE",
        stateActions: { IDLE: { roller: "STOP" }, INTAKING: { roller: "INTAKE" } },
        bindings: [
          { request: "IDLE", entryState: "IDLE" },
          { request: "INTAKE", entryState: "INTAKING" },
        ],
      },
      controls: {
        pilotPriority: [{ id: "p1", button: "leftBumper", request: "INTAKE" }],
        copilotOverrides: [],
      },
      features: { driveContextStub: false },
    };

    const migrated = migrateV1toV2(v1Raw) as Record<string, unknown>;
    expect(migrated.schemaVersion).toBe(2);

    const parsed = parseProjectWithMigration(v1Raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.migratedFrom).toBe(1);

    const roller = parsed.data.subsystems[0];
    if (!isMotorSubsystem(roller)) throw new Error("expected motor");
    const intakeState = roller.fsm.states.find((s) => s.name === "INTAKING");
    expect(intakeState?.actions).toHaveLength(2);
    expect(intakeState?.actions[0].kind).toBe("motor");
    expect(intakeState?.actions[0].when).toBe("enter");
    expect(intakeState?.actions[1].kind).toBe("motor");
    expect(intakeState?.actions[1].when).toBe("periodic");
    expect(parsed.data.controls.pilotPriority[0].source).toBe("button");
    expect(validateProject(parsed.data)).toEqual([]);
  });

  it("generates decoupled multi-action state with PersistentAlert, Logger, regularTime, and RobotContainer inState wiring", () => {
    const project = createSkeletonPreset();
    const leds = createNewSubsystem("leds", project.subsystems);
    project.subsystems.push(leds);

    const roller = project.subsystems[0];
    if (!isMotorSubsystem(roller)) throw new Error("expected motor");

    roller.fsm.states.push({
      name: "JAMMED",
      regularTimeSec: { min: 0.1, max: 1.0 },
      actions: [
        { id: "act-motor", kind: "motor", when: "enter", action: { type: "stop" } },
        {
          id: "act-led",
          kind: "leds",
          when: "enter",
          ledSubsystemId: leds.id,
          pattern: "blink",
          colorHex: "#ef4444",
          periodSec: 0.25,
          priority: 90,
        },
        {
          id: "act-log",
          kind: "log",
          when: "enter",
          key: "JamAlert",
          level: "error",
          message: "Roller jammed!",
          alertOnDriverStation: true,
        },
        {
          id: "act-rumble",
          kind: "rumble",
          when: "enter",
          controller: "both",
          pattern: "heavyWarning",
          intensity: 0.9,
          seconds: 0.5,
          priority: 90,
        },
      ],
    });
    roller.fsm.requests.push("JAM");
    roller.fsm.bindings.push({
      request: "JAM",
      entryState: "JAMMED",
      goalState: "JAMMED",
      intermediateStates: [],
    });

    expect(() => CiprixProjectSchema.parse(project)).not.toThrow();
    expect(validateProject(project)).toEqual([]);

    const files = new Map(generateProjectFiles(project).map((f) => [f.path, f.content]));
    const rollerJava = files.get("src/main/java/frc/robot/subsystems/roller/Roller.java")!;
    const containerJava = files.get("src/main/java/frc/robot/RobotContainer.java")!;

    // Subsistema mantém Logger + PersistentAlert + regularTime, SEM acoplar LEDs ou Rumble
    expect(rollerJava).toContain('Logger.recordOutput("Roller/JamAlert", "Roller jammed!");');
    expect(rollerJava).toContain('new PersistentAlert("Roller", "Roller jammed!", PersistentAlert.Level.ERROR)');
    expect(rollerJava).toContain(".regularTime(0.1, 1.0)");
    expect(rollerJava).not.toContain("LedArbiter");
    expect(rollerJava).not.toContain("RumbleArbiter");

    // RobotContainer usa roller.inState(...) (NUNCA roller.fsm.inState)
    expect(containerJava).toContain(".inState(RollerState.JAMMED)");
    expect(containerJava).not.toContain(".fsm.inState");
    expect(containerJava).toContain("LedArbiter.holdEffect(");
    expect(containerJava).toContain("rumbleArbiter.trigger(");
    expect(files.has("src/main/java/frc/robot/subsystems/leds/LedArbiter.java")).toBe(true);
    expect(files.has("src/main/java/frc/robot/subsystems/rumble/RumbleArbiter.java")).toBe(true);
  });

  it("warns on rumble priority conflicts, periodic rumble, and rumble outlasting state duration", () => {
    const project = createSkeletonPreset();
    const roller = project.subsystems[0];
    if (!isMotorSubsystem(roller)) throw new Error("expected motor");

    roller.fsm.states[1].timeoutAfterSec = 0.6;
    roller.fsm.states[1].actions.push({
      id: "r-roller",
      kind: "rumble",
      when: "periodic",
      controller: "pilot",
      pattern: "continuous",
      intensity: 0.7,
      seconds: 2.0,
      priority: 70,
    });
    project.superstructure.stateEffects = {
      EJECTING: [
        {
          id: "r-super",
          kind: "rumble",
          when: "enter",
          controller: "both",
          pattern: "pulses",
          intensity: 0.6,
          seconds: 0.4,
          pulseCount: 2,
          priority: 70,
        },
      ],
    };

    const issues = validateProject(project, "pt");
    expect(issues.some((i) => i.id.startsWith("rumble-periodic"))).toBe(true);
    expect(issues.some((i) => i.id.startsWith("rumble-duration"))).toBe(true);
    expect(issues.some((i) => i.id === "rumble-priority-conflict-pilot:70")).toBe(true);
  });

  it("generates AddressableLED and CTRE CANdle LED subsystems with conditional Phoenix6 vendordep", () => {
    const pwmProj = createBlankPreset();
    const sparkShooter = createNewSubsystem("shooter", []);
    if (!isMotorSubsystem(sparkShooter)) throw new Error("expected motor");
    sparkShooter.motor.vendor = "sparkmax";
    const pwmLeds = createNewSubsystem("leds", [sparkShooter]);
    pwmProj.subsystems = [sparkShooter, pwmLeds];

    expect(validateProject(pwmProj)).toEqual([]);
    expect(getRequiredVendordeps(pwmProj)).not.toContain("Phoenix6-26.3.0.json");
    const pwmFiles = new Map(generateProjectFiles(pwmProj).map((f) => [f.path, f.content]));
    const pwmLedsJava = pwmFiles.get("src/main/java/frc/robot/subsystems/leds/Leds.java")!;
    expect(pwmLedsJava).toContain("new AddressableLED(");
    expect(pwmLedsJava).toContain("case PROGRESS_BAR ->");

    const candleProj = createBlankPreset();
    const candleLeds = createNewSubsystem("leds", []);
    candleLeds.leds = { driver: "candle", canId: 30, canBus: "", ledCount: 60 };
    candleProj.subsystems = [sparkShooter, candleLeds];

    expect(validateProject(candleProj)).toEqual([]);
    expect(getRequiredVendordeps(candleProj)).toContain("Phoenix6-26.3.0.json");
    const candleFiles = new Map(generateProjectFiles(candleProj).map((f) => [f.path, f.content]));
    const candleJava = candleFiles.get("src/main/java/frc/robot/subsystems/leds/Leds.java")!;
    expect(candleJava).toContain("new CANdle(");
    expect(candleJava).toContain("new RainbowAnimation(");
  });

  it("generates DIO, CANrange, and LaserCAN presence sensors, getters, transitions, and conditional libgrapplefrc2026 vendordep", () => {
    const project = createSkeletonPreset();
    expect(getRequiredVendordeps(project)).not.toContain("libgrapplefrc2026.json");

    const roller = project.subsystems[0];
    if (!isMotorSubsystem(roller)) throw new Error("expected motor");

    roller.sensors = [
      { id: "s-dio", name: "beamBreak", type: "dio", channel: 0, inverted: true },
      {
        id: "s-canr",
        name: "canRange",
        type: "canrange",
        canId: 20,
        canBus: "canivore",
        thresholdMeters: 0.2,
      },
      { id: "s-lcan", name: "laserCan", type: "lasercan", canId: 21, thresholdMm: 150 },
    ];
    roller.fsm.states[1].transitions = [
      { id: "tr-s", trigger: "sensorTrue", sensorId: "s-dio", targetState: "STOPPED" },
    ];
    project.controls.pilotPriority.push({
      id: "pilot-beam",
      source: "sensor",
      sensorOwnerId: roller.id,
      sensorId: "s-dio",
      sensorTrigger: "onTrue",
      request: "EJECT",
    });

    expect(validateProject(project)).toEqual([]);
    expect(getRequiredVendordeps(project)).toContain("libgrapplefrc2026.json");

    const files = new Map(generateProjectFiles(project).map((f) => [f.path, f.content]));
    const ioJava = files.get("src/main/java/frc/robot/subsystems/roller/RollerIO.java")!;
    const talonJava = files.get("src/main/java/frc/robot/subsystems/roller/RollerIOTalonFX.java")!;
    const simJava = files.get("src/main/java/frc/robot/subsystems/roller/RollerIOSim.java")!;
    const rollerJava = files.get("src/main/java/frc/robot/subsystems/roller/Roller.java")!;
    const containerJava = files.get("src/main/java/frc/robot/RobotContainer.java")!;

    expect(ioJava).toContain("public boolean beamBreak = false;");
    expect(ioJava).toContain("public boolean canRange = false;");
    expect(ioJava).toContain("public boolean laserCan = false;");

    expect(talonJava).toContain("new DigitalInput(0)");
    expect(talonJava).toContain("new CANrange(20,");
    expect(talonJava).toContain("new LaserCan(21)");
    expect(talonJava).toContain("LASERCAN_STATUS_VALID_MEASUREMENT");

    expect(simJava).toContain('new LoggedDashboardBoolean("Roller/Sensors/beamBreak", false)');
    expect(rollerJava).toContain("public boolean isBeamBreakTriggered()");
    expect(rollerJava).toContain("inputs.beamBreak");
    expect(containerJava).toContain("roller.isBeamBreakTriggered()");
  });

  it("emits leftTrigger(double) / rightTrigger(double) when triggerThreshold is configured", () => {
    const project = createSkeletonPreset();
    project.controls.pilotPriority = [
      {
        id: "p-lt",
        source: "button",
        button: "leftTrigger",
        triggerThreshold: 0.25,
        request: "INTAKE",
      },
      {
        id: "p-rt-default",
        source: "button",
        button: "rightTrigger",
        request: "EJECT",
      },
    ];
    project.controls.copilotOverrides = [
      {
        id: "c-rt",
        button: "rightTrigger",
        triggerThreshold: 0.75,
        subsystemId: "roller",
        request: "EJECT",
      },
    ];

    expect(validateProject(project)).toEqual([]);
    const containerJava = generateProjectFiles(project).find((f) =>
      f.path.endsWith("RobotContainer.java"),
    )?.content;

    expect(containerJava).toContain("pilot.leftTrigger(0.25)");
    expect(containerJava).toContain("pilot.rightTrigger()");
    expect(containerJava).toContain("copilot.rightTrigger(0.75).whileTrue(");
  });
});
