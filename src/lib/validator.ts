import {
  CiprixProjectSchema,
  isMotorSubsystem,
  type CiprixProject,
} from "./schema/ciprix-project";
import { isValidJavaIdentifier, isValidPackageName, toCamelCase } from "./generator/java-utils";
import type { Locale } from "./i18n";
import { formatZodIssue } from "./issue-messages";

export type IssueSeverity = "error" | "warning";
export type StudioTab =
  | "project"
  | "subsystems"
  | "fsm"
  | "superstructure"
  | "arena"
  | "autonomous"
  | "controls"
  | "code";

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

interface RumbleEntryRecord {
  id: string;
  ownerId: string;
  ownerLabel: string;
  tab: StudioTab;
  targetId?: string;
  stateName?: string;
  path: string;
  controller: "pilot" | "copilot" | "both";
  priority: number;
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
  const pwmPorts = new Map<number, string>();
  const dioChannels = new Map<number, string>();
  const subsystemById = new Map(project.subsystems.map((s) => [s.id, s]));
  const zones = project.zones ?? [];
  const zoneById = new Map(zones.map((z) => [z.id, z]));
  const ledSubIds = new Set(
    project.subsystems.filter((s) => s.type === "leds").map((s) => s.id),
  );
  const rumbleEntries: RumbleEntryRecord[] = [];

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

    // LED subsystem checks
    if (sub.type === "leds") {
      if (sub.leds?.driver === "addressableLed") {
        const port = sub.leds.pwmPort ?? 0;
        const owner = pwmPorts.get(port);
        if (owner) {
          issues.push({
            id: `led-pwm-dup-${sub.id}`,
            severity: "error",
            tab: "subsystems",
            targetId: sub.id,
            path: `subsystems.${sub.id}.leds.pwmPort`,
            fieldLabel: locale === "pt" ? "Porta PWM" : "PWM Port",
            message:
              locale === "pt"
                ? `Porta PWM ${port} duplicada entre ${owner} e ${sub.name}.`
                : `Duplicate PWM port ${port} between ${owner} and ${sub.name}.`,
          });
        } else {
          pwmPorts.set(port, sub.name);
        }
      } else if (sub.leds?.driver === "candle") {
        const cId = sub.leds.canId ?? 30;
        const cBus = `${(sub.leds.canBus ?? "").trim() || "rio"}:${cId}`;
        const owner = canBuses.get(cBus);
        if (owner) {
          issues.push({
            id: `led-can-dup-${sub.id}`,
            severity: "error",
            tab: "subsystems",
            targetId: sub.id,
            path: `subsystems.${sub.id}.leds.canId`,
            fieldLabel: locale === "pt" ? "ID CAN CANdle" : "CANdle CAN ID",
            message:
              locale === "pt"
                ? `CAN ID ${cId} duplicado em ${sub.name} e ${owner}.`
                : `Duplicate CAN ID ${cId} between ${sub.name} and ${owner}.`,
          });
        } else {
          canBuses.set(cBus, sub.name);
        }
      }
      continue;
    }

    if (!isMotorSubsystem(sub)) continue;

    // Motor CAN ID checks
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

