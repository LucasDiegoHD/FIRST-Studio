import { REBUILT_ZONE_PRESETS } from "../arena/rebuilt-2026";
import { REBUILT_AUTO_TEMPLATES } from "../autonomous/templates";
import type { Locale } from "../i18n";
import {
  createDefaultAutonomousConfig,
  isMotorSubsystem,
  type AutonomousConfig,
  type CiprixProject,
  type FieldZone,
} from "../schema/ciprix-project";
import type { StudioTab, ValidationIssue } from "../validator";

export const TUTORIAL_STORAGE_KEY = "firstStudio_tutorialState_v1";

export type TutorialStepId =
  | "project-team"
  | "drivetrain"
  | "subsystem-hardware"
  | "sensors"
  | "fsm-states"
  | "fsm-requests"
  | "fsm-bindings"
  | "superstructure"
  | "controls"
  | "zones"
  | "autonomous"
  | "export-deploy";

export interface TutorialStepCopy {
  title: string;
  whatToFill: string;
  whyItMatters: string;
  whereOnRobot: string;
}

export interface TutorialStep {
  id: TutorialStepId;
  tab: StudioTab;
  tourTarget: string;
  fallbackTourTarget?: string;
  fsmInnerTab?: "states" | "requests" | "bindings";
  openAdvancedHardware?: boolean;
  preferCenter?: boolean;
  copy: Record<Locale, TutorialStepCopy>;
}

export interface TutorialStepEvaluation {
  valid: boolean;
  blockingReason: string | null;
  relatedIssues: ValidationIssue[];
}

