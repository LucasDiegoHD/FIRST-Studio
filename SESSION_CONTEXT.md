# Contexto de Sessão — FIRST Studio

> Documento de retomada atualizado em 2026-11-24. Use este arquivo no início da próxima sessão para continuar exatamente de onde paramos.

## 1. Resumo e Estado Atual

- **Workspace:** `D:\FIRST Studio`
- **Repositório Git:** `https://github.com/LucasDiegoHD/FIRST-Studio` (branch `main`)
- **Referência de UI local:** `D:\FGCLib Studio\FGCLibStudio`
- **Stack:** Next.js `15.5.29`, React `19.1.0`, Tailwind CSS v4 (`@tailwindcss/postcss`), TypeScript `5.8`, Zod `3.24`, JSZip `3.10`, Vitest `3.2.7`, `@xyflow/react` `13.0.3`, `prism-react-renderer` `2.4.1`, Radix UI (`dialog`, `dropdown-menu`, `popover`, `tooltip`), `lucide-react`.
- **Verificações da entrega atual:**
  - `npm run typecheck` (`tsc --noEmit`): passou.
  - `npm run lint` (`eslint src scripts`): passou.
  - `npm test` (`vitest run`): 8/8 testes passando em `src/lib/__tests__/generator.test.ts`.
  - `npm run build` (`next build`): compilou `/` e `/studio` sem erros.
  - `next dev --port 3000`: `GET /` → `200`, `GET /studio` → `200`.

---

## 2. Decisões de Design & UX Definidas

- **Arquitetura de Layout (inspirada no FGCLib Studio):**
  - Shell com **sidebar esquerda colapsável** (`w-64` / `w-[72px]` + drawer mobile), header sticky (`h-16`), conteúdo principal com scroll natural (`max-w-[1440px]`), `<PageHeader>`, `<Card>` e `<Badge>`.
  - **Editor do Robô** em 3 zonas: `ComponentSidebar` (esquerda) + Canvas `Seu Robô` (topo, alternando entre modo **Blocos** com drag-and-drop e modo **Fluxo SuperStructure** com `@xyflow/react`) + split inferior com `ConfigPanel` (esquerda, incluindo switch **Mostrar Configurações Avançadas** com Dual-Motor Follower, SmartMotion/PositionWrap e Proteção & Stall Reversal) e preview **Código Java / Hardware & CAN** (direita).
  - **Estados & SuperStructure**: cards FSM com ações `SmartPos`, editor de **Transições Locais & Timeout** por estado, **Security State** no `Avançado`, arestas tracejadas no grafo `@xyflow/react`, e seção **Interlocks & Sequenciamento (`atGoal`)** na `SuperStructureTab`.
- **Paleta FIRST Studio:**
  - Fundo principal: `#0b0f17` | Painéis/Sidebar: `#0f1624` | Cards/Superfícies: `#131c2e` (`#19253d` hover)
  - Accent estrutural: `#142c4f` (bordas ativas `#3b6bb5` / `#60a5fa`) | Bordas hairline: `#22304a`
  - CTAs primários: branco sólido (`bg-white text-[#0b0f17]`)
- **Tipografia (do FGCLib Studio):**
  - Títulos (`font-headline`): `Space Grotesk`
  - Corpo (`font-sans`): `Inter`
  - Código / IDs / enums (`font-mono`): `JetBrains Mono`
- **Presets disponíveis:** `Skeleton (Roller)`, `Competition` (`Shooter` + `Hood` + `Indexer` com interlock `PREP_SHOOT -> SHOOTING`), e `Blank` (Vazio) — acessíveis pela Home, Header Templates e Command Palette (`Ctrl+K`).
- **Features preservadas e aprovadas:**
  - Página Inicial (`/`) com simulação interativa e abertura por templates/JSON.
  - Visualização da lógica **SuperStructure → Subsistemas** e **FSM** no `@xyflow/react`.
  - Controle **Xbox Series X SVG** (`src/components/studio/xbox-svg.tsx`) com Quick-Bind e reação ao vivo.
  - Página **Exportar** com métricas, árvore de arquivos, `CodeViewer` e download `.zip`.
  - **Drag-and-drop corrigido** em `src/components/studio/robot-flow-view.tsx` (Sidebar `<div role="button" draggable>` → Canvas + reordenação drag-to-reorder entre blocos via `reorderSubsystems`).

---

## 3. Mecanismos e Lógicas Avançadas Ciprix 2026.3.0

