# Contexto de Sessão — FIRST Studio

> Documento de retomada atualizado em **2026-11-27 (21:15)**. Leia este arquivo para ver o histórico completo — **Fases 1 a 7 concluídas** (polimentos opcionais no PathPlanner Visualizer listados na Fase 7).

---

## 1. Resumo e Estado Atual

- **Workspace:** `D:\FIRST Studio`
- **Repositório Git:** `https://github.com/LucasDiegoHD/FIRST-Studio` (branch `main`, último commit anterior: `255a6fc`; este commit traz toda a **Fase 6** + polimentos da **Arena** + **PathPlanner Visualizer**)
- **Autor / Créditos:** `LucasDiegoHD` (`https://github.com/LucasDiegoHD`)
- **Referência de UI original:** `D:\FGCLib Studio\FGCLibStudio` · Referência PathPlanner: `mjansen4857/pathplanner` (`2025.0`)
- **Alvo FRC:** **Ciprix `2026.3.0`** (WPILib 2026 + AdvantageKit + `@AutoCommandFactory`)
- **Stack:** Next.js `15.5.29`, React `19.1.0`, Tailwind CSS v4, TypeScript `5.8`, Zod `3.24` (`schemaVersion: 2`), JSZip `3.10`, Vitest `3.2.7`, `@xyflow/react` `13.0.3`, `prism-react-renderer` `2.4.1`, Radix UI, `lucide-react`.
- **Verificações mais recentes (pós-Fase 7 — Modo Tutorial):**
  - `.\node_modules\.bin\tsc.cmd --noEmit`: passou (`0` erros).
  - `.\node_modules\.bin\eslint.cmd src scripts`: passou (`0` erros, `0` avisos).
  - `.\node_modules\.bin\vitest.cmd run`: **9 arquivos, 55/55 testes passando** (`shortcuts`, `phase1`–`phase7`, `generator`).
- **Pendências de verificação em máquina com hardware/JDK/app:**
  - `./gradlew build` do Java gerado não rodou localmente (falta JDK 17+ / WPILib 2026 no `PATH`).
  - Deploy real no **roboRIO** via FIRST Studio Bridge (`USB`, `Wi-Fi`, `Ethernet`) ainda não testado com hardware real.
  - Abertura direta dos arquivos `.path` / `.auto` / `settings.json` gerados dentro do aplicativo desktop oficial do PathPlanner ainda não testada manualmente.

---

## 2. Task Inteira — Plano Completo (Fases 1 a 7)

> **Progresso geral:** **7 de 7 fases concluídas**. Polimentos opcionais futuros no PathPlanner Visualizer permanecem mapeados abaixo.

### ✅ Fase 1 — Base, Validação, Ajuda, Créditos & FSM Modular *(CONCLUÍDA — `f04c9e8`, `2d397b8`, `ba50eb6`, `227d30d`)*
- **Erros precisos por campo:** validador aponta aba, subsistema, estado, caminho do campo e foco/scroll direto ao erro (incluindo correção de limites de exemplo `-0.5` → `0.3`).
- **Catálogo de Dicas (`HELP_CATALOG`):** `<Field>` e `<Hint>` com explicações *o que é*, *por quê importa* e *valor típico* em `pt` e `en` (`src/lib/help/catalog.ts`), com teste automático (`phase1.test.ts`) garantindo zero campos sem ajuda; badges de valores padrão com `<Hint tone="warning" />` âmbar discreto.
- **Créditos & Cabeçalho Java:** página de Créditos no sidebar com perfil de `LucasDiegoHD`, e cabeçalho padrão nos arquivos Java gerados.
- **FSM modular & Controles:** `states-view.tsx` dividido em sub-abas (**Estados**, **Requisições**, **Ligações**), rename atômico com `Ctrl+Z`/`Ctrl+Y`, temas cromáticos por mecanismo, diff ao vivo no `CodeViewer`, atalhos de teclado (`Ctrl+K`, `Ctrl+D`, `Delete`), **Pit Card PNG** (`controls-tab.tsx`), botões `leftStick`/`rightStick` (`L3`/`R3`) e slider de limiar `%` (`0.05`–`1.0`) para gatilhos analógicos `LT`/`RT`.

