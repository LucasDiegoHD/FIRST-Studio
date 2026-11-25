import type { SubsystemAction, SubsystemConfig } from "../../schema/ciprix-project";
import { formatDouble, toPascalCase, toPackageSegment, toUpperSnake } from "../java-utils";

export interface GeneratedFile {
  path: string;
  content: string;
}

function renderActionCall(constantsClass: string, action: SubsystemAction): string {
  if (action.type === "stop") {
    return "io.controlMotor().stop()";
  }
  const constName = toUpperSnake(action.constantName);
  switch (action.type) {
    case "percentOutput":
      return `io.controlMotor().runPercentOutput(${constantsClass}.${constName})`;
    case "velocityRpm":
      return `io.controlMotor().runVelocity(${constantsClass}.${constName})`;
    case "positionDeg":
    case "positionRot":
      return `io.controlMotor().runPosition(${constantsClass}.${constName})`;
    case "smartPositionDeg":
    case "smartPositionRot":
      return `io.controlMotor().runSmartPosition(${constantsClass}.${constName})`;
  }
}

interface CollectedConstant {
  name: string;
  actionType: Exclude<SubsystemAction["type"], "stop">;
  value: number;
}

function collectActionConstants(subsystem: SubsystemConfig): CollectedConstant[] {
  const seen = new Map<string, CollectedConstant>();
  for (const state of subsystem.fsm.states) {
    if (state.onEnter.type !== "stop") {
      const name = toUpperSnake(state.onEnter.constantName);
      seen.set(name, { name, actionType: state.onEnter.type, value: state.onEnter.value });
    }
    if (state.onUpdate && state.onUpdate.type !== "stop") {
      const name = toUpperSnake(state.onUpdate.constantName);
      seen.set(name, { name, actionType: state.onUpdate.type, value: state.onUpdate.value });
    }
  }
  return Array.from(seen.values());
}

function renderConstantDeclaration(c: CollectedConstant): string {
  switch (c.actionType) {
    case "percentOutput":
      return `  public static final double ${c.name} = ${formatDouble(c.value)};`;
    case "velocityRpm":
      return `  public static final AngularVelocity ${c.name} = RPM.of(${formatDouble(c.value)});`;
    case "positionDeg":
    case "smartPositionDeg":
      return `  public static final Angle ${c.name} = Degrees.of(${formatDouble(c.value)});`;
    case "positionRot":
    case "smartPositionRot":
      return `  public static final Angle ${c.name} = Rotations.of(${formatDouble(c.value)});`;
  }
}

export function getVendorIoClassName(subsystemName: string, vendor: SubsystemConfig["motor"]["vendor"]): string {
  const className = toPascalCase(subsystemName);
  switch (vendor) {
    case "talonfx":
      return `${className}IOTalonFX`;
    case "sparkmax":
      return `${className}IOSparkMax`;
    case "talonsrx":
      return `${className}IOTalonSRX`;
  }
}

