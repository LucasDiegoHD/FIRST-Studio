import type {
  AutonomousConfig,
  DrivetrainConfig,
  GyroType,
  MotorVendor,
  SwerveModuleConfig,
} from "../../schema/ciprix-project";
import { formatDouble } from "../java-utils";
import type { GeneratedFile } from "../subsystems/roller";

function gyroClassName(gyro: GyroType): string {
  if (gyro === "pigeon2") return "GyroIOPigeon2";
  if (gyro === "navx") return "GyroIONavX";
  return "GyroIOADIS16470";
}

function moduleIoVendorClass(vendor: MotorVendor): string {
  if (vendor === "talonfx") return "ModuleIOTalonFX";
  if (vendor === "sparkmax") return "ModuleIOSparkMax";
  return "ModuleIOTalonSRX";
}

function diffIoVendorClass(vendor: MotorVendor): string {
  if (vendor === "talonfx") return "DriveIOTalonFX";
  if (vendor === "sparkmax") return "DriveIOSparkMax";
  return "DriveIOTalonSRX";
}

function renderDriveAssistantsImports(dt: DrivetrainConfig, hasZones = false): string[] {
  const imports = [
    "import edu.wpi.first.math.MathUtil;",
    "import edu.wpi.first.math.geometry.Translation2d;",
    "import edu.wpi.first.units.measure.AngularAcceleration;",
    "import edu.wpi.first.units.measure.AngularVelocity;",
    "import edu.wpi.first.units.measure.LinearAcceleration;",
    "import edu.wpi.first.units.measure.LinearVelocity;",
    "import java.util.function.DoubleSupplier;",
    "import org.ciprix.CiprixSettings;",
    "import org.ciprix.util.drivetrain.DriveAccelerationLimits;",
    "import org.ciprix.util.drivetrain.DriveContext;",
    "import org.ciprix.util.drivetrain.ManualRotation;",
    "import org.ciprix.util.drivetrain.RotationStrategy;",
    "import static edu.wpi.first.units.Units.MetersPerSecond;",
    "import static edu.wpi.first.units.Units.MetersPerSecondPerSecond;",
    "import static edu.wpi.first.units.Units.RadiansPerSecond;",
    "import static edu.wpi.first.units.Units.RadiansPerSecondPerSecond;",
  ];
  if (hasZones) {
    imports.push("import org.ciprix.util.drivetrain.TranslationModifier;");
  }
  if (dt.assistants.throttleMap) {
    imports.push("import org.ciprix.util.drivetrain.ThrottleMapModifier;");
  }
  if (dt.assistants.headingStickRotation) {
    imports.push("import org.ciprix.util.drivetrain.HeadingStickRotation;");
  }
  if (dt.assistants.pidRotation) {
    imports.push("import org.ciprix.util.drivetrain.PIDRotation;");
  }
  return imports;
}

function renderAutoBuilderImports(
  autonomous: AutonomousConfig | undefined,
  isDifferential: boolean,
): string[] {
  if (!autonomous?.enabled) return [];
  const list = [
    "import com.pathplanner.lib.auto.AutoBuilder;",
    "import com.pathplanner.lib.config.RobotConfig;",
    "import edu.wpi.first.wpilibj.DriverStation;",
  ];
  if (isDifferential) {
    list.push("import com.pathplanner.lib.controllers.PPLTVController;");
  } else {
    list.push(
      "import com.pathplanner.lib.config.PIDConstants;",
      "import com.pathplanner.lib.controllers.PPHolonomicDriveController;",
    );
  }
  if (autonomous.useLocalADStarAK) {
    list.push(
      "import com.pathplanner.lib.pathfinding.Pathfinding;",
      "import org.ciprix.util.LocalADStarAK;",
    );
  }
  return list;
}

function renderAutoBuilderMethod(
  autonomous: AutonomousConfig | undefined,
  isDifferential: boolean,
): string {
  if (!autonomous?.enabled) return "";
  const tp = autonomous.translationPid;
  const rp = autonomous.rotationPid;
  const pathfinderLine = autonomous.useLocalADStarAK
    ? "    Pathfinding.setPathfinder(new LocalADStarAK());\n"
    : "";
  const controllerExpr = isDifferential
    ? "new PPLTVController(0.02, maxSpeed.in(MetersPerSecond))"
    : `new PPHolonomicDriveController(\n                new PIDConstants(${formatDouble(tp.kP)}, ${formatDouble(tp.kI)}, ${formatDouble(tp.kD)}),\n                new PIDConstants(${formatDouble(rp.kP)}, ${formatDouble(rp.kI)}, ${formatDouble(rp.kD)}))`;

  return `
  private void configureAutoBuilder() {
${pathfinderLine}    try {
      RobotConfig config = RobotConfig.fromGUISettings();
      AutoBuilder.configure(
          this::getPose,
          this::resetPose,
          this::getRobotVelocity,
          this::driveRobotRelative,
          ${controllerExpr},
          config,
          () -> DriverStation.getAlliance().map(a -> a == DriverStation.Alliance.Red).orElse(false),
          this);
    } catch (Exception e) {
      throw new RuntimeException("Failed to configure PathPlanner AutoBuilder", e);
    }
  }`;
}

function renderDriveTeleopHelper(
  dt: DrivetrainConfig,
  applyDriveCall: string,
  hasZones = false,
): string {
  const throttleSetup = dt.assistants.throttleMap
    ? "  private final ThrottleMapModifier throttleMap = new ThrottleMapModifier();\n"
    : "";
  const throttleApply = dt.assistants.throttleMap
    ? "          Translation2d mapped = throttleMap.apply(this, new Translation2d(x, y));\n"
    : "          Translation2d mapped = new Translation2d(x, y);\n";
  const zoneApply = hasZones
    ? "          mapped = zoneModifier.apply(this, mapped);\n"
    : "";

  const rotStrategyInit = dt.assistants.headingStickRotation
    ? `    PIDRotation.setDefaultGains(${formatDouble(dt.assistants.rotKp)}, ${formatDouble(dt.assistants.rotKi)}, ${formatDouble(dt.assistants.rotKd)});
    RotationStrategy rotStrategy = new HeadingStickRotation(rotX, rotY);`
    : dt.assistants.pidRotation
      ? `    PIDRotation.setDefaultGains(${formatDouble(dt.assistants.rotKp)}, ${formatDouble(dt.assistants.rotKi)}, ${formatDouble(dt.assistants.rotKd)});
    RotationStrategy rotStrategy = new PIDRotation(() -> targetHeading, rotX);`
      : `    RotationStrategy rotStrategy = new ManualRotation(rotX, () -> maxAngularSpeed.in(RadiansPerSecond));`;

  const targetHeadingField =
    dt.assistants.pidRotation && !dt.assistants.headingStickRotation
      ? "  private edu.wpi.first.math.geometry.Rotation2d targetHeading = new edu.wpi.first.math.geometry.Rotation2d();\n"
      : "";
  const targetHeadingReset =
    dt.assistants.pidRotation && !dt.assistants.headingStickRotation
      ? "          targetHeading = getRotation();\n"
      : "";

  const accelStep = dt.assistants.accelerationLimits
    ? `          double dt = 0.02;
          double maxDv = maxLinearAccel.in(MetersPerSecondPerSecond) * dt;
          double vx = MathUtil.clamp(reqVx, prevVx - maxDv, prevVx + maxDv);
          double vy = MathUtil.clamp(reqVy, prevVy - maxDv, prevVy + maxDv);
          double maxDw = maxAngularAccel.in(RadiansPerSecondPerSecond) * dt;
          double omega = MathUtil.clamp(reqOmega, prevOmega - maxDw, prevOmega + maxDw);
          prevVx = vx;
          prevVy = vy;
          prevOmega = omega;\n`
    : `          double vx = reqVx;
          double vy = reqVy;
          double omega = reqOmega;\n`;

  return `${throttleSetup}${targetHeadingField}  private double prevVx = 0.0;
  private double prevVy = 0.0;
  private double prevOmega = 0.0;

  public Command driveTeleopCommand(
      DoubleSupplier xInput,
      DoubleSupplier yInput,
      DoubleSupplier rotX,
      DoubleSupplier rotY) {
${rotStrategyInit}
    return Commands.run(
            () -> {
              double deadband = CiprixSettings.getControllerDeadband();
              double x = MathUtil.applyDeadband(xInput.getAsDouble(), deadband);
              double y = MathUtil.applyDeadband(yInput.getAsDouble(), deadband);
${throttleApply}${zoneApply}          double reqVx = mapped.getX() * maxSpeed.in(MetersPerSecond);
          double reqVy = mapped.getY() * maxSpeed.in(MetersPerSecond);
          double reqOmega = rotStrategy.calculate(this);
${accelStep}          ${applyDriveCall}
        },
            this)
        .beforeStarting(() -> {
${targetHeadingReset}          rotStrategy.reset(this);
        })
        .withName("DriveTeleop");
  }`;
}

