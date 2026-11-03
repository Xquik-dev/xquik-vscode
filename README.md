# Xquik X (Twitter) Data API & MCP for VS Code

Xquik is the world's fastest and cheapest X (Twitter) data API with the most complete X data. Xquik charges only for delivered, unique, filter-matching results and never pads rows.

Xquik is an independent third-party service. Not affiliated with X Corp. "Twitter" and "X" are trademarks of X Corp.

![Search results for X posts in a Markdown tab](https://raw.githubusercontent.com/Xquik-dev/xquik-vscode/main/media/screenshots/search-posts.png)

## What it does

This extension works in VS Code, VSCodium, Cursor & Windsurf.

- Search X posts and read the results in a Markdown tab.
- Look up an X profile by username or profile link.
- Add the hosted Xquik MCP server to your editor.

![An X profile in a Markdown tab](https://raw.githubusercontent.com/Xquik-dev/xquik-vscode/main/media/screenshots/look-up-profile.png)

## Install

### Extensions view

VSCodium, Cursor & Windsurf install it from Open VSX.

1. Open the Extensions view.
2. Search for `Xquik`.
3. Select **Install**.

### Command line

Run the line for your editor.

```sh
codium --install-extension xquik.xquik
cursor --install-extension xquik.xquik
windsurf --install-extension xquik.xquik
```

### VSIX file

VS Code installs the extension from a `.vsix` file.

1. Download the `.vsix` file from the [latest release](https://github.com/Xquik-dev/xquik-vscode/releases/latest).
2. Open the Extensions view menu.
3. Select **Install from VSIX**.

## Sign in

1. Copy an API key from [your account page](https://dashboard.xquik.com/en/account?tab=api-keys).
2. Open the Command Palette.
3. Run **Sign In With API Key** from the Xquik category.
4. Paste your key.

A command that needs a key asks you to sign in first.

## Use the MCP server

The hosted server lives at `https://xquik.com/mcp`. It gives your AI assistant X data.

![The Xquik MCP server in the editor](https://raw.githubusercontent.com/Xquik-dev/xquik-vscode/main/media/screenshots/mcp-server.png)

### VS Code & VSCodium

The extension adds the server for you. Start it from the MCP server list.

The server uses your API key after you sign in. Signing in or out restarts the server.

VSCodium hides MCP servers until you turn on AI features. After you sign in, select **Turn On AI Features**. You can also set `chat.disableAIFeatures` to `false` in Settings.

### Cursor

The extension adds the server for you. Open Cursor Settings, then Tools & MCP, to see it.

The server uses your API key after you sign in. Signing in or out updates the server.

### Windsurf

1. Run **Copy MCP Config** from the Xquik category.
2. Open `mcp_config.json` from the Cascade MCP menu.
3. Paste the config.
4. Enable Xquik.

The config holds no secret. Cascade runs Xquik OAuth when you enable the server.

## Commands

| Command              | What it does                                                       |
| -------------------- | ------------------------------------------------------------------ |
| Sign In With API Key | Saves your key once Xquik accepts it.                              |
| Sign Out             | Removes your key from this editor.                                 |
| Search X Posts       | Opens up to 20 matching posts in a Markdown tab.                   |
| Look Up X Profile    | Opens a profile in a Markdown tab.                                 |
| Copy MCP Config      | Copies the server config. It appears only in editors that need it. |

Each command takes 1 optional text argument. A keybinding can skip the prompt with `args`.

```json
{ "key": "ctrl+alt+x", "command": "xquik.searchPosts", "args": "from:NASA" }
```

## Prices

Reads start at $0.00015 per post and per profile. A search returns up to 20 posts.

## Limits

- A search or profile lookup needs an API key and credits.
- A search opens 1 page of up to 20 posts.
- The commands only read X data. They never post, like or follow.
- The MCP server can also act through X accounts you connect on xquik.com.

## Privacy

- Your key lives in your editor's secret storage.
- Your key goes only to xquik.com.
- The extension sends no telemetry.

## Links

- [Xquik](https://xquik.com)
- [MCP docs](https://docs.xquik.com/mcp/overview)
- [Trust](https://xquik.com/trust)
