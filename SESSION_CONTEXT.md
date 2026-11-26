# Contexto de Sessão — FIRST Studio

> Documento de retomada atualizado em **2026-11-26 (01:08)**. Leia este arquivo no início da próxima sessão para continuar exatamente de onde paramos (pronto para iniciar a **Fase 5 — Zonas na arena**).

---

## 1. Resumo e Estado Atual

- **Workspace:** `D:\FIRST Studio`
- **Repositório Git:** `https://github.com/LucasDiegoHD/FIRST-Studio` (branch `main`, último commit de código: `bd60c5d`)
- **Autor / Créditos:** `LucasDiegoHD` (`https://github.com/LucasDiegoHD`)
- **Referência de UI original:** `D:\FGCLib Studio\FGCLibStudio`
- **Alvo FRC:** **Ciprix `2026.3.0`** (WPILib 2026 + AdvantageKit + `@AutoCommandFactory`)
- **Stack:** Next.js `15.5.29`, React `19.1.0`, Tailwind CSS v4, TypeScript `5.8`, Zod `3.24` (`schemaVersion: 2`), JSZip `3.10`, Vitest `3.2.7`, `@xyflow/react` `13.0.3`, `prism-react-renderer` `2.4.1`, Radix UI, `lucide-react`.
- **Verificações após a Fase 4 (`bd60c5d`):**
  - `npm run typecheck` (`tsc --noEmit`): passou (`0` erros).
  - `npm run lint` (`eslint src scripts`): passou (`0` erros, `0` avisos).
  - `npm test` (`vitest run`): **6 arquivos, 35/35 testes passando** (`shortcuts`, `phase1`, `phase2`, `phase3`, `phase4`, `generator`).
- **Pendências de verificação em máquina com hardware/JDK:**
  - `./gradlew build` do Java gerado não rodou localmente (esta máquina tem apenas Java 8 JRE no `PATH`; falta JDK 17+ / WPILib 2026).
  - Deploy real no **roboRIO** via FIRST Studio Bridge (`USB`, `Wi-Fi`, `Ethernet`) ainda não testado com hardware real.

---

## 2. Task Inteira — Plano Completo (Fases 1 a 7)

> **Progresso geral:** 4 de 7 fases concluídas e enviadas ao GitHub (`main`).

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

### ⏳ Fase 5 — Zonas na Arena *(PRÓXIMO PASSO)*
Depende do drivetrain (`project.drivetrain`), pois toda zona compara com a pose do robô. O Ciprix `2026.3.0` já fornece formas geométricas e modificadores (`Rectangle2d`, `Circle2d`, `Polygon2d`, `Zone2d`, `AllianceFlipUtil`, `ZoneSuctionModifier`, `ZoneRepulsionModifier`, `PersistentAlert` — **confirmar assinaturas exatas em `D:\.tmp\ciprix-sources.jar` ou javadoc antes de codar**).

- **5.1 Editor da Arena:**
  - Nova aba **Arena** com o campo visto de cima em **metros**, no referencial WPILib (origem `(0, 0)` no canto inferior esquerdo da aliança azul), usando `fieldLengthMeters` e `fieldWidthMeters` já presentes no projeto.
  - Permitir que a equipe carregue imagem de fundo do PathPlanner localmente (não embutir imagem oficial no repo por direitos autorais).
  - Ferramentas de desenho: retângulo (arrastar), círculo (centro + raio), polígono (clicar vértice a vértice), mover vértices, coordenadas digitáveis e encaixe (snap) em grade de `0,05 m` (SVG / canvas próprio ou `@xyflow/react`).
- **5.2 Tipos de Zona:**
  - **Gatilho (`trigger`):** dispara requisição ou condição na `SuperStructure` (`Zone2d` + `inZone` / `enteredZone` / `leftZone`).
  - **Sucção (`suction`):** puxa o robô para alinhamento (`ZoneSuctionModifier`).
  - **Repulsão (`repulsion`):** empurra o robô para fora (`ZoneRepulsionModifier`).
  - **Velocidade limitada (`speedLimit`):** reduz velocidade máxima dentro da zona (modificador de translação com fator).
  - **Proibida (`forbidden`):** repulsão forte + aviso (`ZoneRepulsionModifier` + `PersistentAlert`).
  - Cada zona tem opção de espelhar para a aliança vermelha (`X`, `Y` ou ambos, usando `AllianceFlipUtil`).
- **5.3 Automações e Código Java:**
  - Tabela de prioridade do piloto passa a aceitar três origens: **botão**, **sensor** e **zona**, podendo combinar condições com **E** (ex.: dentro de `COLLECT_ZONE` e sem peça → `INTAKE`). A ordem da tabela decide quem vence (botões acima das automações por padrão).
  - Gerar `FieldZones.java` com enum, formas e método `current(pose)`, logado a cada ciclo no AdvantageKit para visualização no AdvantageScope.

---