- **10 tipos de subsistema** (`SubsystemTypeSchema` em `src/lib/schema/ciprix-project.ts`):
  1. `roller` — Roller / Intake (`PercentOutput`, coast, 40A, 3:1, `SimMechanism.roller`)
  2. `indexer` — Indexer / Feeder (`PercentOutput`, `withStallReversal` un-jam, coast, 40A, 4:1, `SimMechanism.roller`)
  3. `shooter` — Shooter / Flywheel multi-estágio (`SPOOLING -> AT_SPEED` via `atSetpoint` + `timeoutAfter`/`securityState`, PID/SVAG, coast, 60A, 1.5:1, `SimMechanism.flywheel`)
  4. `arm` — Arm / Pivot (`SmartPosition`/Degrees, `.armGravity()`, softLimits, brake, 40A, 50:1, `SimMechanism.arm`)
  5. `elevator` — Elevator (`SmartMotion`/Rotations, PID/SVAG/kG, softLimits, brake, 50A, 9:1, `SimMechanism.elevator`)
  6. `turret` — Turret (`SmartPosition`/Degrees, `.withPositionWrap(...)` 0–360°, brake, 40A, 40:1, `SimMechanism.arm`)
  7. `wrist` — Wrist (`Degrees`, `.armGravity()`, softLimits, brake, 35A, 30:1, `SimMechanism.arm`)
  8. `hood` — Shooter Hood (`SmartPosition`/Degrees, `.armGravity()`, softLimits, brake, 30A, 25:1, `SimMechanism.arm`)
  9. `climber` — Climber (`PercentOutput`, brake, 60A, 25:1, `SimMechanism.elevator`)
  10. `generic` — Motor Genérico (`PercentOutput`, brake, 40A, 1:1, `SimMechanism.roller`)
- **Ações FSM suportadas (`SubsystemActionSchema`):**
  - `stop` → `io.controlMotor().stop()`
  - `percentOutput` → `io.controlMotor().runPercentOutput(...)`
  - `velocityRpm` → `io.controlMotor().runVelocity(...)` (`AngularVelocity` com `RPM.of(...)`)
  - `positionDeg` / `positionRot` → `io.controlMotor().runPosition(...)` (`Degrees.of(...)` / `Rotations.of(...)`)
  - `smartPositionDeg` / `smartPositionRot` → `io.controlMotor().runSmartPosition(...)` (`Degrees.of(...)` / `Rotations.of(...)`)
- **5 Lógicas Avançadas Ciprix 2026.3.0 implementadas no gerador (`roller.ts`, `robot-files.ts`, `mermaid.ts`, `validator.ts`):**
  1. **Transições locais FSM + Timeout (`StateMachine`):** `transitionAfter(seconds)`, `transitionTo(..., () -> atGoal())`, `stalled`, `currentAbove`, `.timeoutAfter(...)` + `.securityState(...)`.
  2. **`SmartMotion` + Position Wrap:** `MotorConfig.smartMotion(maxVelRps, maxAccelRpss, allowedError)` + `.withPositionWrap(...)`.
  3. **Proteção & Un-Jam:** `.withStallReversal(...)`, `.withStallDetection(...)`, `.withCurrentWarning(...)`, `.openLoopRamp(...)`, `.closedLoopRamp(...)`.
  4. **Dual-Motor Follower:** `FOLLOWER_ID`, `FOLLOWER_CONFIG` com `.withMotorLeader(MOTOR_ID).withFollowerInverted(...)`, `followerInputs`, e `DCMotor.*(2)` no sim.
  5. **`SuperStructure` Interlocks (`atGoal`):** `.transitionTo(..., () -> isXAtGoal() && ...)` / `.transitionAfter(...)` (`allAtGoal`, `subsystemAtGoal`, `afterSeconds`).
- **Nota de compatibilidade:** campos avançados (`closedLoop`, `physics`, `protection`, `motor.follower`, `fsm.transitions`, `fsm.securityState`, `timeoutAfterSec`, `superstructure.transitions`) são opcionais no schema para preservar projetos salvos em `localStorage`.

---

## 4. Arquivos Principais