function renderDriveContextMembers(dt: DrivetrainConfig, hasZones = false): string {
  const zoneMembers = hasZones
    ? `
  private TranslationModifier zoneModifier = (ctx, in) -> in;
  private Runnable zonePeriodic = () -> {};

  public void setZoneHooks(TranslationModifier modifier, Runnable periodicHook) {
    this.zoneModifier = modifier != null ? modifier : (ctx, in) -> in;
    this.zonePeriodic = periodicHook != null ? periodicHook : () -> {};
  }`
    : "";

  return `  private boolean fieldOriented = ${dt.fieldOrientedDefault};
  private final LinearVelocity maxSpeed = MetersPerSecond.of(${formatDouble(dt.maxSpeedMps)});
  private final AngularVelocity maxAngularSpeed = RadiansPerSecond.of(${formatDouble(dt.maxAngularSpeedRadPerSec)});
  private LinearAcceleration maxLinearAccel = MetersPerSecondPerSecond.of(${formatDouble(dt.maxLinearAccelMps2)});
  private AngularAcceleration maxAngularAccel = RadiansPerSecondPerSecond.of(${formatDouble(dt.maxAngularAccelRadPerSec2)});

  @Override
  public LinearVelocity getMaxSpeed() {
    return maxSpeed;
  }

  @Override
  public AngularVelocity getMaxAngularSpeed() {
    return maxAngularSpeed;
  }

  @Override
  public LinearAcceleration getMaxAcceleration() {
    return maxLinearAccel;
  }

  @Override
  public void setMaxAcceleration(LinearAcceleration maxAcceleration) {
    this.maxLinearAccel = maxAcceleration;
  }

  @Override
  public AngularAcceleration getMaxAngularAcceleration() {
    return maxAngularAccel;
  }

  @Override
  public void setMaxAngularAcceleration(AngularAcceleration maxAngularAcceleration) {
    this.maxAngularAccel = maxAngularAcceleration;
  }

  public void toggleFieldOriented() {
    fieldOriented = !fieldOriented;
  }

  public boolean isFieldOriented() {
    return fieldOriented;
  }${zoneMembers}`;
}

function generateGyroIoFiles(
  dt: DrivetrainConfig,
  fullPkg: string,
  baseDir: string,
): GeneratedFile[] {
  const gyroIo = `package ${fullPkg};

import edu.wpi.first.math.geometry.Rotation2d;
import org.littletonrobotics.junction.AutoLog;

public interface GyroIO {
  @AutoLog
  class GyroIOInputs {
    public boolean connected = false;
    public Rotation2d yawPosition = new Rotation2d();
    public double yawVelocityRadPerSec = 0.0;
  }

  default void updateInputs(GyroIOInputsAutoLogged inputs) {}
}
`;

  const simGyro = `package ${fullPkg};

import edu.wpi.first.math.geometry.Rotation2d;

public class GyroIOSim implements GyroIO {
  private Rotation2d simYaw = new Rotation2d();

  public void addDeltaYaw(double deltaRad) {
    simYaw = simYaw.plus(new Rotation2d(deltaRad));
  }

  @Override
  public void updateInputs(GyroIOInputsAutoLogged inputs) {
    inputs.connected = true;
    inputs.yawPosition = simYaw;
  }
}
`;

  const realClass = gyroClassName(dt.gyro.type);
  const canBusArg =
    dt.gyro.canBus.trim() && dt.gyro.canBus.trim() !== "rio"
      ? `new CANBus("${dt.gyro.canBus.trim()}")`
      : "new CANBus()";

  let realGyro = "";
  if (dt.gyro.type === "pigeon2") {
    realGyro = `package ${fullPkg};

import com.ctre.phoenix6.CANBus;
import com.ctre.phoenix6.hardware.Pigeon2;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.util.Units;

public class ${realClass} implements GyroIO {
  private final Pigeon2 pigeon = new Pigeon2(${dt.gyro.canId}, ${canBusArg});

  @Override
  public void updateInputs(GyroIOInputsAutoLogged inputs) {
    inputs.connected = pigeon.getYaw().getStatus().isOK();
    inputs.yawPosition = Rotation2d.fromDegrees(pigeon.getYaw().getValueAsDouble());
    inputs.yawVelocityRadPerSec =
        Units.degreesToRadians(pigeon.getAngularVelocityZWorld().getValueAsDouble());
  }
}
`;
  } else if (dt.gyro.type === "navx") {
    realGyro = `package ${fullPkg};

import com.studica.frc.AHRS;
import com.studica.frc.AHRS.NavXComType;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.util.Units;

public class ${realClass} implements GyroIO {
  private final AHRS navx = new AHRS(NavXComType.kMXP_SPI);

  @Override
  public void updateInputs(GyroIOInputsAutoLogged inputs) {
    inputs.connected = navx.isConnected();
    inputs.yawPosition = Rotation2d.fromDegrees(-navx.getYaw());
    inputs.yawVelocityRadPerSec = Units.degreesToRadians(-navx.getRate());
  }
}
`;
  } else {
    realGyro = `package ${fullPkg};

import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.util.Units;
import edu.wpi.first.wpilibj.ADIS16470_IMU;

public class ${realClass} implements GyroIO {
  private final ADIS16470_IMU imu = new ADIS16470_IMU();

  @Override
  public void updateInputs(GyroIOInputsAutoLogged inputs) {
    inputs.connected = imu.isConnected();
    inputs.yawPosition = Rotation2d.fromDegrees(imu.getAngle(imu.getYawAxis()));
    inputs.yawVelocityRadPerSec = Units.degreesToRadians(imu.getRate(imu.getYawAxis()));
  }
}
`;
  }

  return [
    { path: `${baseDir}/GyroIO.java`, content: gyroIo },
    { path: `${baseDir}/GyroIOSim.java`, content: simGyro },
    { path: `${baseDir}/${realClass}.java`, content: realGyro },
  ];
}

