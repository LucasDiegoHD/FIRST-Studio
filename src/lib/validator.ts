import { CiprixProjectSchema, type CiprixProject } from "./schema/ciprix-project";
import { isValidJavaIdentifier, isValidPackageName } from "./generator/java-utils";
import type { Locale } from "./i18n";
import { formatZodIssue } from "./issue-messages";

export type IssueSeverity = "error" | "warning";
export type StudioTab = "project" | "subsystems" | "fsm" | "superstructure" | "controls" | "code";

export interface ValidationIssue {
  id: string;
  severity: IssueSeverity;
  tab: StudioTab;
  targetId?: string;
  path?: string;
  fieldLabel?: string;
  section?: string;
  advanced?: boolean;
  stateName?: string;
  message: string;
}

export function validateProject(
  project: CiprixProject,
  locale: Locale = "pt",
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const parsed = CiprixProjectSchema.safeParse(project);
  if (!parsed.success) {
    parsed.error.issues.forEach((err, index) => {
      const formatted = formatZodIssue(err, project, locale);
      issues.push({
        id: `schema-${index}`,
        severity: "error",
        tab: formatted.tab,
        targetId: formatted.targetId,
        path: formatted.path,
        fieldLabel: formatted.fieldLabel,
        section: formatted.section,
        advanced: formatted.advanced,
        stateName: formatted.stateName,
        message: formatted.message,
      });
    });
  }

  if (!isValidPackageName(project.project.packageName)) {
    issues.push({
      id: "invalid-package",
      severity: "error",
      tab: "project",
      path: "project.packageName",
      fieldLabel: locale === "pt" ? "Pacote Java Base" : "Base Java Package",
      message:
        locale === "pt"
          ? `Pacote Java inválido: "${project.project.packageName}" (use ex: frc.robot).`
          : `Invalid Java package: "${project.project.packageName}" (e.g. frc.robot).`,
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
      message:
        locale === "pt"
          ? "Nenhum subsistema configurado. O projeto compilará apenas com a SuperStructure vazia."
          : "No subsystems configured. Project will compile with an empty SuperStructure.",
    });
  }

  for (const sub of project.subsystems) {
    if (sub.isDefaultTemplate) {
      issues.push({
        id: `sub-basic-defaults-${sub.id}`,
        severity: "warning",
        tab: "subsystems",
        targetId: sub.id,
        fieldLabel: locale === "pt" ? "Configuração básica" : "Basic defaults",
        message:
          locale === "pt"
            ? `${sub.name} ainda está com a configuração básica padrão. Ajuste ID CAN, redução, limites e controles para a especificidade do seu robô.`
            : `${sub.name} is still using basic default settings. Adjust CAN ID, gear ratio, limits, and controls to match your specific robot.`,
      });
    }

    if (!isValidJavaIdentifier(sub.name)) {
      issues.push({
        id: `sub-invalid-name-${sub.id}`,
        severity: "error",
        tab: "subsystems",
        targetId: sub.id,
        path: `subsystems.${sub.id}.name`,
        fieldLabel: locale === "pt" ? "Nome da Classe" : "Class Name",
        message:
          locale === "pt"
            ? `Nome de classe Java inválido no subsistema "${sub.name}".`
            : `Invalid Java class name in subsystem "${sub.name}".`,
      });
    }

    const lowerName = sub.name.toLowerCase();
    if (subsystemNames.has(lowerName)) {
      issues.push({
        id: `sub-dup-name-${sub.id}`,
        severity: "error",
        tab: "subsystems",
        targetId: sub.id,
        path: `subsystems.${sub.id}.name`,
        fieldLabel: locale === "pt" ? "Nome da Classe" : "Class Name",
        message:
          locale === "pt"
            ? `Nome de subsistema duplicado: "${sub.name}".`
            : `Duplicate subsystem name: "${sub.name}".`,
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
        path: `subsystems.${sub.id}.motor.canId`,
        fieldLabel: locale === "pt" ? "ID CAN" : "CAN ID",
        message:
          locale === "pt"
            ? `CAN ID ${sub.motor.canId} duplicado no barramento "${sub.motor.canBus.trim() || "rio"}" (${existingOwner} e ${sub.name}).`
            : `Duplicate CAN ID ${sub.motor.canId} on bus "${sub.motor.canBus.trim() || "rio"}" (${existingOwner} and ${sub.name}).`,
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
          path: `subsystems.${sub.id}.motor.follower.canId`,
          fieldLabel: locale === "pt" ? "ID CAN do Follower" : "Follower CAN ID",
          advanced: true,
          message:
            locale === "pt"
              ? `CAN ID do follower ${sub.motor.follower.canId} em ${sub.name} duplicado com ${fOwner}.`
              : `Follower CAN ID ${sub.motor.follower.canId} in ${sub.name} duplicates ${fOwner}.`,
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
          path: `subsystems.${sub.id}.fsm.states.${st.name}.name`,
          fieldLabel: locale === "pt" ? "Nome do Estado" : "State Name",
          stateName: st.name,
          message: `Estado "${st.name}" em ${sub.name} não é um identificador Java válido.`,
        });
      }
      if (st.onEnter.type !== "stop" && !isValidJavaIdentifier(st.onEnter.constantName)) {
        issues.push({
          id: `fsm-const-invalid-${sub.id}-${st.name}`,
          severity: "error",
          tab: "fsm",
          targetId: sub.id,
          path: `subsystems.${sub.id}.fsm.states.${st.name}.onEnter.constantName`,
          fieldLabel: locale === "pt" ? "Constante Java" : "Java Constant",
          stateName: st.name,
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
          path: `subsystems.${sub.id}.fsm.requests.${req}`,
          fieldLabel: locale === "pt" ? "Requisição" : "Request",
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
        path: `subsystems.${sub.id}.fsm.initialState`,
        fieldLabel: locale === "pt" ? "Estado Inicial" : "Initial State",
        message: `Estado inicial "${sub.fsm.initialState}" não existe em ${sub.name}.`,
      });
    }

    if (!requestSet.has(sub.fsm.initialRequest)) {
      issues.push({
        id: `fsm-init-req-${sub.id}`,
        severity: "error",
        tab: "fsm",
        targetId: sub.id,
        path: `subsystems.${sub.id}.fsm.initialRequest`,
        fieldLabel: locale === "pt" ? "Request Inicial" : "Initial Request",
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
          path: `subsystems.${sub.id}.fsm.bindings.${binding.request}`,
          fieldLabel: "bindRequest",
          message: `Binding em ${sub.name} referencia request inexistente "${binding.request}".`,
        });
      }
      if (!stateSet.has(binding.entryState) || !stateSet.has(binding.goalState)) {
        issues.push({
          id: `fsm-bind-state-${sub.id}-${binding.request}`,
          severity: "error",
          tab: "fsm",
          targetId: sub.id,
          path: `subsystems.${sub.id}.fsm.bindings.${binding.request}`,
          fieldLabel: "bindRequest",
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
          path: `subsystems.${sub.id}.fsm.requests.${req}`,
          fieldLabel: locale === "pt" ? "Requisição" : "Request",
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
            path: `subsystems.${sub.id}.fsm.states.${st.name}.name`,
            fieldLabel: locale === "pt" ? "Transições" : "Transitions",
            stateName: st.name,
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
            path: `subsystems.${sub.id}.fsm.securityState`,
            fieldLabel: locale === "pt" ? "Estado de Segurança" : "Security State",
            stateName: st.name,
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
          path: `subsystems.${sub.id}.fsm.securityState`,
          fieldLabel: locale === "pt" ? "Estado de Segurança" : "Security State",
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
          path: `subsystems.${sub.id}.fsm.states.${st.name}.name`,
          fieldLabel: locale === "pt" ? "Nome do Estado" : "State Name",
          stateName: st.name,
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
      path: "superstructure.initialState",
      message: `Estado inicial da SuperStructure "${project.superstructure.initialState}" não existe.`,
    });
  }
  if (!superRequests.has(project.superstructure.initialRequest)) {
    issues.push({
      id: "super-init-req",
      severity: "error",
      tab: "superstructure",
      path: "superstructure.initialRequest",
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
        path: `superstructure.bindings.${b.request}`,
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
        path: `superstructure.requests.${req}`,
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
        path: `superstructure.transitions.${tr.id}`,
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
        path: `controls.pilotPriority.${entry.id}.request`,
        message: `Piloto referencia RobotRequest inexistente "${entry.request}".`,
      });
    }
    if (pilotButtons.has(entry.button)) {
      issues.push({
        id: `pilot-btn-dup-${entry.id}`,
        severity: "error",
        tab: "controls",
        path: `controls.pilotPriority.${entry.id}.button`,
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
        path: `controls.copilotOverrides.${entry.id}.subsystemId`,
        message: `Override do copiloto referencia subsistema removido.`,
      });
    } else if (!sub.fsm.requests.includes(entry.request)) {
      issues.push({
        id: `copilot-req-${entry.id}`,
        severity: "error",
        tab: "controls",
        path: `controls.copilotOverrides.${entry.id}.request`,
        message: `Override do copiloto referencia request "${entry.request}" inexistente em ${sub.name}.`,
      });
    }
    if (copilotButtons.has(entry.button)) {
      issues.push({
        id: `copilot-btn-dup-${entry.id}`,
        severity: "error",
        tab: "controls",
        path: `controls.copilotOverrides.${entry.id}.button`,
        message: `Botão "${entry.button}" duplicado no controle do copiloto.`,
      });
    } else {
      copilotButtons.add(entry.button);
    }
  }

  return issues;
}
