import { CiprixProjectSchema, type CiprixProject } from "./schema/ciprix-project";
import { isValidJavaIdentifier, isValidPackageName } from "./generator/java-utils";

export type IssueSeverity = "error" | "warning";
export type StudioTab = "project" | "subsystems" | "fsm" | "superstructure" | "controls" | "code";

export interface ValidationIssue {
  id: string;
  severity: IssueSeverity;
  tab: StudioTab;
  targetId?: string;
  message: string;
}

export function validateProject(project: CiprixProject): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const parsed = CiprixProjectSchema.safeParse(project);
  if (!parsed.success) {
    parsed.error.issues.forEach((err, index) => {
      issues.push({
        id: `schema-${index}`,
        severity: "error",
        tab: "project",
        message: `Schema error (${err.path.join(".")}): ${err.message}`,
      });
    });
  }

  if (!isValidPackageName(project.project.packageName)) {
    issues.push({
      id: "invalid-package",
      severity: "error",
      tab: "project",
      message: `Pacote Java inválido: "${project.project.packageName}" (use ex: frc.robot).`,
    });
  }

  const subsystemNames = new Set<string>();
  const canBuses = new Map<string, string>();
  const subsystemById = new Map(project.subsystems.map((s) => [s.id, s]));

  if (project.subsystems.length === 0) {
    issues.push({
      id: "no-subsystems",
      severity: "warning",
      tab: "subsystems",
      message: "Nenhum subsistema configurado. O projeto compilará apenas com a SuperStructure vazia.",
    });
  }

  for (const sub of project.subsystems) {
    if (!isValidJavaIdentifier(sub.name)) {
      issues.push({
        id: `sub-invalid-name-${sub.id}`,
        severity: "error",
        tab: "subsystems",
        targetId: sub.id,
        message: `Nome de classe Java inválido no subsistema "${sub.name}".`,
      });
    }

    const lowerName = sub.name.toLowerCase();
    if (subsystemNames.has(lowerName)) {
      issues.push({
        id: `sub-dup-name-${sub.id}`,
        severity: "error",
        tab: "subsystems",
        targetId: sub.id,
        message: `Nome de subsistema duplicado: "${sub.name}".`,
      });
    } else {
      subsystemNames.add(lowerName);
    }

    const busKey = `${sub.motor.canBus.trim() || "rio"}:${sub.motor.canId}`;
    const existingOwner = canBuses.get(busKey);
    if (existingOwner) {
      issues.push({
        id: `can-dup-${sub.id}`,
        severity: "error",
        tab: "subsystems",
        targetId: sub.id,
        message: `CAN ID ${sub.motor.canId} duplicado no barramento "${sub.motor.canBus.trim() || "rio"}" (${existingOwner} e ${sub.name}).`,
      });
    } else {
      canBuses.set(busKey, sub.name);
    }

    if (sub.motor.follower?.enabled) {
      const fBusKey = `${sub.motor.canBus.trim() || "rio"}:${sub.motor.follower.canId}`;
      const fOwner = canBuses.get(fBusKey);
      if (fOwner) {
        issues.push({
          id: `can-dup-follower-${sub.id}`,
          severity: "error",
          tab: "subsystems",
          targetId: sub.id,
          message: `CAN ID do follower ${sub.motor.follower.canId} em ${sub.name} duplicado com ${fOwner}.`,
        });
      } else {
        canBuses.set(fBusKey, `${sub.name} (Follower)`);
      }
    }

    const stateSet = new Set(sub.fsm.states.map((s) => s.name));
    const requestSet = new Set(sub.fsm.requests);

    for (const st of sub.fsm.states) {
      if (!isValidJavaIdentifier(st.name)) {
        issues.push({
          id: `fsm-state-invalid-${sub.id}-${st.name}`,
          severity: "error",
          tab: "fsm",
          targetId: sub.id,
          message: `Estado "${st.name}" em ${sub.name} não é um identificador Java válido.`,
        });
      }
      if (st.onEnter.type !== "stop" && !isValidJavaIdentifier(st.onEnter.constantName)) {
        issues.push({
          id: `fsm-const-invalid-${sub.id}-${st.name}`,
          severity: "error",
          tab: "fsm",
          targetId: sub.id,
          message: `Constante "${st.onEnter.constantName}" em ${sub.name}.${st.name} inválida.`,
        });
      }
    }

    for (const req of sub.fsm.requests) {
      if (!isValidJavaIdentifier(req)) {
        issues.push({
          id: `fsm-req-invalid-${sub.id}-${req}`,
          severity: "error",
          tab: "fsm",
          targetId: sub.id,
          message: `Request "${req}" em ${sub.name} não é um identificador Java válido.`,
        });
      }
    }

    if (!stateSet.has(sub.fsm.initialState)) {
      issues.push({
        id: `fsm-init-state-${sub.id}`,
        severity: "error",
        tab: "fsm",
        targetId: sub.id,
        message: `Estado inicial "${sub.fsm.initialState}" não existe em ${sub.name}.`,
      });
    }

    if (!requestSet.has(sub.fsm.initialRequest)) {
      issues.push({
        id: `fsm-init-req-${sub.id}`,
        severity: "error",
        tab: "fsm",
        targetId: sub.id,
        message: `Request inicial "${sub.fsm.initialRequest}" não existe em ${sub.name}.`,
      });
    }

    const boundRequests = new Set<string>();
    const reachableStates = new Set<string>([sub.fsm.initialState]);
    for (const binding of sub.fsm.bindings) {
      if (!requestSet.has(binding.request)) {
        issues.push({
          id: `fsm-bind-req-${sub.id}-${binding.request}`,
          severity: "error",
          tab: "fsm",
          targetId: sub.id,
          message: `Binding em ${sub.name} referencia request inexistente "${binding.request}".`,
        });
      }
      if (!stateSet.has(binding.entryState) || !stateSet.has(binding.goalState)) {
        issues.push({
          id: `fsm-bind-state-${sub.id}-${binding.request}`,
          severity: "error",
          tab: "fsm",
          targetId: sub.id,
          message: `Binding "${binding.request}" em ${sub.name} aponta para estado inexistente.`,
        });
      }
      boundRequests.add(binding.request);
      reachableStates.add(binding.entryState);
      reachableStates.add(binding.goalState);
    }

    for (const req of sub.fsm.requests) {
      if (!boundRequests.has(req)) {
        issues.push({
          id: `fsm-unbound-req-${sub.id}-${req}`,
          severity: "warning",
          tab: "fsm",
          targetId: sub.id,
          message: `Request "${req}" de ${sub.name} não possui bindRequest associado.`,
        });
      }
    }

    for (const st of sub.fsm.states) {
      for (const tr of st.transitions ?? []) {
        if (!stateSet.has(tr.targetState)) {
          issues.push({
            id: `fsm-tr-target-${sub.id}-${st.name}-${tr.id}`,
            severity: "error",
            tab: "fsm",
            targetId: sub.id,
            message: `Transição em ${sub.name}.${st.name} aponta para estado inexistente "${tr.targetState}".`,
          });
        } else {
          reachableStates.add(tr.targetState);
        }
      }
      if (st.timeoutAfterSec !== undefined) {
        if (!sub.fsm.securityState || !stateSet.has(sub.fsm.securityState)) {
          issues.push({
            id: `fsm-sec-missing-${sub.id}-${st.name}`,
            severity: "error",
            tab: "fsm",
            targetId: sub.id,
            message: `${sub.name}.${st.name} usa timeoutAfter, mas securityState não está configurado.`,
          });
        } else {
          reachableStates.add(sub.fsm.securityState);
        }
      }
    }

    if (sub.fsm.securityState) {
      if (!stateSet.has(sub.fsm.securityState)) {
        issues.push({
          id: `fsm-sec-invalid-${sub.id}`,
          severity: "error",
          tab: "fsm",
          targetId: sub.id,
          message: `securityState "${sub.fsm.securityState}" não existe em ${sub.name}.`,
        });
      } else {
        reachableStates.add(sub.fsm.securityState);
      }
    }

    for (const st of sub.fsm.states) {
      if (!reachableStates.has(st.name)) {
        issues.push({
          id: `fsm-unreachable-${sub.id}-${st.name}`,
          severity: "warning",
          tab: "fsm",
          targetId: sub.id,
          message: `Estado "${st.name}" de ${sub.name} não é alcançado por nenhum bindRequest.`,
        });
      }
    }
  }

  // SuperStructure checks
  const superStates = new Set(project.superstructure.states);
  const superRequests = new Set(project.superstructure.requests);

  if (!superStates.has(project.superstructure.initialState)) {
    issues.push({
      id: "super-init-state",
      severity: "error",
      tab: "superstructure",
      message: `Estado inicial da SuperStructure "${project.superstructure.initialState}" não existe.`,
    });
  }
  if (!superRequests.has(project.superstructure.initialRequest)) {
    issues.push({
      id: "super-init-req",
      severity: "error",
      tab: "superstructure",
      message: `Request inicial da SuperStructure "${project.superstructure.initialRequest}" não existe.`,
    });
  }

  const boundSuperRequests = new Set<string>();
  for (const b of project.superstructure.bindings) {
    boundSuperRequests.add(b.request);
    if (!superRequests.has(b.request) || !superStates.has(b.entryState)) {
      issues.push({
        id: `super-bind-${b.request}`,
        severity: "error",
        tab: "superstructure",
        message: `Binding da SuperStructure (${b.request} -> ${b.entryState}) inválido.`,
      });
    }
  }
  for (const req of project.superstructure.requests) {
    if (!boundSuperRequests.has(req)) {
      issues.push({
        id: `super-unbound-${req}`,
        severity: "warning",
        tab: "superstructure",
        message: `RobotRequest "${req}" não tem estado na SuperStructure.`,
      });
    }
  }
  for (const tr of project.superstructure.transitions ?? []) {
    if (!superStates.has(tr.fromState) || !superStates.has(tr.toState)) {
      issues.push({
        id: `super-tr-${tr.id}`,
        severity: "error",
        tab: "superstructure",
        message: `Transição da SuperStructure (${tr.fromState} -> ${tr.toState}) aponta para estado inexistente.`,
      });
    }
  }

  // Controls checks
  const pilotButtons = new Set<string>();
  for (const entry of project.controls.pilotPriority) {
    if (!superRequests.has(entry.request)) {
      issues.push({
        id: `pilot-req-${entry.id}`,
        severity: "error",
        tab: "controls",
        message: `Piloto referencia RobotRequest inexistente "${entry.request}".`,
      });
    }
    if (pilotButtons.has(entry.button)) {
      issues.push({
        id: `pilot-btn-dup-${entry.id}`,
        severity: "error",
        tab: "controls",
        message: `Botão "${entry.button}" duplicado no controle do piloto.`,
      });
    } else {
      pilotButtons.add(entry.button);
    }
  }

  const copilotButtons = new Set<string>();
  for (const entry of project.controls.copilotOverrides) {
    const sub = subsystemById.get(entry.subsystemId);
    if (!sub) {
      issues.push({
        id: `copilot-sub-${entry.id}`,
        severity: "error",
        tab: "controls",
        message: `Override do copiloto referencia subsistema removido.`,
      });
    } else if (!sub.fsm.requests.includes(entry.request)) {
      issues.push({
        id: `copilot-req-${entry.id}`,
        severity: "error",
        tab: "controls",
        message: `Override do copiloto referencia request "${entry.request}" inexistente em ${sub.name}.`,
      });
    }
    if (copilotButtons.has(entry.button)) {
      issues.push({
        id: `copilot-btn-dup-${entry.id}`,
        severity: "error",
        tab: "controls",
        message: `Botão "${entry.button}" duplicado no controle do copiloto.`,
      });
    } else {
      copilotButtons.add(entry.button);
    }
  }

  return issues;
}
