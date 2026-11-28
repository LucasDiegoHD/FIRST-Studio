import type { Locale } from "../i18n";

export interface HelpEntry {
  what: string;
  why: string;
  typical?: string;
}

export const HELP_CATALOG: Record<string, { pt: HelpEntry; en: HelpEntry }> = {
  // Project
  "project.name": {
    pt: {
      what: "Nome identificador do projeto Gradle/WPILib.",
      why: "Define o rootProject.name em settings.gradle e o nome do arquivo .zip exportado.",
      typical: "my-robot",
    },
    en: {
      what: "Gradle/WPILib project identifier name.",
      why: "Sets rootProject.name in settings.gradle and the exported .zip archive name.",
      typical: "my-robot",
    },
  },
  "project.teamNumber": {
    pt: {
      what: "Número oficial da equipe FRC.",
      why: "Gravado em wpilib_preferences.json para o RioLog e deploy automático no roboRIO.",
      typical: "9047",
    },
    en: {
      what: "Official FRC team number.",
      why: "Written to wpilib_preferences.json for RioLog and automated roboRIO deploy.",
      typical: "9047",
    },
  },
  "project.packageName": {
    pt: {
      what: "Pacote Java raiz das classes geradas.",
      why: "Organiza todas as pastas em src/main/java/ e os imports do projeto.",
      typical: "frc.robot",
    },
    en: {
      what: "Root Java package for generated classes.",
      why: "Organizes folders under src/main/java/ and all project imports.",
      typical: "frc.robot",
    },
  },
  "project.year": {
    pt: {
      what: "Temporada FRC alvo do WPILib.",
      why: "Determina o ano dos artefatos WPILib e da biblioteca Ciprix.",
      typical: "2026",
    },
    en: {
      what: "Target WPILib FRC season year.",
      why: "Determines the WPILib and Ciprix artifact year.",
      typical: "2026",
    },
  },
  "project.simMode": {
    pt: {
      what: "Modo de execução fora do roboRIO (SIM ou REPLAY).",
      why: "SIM roda a física virtual; REPLAY reproduz logs .wpilog determinísticos no AdvantageKit.",
      typical: "SIM",
    },
    en: {
      what: "Off-robot execution mode (SIM or REPLAY).",
      why: "SIM runs physics simulation; REPLAY deterministically replays .wpilog logs in AdvantageKit.",
      typical: "SIM",
    },
  },
  "project.controllerDeadband": {
    pt: {
      what: "Zona morta aplicada aos eixos analógicos dos controles Xbox.",
      why: "Evita que folgas mecânicas nos sticks acionem o robô sem toque.",
      typical: "0.08",
    },
    en: {
      what: "Deadband applied to Xbox analog stick axes.",
      why: "Prevents stick drift from triggering unintended motion.",
      typical: "0.08",
    },
  },
  "project.tuningMode": {
    pt: {
      what: "Chave para publicar valores ajustáveis no dashboard.",
      why: "Permite tunar PID/setpoints ao vivo em testes; desligue em competições.",
      typical: "true (em testes)",
    },
    en: {
      what: "Flag to publish live-tunable values to the dashboard.",
      why: "Lets you tune PID/setpoints live during practice; disable at competitions.",
      typical: "true (during testing)",
    },
  },
  "project.defaultAlliance": {
    pt: {
      what: "Aliança padrão quando FMS e Driver Station não informam nenhuma.",
      why: "Usada por CiprixSettings em simulação para orientar campo e trajetórias.",
      typical: "Blue",
    },
    en: {
      what: "Default alliance when neither FMS nor Driver Station reports one.",
      why: "Used by CiprixSettings in simulation for field orientation.",
      typical: "Blue",
    },
  },
  "project.fieldLengthMeters": {
    pt: {
      what: "Comprimento total do campo oficial em metros.",
      why: "Referência do CiprixSettings para espelhamento de coordenadas entre alianças.",
      typical: "16.541 m",
    },
    en: {
      what: "Official field length in meters.",
      why: "Reference used by CiprixSettings for alliance coordinate flipping.",
      typical: "16.541 m",
    },
  },
  "project.fieldWidthMeters": {
    pt: {
      what: "Largura total do campo oficial em metros.",
      why: "Define o limite lateral do campo para odometria e simulação.",
      typical: "8.069 m",
    },
    en: {
      what: "Official field width in meters.",
      why: "Defines lateral field bounds for odometry and simulation.",
      typical: "8.069 m",
    },
  },
  "features.driveContextStub": {
    pt: {
      what: "Adiciona marcador de integração para DriveContext no RobotContainer.",
      why: "Ajuda a conectar um drivetrain gerado externamente (Phoenix Tuner X ou YAGSL).",
      typical: "false",
    },
    en: {
      what: "Adds an integration marker for DriveContext in RobotContainer.",
      why: "Helps wire an externally generated drivetrain (Phoenix Tuner X or YAGSL).",
      typical: "false",
    },
  },

  // Subsystem basic & hardware
  "subsystems.*.name": {
    pt: {
      what: "Nome da classe Java do subsistema (PascalCase).",
      why: "Gera a classe, o pacote e os enums Request/State do StateSubsystem.",
      typical: "Intake",
    },
    en: {
      what: "Java class name for the subsystem (PascalCase).",
      why: "Generates the StateSubsystem class, package, and Request/State enums.",
      typical: "Intake",
    },
  },
  "subsystems.*.basicDefaults": {
    pt: {
      what: "Este subsistema ainda está com a configuração básica padrão.",
      why: "Ajuste ID CAN, redução, limites e controles para a especificidade do seu robô. Este aviso some automaticamente ao editar o mecanismo.",
    },
    en: {
      what: "This subsystem is still using basic default settings.",
      why: "Adjust CAN ID, gear ratio, limits, and controls to match your specific robot. This notice disappears once you edit it.",
    },
  },
  "subsystems.*.motor.canId": {
    pt: {
      what: "Endereço único do controlador no barramento CAN (0 a 62).",
      why: "Identifica o motor físico configurado no Phoenix Tuner X ou REV Hardware Client.",
      typical: "10",
    },
    en: {
      what: "Unique motor controller address on the CAN bus (0 to 62).",
      why: "Identifies the physical controller configured in Phoenix Tuner X or REV Hardware Client.",
      typical: "10",
    },
  },
  "subsystems.*.motor.vendor": {
    pt: {
      what: "Modelo/fabricante do controlador de motor.",
      why: "Seleciona a classe IO real (TalonFX, SPARK MAX ou TalonSRX) e sua vendordep.",
      typical: "talonfx",
    },
    en: {
      what: "Motor controller vendor/model.",
      why: "Selects the real IO implementation (TalonFX, SPARK MAX, or TalonSRX) and vendordep.",
      typical: "talonfx",
    },
  },
  "subsystems.*.motor.currentLimitAmps": {
    pt: {
      what: "Limite de corrente contínua/stator enviado ao motor (Ampères).",
      why: "Protege o motor contra queima e evita queda de tensão/disjuntor no robô.",
      typical: "40 A (roller) · 60 A (shooter)",
    },
    en: {
      what: "Continuous/stator current limit applied to the motor (Amps).",
      why: "Protects motor windings and prevents brownouts or tripped breakers.",
      typical: "40 A (roller) · 60 A (shooter)",
    },
  },
  "subsystems.*.motor.canBus": {
    pt: {
      what: "Nome do barramento CAN (ex.: rio ou nome do CANivore).",
      why: "Direciona o MotorIOTalonFX para o barramento correto; vazio usa o rio.",
      typical: "rio (ou canivore)",
    },
    en: {
      what: "CAN bus name (e.g. rio or CANivore bus name).",
      why: "Points MotorIOTalonFX to the right bus; empty uses the roboRIO bus.",
      typical: "rio (or canivore)",
    },
  },
  "subsystems.*.motor.neutralMode": {
    pt: {
      what: "Comportamento do motor quando recebe 0V (coast ou brake).",
      why: "Brake segura braços/elevadores no lugar; coast deixa flywheels e rollers livres.",
      typical: "brake (arm/elevator) · coast (roller/shooter)",
    },
    en: {
      what: "Motor behavior at 0V output (coast or brake).",
      why: "Brake holds arms/elevators in place; coast lets flywheels and rollers spin freely.",
      typical: "brake (arm/elevator) · coast (roller/shooter)",
    },
  },
  "subsystems.*.motor.inverted": {
    pt: {
      what: "Inverte o sentido positivo de rotação do motor.",
      why: "Alinha saída positiva com o sentido físico desejado sem mexer nos fios.",
      typical: "false",
    },
    en: {
      what: "Inverts the positive rotation direction of the motor.",
      why: "Aligns positive output with physical mechanism motion without rewiring.",
      typical: "false",
    },
  },
  "subsystems.*.motor.gearRatio": {
    pt: {
      what: "Relação de redução mecânica entre motor e mecanismo (motor:saída).",
      why: "Converte rotações do motor para ângulos/unidades reais do mecanismo e simulação.",
      typical: "3:1 (roller) · 50:1 (arm)",
    },
    en: {
      what: "Mechanical gear reduction from motor to mechanism (motor:output).",
      why: "Converts motor rotations to real mechanism units and simulation inertia.",
      typical: "3:1 (roller) · 50:1 (arm)",
    },
  },
  "subsystems.*.motor.moiKgM2": {
    pt: {
      what: "Momento de inércia estimado do mecanismo na simulação (kg·m²).",
      why: "Controla quão rápido o mecanismo acelera e desacelera no modo SIM.",
      typical: "0.001 – 0.08 kg·m²",
    },
    en: {
      what: "Estimated mechanism moment of inertia for simulation (kg·m²).",
      why: "Controls how fast the simulated mechanism accelerates and decelerates.",
      typical: "0.001 – 0.08 kg·m²",
    },
  },

  // Physics
  "subsystems.*.physics.massKg": {
    pt: {
      what: "Massa móvel usada no modelo físico do braço ou elevador (kg).",
      why: "Simula gravidade e carga real no AdvantageScope.",
      typical: "4 kg",
    },
    en: {
      what: "Moving mass used in arm or elevator physics simulation (kg).",
      why: "Simulates gravity and realistic load in AdvantageScope.",
      typical: "4 kg",
    },
  },
  "subsystems.*.physics.lengthMeters": {
    pt: {
      what: "Comprimento efetivo do braço/pivô do eixo até a ponta (m).",
      why: "Calcula torque gravitacional e visualização 2D/3D na simulação.",
      typical: "0.5 m",
    },
    en: {
      what: "Effective arm length from pivot to end-effector (m).",
      why: "Computes gravity torque and 2D/3D visualization in simulation.",
      typical: "0.5 m",
    },
  },
  "subsystems.*.physics.drumRadiusMeters": {
    pt: {
      what: "Raio da polia ou tambor que puxa o elevador/escalador (m).",
      why: "Converte rotações do eixo em altura linear na simulação.",
      typical: "0.025 m",
    },
    en: {
      what: "Pulley or drum radius driving the elevator/climber (m).",
      why: "Converts shaft rotations to linear travel in simulation.",
      typical: "0.025 m",
    },
  },

  // Closed-loop
  "subsystems.*.closedLoop.kP": {
    pt: {
      what: "Ganho proporcional (P) da malha fechada.",
      why: "Corrige o erro atual entre alvo e posição/velocidade medida.",
      typical: "0.08 (shooter) · 8.0 (arm)",
    },
    en: {
      what: "Closed-loop proportional gain (kP).",
      why: "Drives correction proportional to current position or velocity error.",
      typical: "0.08 (shooter) · 8.0 (arm)",
    },
  },
  "subsystems.*.closedLoop.kI": {
    pt: {
      what: "Ganho integral (I) da malha fechada.",
      why: "Zera erro residual estacionário; deixe 0 se kP + kG já estabilizarem.",
      typical: "0",
    },
    en: {
      what: "Closed-loop integral gain (kI).",
      why: "Eliminates steady-state error; keep 0 if kP + kG already settle cleanly.",
      typical: "0",
    },
  },
  "subsystems.*.closedLoop.kD": {
    pt: {
      what: "Ganho derivativo (D) da malha fechada.",
      why: "Amortece oscilações e overshoot ao se aproximar do alvo.",
      typical: "0 – 0.25",
    },
    en: {
      what: "Closed-loop derivative gain (kD).",
      why: "Dampens oscillations and overshoot when approaching the setpoint.",
      typical: "0 – 0.25",
    },
  },
  "subsystems.*.closedLoop.kS": {
    pt: {
      what: "Feedforward estático (V) para vencer o atrito inicial.",
      why: "Garante que o mecanismo comece a se mover mesmo com erros pequenos.",
      typical: "0.12 V",
    },
    en: {
      what: "Static friction feedforward voltage (kS).",
      why: "Helps the mechanism overcome stiction at small errors.",
      typical: "0.12 V",
    },
  },
  "subsystems.*.closedLoop.kV": {
    pt: {
      what: "Feedforward de velocidade (V por unidade/s).",
      why: "Sustenta a velocidade alvo sem depender apenas do PID.",
      typical: "0.12 – 0.8",
    },
    en: {
      what: "Velocity feedforward gain (kV).",
      why: "Maintains target velocity without overloading the feedback loop.",
      typical: "0.12 – 0.8",
    },
  },
  "subsystems.*.closedLoop.kA": {
    pt: {
      what: "Feedforward de aceleração (V por unidade/s²).",
      why: "Antecipa o torque extra necessário durante acelerações rápidas.",
      typical: "0.01 – 0.02",
    },
    en: {
      what: "Acceleration feedforward gain (kA).",
      why: "Anticipates extra voltage needed during fast accelerations.",
      typical: "0.01 – 0.02",
    },
  },
  "subsystems.*.closedLoop.kG": {
    pt: {
      what: "Feedforward gravitacional (V) para braços e elevadores.",
      why: "Compensa o peso do mecanismo contra a gravidade (constante ou cosseno).",
      typical: "0.35 V",
    },
    en: {
      what: "Gravity feedforward voltage (kG) for arms and elevators.",
      why: "Counteracts mechanism weight against gravity.",
      typical: "0.35 V",
    },
  },
  "subsystems.*.closedLoop.minLimit": {
    pt: {
      what: "Limite inferior de software (soft limit mínimo).",
      why: "Impede que o motor comande movimento abaixo do fim de curso seguro.",
      typical: "-10° (arm) · 0 rot (elevator)",
    },
    en: {
      what: "Lower software travel limit (min soft limit).",
      why: "Prevents commanding motion past the safe mechanical stop.",
      typical: "-10° (arm) · 0 rot (elevator)",
    },
  },
  "subsystems.*.closedLoop.maxLimit": {
    pt: {
      what: "Limite superior de software (soft limit máximo).",
      why: "Impede que o motor avance além do curso mecânico máximo.",
      typical: "100° (arm) · 7.5 rot (elevator)",
    },
    en: {
      what: "Upper software travel limit (max soft limit).",
      why: "Prevents commanding motion past the upper mechanical stop.",
      typical: "100° (arm) · 7.5 rot (elevator)",
    },
  },
  "subsystems.*.closedLoop.positionWrap": {
    pt: {
      what: "Habilita envolvimento contínuo de posição (withPositionWrap).",
      why: "Permite que uma turret escolha o caminho mais curto através de 0°/360°.",
      typical: "true para turret",
    },
    en: {
      what: "Enables continuous position wrap (withPositionWrap).",
      why: "Lets a turret take the shortest path across 0°/360°.",
      typical: "true for turret",
    },
  },
  "subsystems.*.closedLoop.smartMotion": {
    pt: {
      what: "Ativa perfil trapezoidal MotionMagic / SmartMotion no controlador.",
      why: "Gera movimentos suaves com velocidade e aceleração limitadas.",
      typical: "true (wrist/hood/elevator)",
    },
    en: {
      what: "Enables MotionMagic / SmartMotion profiled control.",
      why: "Produces smooth trajectories bounded by max velocity and acceleration.",
      typical: "true (wrist/hood/elevator)",
    },
  },
  "subsystems.*.closedLoop.smartMotion.maxVelRps": {
    pt: {
      what: "Velocidade máxima do perfil SmartMotion (RPS).",
      why: "Limita a velocidade de cruzeiro do mecanismo durante o movimento.",
      typical: "2 – 40 RPS",
    },
    en: {
      what: "Maximum SmartMotion cruise velocity (RPS).",
      why: "Caps mechanism travel speed during profiled moves.",
      typical: "2 – 40 RPS",
    },
  },
  "subsystems.*.closedLoop.smartMotion.maxAccelRpss": {
    pt: {
      what: "Aceleração máxima do perfil SmartMotion (RPS²).",
      why: "Controla a suavidade de partida e parada para evitar trancos.",
      typical: "5 – 80 RPS²",
    },
    en: {
      what: "Maximum SmartMotion acceleration (RPS²).",
      why: "Controls ramp smoothness to avoid mechanical shock.",
      typical: "5 – 80 RPS²",
    },
  },
  "subsystems.*.closedLoop.smartMotion.allowedError": {
    pt: {
      what: "Tolerância de erro aceita pelo perfil SmartMotion.",
      why: "Evita micro-correções contínuas quando o mecanismo já chegou perto do alvo.",
      typical: "1.0° ou 0.1 rot",
    },
    en: {
      what: "Allowed closed-loop error tolerance for SmartMotion.",
      why: "Prevents hunting once the mechanism is close enough to target.",
      typical: "1.0° or 0.1 rot",
    },
  },

  // Follower
  "subsystems.*.motor.follower.enabled": {
    pt: {
      what: "Adiciona um segundo motor seguindo o motor principal.",
      why: "Usado em elevadores ou shooters com dois motores acoplados mecanicamente.",
      typical: "false",
    },
    en: {
      what: "Adds a second motor following the leader motor.",
      why: "Used on dual-motor elevators or flywheels.",
      typical: "false",
    },
  },
  "subsystems.*.motor.follower.canId": {
    pt: {
      what: "ID CAN único do motor seguidor.",
      why: "Configura o segundo controlador para espelhar os comandos do líder.",
      typical: "15",
    },
    en: {
      what: "Unique CAN ID of the follower motor.",
      why: "Configures the second controller to mirror the leader.",
      typical: "15",
    },
  },
  "subsystems.*.motor.follower.inverted": {
    pt: {
      what: "Define se o seguidor gira em sentido oposto ao líder.",
      why: "Marque quando os motores ficam montados face a face.",
      typical: "false",
    },
    en: {
      what: "Sets whether the follower spins opposite to the leader.",
      why: "Enable when motors are mounted facing each other.",
      typical: "false",
    },
  },

  // Protection & Self-test
  "subsystems.*.protection.stallReversalEnabled": {
    pt: {
      what: "Reversão automática ao detectar travamento (withStallReversal).",
      why: "Desentope peças presas no roller ou indexer sem queimar o motor.",
      typical: "true para indexer",
    },
    en: {
      what: "Automatic reversal when a jam/stall is detected (withStallReversal).",
      why: "Clears jammed game pieces in rollers or indexers automatically.",
      typical: "true for indexer",
    },
  },
  "subsystems.*.protection.stallCurrentAmps": {
    pt: {
      what: "Corrente mínima para considerar que o mecanismo travou (A).",
      why: "Acima desse valor pelo tempo configurado, o Ciprix dispara a proteção.",
      typical: "30 – 35 A",
    },
    en: {
      what: "Current threshold to detect a stall (A).",
      why: "Exceeding this current for the stall duration triggers reversal.",
      typical: "30 – 35 A",
    },
  },
  "subsystems.*.protection.stallTimeSec": {
    pt: {
      what: "Tempo contínuo acima da corrente de stall antes de agir (s).",
      why: "Ignora picos normais de partida e reage apenas a travamentos reais.",
      typical: "0.25 – 0.4 s",
    },
    en: {
      what: "Continuous time above stall current before reacting (s).",
      why: "Filters normal startup current spikes and catches real jams.",
      typical: "0.25 – 0.4 s",
    },
  },
  "subsystems.*.protection.reverseTimeSec": {
    pt: {
      what: "Duração do pulso de reversão após um stall (s).",
      why: "Tempo suficiente para liberar a peça presa antes de retomar.",
      typical: "0.25 – 0.35 s",
    },
    en: {
      what: "Duration of the un-jam reversal pulse (s).",
      why: "Long enough to eject/free the jammed piece.",
      typical: "0.25 – 0.35 s",
    },
  },
  "subsystems.*.protection.reverseOutput": {
    pt: {
      what: "Intensidade da reversão aplicada no un-jam (0 a 1, sempre positiva).",
      why: "O Ciprix inverte o sinal automaticamente; valor negativo gera erro de validação.",
      typical: "0.3",
    },
    en: {
      what: "Reversal intensity during un-jam (0 to 1, always positive).",
      why: "Ciprix inverts direction internally; negative values fail validation.",
      typical: "0.3",
    },
  },
  "subsystems.*.protection.currentWarningAmps": {
    pt: {
      what: "Limite de alerta de corrente no Driver Station / logs (A).",
      why: "Avisa a equipe sobre esforço anormal antes de atingir o stall; 0 desativa.",
      typical: "35 A (ou 0)",
    },
    en: {
      what: "Current warning threshold for logs and Driver Station (A).",
      why: "Warns the team before hitting full stall; 0 disables.",
      typical: "35 A (or 0)",
    },
  },
  "subsystems.*.protection.openLoopRampSec": {
    pt: {
      what: "Tempo de rampa de 0% a 100% no modo aberto (s).",
      why: "Suaviza partidas bruscas e reduz picos de corrente na bateria; 0 desativa.",
      typical: "0.1 s (ou 0)",
    },
    en: {
      what: "Open-loop ramp time from 0% to 100% (s).",
      why: "Softens sudden starts and lowers battery current spikes; 0 disables.",
      typical: "0.1 s (or 0)",
    },
  },
  "subsystems.*.selfTest.enabled": {
    pt: {
      what: "Gera comando de Pit Self-Test publicado no SmartDashboard.",
      why: "Permite validar rapidamente no pit se o motor gira no sentido e velocidade esperados.",
      typical: "true",
    },
    en: {
      what: "Generates a Pit Self-Test command on SmartDashboard.",
      why: "Quickly verifies motor direction and minimum speed in the pits.",
      typical: "true",
    },
  },
  "subsystems.*.selfTest.output": {
    pt: {
      what: "Percentual de saída aplicado durante o Self-Test (-1 a 1).",
      why: "Movimenta o mecanismo brevemente em baixa potência para checagem segura.",
      typical: "0.3",
    },
    en: {
      what: "Percent output applied during Self-Test (-1 to 1).",
      why: "Runs the mechanism briefly at low power for safe pit verification.",
      typical: "0.3",
    },
  },
  "subsystems.*.selfTest.minVelocityRps": {
    pt: {
      what: "Velocidade mínima esperada no Self-Test (RPS).",
      why: "O teste falha se o encoder não atingir essa rotação.",
      typical: "5 RPS",
    },
    en: {
      what: "Minimum expected velocity during Self-Test (RPS).",
      why: "Self-test fails if the encoder does not reach this speed.",
      typical: "5 RPS",
    },
  },

  // FSM
  "subsystems.*.fsm.initialState": {
    pt: {
      what: "Estado em que a FSM inicia ao ligar o robô.",
      why: "Define o comportamento seguro inicial antes de qualquer requisição.",
      typical: "IDLE ou STOPPED",
    },
    en: {
      what: "State the FSM starts in at boot.",
      why: "Sets safe initial behavior before any request arrives.",
      typical: "IDLE or STOPPED",
    },
  },
  "subsystems.*.fsm.initialRequest": {
    pt: {
      what: "Requisição padrão quando ninguém comanda o subsistema.",
      why: "Usada como fallback no SuperStructure e inicialização da FSM.",
      typical: "STOP",
    },
    en: {
      what: "Default request when nothing else commands the subsystem.",
      why: "Used as fallback in SuperStructure and FSM boot.",
      typical: "STOP",
    },
  },
  "subsystems.*.fsm.securityState": {
    pt: {
      what: "Estado de segurança para onde a FSM vai quando um timeout expira.",
      why: "Obrigatório se algum estado usar timeoutAfterSec (ex.: RAMPING).",
      typical: "IDLE",
    },
    en: {
      what: "Fallback security state entered when a state's timeout expires.",
      why: "Required whenever any state configures timeoutAfterSec.",
      typical: "IDLE",
    },
  },
  "subsystems.*.fsm.states.*.name": {
    pt: {
      what: "Nome do estado Java (UPPER_SNAKE_CASE).",
      why: "Vira uma constante no enum <Subsystem>State e chave na FSM.",
      typical: "INTAKING",
    },
    en: {
      what: "Java state enum constant name (UPPER_SNAKE_CASE).",
      why: "Becomes a constant in <Subsystem>State and a key in the FSM.",
      typical: "INTAKING",
    },
  },
  "subsystems.*.fsm.states.*.actions.*.type": {
    pt: {
      what: "Tipo de comando de motor executado nesta ação.",
      why: "Escolhe entre parar, usar potência aberta, RPM ou posição/SmartMotion.",
      typical: "percentOutput / velocityRpm",
    },
    en: {
      what: "Motor control mode executed by this action.",
      why: "Chooses between stop, open-loop percent, RPM velocity, or position/SmartMotion.",
      typical: "percentOutput / velocityRpm",
    },
  },
  "subsystems.*.fsm.states.*.actions.*.when": {
    pt: {
      what: "Momento em que a ação executa (Ao entrar, Periódico 20ms ou Ao sair).",
      why: "Permite combinar múltiplos efeitos sem precisar criar estados extras.",
      typical: "enter / exit",
    },
    en: {
      what: "Timing when the action runs (On enter, Periodic 20ms, or On exit).",
      why: "Lets you compose multiple effects cleanly inside one state.",
      typical: "enter / exit",
    },
  },
  "subsystems.*.fsm.states.*.actions.*.constantName": {
    pt: {
      what: "Nome da constante Java criada em <Subsystem>Constants.",
      why: "Mantém os setpoints nomeados e ajustáveis em um só lugar.",
      typical: "INTAKE_OUTPUT",
    },
    en: {
      what: "Java constant name generated in <Subsystem>Constants.",
      why: "Keeps setpoints named and centralized.",
      typical: "INTAKE_OUTPUT",
    },
  },
  "subsystems.*.fsm.states.*.actions.*.value": {
    pt: {
      what: "Valor numérico do setpoint enviado ao motor nesse estado.",
      why: "Define potência (-1..1), RPM, graus ou rotações conforme o tipo da ação.",
      typical: "0.6 (pct) · 4500 (RPM)",
    },
    en: {
      what: "Numeric setpoint sent to the motor in this state.",
      why: "Sets duty cycle (-1..1), RPM, degrees, or rotations depending on action type.",
      typical: "0.6 (pct) · 4500 (RPM)",
    },
  },
  "subsystems.*.fsm.states.*.actions.*.ledSubsystemId": {
    pt: {
      what: "Subsistema de LEDs alvo desta ação.",
      why: "Conectado pelo RobotContainer via trigger inState(), mantendo os subsistemas desacoplados.",
      typical: "leds",
    },
    en: {
      what: "Target LED subsystem for this action.",
      why: "Wired inside RobotContainer via inState(), keeping subsystems decoupled.",
      typical: "leds",
    },
  },
  "subsystems.*.fsm.states.*.actions.*.pattern": {
    pt: {
      what: "Padrão visual ou háptico aplicado.",
      why: "Escolhe entre animações de LED ou ondas de vibração no controle Xbox.",
      typical: "blink / pulses",
    },
    en: {
      what: "Visual LED pattern or Xbox haptic waveform.",
      why: "Selects an LED animation or VibrateXboxController waveform.",
      typical: "blink / pulses",
    },
  },
  "subsystems.*.fsm.states.*.actions.*.colorHex": {
    pt: {
      what: "Cor principal em hexadecimal RGB.",
      why: "Define a cor visível na fita de LED durante esse estado.",
      typical: "#22c55e",
    },
    en: {
      what: "Primary RGB hex color.",
      why: "Sets the LED strip color active in this state.",
      typical: "#22c55e",
    },
  },
  "subsystems.*.fsm.states.*.actions.*.periodSec": {
    pt: {
      what: "Período completo do efeito em segundos.",
      why: "Controla a velocidade de blink, breathe, arco-íris ou barra.",
      typical: "0.5 s",
    },
    en: {
      what: "Full cycle period of the LED animation in seconds.",
      why: "Controls blink, breathe, rainbow, or progress speed.",
      typical: "0.5 s",
    },
  },
  "subsystems.*.fsm.states.*.actions.*.priority": {
    pt: {
      what: "Prioridade de arbitragem (0 a 100).",
      why: "Quando vários estados tentam usar o mesmo LED ou controle, vence a maior prioridade.",
      typical: "80 (alerta) · 20 (normal)",
    },
    en: {
      what: "Arbitration priority (0 to 100).",
      why: "Highest priority wins when multiple states request the same LED strip or controller.",
      typical: "80 (alert) · 20 (normal)",
    },
  },
  "subsystems.*.fsm.states.*.actions.*.key": {
    pt: {
      what: "Chave de telemetria AdvantageKit (Logger.recordOutput).",
      why: "Aparece organizada em <Subsystem>/<Chave> no AdvantageScope.",
      typical: "JamStatus",
    },
    en: {
      what: "AdvantageKit telemetry key for Logger.recordOutput.",
      why: "Logged under <Subsystem>/<Key> in AdvantageScope.",
      typical: "JamStatus",
    },
  },
  "subsystems.*.fsm.states.*.actions.*.level": {
    pt: {
      what: "Severidade do log e do PersistentAlert (INFO, WARNING, ERROR).",
      why: "Destaca avisos e falhas críticas na Driver Station.",
      typical: "warning / error",
    },
    en: {
      what: "Severity for telemetry log and PersistentAlert.",
      why: "Highlights warnings and critical faults on Driver Station.",
      typical: "warning / error",
    },
  },
  "subsystems.*.fsm.states.*.actions.*.message": {
    pt: {
      what: "Texto registrado no log e exibido no alerta da Driver Station.",
      why: "Dá contexto imediato durante testes no pit ou na partida.",
      typical: "Game piece jammed!",
    },
    en: {
      what: "Text message logged and shown in Driver Station alerts.",
      why: "Provides immediate context during pit testing or matches.",
      typical: "Game piece jammed!",
    },
  },
  "subsystems.*.fsm.states.*.actions.*.controller": {
    pt: {
      what: "Qual controle Xbox deve vibrar (Piloto, Copiloto ou Ambos).",
      why: "Evita distrair quem não precisa daquele feedback tátil.",
      typical: "pilot / both",
    },
    en: {
      what: "Which Xbox controller receives haptic rumble.",
      why: "Targets only the driver who needs that feedback.",
      typical: "pilot / both",
    },
  },
  "subsystems.*.fsm.states.*.actions.*.intensity": {
    pt: {
      what: "Força de vibração de 0.0 a 1.0.",
      why: "Define o motor pesado/amplitude do VibrateXboxController.",
      typical: "0.8",
    },
    en: {
      what: "Vibration intensity from 0.0 to 1.0.",
      why: "Sets amplitude for VibrateXboxController.",
      typical: "0.8",
    },
  },
  "subsystems.*.fsm.states.*.actions.*.seconds": {
    pt: {
      what: "Duração do padrão de vibração em segundos.",
      why: "Deve ser curta e coerente com a duração esperada do estado.",
      typical: "0.4 s",
    },
    en: {
      what: "Rumble duration in seconds.",
      why: "Keep short and aligned with expected state duration.",
      typical: "0.4 s",
    },
  },
  "subsystems.*.fsm.states.*.actions.*.pulseCount": {
    pt: {
      what: "Número de pulsos no padrão Pulses.",
      why: "Ex.: 2 pulsos curtos confirmam captura de peça.",
      typical: "2",
    },
    en: {
      what: "Number of pulses for the Pulses pattern.",
      why: "E.g. 2 crisp pulses confirm game-piece acquisition.",
      typical: "2",
    },
  },
  "subsystems.*.fsm.states.*.regularTimeSec.min": {
    pt: {
      what: "Tempo mínimo esperado no estado (Ciprix regularTime).",
      why: "Ajuda a detectar transições prematuras anormais.",
      typical: "0.1 s",
    },
    en: {
      what: "Expected minimum dwell time (Ciprix regularTime).",
      why: "Detects abnormally early state exits.",
      typical: "0.1 s",
    },
  },
  "subsystems.*.fsm.states.*.regularTimeSec.max": {
    pt: {
      what: "Tempo máximo esperado no estado antes de alerta (Ciprix regularTime).",
      why: "Útil para monitorar estados que não deveriam demorar muito.",
      typical: "2.0 s",
    },
    en: {
      what: "Expected maximum dwell time before warning (Ciprix regularTime).",
      why: "Monitors states that should finish quickly.",
      typical: "2.0 s",
    },
  },
  "subsystems.*.leds.driver": {
    pt: {
      what: "Driver físico da fita de LEDs: AddressableLED (PWM roboRIO) ou CTRE CANdle (CAN).",
      why: "Define o código Java e se o Phoenix 6 é incluído para LEDs.",
      typical: "addressableLed / candle",
    },
    en: {
      what: "Physical LED controller: WPILib AddressableLED (PWM) or CTRE CANdle (CAN).",
      why: "Controls generated Java driver and Phoenix 6 dependency.",
      typical: "addressableLed / candle",
    },
  },
  "subsystems.*.leds.pwmPort": {
    pt: {
      what: "Porta PWM da roboRIO (0 a 9) ligada ao fio de sinal da fita.",
      why: "Cada barra de LEDs PWM precisa de uma porta exclusiva.",
      typical: "0",
    },
    en: {
      what: "roboRIO PWM port (0 to 9) wired to LED data line.",
      why: "Each PWM LED strip requires a unique PWM port.",
      typical: "0",
    },
  },
  "subsystems.*.leds.ledCount": {
    pt: {
      what: "Quantidade total de LEDs endereçáveis.",
      why: "Dimensiona o AddressableLEDBuffer ou o intervalo do CANdle.",
      typical: "30 a 120",
    },
    en: {
      what: "Total number of addressable LEDs.",
      why: "Sizes AddressableLEDBuffer or CANdle range.",
      typical: "30 to 120",
    },
  },
  "subsystems.*.leds.canId": {
    pt: {
      what: "ID CAN do módulo CTRE CANdle.",
      why: "Deve ser único no barramento CAN selecionado.",
      typical: "30",
    },
    en: {
      what: "CAN ID of the CTRE CANdle.",
      why: "Must be unique on its CAN bus.",
      typical: "30",
    },
  },
  "subsystems.*.leds.canBus": {
    pt: {
      what: "Nome do barramento CAN do CANdle (vazio = rio).",
      why: "Permite usar o barramento CANivore se o CANdle estiver nele.",
      typical: "rio ou canivore",
    },
    en: {
      what: "CAN bus name for CANdle (empty = rio).",
      why: "Allows placing CANdle on a CANivore loop.",
      typical: "rio or canivore",
    },
  },
  "subsystems.*.sensors.*.name": {
    pt: {
      what: "Nome do sensor de presença usado no código Java (camelCase).",
      why: "Gera o campo inputs.<nome> e o método is<Nome>Triggered().",
      typical: "hasPiece",
    },
    en: {
      what: "Presence sensor name used in Java getters/inputs.",
      why: "Generates inputs.<name> and is<Name>Triggered().",
      typical: "hasPiece",
    },
  },
  "subsystems.*.sensors.*.type": {
    pt: {
      what: "Tipo do sensor: Beam Break DIO, CTRE CANrange ou LaserCAN.",
      why: "LaserCAN adiciona automaticamente a vendordep libgrapplefrc2026.json.",
      typical: "dio / canrange / lasercan",
    },
    en: {
      what: "Sensor hardware type: DIO Beam Break, CTRE CANrange, or LaserCAN.",
      why: "LaserCAN automatically includes libgrapplefrc2026.json vendordep.",
      typical: "dio / canrange / lasercan",
    },
  },
  "subsystems.*.sensors.*.channel": {
    pt: {
      what: "Porta DIO da roboRIO (0 a 25).",
      why: "Conecta sensores digitais como beam break ou limit switch.",
      typical: "0",
    },
    en: {
      what: "roboRIO DIO channel (0 to 25).",
      why: "Connects digital beam breaks or limit switches.",
      typical: "0",
    },
  },
  "subsystems.*.sensors.*.inverted": {
    pt: {
      what: "Inverte o booleano lido do canal DIO.",
      why: "Sensores NPN/active-low ficam false quando detectam peça.",
      typical: "true (NPN)",
    },
    en: {
      what: "Inverts boolean reading from the DIO channel.",
      why: "Active-low/NPN beam breaks read false when blocked.",
      typical: "true (NPN)",
    },
  },
  "subsystems.*.sensors.*.canId": {
    pt: {
      what: "ID CAN do sensor CANrange ou LaserCAN.",
      why: "Não pode colidir com motores ou outros dispositivos CAN.",
      typical: "20",
    },
    en: {
      what: "CAN ID of the CANrange or LaserCAN.",
      why: "Must not collide with motors or other CAN devices.",
      typical: "20",
    },
  },
  "subsystems.*.sensors.*.canBus": {
    pt: {
      what: "Barramento CAN do CANrange (vazio = rio).",
      why: "Use o mesmo nome configurado no Tuner X.",
      typical: "canivore",
    },
    en: {
      what: "CAN bus name for CANrange (empty = rio).",
      why: "Match the bus configured in Phoenix Tuner X.",
      typical: "canivore",
    },
  },
  "subsystems.*.sensors.*.thresholdMeters": {
    pt: {
      what: "Distância máxima em metros para considerar peça presente no CANrange.",
      why: "Abaixo ou igual a esse valor, o sensor retorna true.",
      typical: "0.20 m",
    },
    en: {
      what: "Max distance in meters for CANrange detection.",
      why: "Readings <= threshold return true.",
      typical: "0.20 m",
    },
  },
  "subsystems.*.sensors.*.thresholdMm": {
    pt: {
      what: "Distância máxima em milímetros para o LaserCAN detectar peça.",
      why: "Apenas medições válidas <= limiar ativam o gatilho.",
      typical: "150 mm",
    },
    en: {
      what: "Max distance in millimeters for LaserCAN detection.",
      why: "Valid measurements <= threshold trigger true.",
      typical: "150 mm",
    },
  },
  "subsystems.*.fsm.states.*.timeoutAfterSec": {
    pt: {
      what: "Tempo máximo neste estado antes de cair para o Security State (s).",
      why: "Evita que o mecanismo fique travado em estados transitórios como RAMPING.",
      typical: "3.0 s",
    },
    en: {
      what: "Max time allowed in this state before falling back to Security State (s).",
      why: "Prevents getting stuck in transient states like RAMPING.",
      typical: "3.0 s",
    },
  },
  "subsystems.*.fsm.requests.*": {
    pt: {
      what: "Nome da requisição do subsistema (UPPER_SNAKE_CASE).",
      why: "Gera o enum <Subsystem>Request e comandos @AutoCommandFactory.",
      typical: "INTAKE",
    },
    en: {
      what: "Subsystem request enum name (UPPER_SNAKE_CASE).",
      why: "Generates <Subsystem>Request and @AutoCommandFactory commands.",
      typical: "INTAKE",
    },
  },
  "subsystems.*.fsm.bindings.*": {
    pt: {
      what: "Ligação bindRequest(request, entryState, goalState, ...intermediários).",
      why: "Diz ao Ciprix em qual estado entrar e qual estado confirma atGoal().",
      typical: "SHOOT: RAMPING → READY",
    },
    en: {
      what: "bindRequest(request, entryState, goalState, ...intermediates) mapping.",
      why: "Tells Ciprix which state to enter and which goal state satisfies atGoal().",
      typical: "SHOOT: RAMPING → READY",
    },
  },

  // Utility buttons
  "btn.templates": {
    pt: {
      what: "Seletor de modelos prontos do projeto.",
      why: "Troca rapidamente entre Skeleton, Competition ou Projeto em Branco.",
      typical: "Skeleton / Competition",
    },
    en: {
      what: "Project template selector.",
      why: "Quickly switches between Skeleton, Competition, or Blank Project.",
      typical: "Skeleton / Competition",
    },
  },
  "btn.checklist": {
    pt: {
      what: "Lista de erros e avisos do projeto.",
      why: "Clique em qualquer item para pular direto até o campo correspondente.",
      typical: "0 erros",
    },
    en: {
      what: "Project validation errors and warnings.",
      why: "Click any item to jump straight to the corresponding field.",
      typical: "0 errors",
    },
  },
  "btn.save_json": {
    pt: {
      what: "Baixa o arquivo ciprix-project.json.",
      why: "Permite salvar, versionar ou compartilhar a configuração do robô.",
      typical: "ciprix-project.json",
    },
    en: {
      what: "Downloads ciprix-project.json.",
      why: "Lets you save, version, or share the robot configuration.",
      typical: "ciprix-project.json",
    },
  },
  "btn.load_json": {
    pt: {
      what: "Abre um arquivo ciprix-project.json salvo.",
      why: "Restaura um projeto existente diretamente no editor.",
      typical: "ciprix-project.json",
    },
    en: {
      what: "Opens a saved ciprix-project.json file.",
      why: "Restores an existing project into the editor.",
      typical: "ciprix-project.json",
    },
  },
  "btn.export_zip": {
    pt: {
      what: "Gera e baixa o projeto WPILib completo em .zip.",
      why: "Empacota Java, build.gradle, vendordeps e ciprix-project.json prontos para compilar.",
      typical: "robot.zip",
    },
    en: {
      what: "Generates and downloads the full WPILib project as .zip.",
      why: "Packages Java, build.gradle, vendordeps, and ciprix-project.json ready to build.",
      typical: "robot.zip",
    },
  },
  "btn.pit_card": {
    pt: {
      what: "Exporta o mapa visual do controle Xbox como imagem PNG.",
      why: "Gera um cartão pronto para imprimir ou deixar na Driver Station durante os jogos no pit e na arena.",
      typical: "pilot-pit-card.png",
    },
    en: {
      what: "Exports the visual Xbox controller layout as a PNG image.",
      why: "Creates a printable driver reference card to keep at the Driver Station during matches.",
      typical: "pilot-pit-card.png",
    },
  },
  "superstructure.stateEffects.*.*": {
    pt: {
      what: "Efeitos globais (LEDs, Log/Alerta, Rumble) disparados quando a SuperStructure entra ou sai deste RobotState.",
      why: "Permite coordenar feedback visual e tátil do robô inteiro sem acoplar subsistemas.",
      typical: "LED verde + rumble leve",
    },
    en: {
      what: "Global effects (LEDs, Log/Alert, Rumble) triggered when SuperStructure enters or exits this RobotState.",
      why: "Coordinates robot-wide visual/haptic feedback without coupling subsystems.",
      typical: "Green LED + light confirm",
    },
  },
  "controls.pilotPriority.*.source": {
    pt: {
      what: "Origem do gatilho na fila de prioridade do Piloto: Botão Xbox ou Sensor.",
      why: "Permite automações reativas quando um sensor detecta peça ou limite.",
      typical: "button / sensor",
    },
    en: {
      what: "Trigger source in Pilot priority list: Xbox Button or Presence Sensor.",
      why: "Enables reactive automation when a sensor detects a game piece.",
      typical: "button / sensor",
    },
  },
  "controls.pilotPriority.*.triggerThreshold": {
    pt: {
      what: "Porcentagem mínima (0.05 a 1.0) para acionar LT ou RT como botão.",
      why: "Passa um double para leftTrigger(double) / rightTrigger(double) na WPILib.",
      typical: "0.25 (25%) ou 0.50 (50%)",
    },
    en: {
      what: "Minimum press percentage (0.05 to 1.0) to activate LT or RT.",
      why: "Passes a double threshold to WPILib leftTrigger(double) / rightTrigger(double).",
      typical: "0.25 (25%) or 0.50 (50%)",
    },
  },
  "controls.copilotOverrides.*.triggerThreshold": {
    pt: {
      what: "Porcentagem mínima (0.05 a 1.0) para acionar LT ou RT no controle do Copiloto.",
      why: "Ajusta sensibilidade do gatilho em copilot.leftTrigger(double) / rightTrigger(double).",
      typical: "0.50 (50%)",
    },
    en: {
      what: "Minimum press percentage (0.05 to 1.0) to trigger Copilot LT or RT.",
      why: "Tunes trigger sensitivity passed to copilot.leftTrigger(double) / rightTrigger(double).",
      typical: "0.50 (50%)",
    },
  },
  "drivetrain.enabled": {
    pt: {
      what: "Ativa a geração completa do subsistema Drive (tração do robô).",
      why: "Gera Drive.java implementando DriveContext, DriveAccelerationLimits, telemetria AdvantageKit e binding dos sticks no RobotContainer.",
      typical: "Ativado para o código completo do robô",
    },
    en: {
      what: "Enables full generation of the Drive subsystem.",
      why: "Generates Drive.java implementing DriveContext, DriveAccelerationLimits, AdvantageKit logging, and Xbox stick bindings in RobotContainer.",
      typical: "Enabled for complete robot code",
    },
  },
  "drivetrain.type": {
    pt: {
      what: "Arquitetura do chassi e stack de software da tração.",
      why: "Define quais arquivos IO, vendordeps e configurações JSON serão gerados.",
      typical: "ctre_swerve / yagsl / akit_swerve / differential / mecanum",
    },
    en: {
      what: "Chassis architecture and drivetrain software stack.",
      why: "Determines generated IO files, vendordeps, and JSON configs.",
      typical: "ctre_swerve / yagsl / akit_swerve / differential / mecanum",
    },
  },
  "drivetrain.motorVendor": {
    pt: {
      what: "Controlador de motor usado nos módulos ou lados do chassi.",
      why: "Seleciona ModuleIOTalonFX (Kraken/Falcon), ModuleIOSparkMax (NEO) ou ModuleIOTalonSRX.",
      typical: "talonfx / sparkmax",
    },
    en: {
      what: "Motor controller vendor used on drive/steer motors.",
      why: "Selects ModuleIOTalonFX (Kraken/Falcon), ModuleIOSparkMax (NEO), or ModuleIOTalonSRX.",
      typical: "talonfx / sparkmax",
    },
  },
  "drivetrain.canBus": {
    pt: {
      what: "Barramento CAN principal do drivetrain (\"rio\" ou nome do CANivore).",
      why: "Agrupa dispositivos do chassi e evita conflitos de ID entre barramentos.",
      typical: "\"rio\" ou \"canivore\"",
    },
    en: {
      what: "Primary CAN bus for drivetrain devices (\"rio\" or CANivore name).",
      why: "Targets the right CAN bus and prevents cross-bus ID collisions.",
      typical: "\"rio\" or \"canivore\"",
    },
  },
  "drivetrain.gyro.type": {
    pt: {
      what: "Sensor giroscópio usado para odometria e Field-Oriented Drive.",
      why: "Seleciona GyroIOPigeon2, GyroIONavX (Studica) ou GyroIOADIS16470.",
      typical: "pigeon2 / navx / adis16470",
    },
    en: {
      what: "Gyroscope sensor used for odometry and Field-Oriented Drive.",
      why: "Selects GyroIOPigeon2, GyroIONavX (Studica), or GyroIOADIS16470.",
      typical: "pigeon2 / navx / adis16470",
    },
  },
  "drivetrain.gyro.canId": {
    pt: {
      what: "ID CAN do Pigeon 2 (0–62).",
      why: "Identifica o giroscópio na rede CAN; não pode colidir com motores nem outros módulos.",
      typical: "0 ou 13",
    },
    en: {
      what: "CAN ID of the Pigeon 2 (0–62).",
      why: "Addresses the gyro on the CAN bus; must not collide with motors or encoders.",
      typical: "0 or 13",
    },
  },
  "drivetrain.gyro.canBus": {
    pt: {
      what: "Barramento CAN do Pigeon 2 (ex: \"rio\" ou \"canivore\").",
      why: "Deixe igual ao canBus do swerve se o Pigeon estiver ligado no mesmo CANivore.",
      typical: "\"rio\" ou \"canivore\"",
    },
    en: {
      what: "CAN bus name for the Pigeon 2 (e.g. \"rio\" or \"canivore\").",
      why: "Match the drivetrain canBus if wired to the same CANivore.",
      typical: "\"rio\" or \"canivore\"",
    },
  },
  "drivetrain.maxSpeedMps": {
    pt: {
      what: "Velocidade linear máxima teórica/desejada do robô em m/s.",
      why: "Retornada por DriveContext.getMaxSpeed() e usada na escala do joystick e ThrottleMap.",
      typical: "4.5 m/s (SDS MK4i L2)",
    },
    en: {
      what: "Maximum linear speed of the drivetrain in m/s.",
      why: "Exposed via DriveContext.getMaxSpeed() and used for teleop scaling and ThrottleMap.",
      typical: "4.5 m/s (SDS MK4i L2)",
    },
  },
  "drivetrain.maxAngularSpeedRadPerSec": {
    pt: {
      what: "Velocidade angular máxima de giro do robô em rad/s.",
      why: "Retornada por DriveContext.getMaxAngularSpeed() e limite do ManualRotation.",
      typical: "10.0 rad/s",
    },
    en: {
      what: "Maximum angular velocity of the drivetrain in rad/s.",
      why: "Exposed via DriveContext.getMaxAngularSpeed() and ManualRotation ceiling.",
      typical: "10.0 rad/s",
    },
  },
  "drivetrain.maxLinearAccelMps2": {
    pt: {
      what: "Aceleração linear máxima em m/s² (DriveAccelerationLimits).",
      why: "Limita arrancadas bruscas para evitar deslizar rodas, cair peças ou puxar corrente demais.",
      typical: "8.0 – 12.0 m/s²",
    },
    en: {
      what: "Maximum linear acceleration in m/s² (DriveAccelerationLimits).",
      why: "Prevents wheel slip, tipping, and brownouts during sudden stick inputs.",
      typical: "8.0 – 12.0 m/s²",
    },
  },
  "drivetrain.maxAngularAccelRadPerSec2": {
    pt: {
      what: "Aceleração angular máxima em rad/s².",
      why: "Suaviza comandos de rotação via DriveAccelerationLimits.getMaxAngularAcceleration().",
      typical: "20.0 rad/s²",
    },
    en: {
      what: "Maximum angular acceleration in rad/s².",
      why: "Smooths rotational commands via DriveAccelerationLimits.getMaxAngularAcceleration().",
      typical: "20.0 rad/s²",
    },
  },
  "drivetrain.wheelDiameterMeters": {
    pt: {
      what: "Diâmetro externo da roda em metros.",
      why: "Essencial para converter rotações do motor em metros percorridos na odometria.",
      typical: "0.1016 m (4 in) / 0.1524 m (6 in)",
    },
    en: {
      what: "Outer wheel diameter in meters.",
      why: "Converts motor rotations into accurate linear distance for odometry.",
      typical: "0.1016 m (4 in) / 0.1524 m (6 in)",
    },
  },
  "drivetrain.driveGearRatio": {
    pt: {
      what: "Redução total da transmissão de tração (motor : roda).",
      why: "Ajusta conversão de velocidade/posição e cálculo de odometria.",
      typical: "6.75 (MK4i L2) · 4.71 (MAXSwerve)",
    },
    en: {
      what: "Drive gear reduction ratio (motor : wheel).",
      why: "Calibrates linear velocity scaling and odometry distance.",
      typical: "6.75 (MK4i L2) · 4.71 (MAXSwerve)",
    },
  },
  "drivetrain.steerGearRatio": {
    pt: {
      what: "Redução do motor de direção/azimuth em módulos swerve.",
      why: "Usado quando a direção lê encoder relativo ou faz homing inicial.",
      typical: "21.43 (MK4i) · 12.8 (MK4)",
    },
    en: {
      what: "Steer/azimuth gear ratio for swerve modules.",
      why: "Used for azimuth PID control and relative encoder fallback.",
      typical: "21.43 (MK4i) · 12.8 (MK4)",
    },
  },
  "drivetrain.trackWidthMeters": {
    pt: {
      what: "Distância centro-a-centro entre as rodas esquerda e direita (metros).",
      why: "Define a cinemática SwerveDriveKinematics / DifferentialDriveKinematics.",
      typical: "0.55 m (~21.6 in)",
    },
    en: {
      what: "Center-to-center distance between left and right wheels (meters).",
      why: "Configures SwerveDriveKinematics or DifferentialDriveKinematics geometry.",
      typical: "0.55 m (~21.6 in)",
    },
  },
  "drivetrain.wheelBaseMeters": {
    pt: {
      what: "Distância centro-a-centro entre as rodas da frente e de trás (metros).",
      why: "Define as posições front-back dos módulos na cinemática swerve/mecanum.",
      typical: "0.55 m (~21.6 in)",
    },
    en: {
      what: "Center-to-center distance between front and back wheels (meters).",
      why: "Defines front-back module offsets in swerve/mecanum kinematics.",
      typical: "0.55 m (~21.6 in)",
    },
  },
  "drivetrain.currentLimitAmps": {
    pt: {
      what: "Limite de corrente de estator por motor da tração (Amperes).",
      why: "Protege bateria contra brownout e evita superaquecimento dos motores.",
      typical: "60 A (Kraken) · 40 A (NEO)",
    },
    en: {
      what: "Stator current limit per drive motor (Amps).",
      why: "Protects battery voltage against brownouts and motors from overheating.",
      typical: "60 A (Kraken) · 40 A (NEO)",
    },
  },
  "drivetrain.fieldOrientedDefault": {
    pt: {
      what: "Inicia o robô em modo Field-Oriented (referenciado à arena).",
      why: "Frente no joystick sempre empurra o robô para longe da Driver Station.",
      typical: "Ativado (true)",
    },
    en: {
      what: "Starts teleop in Field-Oriented drive mode.",
      why: "Pushing forward on the stick always drives away from the Driver Station wall.",
      typical: "Enabled (true)",
    },
  },
  "drivetrain.assistants.throttleMap": {
    pt: {
      what: "Aplica org.ciprix.util.drivetrain.ThrottleMapModifier no joystick.",
      why: "Mantém direção suave em manobras lentas sem perder velocidade máxima no fim do curso.",
      typical: "Ativado",
    },
    en: {
      what: "Applies Ciprix ThrottleMapModifier to translation inputs.",
      why: "Gives fine low-speed precision while preserving full top speed at full stick deflection.",
      typical: "Enabled",
    },
  },
  "drivetrain.assistants.headingStickRotation": {
    pt: {
      what: "Usa HeadingStickRotation do Ciprix no stick direito.",
      why: "O ângulo empurrado no stick direito vira o ângulo alvo absoluto do chassi.",
      typical: "Opcional (alternativa ao giro tradicional)",
    },
    en: {
      what: "Uses Ciprix HeadingStickRotation on the right thumbstick.",
      why: "Pointing the right stick aims the robot chassis toward that field heading automatically.",
      typical: "Optional (alternative to rate rotation)",
    },
  },
  "drivetrain.assistants.pidRotation": {
    pt: {
      what: "Mantém o heading atual com PIDRotation quando o piloto não gira.",
      why: "Corrige desvios de tração ou colisões leves automaticamente.",
      typical: "Ativado",
    },
    en: {
      what: "Holds heading using Ciprix PIDRotation when rotation stick is neutral.",
      why: "Automatically resists wheel scrub and light bumps during straight driving.",
      typical: "Enabled",
    },
  },
  "drivetrain.assistants.rotKp": {
    pt: {
      what: "Ganho proporcional (kP) passado a PIDRotation.setDefaultGains.",
      why: "Controla quão forte o robô corrige erro angular.",
      typical: "4.0",
    },
    en: {
      what: "Proportional gain (kP) passed to PIDRotation.setDefaultGains.",
      why: "Controls how aggressively heading error is corrected.",
      typical: "4.0",
    },
  },
  "drivetrain.assistants.rotKi": {
    pt: {
      what: "Ganho integral (kI) de PIDRotation.",
      why: "Quase sempre 0.0 para evitar overshoot em giros rápidos.",
      typical: "0.0",
    },
    en: {
      what: "Integral gain (kI) for PIDRotation.",
      why: "Usually 0.0 to avoid rotational overshoot.",
      typical: "0.0",
    },
  },
  "drivetrain.assistants.rotKd": {
    pt: {
      what: "Ganho derivativo (kD) de PIDRotation.",
      why: "Amortece oscilações ao chegar no ângulo alvo.",
      typical: "0.2",
    },
    en: {
      what: "Derivative gain (kD) for PIDRotation.",
      why: "Dampens oscillation when settling on target heading.",
      typical: "0.2",
    },
  },
  "drivetrain.assistants.accelerationLimits": {
    pt: {
      what: "Ativa DriveAccelerationLimits (rampa de vx, vy e omega a 50Hz).",
      why: "Reduz patinagem em arranques e protege caixa de redução.",
      typical: "Ativado",
    },
    en: {
      what: "Enables DriveAccelerationLimits slew-rate limiting on vx, vy, and omega.",
      why: "Reduces wheel slip on rapid stick reversals and protects gearboxes.",
      typical: "Enabled",
    },
  },
  "drivetrain.controls.resetGyroButton": {
    pt: {
      what: "Botão do controle do Piloto que chama drive.zeroHeading().",
      why: "Permite zerar a frente do robô na arena a qualquer momento.",
      typical: "start / back / y",
    },
    en: {
      what: "Pilot Xbox button bound to drive.zeroHeading().",
      why: "Lets the driver re-zero field-oriented forward direction on the fly.",
      typical: "start / back / y",
    },
  },
  "drivetrain.controls.toggleFieldOrientedButton": {
    pt: {
      what: "Botão do Piloto que alterna entre Field-Oriented e Robot-Oriented.",
      why: "Útil para manobras alinhadas ao chassi perto do reef/parede ou se o gyro falhar.",
      typical: "back / Opcional",
    },
    en: {
      what: "Pilot Xbox button that toggles Field-Oriented vs Robot-Oriented mode.",
      why: "Helpful for robot-relative lining up or as gyro fallback.",
      typical: "back / Optional",
    },
  },
  "drivetrain.modules.*.driveCanId": {
    pt: {
      what: "ID CAN do motor de tração deste módulo swerve (0–62).",
      why: "Deve ser único no barramento CAN configurado.",
      typical: "1, 4, 7, 10",
    },
    en: {
      what: "CAN ID of this module's drive motor (0–62).",
      why: "Must be unique on the configured CAN bus.",
      typical: "1, 4, 7, 10",
    },
  },
  "drivetrain.modules.*.steerCanId": {
    pt: {
      what: "ID CAN do motor de direção deste módulo swerve (0–62).",
      why: "Deve ser único no barramento CAN configurado.",
      typical: "2, 5, 8, 11",
    },
    en: {
      what: "CAN ID of this module's steer motor (0–62).",
      why: "Must be unique on the configured CAN bus.",
      typical: "2, 5, 8, 11",
    },
  },
  "drivetrain.modules.*.encoderCanId": {
    pt: {
      what: "ID CAN do CANcoder / encoder absoluto do módulo (0–62).",
      why: "Fornece ângulo absoluto da roda no boot sem precisar zerar manualmente.",
      typical: "3, 6, 9, 12",
    },
    en: {
      what: "CAN ID of the module's CANcoder / absolute encoder (0–62).",
      why: "Provides absolute wheel angle on boot without manual zeroing.",
      typical: "3, 6, 9, 12",
    },
  },
  "drivetrain.modules.*.encoderOffsetRot": {
    pt: {
      what: "Offset magnético do encoder em rotações (-1.0 a 1.0).",
      why: "Alinha o zero lógico com todas as rodas apontando retas para a frente.",
      typical: "Lido no Phoenix Tuner X / REV Hardware Client",
    },
    en: {
      what: "Magnetic encoder zero offset in rotations (-1.0 to 1.0).",
      why: "Aligns the software zero with all wheels pointing straight forward.",
      typical: "Measured in Phoenix Tuner X / REV Hardware Client",
    },
  },
  "drivetrain.modules.*.driveInverted": {
    pt: {
      what: "Inverte sentido do motor de tração deste módulo.",
      why: "Corrige módulos montados espelhados entre esquerda e direita.",
      typical: "false / true conforme montagem",
    },
    en: {
      what: "Inverts the drive motor direction on this module.",
      why: "Corrects mirrored left/right swerve module orientation.",
      typical: "false / true per hardware side",
    },
  },
  "drivetrain.modules.*.steerInverted": {
    pt: {
      what: "Inverte sentido do motor de direção deste módulo.",
      why: "Deve girar positivamente no sentido anti-horário visto de cima (CCW+).",
      typical: "true (MK4i com falcon/kraken)",
    },
    en: {
      what: "Inverts the steer motor direction on this module.",
      why: "Steer positive rotation must be Counter-Clockwise when viewed from above.",
      typical: "true (SDS MK4i)",
    },
  },
  "drivetrain.differential.leftLeaderId": {
    pt: {
      what: "ID CAN do motor líder do lado esquerdo (tank drive).",
      why: "Comanda o lado esquerdo e lê odometria via encoder integrado.",
      typical: "1",
    },
    en: {
      what: "CAN ID of the left side leader motor (tank drive).",
      why: "Commands left drivetrain output and reads wheel odometry.",
      typical: "1",
    },
  },
  "drivetrain.differential.leftFollowerId": {
    pt: {
      what: "ID CAN do motor follower esquerdo (opcional).",
      why: "Espelha o líder esquerdo por hardware na gearbox CIM/NEO/Kraken.",
      typical: "2",
    },
    en: {
      what: "CAN ID of the optional left follower motor.",
      why: "Mirrors the left leader motor in hardware on dual-motor gearboxes.",
      typical: "2",
    },
  },
  "drivetrain.differential.rightLeaderId": {
    pt: {
      what: "ID CAN do motor líder do lado direito (tank drive).",
      why: "Comanda o lado direito e lê odometria via encoder integrado.",
      typical: "3",
    },
    en: {
      what: "CAN ID of the right side leader motor (tank drive).",
      why: "Commands right drivetrain output and reads wheel odometry.",
      typical: "3",
    },
  },
  "drivetrain.differential.rightFollowerId": {
    pt: {
      what: "ID CAN do motor follower direito (opcional).",
      why: "Espelha o líder direito por hardware.",
      typical: "4",
    },
    en: {
      what: "CAN ID of the optional right follower motor.",
      why: "Mirrors the right leader motor in hardware.",
      typical: "4",
    },
  },
  "drivetrain.differential.leftInverted": {
    pt: {
      what: "Inverte o lado esquerdo do tank drive.",
      why: "Garante que frente positiva ande para frente nos dois lados.",
      typical: "false",
    },
    en: {
      what: "Inverts the left side motors of the differential drive.",
      why: "Ensures positive speed drives both sides forward.",
      typical: "false",
    },
  },
  "drivetrain.differential.rightInverted": {
    pt: {
      what: "Inverte o lado direito do tank drive.",
      why: "Em maioria dos chassis espelhados, um lado precisa estar invertido.",
      typical: "true",
    },
    en: {
      what: "Inverts the right side motors of the differential drive.",
      why: "On most mirrored chassis, one side must be inverted to drive straight.",
      typical: "true",
    },
  },
  "drivetrain.vision.enabled": {
    pt: {
      what: "Ativa fusão de câmera(s) Limelight via org.ciprix.vision.AprilTagVision.",
      why: "Corrige drift da odometria usando AprilTags oficiais da temporada 2026 (k2026RebuiltWelded).",
      typical: "Ativado quando há Limelight no robô",
    },
    en: {
      what: "Enables Limelight camera pose fusion via Ciprix AprilTagVision.",
      why: "Corrects odometry drift against the official 2026 AprilTag field layout.",
      typical: "Enabled when using Limelight cameras",
    },
  },
  "drivetrain.vision.cameras.*.name": {
    pt: {
      what: "Nome lógico da câmera usado nos logs AdvantageKit (Vision/<Nome>).",
      why: "Facilita distinguir câmera frontal/traseira no AdvantageScope.",
      typical: "Front / Back",
    },
    en: {
      what: "Logical camera label used in AdvantageKit logs (Vision/<Name>).",
      why: "Makes multiple cameras easy to tell apart in AdvantageScope.",
      typical: "Front / Back",
    },
  },
  "drivetrain.vision.cameras.*.ntName": {
    pt: {
      what: "Hostname/tabela NetworkTables configurada na interface web da Limelight.",
      why: "Passado ao construtor VisionIOLimelight(\"<ntName>\", drive::getRotation).",
      typical: "limelight-front / limelight",
    },
    en: {
      what: "NetworkTables hostname configured in the Limelight web UI.",
      why: "Passed to VisionIOLimelight(\"<ntName>\", drive::getRotation).",
      typical: "limelight-front / limelight",
    },
  },
  "drivetrain.vision.cameras.*.stdDevFactor": {
    pt: {
      what: "Multiplicador de confiança/desvio padrão da câmera na fusão (menor = mais confiança).",
      why: "Câmeras mais estáveis podem usar 1.0; câmeras mais ruidosas usam 1.5–3.0.",
      typical: "1.0",
    },
    en: {
      what: "Trust multiplier (std dev factor) for pose estimation (lower = higher trust).",
      why: "Well-calibrated cameras use 1.0; noisier angles use 1.5–3.0.",
      typical: "1.0",
    },
  },
  "drivetrain.antiTipping.enabled": {
    pt: {
      what: "Ativa a proteção AntiTipping / AntiTippingAccel do Ciprix usando Pitch/Roll e aceleração do IMU.",
      why: "Recomendação: programe e teste todo o robô primeiro em quadra antes de ligar, para evitar correções erradas caso IMU ou CG estejam descalibrados.",
      typical: "false no início · true após testar direção e IMU",
    },
    en: {
      what: "Enables Ciprix AntiTipping / AntiTippingAccel protection using IMU tilt and acceleration.",
      why: "Recommendation: program and field-test the robot first before enabling so inverted IMU axes or uncalibrated CG do not trigger unwanted recovery.",
      typical: "false initially · true after drive & IMU check",
    },
  },
  "drivetrain.antiTipping.mode": {
    pt: {
      what: "Estratégia Anti-Tipping do Ciprix: AntiTippingAccel (preventivo + limite dinâmico de aceleração) ou AntiTipping (proporcional simples).",
      why: "AntiTippingAccel avalia risco usando centro de gravidade e aceleração antes de tombar; o modo simples só reage ao ângulo.",
      typical: "accel",
    },
    en: {
      what: "Ciprix Anti-Tipping strategy: AntiTippingAccel (preventative + dynamic accel limits) or AntiTipping (simple proportional).",
      why: "AntiTippingAccel estimates tipping risk from IMU accel and CG before tip-over; simple mode only reacts to tilt degrees.",
      typical: "accel",
    },
  },
  "drivetrain.antiTipping.tippingThresholdDeg": {
    pt: {
      what: "Ângulo mínimo de inclinação (Pitch ou Roll em graus) para disparar correção ativa.",
      why: "Evita correção sobre pequenas folgas ou irregularidades no carpete enquanto protege contra tombamento real.",
      typical: "10.0°",
    },
    en: {
      what: "Tilt threshold (Pitch/Roll degrees) to trigger active recovery correction.",
      why: "Avoids nuisance triggers over carpet seams while catching real tip-overs.",
      typical: "10.0°",
    },
  },
  "drivetrain.antiTipping.maxCorrectionSpeedMps": {
    pt: {
      what: "Velocidade linear máxima (m/s) da reação Anti-Tipping na direção da queda.",
      why: "Limita o tranco de recuperação para manter o controle previsível para o piloto.",
      typical: "2.0 m/s",
    },
    en: {
      what: "Maximum recovery speed (m/s) driven toward the low side during a tip.",
      why: "Caps recovery speed so stabilization stays controllable for the driver.",
      typical: "2.0 m/s",
    },
  },
  "drivetrain.antiTipping.kP": {
    pt: {
      what: "Ganho proporcional kP da recuperação (m/s por grau de inclinação).",
      why: "Define o quanto de velocidade corretiva é somado por grau além do limiar.",
      typical: "0.20",
    },
    en: {
      what: "Proportional recovery gain kP (m/s per tilt degree).",
      why: "Scales corrective chassis velocity per degree of inclination.",
      typical: "0.20",
    },
  },
  "drivetrain.antiTipping.comHeightMeters": {
    pt: {
      what: "Altura estimada do centro de massa (CG) acima das rodas em metros.",
      why: "Usado pelo AntiTippingAccel para calcular risco por aceleração lateral/longitudinal.",
      typical: "0.25 m",
    },
    en: {
      what: "Estimated center of mass (CoM) height in meters.",
      why: "Used by AntiTippingAccel to weight acceleration tipping risk.",
      typical: "0.25 m",
    },
  },
  "drivetrain.antiTipping.dynamicAccelLimits": {
    pt: {
      what: "Permite que o AntiTippingAccel reduza dinamicamente DriveAccelerationLimits antes do tombamento.",
      why: "Suaviza arrancadas e freadas quando o risco sobe, evitando que o robô chegue a inclinar.",
      typical: "true",
    },
    en: {
      what: "Lets AntiTippingAccel dynamically scale DriveAccelerationLimits before tip-over.",
      why: "Prevents tipping proactively by smoothing linear/angular acceleration under high risk.",
      typical: "true",
    },
  },

  // Arena Zones
  "zones.*.name": {
    pt: {
      what: "Identificador Java da zona (UPPER_SNAKE_CASE) no enum ZoneId.",
      why: "Nomeia a zona em FieldZones.java, logs AdvantageKit e automações.",
      typical: "COLLECT_ZONE",
    },
    en: {
      what: "Java enum identifier for the zone (UPPER_SNAKE_CASE) in ZoneId.",
      why: "Identifies the zone in FieldZones.java, AdvantageKit logs, and automations.",
      typical: "COLLECT_ZONE",
    },
  },
  "zones.*.type": {
    pt: {
      what: "Comportamento da zona (Gatilho, Sucção, Ímã de Borda, Repulsão, Velocidade ou Proibida).",
      why: "Define se a zona dispara automações, atrai a borda do bumper até a área (Ímã de Borda), aplica ZoneSuction/Repulsion ou limita velocidade.",
      typical: "magnet / trigger / speedLimit",
    },
    en: {
      what: "Zone behavior (Trigger, Suction, Border Magnet, Repulsion, Speed Limit, or Forbidden).",
      why: "Chooses whether the zone triggers automations, pulls robot bumper borders flush (Border Magnet), applies suction/repulsion, or caps speed.",
      typical: "magnet / trigger / speedLimit",
    },
  },
  "zones.*.magnetSide": {
    pt: {
      what: "Lado da borda/bumper do robô que será atraído pela zona (Qualquer, Frente, Costas, Esquerda ou Direita).",
      why: "Permite encostar só a frente do intake no Outpost ou a traseira no Hub.",
      typical: "front / any",
    },
    en: {
      what: "Robot bumper border side pulled toward the zone (Any, Front, Back, Left, or Right).",
      why: "Lets you align only the intake front or shooter side flush against an arena area.",
      typical: "front / any",
    },
  },
  "zones.*.magnetRangeMeters": {
    pt: {
      what: "Distância máxima de alcance (em metros) entre a borda do robô e a borda da zona para o ímã atuar.",
      why: "Controla a partir de quão perto o bumper começa a puxar suavemente até encostar.",
      typical: "0.45 m – 0.60 m",
    },
    en: {
      what: "Maximum capture range (meters) from robot bumper edge to zone perimeter.",
      why: "Controls how close the bumper needs to be before magnetic snap engagement.",
      typical: "0.45 m – 0.60 m",
    },
  },
  "zones.*.magnetButton": {
    pt: {
      what: "Botão opcional do controle do piloto para ativar esse ímã só enquanto segurado.",
      why: "Se vazio, atrai sempre que a borda do robô entrar no alcance; se mapeado, evita puxões acidentais ao passar perto.",
      typical: "(Sempre ativo) ou LB / X",
    },
    en: {
      what: "Optional pilot button to gate this border magnet while held.",
      why: "When empty, pulls whenever bumper enters range; when mapped, prevents accidental pulls when driving past.",
      typical: "(Always active) or LB / X",
    },
  },
  "zones.*.mirror": {
    pt: {
      what: "Eixos espelhados para a aliança vermelha via AllianceFlipUtil.",
      why: "Permite desenhar só no lado azul e gerar automaticamente o equivalente vermelho.",
      typical: "both (rotação 180°) ou x",
    },
    en: {
      what: "Axes mirrored for the Red alliance via AllianceFlipUtil.",
      why: "Lets you draw once on the Blue side and auto-mirror for Red.",
      typical: "both (180° flip) or x",
    },
  },
  "zones.*.strength": {
    pt: {
      what: "Intensidade do ZoneSuctionModifier ou ZoneRepulsionModifier (0.05 a 1.0).",
      why: "Controla quanta força de puxão ou empurrão é somada ao stick do piloto.",
      typical: "0.4 (sucção) · 0.6–0.9 (repulsão)",
    },
    en: {
      what: "Strength of ZoneSuctionModifier or ZoneRepulsionModifier (0.05 to 1.0).",
      why: "Controls how much pull or push vector is added to the driver stick.",
      typical: "0.4 (suction) · 0.6–0.9 (repulsion)",
    },
  },
  "zones.*.speedFactor": {
    pt: {
      what: "Multiplicador de velocidade dentro da zona (0.1 a 1.0).",
      why: "Reduz a velocidade máxima do robô ao entrar em áreas apertadas ou de coleta.",
      typical: "0.5",
    },
    en: {
      what: "Translation speed multiplier inside the zone (0.1 to 1.0).",
      why: "Caps robot speed while inside tight scoring or intake areas.",
      typical: "0.5",
    },
  },
  "zones.*.alertMessage": {
    pt: {
      what: "Texto exibido no PersistentAlert quando o robô entra em zona proibida.",
      why: "Alerta o piloto e a equipe no dashboard e fica registrado no AdvantageKit.",
      typical: "Robô em zona proibida!",
    },
    en: {
      what: "Message shown via PersistentAlert when entering a forbidden zone.",
      why: "Alerts drivers on the dashboard and logs to AdvantageKit.",
      typical: "Robot entered forbidden zone!",
    },
  },
  "zones.*.shape.x1": {
    pt: {
      what: "Coordenada X do primeiro canto do retângulo em metros (origem azul).",
      why: "Define o limite horizontal esquerdo/inicial da zona no referencial WPILib.",
      typical: "1.0 m",
    },
    en: {
      what: "X coordinate of the first rectangle corner in meters (Blue origin).",
      why: "Sets the horizontal start bound in WPILib field coordinates.",
      typical: "1.0 m",
    },
  },
  "zones.*.shape.y1": {
    pt: {
      what: "Coordenada Y do primeiro canto do retângulo em metros (origem azul).",
      why: "Define o limite vertical inferior/inicial da zona no referencial WPILib.",
      typical: "1.0 m",
    },
    en: {
      what: "Y coordinate of the first rectangle corner in meters (Blue origin).",
      why: "Sets the vertical start bound in WPILib field coordinates.",
      typical: "1.0 m",
    },
  },
  "zones.*.shape.x2": {
    pt: {
      what: "Coordenada X do canto oposto do retângulo em metros.",
      why: "Define o limite horizontal final da zona retangular.",
      typical: "3.0 m",
    },
    en: {
      what: "X coordinate of the opposite rectangle corner in meters.",
      why: "Sets the horizontal end bound of the rectangular zone.",
      typical: "3.0 m",
    },
  },
  "zones.*.shape.y2": {
    pt: {
      what: "Coordenada Y do canto oposto do retângulo em metros.",
      why: "Define o limite vertical final da zona retangular.",
      typical: "3.0 m",
    },
    en: {
      what: "Y coordinate of the opposite rectangle corner in meters.",
      why: "Sets the vertical end bound of the rectangular zone.",
      typical: "3.0 m",
    },
  },
  "zones.*.shape.cx": {
    pt: {
      what: "Coordenada X do centro do círculo em metros.",
      why: "Posiciona o centro da Circle2d no campo WPILib.",
      typical: "4.0 m",
    },
    en: {
      what: "Circle center X coordinate in meters.",
      why: "Positions the Circle2d center in WPILib field coordinates.",
      typical: "4.0 m",
    },
  },
  "zones.*.shape.cy": {
    pt: {
      what: "Coordenada Y do centro do círculo em metros.",
      why: "Posiciona o centro da Circle2d no campo WPILib.",
      typical: "4.0 m",
    },
    en: {
      what: "Circle center Y coordinate in meters.",
      why: "Positions the Circle2d center in WPILib field coordinates.",
      typical: "4.0 m",
    },
  },
  "zones.*.shape.radius": {
    pt: {
      what: "Raio da zona circular em metros (mínimo 0,05 m).",
      why: "Define a distância do centro até a borda da Circle2d.",
      typical: "1.2 m",
    },
    en: {
      what: "Circular zone radius in meters (minimum 0.05 m).",
      why: "Sets the distance from center to boundary of Circle2d.",
      typical: "1.2 m",
    },
  },
  "autonomous.enabled": {
    pt: {
      what: "Ativa a geração do AutoBuilder (PathPlanner / Choreo) e AutonomousSetup.java.",
      why: "Permite selecionar rotinas autônomas no dashboard e ligar NamedCommands à SuperStructure.",
      typical: "Ativado (com Drivetrain)",
    },
    en: {
      what: "Enables PathPlanner / Choreo AutoBuilder and AutonomousSetup.java generation.",
      why: "Lets you pick autonomous routines on the dashboard and bind NamedCommands to SuperStructure.",
      typical: "Enabled (with Drivetrain)",
    },
  },
  "autonomous.chooserName": {
    pt: {
      what: "Nome base publicado no SmartDashboard/Shuffleboard para o seletor AutoEngine.",
      why: "Aparece como Auto_0 (ou N slots) no dashboard da Driver Station.",
      typical: "Auto",
    },
    en: {
      what: "Dashboard key prefix for Ciprix AutoEngine chooser.",
      why: "Published as Auto_0..N in SmartDashboard / Shuffleboard.",
      typical: "Auto",
    },
  },
  "autonomous.chooserSlots": {
    pt: {
      what: "Quantidade de seletores sequenciais no AutoEngine (1 a 5).",
      why: "Com 1 escolhe 1 rotina completa; com 2+ permite combinar partes em sequência no pré-jogo.",
      typical: "1 (simples) · 2–3 (modular)",
    },
    en: {
      what: "Number of sequential AutoEngine slots (1 to 5).",
      why: "Use 1 for single routines or 2+ to compose multi-part autos on the field.",
      typical: "1 (single) · 2–3 (composed)",
    },
  },
  "autonomous.defaultAutoId": {
    pt: {
      what: "Rotina marcada como padrão caso a equipe não mude o chooser no dashboard.",
      why: "Evita que o robô fique parado por esquecimento antes do início da partida.",
      typical: "Primeira rotina validada",
    },
    en: {
      what: "Default autonomous routine when no chooser override is made.",
      why: "Prevents sitting idle if drivers forget to pick an auto before a match.",
      typical: "Main reliable routine",
    },
  },
  "autonomous.useLocalADStarAK": {
    pt: {
      what: "Registra o pathfinder LocalADStarAK do Ciprix no PathPlanner.",
      why: "Garante replay determinístico no AdvantageKit mesmo usando pathfinding dinâmico.",
      typical: "Ativado",
    },
    en: {
      what: "Registers Ciprix LocalADStarAK pathfinder with PathPlanner.",
      why: "Preserves deterministic AdvantageKit log replay for dynamic pathfinding.",
      typical: "Enabled",
    },
  },
  "autonomous.keepAutomationsInAuto": {
    pt: {
      what: "Mantém gatilhos de sensor e zona ativos durante o período autônomo.",
      why: "Útil se você quer, por exemplo, coleta ou ejeção automática mesmo no autônomo.",
      typical: "Ativado",
    },
    en: {
      what: "Keeps sensor and zone automations active during autonomous.",
      why: "Allows automatic sensor/zone SuperStructure triggers alongside PathPlanner NamedCommands.",
      typical: "Enabled",
    },
  },
  "autonomous.generateSettingsJson": {
    pt: {
      what: "Gera automaticamente deploy/pathplanner/settings.json com massa, dimensões e módulos do Drivetrain.",
      why: "Permite abrir o projeto no app do PathPlanner já calibrado sem erro de RobotConfig.fromGUISettings().",
      typical: "Ativado",
    },
    en: {
      what: "Emits deploy/pathplanner/settings.json derived from Drivetrain dimensions and limits.",
      why: "Prevents RobotConfig.fromGUISettings() failures and pre-configures the PathPlanner GUI.",
      typical: "Enabled",
    },
  },
  "autonomous.translationPid.kP": {
    pt: {
      what: "Ganho proporcional (kP) para erro de posição X/Y no PathPlanner.",
      why: "Corrige desvios na trajetória do robô no plano do campo.",
      typical: "5.0",
    },
    en: {
      what: "Proportional gain (kP) for PathPlanner X/Y translation tracking.",
      why: "Corrects field-space position error along paths.",
      typical: "5.0",
    },
  },
  "autonomous.translationPid.kI": {
    pt: {
      what: "Ganho integral (kI) de translação no PathPlanner.",
      why: "Normalmente 0 para evitar overshoot; use apenas se houver erro estacionário.",
      typical: "0.0",
    },
    en: {
      what: "Integral gain (kI) for translation tracking.",
      why: "Usually 0 to prevent overshoot.",
      typical: "0.0",
    },
  },
  "autonomous.translationPid.kD": {
    pt: {
      what: "Ganho derivativo (kD) de translação no PathPlanner.",
      why: "Amortece oscilações ao frear ou fazer curvas rápidas.",
      typical: "0.0",
    },
    en: {
      what: "Derivative gain (kD) for translation tracking.",
      why: "Damps oscillation around high-speed turns.",
      typical: "0.0",
    },
  },
  "autonomous.rotationPid.kP": {
    pt: {
      what: "Ganho proporcional (kP) para manter o ângulo desejado no PathPlanner.",
      why: "Mantém a frente do robô apontada corretamente durante a rota.",
      typical: "5.0",
    },
    en: {
      what: "Proportional gain (kP) for PathPlanner heading tracking.",
      why: "Keeps robot heading aligned along the path.",
      typical: "5.0",
    },
  },
  "autonomous.rotationPid.kI": {
    pt: {
      what: "Ganho integral (kI) de rotação no PathPlanner.",
      why: "Normalmente 0.",
      typical: "0.0",
    },
    en: {
      what: "Integral gain (kI) for heading tracking.",
      why: "Usually 0.",
      typical: "0.0",
    },
  },
  "autonomous.rotationPid.kD": {
    pt: {
      what: "Ganho derivativo (kD) de rotação no PathPlanner.",
      why: "Suaviza a chegada ao ângulo alvo.",
      typical: "0.0",
    },
    en: {
      what: "Derivative gain (kD) for heading tracking.",
      why: "Damps heading settling.",
      typical: "0.0",
    },
  },
  "autonomous.namedCommands.*.name": {
    pt: {
      what: "Nome exato do evento/comando configurado no PathPlanner (Event Marker / Named Command).",
      why: "Registrado em NamedCommands.registerCommand antes de carregar os arquivos .auto.",
      typical: "IntakeOn",
    },
    en: {
      what: "Exact command name configured inside PathPlanner (.auto or event marker).",
      why: "Registered via NamedCommands.registerCommand before loading auto routines.",
      typical: "IntakeOn",
    },
  },
  "autonomous.namedCommands.*.request": {
    pt: {
      what: "RobotRequest da SuperStructure disparado quando o autônomo executa esse comando.",
      why: "Liga diretamente as rotas do PathPlanner à máquina de estados do robô.",
      typical: "INTAKE",
    },
    en: {
      what: "SuperStructure RobotRequest triggered when this NamedCommand runs.",
      why: "Connects PathPlanner paths directly to the robot state machine.",
      typical: "INTAKE",
    },
  },
  "autonomous.namedCommands.*.waitForGoal": {
    pt: {
      what: "Aguarda todos os subsistemas atingirem o alvo antes de concluir o comando.",
      why: "Desmarcado apenas dispara o pedido; marcado bloqueia um bloco sequencial até finalizar (ou timeout).",
      typical: "false (disparo) / true (posição)",
    },
    en: {
      what: "Waits until all subsystems reach their goals before finishing the command.",
      why: "Unchecked fires immediately; checked waits in sequences up to the timeout.",
      typical: "false (fire) / true (setpoint)",
    },
  },
  "autonomous.namedCommands.*.timeoutSec": {
    pt: {
      what: "Tempo máximo de espera (segundos) quando 'Esperar atGoal' está ativado.",
      why: "Impede que o autônomo trave caso algum mecanismo atrase para atingir o alvo.",
      typical: "2.5 s",
    },
    en: {
      what: "Timeout in seconds when waiting for atGoal().",
      why: "Prevents an auto routine from stalling if a mechanism is slow.",
      typical: "2.5 s",
    },
  },
  "autonomous.routines.*.name": {
    pt: {
      what: "Nome amigável exibido no seletor AutoEngine do dashboard.",
      why: "Facilita a escolha rápida pelos drivers antes da partida.",
      typical: "2 Peças Centro",
    },
    en: {
      what: "Friendly label shown in the dashboard AutoEngine chooser.",
      why: "Makes match selection clear for drivers.",
      typical: "2 Piece Center",
    },
  },
  "autonomous.routines.*.fileName": {
    pt: {
      what: "Nome do arquivo .auto (PathPlanner) ou .traj (Choreo) sem extensão.",
      why: "Passado para new PathPlannerAuto(...) ou new ChoreoAuto(...).",
      typical: "TwoPieceCenter",
    },
    en: {
      what: "Base filename of the .auto (PathPlanner) or .traj (Choreo) file without extension.",
      why: "Passed directly to new PathPlannerAuto(...) or new ChoreoAuto(...).",
      typical: "TwoPieceCenter",
    },
  },
  "autonomous.routines.*.source": {
    pt: {
      what: "Origem da rotina: arquivo .auto do PathPlanner ou trajetória .traj do Choreo.",
      why: "Define se o gerador instancia PathPlannerAuto ou ChoreoAuto (Ciprix).",
      typical: "pathplanner",
    },
    en: {
      what: "Routine format: PathPlanner .auto file or Choreo .traj trajectory.",
      why: "Selects PathPlannerAuto vs Ciprix ChoreoAuto in AutonomousSetup.",
      typical: "pathplanner",
    },
  },
};

