"use client";

import React, { useEffect, useRef, useState } from "react";
import { Hammer, Link2, Play, Radio, Rocket, Terminal, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_BRIDGE_URL,
  arrayBufferToBase64,
  checkBridgeHealth,
  pairWithBridge,
  parseGradleErrorLine,
  probeRoboRio,
  startGradleJob,
  streamGradleJob,
  syncProjectToBridge,
  type BridgeHealth,
  type BridgeSyncFile,
  type GradleTask,
  type RoboRioStatus,
} from "@/lib/bridge/client";
import { generateProjectFiles } from "@/lib/generator";
import { collectSkeletonAssets } from "@/lib/local-folder";
import type { CiprixProject } from "@/lib/schema/ciprix-project";

const TOKEN_STORAGE_KEY = "firstStudio_bridgeToken_v1";

interface BridgeDeployPanelProps {
  project: CiprixProject;
  hasLocalFolder: boolean;
  onSyncLocalBeforeRun?: () => Promise<boolean>;
}

export function BridgeDeployPanel({
  project,
  hasLocalFolder,
  onSyncLocalBeforeRun,
}: BridgeDeployPanelProps) {
  const [bridgeUrl, setBridgeUrl] = useState(DEFAULT_BRIDGE_URL);
  const [pairCode, setPairCode] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [health, setHealth] = useState<BridgeHealth | null>(null);
  const [rioStatus, setRioStatus] = useState<RoboRioStatus | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [runningTask, setRunningTask] = useState<GradleTask | null>(null);
  const [lastExitCode, setLastExitCode] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(TOKEN_STORAGE_KEY);
      if (saved) setToken(saved);
    } catch {
      // Ignore storage errors
    }
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleConnect = async () => {
    setConnecting(true);
    setErrorMsg(null);
    try {
      const h = await checkBridgeHealth(bridgeUrl);
      setHealth(h);
      const tok = await pairWithBridge(pairCode, bridgeUrl);
      setToken(tok);
      try {
        sessionStorage.setItem(TOKEN_STORAGE_KEY, tok);
      } catch {
        // Ignore storage errors
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Falha ao conectar no Bridge");
    } finally {
      setConnecting(false);
    }
  };

  const handleProbeRio = async () => {
    if (!token) return;
    setErrorMsg(null);
    try {
      const res = await probeRoboRio(project.project.teamNumber, token, bridgeUrl);
      setRioStatus(res);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Falha ao verificar roboRIO");
    }
  };

  const handleRunTask = async (task: GradleTask) => {
    if (!token || runningTask) return;
    setErrorMsg(null);
    setRunningTask(task);
    setLastExitCode(null);
    setLogs([]);

    try {
      if (hasLocalFolder && onSyncLocalBeforeRun) {
        const ok = await onSyncLocalBeforeRun();
        if (!ok) {
          setRunningTask(null);
          return;
        }
      } else {
        setLogs([`Enviando arquivos para o Bridge (${project.project.name})...`]);
        const skeleton = await collectSkeletonAssets(project, true);
        const generated = generateProjectFiles(project);
        const files: BridgeSyncFile[] = [
          ...generated.map((f) => ({ path: f.path, content: f.content, encoding: "utf8" as const })),
          ...skeleton.textFiles.map((f) => ({ path: f.path, content: f.content, encoding: "utf8" as const })),
          ...skeleton.binaryFiles.map((b) => ({
            path: b.path,
            content: arrayBufferToBase64(b.data),
            encoding: "base64" as const,
          })),
        ];
        const syncRes = await syncProjectToBridge(
          project.project.name,
          files,
          token,
          bridgeUrl,
        );
        setLogs((prev) => [...prev, `Sincronizado (${syncRes.written} arquivos) em ${syncRes.folder}`]);
      }

      const jobId = await startGradleJob(task, project.project.name, token, bridgeUrl);
      await streamGradleJob(
        jobId,
        token,
        (ev) => {
          if (ev.type === "log" && ev.line !== undefined) {
            setLogs((prev) => [...prev, ev.line!]);
          } else if (ev.type === "done" && ev.exitCode !== undefined) {
            setLastExitCode(ev.exitCode);
          }
        },
        bridgeUrl,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao executar Gradle no Bridge";
      setErrorMsg(msg);
      setLogs((prev) => [...prev, `ERROR: ${msg}`]);
      setLastExitCode(1);
    } finally {
      setRunningTask(null);
    }
  };

  return (
    <Card className="p-4 space-y-4 border-[#2c3f61] bg-[#0f1624]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-cyan-300" />
          <h3 className="font-headline text-sm font-semibold text-white">
            FIRST Studio Bridge (Local → Gradle / roboRIO)
          </h3>
          <Badge variant={token ? "success" : "outline"}>
            {token ? "Pareado" : "Desconectado"}
          </Badge>
          {health?.folder && (
            <span className="font-mono text-[11px] text-slate-400 truncate max-w-[260px]">
              {health.folder}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={bridgeUrl}
            onChange={(e) => setBridgeUrl(e.target.value)}
            className="h-8 w-44 font-mono text-xs"
            placeholder={DEFAULT_BRIDGE_URL}
          />
          <Input
            value={pairCode}
            onChange={(e) => setPairCode(e.target.value.toUpperCase())}
            className="h-8 w-28 font-mono text-xs uppercase"
            placeholder="Código (6)"
            maxLength={6}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={connecting || pairCode.trim().length < 4}
            onClick={() => void handleConnect()}
          >
            <Link2 className="h-3.5 w-3.5" />
            {connecting ? "Conectando..." : "Conectar"}
          </Button>
        </div>
      </div>

      {!token && (
        <p className="rounded border border-[#22304a] bg-[#0b0f17] px-3 py-2 font-mono text-[11px] text-slate-300">
          Rode no notebook da Driver Station:{" "}
          <span className="text-[#93c5fd]">
            java -jar bridge/dist/first-studio-bridge.jar
          </span>{" "}
          (use <span className="text-slate-400">--folder &quot;...&quot;</span> se quiser apontar direto para a pasta conectada) e cole o Pair Code acima.
        </p>
      )}

      {errorMsg && (
        <p className="rounded border border-rose-500/60 bg-rose-950/30 px-3 py-2 text-xs text-rose-200">
          {errorMsg}
        </p>
      )}

      {token && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#22304a] pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={Boolean(runningTask)}
              onClick={() => void handleRunTask("build")}
            >
              <Hammer className="h-3.5 w-3.5 text-sky-300" />
              gradlew build
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={Boolean(runningTask)}
              onClick={() => void handleRunTask("simulateJava")}
            >
              <Play className="h-3.5 w-3.5 text-emerald-300" />
              gradlew simulateJava
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={Boolean(runningTask)}
              onClick={() => void handleRunTask("deploy")}
            >
              <Rocket className="h-3.5 w-3.5" />
              gradlew deploy
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => void handleProbeRio()}>
              <Wifi className="h-3.5 w-3.5 text-cyan-300" />
              Testar roboRIO #{project.project.teamNumber}
            </Button>
            {rioStatus && (
              <Badge variant={rioStatus.reachable ? "success" : "destructive"} className="gap-1">
                <Radio className="h-3 w-3" />
                {rioStatus.reachable
                  ? `${rioStatus.address} (${rioStatus.mode})`
                  : "roboRIO offline"}
              </Badge>
            )}
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>
              {runningTask ? `Executando gradlew ${runningTask}...` : "Saída do Bridge"}
            </span>
            {lastExitCode !== null && (
              <Badge variant={lastExitCode === 0 ? "success" : "destructive"}>
                exit {lastExitCode}
              </Badge>
            )}
          </div>
          <pre className="max-h-56 overflow-auto rounded-lg border border-[#22304a] bg-[#070b12] p-3 font-mono text-[11px] leading-relaxed">
            {logs.map((raw, i) => {
              const parsed = parseGradleErrorLine(raw);
              return (
                <div
                  key={`log-${i}`}
                  className={parsed.isError ? "text-rose-300 bg-rose-950/30 px-1 rounded" : "text-slate-300"}
                >
                  {parsed.line}
                </div>
              );
            })}
            <div ref={logEndRef} />
          </pre>
        </div>
      )}
    </Card>
  );
}
