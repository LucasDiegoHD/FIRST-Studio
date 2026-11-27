import { getRebuilt2026Landmarks, round2 } from "../arena/rebuilt-2026";
import type {
  AutoNamedCommand,
  AutoRoutine,
  AutoStep,
  PathPlannerPathDoc,
} from "../schema/ciprix-project";

export interface AutoTemplateDef {
  id: string;
  title: { pt: string; en: string };
  description: { pt: string; en: string };
  source: "pathplanner" | "choreo";
  build: (
    fieldL: number,
    fieldW: number,
    availableRequests: string[],
  ) => {
    routine: Omit<AutoRoutine, "id">;
    namedCommands: Omit<AutoNamedCommand, "id">[];
    paths: Omit<PathPlannerPathDoc, "id">[];
  };
}

function pickRequest(
  available: string[],
  preferred: RegExp,
  fallbackIdx = 0,
): string {
  const matched = available.find((r) => preferred.test(r));
  return matched ?? available[fallbackIdx] ?? available[0] ?? "IDLE";
}

export const REBUILT_AUTO_TEMPLATES: AutoTemplateDef[] = [
  {
    id: "leave-line",
    title: { pt: "Sair da Linha (Leave)", en: "Leave Starting Line" },
    description: {
      pt: "Cruza a linha de partida para garantir pontos de mobilidade no início do autônomo.",
      en: "Crosses the starting line cleanly for mobility points.",
    },
    source: "pathplanner",
    build: (fieldL, fieldW) => {
      const lm = getRebuilt2026Landmarks(fieldL, fieldW);
      const y = round2(fieldW * 0.5);
      const sx = round2(lm.blueAllianceLineX - 0.55);
      const ex = round2(lm.blueAllianceLineX + 1.85);

      const pathDoc: Omit<PathPlannerPathDoc, "id"> = {
        name: "LeaveStartingLine",
        waypoints: [
          {
            anchor: { x: sx, y },
            prevControl: null,
            nextControl: { x: round2(sx + 0.8), y },
            isLocked: false,
            linkedName: null,
          },
          {
            anchor: { x: ex, y },
            prevControl: { x: round2(ex - 0.8), y },
            nextControl: null,
            isLocked: false,
            linkedName: null,
          },
        ],
        rotationTargets: [],
        eventMarkers: [],
        idealStartingState: { velocity: 0, rotation: 0 },
        goalEndState: { velocity: 0, rotation: 0 },
        reversed: false,
        useDefaultConstraints: true,
      };

      const steps: AutoStep[] = [
        {
          id: "step-leave",
          kind: "path",
          pathName: "LeaveStartingLine",
          durationSec: 2.0,
          startX: sx,
          startY: y,
          endX: ex,
          endY: y,
        },
      ];
      return {
        routine: {
          name: "Sair da Linha (Leave)",
          fileName: "LeaveLine",
          source: "pathplanner",
          steps,
          discoveredNamedCommands: [],
        },
        namedCommands: [],
        paths: [pathDoc],
      };
    },
  },
  {
    id: "score-depot",
    title: { pt: "1 Peça + Coleta Depot", en: "1 Piece + Depot Pickup" },
    description: {
      pt: "Pontua perto do Hub, busca FUEL no Depot com curva suave e retorna para pontuar novamente.",
      en: "Scores at the Hub, collects FUEL from the Depot, and returns.",
    },
    source: "pathplanner",
    build: (fieldL, fieldW, reqs) => {
      const lm = getRebuilt2026Landmarks(fieldL, fieldW);
      const startX = round2(lm.blueAllianceLineX - 0.6);
      const hubX = round2(lm.blueHub.x1 - 0.78);
      const hubY = round2((lm.blueHub.y1 + lm.blueHub.y2) / 2);
      const depotX = round2(lm.blueDepot.x2 + 0.62);
      const depotY = round2((lm.blueDepot.y1 + lm.blueDepot.y2) / 2);
      const intakeReq = pickRequest(reqs, /intake|collect|feed/i, 0);
      const scoreReq = pickRequest(reqs, /shoot|score|eject|launch/i, reqs.length > 1 ? 1 : 0);
      const stopReq = pickRequest(reqs, /stop|idle|stow/i, 0);

      const paths: Omit<PathPlannerPathDoc, "id">[] = [
        {
          name: "StartToHub",
          waypoints: [
            {
              anchor: { x: startX, y: round2(hubY + 0.6) },
              prevControl: null,
              nextControl: { x: round2(startX + 0.65), y: round2(hubY + 0.5) },
              isLocked: false,
              linkedName: null,
            },
            {
              anchor: { x: hubX, y: hubY },
              prevControl: { x: round2(hubX - 0.7), y: round2(hubY + 0.05) },
              nextControl: null,
              isLocked: false,
              linkedName: null,
            },
          ],
          rotationTargets: [],
          eventMarkers: [],
          idealStartingState: { velocity: 0, rotation: 0 },
          goalEndState: { velocity: 0, rotation: 0 },
          reversed: false,
          useDefaultConstraints: true,
        },
        {
          name: "HubToDepot",
          waypoints: [
            {
              anchor: { x: hubX, y: hubY },
              prevControl: null,
              nextControl: { x: round2(hubX - 0.9), y: round2(hubY + 0.85) },
              isLocked: false,
              linkedName: null,
            },
            {
              anchor: { x: round2((hubX + depotX) * 0.5), y: round2(depotY - 0.45) },
              prevControl: { x: round2((hubX + depotX) * 0.5 + 0.55), y: round2(depotY - 0.9) },
              nextControl: { x: round2((hubX + depotX) * 0.5 - 0.55), y: round2(depotY) },
              isLocked: false,
              linkedName: null,
            },
            {
              anchor: { x: depotX, y: depotY },
              prevControl: { x: round2(depotX + 0.55), y: depotY },
              nextControl: null,
              isLocked: false,
              linkedName: null,
            },
          ],
          rotationTargets: [{ id: "rt-1", waypointRelativePos: 0.75, rotationDegrees: 180 }],
          eventMarkers: [
            { id: "em-1", name: "Ligar Intake", waypointRelativePos: 0.6, commandName: "IntakeOn" },
          ],
          idealStartingState: { velocity: 0, rotation: 0 },
          goalEndState: { velocity: 0, rotation: 180 },
          reversed: false,
          useDefaultConstraints: true,
        },
        {
          name: "DepotToHub",
          waypoints: [
            {
              anchor: { x: depotX, y: depotY },
              prevControl: null,
              nextControl: { x: round2(depotX + 0.8), y: round2(depotY - 0.25) },
              isLocked: false,
              linkedName: null,
            },
            {
              anchor: { x: hubX, y: hubY },
              prevControl: { x: round2(hubX - 0.8), y: round2(hubY + 0.45) },
              nextControl: null,
              isLocked: false,
              linkedName: null,
            },
          ],
          rotationTargets: [{ id: "rt-2", waypointRelativePos: 0.55, rotationDegrees: 0 }],
          eventMarkers: [
            { id: "em-2", name: "Preparar Tiro", waypointRelativePos: 0.8, commandName: "ScoreFuel" },
          ],
          idealStartingState: { velocity: 0, rotation: 180 },
          goalEndState: { velocity: 0, rotation: 0 },
          reversed: false,
          useDefaultConstraints: true,
        },
      ];

      const steps: AutoStep[] = [
        {
          id: "s1",
          kind: "path",
          pathName: "StartToHub",
          durationSec: 1.8,
          startX,
          startY: round2(hubY + 0.6),
          endX: hubX,
          endY: hubY,
        },
        { id: "s2", kind: "named", commandName: "ScoreFuel", durationSec: 1.0 },
        {
          id: "s3",
          kind: "path",
          pathName: "HubToDepot",
          durationSec: 2.4,
          startX: hubX,
          startY: hubY,
          endX: depotX,
          endY: depotY,
        },
        { id: "s4", kind: "named", commandName: "IntakeOn", durationSec: 1.1 },
        {
          id: "s5",
          kind: "path",
          pathName: "DepotToHub",
          durationSec: 2.3,
          startX: depotX,
          startY: depotY,
          endX: hubX,
          endY: hubY,
        },
        { id: "s6", kind: "named", commandName: "ScoreFuel", durationSec: 1.0 },
        { id: "s7", kind: "named", commandName: "StopAll", durationSec: 0.4 },
      ];

      return {
        routine: {
          name: "1 Peça + Depot",
          fileName: "OnePieceDepot",
          source: "pathplanner",
          steps,
          discoveredNamedCommands: ["ScoreFuel", "IntakeOn", "StopAll"],
        },
        namedCommands: [
          { name: "ScoreFuel", request: scoreReq, waitForGoal: true, timeoutSec: 2.0 },
          { name: "IntakeOn", request: intakeReq, waitForGoal: false, timeoutSec: 2.0 },
          { name: "StopAll", request: stopReq, waitForGoal: false, timeoutSec: 1.0 },
        ],
        paths,
      };
    },
  },
  {
    id: "two-piece-trench",
    title: { pt: "2 Peças Centro (Trench)", en: "2 Piece Center (Trench)" },
    description: {
      pt: "Atravessa o Trench com spline Bézier até a Zona Neutra, coleta FUEL e volta ao Hub.",
      en: "Drives through the Trench to Neutral Zone FUEL and returns to Hub.",
    },
    source: "pathplanner",
    build: (fieldL, fieldW, reqs) => {
      const lm = getRebuilt2026Landmarks(fieldL, fieldW);
      const startX = round2(lm.blueAllianceLineX - 0.55);
      const hubX = round2(lm.blueHub.x1 - 0.78);
      const hubY = round2((lm.blueHub.y1 + lm.blueHub.y2) / 2);
      const trenchX = round2((lm.blueTrenches[0].x1 + lm.blueTrenches[0].x2) / 2);
      const trenchY = round2((lm.blueTrenches[0].y1 + lm.blueTrenches[0].y2) / 2);
      const fuelX = round2(lm.centerX - 0.45);
      const fuelY = round2(fieldW * 0.62);
      const intakeReq = pickRequest(reqs, /intake|collect|feed/i, 0);
      const scoreReq = pickRequest(reqs, /shoot|score|eject|launch/i, reqs.length > 1 ? 1 : 0);

      const paths: Omit<PathPlannerPathDoc, "id">[] = [
        {
          name: "StartToHub",
          waypoints: [
            {
              anchor: { x: startX, y: hubY },
              prevControl: null,
              nextControl: { x: round2(startX + 0.6), y: hubY },
              isLocked: false,
              linkedName: null,
            },
            {
              anchor: { x: hubX, y: hubY },
              prevControl: { x: round2(hubX - 0.6), y: hubY },
              nextControl: null,
              isLocked: false,
              linkedName: null,
            },
          ],
          rotationTargets: [],
          eventMarkers: [],
          idealStartingState: { velocity: 0, rotation: 0 },
          goalEndState: { velocity: 0, rotation: 0 },
          reversed: false,
          useDefaultConstraints: true,
        },
        {
          name: "ThroughTrenchToNeutral",
          waypoints: [
            {
              anchor: { x: hubX, y: hubY },
              prevControl: null,
              nextControl: { x: round2(hubX - 0.65), y: round2(hubY + 1.2) },
              isLocked: false,
              linkedName: null,
            },
            {
              anchor: { x: round2(trenchX - 0.8), y: trenchY },
              prevControl: { x: round2(trenchX - 1.5), y: round2(trenchY - 0.35) },
              nextControl: { x: round2(trenchX + 0.7), y: trenchY },
              isLocked: false,
              linkedName: null,
            },
            {
              anchor: { x: fuelX, y: fuelY },
              prevControl: { x: round2(fuelX - 1.0), y: round2(trenchY - 0.15) },
              nextControl: null,
              isLocked: false,
              linkedName: null,
            },
          ],
          rotationTargets: [{ id: "rt-t1", waypointRelativePos: 1.15, rotationDegrees: -25 }],
          eventMarkers: [
            { id: "em-t1", name: "Coletar FUEL", waypointRelativePos: 1.25, commandName: "IntakeOn" },
          ],
          idealStartingState: { velocity: 0, rotation: 0 },
          goalEndState: { velocity: 0, rotation: -15 },
          reversed: false,
          useDefaultConstraints: true,
        },
        {
          name: "ReturnViaTrench",
          waypoints: [
            {
              anchor: { x: fuelX, y: fuelY },
              prevControl: null,
              nextControl: { x: round2(fuelX - 1.0), y: round2(trenchY - 0.1) },
              isLocked: false,
              linkedName: null,
            },
            {
              anchor: { x: round2(trenchX - 0.75), y: trenchY },
              prevControl: { x: round2(trenchX + 0.75), y: trenchY },
              nextControl: { x: round2(trenchX - 1.4), y: round2(trenchY - 0.45) },
              isLocked: false,
              linkedName: null,
            },
            {
              anchor: { x: hubX, y: hubY },
              prevControl: { x: round2(hubX - 0.7), y: round2(hubY + 1.1) },
              nextControl: null,
              isLocked: false,
              linkedName: null,
            },
          ],
          rotationTargets: [{ id: "rt-t2", waypointRelativePos: 1.4, rotationDegrees: 0 }],
          eventMarkers: [
            { id: "em-t2", name: "Mirar Hub", waypointRelativePos: 1.65, commandName: "ScoreFuel" },
          ],
          idealStartingState: { velocity: 0, rotation: -15 },
          goalEndState: { velocity: 0, rotation: 0 },
          reversed: false,
          useDefaultConstraints: true,
        },
      ];

      const steps: AutoStep[] = [
        {
          id: "t1",
          kind: "path",
          pathName: "StartToHub",
          durationSec: 1.6,
          startX,
          startY: hubY,
          endX: hubX,
          endY: hubY,
        },
        { id: "t2", kind: "named", commandName: "ScoreFuel", durationSec: 1.0 },
        {
          id: "t3",
          kind: "path",
          pathName: "ThroughTrenchToNeutral",
          durationSec: 3.1,
          startX: hubX,
          startY: hubY,
          endX: fuelX,
          endY: fuelY,
        },
        { id: "t4", kind: "named", commandName: "IntakeOn", durationSec: 0.8 },
        {
          id: "t5",
          kind: "path",
          pathName: "ReturnViaTrench",
          durationSec: 3.2,
          startX: fuelX,
          startY: fuelY,
          endX: hubX,
          endY: hubY,
        },
        { id: "t6", kind: "named", commandName: "ScoreFuel", durationSec: 1.0 },
      ];

      return {
        routine: {
          name: "2 Peças Trench",
          fileName: "TwoPieceTrench",
          source: "pathplanner",
          steps,
          discoveredNamedCommands: ["ScoreFuel", "IntakeOn"],
        },
        namedCommands: [
          { name: "ScoreFuel", request: scoreReq, waitForGoal: true, timeoutSec: 2.0 },
          { name: "IntakeOn", request: intakeReq, waitForGoal: false, timeoutSec: 2.0 },
        ],
        paths,
      };
    },
  },
  {
    id: "choreo-sprint",
    title: { pt: "Choreo Sprint Centro", en: "Choreo Center Sprint" },
    description: {
      pt: "Trajetória otimizada .traj (Ciprix ChoreoAuto) passando pelo Trench até a Zona Neutra.",
      en: "Time-optimal .traj Choreo trajectory straight to the Neutral Zone.",
    },
    source: "choreo",
    build: (fieldL, fieldW, reqs) => {
      const lm = getRebuilt2026Landmarks(fieldL, fieldW);
      const startY = round2(lm.blueTrenches[0].y1 + 0.45);
      const startX = round2(lm.blueAllianceLineX - 0.5);
      const endX = round2(lm.centerX - 0.35);
      const endY = round2(fieldW * 0.58);
      const intakeReq = pickRequest(reqs, /intake|collect|feed/i, 0);

      const paths: Omit<PathPlannerPathDoc, "id">[] = [
        {
          name: "CenterSprint",
          waypoints: [
            {
              anchor: { x: startX, y: startY },
              prevControl: null,
              nextControl: { x: round2(startX + 1.4), y: startY },
              isLocked: false,
              linkedName: null,
            },
            {
              anchor: { x: endX, y: endY },
              prevControl: { x: round2(endX - 1.5), y: round2(startY - 0.35) },
              nextControl: null,
              isLocked: false,
              linkedName: null,
            },
          ],
          rotationTargets: [{ id: "rt-c1", waypointRelativePos: 0.65, rotationDegrees: -20 }],
          eventMarkers: [
            { id: "em-c1", name: "Intake Centro", waypointRelativePos: 0.55, commandName: "IntakeOn" },
          ],
          idealStartingState: { velocity: 0, rotation: 0 },
          goalEndState: { velocity: 0, rotation: -20 },
          reversed: false,
          useDefaultConstraints: true,
        },
      ];

      const steps: AutoStep[] = [
        {
          id: "c1",
          kind: "path",
          pathName: "CenterSprint",
          durationSec: 2.8,
          startX,
          startY,
          endX,
          endY,
        },
        { id: "c2", kind: "named", commandName: "IntakeOn", durationSec: 1.2 },
      ];

      return {
        routine: {
          name: "Choreo Sprint",
          fileName: "CenterSprint",
          source: "choreo",
          steps,
          discoveredNamedCommands: ["IntakeOn"],
        },
        namedCommands: [
          { name: "IntakeOn", request: intakeReq, waitForGoal: false, timeoutSec: 2.0 },
        ],
        paths,
      };
    },
  },
];