export const REGISTERED_FIELD_PATHS = Object.keys(HELP_CATALOG);

export function normalizeFieldPath(path: string): string {
  if (HELP_CATALOG[path]) return path;

  const parts = path.split(".");
  if (parts[0] === "drivetrain") {
    if (parts[1] === "modules" && parts.length >= 4) {
      return `drivetrain.modules.*.${parts.slice(3).join(".")}`;
    }
    if (parts[1] === "vision" && parts[2] === "cameras" && parts.length >= 5) {
      return `drivetrain.vision.cameras.*.${parts.slice(4).join(".")}`;
    }
  }
  if (parts[0] === "subsystems" && parts.length >= 3) {
    if (parts[2] === "fsm") {
      if (parts[3] === "states" && parts.length >= 6) {
        if (parts[5] === "actions" && parts.length >= 8) {
          return `subsystems.*.fsm.states.*.actions.*.${parts.slice(7).join(".")}`;
        }
        return `subsystems.*.fsm.states.*.${parts.slice(5).join(".")}`;
      }
      if (parts[3] === "requests" && parts.length >= 5) {
        return "subsystems.*.fsm.requests.*";
      }
      if (parts[3] === "bindings" && parts.length >= 5) {
        return "subsystems.*.fsm.bindings.*";
      }
    }
    if (parts[2] === "sensors" && parts.length >= 5) {
      return `subsystems.*.sensors.*.${parts.slice(4).join(".")}`;
    }
    return `subsystems.*.${parts.slice(2).join(".")}`;
  }

  if (parts[0] === "superstructure" && parts[1] === "stateEffects" && parts.length >= 4) {
    const tail = parts.slice(4).join(".");
    const mapped = `subsystems.*.fsm.states.*.actions.*.${tail}`;
    if (tail && HELP_CATALOG[mapped]) return mapped;
    return "superstructure.stateEffects.*.*";
  }

  if (parts[0] === "controls" && parts.length >= 4) {
    if (parts[1] === "pilotPriority" || parts[1] === "copilotOverrides") {
      return `controls.${parts[1]}.*.${parts.slice(3).join(".")}`;
    }
  }

  if (parts[0] === "autonomous" && parts.length >= 4) {
    if (parts[1] === "namedCommands" || parts[1] === "routines") {
      return `autonomous.${parts[1]}.*.${parts.slice(3).join(".")}`;
    }
  }

  if (parts[0] === "zones" && parts.length >= 3) {
    return `zones.*.${parts.slice(2).join(".")}`;
  }

  return path;
}

export function getHelpEntry(pathOrId: string, locale: Locale): HelpEntry | undefined {
  const normalized = normalizeFieldPath(pathOrId);
  const entry = HELP_CATALOG[normalized];
  if (!entry) return undefined;
  return entry[locale] ?? entry.pt;
}