function generateCtreSwerve(
  dt: DrivetrainConfig,
  basePackage: string,
  baseDir: string,
  hasZones: boolean,
  autonomous?: AutonomousConfig,
): GeneratedFile[] {
  const fullPkg = `${basePackage}.subsystems.drive`;
  const bus = dt.canBus.trim() || "rio";

  const modBlock = (name: string, m: SwerveModuleConfig, xSign: string, ySign: string) =>
    `  private static final int k${name}DriveMotorId = ${m.driveCanId};
  private static final int k${name}SteerMotorId = ${m.steerCanId};
  private static final int k${name}EncoderId = ${m.encoderCanId};
  private static final Angle k${name}EncoderOffset = Rotations.of(${formatDouble(m.encoderOffsetRot)});
  private static final boolean k${name}SteerMotorInverted = ${m.steerInverted};
  private static final boolean k${name}EncoderInverted = false;
  private static final Distance k${name}XPos = Meters.of(${xSign}${formatDouble(dt.wheelBaseMeters / 2)});
  private static final Distance k${name}YPos = Meters.of(${ySign}${formatDouble(dt.trackWidthMeters / 2)});`;

  const tunerConstants = dt.tunerConstantsRaw?.trim()
    ? dt.tunerConstantsRaw.replace(/^\s*package\s+[^;]+;/m, `package ${fullPkg};`)
    : `package ${fullPkg};

import static edu.wpi.first.units.Units.*;

import com.ctre.phoenix6.CANBus;
import com.ctre.phoenix6.configs.CANcoderConfiguration;
import com.ctre.phoenix6.configs.TalonFXConfiguration;
import com.ctre.phoenix6.swerve.SwerveDrivetrainConstants;
import com.ctre.phoenix6.swerve.SwerveModuleConstants;
import com.ctre.phoenix6.swerve.SwerveModuleConstantsFactory;
import edu.wpi.first.units.measure.*;

/** Phoenix Tuner X style drivetrain constants generated by FIRST Studio. */
public final class TunerConstants {
  private TunerConstants() {}

  public static final CANBus kCANBus = new CANBus("${bus}");
  public static final LinearVelocity kSpeedAt12Volts = MetersPerSecond.of(${formatDouble(dt.maxSpeedMps)});

  private static final double kDriveGearRatio = ${formatDouble(dt.driveGearRatio)};
  private static final double kSteerGearRatio = ${formatDouble(dt.steerGearRatio)};
  private static final Distance kWheelRadius = Meters.of(${formatDouble(dt.wheelDiameterMeters / 2)});
  private static final int kPigeonId = ${dt.gyro.canId};

  public static final SwerveDrivetrainConstants DrivetrainConstants =
      new SwerveDrivetrainConstants().withCANBusName(kCANBus.getName()).withPigeon2Id(kPigeonId);

  private static final SwerveModuleConstantsFactory<TalonFXConfiguration, TalonFXConfiguration, CANcoderConfiguration> ConstantCreator =
      new SwerveModuleConstantsFactory<TalonFXConfiguration, TalonFXConfiguration, CANcoderConfiguration>()
          .withDriveMotorGearRatio(kDriveGearRatio)
          .withSteerMotorGearRatio(kSteerGearRatio)
          .withWheelRadius(kWheelRadius)
          .withSpeedAt12Volts(kSpeedAt12Volts);

${modBlock("FrontLeft", dt.modules.fl, "", "")}
${modBlock("FrontRight", dt.modules.fr, "", "-")}
${modBlock("BackLeft", dt.modules.bl, "-", "")}
${modBlock("BackRight", dt.modules.br, "-", "-")}

  public static final SwerveModuleConstants<TalonFXConfiguration, TalonFXConfiguration, CANcoderConfiguration> FrontLeft =
      ConstantCreator.createModuleConstants(
          kFrontLeftSteerMotorId, kFrontLeftDriveMotorId, kFrontLeftEncoderId, kFrontLeftEncoderOffset,
          kFrontLeftXPos, kFrontLeftYPos, ${dt.modules.fl.driveInverted}, kFrontLeftSteerMotorInverted, kFrontLeftEncoderInverted);
  public static final SwerveModuleConstants<TalonFXConfiguration, TalonFXConfiguration, CANcoderConfiguration> FrontRight =
      ConstantCreator.createModuleConstants(
          kFrontRightSteerMotorId, kFrontRightDriveMotorId, kFrontRightEncoderId, kFrontRightEncoderOffset,
          kFrontRightXPos, kFrontRightYPos, ${dt.modules.fr.driveInverted}, kFrontRightSteerMotorInverted, kFrontRightEncoderInverted);
  public static final SwerveModuleConstants<TalonFXConfiguration, TalonFXConfiguration, CANcoderConfiguration> BackLeft =
      ConstantCreator.createModuleConstants(
          kBackLeftSteerMotorId, kBackLeftDriveMotorId, kBackLeftEncoderId, kBackLeftEncoderOffset,
          kBackLeftXPos, kBackLeftYPos, ${dt.modules.bl.driveInverted}, kBackLeftSteerMotorInverted, kBackLeftEncoderInverted);
  public static final SwerveModuleConstants<TalonFXConfiguration, TalonFXConfiguration, CANcoderConfiguration> BackRight =
      ConstantCreator.createModuleConstants(
          kBackRightSteerMotorId, kBackRightDriveMotorId, kBackRightEncoderId, kBackRightEncoderOffset,
          kBackRightXPos, kBackRightYPos, ${dt.modules.br.driveInverted}, kBackRightSteerMotorInverted, kBackRightEncoderInverted);

  public static CommandSwerveDrivetrain createDrivetrain() {
    return new CommandSwerveDrivetrain(DrivetrainConstants, FrontLeft, FrontRight, BackLeft, BackRight);
  }
}
`;

  const commandSwerve = `package ${fullPkg};

import com.ctre.phoenix6.hardware.CANcoder;
import com.ctre.phoenix6.hardware.TalonFX;
import com.ctre.phoenix6.swerve.SwerveDrivetrain;
import com.ctre.phoenix6.swerve.SwerveDrivetrainConstants;
import com.ctre.phoenix6.swerve.SwerveModuleConstants;

/** Phoenix 6 SwerveDrivetrain hardware wrapper. */
public class CommandSwerveDrivetrain extends SwerveDrivetrain<TalonFX, TalonFX, CANcoder> {
  public CommandSwerveDrivetrain(
      SwerveDrivetrainConstants drivetrainConstants,
      SwerveModuleConstants<?, ?, ?>... modules) {
    super(TalonFX::new, TalonFX::new, CANcoder::new, drivetrainConstants, modules);
  }
}
`;

  const imports = [
    ...renderDriveAssistantsImports(dt, hasZones),
    ...renderAutoBuilderImports(autonomous, false),
    "import com.ctre.phoenix6.swerve.SwerveRequest;",
    "import edu.wpi.first.math.Matrix;",
    "import edu.wpi.first.math.geometry.Pose2d;",
    "import edu.wpi.first.math.kinematics.ChassisSpeeds;",
    "import edu.wpi.first.math.numbers.N1;",
    "import edu.wpi.first.math.numbers.N3;",
    "import edu.wpi.first.wpilibj2.command.Command;",
    "import edu.wpi.first.wpilibj2.command.Commands;",
    "import edu.wpi.first.wpilibj2.command.SubsystemBase;",
    "import org.littletonrobotics.junction.Logger;",
  ]
    .sort()
    .join("\n");

  const ctreCtor = autonomous?.enabled
    ? `\n  public Drive() {\n    configureAutoBuilder();\n  }\n`
    : "";

  const driveJava = `package ${fullPkg};

${imports}

/** CTRE Swerve drivetrain adapter implementing Ciprix {@link DriveContext}. */
public class Drive extends SubsystemBase implements DriveContext, DriveAccelerationLimits {
  private final CommandSwerveDrivetrain swerve = TunerConstants.createDrivetrain();
  private final SwerveRequest.FieldCentric fieldCentric = new SwerveRequest.FieldCentric();
  private final SwerveRequest.RobotCentric robotCentric = new SwerveRequest.RobotCentric();
${renderDriveContextMembers(dt, hasZones)}${ctreCtor}

  @Override
  public void periodic() {
    Logger.recordOutput("Drive/Pose", getPose());
    Logger.recordOutput("Drive/ChassisSpeeds", getRobotVelocity());
    Logger.recordOutput("Drive/FieldOriented", fieldOriented);${hasZones ? "\n    zonePeriodic.run();" : ""}
  }

  @Override
  public Pose2d getPose() {
    return swerve.getState().Pose;
  }

  public void resetPose(Pose2d pose) {
    swerve.resetPose(pose);
  }

  @Override
  public ChassisSpeeds getRobotVelocity() {
    return swerve.getState().Speeds;
  }

  public void driveRobotRelative(ChassisSpeeds speeds) {
    swerve.setControl(
        robotCentric
            .withVelocityX(speeds.vxMetersPerSecond)
            .withVelocityY(speeds.vyMetersPerSecond)
            .withRotationalRate(speeds.omegaRadiansPerSecond));
  }

  public void addVisionMeasurement(
      Pose2d pose, double timestampSeconds, Matrix<N3, N1> standardDeviations) {
    swerve.addVisionMeasurement(pose, timestampSeconds, standardDeviations);
  }

  public void zeroHeading() {
    swerve.seedFieldCentric();
  }

${renderDriveTeleopHelper(
  dt,
  `swerve.setControl(
              fieldOriented
                  ? fieldCentric.withVelocityX(vx).withVelocityY(vy).withRotationalRate(omega)
                  : robotCentric.withVelocityX(vx).withVelocityY(vy).withRotationalRate(omega));`,
  hasZones,
)}${renderAutoBuilderMethod(autonomous, false)}
}
`;

  return [
    { path: `${baseDir}/TunerConstants.java`, content: tunerConstants },
    { path: `${baseDir}/CommandSwerveDrivetrain.java`, content: commandSwerve },
    { path: `${baseDir}/Drive.java`, content: driveJava },
  ];
}

