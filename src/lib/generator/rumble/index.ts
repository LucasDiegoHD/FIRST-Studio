import type { GeneratedFile } from "../subsystems/roller";

export function generateRumbleArbiterFile(basePackage: string): GeneratedFile {
  const pkgPrefix = basePackage.replace(/\./g, "/");
  const fullPkg = `${basePackage}.subsystems.rumble`;

  const content = `package ${fullPkg};

import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.CommandScheduler;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.button.CommandXboxController;
import java.util.function.Supplier;
import org.ciprix.controller.VibrateXboxController;

/** Coordinates Xbox controller haptic rumble requests without priority conflicts. */
public class RumbleArbiter {
  public enum TargetController {
    PILOT,
    COPILOT,
    BOTH
  }

  private final VibrateXboxController pilotVibrate;
  private final VibrateXboxController copilotVibrate;

  private int pilotPriority = Integer.MIN_VALUE;
  private Command activePilotCommand = null;

  private int copilotPriority = Integer.MIN_VALUE;
  private Command activeCopilotCommand = null;

  public RumbleArbiter(CommandXboxController pilot, CommandXboxController copilot) {
    this.pilotVibrate = new VibrateXboxController(pilot);
    this.copilotVibrate = new VibrateXboxController(copilot);
  }

  public Command trigger(
      TargetController target,
      int priority,
      Supplier<Command> commandFactoryForPilot,
      Supplier<Command> commandFactoryForCopilot) {
    return Commands.runOnce(
        () -> {
          if (target == TargetController.PILOT || target == TargetController.BOTH) {
            scheduleForSlot(true, priority, commandFactoryForPilot.get());
          }
          if (target == TargetController.COPILOT || target == TargetController.BOTH) {
            scheduleForSlot(false, priority, commandFactoryForCopilot.get());
          }
        });
  }

  public VibrateXboxController pilot() {
    return pilotVibrate;
  }

  public VibrateXboxController copilot() {
    return copilotVibrate;
  }

  private void scheduleForSlot(boolean isPilot, int priority, Command baseCommand) {
    int currentPriority = isPilot ? pilotPriority : copilotPriority;
    Command currentCommand = isPilot ? activePilotCommand : activeCopilotCommand;

    if (currentCommand != null && currentCommand.isScheduled() && priority < currentPriority) {
      return;
    }
    if (currentCommand != null && currentCommand.isScheduled()) {
      currentCommand.cancel();
    }

    Command tracked =
        baseCommand.finallyDo(
            () -> {
              if (isPilot) {
                pilotPriority = Integer.MIN_VALUE;
                activePilotCommand = null;
              } else {
                copilotPriority = Integer.MIN_VALUE;
                activeCopilotCommand = null;
              }
            });

    if (isPilot) {
      pilotPriority = priority;
      activePilotCommand = tracked;
    } else {
      copilotPriority = priority;
      activeCopilotCommand = tracked;
    }
    CommandScheduler.getInstance().schedule(tracked);
  }
}
`;

  return {
    path: `src/main/java/${pkgPrefix}/subsystems/rumble/RumbleArbiter.java`,
    content,
  };
}