export interface TutorialProgressState {
  stepIndex: number;
  completed: boolean;
  active: boolean;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "project-team",
    tab: "project",
    tourTarget: "project-identity",
    copy: {
      pt: {
        title: "Projeto e Equipe",
        whatToFill: "Nome do projeto, número da equipe FRC, pacote Java (frc.robot) e aliança padrão.",
        whyItMatters:
          "Define o IP mDNS/estático do roboRIO (10.TE.AM.2), wpilib_preferences.json e o pacote de todas as classes geradas.",
        whereOnRobot:
          "Número oficial da equipe registrado no FIRST/Driver Station e padrão de pacotes do repositório Git do time.",
      },
      en: {
        title: "Project & Team",
        whatToFill: "Project name, FRC team number, base Java package (frc.robot), and default alliance.",
        whyItMatters:
          "Sets the roboRIO IP (10.TE.AM.2), wpilib_preferences.json, and the Java package for all generated classes.",
        whereOnRobot:
          "Official team number registered in FIRST/Driver Station and package convention in your team Git repo.",
      },
    },
  },
  {
    id: "drivetrain",
    tab: "subsystems",
    tourTarget: "drivetrain-panel",
    copy: {
      pt: {
        title: "Drivetrain (Tração)",
        whatToFill:
          "Base de tração (CTRE Swerve, YAGSL, AKit Swerve, Tank ou Mecanum), preset mecânico ou upload de TunerConstants.java, giroscópio e câmeras Limelight opcionais (ou manter Stub se quiser apenas testar mecanismos).",
        whyItMatters:
          "Gera Drive.java com DriveContext, AutoBuilder, odometria AdvantageKit e limites de aceleração do Ciprix.",
        whereOnRobot:
          "TunerConstants.java gerado no Phoenix Tuner X (Swerve Generator), relação da caixa (ex.: SDS MK4i L2 = 6.75:1, roda 0.1016 m), Pigeon 2 CAN ID no Tuner X e hostname em limelight.local:5801.",
      },
      en: {
        title: "Drivetrain",
        whatToFill:
          "Drive architecture (CTRE Swerve, YAGSL, AKit Swerve, Tank, or Mecanum), quick preset or TunerConstants.java import, gyro, and optional Limelight cameras (or keep Stub to test mechanisms alone).",
        whyItMatters:
          "Generates Drive.java with DriveContext, AutoBuilder, AdvantageKit odometry, and Ciprix acceleration limits.",
        whereOnRobot:
          "TunerConstants.java exported from Phoenix Tuner X (Swerve Generator), gearbox ratio (e.g. SDS MK4i L2 = 6.75:1, wheel 0.1016 m), Pigeon 2 CAN ID in Tuner X, and hostname at limelight.local:5801.",
      },
    },
  },
  {
    id: "subsystem-hardware",
    tab: "subsystems",
    tourTarget: "subsystem-inspector",
    fallbackTourTarget: "subsystem-palette",
    openAdvancedHardware: true,
    copy: {
      pt: {
        title: "Primeiro Subsistema (Hardware)",
        whatToFill:
          "Adicione (se começou do zero) e configure o primeiro mecanismo: controlador (Talon FX, SPARK MAX, Talon SRX), ID CAN único, limite de corrente, relação de redução (gearRatio) e limites (minLimit/maxLimit nas opções avançadas).",
        whyItMatters:
          "Impede colisões no barramento CAN, queima de motores por stall e colisões mecânicas além do fim de curso.",
        whereOnRobot:
          "ID CAN e barramento no Phoenix Tuner X ou REV Hardware Client (piscando o LED do controlador); corrente na ficha técnica/disjuntor PDP/PDH (40A–60A); redução contando dentes das engrenagens/polias no CAD; limites medindo o ângulo/curso físico até os batentes.",
      },
      en: {
        title: "First Subsystem (Hardware)",
        whatToFill:
          "Add (if starting from scratch) and configure your first mechanism: motor controller (Talon FX, SPARK MAX, Talon SRX), unique CAN ID, current limit, gearRatio, and soft limits (minLimit/maxLimit under Advanced).",
        whyItMatters:
          "Prevents CAN ID conflicts, motor burnout from stalls, and mechanical collisions past end stops.",
        whereOnRobot:
          "CAN ID and bus in Phoenix Tuner X or REV Hardware Client (blink LED to verify); current limit from motor datasheet/PDP/PDH breaker (40A–60A); gear ratio from CAD tooth counts; limits measured up to physical hard stops.",
      },
    },
  },
  {
    id: "sensors",
    tab: "subsystems",
    tourTarget: "subsystem-sensors",
    fallbackTourTarget: "subsystem-inspector",
    copy: {
      pt: {
        title: "Sensores de Presença",
        whatToFill:
          "Sensores de presença opcionais do mecanismo (Beam Break DIO, CTRE CANrange ou LaserCAN), porta/ID e inversão (Active-low para sensores NPN).",
        whyItMatters:
          "Permite parar o intake automaticamente ao detectar a peça e travar disparos sem peça nos Inputs (AutoLog + Sim).",
        whereOnRobot:
          "Número impresso na porta DIO 0–9 na carcaça do roboRIO (verificando com multímetro/Driver Station se o sinal cai para 0V ao cortar o feixe = Invertido) ou ID CAN do CANrange/LaserCAN no Tuner X / GrappleHook.",
      },
      en: {
        title: "Presence Sensors",
        whatToFill:
          "Optional presence sensors for the mechanism (Beam Break DIO, CTRE CANrange, or LaserCAN), port/CAN ID, and inversion (Active-low for NPN sensors).",
        whyItMatters:
          "Lets intakes auto-stop on game piece detection and gates shots in AutoLog Inputs + Sim.",
        whereOnRobot:
          "Printed DIO 0–9 port number on the roboRIO enclosure (check Driver Station/multimeter to see if cutting the beam drops to 0V = Inverted) or CANrange/LaserCAN ID in Tuner X / GrappleHook.",
      },
    },
  },
  {
    id: "fsm-states",
    tab: "fsm",
    fsmInnerTab: "states",
    tourTarget: "fsm-editor",
    copy: {
      pt: {
        title: "Estados da FSM",
        whatToFill:
          "Estados físicos do mecanismo (ex.: STOPPED, INTAKING, EJECTING ou ângulos STOWED/SCORE), ação do motor, LEDs/Rumble opcionais e transições locais (atSetpoint, sensor, corrente, timeoutAfter).",
        whyItMatters:
          "Cada estado vira um bloco determinístico na StateSubsystem do Ciprix, evitando motores disputando setpoints.",
        whereOnRobot:
          "Setpoints medidos em bancada/Modo Tuning no Dashboard (AdvantageScope/Shuffleboard), RPM alvo nos testes de disparo e tempo máximo seguro antes de desarmar por timeout.",
      },
      en: {
        title: "FSM States",
        whatToFill:
          "Physical mechanism states (e.g. STOPPED, INTAKING, EJECTING or STOWED/SCORE angles), motor action, optional LEDs/Rumble, and local transitions (atSetpoint, sensor, current, timeoutAfter).",
        whyItMatters:
          "Each state compiles into a deterministic Ciprix StateSubsystem block so commands never fight over motor setpoints.",
        whereOnRobot:
          "Setpoints measured on the bench or Dashboard Tuning Mode (AdvantageScope/Shuffleboard), target RPM from shot tests, and safe max timeout before disarming.",
      },
    },
  },
  {
    id: "fsm-requests",
    tab: "fsm",
    fsmInnerTab: "requests",
    tourTarget: "fsm-editor",
    copy: {
      pt: {
        title: "Requisições (Requests)",
        whatToFill:
          "Lista de Requests (intenções que a SuperStructure ou o copiloto podem pedir ao subsistema, como STOP, INTAKE, EJECT) e o initialRequest.",
        whyItMatters:
          "Desacopla o que o robô quer fazer de como o mecanismo executa, gerando métodos automáticos via @AutoCommandFactory.",
        whereOnRobot:
          "Ações funcionais listadas pela estratégia/driver team para aquele mecanismo na partida (parar, coletar, pontuar, desengasgar).",
      },
      en: {
        title: "Subsystem Requests",
        whatToFill:
          "Requests list (intentions SuperStructure or copilot can ask for, like STOP, INTAKE, EJECT) and the initialRequest.",
        whyItMatters:
          "Decouples what the robot wants from how the mechanism moves, generating @AutoCommandFactory methods.",
        whereOnRobot:
          "Functional actions agreed with strategy/drive team for match play (stop, intake, score, unjam).",
      },
    },
  },
  {
    id: "fsm-bindings",
    tab: "fsm",
    fsmInnerTab: "bindings",
    tourTarget: "fsm-editor",
    copy: {
      pt: {
        title: "Ligações (bindRequest)",
        whatToFill:
          "Tabela bindRequest conectando cada Request ao seu estado de entrada (entryState), objetivo (goalState) e intermediários opcionais.",
        whyItMatters:
          "Sem bindRequest, pedir uma requisição no código não move a máquina de estados para nenhum estado.",
        whereOnRobot:
          "Sequência física real do mecanismo (ex.: pedir SHOOT entra em RAMPING até atingir RPM e termina em READY).",
      },
      en: {
        title: "Request Bindings (bindRequest)",
        whatToFill:
          "bindRequest table mapping each Request to its entryState, goalState, and optional intermediate states.",
        whyItMatters:
          "Without bindRequest, requesting an action in Java will not transition the state machine.",
        whereOnRobot:
          "Physical sequence on the robot (e.g. SHOOT enters RAMPING until at speed, then ends in READY).",
      },
    },
  },
  {
    id: "superstructure",
    tab: "superstructure",
    tourTarget: "superstructure-matrix",
    preferCenter: true,
    copy: {
      pt: {
        title: "SuperStructure",
        whatToFill:
          "Estados globais do robô (RobotState / RobotRequest), qual requisição cada subsistema recebe em cada linha da matriz e interlocks allAtGoal / sensores.",
        whyItMatters:
          "Coordena múltiplos mecanismos juntos e impede colisões internas (ex.: só alimentar o shooter quando braço e flywheel estiverem atGoal()).",
        whereOnRobot:
          "Geometria de interferência mecânica no CAD/robô real e sequência completa de cada jogada da equipe.",
      },
      en: {
        title: "SuperStructure",
        whatToFill:
          "Global RobotState / RobotRequest rows, which request each subsystem receives per row, and allAtGoal / sensor interlocks.",
        whyItMatters:
          "Coordinates mechanisms together and prevents internal collisions (e.g. feed shooter only after arm and flywheel are atGoal()).",
        whereOnRobot:
          "Mechanical clearance geometry from CAD/real robot and full scoring sequence used by your drivers.",
      },
    },
  },
  {
    id: "controls",
    tab: "controls",
    tourTarget: "controls-editor",
    copy: {
      pt: {
        title: "Controles Xbox",
        whatToFill:
          "Fila de prioridade de botões/gatilhos do Piloto (Xbox 0) para RobotRequest e overrides diretos do Copiloto (Xbox 1), além do Pit Card PNG.",
        whyItMatters:
          "Define SuperStructureCommands.manageRequests sem conflito de comandos quando dois botões são apertados juntos.",
        whereOnRobot:
          "Aba USB Devices da FRC Driver Station (Port 0 = Piloto, Port 1 = Copiloto) e preferência ergonômica dos pilotos nos treinos.",
      },
      en: {
        title: "Xbox Controls",
        whatToFill:
          "Pilot (Xbox 0) priority queue for RobotRequest, Copilot (Xbox 1) direct overrides, plus optional Pit Card PNG.",
        whyItMatters:
          "Builds SuperStructureCommands.manageRequests cleanly with zero button conflicts when multiple inputs are held.",
        whereOnRobot:
          "USB Devices tab in FRC Driver Station (Port 0 = Pilot, Port 1 = Copilot) and driver ergonomics from practice.",
      },
    },
  },
  {
    id: "zones",
    tab: "arena",
    tourTarget: "arena-zones",
    copy: {
      pt: {
        title: "Zonas na Arena",
        whatToFill:
          "Desenhe ou aplique zonas no campo REBUILT 2026. Carregamos como exemplo a zona TRENCH_SUCTION (Sucção no Trench, espelhada nas duas alianças) alinhando o robô ao cruzar o túnel.",
        whyItMatters:
          "Gera FieldZones.java com AllianceFlipUtil para desacelerar em Bumps, alinhar em Trenches ou preparar mecanismos automaticamente por região.",
        whereOnRobot:
          "Medidas oficiais do manual/CAD de campo FRC 2026 REBUILT (16,54 m × 8,07 m) e odometria validada no AdvantageScope.",
      },
      en: {
        title: "Arena Zones",
        whatToFill:
          "Draw or apply zones on the 2026 REBUILT field. We loaded TRENCH_SUCTION (mirrored across both alliances) as an example to align the robot through the tunnel.",
        whyItMatters:
          "Generates FieldZones.java with AllianceFlipUtil to cap speed on Bumps, assist through Trenches, or auto-prep mechanisms by region.",
        whereOnRobot:
          "Official FRC 2026 REBUILT field manual/CAD dimensions (16.54 m × 8.07 m) and odometry verified in AdvantageScope.",
      },
    },
  },
  {
    id: "autonomous",
    tab: "autonomous",
    tourTarget: "autonomous-editor",
    copy: {
      pt: {
        title: "Autônomos",
        whatToFill:
          "Edite curvas Bézier (.path), eventos e rotinas (.auto). A simulação da rotina exemplo 2 Peças Centro (Trench) já inicia ao vivo com IntakeOn/ScoreFuel — mude para Trajetos (.path) no topo se quiser arrastar os pontos da curva.",
        whyItMatters:
          "Registra NamedCommands antes dos autos no AutonomousSetup.java e exporta .path/.auto/settings.json prontos para deploy/pathplanner/.",
        whereOnRobot:
          "Posições iniciais combinadas com a aliança no pit, testes de 15s em quadra e arquivos .path/.auto da pasta src/main/deploy/pathplanner.",
      },
      en: {
        title: "Autonomous",
        whatToFill:
          "Edit Bézier splines (.path), markers, and routines (.auto). The 2 Piece Center (Trench) example routine starts simulating live with IntakeOn/ScoreFuel — switch to Paths (.path) at the top to drag spline points.",
        whyItMatters:
          "Registers NamedCommands before autos in AutonomousSetup.java and emits .path/.auto/settings.json under deploy/pathplanner/.",
        whereOnRobot:
          "Starting poses agreed with alliance partners in the pit, 15s field tests, and .path/.auto files in src/main/deploy/pathplanner.",
      },
    },
  },
  {
    id: "export-deploy",
    tab: "code",
    tourTarget: "export-actions",
    copy: {
      pt: {
        title: "Gerar e Enviar",
        whatToFill:
          "Revise a árvore de arquivos gerados, conecte uma pasta local ou baixe o .zip, e use Enviar ao Robô (Bridge) para gradlew build / deploy.",
        whyItMatters:
          "Garante 0 erros no validador, preserva blocos // FIRST-STUDIO:BEGIN custom e envia direto ao roboRIO usando o JDK da WPILib.",
        whereOnRobot:
          "Cabo USB no roboRIO (172.22.11.2) ou rádio Wi-Fi/Ethernet da equipe (10.TE.AM.2) com FIRST Studio Bridge aberto no notebook de programação.",
      },
      en: {
        title: "Generate & Deploy",
        whatToFill:
          "Inspect the generated file tree, connect a local folder or download the .zip, and click Send to Robot (Bridge) for gradlew build / deploy.",
        whyItMatters:
          "Verifies 0 validator errors, preserves // FIRST-STUDIO:BEGIN custom blocks, and deploys straight to the roboRIO via WPILib JDK.",
        whereOnRobot:
          "USB cable to the roboRIO (172.22.11.2) or team Wi-Fi/Ethernet radio (10.TE.AM.2) with FIRST Studio Bridge running.",
      },
    },
  },
];