function generateYagsl(
  dt: DrivetrainConfig,
  basePackage: string,
  baseDir: string,
  hasZones: boolean,
  autonomous?: AutonomousConfig,
): GeneratedFile[] {
  const fullPkg = `${basePackage}.subsystems.drive`;
  const halfLength = dt.wheelBaseMeters / 2;
  const halfWidth = dt.trackWidthMeters / 2;
  const motorType = dt.motorVendor === "talonfx" ? "krakenx60" : "sparkmax_neo";
  const imuType = dt.gyro.type === "pigeon2" ? "pigeon2" : dt.gyro.type === "navx" ? "navx" : "adis16470";

  const deployBase = "src/main/deploy/swerve";
  const swervedriveJson = JSON.stringify(
    {
      imu: {
        type: imuType,
        id: dt.gyro.canId,
        canbus: dt.gyro.canBus.trim() || null,
      },
      invertedIMU: false,
      modules: [
        "frontleft.json",
        "frontright.json",
        "backleft.json",
        "backright.json",
      ],
    },
    null,
    2,
  );

  const controllerPropsJson = JSON.stringify(
    {
      angleJoystickRadiusDeadband: 0.1,
      heading: {
        p: dt.assistants.rotKp,
        i: dt.assistants.rotKi,
        d: dt.assistants.rotKd,
      },
    },
    null,
    2,
  );

  const physicalPropsJson = JSON.stringify(
    {
      conversionFactors: {
        angle: { gearRatio: dt.steerGearRatio, factor: 0 },
        drive: { gearRatio: dt.driveGearRatio, diameter: dt.wheelDiameterMeters },
      },
      currentLimit: { drive: dt.currentLimitAmps, angle: 25 },
      optimalVoltage: 12,
      wheelGripCoefficientOfFriction: 1.19,
    },
    null,
    2,
  );

  const pidfPropsJson = JSON.stringify(
    {
      drive: { p: 0.002, i: 0.0, d: 0.0, f: 0.0, iz: 0 },
      angle: { p: 0.01, i: 0.0, d: 0.0, f: 0.0, iz: 0 },
    },
    null,
    2,
  );

  const moduleJson = (m: SwerveModuleConfig, xSign: number, ySign: number) =>
    JSON.stringify(
      {
        location: {
          front: Number((xSign * halfLength).toFixed(4)),
          left: Number((ySign * halfWidth).toFixed(4)),
        },
        absoluteEncoderOffset: Number((m.encoderOffsetRot * 360).toFixed(4)),
        drive: { type: motorType, id: m.driveCanId, canbus: dt.canBus.trim() || null },
        angle: { type: motorType, id: m.steerCanId, canbus: dt.canBus.trim() || null },
        encoder: { type: "cancoder", id: m.encoderCanId, canbus: dt.canBus.trim() || null },
        inverted: { drive: m.driveInverted, angle: m.steerInverted },
        absoluteEncoderInverted: false,
      },
      null,
      2,
    );

  const imports = [
    ...renderDriveAssistantsImports(dt, hasZones),
    ...renderAutoBuilderImports(autonomous, false),
    "import edu.wpi.first.math.Matrix;",
    "import edu.wpi.first.math.geometry.Pose2d;",
    "import edu.wpi.first.math.kinematics.ChassisSpeeds;",
    "import edu.wpi.first.math.numbers.N1;",
    "import edu.wpi.first.math.numbers.N3;",
    "import edu.wpi.first.wpilibj.Filesystem;",
    "import edu.wpi.first.wpilibj2.command.Command;",
    "import edu.wpi.first.wpilibj2.command.Commands;",
    "import edu.wpi.first.wpilibj2.command.SubsystemBase;",
    "import java.io.File;",
    "import java.io.IOException;",
    "import org.littletonrobotics.junction.Logger;",
    "import swervelib.SwerveDrive;",
    "import swervelib.parser.SwerveParser;",
  ]
    .sort()
    .join("\n");

  const autoCtorCall = autonomous?.enabled ? "\n    configureAutoBuilder();" : "";

  const driveJava = `package ${fullPkg};

${imports}

/** YAGSL drivetrain adapter implementing Ciprix {@link DriveContext}. */
public class Drive extends SubsystemBase implements DriveContext, DriveAccelerationLimits {
  private final SwerveDrive swerveDrive;
${renderDriveContextMembers(dt, hasZones)}

  public Drive() {
    try {
      swerveDrive =
          new SwerveParser(new File(Filesystem.getDeployDirectory(), "swerve"))
              .createSwerveDrive(maxSpeed.in(MetersPerSecond));
    } catch (IOException e) {
      throw new RuntimeException("Failed to load YAGSL deploy/swerve config", e);
    }${autoCtorCall}
  }

  @Override
  public void periodic() {
    swerveDrive.updateOdometry();
    Logger.recordOutput("Drive/Pose", getPose());
    Logger.recordOutput("Drive/ChassisSpeeds", getRobotVelocity());
    Logger.recordOutput("Drive/FieldOriented", fieldOriented);${hasZones ? "\n    zonePeriodic.run();" : ""}
  }

  @Override
  public Pose2d getPose() {
    return swerveDrive.getPose();
  }

  public void resetPose(Pose2d pose) {
    swerveDrive.resetOdometry(pose);
  }

  @Override
  public ChassisSpeeds getRobotVelocity() {
    return swerveDrive.getRobotVelocity();
  }

  public void driveRobotRelative(ChassisSpeeds speeds) {
    swerveDrive.setChassisSpeeds(speeds);
  }

  public void addVisionMeasurement(
      Pose2d pose, double timestampSeconds, Matrix<N3, N1> standardDeviations) {
    swerveDrive.addVisionMeasurement(pose, timestampSeconds, standardDeviations);
  }

  public void zeroHeading() {
    swerveDrive.zeroGyro();
  }

${renderDriveTeleopHelper(
  dt,
  "swerveDrive.drive(new Translation2d(vx, vy), omega, fieldOriented, false);",
  hasZones,
)}${renderAutoBuilderMethod(autonomous, false)}
}
`;

  return [
    { path: `${deployBase}/swervedrive.json`, content: swervedriveJson + "\n" },
    { path: `${deployBase}/controllerproperties.json`, content: controllerPropsJson + "\n" },
    { path: `${deployBase}/modules/physicalproperties.json`, content: physicalPropsJson + "\n" },
    { path: `${deployBase}/modules/pidfproperties.json`, content: pidfPropsJson + "\n" },
    { path: `${deployBase}/modules/frontleft.json`, content: moduleJson(dt.modules.fl, 1, 1) + "\n" },
    { path: `${deployBase}/modules/frontright.json`, content: moduleJson(dt.modules.fr, 1, -1) + "\n" },
    { path: `${deployBase}/modules/backleft.json`, content: moduleJson(dt.modules.bl, -1, 1) + "\n" },
    { path: `${deployBase}/modules/backright.json`, content: moduleJson(dt.modules.br, -1, -1) + "\n" },
    { path: `${baseDir}/Drive.java`, content: driveJava },
  ];
}

