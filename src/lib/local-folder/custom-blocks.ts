export interface CustomBlock {
  name: string;
  rawBlock: string;
}

const BEGIN_RE = /^[ \t]*\/\/\s*FIRST-STUDIO:BEGIN\s+custom\s+([A-Za-z0-9_.-]+)[ \t]*$/;
const END_RE = /^[ \t]*\/\/\s*FIRST-STUDIO:END[ \t]*$/;

export function extractCustomBlocks(content: string): CustomBlock[] {
  const lines = content.split(/\r?\n/);
  const blocks: CustomBlock[] = [];
  let activeName: string | null = null;
  let buffer: string[] = [];

  for (const line of lines) {
    if (activeName === null) {
      const m = line.match(BEGIN_RE);
      if (m) {
        activeName = m[1];
        buffer = [line];
      }
      continue;
    }

    buffer.push(line);
    if (END_RE.test(line)) {
      blocks.push({ name: activeName, rawBlock: buffer.join("\n") });
      activeName = null;
      buffer = [];
    }
  }

  return blocks;
}

export function stripCustomBlocks(content: string): string {
  const lines = content.split(/\r?\n/);
  const kept: string[] = [];
  let inside = false;

  for (const line of lines) {
    if (!inside) {
      if (BEGIN_RE.test(line)) {
        inside = true;
      } else {
        kept.push(line);
      }
      continue;
    }
    if (END_RE.test(line)) {
      inside = false;
    }
  }

  return kept
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== "")
    .join("\n");
}

export function mergeCustomBlocks(
  generatedContent: string,
  diskContent: string,
  filePath?: string,
): { merged: string; preservedNames: string[] } {
  const diskBlocks = extractCustomBlocks(diskContent);
  if (diskBlocks.length === 0) {
    return { merged: generatedContent, preservedNames: [] };
  }

  const diskByName = new Map(diskBlocks.map((b) => [b.name, b.rawBlock]));
  const replaced = new Set<string>();

  // Replace matching named markers already present in generatedContent
  const genLines = generatedContent.split(/\r?\n/);
  const outLines: string[] = [];
  let skippingName: string | null = null;

  for (const line of genLines) {
    if (skippingName !== null) {
      if (END_RE.test(line)) {
        skippingName = null;
      }
      continue;
    }

    const beginMatch = line.match(BEGIN_RE);
    if (beginMatch && diskByName.has(beginMatch[1])) {
      const blockName = beginMatch[1];
      outLines.push(diskByName.get(blockName)!);
      replaced.add(blockName);
      skippingName = blockName;
      continue;
    }

    outLines.push(line);
  }

  let merged = outLines.join("\n");
  const unplaced = diskBlocks.filter((b) => !replaced.has(b.name));

  if (unplaced.length > 0) {
    const extraChunk = unplaced.map((b) => b.rawBlock).join("\n\n");
    const isJava = filePath
      ? filePath.endsWith(".java")
      : /\bclass\s+\w+|\binterface\s+\w+|\benum\s+\w+/.test(merged);

    if (isJava) {
      const lastBraceIdx = merged.lastIndexOf("}");
      if (lastBraceIdx !== -1) {
        const before = merged.slice(0, lastBraceIdx).replace(/\s+$/, "");
        const after = merged.slice(lastBraceIdx);
        merged = `${before}\n\n  ${extraChunk.trimStart()}\n${after}`;
      } else {
        merged = `${merged.replace(/\s+$/, "")}\n\n${extraChunk}\n`;
      }
    } else {
      merged = `${merged.replace(/\s+$/, "")}\n\n${extraChunk}\n`;
    }
  }

  return {
    merged,
    preservedNames: diskBlocks.map((b) => b.name),
  };
}