export interface BoxRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

function boxIntersectionArea(a: BoxRect, b: BoxRect): number {
  const xOverlap = Math.max(
    0,
    Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left),
  );
  const yOverlap = Math.max(
    0,
    Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top),
  );
  return xOverlap * yOverlap;
}

export function computeStrategicCardPlacement(
  cutout: BoxRect | null,
  viewportW: number,
  viewportH: number,
  cardW: number,
  cardH: number,
  preferCenter = false,
): { left: number; top: number } {
  const marginX = 16;
  const minTop = 76;
  const maxBottom = Math.max(minTop + cardH, viewportH - 16);
  const gap = 20;

  const clampPos = (left: number, top: number) => ({
    left: Math.max(
      marginX,
      Math.min(Math.max(marginX, viewportW - marginX - cardW), Math.round(left)),
    ),
    top: Math.max(minTop, Math.min(maxBottom - cardH, Math.round(top))),
  });

  if (!cutout) {
    return clampPos((viewportW - cardW) / 2, (viewportH - cardH) / 2);
  }

  const cx = cutout.left + cutout.width / 2;
  const cy = cutout.top + cutout.height / 2;

  if (preferCenter) {
    return clampPos(cx - cardW / 2, cy - cardH / 2);
  }

  const paddedCutout: BoxRect = {
    left: cutout.left - 8,
    top: cutout.top - 8,
    width: cutout.width + 16,
    height: cutout.height + 16,
  };

  const isCenteredWide =
    Math.abs(cx - viewportW / 2) < 180 && cutout.width > viewportW * 0.34;

  const rawCandidates: { left: number; top: number }[] = isCenteredWide
    ? [
        { left: cx - cardW / 2, top: cutout.top + cutout.height + gap },
        { left: cx - cardW / 2, top: cutout.top - gap - cardH },
        { left: cutout.left + cutout.width + gap, top: cy - cardH / 2 },
        { left: cutout.left - gap - cardW, top: cy - cardH / 2 },
      ]
    : cx <= viewportW * 0.58
      ? [
          { left: cutout.left + cutout.width + gap, top: cy - cardH / 2 },
          { left: cutout.left - gap - cardW, top: cy - cardH / 2 },
          { left: cx - cardW / 2, top: cutout.top + cutout.height + gap },
          { left: cx - cardW / 2, top: cutout.top - gap - cardH },
        ]
      : [
          { left: cutout.left - gap - cardW, top: cy - cardH / 2 },
          { left: cutout.left + cutout.width + gap, top: cy - cardH / 2 },
          { left: cx - cardW / 2, top: cutout.top + cutout.height + gap },
          { left: cx - cardW / 2, top: cutout.top - gap - cardH },
        ];

  let best = clampPos(rawCandidates[0].left, rawCandidates[0].top);
  let bestOverlap = Infinity;

  for (const cand of rawCandidates) {
    const clamped = clampPos(cand.left, cand.top);
    const overlap = boxIntersectionArea(
      { left: clamped.left, top: clamped.top, width: cardW, height: cardH },
      paddedCutout,
    );
    if (overlap === 0) {
      return clamped;
    }
    if (overlap < bestOverlap) {
      bestOverlap = overlap;
      best = clamped;
    }
  }

  if (isCenteredWide) {
    return clampPos(cx - cardW / 2, cy - cardH / 2);
  }

  return best;
}