### ✅ Fase 2 — Schema v2, Hardware, Ações Múltiplas, LEDs, Rumble & Sensores *(CONCLUÍDA — `f61fd6c`, `5805d0c`)*
- **Schema v2 & Migração (`src/lib/schema/migrations.ts`):** migra projetos `schemaVersion: 1` (`onEnter`/`onUpdate`) para `schemaVersion: 2` (`actions[]` tipadas por estado + `regularTime`).
- **Multi-ação por Estado:** um estado pode combinar ações de motor (`stop`, `percentOutput`, `velocityRpm`, `positionDeg/Rot`, `smartPositionDeg/Rot`), `leds`, `log`/`PersistentAlert` e `rumble`.
- **LEDs (`LedArbiter`):** tipo de subsistema `"leds"` suportando `AddressableLED` (porta PWM) e CTRE `CANdle` (ID CAN/bus), padrões `SOLID`, `BLINK`, `BREATHE`, `RAINBOW`, `PROGRESS_BAR`, `ALLIANCE` + efeitos globais por `RobotState` na `SuperStructure`.
- **Rumble sem Conflito (`RumbleArbiter`):** padrões `VibrateXboxController` (`continuous`, `pulses`, `zigZag`, `rampUp`, `lightConfirm`, `heavyWarning`), prévia visual + Gamepad API do Chrome, e validador detectando empate de prioridade entre estados simultâneos ou duração > `regularTime`.
- **Sensores de Presença (`src/lib/generator/sensors.ts`):** `sensors[]` por subsistema com tipos **DIO**, **CTRE CANrange** e **LaserCAN** (adicionando `libgrapplefrc2026.json` sob demanda). Gerados em `Inputs` (AutoLog + simulação), usados em transições locais, `SuperStructure`, e automações da fila do piloto (`whileTrue`, `onTrue`, `whileFalse`, `onFalse`).
- **Árvore de Exportação (`code-tab.tsx`):** painel lateral ampliado (`w-80`) e compactação de pastas com filho único (estilo VS Code/IntelliJ).

### ✅ Fase 3 — Pasta Local e Envio Direto ao Robô *(CONCLUÍDA — `929164c`, `8867590`)*
- **3.1 Pasta local (`src/lib/local-folder/`):**
  - Integração com File System Access API (`showDirectoryPicker`) no Chrome/Edge (escondida graciosamente em browsers sem suporte, mantendo `.zip`).
  - Handle persistido no IndexedDB, abertura de `ciprix-project.json`, plano de sincronização (`sync-plan.ts`) com diff por arquivo.
  - Manifesto `.firststudio/manifest.json` com hash SHA-256 para avisar antes de sobrescrever edições manuais da equipe.
  - Preservação automática de blocos `// FIRST-STUDIO:BEGIN custom <nome>` … `// FIRST-STUDIO:END` do disco durante toda regeneração.
- **3.2 FIRST Studio Bridge (`bridge/` + UI):**
  - Servidor Java standalone (`bridge/src/main/java/.../BridgeServer.java` + `bridge/install/`), escutando em `127.0.0.1`, código de pareamento e cabeçalho `Access-Control-Allow-Private-Network` exigido pelo Chrome.
  - Executa `gradlew build` / `deploy` / `simulateJava` usando JDK da WPILib com streaming de log ao vivo, detecção do roboRIO (`10.TE.AM.2` ou USB `172.22.11.2`) e cópia fallback em `~/FIRSTStudio/<projeto>` quando não há pasta conectada.
  - **Topbar (`studio-shell.tsx`):** botão dinâmico no lugar do antigo botão de `.zip` — mostra **"Enviar código"** quando o Bridge detecta roboRIO conectado e **"Robô não conectado"** quando offline (mantendo exportação `.zip` na aba **Exportar**).

