# FIRST Studio: Plano de Arquitetura

Nov 23, 2026 · @Programadores Techmaker (Revisado para v1)

## Objetivo

O **FIRST Studio** é um aplicativo web que gera um projeto FRC completo no padrão **Ciprix (`2026.3.0`)** (WPILib + AdvantageKit + `@AutoCommandFactory`) a partir de um editor visual. Ele reaproveita apenas a casca de interface do FGCLibStudio (Next.js 15, Tailwind, shadcn/ui, `dnd-kit`, geradores modulares e i18n), mas troca integralmente o modelo e o alvo: em vez de FTC/FGCLib, gera um projeto WPILib com `Ciprix.json`, subsistemas `StateSubsystem`, `SuperStructure`, máquinas de estado e controles Xbox.

O resultado é um projeto Java pronto para compilar e fazer deploy sem edição manual. A equipe pode baixar o `.zip` direto no navegador ou enviar o código (via commit ou Pull Request) diretamente para o repositório GitHub do time.

## O que reaproveitar do FGCLibStudio

A estrutura limpa será construída em `D:\FIRST Studio` copiando seletivamente apenas a casca de UI de `D:\FGCLib Studio\FGCLibStudio`, com TypeScript e ESLint estritos habilitados:

| Parte do FGCLibStudio | Destino no FIRST Studio |
| --- | --- |
| Next.js 15, Tailwind, shadcn/ui, tema, PWA | Mantém, com identidade visual nova |
| i18n (`i18next`) | Mantém; começa com `pt` e `en` |
| Editor visual (`visual-editor`, `robot-canvas`, `config-panel`, `dnd-kit`) | Mantém o padrão e ganha abas novas (FSM estruturada, SuperStructure) |
| `useHistoryState` (desfazer/refazer) e contexto de configuração | Mantém, tipado sobre um esquema versionado (`ciprix-project.json`) |
| Registro de geradores (`registry.ts` + `components/*.ts`) | Mantém o padrão plug-and-play; todos os geradores são reescritos para Ciprix |
| Visualizador de código e árvore de arquivos (`file-tree-view`, `generated-code-viewer`) | Mantém |
| Mapa do gamepad (`controls/`) | Mantém; adaptado para controles Xbox de piloto e copiloto |
| `api/generate` com `adm-zip` no servidor (`output: 'standalone'`) | **Sai** — substituído por geração `.zip` 100% no navegador com `jszip` |
| `typescript.ignoreBuildErrors: true`, `eslint.ignoreDuringBuilds: true`, estado `Record<string, any>` | **Sai** — substituído por checagem estrita e schema Zod |
| OnBot Java, `TeamCode`, `FtcRobotController`, Firebase, pasta duplicada `studio/` e scripts legados | **Sai** |
| Validação (`useRobotValidator`, checklist) | Mantém e expande: valida FSM completa, requests ligados, IDs CAN únicos e botões duplicados |

Licença: o código do site é de propriedade de `LucasDiegoHD`. O Ciprix é licenciado sob GPLv3; o código Java gerado pertence à equipe e apenas consome a biblioteca.

## Arquitetura de Hospedagem e Geração

* **Hospedagem:** **Vercel** (Next.js 15). Não há banco de dados (sem Firebase ou Supabase) na v1: o estado do projeto vive no `localStorage`, no `.zip` exportado e no repositório GitHub da equipe.
* **Geração de `.zip`:** executada 100% no cliente usando **`jszip`**, mesclando os arquivos gerados sobre o `templates/skeleton` do Ciprix empacotado em `public/`.
* **Integração GitHub:** Route Handler na Vercel para o fluxo OAuth do GitHub (`client_secret` protegido no servidor), permitindo criar repositório ou enviar commit/PR direto do navegador e reabrir o `ciprix-project.json` salvo no repositório.

## Modelo do Projeto (`ciprix-project.json`)

Tudo o que o usuário configura é serializado em um único arquivo `ciprix-project.json` na raiz do projeto gerado, validado por **Zod** e versionado (`schemaVersion: 1`). Os geradores consomem exclusivamente esse arquivo, permitindo salvar, compartilhar, reabrir e regenerar projetos.