function generateAkitSwerve(
  dt: DrivetrainConfig,
  basePackage: string,
  baseDir: string,
  hasZones: boolean,
  autonomous?: AutonomousConfig,
): GeneratedFile[] {
  const fullPkg = `${basePackage}.subsystems.drive`;
  const realGyroClass = gyroClassName(dt.gyro.type);
  const realModClass = moduleIoVendorClass(dt.motorVendor);
  const wheelRadius = dt.wheelDiameterMeters / 2;

  const constantsJava = `package ${fullPkg};

import edu.wpi.first.math.geometry.Translation2d;

public final class DriveConstants {
  private DriveConstants() {}

  public static final double TRACK_WIDTH_METERS = ${formatDouble(dt.trackWidthMeters)};
  public static final double WHEEL_BASE_METERS = ${formatDouble(dt.wheelBaseMeters)};
  public static final double WHEEL_RADIUS_METERS = ${formatDouble(wheelRadius)};
  public static final double DRIVE_GEAR_RATIO = ${formatDouble(dt.driveGearRatio)};
  public static final double STEER_GEAR_RATIO = ${formatDouble(dt.steerGearRatio)};
  public static final int CURRENT_LIMIT_AMPS = ${dt.currentLimitAmps};

  public static final Translation2d[] MODULE_TRANSLATIONS =
      new Translation2d[] {
        new Translation2d(WHEEL_BASE_METERS / 2.0, TRACK_WIDTH_METERS / 2.0),
        new Translation2d(WHEEL_BASE_METERS / 2.0, -TRACK_WIDTH_METERS / 2.0),
        new Translation2d(-WHEEL_BASE_METERS / 2.0, TRACK_WIDTH_METERS / 2.0),
        new Translation2d(-WHEEL_BASE_METERS / 2.0, -TRACK_WIDTH_METERS / 2.0)
      };

  public static final int[] DRIVE_IDS = {
    ${dt.modules.fl.driveCanId}, ${dt.modules.fr.driveCanId}, ${dt.modules.bl.driveCanId}, ${dt.modules.br.driveCanId}
  };
  public static final int[] STEER_IDS = {
    ${dt.modules.fl.steerCanId}, ${dt.modules.fr.steerCanId}, ${dt.modules.bl.steerCanId}, ${dt.modules.br.steerCanId}
  };
  public static final int[] ENCODER_IDS = {
    ${dt.modules.fl.encoderCanId}, ${dt.modules.fr.encoderCanId}, ${dt.modules.bl.encoderCanId}, ${dt.modules.br.encoderCanId}
  };
  public static final double[] ENCODER_OFFSETS_ROT = {
    ${formatDouble(dt.modules.fl.encoderOffsetRot)}, ${formatDouble(dt.modules.fr.encoderOffsetRot)}, ${formatDouble(dt.modules.bl.encoderOffsetRot)}, ${formatDouble(dt.modules.br.encoderOffsetRot)}
  };
}
`;

  const moduleIo = `package ${fullPkg};

import edu.wpi.first.math.geometry.Rotation2d;
import org.littletonrobotics.junction.AutoLog;

public interface ModuleIO {
  @AutoLog
  class ModuleIOInputs {
    public double drivePositionRad = 0.0;
    public double driveVelocityRadPerSec = 0.0;
    public Rotation2d turnPosition = new Rotation2d();
  }

  default void updateInputs(ModuleIOInputsAutoLogged inputs) {}
  default void setDriveVelocityRadPerSec(double radPerSec) {}
  default void setTurnAngle(Rotation2d angle) {}
}
`;

  const motorIoImport =
    dt.motorVendor === "talonfx"
      ? "import org.ciprix.interfaces.motor.MotorIOTalonFX;"
      : dt.motorVendor === "sparkmax"
        ? "import org.ciprix.interfaces.motor.MotorIOSparkMax;"
        : "import org.ciprix.interfaces.motor.MotorIOTalonSRX;";
  const motorCtor =
    dt.motorVendor === "talonfx"
      ? "MotorIOTalonFX"
      : dt.motorVendor === "sparkmax"
        ? "MotorIOSparkMax"
        : "MotorIOTalonSRX";
  const busDecl =
    dt.motorVendor === "talonfx"
      ? `  private final com.ctre.phoenix6.CANBus bus = ${dt.canBus.trim() ? `new com.ctre.phoenix6.CANBus("${dt.canBus.trim()}")` : "new com.ctre.phoenix6.CANBus()"};\n`
      : "";
  const busArg = dt.motorVendor === "talonfx" ? "bus, " : "";

  const realModule = `package ${fullPkg};

import static edu.wpi.first.units.Units.*;

import edu.wpi.first.math.geometry.Rotation2d;
${motorIoImport}
import org.ciprix.interfaces.motor.advanced.MotorConfig;
import org.ciprix.interfaces.motor.advanced.MotorIO;
import org.ciprix.interfaces.motor.advanced.MotorIO.MotorIOInputs;

public class ${realModClass} implements ModuleIO {
  private static final MotorConfig DRIVE_CFG =
      new MotorConfig().currentLimit(Amps.of(DriveConstants.CURRENT_LIMIT_AMPS)).brakeMode().pid(0, 0.1, 0, 0);
  private static final MotorConfig TURN_CFG =
      new MotorConfig().currentLimit(Amps.of(25)).brakeMode().pid(0, 6.0, 0, 0);

${busDecl}  private final MotorIO driveMotor;
  private final MotorIO turnMotor;
  private final MotorIOInputs driveInputs = new MotorIOInputs();
  private final MotorIOInputs turnInputs = new MotorIOInputs();

  public ${realModClass}(int index) {
    driveMotor = new ${motorCtor}("Drive/Mod" + index + "/Drive", DriveConstants.DRIVE_IDS[index], ${busArg}DRIVE_CFG);
    turnMotor = new ${motorCtor}("Drive/Mod" + index + "/Turn", DriveConstants.STEER_IDS[index], ${busArg}TURN_CFG);
  }

  @Override
  public void updateInputs(ModuleIOInputsAutoLogged inputs) {
    driveMotor.updateInputs(driveInputs);
    turnMotor.updateInputs(turnInputs);
    inputs.drivePositionRad = driveInputs.position.in(Radians) / DriveConstants.DRIVE_GEAR_RATIO;
    inputs.driveVelocityRadPerSec = driveInputs.velocity.in(RadiansPerSecond) / DriveConstants.DRIVE_GEAR_RATIO;
    inputs.turnPosition = Rotation2d.fromRotations(turnInputs.position.in(Rotations) / DriveConstants.STEER_GEAR_RATIO);
  }

  @Override
  public void setDriveVelocityRadPerSec(double radPerSec) {
    driveMotor.getMotorController().runVelocity(RadiansPerSecond.of(radPerSec * DriveConstants.DRIVE_GEAR_RATIO));
  }

  @Override
  public void setTurnAngle(Rotation2d angle) {
    turnMotor.getMotorController().runPosition(Rotations.of(angle.getRotations() * DriveConstants.STEER_GEAR_RATIO));
  }
}
`;

  const simModule = `package ${fullPkg};

import edu.wpi.first.math.geometry.Rotation2d;

public class ModuleIOSim implements ModuleIO {
  private double drivePosRad = 0.0;
  private double driveVelRadPerSec = 0.0;
  private Rotation2d turnPos = new Rotation2d();

  @Override
  public void updateInputs(ModuleIOInputsAutoLogged inputs) {
    drivePosRad += driveVelRadPerSec * 0.02;
    inputs.drivePositionRad = drivePosRad;
    inputs.driveVelocityRadPerSec = driveVelRadPerSec;
    inputs.turnPosition = turnPos;
  }

  @Override
  public void setDriveVelocityRadPerSec(double radPerSec) {
    this.driveVelRadPerSec = radPerSec;
  }

  @Override
  public void setTurnAngle(Rotation2d angle) {
    this.turnPos = angle;
  }
}
`;

  const moduleClass = `package ${fullPkg};

import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.kinematics.SwerveModulePosition;
import edu.wpi.first.math.kinematics.SwerveModuleState;
import org.littletonrobotics.junction.Logger;

public class Module {
  private final String name;
  private final ModuleIO io;
  private final ModuleIOInputsAutoLogged inputs = new ModuleIOInputsAutoLogged();

  public Module(String name, ModuleIO io) {
    this.name = name;
    this.io = io;
  }

  public void periodic() {
    io.updateInputs(inputs);
    Logger.processInputs("Drive/" + name, inputs);
  }

  public void runSetpoint(SwerveModuleState state) {
    state.optimize(inputs.turnPosition);
    io.setTurnAngle(state.angle);
    io.setDriveVelocityRadPerSec(state.speedMetersPerSecond / DriveConstants.WHEEL_RADIUS_METERS);
  }

  public SwerveModuleState getState() {
    return new SwerveModuleState(
        inputs.driveVelocityRadPerSec * DriveConstants.WHEEL_RADIUS_METERS, inputs.turnPosition);
  }

  public SwerveModulePosition getPosition() {
    return new SwerveModulePosition(
        inputs.drivePositionRad * DriveConstants.WHEEL_RADIUS_METERS, inputs.turnPosition);
  }
}
`;

  const imports = [
    ...renderDriveAssistantsImports(dt, hasZones),
    ...renderAutoBuilderImports(autonomous, false),
    "import edu.wpi.first.math.Matrix;",
    "import edu.wpi.first.math.estimator.SwerveDrivePoseEstimator;",
    "import edu.wpi.first.math.geometry.Pose2d;",
    "import edu.wpi.first.math.geometry.Rotation2d;",
    "import edu.wpi.first.math.kinematics.ChassisSpeeds;",
    "import edu.wpi.first.math.kinematics.SwerveDriveKinematics;",
    "import edu.wpi.first.math.kinematics.SwerveModulePosition;",
    "import edu.wpi.first.math.kinematics.SwerveModuleState;",
    "import edu.wpi.first.math.numbers.N1;",
    "import edu.wpi.first.math.numbers.N3;",
    "import edu.wpi.first.wpilibj2.command.Command;",
    "import edu.wpi.first.wpilibj2.command.Commands;",
    "import edu.wpi.first.wpilibj2.command.SubsystemBase;",
    "import org.littletonrobotics.junction.Logger;",
  ]
    .sort()
    .join("\n");

  const driveJava = `package ${fullPkg};

${imports}

/** AdvantageKit swerve subsystem implementing Ciprix {@link DriveContext}. */
public class Drive extends SubsystemBase implements DriveContext, DriveAccelerationLimits {
  private final GyroIO gyroIO;
  private final GyroIOInputsAutoLogged gyroInputs = new GyroIOInputsAutoLogged();
  private final Module[] modules = new Module[4];
  private final SwerveDriveKinematics kinematics =
      new SwerveDriveKinematics(DriveConstants.MODULE_TRANSLATIONS);
  private final SwerveDrivePoseEstimator poseEstimator;
  private Rotation2d rawGyroRotation = new Rotation2d();
${renderDriveContextMembers(dt, hasZones)}

  public Drive() {
    switch (CiprixSettings.getMode()) {
      case REAL -> {
        gyroIO = new ${realGyroClass}();
        for (int i = 0; i < 4; i++) modules[i] = new Module("Mod" + i, new ${realModClass}(i));
      }
      case SIM -> {
        gyroIO = new GyroIOSim();
        for (int i = 0; i < 4; i++) modules[i] = new Module("Mod" + i, new ModuleIOSim());
      }
      default -> {
        gyroIO = new GyroIO() {};
        for (int i = 0; i < 4; i++) modules[i] = new Module("Mod" + i, new ModuleIO() {});
      }
    }
    poseEstimator = new SwerveDrivePoseEstimator(kinematics, rawGyroRotation, getModulePositions(), new Pose2d());${autonomous?.enabled ? "\n    configureAutoBuilder();" : ""}
  }

  @Override
  public void periodic() {
    gyroIO.updateInputs(gyroInputs);
    Logger.processInputs("Drive/Gyro", gyroInputs);
    for (Module m : modules) m.periodic();

    ChassisSpeeds speeds = getRobotVelocity();
    if (gyroIO instanceof GyroIOSim simGyro) {
      simGyro.addDeltaYaw(speeds.omegaRadiansPerSecond * 0.02);
    }
    rawGyroRotation = gyroInputs.connected ? gyroInputs.yawPosition : rawGyroRotation;
    poseEstimator.update(rawGyroRotation, getModulePositions());

    Logger.recordOutput("Drive/Pose", getPose());
    Logger.recordOutput("Drive/ChassisSpeeds", speeds);
    Logger.recordOutput("Drive/SwerveStates/Measured", getModuleStates());${hasZones ? "\n    zonePeriodic.run();" : ""}
  }

  public void runVelocity(ChassisSpeeds speeds) {
    ChassisSpeeds discrete = ChassisSpeeds.discretize(speeds, 0.02);
    SwerveModuleState[] states = kinematics.toSwerveModuleStates(discrete);
    SwerveDriveKinematics.desaturateWheelSpeeds(states, maxSpeed.in(MetersPerSecond));
    Logger.recordOutput("Drive/SwerveStates/Desired", states);
    for (int i = 0; i < 4; i++) modules[i].runSetpoint(states[i]);
  }

  private SwerveModuleState[] getModuleStates() {
    SwerveModuleState[] arr = new SwerveModuleState[4];
    for (int i = 0; i < 4; i++) arr[i] = modules[i].getState();
    return arr;
  }

  private SwerveModulePosition[] getModulePositions() {
    SwerveModulePosition[] arr = new SwerveModulePosition[4];
    for (int i = 0; i < 4; i++) arr[i] = modules[i].getPosition();
    return arr;
  }

  @Override
  public Pose2d getPose() {
    return poseEstimator.getEstimatedPosition();
  }

  public void resetPose(Pose2d pose) {
    poseEstimator.resetPosition(rawGyroRotation, getModulePositions(), pose);
  }

  @Override
  public ChassisSpeeds getRobotVelocity() {
    return kinematics.toChassisSpeeds(getModuleStates());
  }

  public void driveRobotRelative(ChassisSpeeds speeds) {
    runVelocity(speeds);
  }

  public void addVisionMeasurement(
      Pose2d pose, double timestampSeconds, Matrix<N3, N1> standardDeviations) {
    poseEstimator.addVisionMeasurement(pose, timestampSeconds, standardDeviations);
  }

  public void zeroHeading() {
    poseEstimator.resetRotation(new Rotation2d());
  }

${renderDriveTeleopHelper(
  dt,
  `ChassisSpeeds target = fieldOriented
              ? ChassisSpeeds.fromFieldRelativeSpeeds(vx, vy, omega, getRotation())
              : new ChassisSpeeds(vx, vy, omega);
          runVelocity(target);`,
  hasZones,
)}${renderAutoBuilderMethod(autonomous, false)}
}
`;

  return [
    ...generateGyroIoFiles(dt, fullPkg, baseDir),
    { path: `${baseDir}/DriveConstants.java`, content: constantsJava },
    { path: `${baseDir}/ModuleIO.java`, content: moduleIo },
    { path: `${baseDir}/${realModClass}.java`, content: realModule },
    { path: `${baseDir}/ModuleIOSim.java`, content: simModule },
    { path: `${baseDir}/Module.java`, content: moduleClass },
    { path: `${baseDir}/Drive.java`, content: driveJava },
  ];
}