### ✅ Fase 4 — Drivetrain & Visão *(CONCLUÍDA — `bd60c5d`)*
- **Schema & Presets (`src/lib/schema/ciprix-project.ts`, `src/lib/presets/drivetrain.ts`):** bloco opcional `project.drivetrain` separado de `subsystems[]`, com presets rápidos (`SDS MK4i L2`, `REV MAXSwerve`, `KitBot Tank`, `Mecanum`).
- **Importador Phoenix Tuner X (`src/lib/drivetrain/tuner-parser.ts`):** `parseTunerConstantsJava()` extrai IDs CAN de drive/steer/encoder, `encoderOffsetRot`, `kDriveGearRatio`, `kSteerGearRatio`, `kWheelRadius`, `kPigeonId`, `kCANBus`, `kSpeedAt12Volts` e inversão lateral (`kInvertLeftSide`/`kInvertRightSide`).
- **Gerador (`src/lib/generator/drivetrain/index.ts` & `src/lib/generator/core/robot-files.ts`):**
  - 5 bases: `ctre_swerve`, `yagsl` (emite JSONs em `src/main/deploy/swerve/`), `akit_swerve`, `differential` e `mecanum`.
  - Todas geram `subsystems/drive/Drive.java` implementando `org.ciprix.util.drivetrain.DriveContext` e `DriveAccelerationLimits`, logando `Drive/Pose` e `Drive/ChassisSpeeds` via AdvantageKit, com suporte a **Pigeon 2**, **NavX**, **ADIS16470**.
  - Integra assistentes do Ciprix: `ThrottleMapModifier`, `HeadingStickRotation`, `PIDRotation`, `DriveAccelerationLimits`.
  - Vendordeps FRC 2026 reais baixadas em `public/skeleton/vendordeps/`: `Studica-2026.0.0.json`, `yagsl-2026.4.1.json`, `ReduxLib.json`, `ThriftyLib.json` (além de `REVLib.json`, `Phoenix6-26.3.0.json`, etc.).
  - **Visão AprilTag opcional:** `AprilTagVision` + `VisionIOLimelight` + `VisionFilter` com `AprilTagFields.k2026RebuiltWelded` (e `new VisionIO() {}` no modo `REPLAY`) ligados automaticamente no `RobotContainer.java`, junto com sticks de direção, `zeroHeading` e `toggleFieldOriented`.
- **UI & Validação:** `DrivetrainPanel` (`src/components/studio/drivetrain-panel.tsx`), card/preview no `robot-flow-view.tsx`, card de sticks/botões no `controls-tab.tsx`, validação de colisões CAN e botões em `validator.ts`, e `HELP_CATALOG` completo em `catalog.ts`.

---

### ✅ Fase 5 — Zonas na Arena & Polimentos de UI *(CONCLUÍDA — `255a6fc` + atualizações)*
- **Editor Blueprint REBUILT 2026 (`src/components/studio/arena-tab.tsx`, `src/lib/arena/rebuilt-2026.ts`):** campo `16,54 m × 8,07 m` em metros WPILib com marcos REBUILT 2026 (Trenches, Bumps, Hubs octogonais, Towers, Depots, Outposts, Neutral Zone FUEL), ferramentas retângulo, círculo, polígono (com **fechamento magnético** a `0,55 m`), snap `0,05 m`, imagem de fundo opcional e presets REBUILT prontos.
- **5 Tipos de Zona & Gerador Java (`src/lib/generator/zones/index.ts`):** `trigger`, `suction` (`ZoneSuctionModifier`), `repulsion` (`ZoneRepulsionModifier`), `speedLimit` e `forbidden` (`ZoneRepulsionModifier` + `PersistentAlert`), espelhamento via `AllianceFlipUtil`, `FieldZones.java` + regras de zona na fila do piloto e `SuperStructure`.
- **Simulador Contínuo 60 FPS na Arena:** clique para dirigir (`driveTarget`), patrulha automática **`Testar Zonas`**, física contínua nas zonas (`speedLimit`, `suction`, `repulsion`, `forbidden`), painel **Telemetria ao Vivo · Zonas**, toolbar fixa sem pulo de layout e overlay flutuante para `PersistentAlert`.
- **Compactação & FSM Interativa:** UI enxuta de Drivetrain e construtor interativo de FSM na aba Estados & SuperStructure.

