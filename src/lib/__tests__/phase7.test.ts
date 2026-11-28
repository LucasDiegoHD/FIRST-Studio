import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultAutonomousConfig } from "../schema/ciprix-project";
import {
  addSubsystemWithDefaults,
  createBlankPreset,
  createSkeletonPreset,
} from "../presets/skeleton";
import {
  applyTutorialAutoExample,
  applyTutorialZoneExample,
  buildTutorialAutoPreview,
  buildTutorialZonePreview,
  clampTutorialStepIndex,
  computeStrategicCardPlacement,
  evaluateTutorialStep,
  hasAnyUserAutonomous,
  parseTutorialProgress,
  resolveStepTourTarget,
  serializeTutorialProgress,
  TUTORIAL_STEPS,
} from "../tutorial/steps";
import { validateProject } from "../validator";

function collectStudioTsxFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectStudioTsxFiles(full));
    } else if (entry.name.endsWith(".tsx")) {
      results.push(full);
    }
  }
  return results;
}

describe("Phase 7: Guided Tutorial Mode", () => {
  it("defines the 12 ordered steps with complete pt/en 3-part copy", () => {
    expect(TUTORIAL_STEPS.map((s) => s.id)).toEqual([
      "project-team",
      "drivetrain",
      "subsystem-hardware",
      "sensors",
      "fsm-states",
      "fsm-requests",
      "fsm-bindings",
      "superstructure",
      "controls",
      "zones",
      "autonomous",
      "export-deploy",
    ]);

    for (const step of TUTORIAL_STEPS) {
      for (const locale of ["pt", "en"] as const) {
        const copy = step.copy[locale];
        expect(copy.title.trim().length, `${step.id}.${locale}.title`).toBeGreaterThan(0);
        expect(copy.whatToFill.trim().length, `${step.id}.${locale}.whatToFill`).toBeGreaterThan(0);
        expect(copy.whyItMatters.trim().length, `${step.id}.${locale}.whyItMatters`).toBeGreaterThan(0);
        expect(copy.whereOnRobot.trim().length, `${step.id}.${locale}.whereOnRobot`).toBeGreaterThan(0);
      }
    }
  });

  it("ensures every tourTarget and fallbackTourTarget exists as a data-tour attribute in studio UI", () => {
    const studioDir = path.resolve(process.cwd(), "src/components/studio");
    const files = collectStudioTsxFiles(studioDir);
    const allTargets = new Set<string>();
    const literalRegex = /data-tour="([^"]+)"/g;

    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      let match: RegExpExecArray | null;
      while ((match = literalRegex.exec(content)) !== null) {
        allTargets.add(match[1]);
      }
      if (content.includes('data-tour={isDrivetrainSelected ? "drivetrain-panel" : "subsystem-inspector"}')) {
        allTargets.add("drivetrain-panel");
        allTargets.add("subsystem-inspector");
      }
    }

    expect(allTargets.has("tutorial-trigger")).toBe(true);
    for (const step of TUTORIAL_STEPS) {
      expect(allTargets.has(step.tourTarget), `Missing data-tour="${step.tourTarget}"`).toBe(true);
      if (step.fallbackTourTarget) {
        expect(
          allTargets.has(step.fallbackTourTarget),
          `Missing fallback data-tour="${step.fallbackTourTarget}"`,
        ).toBe(true);
      }
    }
  });

  it("passes all 12 tutorial steps on the skeleton preset", () => {
    const project = createSkeletonPreset();
    const issues = validateProject(project, "pt");

    for (const step of TUTORIAL_STEPS) {
      const res = evaluateTutorialStep(step.id, project, issues, "pt");
      expect(res.valid, `Skeleton failed step ${step.id}: ${res.blockingReason}`).toBe(true);
    }
  });

  it("supports starting from blank preset and unlocking subsystem steps once added", () => {
    const blank = createBlankPreset();
    const blankIssues = validateProject(blank, "pt");
    const subStep = TUTORIAL_STEPS.find((s) => s.id === "subsystem-hardware")!;

    expect(evaluateTutorialStep("project-team", blank, blankIssues, "pt").valid).toBe(true);
    expect(evaluateTutorialStep("drivetrain", blank, blankIssues, "pt").valid).toBe(true);
    expect(evaluateTutorialStep("subsystem-hardware", blank, blankIssues, "pt").valid).toBe(false);
    expect(resolveStepTourTarget(subStep, blank)).toBe("subsystem-palette");

    const withArm = addSubsystemWithDefaults(blank, "arm").project;
    const armIssues = validateProject(withArm, "pt");
    expect(resolveStepTourTarget(subStep, withArm)).toBe("subsystem-inspector");

    for (const step of TUTORIAL_STEPS) {
      const res = evaluateTutorialStep(step.id, withArm, armIssues, "pt");
      expect(res.valid, `Blank+Arm failed step ${step.id}: ${res.blockingReason}`).toBe(true);
    }
  });

  it("blocks next step when Phase 1 validator reports an issue for that step", () => {
    // Step 1 & 12: invalid Java package
    const badPkg = createSkeletonPreset();
    badPkg.project.packageName = "123bad";
    const badPkgIssues = validateProject(badPkg, "pt");
    expect(evaluateTutorialStep("project-team", badPkg, badPkgIssues, "pt").valid).toBe(false);
    expect(evaluateTutorialStep("export-deploy", badPkg, badPkgIssues, "pt").valid).toBe(false);

    // Step 3: duplicate CAN ID
    const dupCan = addSubsystemWithDefaults(createSkeletonPreset(), "shooter").project;
    if (dupCan.subsystems[1]?.motor) dupCan.subsystems[1].motor.canId = 10;
    const dupCanIssues = validateProject(dupCan, "pt");
    expect(evaluateTutorialStep("subsystem-hardware", dupCan, dupCanIssues, "pt").valid).toBe(false);

    // Step 4: duplicate DIO channel
    const dupDio = createSkeletonPreset();
    dupDio.subsystems[0].sensors = [
      { id: "s1", name: "a", type: "dio", channel: 0, inverted: true },
      { id: "s2", name: "b", type: "dio", channel: 0, inverted: true },
    ];
    expect(evaluateTutorialStep("sensors", dupDio, validateProject(dupDio, "pt"), "pt").valid).toBe(
      false,
    );

    // Step 5: invalid state constant
    const badState = createSkeletonPreset();
    const act = badState.subsystems[0].fsm?.states[1]?.actions[0];
    if (act?.kind === "motor" && act.action.type !== "stop") {
      act.action.constantName = "123_BAD";
    }
    expect(
      evaluateTutorialStep("fsm-states", badState, validateProject(badState, "pt"), "pt").valid,
    ).toBe(false);

    // Step 6: invalid request name
    const badReq = createSkeletonPreset();
    badReq.subsystems[0].fsm?.requests.push("9INVALID");
    expect(
      evaluateTutorialStep("fsm-requests", badReq, validateProject(badReq, "pt"), "pt").valid,
    ).toBe(false);

    // Step 7: unbound request blocks until bound
    const unboundReq = createSkeletonPreset();
    unboundReq.subsystems[0].fsm?.requests.push("PULSE");
    expect(
      evaluateTutorialStep("fsm-bindings", unboundReq, validateProject(unboundReq, "pt"), "pt").valid,
    ).toBe(false);
    unboundReq.subsystems[0].fsm?.bindings.push({
      request: "PULSE",
      entryState: "STOPPED",
      goalState: "STOPPED",
      intermediateStates: [],
    });
    expect(
      evaluateTutorialStep("fsm-bindings", unboundReq, validateProject(unboundReq, "pt"), "pt").valid,
    ).toBe(true);

    // Step 8: unbound RobotRequest
    const unboundSuper = createSkeletonPreset();
    unboundSuper.superstructure.requests.push("SCORE");
    expect(
      evaluateTutorialStep("superstructure", unboundSuper, validateProject(unboundSuper, "pt"), "pt")
        .valid,
    ).toBe(false);

    // Step 9: duplicate pilot button
    const dupBtn = createSkeletonPreset();
    dupBtn.controls.pilotPriority.push({
      id: "dup",
      source: "button",
      button: "rightBumper",
      request: "INTAKE",
    });
    expect(
      evaluateTutorialStep("controls", dupBtn, validateProject(dupBtn, "pt"), "pt").valid,
    ).toBe(false);

    // Step 10: invalid zone name
    const badZone = createSkeletonPreset();
    badZone.zones = [
      {
        id: "z1",
        name: "NONE",
        type: "trigger",
        mirror: "both",
        shape: { kind: "rectangle", x1: 1, y1: 1, x2: 2, y2: 2 },
      },
    ];
    expect(evaluateTutorialStep("zones", badZone, validateProject(badZone, "pt"), "pt").valid).toBe(
      false,
    );

    // Step 11: NamedCommand referencing missing RobotRequest
    const badAuto = createSkeletonPreset();
    badAuto.autonomous = {
      ...createDefaultAutonomousConfig(),
      enabled: true,
      namedCommands: [
        { id: "nc1", name: "Shoot", request: "MISSING_REQ", waitForGoal: true, timeoutSec: 2 },
      ],
    };
    expect(
      evaluateTutorialStep("autonomous", badAuto, validateProject(badAuto, "pt"), "pt").valid,
    ).toBe(false);
  });

  it("serializes, parses, and clamps tutorial progress safely", () => {
    expect(clampTutorialStepIndex(-5)).toBe(0);
    expect(clampTutorialStepIndex(999)).toBe(TUTORIAL_STEPS.length - 1);
    expect(parseTutorialProgress(null)).toEqual({ stepIndex: 0, completed: false, active: false });
    expect(parseTutorialProgress("{bad json")).toEqual({
      stepIndex: 0,
      completed: false,
      active: false,
    });

    const raw = serializeTutorialProgress({ stepIndex: 4, completed: false, active: true });
    expect(parseTutorialProgress(raw)).toEqual({ stepIndex: 4, completed: false, active: true });
    expect(parseTutorialProgress('{"stepIndex": 42, "completed": true, "active": false}')).toEqual({
      stepIndex: TUTORIAL_STEPS.length - 1,
      completed: true,
      active: false,
    });
  });

  it("places the tutorial card strategically with zero overlap around top, left, and right targets", () => {
    const cardW = 460;
    const cardH = 280;

    // Centered top modal -> below modal
    const modalPos = computeStrategicCardPlacement(
      { left: 624, top: 64, width: 672, height: 280 },
      1920,
      960,
      cardW,
      cardH,
    );
    expect(modalPos.top).toBeGreaterThanOrEqual(360);

    // Left / center-left panel -> to the right of panel
    const leftPos = computeStrategicCardPlacement(
      { left: 640, top: 220, width: 700, height: 480 },
      1920,
      960,
      cardW,
      cardH,
    );
    expect(leftPos.left).toBeGreaterThanOrEqual(1356);

    // Right FSM panel -> to the left of panel
    const rightPos = computeStrategicCardPlacement(
      { left: 1280, top: 180, width: 600, height: 520 },
      1920,
      960,
      cardW,
      cardH,
    );
    expect(rightPos.left + cardW).toBeLessThanOrEqual(1264);

    // SuperStructure with preferCenter -> centered inside card
    const superPos = computeStrategicCardPlacement(
      { left: 368, top: 185, width: 1440, height: 705 },
      1920,
      960,
      cardW,
      cardH,
      true,
    );
    expect(superPos.left).toBe(858);
  });

  it("builds ephemeral zone/auto previews without mutating project and deduplicates explicit applies", () => {
    const base = createSkeletonPreset();
    expect(hasAnyUserAutonomous(base)).toBe(false);

    const previewZones = buildTutorialZonePreview(base);
    const previewAuto = buildTutorialAutoPreview(base);
    expect(previewZones[0].name).toBe("TRENCH_SUCTION");
    expect(previewAuto.paths?.[0].name).toBe("ThroughTrenchToNeutral");
    expect(base.zones).toBeUndefined();
    expect(base.autonomous).toBeUndefined();

    // User already has autonomous data -> hasAnyUserAutonomous is true, apply deduplicates safely
    const userProject = createSkeletonPreset();
    userProject.autonomous = {
      ...previewAuto,
      enabled: true,
      defaultAutoId: "user-auto",
      namedCommands: [
        { id: "u-nc", name: "intakeon", request: "INTAKE", waitForGoal: false, timeoutSec: 1.5 },
      ],
      paths: [
        { ...previewAuto.paths![0], id: "u-path", name: "ThroughTrenchToNeutral" },
      ],
      routines: [
        {
          id: "user-auto",
          name: "User Routine",
          fileName: "TwoPieceTrench",
          source: "pathplanner",
          steps: [],
          discoveredNamedCommands: [],
        },
      ],
    };
    expect(hasAnyUserAutonomous(userProject)).toBe(true);

    const withZone = applyTutorialZoneExample(userProject);
    expect(withZone.zones?.length).toBe(1);
    expect(withZone.zones?.[0].name).toBe("TRENCH_SUCTION");

    const merged = applyTutorialAutoExample(withZone);
    expect(merged.autonomous?.defaultAutoId).toBe("user-auto");
    expect(merged.autonomous?.namedCommands.filter((c) => c.name.toLowerCase() === "intakeon").length).toBe(1);
    expect(merged.autonomous?.paths?.some((p) => p.name === "ThroughTrenchToNeutral_2")).toBe(true);
    expect(merged.autonomous?.routines.some((r) => r.fileName === "TwoPieceTrench_2")).toBe(true);
    expect(
      validateProject(merged, "pt").filter((i) => i.severity === "error"),
    ).toEqual([]);
  });
});