function generateDifferential(
  dt: DrivetrainConfig,
  basePackage: string,
  baseDir: string,
  hasZones: boolean,
  autonomous?: AutonomousConfig,
): GeneratedFile[] {
  const fullPkg = `${basePackage}.subsystems.drive`;
  const realDiffClass = diffIoVendorClass(dt.motorVendor);
  const wheelRadius = dt.wheelDiameterMeters / 2;

  const constantsJava = `package ${fullPkg};

public final class DriveConstants {
  private DriveConstants() {}

  public static final int LEFT_LEADER_ID = ${dt.differential.leftLeaderId};
  public static final int RIGHT_LEADER_ID = ${dt.differential.rightLeaderId};
  public static final boolean LEFT_INVERTED = ${dt.differential.leftInverted};
  public static final boolean RIGHT_INVERTED = ${dt.differential.rightInverted};
  public static final double TRACK_WIDTH_METERS = ${formatDouble(dt.trackWidthMeters)};
  public static final double WHEEL_RADIUS_METERS = ${formatDouble(wheelRadius)};
  public static final double GEAR_RATIO = ${formatDouble(dt.driveGearRatio)};
  public static final int CURRENT_LIMIT_AMPS = ${dt.currentLimitAmps};
}
`;

  const driveIo = `package ${fullPkg};

import org.littletonrobotics.junction.AutoLog;

public interface DriveIO {
  @AutoLog
  class DriveIOInputs {
    public double leftPositionMeters = 0.0;
    public double rightPositionMeters = 0.0;
    public double leftVelocityMps = 0.0;
    public double rightVelocityMps = 0.0;
  }

  default void updateInputs(DriveIOInputsAutoLogged inputs) {}
  default void setWheelVolts(double leftVolts, double rightVolts) {}
}
`;

  const motorIoImport =
    dt.motorVendor === "talonfx"
      ? "import org.ciprix.interfaces.motor.MotorIOTalonFX;"
      : dt.motorVendor === "sparkmax"
        ? "import org.ciprix.interfaces.motor.MotorIOSparkMax;"
        : "import org.ciprix.interfaces.motor.MotorIOTalonSRX;";
  const motorCtor =
    dt.motorVendor === "talonfx"
      ? "MotorIOTalonFX"
      : dt.motorVendor === "sparkmax"
        ? "MotorIOSparkMax"
        : "MotorIOTalonSRX";
  const busDecl =
    dt.motorVendor === "talonfx"
      ? `  private final com.ctre.phoenix6.CANBus bus = ${dt.canBus.trim() ? `new com.ctre.phoenix6.CANBus("${dt.canBus.trim()}")` : "new com.ctre.phoenix6.CANBus()"};\n`
      : "";
  const busArg = dt.motorVendor === "talonfx" ? "bus, " : "";

  const realDiff = `package ${fullPkg};

import static edu.wpi.first.units.Units.*;

${motorIoImport}
import org.ciprix.interfaces.motor.advanced.MotorConfig;
import org.ciprix.interfaces.motor.advanced.MotorIO;
import org.ciprix.interfaces.motor.advanced.MotorIO.MotorIOInputs;

public class ${realDiffClass} implements DriveIO {
  private static final MotorConfig LEFT_CFG =
      new MotorConfig().currentLimit(Amps.of(DriveConstants.CURRENT_LIMIT_AMPS)).brakeMode().inverted(DriveConstants.LEFT_INVERTED);
  private static final MotorConfig RIGHT_CFG =
      new MotorConfig().currentLimit(Amps.of(DriveConstants.CURRENT_LIMIT_AMPS)).brakeMode().inverted(DriveConstants.RIGHT_INVERTED);

${busDecl}  private final MotorIO left = new ${motorCtor}("Drive/Left", DriveConstants.LEFT_LEADER_ID, ${busArg}LEFT_CFG);
  private final MotorIO right = new ${motorCtor}("Drive/Right", DriveConstants.RIGHT_LEADER_ID, ${busArg}RIGHT_CFG);
  private final MotorIOInputs leftInputs = new MotorIOInputs();
  private final MotorIOInputs rightInputs = new MotorIOInputs();

  @Override
  public void updateInputs(DriveIOInputsAutoLogged inputs) {
    left.updateInputs(leftInputs);
    right.updateInputs(rightInputs);
    double circum = 2.0 * Math.PI * DriveConstants.WHEEL_RADIUS_METERS / DriveConstants.GEAR_RATIO;
    inputs.leftPositionMeters = leftInputs.position.in(Rotations) * circum;
    inputs.rightPositionMeters = rightInputs.position.in(Rotations) * circum;
    inputs.leftVelocityMps = leftInputs.velocity.in(RotationsPerSecond) * circum;
    inputs.rightVelocityMps = rightInputs.velocity.in(RotationsPerSecond) * circum;
  }

  @Override
  public void setWheelVolts(double leftVolts, double rightVolts) {
    left.getMotorController().runPercentOutput(leftVolts / 12.0);
    right.getMotorController().runPercentOutput(rightVolts / 12.0);
  }
}
`;

  const simDiff = `package ${fullPkg};

import edu.wpi.first.math.system.plant.DCMotor;
import edu.wpi.first.wpilibj.simulation.DifferentialDrivetrainSim;

public class DriveIOSim implements DriveIO {
  private final DifferentialDrivetrainSim sim =
      new DifferentialDrivetrainSim(
          DCMotor.getNEO(2),
          DriveConstants.GEAR_RATIO,
          4.5,
          45.0,
          DriveConstants.WHEEL_RADIUS_METERS,
          DriveConstants.TRACK_WIDTH_METERS,
          null);

  @Override
  public void updateInputs(DriveIOInputsAutoLogged inputs) {
    sim.update(0.02);
    inputs.leftPositionMeters = sim.getLeftPositionMeters();
    inputs.rightPositionMeters = sim.getRightPositionMeters();
    inputs.leftVelocityMps = sim.getLeftVelocityMetersPerSecond();
    inputs.rightVelocityMps = sim.getRightVelocityMetersPerSecond();
  }

  @Override
  public void setWheelVolts(double leftVolts, double rightVolts) {
    sim.setInputs(leftVolts, rightVolts);
  }
}
`;

  const imports = [
    ...renderDriveAssistantsImports(dt, hasZones),
    ...renderAutoBuilderImports(autonomous, true),
    "import edu.wpi.first.math.Matrix;",
    "import edu.wpi.first.math.estimator.DifferentialDrivePoseEstimator;",
    "import edu.wpi.first.math.geometry.Pose2d;",
    "import edu.wpi.first.math.geometry.Rotation2d;",
    "import edu.wpi.first.math.kinematics.ChassisSpeeds;",
    "import edu.wpi.first.math.kinematics.DifferentialDriveKinematics;",
    "import edu.wpi.first.math.kinematics.DifferentialDriveWheelSpeeds;",
    "import edu.wpi.first.math.numbers.N1;",
    "import edu.wpi.first.math.numbers.N3;",
    "import edu.wpi.first.wpilibj.drive.DifferentialDrive;",
    "import edu.wpi.first.wpilibj2.command.Command;",
    "import edu.wpi.first.wpilibj2.command.Commands;",
    "import edu.wpi.first.wpilibj2.command.SubsystemBase;",
    "import org.littletonrobotics.junction.Logger;",
  ]
    .sort()
    .join("\n");

  const driveJava = `package ${fullPkg};

${imports}

/** Differential (Tank) drivetrain implementing Ciprix {@link DriveContext}. */
public class Drive extends SubsystemBase implements DriveContext, DriveAccelerationLimits {
  private final DriveIO io;
  private final GyroIO gyroIO;
  private final DriveIOInputsAutoLogged inputs = new DriveIOInputsAutoLogged();
  private final GyroIOInputsAutoLogged gyroInputs = new GyroIOInputsAutoLogged();
  private final DifferentialDriveKinematics kinematics =
      new DifferentialDriveKinematics(DriveConstants.TRACK_WIDTH_METERS);
  private final DifferentialDrivePoseEstimator poseEstimator;
  private Rotation2d heading = new Rotation2d();
${renderDriveContextMembers(dt, hasZones)}

  public Drive() {
    switch (CiprixSettings.getMode()) {
      case REAL -> {
        io = new ${realDiffClass}();
        gyroIO = new ${gyroClassName(dt.gyro.type)}();
      }
      case SIM -> {
        io = new DriveIOSim();
        gyroIO = new GyroIOSim();
      }
      default -> {
        io = new DriveIO() {};
        gyroIO = new GyroIO() {};
      }
    }
    poseEstimator = new DifferentialDrivePoseEstimator(kinematics, heading, 0.0, 0.0, new Pose2d());${autonomous?.enabled ? "\n    configureAutoBuilder();" : ""}
  }

  @Override
  public void periodic() {
    io.updateInputs(inputs);
    gyroIO.updateInputs(gyroInputs);
    Logger.processInputs("Drive", inputs);
    Logger.processInputs("Drive/Gyro", gyroInputs);

    if (gyroIO instanceof GyroIOSim simGyro) {
      simGyro.addDeltaYaw(getRobotVelocity().omegaRadiansPerSecond * 0.02);
    }
    heading = gyroInputs.connected ? gyroInputs.yawPosition : heading;
    poseEstimator.update(heading, inputs.leftPositionMeters, inputs.rightPositionMeters);

    Logger.recordOutput("Drive/Pose", getPose());
    Logger.recordOutput("Drive/ChassisSpeeds", getRobotVelocity());${hasZones ? "\n    zonePeriodic.run();" : ""}
  }

  @Override
  public Pose2d getPose() {
    return poseEstimator.getEstimatedPosition();
  }

  public void resetPose(Pose2d pose) {
    poseEstimator.resetPosition(heading, inputs.leftPositionMeters, inputs.rightPositionMeters, pose);
  }

  @Override
  public ChassisSpeeds getRobotVelocity() {
    return kinematics.toChassisSpeeds(
        new DifferentialDriveWheelSpeeds(inputs.leftVelocityMps, inputs.rightVelocityMps));
  }

  public void driveRobotRelative(ChassisSpeeds speeds) {
    DifferentialDriveWheelSpeeds ws = kinematics.toWheelSpeeds(speeds);
    double maxSpd = maxSpeed.in(MetersPerSecond);
    io.setWheelVolts((ws.leftMetersPerSecond / maxSpd) * 12.0, (ws.rightMetersPerSecond / maxSpd) * 12.0);
  }

  public void addVisionMeasurement(
      Pose2d pose, double timestampSeconds, Matrix<N3, N1> standardDeviations) {
    poseEstimator.addVisionMeasurement(pose, timestampSeconds, standardDeviations);
  }

  public void zeroHeading() {
    poseEstimator.resetRotation(new Rotation2d());
  }

${renderDriveTeleopHelper(
  dt,
  `DifferentialDrive.WheelSpeeds wheelSpeeds =
              DifferentialDrive.arcadeDriveIK(vx / maxSpeed.in(MetersPerSecond), omega / maxAngularSpeed.in(RadiansPerSecond), false);
          io.setWheelVolts(wheelSpeeds.left * 12.0, wheelSpeeds.right * 12.0);`,
)}${renderAutoBuilderMethod(autonomous, true)}
}
`;

  return [
    ...generateGyroIoFiles(dt, fullPkg, baseDir),
    { path: `${baseDir}/DriveConstants.java`, content: constantsJava },
    { path: `${baseDir}/DriveIO.java`, content: driveIo },
    { path: `${baseDir}/${realDiffClass}.java`, content: realDiff },
    { path: `${baseDir}/DriveIOSim.java`, content: simDiff },
    { path: `${baseDir}/Drive.java`, content: driveJava },
  ];
}