| Bloco do JSON | O que descreve | Vira no Java |
| --- | --- | --- |
| `project` | Nome, número da equipe, ano, pacote Java | `build.gradle`, `wpilib_preferences.json`, `Constants.java` |
| `subsystems[]` | Nome, tipo (`roller`, `flywheel`, `arm`, `elevator`, `turret`, `generic`), constantes, simulação (`SimMechanism`) e `selfTest` | `Xxx`, `XxxConstants`, `XxxIO`, `XxxIOSim`, `XxxIO<Vendor>` |
| `subsystems[].hardware` | Motor por motor: fabricante/modelo (Talon FX/FXS, SPARK MAX/Flex, Talon SRX, Victor SPX, PWM), ID CAN/porta, barramento, `MotorConfig` fluente, seguidores, encoders e sensores | Implementações de IO por vendor e `Constants` |
| `subsystems[].fsm` | Requests, estados, ações `onEnter` e `onUpdate`, transições com debounce, `waitFor`, `timeoutAfter`, `securityState`, `regularTime` e `bindRequest` | Enums, chamadas `fsm.state(...)`, `onEnter(...)`, `onUpdate(...)`, `bindRequest(...)` |
| `superstructure` | `RobotRequest`, `RobotState`, matriz estado × subsistema, transições globais e regras condicionais de intertravamento nos getters (`get<Subsystem>Request()`) | `SuperStructure`, enums em `Constants.java` |
| `controls` | Tabela de prioridade do piloto e botões de override do copiloto | `SuperStructureCommands.manageRequests`, `RobotContainer` |
| `features` | Flags opcionais: stub `DriveContext`, visão Limelight, PathPlanner/Choreo (`AutoEngine`), `PowerManager`, anti-tipping, zonas, robô 3D, checklist pré-partida e tunables | Arquivos, vendordeps e hooks extras em cada gerador |

### Ações, condições e Java personalizado

* As ações dentro de um estado (`onEnter` / `onUpdate`) e as condições de transição são **blocos tipados** combináveis com E/OU/NÃO (por exemplo: `runPercentOutput(0.6)`, `runPosition(ARM_SCORE)`, `atGoal()`, `sensor.hasPiece`, `tempo > 0.5s`).
* Trechos de **Java personalizado** ficam armazenados dentro do próprio `ciprix-project.json` e são editados no site (sem parser reverso de arquivos `.java` editados externamente no VS Code).

## Editores do Site (6 Abas)

Cada aba edita um bloco do `ciprix-project.json` seguindo a organização do padrão Ciprix:

1. **Projeto:** número da equipe, ano, pacote, vendors habilitados (Phoenix 6, Phoenix 5, REV) e chaves de recursos opcionais (stub `DriveContext`, visão Limelight, PathPlanner/Choreo, `PowerManager`, anti-tipping, zonas, robô 3D, checklist pré-partida).
2. **Subsistemas:** canvas visual com `dnd-kit` para adicionar mecanismos (`roller`, `flywheel`, `arm`, `elevator`, `turret`, `generic`) e painel lateral para motores, IDs CAN, `MotorConfig`, seguidores, encoders, sensores, simulação (`SimMechanism`) e `selfTest`.
3. **Máquina de estados do subsistema:** **formulário estruturado** para configurar estados, ações `onEnter`/`onUpdate`, transições (`transitionTo`, debounce, `waitFor`, `timeoutAfter`), `securityState`, `regularTime` e tabela `bindRequest`, acompanhado de um **preview Mermaid ao vivo** espelhando o `toMermaid()` do Ciprix. (Um editor visual de grafo arrastável fica como evolução futura.)
4. **SuperStructure:** editor de `RobotState` / `RobotRequest`, matriz estado × subsistema e regras condicionais de intertravamento nos getters (`getArmRequest()`, `getElevatorRequest()`, etc.) seguindo o padrão do exemplo `arm-elevator` do Ciprix.
5. **Controles:** mapa visual de controles Xbox contendo a tabela de prioridade do piloto (`SuperStructureCommands.manageRequests`) e os botões de override do copiloto em `RobotContainer` (consumindo os comandos gerados por `@AutoCommandFactory`).
6. **Revisar e gerar:** checklist de validação (FSM completa, todo request ligado, IDs CAN únicos, ausência de conflito de botões), visualizador de código e árvore de arquivos ao vivo, e botões de entrega (`.zip` ou GitHub).

Modelos prontos disponíveis no seletor de templates: **Skeleton** (roller), **Arm + Elevator** (com intertravamento) e **Intake + Shooter**.