---

### ✅ Fase 6 — Autônomos, PathPlanner Visualizer & Choreo *(CONCLUÍDA — commit atual)*
- **`AutoBuilder`, `LocalADStarAK` & `PathplannerLib.json`:** `Drive.java` (`src/lib/generator/drivetrain/index.ts`) gera `AutoBuilder.configure(...)` nas 5 bases, `resetPose`, `driveRobotRelative` e `Pathfinding.setPathfinder(new LocalADStarAK())`.
- **`AutonomousSetup.java`, `settings.json`, `.auto` & `.path` `"2025.0"` (`src/lib/generator/autonomous/index.ts`):** registra `NamedCommands` ligados à `SuperStructureCommands.autoRequest(...)`, configura `AutoEngine` (`1–5` slots), suporta `PathPlannerAuto` e `ChoreoAuto`, além de gerar `deploy/pathplanner/settings.json`, `autos/*.auto` e `paths/*.path` (`version: "2025.0"`).
- **Motor Bézier & Trajetória PathPlanner (`src/lib/autonomous/pathplanner-engine.ts`):** port do `mjansen4857/pathplanner` com splines cúbicas C¹, perfilamento por curvatura e aceleração/desaceleração, interpolação cosseno da rotação holonômica, ângulos dos 4 módulos swerve, escala térmica de velocidade (`red → orange → yellow → green`) e detecção de saltos `>= 0,25 m` entre caminhos (`AutoPathBreak`).
- **PathPlanner Visualizer & Templates (`src/components/studio/autonomous-tab.tsx`, `src/components/studio/rebuilt-field-svg.tsx`, `src/lib/autonomous/templates.ts`, `src/lib/autonomous/pathplanner-parser.ts`):** 3 modos (`Trajetos (.path)`, `Rotinas (.auto)`, `Config & Código`), árvore retrátil no painel direito, seekbar animado `60 FPS` (`0.5× / 1× / 2×`), 4 modelos **REBUILT 2026**, leitura de pasta conectada e importação `.path` / `.auto` / `.traj`.

---

### ✅ Fase 7 — Modo Tutorial *(CONCLUÍDA — sessão atual)*
- **Roteiro & Validação (`src/lib/tutorial/steps.ts`):** 12 etapas guiadas (`project-team` → `drivetrain` → `subsystem-hardware` → `sensors` → `fsm-states` → `fsm-requests` → `fsm-bindings` → `superstructure` → `controls` → `zones` → `autonomous` → `export-deploy`) em `pt` e `en`, com *1. O que preencher*, *2. Por que isso importa* e *3. De onde tirar no robô*, bloqueio de avanço pelo validador da Fase 1 e persistência em `localStorage`.
- **Spotlight & Popover (`src/components/studio/tutorial-overlay.tsx`, `studio-shell.tsx`):** botão **Tutorial** no topo, máscara SVG spotlight sem bloquear interação nos campos destacados, `Popover` do `@radix-ui/react-popover` já instalado e alvos `data-tour` em todas as abas e no diálogo de projeto (`modal={!tutorialActive}`).
- **Polimentos opcionais futuros no PathPlanner Visualizer:** zonas de restrição (`constraintZones`), `pointTowardsZones`, `linkedName` entre waypoints, zoom/pan no SVG e prévia visual de trajetórias Choreo `.traj`.

---

## 3. Mapa de Arquivos Principais (Pós-Fase 6)