export const TUTORIAL_EXAMPLE_ZONE_ID = "zone-tutorial-trench";
export const TUTORIAL_EXAMPLE_AUTO_ID = "auto-tutorial-trench";

export function hasAnyUserAutonomous(project: CiprixProject): boolean {
  const a = project.autonomous;
  if (!a) return false;
  return (
    a.enabled ||
    (a.paths?.length ?? 0) > 0 ||
    a.routines.length > 0 ||
    a.namedCommands.length > 0
  );
}

export function buildTutorialZonePreview(project: CiprixProject): FieldZone[] {
  const created = REBUILT_ZONE_PRESETS[0].createZone(
    project.project.fieldLengthMeters,
    project.project.fieldWidthMeters,
  );
  return [{ ...created, id: TUTORIAL_EXAMPLE_ZONE_ID }];
}

export function buildTutorialAutoPreview(project: CiprixProject): AutonomousConfig {
  const tpl =
    REBUILT_AUTO_TEMPLATES.find((t) => t.id === "two-piece-trench") ?? REBUILT_AUTO_TEMPLATES[0];
  const reqs =
    project.superstructure.requests.length > 0
      ? project.superstructure.requests
      : [project.superstructure.initialRequest || "IDLE"];
  const built = tpl.build(
    project.project.fieldLengthMeters,
    project.project.fieldWidthMeters,
    reqs,
  );
  const orderedPaths = [...built.paths].sort((a, b) =>
    a.name === "ThroughTrenchToNeutral" ? -1 : b.name === "ThroughTrenchToNeutral" ? 1 : 0,
  );
  const base = createDefaultAutonomousConfig();
  return {
    ...base,
    enabled: true,
    defaultAutoId: TUTORIAL_EXAMPLE_AUTO_ID,
    namedCommands: built.namedCommands.map((c, idx) => ({ ...c, id: `nc-tutorial-${idx}` })),
    paths: orderedPaths.map((p, idx) => ({ ...p, id: `path-tutorial-${idx}` })),
    routines: [{ ...built.routine, id: TUTORIAL_EXAMPLE_AUTO_ID }],
  };
}

