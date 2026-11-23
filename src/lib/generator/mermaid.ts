import type { CiprixProject, SubsystemConfig } from "../schema/ciprix-project";

/**
 * Generates Mermaid stateDiagram-v2 markup matching Ciprix StateMachine.toMermaid().
 */
export function generateSubsystemMermaid(subsystem: SubsystemConfig): string {
  const lines: string[] = [
    "stateDiagram-v2",
    `  [*] --> ${subsystem.fsm.initialState}`,
  ];

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

  if (project.superstructure.bindings.length > 0) {
    lines.push('  state "any state" as ANY_STATE');
    for (const binding of project.superstructure.bindings) {
      lines.push(`  ANY_STATE --> ${binding.entryState} : ${binding.request}`);
    }
  }

  return lines.join("\n");
}
