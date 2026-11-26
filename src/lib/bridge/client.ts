export const DEFAULT_BRIDGE_URL = "http://127.0.0.1:47321";

export type GradleTask = "build" | "deploy" | "simulateJava";

export interface BridgeHealth {
  ok: boolean;
  version: string;
  folder: string | null;
  jdkVersion: string;
  activeJob: string | null;
}

export interface RoboRioStatus {
  reachable: boolean;
  address: string | null;
  mode: "usb" | "ethernet" | "mdns" | "none";
  checked: string[];
}

export interface BridgeSyncFile {
  path: string;
  content: string;
  encoding?: "utf8" | "base64";
}

export interface BridgeLogEvent {
  type: "log" | "done";
  line?: string;
  exitCode?: number;
}

export interface ParsedGradleLine {
  line: string;
  isError: boolean;
}

export function parseGradleErrorLine(line: string): ParsedGradleLine {
  const isError =
    /\berror:/i.test(line) ||
    /^FAILURE:/.test(line) ||
    /^ERROR:/.test(line) ||
    /\.java:\d+:/.test(line);
  return { line, isError };
}

function cleanBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export async function checkBridgeHealth(
  baseUrl = DEFAULT_BRIDGE_URL,
  fetchImpl: typeof fetch = fetch,
): Promise<BridgeHealth> {
  const res = await fetchImpl(`${cleanBaseUrl(baseUrl)}/health`);
  if (!res.ok) {
    throw new Error(`Bridge /health failed (${res.status})`);
  }
  return (await res.json()) as BridgeHealth;
}

export async function pairWithBridge(
  code: string,
  baseUrl = DEFAULT_BRIDGE_URL,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const res = await fetchImpl(`${cleanBaseUrl(baseUrl)}/pair`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: code.trim().toUpperCase() }),
  });
  if (!res.ok) {
    throw new Error(
      res.status === 401
        ? "Código de pareamento inválido"
        : `Falha ao parear com o Bridge (${res.status})`,
    );
  }
  const data = (await res.json()) as { token: string };
  return data.token;
}

export async function probeRoboRio(
  teamNumber: number,
  token: string,
  baseUrl = DEFAULT_BRIDGE_URL,
  fetchImpl: typeof fetch = fetch,
): Promise<RoboRioStatus> {
  const res = await fetchImpl(
    `${cleanBaseUrl(baseUrl)}/roborio?team=${encodeURIComponent(String(teamNumber))}`,
    {
      headers: { "X-Bridge-Token": token },
    },
  );
  if (!res.ok) {
    throw new Error(`Falha ao verificar roboRIO (${res.status})`);
  }
  return (await res.json()) as RoboRioStatus;
}

export async function syncProjectToBridge(
  projectName: string,
  files: BridgeSyncFile[],
  token: string,
  baseUrl = DEFAULT_BRIDGE_URL,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: boolean; written: number; folder: string }> {
  const res = await fetchImpl(`${cleanBaseUrl(baseUrl)}/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Bridge-Token": token,
    },
    body: JSON.stringify({ projectName, files }),
  });
  if (!res.ok) {
    throw new Error(`Falha ao enviar arquivos para o Bridge (${res.status})`);
  }
  return (await res.json()) as { ok: boolean; written: number; folder: string };
}

export async function startGradleJob(
  task: GradleTask,
  projectName: string,
  token: string,
  baseUrl = DEFAULT_BRIDGE_URL,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const res = await fetchImpl(`${cleanBaseUrl(baseUrl)}/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Bridge-Token": token,
    },
    body: JSON.stringify({ task, projectName }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Falha ao iniciar ./gradlew ${task} (${res.status})`);
  }
  const data = (await res.json()) as { jobId: string };
  return data.jobId;
}

export async function streamGradleJob(
  jobId: string,
  token: string,
  onEvent: (event: BridgeLogEvent) => void,
  baseUrl = DEFAULT_BRIDGE_URL,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const res = await fetchImpl(
    `${cleanBaseUrl(baseUrl)}/jobs/${encodeURIComponent(jobId)}/stream`,
    {
      headers: { "X-Bridge-Token": token },
    },
  );
  if (!res.ok || !res.body) {
    throw new Error(`Falha ao ler stream do Bridge (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const processBlock = (block: string) => {
    let eventName = "message";
    const dataLines: string[] = [];
    for (const rawLine of block.split(/\r?\n/)) {
      if (rawLine.startsWith("event:")) {
        eventName = rawLine.slice("event:".length).trim();
      } else if (rawLine.startsWith("data:")) {
        dataLines.push(rawLine.slice("data:".length).trim());
      }
    }
    if (dataLines.length === 0) return;
    const rawData = dataLines.join("\n");
    try {
      const parsed = JSON.parse(rawData) as unknown;
      if (eventName === "log" && typeof parsed === "string") {
        onEvent({ type: "log", line: parsed });
      } else if (
        eventName === "done" &&
        typeof parsed === "object" &&
        parsed !== null &&
        "exitCode" in parsed
      ) {
        onEvent({
          type: "done",
          exitCode: Number((parsed as { exitCode: number }).exitCode),
        });
      }
    } catch {
      onEvent({ type: "log", line: rawData });
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sepIdx = buffer.indexOf("\n\n");
    while (sepIdx !== -1) {
      const block = buffer.slice(0, sepIdx);
      buffer = buffer.slice(sepIdx + 2);
      if (block.trim()) processBlock(block);
      sepIdx = buffer.indexOf("\n\n");
    }
  }
  if (buffer.trim()) {
    processBlock(buffer);
  }
}

export function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