### ⏳ Fase 6 — Autônomos com PathPlanner / Choreo *(PENDENTE)*
Depende do drivetrain (`project.drivetrain`). A rota continua sendo desenhada no PathPlanner; o FIRST Studio cuida da ligação rota ↔ `SuperStructure`.
1. **Configurar o `AutoBuilder`:** gerar `AutoBuilder.configure(...)` no `Drive.java`, com PIDs de translação e rotação e `RobotConfig` lido de `deploy/pathplanner/settings.json`, incluindo espelhamento por aliança e `LocalADStarAK` do Ciprix para pathfinding com replay.
2. **Listar os autos:** com a pasta conectada (Fase 3), ler `src/main/deploy/pathplanner/autos/*.auto` e `paths/*.path`, listando os autos e os comandos nomeados usados por eles. Sem pasta conectada, permitir digitação manual.
3. **Ligar comandos nomeados (`NamedCommands`):** mapear `nomeNoPathPlanner` → `RobotRequest` (ex.: `IntakeOn` → `INTAKE`), com opção de esperar `atGoal` ou seguir sem esperar; gerar `NamedCommands.registerCommand(...)` antes de carregar os autos.
4. **Durante o autônomo:** `SuperStructure` recebe requisições dos autos em vez dos botões do piloto; automações por sensor e zona continuam valendo se a equipe deixar marcado.
5. **Escolha do auto:** seletor no dashboard usando `AutoEngine` e `LoggedSequentialDashboardChooser` do Ciprix (permitindo também compor auto juntando partes).
6. **Validação:** avisar sobre comando nomeado usado num `.auto` sem binding configurado, `RobotRequest` ligada que não existe mais e arquivo `.auto` não encontrado.
7. **Choreo:** suporte a trajetórias do Choreo via `ChoreoAuto` do Ciprix.

---

### ⏳ Fase 7 — Modo Tutorial *(PENDENTE — Fica por último porque percorre todas as telas)*
- **Funcionamento:** botão **Tutorial** no topo inicia um passo a passo guiado com spotlight (fundo escurecido + recorte no elemento destacado) e cartão em 3 partes:
  1. *O que preencher*
  2. *Por que isso importa*
  3. **De onde tirar o dado no robô** (ex.: ID CAN/firmware no Phoenix Tuner X ou REV Hardware Client; redução na gearbox/CAD; limites medidos no fim de curso; corrente na ficha técnica do motor; porta DIO no roboRIO).
- **Avanço automático & Persistência:** o botão *Próximo* só libera quando o campo fica válido pelo validador da Fase 1; progresso salvo para continuar depois; funciona começando do zero ou a partir do preset `skeleton`.
- **Roteiro completo:** projeto e equipe → drivetrain → primeiro subsistema (motor, ID CAN, relação, limites) → sensores → estados → requisições → ligações → SuperStructure → controles → zonas → autos → gerar e enviar.
- **Implementação:** `src/lib/tutorial/steps.ts` + atributos `data-tour="<id>"` nos componentes, reaproveitando `Popover` do Radix UI já instalado (sem depender de lib externa).

---

## 3. Mapa de Arquivos Principais (Pós-Fase 4)

| Área | Caminho |
| --- | --- |
| Schema & Migrações | `src/lib/schema/ciprix-project.ts`, `src/lib/schema/migrations.ts` |
| Presets | `src/lib/presets/skeleton.ts`, `src/lib/presets/drivetrain.ts` |
| Validador & Catálogo de Ajuda | `src/lib/validator.ts`, `src/lib/help/catalog.ts`, `src/lib/i18n.ts` |
| Parser Tuner X | `src/lib/drivetrain/tuner-parser.ts` |
| Geradores Java & JSON | `src/lib/generator/index.ts`, `src/lib/generator/core/robot-files.ts`, `src/lib/generator/drivetrain/index.ts`, `src/lib/generator/subsystems/roller.ts`, `src/lib/generator/sensors.ts`, `src/lib/generator/leds/index.ts` |
| Pasta Local (Fase 3.1) | `src/lib/local-folder/` (`handle`, `sync-plan.ts`, `manifest`, `custom` blocks) |
| Bridge Client & Server (Fase 3.2) | `src/lib/bridge/`, `src/components/studio/bridge-deploy-panel.tsx`, `bridge/` |
| UI Principal do Studio | `src/components/studio/studio-shell.tsx`, `robot-flow-view.tsx`, `drivetrain-panel.tsx`, `states-view.tsx`, `superstructure-tab.tsx`, `controls-tab.tsx`, `code-tab.tsx` |
| Vendordeps 2026 | `public/skeleton/vendordeps/` |
| Testes Vitest | `src/lib/__tests__/` (`phase1`, `phase2`, `phase3`, `phase4`, `generator`, `shortcuts`) |

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
- **Regra do teste `phase1.test.ts` (`HELP_CATALOG`):** todo `<Field path="...">` nos componentes precisa existir em `src/lib/help/catalog.ts` (`pt` e `en`) ou casar com `normalizeFieldPath()`. O scanner estático converte `${...}` em `*`, então **nunca** use variável como base dentro de `path={\`${base}.campo\`}` (sempre prefixo literal).
- **APIs exatas do Ciprix `2026.3.0`:** ao iniciar as Fases 5 e 6, inspecionar os fontes/assinaturas reais do Ciprix (`D:\.tmp\ciprix-sources.jar` se ainda existir, ou pacote WPILib/Gradle cache) antes de gerar código Java (`Zone2d`, `AllianceFlipUtil`, `AutoEngine`, `LoggedSequentialDashboardChooser`, `LocalADStarAK`, `ChoreoAuto`).
- **Next dev vs Next build:** encerrar qualquer `next dev --port 3000` antes de rodar `npm run build` para evitar lock em `.next`.
- **Preferência de comunicação:** responder em português curto e direto (`ponytail` + `caveman`), com links clicáveis `file:///`.
