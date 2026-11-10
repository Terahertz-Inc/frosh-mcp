#!/usr/bin/env node
/**
 * Local smoke: spawn dist/index.js, send initialize + tools/list over stdio,
 * assert org.frosh/mcp and at least the public docs tools.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bin = join(root, "dist", "index.js");

function send(child, msg) {
  child.stdin.write(JSON.stringify(msg) + "\n");
}

function readFrames(buf) {
  const lines = buf.split(/\r?\n/).filter(Boolean);
  const out = [];
  for (const line of lines) {
    try {
      out.push(JSON.parse(line));
    } catch {
      // ignore non-JSON (stderr already separate)
    }
  }
  return out;
}

async function main() {
  const child = spawn(process.execPath, [bin], {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env },
  });

  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  const waitForId = (id, timeoutMs = 20000) =>
    new Promise((resolve, reject) => {
      const start = Date.now();
      const tick = () => {
        const frames = readFrames(stdout);
        const hit = frames.find((f) => f && f.id === id);
        if (hit) return resolve(hit);
        if (Date.now() - start > timeoutMs) {
          return reject(
            new Error(
              `timeout waiting for id=${id}\nstdout:\n${stdout}\nstderr:\n${stderr}`,
            ),
          );
        }
        setTimeout(tick, 50);
      };
      tick();
    });

  send(child, {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "frosh-mcp-smoke", version: "0.0.1" },
    },
  });

  const init = await waitForId(1);
  if (init.error) throw new Error(`initialize error: ${JSON.stringify(init.error)}`);
  const serverInfo = init.result?.serverInfo;
  if (!serverInfo?.name) throw new Error(`no serverInfo in ${JSON.stringify(init)}`);
  if (serverInfo.name !== "org.frosh/mcp") {
    throw new Error(`unexpected server name: ${serverInfo.name}`);
  }

  send(child, { jsonrpc: "2.0", method: "notifications/initialized" });
  send(child, { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });

  const toolsResp = await waitForId(2);
  if (toolsResp.error) {
    throw new Error(`tools/list error: ${JSON.stringify(toolsResp.error)}`);
  }
  const tools = toolsResp.result?.tools ?? [];
  const names = tools.map((t) => t.name);
  const required = ["about_frosh", "list_pages", "search_pages", "read_page"];
  const missing = required.filter((n) => !names.includes(n));
  if (missing.length) {
    throw new Error(`missing tools ${missing.join(", ")}; got ${names.join(", ")}`);
  }

  child.kill("SIGTERM");
  console.log(
    JSON.stringify(
      {
        ok: true,
        server: serverInfo,
        toolCount: names.length,
        tools: names,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