function generateMecanum(
  dt: DrivetrainConfig,
  basePackage: string,
  baseDir: string,
  hasZones: boolean,
  autonomous?: AutonomousConfig,
): GeneratedFile[] {
  const fullPkg = `${basePackage}.subsystems.drive`;
  const realMecClass = diffIoVendorClass(dt.motorVendor);
  const wheelRadius = dt.wheelDiameterMeters / 2;

  const constantsJava = `package ${fullPkg};

import edu.wpi.first.math.geometry.Translation2d;

public final class DriveConstants {
  private DriveConstants() {}

  public static final int FL_ID = ${dt.modules.fl.driveCanId};
  public static final int FR_ID = ${dt.modules.fr.driveCanId};
  public static final int BL_ID = ${dt.modules.bl.driveCanId};
  public static final int BR_ID = ${dt.modules.br.driveCanId};
  public static final double TRACK_WIDTH_METERS = ${formatDouble(dt.trackWidthMeters)};
  public static final double WHEEL_BASE_METERS = ${formatDouble(dt.wheelBaseMeters)};
  public static final double WHEEL_RADIUS_METERS = ${formatDouble(wheelRadius)};
  public static final double GEAR_RATIO = ${formatDouble(dt.driveGearRatio)};
  public static final int CURRENT_LIMIT_AMPS = ${dt.currentLimitAmps};

  public static final Translation2d FL_POS = new Translation2d(WHEEL_BASE_METERS / 2.0, TRACK_WIDTH_METERS / 2.0);
  public static final Translation2d FR_POS = new Translation2d(WHEEL_BASE_METERS / 2.0, -TRACK_WIDTH_METERS / 2.0);
  public static final Translation2d BL_POS = new Translation2d(-WHEEL_BASE_METERS / 2.0, TRACK_WIDTH_METERS / 2.0);
  public static final Translation2d BR_POS = new Translation2d(-WHEEL_BASE_METERS / 2.0, -TRACK_WIDTH_METERS / 2.0);
}
`;

  const driveIo = `package ${fullPkg};

import org.littletonrobotics.junction.AutoLog;

public interface DriveIO {
  @AutoLog
  class DriveIOInputs {
    public double flMeters = 0.0;
    public double frMeters = 0.0;
    public double blMeters = 0.0;
    public double brMeters = 0.0;
    public double flMps = 0.0;
    public double frMps = 0.0;
    public double blMps = 0.0;
    public double brMps = 0.0;
  }

  default void updateInputs(DriveIOInputsAutoLogged inputs) {}
  default void setWheelSpeedsMps(double fl, double fr, double bl, double br) {}
}
`;

  const simMec = `package ${fullPkg};

public class DriveIOSim implements DriveIO {
  private double flMps, frMps, blMps, brMps;
  private double flMeters, frMeters, blMeters, brMeters;

  @Override
  public void updateInputs(DriveIOInputsAutoLogged inputs) {
    flMeters += flMps * 0.02;
    frMeters += frMps * 0.02;
    blMeters += blMps * 0.02;
    brMeters += brMps * 0.02;
    inputs.flMeters = flMeters;
    inputs.frMeters = frMeters;
    inputs.blMeters = blMeters;
    inputs.brMeters = brMeters;
    inputs.flMps = flMps;
    inputs.frMps = frMps;
    inputs.blMps = blMps;
    inputs.brMps = brMps;
  }

  @Override
  public void setWheelSpeedsMps(double fl, double fr, double bl, double br) {
    this.flMps = fl;
    this.frMps = fr;
    this.blMps = bl;
    this.brMps = br;
  }
}
`;

  const imports = [
    ...renderDriveAssistantsImports(dt, hasZones),
    ...renderAutoBuilderImports(autonomous, false),
    "import edu.wpi.first.math.Matrix;",
    "import edu.wpi.first.math.estimator.MecanumDrivePoseEstimator;",
    "import edu.wpi.first.math.geometry.Pose2d;",
    "import edu.wpi.first.math.geometry.Rotation2d;",
    "import edu.wpi.first.math.kinematics.ChassisSpeeds;",
    "import edu.wpi.first.math.kinematics.MecanumDriveKinematics;",
    "import edu.wpi.first.math.kinematics.MecanumDriveWheelPositions;",
    "import edu.wpi.first.math.kinematics.MecanumDriveWheelSpeeds;",
    "import edu.wpi.first.math.numbers.N1;",
    "import edu.wpi.first.math.numbers.N3;",
    "import edu.wpi.first.wpilibj.drive.MecanumDrive;",
    "import edu.wpi.first.wpilibj2.command.Command;",
    "import edu.wpi.first.wpilibj2.command.Commands;",
    "import edu.wpi.first.wpilibj2.command.SubsystemBase;",
    "import org.littletonrobotics.junction.Logger;",
  ]
    .sort()
    .join("\n");

  const driveJava = `package ${fullPkg};

${imports}

/** WPILib Mecanum drivetrain implementing Ciprix {@link DriveContext}. */
public class Drive extends SubsystemBase implements DriveContext, DriveAccelerationLimits {
  private final DriveIO io;
  private final GyroIO gyroIO;
  private final DriveIOInputsAutoLogged inputs = new DriveIOInputsAutoLogged();
  private final GyroIOInputsAutoLogged gyroInputs = new GyroIOInputsAutoLogged();
  private final MecanumDriveKinematics kinematics =
      new MecanumDriveKinematics(
          DriveConstants.FL_POS, DriveConstants.FR_POS, DriveConstants.BL_POS, DriveConstants.BR_POS);
  private final MecanumDrivePoseEstimator poseEstimator;
  private Rotation2d heading = new Rotation2d();
${renderDriveContextMembers(dt, hasZones)}

  public Drive() {
    switch (CiprixSettings.getMode()) {
      case REAL -> {
        io = new ${realMecClass}();
        gyroIO = new ${gyroClassName(dt.gyro.type)}();
      }
      case SIM -> {
        io = new DriveIOSim();
        gyroIO = new GyroIOSim();
      }
      default -> {
        io = new DriveIO() {};
        gyroIO = new GyroIO() {};
      }
    }
    poseEstimator =
        new MecanumDrivePoseEstimator(
            kinematics, heading, new MecanumDriveWheelPositions(), new Pose2d());${autonomous?.enabled ? "\n    configureAutoBuilder();" : ""}
  }

  @Override
  public void periodic() {
    io.updateInputs(inputs);
    gyroIO.updateInputs(gyroInputs);
    Logger.processInputs("Drive", inputs);
    Logger.processInputs("Drive/Gyro", gyroInputs);
    if (gyroIO instanceof GyroIOSim simGyro) {
      simGyro.addDeltaYaw(getRobotVelocity().omegaRadiansPerSecond * 0.02);
    }
    heading = gyroInputs.connected ? gyroInputs.yawPosition : heading;
    poseEstimator.update(
        heading,
        new MecanumDriveWheelPositions(inputs.flMeters, inputs.frMeters, inputs.blMeters, inputs.brMeters));
    Logger.recordOutput("Drive/Pose", getPose());
    Logger.recordOutput("Drive/ChassisSpeeds", getRobotVelocity());${hasZones ? "\n    zonePeriodic.run();" : ""}
  }

  @Override
  public Pose2d getPose() {
    return poseEstimator.getEstimatedPosition();
  }

  public void resetPose(Pose2d pose) {
    poseEstimator.resetPosition(
        heading,
        new MecanumDriveWheelPositions(inputs.flMeters, inputs.frMeters, inputs.blMeters, inputs.brMeters),
        pose);
  }

  @Override
  public ChassisSpeeds getRobotVelocity() {
    return kinematics.toChassisSpeeds(
        new MecanumDriveWheelSpeeds(inputs.flMps, inputs.frMps, inputs.blMps, inputs.brMps));
  }

  public void driveRobotRelative(ChassisSpeeds speeds) {
    MecanumDriveWheelSpeeds ws = kinematics.toWheelSpeeds(speeds);
    io.setWheelSpeedsMps(
        ws.frontLeftMetersPerSecond,
        ws.frontRightMetersPerSecond,
        ws.rearLeftMetersPerSecond,
        ws.rearRightMetersPerSecond);
  }

  public void addVisionMeasurement(
      Pose2d pose, double timestampSeconds, Matrix<N3, N1> standardDeviations) {
    poseEstimator.addVisionMeasurement(pose, timestampSeconds, standardDeviations);
  }

  public void zeroHeading() {
    poseEstimator.resetRotation(new Rotation2d());
  }

${renderDriveTeleopHelper(
  dt,
  `MecanumDrive.WheelSpeeds ws =
              MecanumDrive.driveIK(
                  vx / maxSpeed.in(MetersPerSecond),
                  vy / maxSpeed.in(MetersPerSecond),
                  omega / maxAngularSpeed.in(RadiansPerSecond),
                  fieldOriented ? getRotation() : new Rotation2d());
          double maxSpd = maxSpeed.in(MetersPerSecond);
          io.setWheelSpeedsMps(ws.frontLeft * maxSpd, ws.frontRight * maxSpd, ws.rearLeft * maxSpd, ws.rearRight * maxSpd);`,
  hasZones,
)}${renderAutoBuilderMethod(autonomous, false)}
}
`;

  const motorIoImport =
    dt.motorVendor === "talonfx"
      ? "import org.ciprix.interfaces.motor.MotorIOTalonFX;"
      : dt.motorVendor === "sparkmax"
        ? "import org.ciprix.interfaces.motor.MotorIOSparkMax;"
        : "import org.ciprix.interfaces.motor.MotorIOTalonSRX;";
  const motorCtor =
    dt.motorVendor === "talonfx"
      ? "MotorIOTalonFX"
      : dt.motorVendor === "sparkmax"
        ? "MotorIOSparkMax"
        : "MotorIOTalonSRX";
  const busDecl =
    dt.motorVendor === "talonfx"
      ? `  private final com.ctre.phoenix6.CANBus bus = ${dt.canBus.trim() ? `new com.ctre.phoenix6.CANBus("${dt.canBus.trim()}")` : "new com.ctre.phoenix6.CANBus()"};\n`
      : "";
  const busArg = dt.motorVendor === "talonfx" ? "bus, " : "";

  const realMec = `package ${fullPkg};

import static edu.wpi.first.units.Units.*;

${motorIoImport}
import org.ciprix.interfaces.motor.advanced.MotorConfig;
import org.ciprix.interfaces.motor.advanced.MotorIO;

public class ${realMecClass} implements DriveIO {
  private static final MotorConfig CFG =
      new MotorConfig().currentLimit(Amps.of(DriveConstants.CURRENT_LIMIT_AMPS)).brakeMode();
${busDecl}  private final MotorIO fl = new ${motorCtor}("Drive/FL", DriveConstants.FL_ID, ${busArg}CFG);
  private final MotorIO fr = new ${motorCtor}("Drive/FR", DriveConstants.FR_ID, ${busArg}CFG);
  private final MotorIO bl = new ${motorCtor}("Drive/BL", DriveConstants.BL_ID, ${busArg}CFG);
  private final MotorIO br = new ${motorCtor}("Drive/BR", DriveConstants.BR_ID, ${busArg}CFG);

  @Override
  public void setWheelSpeedsMps(double flMps, double frMps, double blMps, double brMps) {
    double rpsPerMps = DriveConstants.GEAR_RATIO / (2.0 * Math.PI * DriveConstants.WHEEL_RADIUS_METERS);
    fl.getMotorController().runVelocity(RotationsPerSecond.of(flMps * rpsPerMps));
    fr.getMotorController().runVelocity(RotationsPerSecond.of(frMps * rpsPerMps));
    bl.getMotorController().runVelocity(RotationsPerSecond.of(blMps * rpsPerMps));
    br.getMotorController().runVelocity(RotationsPerSecond.of(brMps * rpsPerMps));
  }
}
`;

  return [
    ...generateGyroIoFiles(dt, fullPkg, baseDir),
    { path: `${baseDir}/DriveConstants.java`, content: constantsJava },
    { path: `${baseDir}/DriveIO.java`, content: driveIo },
    { path: `${baseDir}/${realMecClass}.java`, content: realMec },
    { path: `${baseDir}/DriveIOSim.java`, content: simMec },
    { path: `${baseDir}/Drive.java`, content: driveJava },
  ];
}

export function generateDrivetrainFiles(
  drivetrain: DrivetrainConfig | undefined,
  basePackage: string,
  hasZones = false,
  autonomous?: AutonomousConfig,
): GeneratedFile[] {
  if (!drivetrain?.enabled) return [];

  const pkgPrefix = basePackage.replace(/\./g, "/");
  const baseDir = `src/main/java/${pkgPrefix}/subsystems/drive`;

  switch (drivetrain.type) {
    case "ctre_swerve":
      return generateCtreSwerve(drivetrain, basePackage, baseDir, hasZones, autonomous);
    case "yagsl":
      return generateYagsl(drivetrain, basePackage, baseDir, hasZones, autonomous);
    case "akit_swerve":
      return generateAkitSwerve(drivetrain, basePackage, baseDir, hasZones, autonomous);
    case "differential":
      return generateDifferential(drivetrain, basePackage, baseDir, hasZones, autonomous);
    case "mecanum":
      return generateMecanum(drivetrain, basePackage, baseDir, hasZones, autonomous);
  }
}