export function generateSingleMotorSubsystem(
  subsystem: SubsystemConfig,
  basePackage: string,
): GeneratedFile[] {
  const className = toPascalCase(subsystem.name);
  const subPkg = toPackageSegment(subsystem.name);
  const pkgPrefix = basePackage.replace(/\./g, "/");
  const baseDir = `src/main/java/${pkgPrefix}/subsystems/${subPkg}`;
  const fullSubPkg = `${basePackage}.subsystems.${subPkg}`;

  const constantsClass = `${className}Constants`;
  const requestEnum = `${className}Request`;
  const stateEnum = `${className}State`;
  const ioInterface = `${className}IO`;
  const inputsAutoLogged = `${className}IOInputsAutoLogged`;
  const vendorClass = getVendorIoClassName(subsystem.name, subsystem.motor.vendor);

  const actionConstants = collectActionConstants(subsystem);
  const constantLines =
    actionConstants.length > 0
      ? actionConstants.map(renderConstantDeclaration).join("\n") + "\n\n"
      : "";

  const unitImports = new Set<string>(["Amps"]);
  const measureImports = new Set<string>();
  const cl = subsystem.closedLoop;
  const pr = subsystem.protection;
  const hasFollower = Boolean(subsystem.motor.follower?.enabled);

  for (const c of actionConstants) {
    if (c.actionType === "velocityRpm") {
      unitImports.add("RPM");
      measureImports.add("AngularVelocity");
    } else if (c.actionType === "positionDeg" || c.actionType === "smartPositionDeg") {
      unitImports.add("Degrees");
      measureImports.add("Angle");
    } else if (c.actionType === "positionRot" || c.actionType === "smartPositionRot") {
      unitImports.add("Rotations");
      measureImports.add("Angle");
    }
  }

  if (cl?.minLimit !== undefined && cl?.maxLimit !== undefined) {
    unitImports.add(cl.limitUnit === "deg" ? "Degrees" : "Rotations");
  }
  if (cl?.smartMotion) {
    unitImports.add("RotationsPerSecond");
    unitImports.add("RotationsPerSecondPerSecond");
    unitImports.add(cl.limitUnit === "rot" ? "Rotations" : "Degrees");
  }
  if (cl && subsystem.type === "shooter") unitImports.add("RPM");
  if (cl && (subsystem.type === "arm" || subsystem.type === "wrist" || subsystem.type === "hood" || subsystem.type === "turret")) {
    unitImports.add("Degrees");
  }
  if (cl && subsystem.type === "elevator") unitImports.add("Rotations");

  const unitImportBlock = Array.from(unitImports)
    .sort()
    .map((u) => `import static edu.wpi.first.units.Units.${u};`)
    .join("\n");

  const measureImportBlock =
    measureImports.size > 0
      ? "\n" +
        Array.from(measureImports)
          .sort()
          .map((m) => `import edu.wpi.first.units.measure.${m};`)
          .join("\n") +
        "\n"
      : "";

  const neutralChain = subsystem.motor.neutralMode === "brake" ? ".brakeMode()" : ".coastMode()";
  const invertChain = subsystem.motor.inverted ? ".inverted(true)" : "";

  const configExtras: string[] = [];
  if (subsystem.type === "arm" || subsystem.type === "wrist" || subsystem.type === "hood") {
    configExtras.push("          .armGravity()");
  }
  if (cl) {
    configExtras.push(
      `          .pid(0, ${formatDouble(cl.kP)}, ${formatDouble(cl.kI)}, ${formatDouble(cl.kD)})`,
    );
    configExtras.push(
      `          .svag(0, ${formatDouble(cl.kS)}, ${formatDouble(cl.kV)}, ${formatDouble(cl.kA)}, ${formatDouble(cl.kG)})`,
    );
    if (cl.smartMotion) {
      const errUnit = cl.limitUnit === "rot" ? "Rotations" : "Degrees";
      configExtras.push(
        `          .smartMotion(0, RotationsPerSecond.of(${formatDouble(cl.smartMotion.maxVelRps)}), RotationsPerSecondPerSecond.of(${formatDouble(cl.smartMotion.maxAccelRpss)}), ${errUnit}.of(${formatDouble(cl.smartMotion.allowedError)}))`,
      );
    }
    if (cl.minLimit !== undefined && cl.maxLimit !== undefined) {
      const unitCls = cl.limitUnit === "deg" ? "Degrees" : "Rotations";
      const limitMethod = cl.positionWrap ? "withPositionWrap" : "softLimits";
      configExtras.push(
        `          .${limitMethod}(${unitCls}.of(${formatDouble(cl.minLimit)}), ${unitCls}.of(${formatDouble(cl.maxLimit)}))`,
      );
    }
    if (subsystem.type === "shooter") {
      configExtras.push("          .withVelocityTolerance(RPM.of(100.0))");
    } else if (
      subsystem.type === "arm" ||
      subsystem.type === "wrist" ||
      subsystem.type === "hood" ||
      subsystem.type === "turret"
    ) {
      configExtras.push("          .withPositionTolerance(Degrees.of(2.0))");
    } else if (subsystem.type === "elevator") {
      configExtras.push("          .withPositionTolerance(Rotations.of(0.15))");
    }
  }
  if (pr?.openLoopRampSec && pr.openLoopRampSec > 0) {
    configExtras.push(`          .openLoopRamp(${formatDouble(pr.openLoopRampSec)})`);
  }
  if (pr?.closedLoopRampSec && pr.closedLoopRampSec > 0) {
    configExtras.push(`          .closedLoopRamp(${formatDouble(pr.closedLoopRampSec)})`);
  }
  if (pr?.currentWarningAmps && pr.currentWarningAmps > 0) {
    configExtras.push(
      `          .withCurrentWarning(Amps.of(${formatDouble(pr.currentWarningAmps)}), 25)`,
    );
  }
  if (pr?.stallReversalEnabled) {
    configExtras.push(
      `          .withStallReversal(Amps.of(${formatDouble(pr.stallCurrentAmps ?? 35)}), ${formatDouble(pr.stallTimeSec ?? 0.4)}, ${formatDouble(pr.reverseTimeSec ?? 0.3)}, ${formatDouble(pr.reverseOutput ?? 0.3)})`,
    );
  } else if (pr?.stallDetectionEnabled) {
    configExtras.push(
      `          .withStallDetection(Amps.of(${formatDouble(pr.stallCurrentAmps ?? 35)}), ${formatDouble(pr.stallTimeSec ?? 0.4)})`,
    );
  }

  const extraChain = configExtras.length > 0 ? "\n" + configExtras.join("\n") : "";
  const followerIdLine = hasFollower
    ? `\n  public static final int FOLLOWER_ID = ${subsystem.motor.follower!.canId};`
    : "";
  const followerConfigBlock = hasFollower
    ? `\n\n  public static final MotorConfig FOLLOWER_CONFIG =\n      new MotorConfig().currentLimit(Amps.of(${subsystem.motor.currentLimitAmps}))${neutralChain}.withMotorLeader(MOTOR_ID).withFollowerInverted(${Boolean(subsystem.motor.follower!.inverted)});`
    : "";

  // 1. Constants
  const constantsContent = `package ${fullSubPkg};

${unitImportBlock}
${measureImportBlock}
import org.ciprix.interfaces.motor.advanced.MotorConfig;

/** ${className} constants: ids, power levels, motor configuration, requests and states. */
public final class ${constantsClass} {
  private ${constantsClass}() {}

  public static final int MOTOR_ID = ${subsystem.motor.canId};${followerIdLine}

${constantLines}  public static final MotorConfig MOTOR_CONFIG =
      new MotorConfig().currentLimit(Amps.of(${subsystem.motor.currentLimitAmps}))${neutralChain}${invertChain}${extraChain};${followerConfigBlock}

  /** What the SuperStructure (or the co-driver) asks of the ${className.toLowerCase()}. */
  public enum ${requestEnum} {
${subsystem.fsm.requests.map((r) => `    ${r}`).join(",\n")}
  }

  /** States of the ${className.toLowerCase()} state machine. */
  public enum ${stateEnum} {
${subsystem.fsm.states.map((s) => `    ${s.name}`).join(",\n")}
  }
}
`;

  // 2. IO Interface
  const followerInputsLine = hasFollower
    ? "\n    public MotorIOInputs followerInputs = new MotorIOInputs();"
    : "";
  const ioContent = `package ${fullSubPkg};

import org.ciprix.interfaces.motor.advanced.MotorController;
import org.ciprix.interfaces.motor.advanced.MotorControllerNone;
import org.ciprix.interfaces.motor.advanced.MotorIO.MotorIOInputs;
import org.ciprix.interfaces.subsystem.SubsystemIO;
import org.littletonrobotics.junction.AutoLog;

/** The ${className.toLowerCase()} hardware layer: the subsystem only talks to the motor through here. */
public interface ${ioInterface} extends SubsystemIO<${inputsAutoLogged}> {
  @AutoLog
  class ${ioInterface}Inputs {
    public MotorIOInputs motorInputs = new MotorIOInputs();${followerInputsLine}
  }

  @Override
  default void updateInputs(${inputsAutoLogged} inputs) {}

  default MotorController controlMotor() {
    return new MotorControllerNone();
  }
}
`;

  // 3. Vendor IO
  const busName = subsystem.motor.canBus.trim();
  const canBusArg = busName && busName !== "rio" ? `new CANBus("${busName}")` : "new CANBus()";
  const followerUpdateLine = hasFollower ? "\n    follower.updateInputs(inputs.followerInputs);" : "";

  let vendorContent = "";
  if (subsystem.motor.vendor === "talonfx") {
    const followerDecl = hasFollower
      ? `\n  private final MotorIO follower =\n      new MotorIOTalonFX(\n          "${className}/Follower", ${constantsClass}.FOLLOWER_ID, ${canBusArg}, ${constantsClass}.FOLLOWER_CONFIG);`
      : "";
    vendorContent = `package ${fullSubPkg};

import com.ctre.phoenix6.CANBus;
import org.ciprix.interfaces.motor.MotorIOTalonFX;
import org.ciprix.interfaces.motor.advanced.MotorController;
import org.ciprix.interfaces.motor.advanced.MotorIO;

/** Real ${className} hardware using CTRE Talon FX. */
public class ${vendorClass} implements ${ioInterface} {
  private final MotorIO motor =
      new MotorIOTalonFX(
          "${className}/Motor", ${constantsClass}.MOTOR_ID, ${canBusArg}, ${constantsClass}.MOTOR_CONFIG);${followerDecl}

  @Override
  public void updateInputs(${inputsAutoLogged} inputs) {
    motor.updateInputs(inputs.motorInputs);${followerUpdateLine}
  }

  @Override
  public MotorController controlMotor() {
    return motor.getMotorController();
  }
}
`;
  } else if (subsystem.motor.vendor === "sparkmax") {
    const followerDecl = hasFollower
      ? `\n  private final MotorIO follower =\n      new MotorIOSparkMax("${className}/Follower", ${constantsClass}.FOLLOWER_ID, ${constantsClass}.FOLLOWER_CONFIG);`
      : "";
    vendorContent = `package ${fullSubPkg};

import org.ciprix.interfaces.motor.MotorIOSparkMax;
import org.ciprix.interfaces.motor.advanced.MotorController;
import org.ciprix.interfaces.motor.advanced.MotorIO;

/** Real ${className} hardware using REV SPARK MAX. */
public class ${vendorClass} implements ${ioInterface} {
  private final MotorIO motor =
      new MotorIOSparkMax("${className}/Motor", ${constantsClass}.MOTOR_ID, ${constantsClass}.MOTOR_CONFIG);${followerDecl}

  @Override
  public void updateInputs(${inputsAutoLogged} inputs) {
    motor.updateInputs(inputs.motorInputs);${followerUpdateLine}
  }

  @Override
  public MotorController controlMotor() {
    return motor.getMotorController();
  }
}
`;
  } else {
    const followerDecl = hasFollower
      ? `\n  private final MotorIO follower =\n      new MotorIOTalonSRX("${className}/Follower", ${constantsClass}.FOLLOWER_ID, ${constantsClass}.FOLLOWER_CONFIG);`
      : "";
    vendorContent = `package ${fullSubPkg};

import org.ciprix.interfaces.motor.MotorIOTalonSRX;
import org.ciprix.interfaces.motor.advanced.MotorController;
import org.ciprix.interfaces.motor.advanced.MotorIO;

/** Real ${className} hardware using CTRE Talon SRX (Phoenix 5). */
public class ${vendorClass} implements ${ioInterface} {
  private final MotorIO motor =
      new MotorIOTalonSRX("${className}/Motor", ${constantsClass}.MOTOR_ID, ${constantsClass}.MOTOR_CONFIG);${followerDecl}

  @Override
  public void updateInputs(${inputsAutoLogged} inputs) {
    motor.updateInputs(inputs.motorInputs);${followerUpdateLine}
  }

  @Override
  public MotorController controlMotor() {
    return motor.getMotorController();
  }
}
`;
  }

  // 4. Sim IO
  const isSpark = subsystem.motor.vendor === "sparkmax";
  const simFactory = isSpark ? "MotorIOSim.spark" : "MotorIOSim.talonFX";
  const motorCount = hasFollower ? 2 : 1;
  const dcMotor = isSpark ? `DCMotor.getNEO(${motorCount})` : `DCMotor.getKrakenX60(${motorCount})`;

  let simMechanismExpr = "";
  if (subsystem.type === "shooter") {
    simMechanismExpr = `SimMechanism.flywheel(
                  ${dcMotor}, ${formatDouble(subsystem.motor.gearRatio)}, ${formatDouble(subsystem.motor.moiKgM2)})
              .withFriction(0.02, 0.0)`;
  } else if (subsystem.type === "arm" || subsystem.type === "wrist" || subsystem.type === "hood") {
    const defaultMass = subsystem.type === "hood" ? 0.8 : subsystem.type === "wrist" ? 1.8 : 4.0;
    const defaultLen = subsystem.type === "hood" ? 0.18 : subsystem.type === "wrist" ? 0.25 : 0.5;
    const massKg = subsystem.physics?.massKg ?? defaultMass;
    const lengthMeters = subsystem.physics?.lengthMeters ?? defaultLen;
    const minRot =
      cl?.minLimit !== undefined
        ? cl.limitUnit === "deg"
          ? cl.minLimit / 360.0
          : cl.minLimit
        : -10.0 / 360.0;
    const maxRot =
      cl?.maxLimit !== undefined
        ? cl.limitUnit === "deg"
          ? cl.maxLimit / 360.0
          : cl.maxLimit
        : 100.0 / 360.0;
    simMechanismExpr = `SimMechanism.arm(
                  ${dcMotor}, ${formatDouble(subsystem.motor.gearRatio)}, ${formatDouble(massKg)}, ${formatDouble(lengthMeters)})
              .withLimits(${formatDouble(minRot)}, ${formatDouble(maxRot)})
              .withStartPosition(${formatDouble(minRot)})`;
  } else if (subsystem.type === "elevator" || subsystem.type === "climber") {
    const massKg = subsystem.physics?.massKg ?? (subsystem.type === "climber" ? 8.0 : 6.0);
    const drumRadius =
      subsystem.physics?.drumRadiusMeters ?? (subsystem.type === "climber" ? 0.02 : 0.025);
    const minRot =
      cl?.minLimit !== undefined
        ? cl.limitUnit === "deg"
          ? cl.minLimit / 360.0
          : cl.minLimit
        : 0.0;
    const maxRot =
      cl?.maxLimit !== undefined
        ? cl.limitUnit === "deg"
          ? cl.maxLimit / 360.0
          : cl.maxLimit
        : 7.5;
    simMechanismExpr = `SimMechanism.elevator(
                  ${dcMotor}, ${formatDouble(subsystem.motor.gearRatio)}, ${formatDouble(massKg)}, ${formatDouble(drumRadius)})
              .withLimits(${formatDouble(minRot)}, ${formatDouble(maxRot)})
              .withStartPosition(0.0)`;
  } else {
    simMechanismExpr = `SimMechanism.roller(
                  ${dcMotor}, ${formatDouble(subsystem.motor.gearRatio)}, ${formatDouble(subsystem.motor.moiKgM2)})
              .withFriction(0.05, 0.0)`;
  }

  const simContent = `package ${fullSubPkg};

import edu.wpi.first.math.system.plant.DCMotor;
import org.ciprix.interfaces.motor.MotorIOSim;
import org.ciprix.interfaces.motor.advanced.MotorController;
import org.ciprix.sim.SimMechanism;

/** Simulated ${className} matching the real motor configuration and telemetry name. */
public class ${className}IOSim implements ${ioInterface} {
  private final MotorIOSim motor =
      ${simFactory}(
          "${className}/Motor",
          ${constantsClass}.MOTOR_CONFIG,
          ${simMechanismExpr});

  @Override
  public void updateInputs(${inputsAutoLogged} inputs) {
    motor.updateInputs(inputs.motorInputs);
  }

  @Override
  public MotorController controlMotor() {
    return motor.getMotorController();
  }
}
`;

  // 5. Subsystem class
  const securityLine = subsystem.fsm.securityState
    ? `    fsm.securityState(${stateEnum}.${subsystem.fsm.securityState});\n\n`
    : "";

  const stateConfigs = subsystem.fsm.states
    .map((state) => {
      const enterCall = renderActionCall(constantsClass, state.onEnter);
      const updateChain = state.onUpdate
        ? `\n        .onUpdate(() -> ${renderActionCall(constantsClass, state.onUpdate)})`
        : "";
      const transitionChains = (state.transitions ?? [])
        .map((tr) => {
          if (tr.trigger === "afterSeconds") {
            return `\n        .transitionAfter(${formatDouble(tr.value ?? 0.5)}, ${stateEnum}.${tr.targetState})`;
          }
          const cond =
            tr.trigger === "atSetpoint"
              ? "inputs.motorInputs.atSetpoint"
              : tr.trigger === "stalled"
                ? "inputs.motorInputs.stalled"
                : `inputs.motorInputs.averageCurrentAmps >= ${formatDouble(tr.value ?? 25.0)}`;
          const deb = tr.debounceSec && tr.debounceSec > 0 ? `, ${formatDouble(tr.debounceSec)}` : "";
          return `\n        .transitionTo(${stateEnum}.${tr.targetState}, () -> ${cond}${deb})`;
        })
        .join("");
      const timeoutChain =
        state.timeoutAfterSec !== undefined
          ? `\n        .timeoutAfter(${formatDouble(state.timeoutAfterSec)})`
          : "";
      return `    fsm.state(${stateEnum}.${state.name})\n        .onEnter(() -> ${enterCall})${updateChain}${transitionChains}${timeoutChain};`;
    })
    .join("\n");

  const bindLines = subsystem.fsm.bindings
    .map((b) => {
      const intermediates =
        b.intermediateStates.length > 0
          ? ", " + b.intermediateStates.map((s) => `${stateEnum}.${s}`).join(", ")
          : "";
      return `    bindRequest(${requestEnum}.${b.request}, ${stateEnum}.${b.entryState}, ${stateEnum}.${b.goalState}${intermediates});`;
    })
    .join("\n");

  const selfTestImports = subsystem.selfTest.enabled
    ? "\nimport static edu.wpi.first.units.Units.RotationsPerSecond;\n"
    : "";

  const selfTestBlock = subsystem.selfTest.enabled
    ? `
    selfTest()
        .motor("Motor", io::controlMotor, () -> inputs.motorInputs)
        .output(${formatDouble(subsystem.selfTest.output)})
        .mustTurn(RotationsPerSecond.of(${formatDouble(subsystem.selfTest.minVelocityRps)}));`
    : "";

  const subsystemContent = `package ${fullSubPkg};
${selfTestImports}
import ${fullSubPkg}.${constantsClass}.${requestEnum};
import ${fullSubPkg}.${constantsClass}.${stateEnum};
import org.ciprix.annotations.AutoCommandFactory;
import org.ciprix.interfaces.subsystem.StateSubsystem;

/** ${className} subsystem generated by FIRST Studio. */
@AutoCommandFactory(requestEnum = ${requestEnum}.class)
public class ${className}
    extends StateSubsystem<${requestEnum}, ${stateEnum}, ${inputsAutoLogged}, ${ioInterface}> {

  public ${className}(${ioInterface} io) {
    super(
        "Subsystems/${className}",
        new ${inputsAutoLogged}(),
        io,
        ${stateEnum}.class,
        ${stateEnum}.${subsystem.fsm.initialState},
        ${requestEnum}.${subsystem.fsm.initialRequest},
        ${constantsClass}.class);

${securityLine}${stateConfigs}

${bindLines}
    fsm.validateComplete();${selfTestBlock}
  }
}
`;

  return [
    { path: `${baseDir}/${constantsClass}.java`, content: constantsContent },
    { path: `${baseDir}/${ioInterface}.java`, content: ioContent },
    { path: `${baseDir}/${vendorClass}.java`, content: vendorContent },
    { path: `${baseDir}/${className}IOSim.java`, content: simContent },
    { path: `${baseDir}/${className}.java`, content: subsystemContent },
  ];
}