## Geradores e Saída Java (Ciprix `2026.3.0`)

* O pipeline segue o padrão de registro modular: os geradores leem o `ciprix-project.json` e mesclam a saída sobre o `templates/skeleton` do Ciprix.
* Cada subsistema gera `Xxx.java`, `XxxConstants.java`, `XxxIO.java`, `XxxIOSim.java` e a implementação IO do vendor selecionado.
* `XxxCommands.java` **não é gerado pelo site**, pois a anotação `@AutoCommandFactory` do Ciprix gera essa classe em tempo de compilação via `ciprix-processor`.
* **Formatação Java:** o gerador emite código limpo indentado com 2 espaços; não há formatador Java no navegador, pois o `build.gradle` do Ciprix já executa `spotlessApply` (`googleJavaFormat('1.19.2')`) durante o build.
* **`vendordeps/` dinâmicos:** `Ciprix.json`, `AdvantageKit.json` e `WPILibNewCommands.json` são sempre incluídos; `Phoenix6`, `REVLib`, `Phoenix5` e `PathplannerLib` são incluídos sob demanda conforme os vendors e recursos selecionados no projeto.
* **Drivetrain (`Drive`):** geradores completos de Swerve e diferencial ficam **fora da v1**, pois o Ciprix não fornece implementação pronta de Swerve e `Drive` estende `SubsystemBase implements DriveContext` (não `StateSubsystem`). Na v1 há apenas um stub opcional de `DriveContext` para integração com projetos gerados pelo Phoenix Tuner X ou YAGSL.

## Fases de Entrega

Regra de qualidade obrigatória em todas as fases: **todo projeto gerado compila**. A CI gera os templates e executa `./gradlew build` contra o `Ciprix.json` real e combinações válidas de vendordeps.

1. **Fase 1 — Base e Vertical Slice:** repositório limpo, casca de UI do FGCLibStudio com TypeScript e ESLint estritos, schema Zod `ciprix-project.json`, geração ponta a ponta do `skeleton` (1 Roller com `TalonFX` + `Sim` + `SuperStructure` + `RobotContainer`), download `.zip` no navegador via `jszip` e CI compilando o projeto gerado.
2. **Fase 2 — Subsistemas e Hardware:** catálogo de mecanismos (`roller`, `flywheel`, `arm`, `elevator`, `turret`, `generic`), suporte completo a vendors (CTRE Phoenix 6, REV, Phoenix 5, PWM), seguidores, encoders, sensores, `MotorConfig`, `SimMechanism`, `SelfTest`, vendordeps dinâmicos e validação de IDs CAN.
3. **Fase 3 — Estados, SuperStructure e Controles:** editor estruturado de FSM com preview Mermaid ao vivo, SuperStructure com matriz e intertravamentos nos getters, blocos tipados + Java personalizado no JSON, controles Xbox piloto/copiloto e templates prontos (`skeleton`, `arm-elevator`, `intake-shooter`).
4. **Fase 4 — Entrega GitHub na Vercel:** deploy na Vercel com Route Handler OAuth do GitHub, criação de repositório e envio de commit/PR direto para o time, além de reabertura de `ciprix-project.json` a partir de arquivo local ou repositório GitHub.
5. **Fase 5 — Recursos Avançados do Ciprix:** visão Limelight, PathPlanner/Choreo (`AutoEngine`), `PowerManager`, anti-tipping, zonas e ajudas de direção, robô 3D, checklist pré-partida, tunables e stub opcional de `DriveContext`.

## Decisões Fechadas

- [x] **Repositório e nome:** `LucasDiegoHD/FIRST-Studio` (privado inicialmente), diretório local `D:\FIRST Studio`.
- [x] **Hospedagem:** Vercel (Next.js 15 + 1 rota OAuth GitHub; sem banco de dados na v1; geração `.zip` 100% no cliente via `jszip`).
- [x] **Versão alvo do Ciprix:** `2026.3.0`, preparado para a migração `2027`.
- [x] **Escopo da v1:** download `.zip` + envio direto ao GitHub; **Ciprix Bridge** e gerador completo de Swerve/Diferencial ficam fora da v1.
- [x] **Referência de UI:** `D:\FGCLib Studio\FGCLibStudio` (aproveitando apenas a casca limpa).
