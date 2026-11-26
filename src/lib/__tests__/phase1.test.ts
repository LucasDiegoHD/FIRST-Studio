import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { computeChangedLineIndices } from "../../components/studio/code-viewer";
import {
  applyRenameSubsystemRequest,
  applyRenameSubsystemState,
} from "../fsm-operations";
import { generateProjectFiles } from "../generator";
import { JAVA_FILE_HEADER } from "../generator/java-utils";
import {
  getHelpEntry,
  normalizeFieldPath,
  REGISTERED_FIELD_PATHS,
} from "../help/catalog";
import {
  addSubsystemWithDefaults,
  createBlankPreset,
  createCompetitionPreset,
  createSkeletonPreset,
  duplicateSubsystemWithDefaults,
} from "../presets/skeleton";
import { validateProject } from "../validator";

function collectTsxFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsxFiles(full));
    } else if (entry.name.endsWith(".tsx")) {
      results.push(full);
    }
  }
  return results;
}

describe("Phase 1 usability and foundation", () => {
  it("maps reverseOutput Zod error to exact path, subsystem name, and friendly Portuguese message", () => {
    const project = createSkeletonPreset();
    project.subsystems[0].protection = {
      stallReversalEnabled: true,
      stallCurrentAmps: 35,
      stallTimeSec: 0.25,
      reverseTimeSec: 0.35,
      reverseOutput: -0.5,
    };

    const issues = validateProject(project, "pt");
    const revIssue = issues.find(
      (i) => i.path === "subsystems.roller.protection.reverseOutput",
    );

    expect(revIssue).toBeDefined();
    expect(revIssue?.severity).toBe("error");
    expect(revIssue?.tab).toBe("subsystems");
    expect(revIssue?.targetId).toBe("roller");
    expect(revIssue?.advanced).toBe(true);
    expect(revIssue?.message).toContain("Roller");
    expect(revIssue?.message).toContain("Intensidade da reversão");
    expect(revIssue?.message).toContain("-0,5");
    expect(revIssue?.message).toContain("0");
    expect(revIssue?.message).toContain("1");
  });

  it("ensures every registered field path and UI <Field> has pt/en help catalog entries", () => {
    expect(REGISTERED_FIELD_PATHS.length).toBeGreaterThan(20);
    for (const p of REGISTERED_FIELD_PATHS) {
      const pt = getHelpEntry(p, "pt");
      const en = getHelpEntry(p, "en");
      expect(pt?.what.trim().length, `Missing pt.what for ${p}`).toBeGreaterThan(0);
      expect(pt?.why.trim().length, `Missing pt.why for ${p}`).toBeGreaterThan(0);
      expect(en?.what.trim().length, `Missing en.what for ${p}`).toBeGreaterThan(0);
      expect(en?.why.trim().length, `Missing en.why for ${p}`).toBeGreaterThan(0);
    }

    const componentsDir = path.resolve(process.cwd(), "src/components");
    const files = collectTsxFiles(componentsDir);
    const fieldPathRegex = /<Field\b[^>]*\bpath=(?:"([^"]+)"|\{`([^`]+)`\})/g;

    const discovered = new Set<string>();
    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      let match: RegExpExecArray | null;
      while ((match = fieldPathRegex.exec(content)) !== null) {
        const template = match[1] ?? match[2] ?? "";
        if (!template) continue;
        if (template.includes("${gain}")) {
          for (const gain of ["kP", "kI", "kD", "kS", "kV", "kA", "kG"]) {
            discovered.add(
              template.replace("${gain}", gain).replace(/\$\{[^}]+\}/g, "sample"),
            );
          }
        } else {
          discovered.add(template.replace(/\$\{[^}]+\}/g, "sample"));
        }
      }
    }

    expect(discovered.size).toBeGreaterThan(15);
    for (const rawPath of discovered) {
      const normalized = normalizeFieldPath(rawPath);
      expect(
        getHelpEntry(rawPath, "pt"),
        `UI <Field path="${rawPath}"> (normalized "${normalized}") is missing from HELP_CATALOG`,
      ).toBeDefined();
    }
  });

  it("prefixes every generated Java file with the FIRST Studio / Ciprix attribution header", () => {
    for (const preset of [createSkeletonPreset(), createCompetitionPreset()]) {
      const javaFiles = generateProjectFiles(preset).filter((f) =>
        f.path.endsWith(".java"),
      );
      expect(javaFiles.length).toBeGreaterThan(0);
      for (const file of javaFiles) {
        expect(
          file.content.startsWith(JAVA_FILE_HEADER),
          `Missing header in ${file.path}`,
        ).toBe(true);
      }
    }
  });

  it("atomically renames subsystem states and requests across bindings, transitions, SuperStructure, and controls", () => {
    const comp = createCompetitionPreset();
    const shooterId = comp.subsystems[0].id;

    const renamedState = applyRenameSubsystemState(comp, shooterId, "READY", "AT_SPEED");
    const shooterAfterState = renamedState.subsystems[0];
    if (!shooterAfterState.fsm) throw new Error("expected fsm");
    expect(shooterAfterState.fsm.states.some((s) => s.name === "AT_SPEED")).toBe(true);
    expect(
      shooterAfterState.fsm.states
        .find((s) => s.name === "RAMPING")
        ?.transitions?.some((tr) => tr.targetState === "AT_SPEED"),
    ).toBe(true);
    expect(
      shooterAfterState.fsm.bindings.find((b) => b.request === "SHOOT")?.goalState,
    ).toBe("AT_SPEED");
    expect(validateProject(renamedState)).toEqual([]);

    const indexerId = comp.subsystems[2].id;
    const renamedReq = applyRenameSubsystemRequest(
      renamedState,
      indexerId,
      "UNJAM",
      "CLEAR_JAM",
    );
    const idxSub = renamedReq.subsystems[2];
    if (!idxSub.fsm) throw new Error("expected fsm");
    expect(idxSub.fsm.requests).toContain("CLEAR_JAM");
    expect(
      idxSub.fsm.bindings.some((b) => b.request === "CLEAR_JAM"),
    ).toBe(true);
    expect(
      renamedReq.controls.copilotOverrides.some((ov) => ov.request === "CLEAR_JAM"),
    ).toBe(true);
    expect(validateProject(renamedReq)).toEqual([]);
  });

  it("auto-configures basic SuperStructure and free pilot/copilot buttons when adding subsystems and warns until customized", () => {
    const step1 = addSubsystemWithDefaults(createBlankPreset(), "shooter");
    expect(step1.project.subsystems[0].isDefaultTemplate).toBe(true);
    expect(step1.project.superstructure.requests).toContain("SHOOT");
    expect(step1.project.controls.pilotPriority.length).toBe(1);
    expect(step1.project.controls.copilotOverrides.length).toBeGreaterThanOrEqual(1);

    const issues1 = validateProject(step1.project, "pt");
    expect(issues1.filter((i) => i.severity === "error")).toEqual([]);
    expect(issues1.some((i) => i.id === "sub-basic-defaults-shooter" && i.severity === "warning")).toBe(true);

    const step2 = addSubsystemWithDefaults(step1.project, "arm");
    const issues2 = validateProject(step2.project, "pt");
    expect(issues2.filter((i) => i.severity === "error")).toEqual([]);
    const pilotBtns = step2.project.controls.pilotPriority.map((p) => p.button);
    expect(new Set(pilotBtns).size).toBe(pilotBtns.length);
    const copilotBtns = step2.project.controls.copilotOverrides.map((c) => c.button);
    expect(new Set(copilotBtns).size).toBe(copilotBtns.length);

    step2.project.subsystems[0] = {
      ...step2.project.subsystems[0],
      isDefaultTemplate: false,
    };
    const issuesAfterEdit = validateProject(step2.project, "pt");
    expect(issuesAfterEdit.some((i) => i.id === "sub-basic-defaults-shooter")).toBe(false);
  });

  it("supports leftStick and rightStick Xbox buttons in schema, validator, and RobotContainer.java", () => {
    const project = createSkeletonPreset();
    project.controls.pilotPriority.push({
      id: "pilot-ls",
      source: "button",
      button: "leftStick",
      request: "INTAKE",
    });
    project.controls.copilotOverrides.push({
      id: "copilot-rs",
      button: "rightStick",
      subsystemId: "roller",
      request: "EJECT",
    });

    expect(validateProject(project)).toEqual([]);
    const container = generateProjectFiles(project).find((f) =>
      f.path.endsWith("RobotContainer.java"),
    )?.content;
    expect(container).toContain("pilot.leftStick()");
    expect(container).toContain("copilot.rightStick()");
  });

  it("computes changed line indices for live CodeViewer diff highlighting", () => {
    const prev = "package frc.robot;\npublic class Roller {\n  int id = 10;\n}";
    const next = "package frc.robot;\npublic class Roller {\n  int id = 14;\n}";
    expect(computeChangedLineIndices(prev, next)).toEqual([2]);
  });

  it("duplicates a subsystem with unique name, id, and CAN IDs (including follower) and 0 errors", () => {
    const project = createSkeletonPreset();
    if (!project.subsystems[0].motor) throw new Error("expected motor");
    project.subsystems[0].motor.follower = { enabled: true, canId: 11, inverted: false };
    const res = duplicateSubsystemWithDefaults(project, "roller");
    expect(res).not.toBeNull();
    expect(res?.project.subsystems.length).toBe(2);
    expect(res?.project.subsystems[1].id).toBe("roller_2");
    expect(res?.project.subsystems[1].name).toBe("Roller2");
    expect(res?.project.subsystems[1].motor?.canId).not.toBe(10);
    expect(res?.project.subsystems[1].motor?.follower?.canId).not.toBe(11);
    expect(validateProject(res!.project)).toEqual([]);
  });
});
