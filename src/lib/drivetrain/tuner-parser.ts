export interface ParsedTunerConstants {
  pigeonId?: number;
  canBus?: string;
  driveGearRatio?: number;
  steerGearRatio?: number;
  wheelDiameterMeters?: number;
  maxSpeedMps?: number;
  modules: Partial<
    Record<
      "fl" | "fr" | "bl" | "br",
      {
        driveCanId?: number;
        steerCanId?: number;
        encoderCanId?: number;
        encoderOffsetRot?: number;
        steerInverted?: boolean;
        driveInverted?: boolean;
      }
    >
  >;
}

function matchInt(src: string, regex: RegExp): number | undefined {
  const m = src.match(regex);
  if (!m) return undefined;
  const n = Number.parseInt(m[1], 10);
  return Number.isFinite(n) ? n : undefined;
}

function matchDouble(src: string, regex: RegExp): number | undefined {
  const m = src.match(regex);
  if (!m) return undefined;
  const n = Number.parseFloat(m[1]);
  return Number.isFinite(n) ? n : undefined;
}

function matchBool(src: string, regex: RegExp): boolean | undefined {
  const m = src.match(regex);
  if (!m) return undefined;
  return m[1] === "true";
}

function parseModule(src: string, prefix: "FrontLeft" | "FrontRight" | "BackLeft" | "BackRight") {
  const driveCanId = matchInt(src, new RegExp(`k${prefix}DriveMotorId\\s*=\\s*(\\d+)`));
  const steerCanId = matchInt(src, new RegExp(`k${prefix}SteerMotorId\\s*=\\s*(\\d+)`));
  const encoderCanId = matchInt(src, new RegExp(`k${prefix}EncoderId\\s*=\\s*(\\d+)`));
  const encoderOffsetRot = matchDouble(
    src,
    new RegExp(`k${prefix}EncoderOffset\\s*=\\s*Rotations\\.of\\(\\s*([-+]?[0-9]*\\.?[0-9]+)`),
  );
  const steerInverted = matchBool(
    src,
    new RegExp(`k${prefix}SteerMotorInverted\\s*=\\s*(true|false)`),
  );
  const isLeft = prefix === "FrontLeft" || prefix === "BackLeft";
  const driveInverted =
    matchBool(src, new RegExp(`k${prefix}DriveMotorInverted\\s*=\\s*(true|false)`)) ??
    matchBool(src, new RegExp(`kInvert${isLeft ? "Left" : "Right"}Side\\s*=\\s*(true|false)`));

  if (
    driveCanId === undefined &&
    steerCanId === undefined &&
    encoderCanId === undefined &&
    encoderOffsetRot === undefined
  ) {
    return undefined;
  }

  return {
    driveCanId,
    steerCanId,
    encoderCanId,
    encoderOffsetRot,
    steerInverted,
    driveInverted,
  };
}

export function parseTunerConstantsJava(source: string): ParsedTunerConstants {
  const canBusMatch = source.match(/kCANBus\s*=\s*new\s+CANBus\(\s*"([^"]*)"/);
  const wheelRadiusInches = matchDouble(
    source,
    /kWheelRadius\s*=\s*Inches\.of\(\s*([-+]?[0-9]*\.?[0-9]+)/,
  );
  const wheelRadiusMeters = matchDouble(
    source,
    /kWheelRadius\s*=\s*Meters\.of\(\s*([-+]?[0-9]*\.?[0-9]+)/,
  );
  const wheelDiameterMeters =
    wheelRadiusMeters !== undefined
      ? Number((wheelRadiusMeters * 2).toFixed(4))
      : wheelRadiusInches !== undefined
        ? Number((wheelRadiusInches * 2 * 0.0254).toFixed(4))
        : undefined;

  const modules: ParsedTunerConstants["modules"] = {};
  const fl = parseModule(source, "FrontLeft");
  const fr = parseModule(source, "FrontRight");
  const bl = parseModule(source, "BackLeft");
  const br = parseModule(source, "BackRight");
  if (fl) modules.fl = fl;
  if (fr) modules.fr = fr;
  if (bl) modules.bl = bl;
  if (br) modules.br = br;

  return {
    pigeonId: matchInt(source, /kPigeonId\s*=\s*(\d+)/),
    canBus: canBusMatch?.[1],
    driveGearRatio: matchDouble(source, /kDriveGearRatio\s*=\s*([-+]?[0-9]*\.?[0-9]+)/),
    steerGearRatio: matchDouble(source, /kSteerGearRatio\s*=\s*([-+]?[0-9]*\.?[0-9]+)/),
    wheelDiameterMeters,
    maxSpeedMps: matchDouble(
      source,
      /kSpeedAt12Volts\s*=\s*MetersPerSecond\.of\(\s*([-+]?[0-9]*\.?[0-9]+)/,
    ),
    modules,
  };
}