| Área | Caminho |
| --- | --- |
| Schema & Migrações | `src/lib/schema/ciprix-project.ts`, `src/lib/schema/migrations.ts` |
| Presets | `src/lib/presets/skeleton.ts`, `src/lib/presets/drivetrain.ts` |
| Validador & Catálogo de Ajuda | `src/lib/validator.ts`, `src/lib/help/catalog.ts`, `src/lib/i18n.ts` |
| Modo Tutorial (Fase 7) | `src/lib/tutorial/steps.ts`, `src/components/studio/tutorial-overlay.tsx` |
| Arena 2026 REBUILT & Autônomos | `src/lib/arena/rebuilt-2026.ts`, `src/lib/autonomous/pathplanner-engine.ts`, `src/lib/autonomous/pathplanner-parser.ts`, `src/lib/autonomous/templates.ts` |
| Parser Tuner X | `src/lib/drivetrain/tuner-parser.ts` |
| Geradores Java & JSON | `src/lib/generator/index.ts`, `src/lib/generator/core/robot-files.ts`, `src/lib/generator/drivetrain/index.ts`, `src/lib/generator/zones/index.ts`, `src/lib/generator/autonomous/index.ts`, `src/lib/generator/subsystems/roller.ts`, `src/lib/generator/sensors.ts`, `src/lib/generator/leds/index.ts` |
| Pasta Local (Fase 3.1) | `src/lib/local-folder/` (`handle`, `sync-plan.ts`, `manifest`, `custom` blocks) |
| Bridge Client & Server (Fase 3.2) | `src/lib/bridge/`, `src/components/studio/bridge-deploy-panel.tsx`, `bridge/` |
| UI Principal do Studio | `src/components/studio/studio-shell.tsx`, `robot-flow-view.tsx`, `drivetrain-panel.tsx`, `states-view.tsx`, `superstructure-tab.tsx`, `arena-tab.tsx`, `autonomous-tab.tsx`, `rebuilt-field-svg.tsx`, `controls-tab.tsx`, `code-tab.tsx` |
| Vendordeps 2026 | `public/skeleton/vendordeps/` (inclui `PathplannerLib.json`) |
| Testes Vitest | `src/lib/__tests__/` (`phase1`–`phase7`, `generator`, `shortcuts`) |

---

## 4. Regras Críticas do Ambiente & Pegadinhas Já Resolvidas

- **Espaço crítico no drive `C:`:** sempre redirecionar temporários e cache para `D:` e evitar `npx` (chamar `.\node_modules\.bin\next.cmd` direto):
  ```powershell
  $env:TEMP = "D:\.tmp"
  $env:TMP = "D:\.tmp"
  $env:npm_config_cache = "D:\.npm-cache"
  $env:NEXT_TELEMETRY_DISABLED = "1"
  ```
- **Windows PowerShell 5.1:** não aceita `&&`; usar quebras de linha com `if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }`.
- **GitHub push (`.github/workflows/ci.yml`):** token `gh` local não tem escopo `workflow`; sempre excluir do stage:
  ```powershell
  git add -A -- ":!.github/workflows/ci.yml"
  ```
- **Regra do teste `phase1.test.ts` (`HELP_CATALOG`):** todo `<Field path="...">` nos componentes precisa existir em `src/lib/help/catalog.ts` (`pt` e `en`) ou casar com `normalizeFieldPath()`. O scanner estático converte `${...}` em `*` e expande `${gain}` para todos de `["kP", "kI", "kD", "kS", "kV", "kA", "kG"]` — então **nunca** use variável como base dentro de `path={\`${base}.campo\`}` e prefira `<Field path="autonomous.translationPid.kP">` explícito em blocos PID sem feedforward (`kS`/`kV`/`kA`/`kG`).
- **APIs exatas do Ciprix `2026.3.0`:** ao iniciar as Fases 5 e 6, inspecionar os fontes/assinaturas reais do Ciprix (`D:\.tmp\ciprix-sources.jar` se ainda existir, ou pacote WPILib/Gradle cache) antes de gerar código Java (`Zone2d`, `AllianceFlipUtil`, `AutoEngine`, `LoggedSequentialDashboardChooser`, `LocalADStarAK`, `ChoreoAuto`).
- **Next dev vs Next build:** encerrar qualquer `next dev --port 3000` antes de rodar `npm run build` para evitar lock em `.next`.
- **Preferência de comunicação:** responder em português curto e direto (`ponytail` + `caveman`), com links clicáveis `file:///`.
