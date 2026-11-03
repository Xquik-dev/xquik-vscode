# Xquik for VS Code

[![Convex Component](https://www.convex.dev/components/badge/convex-xquik)](https://www.convex.dev/components/convex-xquik)

X (Twitter) data API & hosted MCP server for VS Code, VSCodium, Cursor & Windsurf. Not affiliated with X Corp.

> Xquik is an independent third-party service. Not affiliated with X Corp.
> "Twitter" and "X" are trademarks of X Corp.

## What you get

- Commands that search X posts and look up X profiles.
- The hosted Xquik MCP server in your editor's agent.
- Your API key kept in your editor's secret storage.

## Use the commands

Open the command palette and type `Xquik`. Sign in first with an Xquik API key that starts with `xq_`.

| Command | What it does |
| --- | --- |
| `Xquik: Sign In With API Key` | Saves your key in secret storage. |
| `Xquik: Sign Out` | Deletes the saved key. |
| `Xquik: Search X Posts` | Searches public X posts. |
| `Xquik: Look Up X Profile` | Shows a public X profile. |
| `Xquik: Copy MCP Config` | Copies the MCP server config. |

## Connect the MCP server

Cursor gets the server from the extension. Editors with built-in MCP support do too.
Windsurf reads `mcp_config.json`, so run `Xquik: Copy MCP Config` and paste the result there.

```json
{
  "mcpServers": {
    "xquik": { "serverUrl": "https://xquik.com/mcp" }
  }
}
```

Read the [MCP guide](https://docs.xquik.com/mcp/overview) for every tool.