function uniqueCaseInsensitiveName(base: string, usedLower: Set<string>): string {
  if (!usedLower.has(base.toLowerCase())) {
    usedLower.add(base.toLowerCase());
    return base;
  }
  let idx = 2;
  while (usedLower.has(`${base}_${idx}`.toLowerCase())) {
    idx += 1;
  }
  const next = `${base}_${idx}`;
  usedLower.add(next.toLowerCase());
  return next;
}

export function applyTutorialZoneExample(project: CiprixProject): CiprixProject {
  const existing = project.zones ?? [];
  if (existing.some((z) => z.id === TUTORIAL_EXAMPLE_ZONE_ID)) return project;
  const preview = buildTutorialZonePreview(project)[0];
  const usedNames = new Set(existing.map((z) => z.name.toLowerCase()));
  const uniqueName = uniqueCaseInsensitiveName(preview.name, usedNames);
  return {
    ...project,
    zones: [...existing, { ...preview, name: uniqueName }],
  };
}

export function applyTutorialAutoExample(project: CiprixProject): CiprixProject {
  const existingAuto = project.autonomous ?? createDefaultAutonomousConfig();
  if (existingAuto.routines.some((r) => r.id === TUTORIAL_EXAMPLE_AUTO_ID)) {
    return project;
  }
  const preview = buildTutorialAutoPreview(project);

  const usedCmdNames = new Set(existingAuto.namedCommands.map((c) => c.name.trim().toLowerCase()));
  const mergedCmds = [
    ...existingAuto.namedCommands,
    ...preview.namedCommands.filter((c) => !usedCmdNames.has(c.name.trim().toLowerCase())),
  ];

  const existingPaths = existingAuto.paths ?? [];
  const usedPathNames = new Set(existingPaths.map((p) => p.name.toLowerCase()));
  const pathRenameMap = new Map<string, string>();
  const addedPaths = (preview.paths ?? []).map((p) => {
    const nextName = uniqueCaseInsensitiveName(p.name, usedPathNames);
    if (nextName !== p.name) {
      pathRenameMap.set(p.name, nextName);
    }
    return { ...p, name: nextName };
  });

  const usedFileNames = new Set(existingAuto.routines.map((r) => r.fileName.toLowerCase()));
  const previewRoutine = preview.routines[0];
  const nextFileName = uniqueCaseInsensitiveName(previewRoutine.fileName, usedFileNames);
  const nextRoutine = {
    ...previewRoutine,
    fileName: nextFileName,
    steps: previewRoutine.steps?.map((st) =>
      st.kind === "path" && pathRenameMap.has(st.pathName)
        ? { ...st, pathName: pathRenameMap.get(st.pathName)! }
        : st,
    ),
  };

  return {
    ...project,
    autonomous: {
      ...existingAuto,
      enabled: true,
      defaultAutoId: existingAuto.defaultAutoId ?? TUTORIAL_EXAMPLE_AUTO_ID,
      namedCommands: mergedCmds,
      paths: [...existingPaths, ...addedPaths],
      routines: [...existingAuto.routines, nextRoutine],
    },
  };
}

