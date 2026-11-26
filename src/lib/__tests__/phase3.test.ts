import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseGradleErrorLine,
  pairWithBridge,
  streamGradleJob,
  type BridgeLogEvent,
} from "../bridge/client";
import {
  buildNextManifest,
  extractCustomBlocks,
  mergeCustomBlocks,
  planFolderSync,
  stripCustomBlocks,
} from "../local-folder";

describe("Phase 3 — Local Folder Sync, Custom Blocks, and FIRST Studio Bridge", () => {
  it("extracts, strips, and preserves named FIRST-STUDIO custom blocks in Java and non-Java files", () => {
    const diskJava = `package frc.robot.subsystems.roller;

public class Roller {
  public Roller() {}

  // FIRST-STUDIO:BEGIN custom helpers
  public boolean manualReady() {
    return true;
  }
  // FIRST-STUDIO:END
}
`;
    const generatedJava = `package frc.robot.subsystems.roller;

public class Roller {
  public Roller() {
    // updated
  }
}
`;
    const blocks = extractCustomBlocks(diskJava);
    expect(blocks.map((b) => b.name)).toEqual(["helpers"]);
    expect(stripCustomBlocks(diskJava)).not.toContain("manualReady");

    const { merged, preservedNames } = mergeCustomBlocks(
      generatedJava,
      diskJava,
      "src/main/java/frc/robot/subsystems/roller/Roller.java",
    );
    expect(preservedNames).toEqual(["helpers"]);
    expect(merged).toContain("// updated");
    expect(merged).toContain("public boolean manualReady()");
    expect(merged.trimEnd().endsWith("}")).toBe(true);

    const txtMerged = mergeCustomBlocks(
      "line 1\n",
      "line 1\n// FIRST-STUDIO:BEGIN custom extra\nfoo=bar\n// FIRST-STUDIO:END\n",
      "deploy/custom.txt",
    );
    expect(txtMerged.merged).toContain("foo=bar");
  });

  it("plans create, unchanged, update, and conflict entries via manifest SHA-256 and keeps disk conflicts on request", async () => {
    const v1Files = [
      { path: "Roller.java", content: "public class Roller {\n  int a = 1;\n}\n" },
      { path: "Keep.java", content: "public class Keep {}\n" },
    ];

    const initialPlan = await planFolderSync(v1Files, {}, null);
    expect(initialPlan.map((e) => e.status)).toEqual(["create", "create"]);

    const manifest1 = buildNextManifest("bot", null, initialPlan, {});
    const diskAfterInit: Record<string, string> = {
      "Roller.java": v1Files[0].content,
      "Keep.java": v1Files[1].content,
    };

    // Unchanged when content stays identical
    const samePlan = await planFolderSync(v1Files, diskAfterInit, manifest1);
    expect(samePlan.every((e) => e.status === "unchanged")).toBe(true);

    // Editing ONLY inside custom block does NOT trigger conflict
    const diskWithCustom = `public class Roller {
  int a = 1;

  // FIRST-STUDIO:BEGIN custom tuning
  int extra = 42;
  // FIRST-STUDIO:END
}
`;
    const v2Files = [
      { path: "Roller.java", content: "public class Roller {\n  int a = 2;\n}\n" },
      { path: "Keep.java", content: "public class Keep {}\n" },
    ];
    const cleanUpdatePlan = await planFolderSync(
      v2Files,
      { "Roller.java": diskWithCustom, "Keep.java": diskAfterInit["Keep.java"] },
      manifest1,
    );
    expect(cleanUpdatePlan[0].status).toBe("update");
    expect(cleanUpdatePlan[0].nextContent).toContain("int a = 2;");
    expect(cleanUpdatePlan[0].nextContent).toContain("int extra = 42;");

    // Editing outside custom block triggers modified_outside_studio conflict
    const diskEditedOutside = "public class Roller {\n  int a = 99;\n}\n";
    const conflictPlan = await planFolderSync(
      v2Files,
      { "Roller.java": diskEditedOutside, "Keep.java": diskAfterInit["Keep.java"] },
      manifest1,
    );
    expect(conflictPlan[0].status).toBe("conflict");
    expect(conflictPlan[0].reason).toBe("modified_outside_studio");

    // Pre-existing file with no manifest entry triggers untracked_existing conflict
    const untrackedPlan = await planFolderSync(
      [{ path: "New.java", content: "class New {}" }],
      { "New.java": "class Existing {}" },
      null,
    );
    expect(untrackedPlan[0].status).toBe("conflict");
    expect(untrackedPlan[0].reason).toBe("untracked_existing");

    // Keeping conflict leaves manifest hash intact so future runs continue noticing conflict
    const manifestAfterKeep = buildNextManifest("bot", manifest1, conflictPlan, {
      "Roller.java": "keep_disk",
    });
    expect(manifestAfterKeep.files["Roller.java"].sha256).toBe(
      manifest1.files["Roller.java"].sha256,
    );
  });

  it("parses Gradle error lines, pairs with Bridge, and streams SSE log + done events", async () => {
    expect(parseGradleErrorLine("Roller.java:14: error: cannot find symbol").isError).toBe(true);
    expect(parseGradleErrorLine("FAILURE: Build failed with an exception.").isError).toBe(true);
    expect(parseGradleErrorLine("> Task :compileJava UP-TO-DATE").isError).toBe(false);

    const mockFetch: typeof fetch = async (input) => {
      const url = String(input);
      if (url.endsWith("/pair")) {
        return new Response(JSON.stringify({ token: "tok-123" }), { status: 200 });
      }
      const ssePayload =
        'event: log\ndata: "> Task :build"\n\nevent: log\ndata: "Roller.java:5: error: bad"\n\nevent: done\ndata: {"exitCode":1}\n\n';
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(ssePayload));
          controller.close();
        },
      });
      return new Response(stream, { status: 200 });
    };

    const token = await pairWithBridge("A7K9P2", "http://127.0.0.1:47321", mockFetch);
    expect(token).toBe("tok-123");

    const events: BridgeLogEvent[] = [];
    await streamGradleJob("job-1", token, (e) => events.push(e), "http://127.0.0.1:47321", mockFetch);
    expect(events).toEqual([
      { type: "log", line: "> Task :build" },
      { type: "log", line: "Roller.java:5: error: bad" },
      { type: "done", exitCode: 1 },
    ]);
  });

  it("enforces loopback binding, PNA header, pairing, and path traversal safety in FirstStudioBridge.java", () => {
    const bridgeJava = fs.readFileSync(
      path.resolve(process.cwd(), "bridge/src/org/firststudio/bridge/FirstStudioBridge.java"),
      "utf8",
    );
    expect(bridgeJava).toContain('InetAddress.getByName("127.0.0.1")');
    expect(bridgeJava).toContain("Access-Control-Allow-Private-Network");
    expect(bridgeJava).toContain('server.createContext("/pair"');
    expect(bridgeJava).toContain('server.createContext("/roborio"');
    expect(bridgeJava).toContain('server.createContext("/sync"');
    expect(bridgeJava).toContain('server.createContext("/run"');
    expect(bridgeJava).toContain('!dest.startsWith(targetDir)');
  });
});
