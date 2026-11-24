import type { CiprixProject, SubsystemConfig } from "../schema/ciprix-project";

/**
 * Generates Mermaid stateDiagram-v2 markup matching Ciprix StateMachine.toMermaid().
 */
export function generateSubsystemMermaid(subsystem: SubsystemConfig): string {
  const lines: string[] = [
    "stateDiagram-v2",
    `  [*] --> ${subsystem.fsm.initialState}`,
  ];

  for (const st of subsystem.fsm.states) {
    for (const tr of st.transitions ?? []) {
      const label =
        tr.trigger === "afterSeconds"
          ? `after ${tr.value ?? 0.5}s`
          : tr.trigger === "atSetpoint"
            ? "atSetpoint"
            : tr.trigger === "stalled"
              ? "stalled"
              : `I >= ${tr.value ?? 25}A`;
      lines.push(`  ${st.name} --> ${tr.targetState} : ${label}`);
    }
    if (st.timeoutAfterSec !== undefined && subsystem.fsm.securityState) {
      lines.push(`  ${st.name} --> ${subsystem.fsm.securityState} : timeout ${st.timeoutAfterSec}s`);
    }
  }

  if (subsystem.fsm.bindings.length > 0) {
    lines.push('  state "any state" as ANY_STATE');
    for (const binding of subsystem.fsm.bindings) {
      lines.push(`  ANY_STATE --> ${binding.entryState} : ${binding.request}`);
      if (binding.goalState !== binding.entryState) {
        lines.push(`  ${binding.entryState} --> ${binding.goalState} : complete`);
      }
    }
  }

  return lines.join("\n");
}

export function generateSuperStructureMermaid(project: CiprixProject): string {
  const lines: string[] = [
    "stateDiagram-v2",
    `  [*] --> ${project.superstructure.initialState}`,
  ];

  for (const tr of project.superstructure.transitions ?? []) {
    const label =
      tr.condition === "afterSeconds"
        ? `after ${tr.seconds ?? 1}s`
        : tr.condition === "allAtGoal"
          ? "allAtGoal()"
          : "atGoal()";
    lines.push(`  ${tr.fromState} --> ${tr.toState} : ${label}`);
  }

  if (project.superstructure.bindings.length > 0) {
    lines.push('  state "any state" as ANY_STATE');
    for (const binding of project.superstructure.bindings) {
      lines.push(`  ANY_STATE --> ${binding.entryState} : ${binding.request}`);
    }
  }

  return lines.join("\n");
}
