#!/usr/bin/env node
/**
 * Thin stdio MCP proxy for Frosh.
 *
 * Local clients (Claude Desktop, Cursor, any mcp.json stdio launcher) talk
 * JSON-RPC on stdin/stdout. Every frame is forwarded to the hosted
 * Streamable HTTP server so tools/list and tools/call never drift from
 * https://frosh.org/mcp.
 *
 * Public docs/blog tools need no auth. Optional FROSH_API_KEY is sent as
 * Authorization: Bearer for wiki_* tools on the caller's own cloud wiki.
 */
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_MCP_URL = "https://frosh.org/mcp";

function packageVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8"));
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function printHelp(): void {
  const version = packageVersion();
  process.stdout.write(`frosh-mcp ${version}

Stdio MCP server that proxies to Frosh's hosted Streamable HTTP endpoint.

Usage:
  npx -y frosh-mcp

Environment:
  FROSH_MCP_URL   Remote MCP URL (default: ${DEFAULT_MCP_URL})
  FROSH_API_KEY   Optional Bearer token for wiki_* tools on your Frosh cloud wiki

This process speaks MCP over stdin/stdout. Do not run it interactively
unless a client is attached.
`);
}

export function resolveRemoteUrl(raw = process.env.FROSH_MCP_URL): string {
  const value = raw?.trim() || DEFAULT_MCP_URL;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid FROSH_MCP_URL: ${value}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`FROSH_MCP_URL must be http(s), got ${url.protocol}`);
  }
  return url.href;
}

function requestInitFromEnv(): RequestInit | undefined {
  const key = process.env.FROSH_API_KEY?.trim();
  if (!key) return undefined;
  return {
    headers: {
      Authorization: `Bearer ${key}`,
    },
  };
}

function protocolVersionOf(message: unknown): string | undefined {
  if (!message || typeof message !== "object" || !("result" in message)) {
    return undefined;
  }
  const result = (message as { result?: { protocolVersion?: unknown } }).result;
  const version = result?.protocolVersion;
  return typeof version === "string" && version.length > 0 ? version : undefined;
}

type MessageTransport = {
  onmessage?: ((message: unknown) => void) | null;
  onerror?: ((error: Error) => void) | null;
  onclose?: (() => void) | null;
  send: (message: unknown) => Promise<void>;
  start: () => Promise<void>;
  close: () => Promise<void>;
};

function pipe(a: MessageTransport, b: MessageTransport): void {
  a.onmessage = (message) => {
    void b.send(message).catch((err) => {
      a.onerror?.(err instanceof Error ? err : new Error(String(err)));
    });
  };
  b.onmessage = (message) => {
    void a.send(message).catch((err) => {
      b.onerror?.(err instanceof Error ? err : new Error(String(err)));
    });
  };
}

export async function startProxy(remoteUrl = resolveRemoteUrl()): Promise<void> {
  const stdio = new StdioServerTransport() as unknown as MessageTransport;
  const http = new StreamableHTTPClientTransport(new URL(remoteUrl), {
    requestInit: requestInitFromEnv(),
  }) as unknown as MessageTransport & {
    setProtocolVersion?: (version: string) => void;
  };

  pipe(stdio, http);

  // After initialize, send the negotiated version on later HTTP requests
  // (MCP 2025-06-18). The hosted server accepts the request either way.
  const previousHttpOnMessage = http.onmessage;
  http.onmessage = (message) => {
    const version = protocolVersionOf(message);
    if (version) http.setProtocolVersion?.(version);
    previousHttpOnMessage?.(message);
  };

  let closing = false;
  const shutdown = async (code: number) => {
    if (closing) return;
    closing = true;
    await Promise.allSettled([http.close(), stdio.close()]);
    process.exit(code);
  };

  stdio.onclose = () => {
    void shutdown(0);
  };
  http.onclose = () => {
    void shutdown(0);
  };
  stdio.onerror = (error) => {
    process.stderr.write(
      `[frosh-mcp] stdio: ${error instanceof Error ? error.message : String(error)}\n`,
    );
  };
  http.onerror = (error) => {
    process.stderr.write(
      `[frosh-mcp] http: ${error instanceof Error ? error.message : String(error)}\n`,
    );
  };

  process.once("SIGINT", () => {
    void shutdown(0);
  });
  process.once("SIGTERM", () => {
    void shutdown(0);
  });

  await http.start();
  await stdio.start();
}

function isCliFlag(name: string): boolean {
  return process.argv.includes(name);
}

if (isCliFlag("--help") || isCliFlag("-h")) {
  printHelp();
  process.exit(0);
}
if (isCliFlag("--version") || isCliFlag("-v")) {
  process.stdout.write(`${packageVersion()}\n`);
  process.exit(0);
}

startProxy().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