export function resolveStepTourTarget(step: TutorialStep, project: CiprixProject): string {
  if (step.id === "subsystem-hardware" && !project.subsystems.some(isMotorSubsystem)) {
    return step.fallbackTourTarget ?? step.tourTarget;
  }
  return step.tourTarget;
}

export function evaluateTutorialStep(
  stepId: TutorialStepId,
  project: CiprixProject,
  issues: ValidationIssue[],
  locale: Locale = "pt",
): TutorialStepEvaluation {
  const motorSubs = project.subsystems.filter(isMotorSubsystem);
  let blockingIssues: ValidationIssue[] = [];

  switch (stepId) {
    case "project-team":
      blockingIssues = issues.filter((i) => i.severity === "error" && i.tab === "project");
      break;

    case "drivetrain":
      blockingIssues = issues.filter(
        (i) =>
          i.severity === "error" &&
          (i.targetId === "drivetrain" || Boolean(i.path?.startsWith("drivetrain."))),
      );
      break;

    case "subsystem-hardware": {
      if (motorSubs.length === 0) {
        return {
          valid: false,
          blockingReason:
            locale === "pt"
              ? "Adicione pelo menos um mecanismo com motor na barra de Componentes para continuar."
              : "Add at least one motor mechanism from the Components panel to continue.",
          relatedIssues: issues.filter((i) => i.id === "no-subsystems"),
        };
      }
      blockingIssues = issues.filter(
        (i) =>
          i.severity === "error" &&
          i.tab === "subsystems" &&
          i.targetId !== "drivetrain" &&
          !i.path?.includes(".sensors."),
      );
      break;
    }

    case "sensors": {
      if (motorSubs.length === 0) {
        return {
          valid: false,
          blockingReason:
            locale === "pt"
              ? "Adicione pelo menos um mecanismo com motor antes de configurar sensores."
              : "Add at least one motor mechanism before configuring sensors.",
          relatedIssues: [],
        };
      }
      blockingIssues = issues.filter(
        (i) => i.severity === "error" && i.tab === "subsystems" && Boolean(i.path?.includes(".sensors.")),
      );
      break;
    }

    case "fsm-states": {
      if (motorSubs.length === 0 || motorSubs.some((s) => s.fsm.states.length === 0)) {
        return {
          valid: false,
          blockingReason:
            locale === "pt"
              ? "Cada subsistema de motor precisa de ao menos 1 estado na FSM."
              : "Each motor subsystem needs at least 1 FSM state.",
          relatedIssues: [],
        };
      }
      blockingIssues = issues.filter(
        (i) =>
          i.severity === "error" &&
          i.tab === "fsm" &&
          !i.path?.includes(".fsm.requests.") &&
          !i.path?.includes(".fsm.initialRequest") &&
          !i.path?.includes(".fsm.bindings."),
      );
      break;
    }

    case "fsm-requests": {
      if (motorSubs.length === 0 || motorSubs.some((s) => s.fsm.requests.length === 0)) {
        return {
          valid: false,
          blockingReason:
            locale === "pt"
              ? "Cada subsistema de motor precisa de ao menos 1 requisição (Request)."
              : "Each motor subsystem needs at least 1 Request.",
          relatedIssues: [],
        };
      }
      blockingIssues = issues.filter(
        (i) =>
          i.severity === "error" &&
          i.tab === "fsm" &&
          (Boolean(i.path?.includes(".fsm.requests.")) ||
            Boolean(i.path?.includes(".fsm.initialRequest"))),
      );
      break;
    }

    case "fsm-bindings": {
      if (motorSubs.length === 0 || motorSubs.some((s) => s.fsm.bindings.length === 0)) {
        return {
          valid: false,
          blockingReason:
            locale === "pt"
              ? "Conecte ao menos 1 Request a um estado na tabela bindRequest."
              : "Connect at least 1 Request to a state in the bindRequest table.",
          relatedIssues: [],
        };
      }
      blockingIssues = issues.filter(
        (i) =>
          i.tab === "fsm" &&
          ((i.severity === "error" && Boolean(i.path?.includes(".fsm.bindings."))) ||
            i.id.startsWith("fsm-unbound-req-")),
      );
      break;
    }

    case "superstructure":
      blockingIssues = issues.filter(
        (i) =>
          i.tab === "superstructure" &&
          (i.severity === "error" || i.id.startsWith("super-unbound-")),
      );
      break;

    case "controls":
      blockingIssues = issues.filter((i) => i.severity === "error" && i.tab === "controls");
      break;

    case "zones":
      blockingIssues = issues.filter((i) => i.severity === "error" && i.tab === "arena");
      break;

    case "autonomous":
      blockingIssues = issues.filter((i) => i.severity === "error" && i.tab === "autonomous");
      break;

    case "export-deploy":
      blockingIssues = issues.filter((i) => i.severity === "error");
      break;
  }

  if (blockingIssues.length > 0) {
    return {
      valid: false,
      blockingReason: blockingIssues[0].message,
      relatedIssues: blockingIssues,
    };
  }

  return {
    valid: true,
    blockingReason: null,
    relatedIssues: [],
  };
}

