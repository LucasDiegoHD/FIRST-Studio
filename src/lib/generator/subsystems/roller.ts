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
  return `io.controlMotor().runPercentOutput(${constantsClass}.${constName})`;
}

function collectPercentConstants(subsystem: SubsystemConfig): Array<{ name: string; value: number }> {
  const seen = new Map<string, number>();
  for (const state of subsystem.fsm.states) {
    if (state.onEnter.type === "percentOutput") {
      seen.set(toUpperSnake(state.onEnter.constantName), state.onEnter.value);
    }
    if (state.onUpdate?.type === "percentOutput") {
      seen.set(toUpperSnake(state.onUpdate.constantName), state.onUpdate.value);
    }
  }
  return Array.from(seen.entries()).map(([name, value]) => ({ name, value }));
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

  const percentConstants = collectPercentConstants(subsystem);
  const percentLines =
    percentConstants.length > 0
      ? percentConstants
          .map((c) => `  public static final double ${c.name} = ${formatDouble(c.value)};`)
          .join("\n") + "\n\n"
      : "";

  const neutralChain = subsystem.motor.neutralMode === "brake" ? ".brakeMode()" : ".coastMode()";
  const invertChain = subsystem.motor.inverted ? ".inverted(true)" : "";

  // 1. Constants
  const constantsContent = `package ${fullSubPkg};

import static edu.wpi.first.units.Units.Amps;

import org.ciprix.interfaces.motor.advanced.MotorConfig;

/** ${className} constants: ids, power levels, motor configuration, requests and states. */
public final class ${constantsClass} {
  private ${constantsClass}() {}

  public static final int MOTOR_ID = ${subsystem.motor.canId};

${percentLines}  public static final MotorConfig MOTOR_CONFIG =
      new MotorConfig().currentLimit(Amps.of(${subsystem.motor.currentLimitAmps}))${neutralChain}${invertChain};

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
    public MotorIOInputs motorInputs = new MotorIOInputs();
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

  let vendorContent = "";
  if (subsystem.motor.vendor === "talonfx") {
    vendorContent = `package ${fullSubPkg};

import com.ctre.phoenix6.CANBus;
import org.ciprix.interfaces.motor.MotorIOTalonFX;
import org.ciprix.interfaces.motor.advanced.MotorController;
import org.ciprix.interfaces.motor.advanced.MotorIO;

/** Real ${className} hardware using CTRE Talon FX. */
public class ${vendorClass} implements ${ioInterface} {
  private final MotorIO motor =
      new MotorIOTalonFX(
          "${className}/Motor", ${constantsClass}.MOTOR_ID, ${canBusArg}, ${constantsClass}.MOTOR_CONFIG);

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
  } else if (subsystem.motor.vendor === "sparkmax") {
    vendorContent = `package ${fullSubPkg};

import org.ciprix.interfaces.motor.MotorIOSparkMax;
import org.ciprix.interfaces.motor.advanced.MotorController;
import org.ciprix.interfaces.motor.advanced.MotorIO;

/** Real ${className} hardware using REV SPARK MAX. */
public class ${vendorClass} implements ${ioInterface} {
  private final MotorIO motor =
      new MotorIOSparkMax("${className}/Motor", ${constantsClass}.MOTOR_ID, ${constantsClass}.MOTOR_CONFIG);

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
  } else {
    vendorContent = `package ${fullSubPkg};

import org.ciprix.interfaces.motor.MotorIOTalonSRX;
import org.ciprix.interfaces.motor.advanced.MotorController;
import org.ciprix.interfaces.motor.advanced.MotorIO;

/** Real ${className} hardware using CTRE Talon SRX (Phoenix 5). */
public class ${vendorClass} implements ${ioInterface} {
  private final MotorIO motor =
      new MotorIOTalonSRX("${className}/Motor", ${constantsClass}.MOTOR_ID, ${constantsClass}.MOTOR_CONFIG);

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
  }

  // 4. Sim IO
  const isSpark = subsystem.motor.vendor === "sparkmax";
  const simFactory = isSpark ? "MotorIOSim.spark" : "MotorIOSim.talonFX";
  const dcMotor = isSpark ? "DCMotor.getNEO(1)" : "DCMotor.getKrakenX60(1)";

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
          SimMechanism.roller(
                  ${dcMotor}, ${formatDouble(subsystem.motor.gearRatio)}, ${formatDouble(subsystem.motor.moiKgM2)})
              .withFriction(0.05, 0.0));

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
  const stateConfigs = subsystem.fsm.states
    .map((state) => {
      const enterCall = renderActionCall(constantsClass, state.onEnter);
      const updateChain = state.onUpdate
        ? `\n        .onUpdate(() -> ${renderActionCall(constantsClass, state.onUpdate)})`
        : "";
      return `    fsm.state(${stateEnum}.${state.name})\n        .onEnter(() -> ${enterCall})${updateChain};`;
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

${stateConfigs}

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