    // Sensor checks
    const sensorIds = new Set<string>();
    const sensorJavaNames = new Set<string>();
    for (const sensor of sub.sensors ?? []) {
      sensorIds.add(sensor.id);
      const jName = toCamelCase(sensor.name);
      if (!sensor.name.trim() || sensorJavaNames.has(jName)) {
        issues.push({
          id: `sensor-name-${sub.id}-${sensor.id}`,
          severity: "error",
          tab: "subsystems",
          targetId: sub.id,
          path: `subsystems.${sub.id}.sensors.${sensor.id}.name`,
          fieldLabel: locale === "pt" ? "Nome do Sensor" : "Sensor Name",
          message:
            locale === "pt"
              ? `Nome de sensor inválido ou duplicado em ${sub.name}: "${sensor.name}".`
              : `Invalid or duplicate sensor name in ${sub.name}: "${sensor.name}".`,
        });
      } else {
        sensorJavaNames.add(jName);
      }

      if (sensor.type === "dio") {
        const owner = dioChannels.get(sensor.channel);
        if (owner) {
          issues.push({
            id: `sensor-dio-dup-${sub.id}-${sensor.id}`,
            severity: "error",
            tab: "subsystems",
            targetId: sub.id,
            path: `subsystems.${sub.id}.sensors.${sensor.id}.channel`,
            fieldLabel: locale === "pt" ? "Canal DIO" : "DIO Channel",
            message:
              locale === "pt"
                ? `Canal DIO ${sensor.channel} duplicado entre ${owner} e ${sub.name}.${sensor.name}.`
                : `Duplicate DIO channel ${sensor.channel} between ${owner} and ${sub.name}.${sensor.name}.`,
          });
        } else {
          dioChannels.set(sensor.channel, `${sub.name}.${sensor.name}`);
        }
      } else if (sensor.type === "canrange") {
        const sBusKey = `${sensor.canBus.trim() || "rio"}:${sensor.canId}`;
        const owner = canBuses.get(sBusKey);
        if (owner) {
          issues.push({
            id: `sensor-can-dup-${sub.id}-${sensor.id}`,
            severity: "error",
            tab: "subsystems",
            targetId: sub.id,
            path: `subsystems.${sub.id}.sensors.${sensor.id}.canId`,
            fieldLabel: "CAN ID",
            message:
              locale === "pt"
                ? `CAN ID ${sensor.canId} do sensor ${sensor.name} em ${sub.name} conflita com ${owner}.`
                : `Sensor ${sensor.name} CAN ID ${sensor.canId} in ${sub.name} conflicts with ${owner}.`,
          });
        } else {
          canBuses.set(sBusKey, `${sub.name}.${sensor.name}`);
        }
      } else if (sensor.type === "lasercan") {
        const sBusKey = `rio:${sensor.canId}`;
        const owner = canBuses.get(sBusKey);
        if (owner) {
          issues.push({
            id: `sensor-can-dup-${sub.id}-${sensor.id}`,
            severity: "error",
            tab: "subsystems",
            targetId: sub.id,
            path: `subsystems.${sub.id}.sensors.${sensor.id}.canId`,
            fieldLabel: "CAN ID",
            message:
              locale === "pt"
                ? `CAN ID ${sensor.canId} do LaserCAN ${sensor.name} conflita com ${owner} no barramento rio.`
                : `LaserCAN ${sensor.name} CAN ID ${sensor.canId} conflicts with ${owner} on bus rio.`,
          });
        } else {
          canBuses.set(sBusKey, `${sub.name}.${sensor.name}`);
        }
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

      if (st.regularTimeSec && st.regularTimeSec.min >= st.regularTimeSec.max) {
        issues.push({
          id: `fsm-regtime-${sub.id}-${st.name}`,
          severity: "error",
          tab: "fsm",
          targetId: sub.id,
          path: `subsystems.${sub.id}.fsm.states.${st.name}.regularTimeSec.min`,
          fieldLabel: locale === "pt" ? "Tempo Esperado" : "Regular Time",
          stateName: st.name,
          message:
            locale === "pt"
              ? `Em ${sub.name}.${st.name}, tempo mínimo esperado deve ser menor que o máximo.`
              : `In ${sub.name}.${st.name}, regularTime min must be less than max.`,
        });
      }

      for (const act of st.actions) {
        if (act.kind === "motor") {
          if (act.action.type !== "stop" && !isValidJavaIdentifier(act.action.constantName)) {
            issues.push({
              id: `fsm-const-invalid-${sub.id}-${st.name}-${act.id}`,
              severity: "error",
              tab: "fsm",
              targetId: sub.id,
              path: `subsystems.${sub.id}.fsm.states.${st.name}.actions.${act.id}.constantName`,
              fieldLabel: locale === "pt" ? "Constante Java" : "Java Constant",
              stateName: st.name,
              message: `Constante "${act.action.constantName}" em ${sub.name}.${st.name} inválida.`,
            });
          }
        } else if (act.kind === "leds") {
          if (!ledSubIds.has(act.ledSubsystemId)) {
            issues.push({
              id: `fsm-led-missing-${sub.id}-${st.name}-${act.id}`,
              severity: "error",
              tab: "fsm",
              targetId: sub.id,
              path: `subsystems.${sub.id}.fsm.states.${st.name}.actions.${act.id}.ledSubsystemId`,
              fieldLabel: locale === "pt" ? "Subsistema de LEDs" : "LED Subsystem",
              stateName: st.name,
              message:
                locale === "pt"
                  ? `${sub.name}.${st.name} aponta para um subsistema de LEDs inexistente.`
                  : `${sub.name}.${st.name} targets a missing LED subsystem.`,
            });
          }
        } else if (act.kind === "rumble") {
          if (act.when === "periodic") {
            issues.push({
              id: `rumble-periodic-${sub.id}-${st.name}-${act.id}`,
              severity: "warning",
              tab: "fsm",
              targetId: sub.id,
              path: `subsystems.${sub.id}.fsm.states.${st.name}.actions.${act.id}.when`,
              fieldLabel: locale === "pt" ? "Momento do Rumble" : "Rumble Timing",
              stateName: st.name,
              message:
                locale === "pt"
                  ? `Rumble em ${sub.name}.${st.name} usa "periodic" (dispara todo ciclo de 20ms). Prefira "Ao entrar" ou "Ao sair".`
                  : `Rumble in ${sub.name}.${st.name} uses "periodic". Prefer "enter" or "exit".`,
            });
          }
          const maxExpected = st.timeoutAfterSec ?? st.regularTimeSec?.max;
          if (maxExpected !== undefined && act.seconds > maxExpected) {
            issues.push({
              id: `rumble-duration-${sub.id}-${st.name}-${act.id}`,
              severity: "warning",
              tab: "fsm",
              targetId: sub.id,
              path: `subsystems.${sub.id}.fsm.states.${st.name}.actions.${act.id}.seconds`,
              fieldLabel: locale === "pt" ? "Duração Rumble (s)" : "Rumble Duration (s)",
              stateName: st.name,
              message:
                locale === "pt"
                  ? `Rumble em ${sub.name}.${st.name} (${act.seconds}s) dura mais que o tempo/timeout do estado (${maxExpected}s).`
                  : `Rumble in ${sub.name}.${st.name} (${act.seconds}s) outlasts state regularTime/timeout (${maxExpected}s).`,
            });
          }
          rumbleEntries.push({
            id: act.id,
            ownerId: `${sub.id}:${st.name}`,
            ownerLabel: `${sub.name}.${st.name}`,
            tab: "fsm",
            targetId: sub.id,
            stateName: st.name,
            path: `subsystems.${sub.id}.fsm.states.${st.name}.actions.${act.id}.priority`,
            controller: act.controller,
            priority: act.priority,
          });
        }
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
        if (
          (tr.trigger === "sensorTrue" || tr.trigger === "sensorFalse") &&
          (!tr.sensorId || !sensorIds.has(tr.sensorId))
        ) {
          issues.push({
            id: `fsm-tr-sensor-${sub.id}-${st.name}-${tr.id}`,
            severity: "error",
            tab: "fsm",
            targetId: sub.id,
            path: `subsystems.${sub.id}.fsm.states.${st.name}.name`,
            fieldLabel: locale === "pt" ? "Sensor da Transição" : "Transition Sensor",
            stateName: st.name,
            message:
              locale === "pt"
                ? `Transição por sensor em ${sub.name}.${st.name} referencia sensor inexistente.`
                : `Sensor transition in ${sub.name}.${st.name} references a missing sensor.`,
          });
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
    if (tr.condition === "sensorTrue" || tr.condition === "sensorFalse") {
      const owner = tr.sensorOwnerId ? subsystemById.get(tr.sensorOwnerId) : undefined;
      const hasSensor = owner?.sensors?.some((s) => s.id === tr.sensorId);
      if (!owner || !hasSensor) {
        issues.push({
          id: `super-tr-sensor-${tr.id}`,
          severity: "error",
          tab: "superstructure",
          path: `superstructure.transitions.${tr.id}`,
          message:
            locale === "pt"
              ? `Intertravamento por sensor (${tr.fromState} -> ${tr.toState}) referencia sensor inexistente.`
              : `Sensor interlock (${tr.fromState} -> ${tr.toState}) references a missing sensor.`,
        });
      }
    } else if (tr.condition === "inZone" || tr.condition === "outOfZone") {
      if (!tr.zoneId || !zoneById.has(tr.zoneId)) {
        issues.push({
          id: `super-tr-zone-${tr.id}`,
          severity: "error",
          tab: "superstructure",
          path: `superstructure.transitions.${tr.id}`,
          message:
            locale === "pt"
              ? `Intertravamento por zona (${tr.fromState} -> ${tr.toState}) referencia zona inexistente.`
              : `Zone interlock (${tr.fromState} -> ${tr.toState}) references a missing zone.`,
        });
      }
    }
  }

  for (const [stateName, effects] of Object.entries(project.superstructure.stateEffects ?? {})) {
    for (const eff of effects) {
      if (eff.kind === "leds" && !ledSubIds.has(eff.ledSubsystemId)) {
        issues.push({
          id: `super-led-missing-${stateName}-${eff.id}`,
          severity: "error",
          tab: "superstructure",
          path: `superstructure.stateEffects.${stateName}.${eff.id}.ledSubsystemId`,
          message:
            locale === "pt"
              ? `Efeito de LED em SuperStructure.${stateName} aponta para LED inexistente.`
              : `LED effect in SuperStructure.${stateName} targets a missing LED subsystem.`,
        });
      } else if (eff.kind === "rumble") {
        if (eff.when === "periodic") {
          issues.push({
            id: `rumble-periodic-super-${stateName}-${eff.id}`,
            severity: "warning",
            tab: "superstructure",
            path: `superstructure.stateEffects.${stateName}.${eff.id}.when`,
            message:
              locale === "pt"
                ? `Rumble em SuperStructure.${stateName} usa "periodic". Prefira "Ao entrar" ou "Ao sair".`
                : `Rumble in SuperStructure.${stateName} uses "periodic". Prefer "enter" or "exit".`,
          });
        }
        rumbleEntries.push({
          id: eff.id,
          ownerId: `super:${stateName}`,
          ownerLabel: `SuperStructure.${stateName}`,
          tab: "superstructure",
          path: `superstructure.stateEffects.${stateName}.${eff.id}.priority`,
          controller: eff.controller,
          priority: eff.priority,
        });
      }
    }
  }

  // Rumble priority conflicts on same controller across distinct owners
  const rumbleSlotMap = new Map<string, RumbleEntryRecord[]>();
  for (const entry of rumbleEntries) {
    const slots: ("pilot" | "copilot")[] =
      entry.controller === "both" ? ["pilot", "copilot"] : [entry.controller];
    for (const slot of slots) {
      const key = `${slot}:${entry.priority}`;
      const list = rumbleSlotMap.get(key) ?? [];
      list.push(entry);
      rumbleSlotMap.set(key, list);
    }
  }
  for (const [slotKey, list] of rumbleSlotMap.entries()) {
    const distinctOwners = new Set(list.map((e) => e.ownerId));
    if (distinctOwners.size > 1) {
      const [slot, prio] = slotKey.split(":");
      const first = list[0];
      const names = Array.from(new Set(list.map((e) => e.ownerLabel))).join(" vs ");
      issues.push({
        id: `rumble-priority-conflict-${slotKey}`,
        severity: "warning",
        tab: first.tab,
        targetId: first.targetId,
        stateName: first.stateName,
        path: first.path,
        fieldLabel: locale === "pt" ? "Prioridade Rumble" : "Rumble Priority",
        message:
          locale === "pt"
            ? `Prioridade ${prio} de rumble repetida no controle "${slot}" (${names}). Ajuste as prioridades para evitar empates.`
            : `Duplicate rumble priority ${prio} on "${slot}" controller (${names}). Adjust priorities to avoid ties.`,
      });
    }
  }

  // Drivetrain CAN, gyro, and vision checks
  if (project.drivetrain?.enabled) {
    const dt = project.drivetrain;
    const dtBus = dt.canBus.trim() || "rio";
    const checkDtCan = (
      canId: number,
      bus: string,
      pathSuffix: string,
      labelPt: string,
      labelEn: string,
    ) => {
      const normBus = bus.trim() || "rio";
      const key = `${normBus}:${canId}`;
      const existing = canBuses.get(key);
      if (existing) {
        issues.push({
          id: `dt-can-dup-${pathSuffix}`,
          severity: "error",
          tab: "subsystems",
          targetId: "drivetrain",
          path: `drivetrain.${pathSuffix}`,
          fieldLabel: locale === "pt" ? labelPt : labelEn,
          message:
            locale === "pt"
              ? `CAN ID ${canId} no barramento "${normBus}" (Drivetrain · ${labelPt}) conflita com ${existing}.`
              : `CAN ID ${canId} on bus "${normBus}" (Drivetrain · ${labelEn}) conflicts with ${existing}.`,
        });
      } else {
        canBuses.set(key, `Drivetrain (${locale === "pt" ? labelPt : labelEn})`);
      }
    };

    if (dt.gyro.type === "pigeon2") {
      checkDtCan(
        dt.gyro.canId,
        dt.gyro.canBus.trim() || dtBus,
        "gyro.canId",
        "Pigeon 2",
        "Pigeon 2",
      );
    }

    if (dt.type === "differential") {
      checkDtCan(
        dt.differential.leftLeaderId,
        dtBus,
        "differential.leftLeaderId",
        "Motor Esq. Principal",
        "Left Leader Motor",
      );
      if (dt.differential.leftFollowerId !== undefined) {
        checkDtCan(
          dt.differential.leftFollowerId,
          dtBus,
          "differential.leftFollowerId",
          "Follower Esq.",
          "Left Follower",
        );
      }
      checkDtCan(
        dt.differential.rightLeaderId,
        dtBus,
        "differential.rightLeaderId",
        "Motor Dir. Principal",
        "Right Leader Motor",
      );
      if (dt.differential.rightFollowerId !== undefined) {
        checkDtCan(
          dt.differential.rightFollowerId,
          dtBus,
          "differential.rightFollowerId",
          "Follower Dir.",
          "Right Follower",
        );
      }
    } else if (dt.type === "mecanum") {
      const wheelKeys = ["fl", "fr", "bl", "br"] as const;
      for (const wk of wheelKeys) {
        const label = wk.toUpperCase();
        checkDtCan(
          dt.modules[wk].driveCanId,
          dtBus,
          `modules.${wk}.driveCanId`,
          `Roda ${label}`,
          `${label} Wheel`,
        );
      }
    } else {
      const modKeys = ["fl", "fr", "bl", "br"] as const;
      for (const mk of modKeys) {
        const mod = dt.modules[mk];
        const label = mk.toUpperCase();
        checkDtCan(
          mod.driveCanId,
          dtBus,
          `modules.${mk}.driveCanId`,
          `${label} Tração`,
          `${label} Drive`,
        );
        checkDtCan(
          mod.steerCanId,
          dtBus,
          `modules.${mk}.steerCanId`,
          `${label} Direção`,
          `${label} Steer`,
        );
        checkDtCan(
          mod.encoderCanId,
          dtBus,
          `modules.${mk}.encoderCanId`,
          `${label} Encoder`,
          `${label} Encoder`,
        );
      }
    }

    if (dt.vision.enabled) {
      if (dt.vision.cameras.length === 0) {
        issues.push({
          id: "dt-vision-empty",
          severity: "warning",
          tab: "subsystems",
          targetId: "drivetrain",
          path: "drivetrain.vision.enabled",
          fieldLabel: locale === "pt" ? "Câmeras Limelight" : "Limelight Cameras",
          message:
            locale === "pt"
              ? "AprilTagVision está habilitada no Drivetrain, mas nenhuma câmera Limelight foi adicionada."
              : "AprilTagVision is enabled on Drivetrain, but no Limelight cameras are configured.",
        });
      }
      const seenNtNames = new Set<string>();
      for (const cam of dt.vision.cameras) {
        const nt = cam.ntName.trim().toLowerCase();
        if (seenNtNames.has(nt)) {
          issues.push({
            id: `dt-vision-dup-${cam.id}`,
            severity: "error",
            tab: "subsystems",
            targetId: "drivetrain",
            path: `drivetrain.vision.cameras.${cam.id}.ntName`,
            fieldLabel: "NetworkTables Name",
            message:
              locale === "pt"
                ? `Hostname Limelight duplicado: "${cam.ntName}".`
                : `Duplicate Limelight hostname: "${cam.ntName}".`,
          });
        } else {
          seenNtNames.add(nt);
        }
      }
    }
  }

  // Arena zones checks
  if (zones.length > 0 && !project.drivetrain?.enabled) {
    issues.push({
      id: "zones-no-drivetrain",
      severity: "warning",
      tab: "arena",
      message:
        locale === "pt"
          ? "Zonas da Arena configuradas, mas o Drivetrain está desativado. Ative o Drivetrain na aba Robô para avaliar a pose no campo."
          : "Arena zones configured, but Drivetrain is disabled. Enable Drivetrain in the Robot tab to evaluate field pose.",
    });
  }

  const zoneNames = new Set<string>();
  const fieldL = project.project.fieldLengthMeters;
  const fieldW = project.project.fieldWidthMeters;
  for (const z of zones) {
    if (!isValidJavaIdentifier(z.name) || z.name === "NONE") {
      issues.push({
        id: `zone-invalid-name-${z.id}`,
        severity: "error",
        tab: "arena",
        targetId: z.id,
        path: `zones.${z.id}.name`,
        fieldLabel: locale === "pt" ? "Nome da Zona" : "Zone Name",
        message:
          locale === "pt"
            ? `Nome de zona inválido "${z.name}". Use identificador Java válido diferente de NONE.`
            : `Invalid zone name "${z.name}". Use a valid Java identifier other than NONE.`,
      });
    } else {
      const lower = z.name.toLowerCase();
      if (zoneNames.has(lower)) {
        issues.push({
          id: `zone-dup-name-${z.id}`,
          severity: "error",
          tab: "arena",
          targetId: z.id,
          path: `zones.${z.id}.name`,
          fieldLabel: locale === "pt" ? "Nome da Zona" : "Zone Name",
          message:
            locale === "pt"
              ? `Nome de zona duplicado: "${z.name}".`
              : `Duplicate zone name: "${z.name}".`,
        });
      } else {
        zoneNames.add(lower);
      }
    }

    let outOfBounds = false;
    if (z.shape.kind === "rectangle") {
      const { x1, y1, x2, y2 } = z.shape;
      if (Math.abs(x2 - x1) < 0.05 || Math.abs(y2 - y1) < 0.05) {
        issues.push({
          id: `zone-rect-degen-${z.id}`,
          severity: "error",
          tab: "arena",
          targetId: z.id,
          path: `zones.${z.id}.shape.x2`,
          fieldLabel: locale === "pt" ? "Retângulo" : "Rectangle",
          message:
            locale === "pt"
              ? `Zona retangular "${z.name}" deve ter largura e altura mínimas de 0,05 m.`
              : `Rectangular zone "${z.name}" must be at least 0.05 m in width and height.`,
        });
      }
      if (x1 < 0 || x2 < 0 || x1 > fieldL || x2 > fieldL || y1 < 0 || y2 < 0 || y1 > fieldW || y2 > fieldW) {
        outOfBounds = true;
      }
    } else if (z.shape.kind === "circle") {
      const { cx, cy, radius } = z.shape;
      if (radius < 0.05) {
        issues.push({
          id: `zone-circle-radius-${z.id}`,
          severity: "error",
          tab: "arena",
          targetId: z.id,
          path: `zones.${z.id}.shape.radius`,
          fieldLabel: locale === "pt" ? "Raio (m)" : "Radius (m)",
          message:
            locale === "pt"
              ? `Raio da zona "${z.name}" deve ser pelo menos 0,05 m.`
              : `Zone "${z.name}" radius must be at least 0.05 m.`,
        });
      }
      if (cx < 0 || cx > fieldL || cy < 0 || cy > fieldW) {
        outOfBounds = true;
      }
    } else {
      if (z.shape.vertices.length < 3) {
        issues.push({
          id: `zone-poly-verts-${z.id}`,
          severity: "error",
          tab: "arena",
          targetId: z.id,
          path: `zones.${z.id}.name`,
          fieldLabel: locale === "pt" ? "Vértices" : "Vertices",
          message:
            locale === "pt"
              ? `Polígono "${z.name}" precisa de pelo menos 3 vértices.`
              : `Polygon "${z.name}" requires at least 3 vertices.`,
        });
      }
      if (z.shape.vertices.some((v) => v.x < 0 || v.x > fieldL || v.y < 0 || v.y > fieldW)) {
        outOfBounds = true;
      }
    }

    if (outOfBounds) {
      issues.push({
        id: `zone-oob-${z.id}`,
        severity: "warning",
        tab: "arena",
        targetId: z.id,
        path: `zones.${z.id}.name`,
        fieldLabel: locale === "pt" ? "Coordenadas" : "Coordinates",
        message:
          locale === "pt"
            ? `Zona "${z.name}" possui coordenadas fora dos limites da arena (${fieldL} × ${fieldW} m).`
            : `Zone "${z.name}" has coordinates outside field bounds (${fieldL} × ${fieldW} m).`,
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
    if (entry.source === "sensor") {
      const owner = entry.sensorOwnerId ? subsystemById.get(entry.sensorOwnerId) : undefined;
      const hasSensor = owner?.sensors?.some((s) => s.id === entry.sensorId);
      if (!owner || !hasSensor) {
        issues.push({
          id: `pilot-sensor-${entry.id}`,
          severity: "error",
          tab: "controls",
          path: `controls.pilotPriority.${entry.id}.sensorId`,
          message:
            locale === "pt"
              ? `Automação por sensor na fila do piloto referencia sensor inexistente.`
              : `Sensor automation in pilot queue references a missing sensor.`,
        });
      }
    } else if (entry.source === "zone") {
      if (!entry.zoneId || !zoneById.has(entry.zoneId)) {
        issues.push({
          id: `pilot-zone-${entry.id}`,
          severity: "error",
          tab: "controls",
          path: `controls.pilotPriority.${entry.id}.zoneId`,
          message:
            locale === "pt"
              ? `Automação por zona na fila do piloto referencia zona inexistente.`
              : `Zone automation in pilot queue references a missing zone.`,
        });
      }
    } else {
      const btn = entry.button;
      if (!btn) {
        issues.push({
          id: `pilot-btn-missing-${entry.id}`,
          severity: "error",
          tab: "controls",
          path: `controls.pilotPriority.${entry.id}.button`,
          message:
            locale === "pt"
              ? `Entrada de botão sem botão configurado no controle do piloto.`
              : `Button entry missing button on pilot controller.`,
        });
      } else if (pilotButtons.has(btn)) {
        issues.push({
          id: `pilot-btn-dup-${entry.id}`,
          severity: "error",
          tab: "controls",
          path: `controls.pilotPriority.${entry.id}.button`,
          message: `Botão "${btn}" duplicado no controle do piloto.`,
        });
      } else {
        pilotButtons.add(btn);
      }
    }

    for (const cond of entry.andConditions ?? []) {
      if (cond.kind === "sensor") {
        const owner = subsystemById.get(cond.sensorOwnerId);
        const hasSensor = owner?.sensors?.some((s) => s.id === cond.sensorId);
        if (!owner || !hasSensor) {
          issues.push({
            id: `pilot-and-sensor-${entry.id}-${cond.id}`,
            severity: "error",
            tab: "controls",
            path: `controls.pilotPriority.${entry.id}.andConditions`,
            message:
              locale === "pt"
                ? `Condição E da fila do piloto referencia sensor inexistente.`
                : `AND condition in pilot queue references a missing sensor.`,
          });
        }
      } else if (cond.kind === "zone" && !zoneById.has(cond.zoneId)) {
        issues.push({
          id: `pilot-and-zone-${entry.id}-${cond.id}`,
          severity: "error",
          tab: "controls",
          path: `controls.pilotPriority.${entry.id}.andConditions`,
          message:
            locale === "pt"
              ? `Condição E da fila do piloto referencia zona inexistente.`
              : `AND condition in pilot queue references a missing zone.`,
        });
      }
    }
  }

  if (project.drivetrain?.enabled) {
    const { resetGyroButton, toggleFieldOrientedButton } = project.drivetrain.controls;
    if (resetGyroButton) {
      if (pilotButtons.has(resetGyroButton)) {
        issues.push({
          id: "dt-btn-reset-gyro-dup",
          severity: "warning",
          tab: "controls",
          path: "drivetrain.controls.resetGyroButton",
          fieldLabel: locale === "pt" ? "Zerar Gyro" : "Zero Heading",
          message:
            locale === "pt"
              ? `Botão "${resetGyroButton}" de zerar gyro colide com comando da SuperStructure no Piloto.`
              : `Zero-heading button "${resetGyroButton}" conflicts with a Pilot SuperStructure binding.`,
        });
      } else {
        pilotButtons.add(resetGyroButton);
      }
    }
    if (toggleFieldOrientedButton) {
      if (pilotButtons.has(toggleFieldOrientedButton)) {
        issues.push({
          id: "dt-btn-field-oriented-dup",
          severity: "warning",
          tab: "controls",
          path: "drivetrain.controls.toggleFieldOrientedButton",
          fieldLabel: locale === "pt" ? "Alternar Field-Oriented" : "Toggle Field-Oriented",
          message:
            locale === "pt"
              ? `Botão "${toggleFieldOrientedButton}" de Field-Oriented colide com outro comando no Piloto.`
              : `Field-Oriented toggle button "${toggleFieldOrientedButton}" conflicts with another Pilot binding.`,
        });
      } else {
        pilotButtons.add(toggleFieldOrientedButton);
      }
    }
  }

  const copilotButtons = new Set<string>();
  for (const entry of project.controls.copilotOverrides) {
    const sub = subsystemById.get(entry.subsystemId);
    if (!sub || !isMotorSubsystem(sub)) {
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

  // Phase 6: PathPlanner / Choreo Autonomous validations
  const auto = project.autonomous;
  if (auto?.enabled) {
    if (!project.drivetrain?.enabled) {
      issues.push({
        id: "auto-needs-drivetrain",
        severity: "warning",
        tab: "autonomous",
        path: "autonomous.enabled",
        fieldLabel: locale === "pt" ? "Autônomo" : "Autonomous",
        message:
          locale === "pt"
            ? "Autônomo ativado, mas o Drivetrain está desativado. Ative a tração na aba Robô para gerar AutoBuilder e AutonomousSetup."
            : "Autonomous is enabled while Drivetrain is disabled. Enable drivetrain in the Robot tab to emit AutoBuilder and AutonomousSetup.",
      });
    }

    const validSuperRequests = new Set(project.superstructure.requests);
    const seenCmdNames = new Set<string>();
    const mappedCmdNames = new Set<string>();

    for (const cmd of auto.namedCommands) {
      const trimmed = cmd.name.trim();
      if (!trimmed) {
        issues.push({
          id: `auto-cmd-empty-${cmd.id}`,
          severity: "error",
          tab: "autonomous",
          path: `autonomous.namedCommands.${cmd.id}.name`,
          message:
            locale === "pt"
              ? "Comando nomeado no autônomo está sem nome."
              : "Autonomous NamedCommand is missing a name.",
        });
      } else if (seenCmdNames.has(trimmed)) {
        issues.push({
          id: `auto-cmd-dup-${cmd.id}`,
          severity: "error",
          tab: "autonomous",
          path: `autonomous.namedCommands.${cmd.id}.name`,
          message:
            locale === "pt"
              ? `Comando nomeado "${trimmed}" duplicado no autônomo.`
              : `Duplicate autonomous NamedCommand "${trimmed}".`,
        });
      } else {
        seenCmdNames.add(trimmed);
        mappedCmdNames.add(trimmed);
      }

      if (!validSuperRequests.has(cmd.request)) {
        issues.push({
          id: `auto-cmd-req-${cmd.id}`,
          severity: "error",
          tab: "autonomous",
          path: `autonomous.namedCommands.${cmd.id}.request`,
          message:
            locale === "pt"
              ? `Comando nomeado "${trimmed || cmd.id}" aponta para RobotRequest "${cmd.request}" inexistente.`
              : `NamedCommand "${trimmed || cmd.id}" references missing RobotRequest "${cmd.request}".`,
        });
      }
    }

    for (const p of auto.paths ?? []) {
      for (const em of p.eventMarkers) {
        if (em.request) {
          const emCmd = em.commandName.trim();
          if (emCmd) mappedCmdNames.add(emCmd);
          if (!validSuperRequests.has(em.request)) {
            issues.push({
              id: `auto-marker-req-${p.id}-${em.id}`,
              severity: "error",
              tab: "autonomous",
              path: `autonomous.paths.${p.id}.eventMarkers.${em.id}.request`,
              message:
                locale === "pt"
                  ? `Event Marker "${em.name}" em ${p.name}.path aponta para RobotRequest "${em.request}" inexistente.`
                  : `Event Marker "${em.name}" in ${p.name}.path references missing RobotRequest "${em.request}".`,
            });
          }
        }
      }
    }

    for (const routine of auto.routines) {
      if (!routine.fileName.trim()) {
        issues.push({
          id: `auto-routine-file-${routine.id}`,
          severity: "error",
          tab: "autonomous",
          path: `autonomous.routines.${routine.id}.fileName`,
          message:
            locale === "pt"
              ? `Rotina autônoma "${routine.name}" está sem nome de arquivo.`
              : `Autonomous routine "${routine.name}" is missing a file name.`,
        });
      }
      if (routine.missingFile) {
        issues.push({
          id: `auto-routine-missing-${routine.id}`,
          severity: "warning",
          tab: "autonomous",
          path: `autonomous.routines.${routine.id}.fileName`,
          message:
            locale === "pt"
              ? `Arquivo da rotina "${routine.name}" (${routine.fileName}) não foi encontrado na pasta conectada.`
              : `Routine file for "${routine.name}" (${routine.fileName}) was not found in the connected folder.`,
        });
      }
      for (const disc of routine.discoveredNamedCommands ?? []) {
        if (!mappedCmdNames.has(disc)) {
          issues.push({
            id: `auto-unmapped-cmd-${routine.id}-${disc}`,
            severity: "warning",
            tab: "autonomous",
            path: `autonomous.routines.${routine.id}.fileName`,
            message:
              locale === "pt"
                ? `Rotina "${routine.name}" usa NamedCommand "${disc}" sem ligação configurada.`
                : `Routine "${routine.name}" uses NamedCommand "${disc}" with no RobotRequest binding.`,
          });
        }
      }
    }

    const reportedUnmappedMarkers = new Set<string>();
    for (const p of auto.paths ?? []) {
      for (const em of p.eventMarkers) {
        const emCmd = em.commandName.trim();
        if (emCmd && !mappedCmdNames.has(emCmd) && !reportedUnmappedMarkers.has(emCmd)) {
          reportedUnmappedMarkers.add(emCmd);
          issues.push({
            id: `auto-unmapped-marker-${p.id}-${em.id}`,
            severity: "warning",
            tab: "autonomous",
            path: `autonomous.paths.${p.id}.eventMarkers.${em.id}.commandName`,
            message:
              locale === "pt"
                ? `Event Marker "${em.name}" em ${p.name}.path usa "${emCmd}" sem RobotRequest associado.`
                : `Event Marker "${em.name}" in ${p.name}.path uses "${emCmd}" with no RobotRequest binding.`,
          });
        }
      }
    }
  }

  return issues;
}