export function clampTutorialStepIndex(index: number): number {
  if (!Number.isFinite(index)) return 0;
  return Math.max(0, Math.min(TUTORIAL_STEPS.length - 1, Math.trunc(index)));
}

export function parseTutorialProgress(raw: string | null): TutorialProgressState {
  if (!raw) return { stepIndex: 0, completed: false, active: false };
  try {
    const parsed = JSON.parse(raw) as Partial<TutorialProgressState> | null;
    if (!parsed || typeof parsed !== "object") {
      return { stepIndex: 0, completed: false, active: false };
    }
    return {
      stepIndex: clampTutorialStepIndex(typeof parsed.stepIndex === "number" ? parsed.stepIndex : 0),
      completed: Boolean(parsed.completed),
      active: Boolean(parsed.active),
    };
  } catch {
    return { stepIndex: 0, completed: false, active: false };
  }
}

export function serializeTutorialProgress(state: TutorialProgressState): string {
  return JSON.stringify({
    stepIndex: clampTutorialStepIndex(state.stepIndex),
    completed: Boolean(state.completed),
    active: Boolean(state.active),
  });
}

export function loadTutorialProgress(): TutorialProgressState {
  if (typeof window === "undefined") {
    return { stepIndex: 0, completed: false, active: false };
  }
  try {
    return parseTutorialProgress(window.localStorage.getItem(TUTORIAL_STORAGE_KEY));
  } catch {
    return { stepIndex: 0, completed: false, active: false };
  }
}

export function saveTutorialProgress(state: TutorialProgressState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TUTORIAL_STORAGE_KEY, serializeTutorialProgress(state));
  } catch {
    // Ignore storage quota errors
  }
}
