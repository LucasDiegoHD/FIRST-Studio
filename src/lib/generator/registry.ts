import type { SubsystemConfig } from "../schema/ciprix-project";
import { generateSingleMotorSubsystem, type GeneratedFile } from "./subsystems/roller";

export type SubsystemGenerator = (
  subsystem: SubsystemConfig,
  basePackage: string,
) => GeneratedFile[];

export const SUBSYSTEM_GENERATORS: Record<SubsystemConfig["type"], SubsystemGenerator> = {
  roller: generateSingleMotorSubsystem,
  generic: generateSingleMotorSubsystem,
};

export function generateSubsystemFiles(
  subsystem: SubsystemConfig,
  basePackage: string,
): GeneratedFile[] {
  const generator = SUBSYSTEM_GENERATORS[subsystem.type];
  return generator(subsystem, basePackage);
}
