import { isMotorSubsystem, type CiprixProject, type SubsystemConfig } from "../schema/ciprix-project";

/**
 * Generates Mermaid stateDiagram-v2 markup matching Ciprix StateMachine.toMermaid().
 */
export function generateSubsystemMermaid(subsystem: SubsystemConfig): string {
  if (!isMotorSubsystem(subsystem)) {
    return [
      "stateDiagram-v2",
      `  note right of LEDS : ${subsystem.name} (${subsystem.leds?.driver ?? "addressableLed"})`,
    ].join("\n");
  }

  const lines: string[] = [
    "stateDiagram-v2",
    `  [*] --> ${subsystem.fsm.initialState}`,
  ];

  const sensorNameById = new Map((subsystem.sensors ?? []).map((s) => [s.id, s.name]));

  for (const st of subsystem.fsm.states) {
    for (const tr of st.transitions ?? []) {
      const sName = tr.sensorId ? (sensorNameById.get(tr.sensorId) ?? tr.sensorId) : "sensor";
      const label =
        tr.trigger === "afterSeconds"
          ? `after ${tr.value ?? 0.5}s`
          : tr.trigger === "atSetpoint"
            ? "atSetpoint"
            : tr.trigger === "stalled"
              ? "stalled"
              : tr.trigger === "sensorTrue"
                ? `${sName} == true`
                : tr.trigger === "sensorFalse"
                  ? `${sName} == false`
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

  const subById = new Map(project.subsystems.map((s) => [s.id, s]));
  const zoneById = new Map((project.zones ?? []).map((z) => [z.id, z]));

  for (const tr of project.superstructure.transitions ?? []) {
    let label = "atGoal()";
    if (tr.condition === "afterSeconds") {
      label = `after ${tr.seconds ?? 1}s`;
    } else if (tr.condition === "allAtGoal") {
      label = "allAtGoal()";
    } else if (tr.condition === "sensorTrue" || tr.condition === "sensorFalse") {
      const sub = tr.sensorOwnerId ? subById.get(tr.sensorOwnerId) : undefined;
      const sensor = sub?.sensors?.find((s) => s.id === tr.sensorId);
      const sLabel = `${sub?.name ?? "?"}.${sensor?.name ?? "?"}`;
      label = tr.condition === "sensorTrue" ? `${sLabel} == true` : `${sLabel} == false`;
    } else if (tr.condition === "inZone" || tr.condition === "outOfZone") {
      const zone = tr.zoneId ? zoneById.get(tr.zoneId) : undefined;
      const zName = zone?.name ?? "?";
      label = tr.condition === "inZone" ? `inZone(${zName})` : `!inZone(${zName})`;
    }
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