| Área | Caminho |
| --- | --- |
| Fontes & Root Layout | `src/app/layout.tsx` |
| Tema, grids & animações CSS | `src/app/globals.css` |
| Primitivos FGCLib (`Card`, `Badge`, `PageHeader`) | `src/components/ui/card.tsx`, `src/components/ui/badge.tsx`, `src/components/page-header.tsx` |
| Landing Page | `src/components/home/landing-page.tsx` |
| Shell (Sidebar colapsável + Header) | `src/components/studio/studio-shell.tsx` |
| Editor do Robô (Sidebar + Blocos/Fluxo + ConfigPanel) | `src/components/studio/robot-flow-view.tsx` |
| Estados FSM & SuperStructure | `src/components/studio/states-view.tsx`, `src/components/studio/superstructure-tab.tsx` |
| Controles Xbox | `src/components/studio/controls-tab.tsx`, `src/components/studio/xbox-svg.tsx` |
| Exportação `.zip` & Código | `src/components/studio/code-tab.tsx`, `src/components/studio/code-viewer.tsx` |
| Estado Global & Undo/Redo | `src/context/project-context.tsx` |
| Schema, Presets, Validador & Gerador | `src/lib/schema/ciprix-project.ts`, `src/lib/presets/skeleton.ts`, `src/lib/validator.ts`, `src/lib/generator/subsystems/roller.ts`, `src/lib/generator/registry.ts` |
| Testes Automatizados | `src/lib/__tests__/generator.test.ts` |

---

## 5. Próximos Passos Sugeridos (Dar "Tempero" à UI / Tirar Cara de IA)

Ainda falta identidade visual mais autoral (a UI está muito monocromática em azul). Pontos levantados para evoluir na próxima sessão:

1. **Identidade cromática + ilustrações técnicas SVG por mecanismo:**
   - Diferenciar visualmente cada mecanismo em vez de usar o mesmo ícone/cor azul em tudo (ex.: **Shooter** âmbar com flywheels, **Arm** violeta articulado, **Elevator** esmeralda com estágios, **Climber** coral, **Roller** ciano).
2. **Remover clichês de UI gerada por IA:**
   - Remover gradiente branco→azul no `<h1>` e a bolinha `animate-pulse` na Home (`src/components/home/landing-page.tsx`).
   - Remover sombras neon repetitivas (`shadow-[0_0_24px_...]`) e eliminar a duplicação do título da página entre o header sticky (`studio-shell.tsx`) e `<PageHeader>`.
   - Adotar acabamento estilo workbench técnico: borda specular `1px` no topo dos cards, números com `tabular-nums` e `<kbd>` estilizados para atalhos (`Ctrl+K`, `Alt+1..4`).
3. **Blocos com visual de hardware FRC real:**
   - Faixa superior colorida tipo etiqueta CAN/breaker no topo de cada card em `Seu Robô`, mini barra de limite de corrente + badge `BRAKE`/`COAST` e botão de simulação/teste rápido direto no bloco.
4. **Home mais direta e técnica:**
   - Aproximar a estética de ferramentas FRC reais (como AdvantageScope / PathPlanner), reduzindo visual genérico de template SaaS.
5. **Validação pendente em ambiente real:**
   - Testar interativamente no navegador o drag-and-drop (Sidebar → `Seu Robô` e reordenação entre blocos), transições visuais e o `@xyflow/react`.
   - Baixar um projeto `.zip` gerado com os novos mecanismos (`shooter`, `arm`, `elevator`, `climber`) e rodar `./gradlew build` no WPILib/GradleRIO.

---

## 6. Restrições e Pegadinhas do Ambiente

- **Espaço crítico no drive `C:` (~0.6 GB livre):** sempre redirecionar temporários e cache para `D:` antes de rodar comandos Node/Next/npm e chamar `.\node_modules\.bin\next.cmd` diretamente (evitar `npx`):
  ```powershell
  $env:TEMP = "D:\.tmp"
  $env:TMP = "D:\.tmp"
  $env:npm_config_cache = "D:\.npm-cache"
  $env:NEXT_TELEMETRY_DISABLED = "1"
  ```
- **Windows PowerShell 5.1:** não suporta `&&`; separar comandos por quebra de linha com `if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }`.
- **`next build` vs `next dev`:** sempre encerrar o servidor `next dev` (e opcionalmente limpar `.next`) antes de rodar `npm run build` para evitar erro de lock/`ENOENT` em `.next`.
- **GitHub push:** o token atual do `gh` não possui escopo `workflow`; manter `.github/workflows/ci.yml` fora do stage usando:
  ```powershell
  git add -A -- ":!.github/workflows/ci.yml"
  ```
- **`@xyflow/react` v13.0.3:** usa `OnNodesChange<Node>` com `changes.applyTo(nds)` (não `applyNodeChanges`), e exige altura explícita (`h-[400px]`, `h-[540px]`) dentro de containers com scroll.
