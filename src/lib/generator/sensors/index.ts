import type { SensorConfig } from "../../schema/ciprix-project";
import { formatDouble, toCamelCase, toPascalCase } from "../java-utils";

export function getSensorFieldName(sensor: SensorConfig): string {
  return toCamelCase(sensor.name);
}

export function getSensorGetterName(sensor: SensorConfig): string {
  return `is${toPascalCase(sensor.name)}Triggered`;
}

export function renderSensorInputsFields(sensors: SensorConfig[]): string {
  if (sensors.length === 0) return "";
  return (
    "\n" +
    sensors
      .map((s) => `    public boolean ${getSensorFieldName(s)} = false;`)
      .join("\n")
  );
}

export function renderSensorRealImports(
  sensors: SensorConfig[],
  alreadyHasPhoenix6CanBus: boolean,
): string[] {
  const imports = new Set<string>();
  for (const s of sensors) {
    if (s.type === "dio") {
      imports.add("import edu.wpi.first.wpilibj.DigitalInput;");
    } else if (s.type === "canrange") {
      if (!alreadyHasPhoenix6CanBus) {
        imports.add("import com.ctre.phoenix6.CANBus;");
      }
      imports.add("import com.ctre.phoenix6.hardware.CANrange;");
    } else if (s.type === "lasercan") {
      imports.add("import au.grapplerobotics.LaserCan;");
    }
  }
  return Array.from(imports).sort();
}

export function renderSensorRealDeclarations(
  sensors: SensorConfig[],
  motorCanBusArg: string,
): string {
  if (sensors.length === 0) return "";
  return (
    "\n" +
    sensors
      .map((s) => {
        const field = getSensorFieldName(s);
        if (s.type === "dio") {
          return `  private final DigitalInput ${field} = new DigitalInput(${s.channel});`;
        }
        if (s.type === "canrange") {
          const bus = s.canBus.trim();
          const busArg = bus && bus !== "rio" ? `new CANBus("${bus}")` : motorCanBusArg || "new CANBus()";
          return `  private final CANrange ${field} = new CANrange(${s.canId}, ${busArg});`;
        }
        return `  private final LaserCan ${field} = new LaserCan(${s.canId});`;
      })
      .join("\n")
  );
}

export function renderSensorRealUpdates(sensors: SensorConfig[]): string {
  if (sensors.length === 0) return "";
  return (
    "\n" +
    sensors
      .map((s) => {
        const field = getSensorFieldName(s);
        if (s.type === "dio") {
          const expr = s.inverted ? `!${field}.get()` : `${field}.get()`;
          return `    inputs.${field} = ${expr};`;
        }
        if (s.type === "canrange") {
          return `    inputs.${field} = ${field}.getDistance().getValueAsDouble() <= ${formatDouble(s.thresholdMeters)};`;
        }
        return [
          `    LaserCan.Measurement ${field}Measurement = ${field}.getMeasurement();`,
          `    inputs.${field} =`,
          `        ${field}Measurement != null`,
          `            && ${field}Measurement.status == LaserCan.LASERCAN_STATUS_VALID_MEASUREMENT`,
          `            && ${field}Measurement.distance_mm <= ${s.thresholdMm};`,
        ].join("\n");
      })
      .join("\n")
  );
}

export function renderSensorSimDeclarations(
  sensors: SensorConfig[],
  className: string,
): string {
  if (sensors.length === 0) return "";
  return (
    "\n" +
    sensors
      .map((s) => {
        const field = getSensorFieldName(s);
        return `  private final LoggedDashboardBoolean ${field}Sim =\n      new LoggedDashboardBoolean("${className}/Sensors/${s.name}", false);`;
      })
      .join("\n")
  );
}

export function renderSensorSimUpdates(sensors: SensorConfig[]): string {
  if (sensors.length === 0) return "";
  return (
    "\n" +
    sensors
      .map((s) => {
        const field = getSensorFieldName(s);
        return `    inputs.${field} = ${field}Sim.get();`;
      })
      .join("\n")
  );
}

export function renderSensorGetters(sensors: SensorConfig[]): string {
  if (sensors.length === 0) return "";
  return (
    "\n" +
    sensors
      .map((s) => {
        const field = getSensorFieldName(s);
        const getter = getSensorGetterName(s);
        return `  public boolean ${getter}() {\n    return inputs.${field};\n  }`;
      })
      .join("\n\n") +
    "\n"
  );
}
