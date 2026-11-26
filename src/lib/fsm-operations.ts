import type { CiprixProject } from "./schema/ciprix-project";

export function applyRenameSubsystemState(
  project: CiprixProject,
  subsystemId: string,
  oldName: string,
  nextName: string,
): CiprixProject {
  if (!nextName || nextName === oldName) return project;

  return {
    ...project,
    subsystems: project.subsystems.map((sub) => {
      if (sub.id !== subsystemId || !sub.fsm) return sub;
      return {
        ...sub,
        isDefaultTemplate: false,
        fsm: {
          ...sub.fsm,
          initialState:
            sub.fsm.initialState === oldName ? nextName : sub.fsm.initialState,
          securityState:
            sub.fsm.securityState === oldName ? nextName : sub.fsm.securityState,
          states: sub.fsm.states.map((st) => ({
            ...st,
            name: st.name === oldName ? nextName : st.name,
            transitions: st.transitions?.map((tr) => ({
              ...tr,
              targetState: tr.targetState === oldName ? nextName : tr.targetState,
            })),
          })),
          bindings: sub.fsm.bindings.map((b) => ({
            ...b,
            entryState: b.entryState === oldName ? nextName : b.entryState,
            goalState: b.goalState === oldName ? nextName : b.goalState,
            intermediateStates: b.intermediateStates.map((s) =>
              s === oldName ? nextName : s,
            ),
          })),
        },
      };
    }),
  };
}

export function applyRenameSubsystemRequest(
  project: CiprixProject,
  subsystemId: string,
  oldReq: string,
  nextReq: string,
): CiprixProject {
  if (!nextReq || nextReq === oldReq) return project;

  const nextStateActions: Record<string, Record<string, string>> = {};
  for (const [robotState, map] of Object.entries(project.superstructure.stateActions)) {
    if (map[subsystemId] === oldReq) {
      nextStateActions[robotState] = { ...map, [subsystemId]: nextReq };
    } else {
      nextStateActions[robotState] = map;
    }
  }

  return {
    ...project,
    subsystems: project.subsystems.map((sub) => {
      if (sub.id !== subsystemId || !sub.fsm) return sub;
      return {
        ...sub,
        isDefaultTemplate: false,
        fsm: {
          ...sub.fsm,
          initialRequest:
            sub.fsm.initialRequest === oldReq ? nextReq : sub.fsm.initialRequest,
          requests: sub.fsm.requests.map((r) => (r === oldReq ? nextReq : r)),
          bindings: sub.fsm.bindings.map((b) =>
            b.request === oldReq ? { ...b, request: nextReq } : b,
          ),
        },
      };
    }),
    superstructure: {
      ...project.superstructure,
      stateActions: nextStateActions,
    },
    controls: {
      ...project.controls,
      copilotOverrides: project.controls.copilotOverrides.map((ov) =>
        ov.subsystemId === subsystemId && ov.request === oldReq
          ? { ...ov, request: nextReq }
          : ov,
      ),
    },
  };
}
