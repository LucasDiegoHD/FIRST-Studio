import { describe, expect, it } from "vitest";
import { generateProjectFiles, getRequiredVendordeps } from "../generator";
import { createSkeletonPreset } from "../presets/skeleton";
import { CiprixProjectSchema } from "../schema/ciprix-project";
import { validateProject } from "../validator";

describe("FIRST Studio Ciprix generator", () => {
  it("validates the skeleton preset with zero issues", () => {
    const preset = createSkeletonPreset();
    expect(() => CiprixProjectSchema.parse(preset)).not.toThrow();
    expect(validateProject(preset)).toEqual([]);
  });

  it("generates all Ciprix skeleton Java and config files", () => {
    const preset = createSkeletonPreset();
    const files = generateProjectFiles(preset);
    const byPath = new Map(files.map((f) => [f.path, f.content]));

    const expectedPaths = [
      "src/main/java/frc/robot/Main.java",
      "src/main/java/frc/robot/Constants.java",
      "src/main/java/frc/robot/Robot.java",
      "src/main/java/frc/robot/RobotContainer.java",
      "src/main/java/frc/robot/subsystems/superstructure/SuperStructure.java",
      "src/main/java/frc/robot/commands/SuperStructureCommands.java",
      "src/main/java/frc/robot/subsystems/roller/Roller.java",
      "src/main/java/frc/robot/subsystems/roller/RollerConstants.java",
      "src/main/java/frc/robot/subsystems/roller/RollerIO.java",
      "src/main/java/frc/robot/subsystems/roller/RollerIOSim.java",
      "src/main/java/frc/robot/subsystems/roller/RollerIOTalonFX.java",
      ".wpilib/wpilib_preferences.json",
      "settings.gradle",
      "ciprix-project.json",
    ];

    for (const path of expectedPaths) {
      expect(byPath.has(path)).toBe(true);
    }

    const rollerJava = byPath.get("src/main/java/frc/robot/subsystems/roller/Roller.java")!;
    expect(rollerJava).toContain("@AutoCommandFactory(requestEnum = RollerRequest.class)");
    expect(rollerJava).toContain("extends StateSubsystem<RollerRequest, RollerState, RollerIOInputsAutoLogged, RollerIO>");
    expect(rollerJava).toContain("fsm.validateComplete();");

    const talonFxJava = byPath.get("src/main/java/frc/robot/subsystems/roller/RollerIOTalonFX.java")!;
    expect(talonFxJava).toContain("new MotorIOTalonFX(");

    const simJava = byPath.get("src/main/java/frc/robot/subsystems/roller/RollerIOSim.java")!;
    expect(simJava).toContain("MotorIOSim.talonFX(");

    const superJava = byPath.get("src/main/java/frc/robot/subsystems/superstructure/SuperStructure.java")!;
    expect(superJava).toContain("extends SuperStructureBase<RobotRequest, RobotState>");
    expect(superJava).toContain("public RollerRequest getRollerRequest()");

    const cmdsJava = byPath.get("src/main/java/frc/robot/commands/SuperStructureCommands.java")!;
    expect(cmdsJava).toContain("BooleanSupplier ejectButton, BooleanSupplier intakeButton");

    expect(getRequiredVendordeps(preset)).toEqual([
      "AdvantageKit.json",
      "Ciprix.json",
      "Phoenix6-26.3.0.json",
      "WPILibNewCommands.json",
    ]);
  });

  it("supports sparkmax and talonsrx vendors", () => {
    const sparkProject = createSkeletonPreset();
    sparkProject.subsystems[0].motor.vendor = "sparkmax";
    const sparkFiles = new Map(generateProjectFiles(sparkProject).map((f) => [f.path, f.content]));

    expect(sparkFiles.get("src/main/java/frc/robot/subsystems/roller/RollerIOSparkMax.java")).toContain(
      "new MotorIOSparkMax(",
    );
    expect(sparkFiles.get("src/main/java/frc/robot/subsystems/roller/RollerIOSim.java")).toContain(
      "MotorIOSim.spark(",
    );
    expect(getRequiredVendordeps(sparkProject)).toContain("REVLib.json");

    const srxProject = createSkeletonPreset();
    srxProject.subsystems[0].motor.vendor = "talonsrx";
    const srxFiles = new Map(generateProjectFiles(srxProject).map((f) => [f.path, f.content]));

    expect(srxFiles.get("src/main/java/frc/robot/subsystems/roller/RollerIOTalonSRX.java")).toContain(
      "new MotorIOTalonSRX(",
    );
    expect(getRequiredVendordeps(srxProject)).toContain("Phoenix5-5.36.0.json");
  });

  it("detects duplicate CAN IDs, duplicate Xbox buttons, and duplicate subsystem names", () => {
    const project = createSkeletonPreset();
    const second = structuredClone(project.subsystems[0]);
    second.id = "roller_2";
    project.subsystems.push(second);
    project.controls.pilotPriority.push({
      id: "pilot-dup",
      button: "rightBumper",
      request: "INTAKE",
    });

    const issues = validateProject(project);
    expect(issues.some((i) => i.id.startsWith("sub-dup-name"))).toBe(true);
    expect(issues.some((i) => i.id.startsWith("can-dup"))).toBe(true);
    expect(issues.some((i) => i.id.startsWith("pilot-btn-dup"))).toBe(true);
  });
});
