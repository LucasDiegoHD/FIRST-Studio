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
};

export const REGISTERED_FIELD_PATHS = Object.keys(HELP_CATALOG);

export function normalizeFieldPath(path: string): string {
  if (HELP_CATALOG[path]) return path;

  const parts = path.split(".");
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

  return path;
}

export function getHelpEntry(pathOrId: string, locale: Locale): HelpEntry | undefined {
  const normalized = normalizeFieldPath(pathOrId);
  const entry = HELP_CATALOG[normalized];
  if (!entry) return undefined;
  return entry[locale] ?? entry.pt;
}
