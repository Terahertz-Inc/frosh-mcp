# Frosh MCP Server: search and read the Frosh docs from any AI agent

[![MCP Registry](https://img.shields.io/badge/MCP%20Registry-listed-green)](https://registry.modelcontextprotocol.io/v0.1/servers?search=org.frosh%2Fmcp)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)


Read-only [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server for [Frosh](https://frosh.org), the platform for private MediaWiki sites: a cloud-hosted wiki portal at frosh.org and a desktop app for fully local wikis.

**Website:** [frosh.org](https://frosh.org) · **Docs:** [frosh.org/docs](https://frosh.org/docs) · **MCP docs:** [frosh.org/docs/mcp-server](https://frosh.org/docs/mcp-server)

| | |
|---|---|
| Endpoint | `https://frosh.org/mcp` |
| Transport | Streamable HTTP (stateless, JSON responses) |
| Auth | None for public docs/blog tools. Optional Bearer API key for `wiki_*` tools on your own Frosh cloud wiki |
| Registry name | `org.frosh/mcp` (see [`server.json`](server.json)) |
| npm package | [`frosh-mcp`](https://www.npmjs.com/package/frosh-mcp) (stdio proxy) |

## Tools

Public tools are read-only and idempotent. They only see public frosh.org documentation, blog posts and the product overview. They cannot see or change any wiki, account or backup.

| Tool | What it does |
|---|---|
| `search_pages` | Full-text search over the public Frosh docs, blog and overview (`query`, optional `section`: overview, docs or blog, `limit` 1–20) |
| `read_page` | Full text of one public page by `slug`, e.g. `docs/quickstart` |
| `list_pages` | Every public page the server can read, optionally filtered by `section` |
| `about_frosh` | What Frosh is, plus key links (docs, quickstart, blog, desktop download) |

`wiki_*` tools (when present on the live server) act on the caller's own Frosh cloud wiki and need a Frosh API key as a Bearer token. They are not covered by the public read-only guarantee above.

## Install

### Claude (custom connector) and other Streamable HTTP clients

Add a remote MCP server with the URL `https://frosh.org/mcp`.

### Cursor

`.cursor/mcp.json` or `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "frosh": { "url": "https://frosh.org/mcp" }
  }
}
```

### Clients that only speak stdio (Claude Desktop, etc.)

```json
{
  "mcpServers": {
    "frosh": {
      "command": "npx",
      "args": ["-y", "frosh-mcp"]
    }
  }
}
```

Optional wiki API key:

```json
{
  "mcpServers": {
    "frosh": {
      "command": "npx",
      "args": ["-y", "frosh-mcp"],
      "env": {
        "FROSH_API_KEY": "your-frosh-api-key"
      }
    }
  }
}
```

You can also use a generic remote bridge:

```json
{
  "mcpServers": {
    "frosh": { "command": "npx", "args": ["-y", "mcp-remote", "https://frosh.org/mcp"] }
  }
}
```

### Muse and other agents with a settings file

```json
{
  "mcpServers": {
    "frosh": { "transport": "streamable_http", "url": "https://frosh.org/mcp" }
  }
}
```

## Example prompts

- "What is Frosh and how is it different from hosting MediaWiki myself?"
- "Search the Frosh docs for backups and summarize how they work."
- "Read the Frosh quickstart and walk me through setting up a private wiki."

## Managing your own wiki

Public tools are docs-only. To manage pages, users and backups on your own wiki, use the local MCP that ships with the `froshwiki` CLI, or pass `FROSH_API_KEY` / an `Authorization: Bearer` header to the hosted endpoint. See [MCP setup](https://frosh.org/docs/mcp-server).

## Links

- [frosh.org](https://frosh.org)
- [Docs](https://frosh.org/docs) · [Blog](https://frosh.org/blog) · [Desktop app](https://frosh.org/desktop-download)
- [Contact](https://frosh.org/contact) · [Issues](../../issues)

## License

[MIT](LICENSE) © Terahertz, Inc.
