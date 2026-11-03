# Frosh MCP Server: search and read the Frosh docs from any AI agent

Read-only [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server for [Frosh](https://frosh.org), the platform for private MediaWiki sites: a cloud-hosted wiki portal at frosh.org and a desktop app for fully local wikis.

**Website:** [frosh.org](https://frosh.org) · **Docs:** [frosh.org/docs](https://frosh.org/docs) · **MCP docs:** [frosh.org/docs/mcp-server](https://frosh.org/docs/mcp-server)

> **Status: launching.** The hosted endpoint below is being rolled out and may not answer yet. Watch this repo for the launch.

| | |
|---|---|
| Endpoint (launching) | `https://frosh.org/mcp` |
| Transport | Streamable HTTP (stateless, JSON responses) |
| Auth | None. Public, read-only |
| Registry name | `org.frosh/mcp` (see [`server.json`](server.json)) |

## Tools

All tools are read-only and idempotent. They only see public frosh.org documentation, blog posts and the product overview. They cannot see or change any wiki, account or backup.

| Tool | What it does |
|---|---|
| `search_pages` | Full-text search over the public Frosh docs, blog and overview (`query`, optional `section`: overview, docs or blog, `limit` 1–20) |
| `read_page` | Full text of one public page by `slug`, e.g. `docs/quickstart` |
| `list_pages` | Every public page the server can read, optionally filtered by `section` |
| `about_frosh` | What Frosh is, plus key links (docs, quickstart, blog, desktop download) |

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

This public server is docs-only. To manage pages, users and backups on your own wiki, use the local MCP that ships with the `froshwiki` CLI. See [MCP setup](https://frosh.org/docs/mcp-server).

## Links

- [frosh.org](https://frosh.org)
- [Docs](https://frosh.org/docs) · [Blog](https://frosh.org/blog) · [Desktop app](https://frosh.org/desktop-download)
- [Contact](https://frosh.org/contact) · [Issues](../../issues)

## License

[MIT](LICENSE) © Terahertz, Inc.
