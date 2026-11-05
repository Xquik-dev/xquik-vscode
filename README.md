# Twitter MCP for VSCode, Cursor & Windsurf by Xquik

This VSCode extension adds the Xquik Twitter MCP server & X post search to your editor.

Xquik is the world's fastest and cheapest X (Twitter) data API with the most complete X data. Xquik charges only for delivered, unique, filter-matching results and never pads rows.

Xquik is an independent third-party service. Not affiliated with X Corp. "Twitter" and "X" are trademarks of X Corp.

![Search results for X posts in a Markdown tab](https://raw.githubusercontent.com/Xquik-dev/xquik-vscode/main/media/screenshots/search-posts.png)

## What it does

This extension works in VS Code, VSCodium, Cursor & Windsurf.

- Search X posts and read the results in a Markdown tab.
- Look up an X profile by username or profile link.
- Add the hosted Xquik MCP server to your editor.

![An X profile in a Markdown tab](https://raw.githubusercontent.com/Xquik-dev/xquik-vscode/main/media/screenshots/look-up-profile.png)

## Install the Twitter MCP for VSCode

Run the line for your editor.

```sh
codium --install-extension xquik.xquik
cursor --install-extension xquik.xquik
windsurf --install-extension xquik.xquik
```

### Extensions view

VSCodium, Cursor & Windsurf install it from Open VSX.

1. Open the Extensions view.
2. Search for `Xquik`.
3. Select **Install**.

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

## Use the X MCP server

The hosted server URL is `https://xquik.com/mcp`. Your AI assistant reads X data through it.
Any MCP client can add it with this config.

```json
{ "mcpServers": { "xquik": { "serverUrl": "https://xquik.com/mcp" } } }
```

![The Xquik MCP server in the editor](https://raw.githubusercontent.com/Xquik-dev/xquik-vscode/main/media/screenshots/mcp-server.png)

### VS Code & VSCodium

The extension adds the server for you. Start it from the MCP server list.

The server uses your API key after you sign in. Restart the server after you sign in or out.

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

Search X Posts & Look Up X Profile take 1 optional text argument. A keybinding can skip their prompt with `args`.

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

<!-- trust:start -->

## Trust & usage

[![Twitter API package downloads](https://img.shields.io/endpoint?url=https%3A%2F%2Fxquik.com%2Fbadges%2Fdownloads.json)](https://xquik.com/trust#downloads)
[![Twitter scraper users on Apify](https://img.shields.io/endpoint?url=https%3A%2F%2Fxquik.com%2Fbadges%2Fapify-users.json)](https://apify.com/xquik)
[![Twitter scraper runs on Apify](https://img.shields.io/endpoint?url=https%3A%2F%2Fxquik.com%2Fbadges%2Fapify-runs.json)](https://apify.com/xquik)
[![Tweet scraper rating on Apify](https://img.shields.io/endpoint?url=https%3A%2F%2Fxquik.com%2Fbadges%2Fapify-rating.json)](https://apify.com/xquik/x-tweet-scraper/reviews)
[![Xquik Twitter API accounts](https://img.shields.io/endpoint?url=https%3A%2F%2Fxquik.com%2Fbadges%2Faccounts.json)](https://xquik.com/trust#accounts)
[![Twitter Skill installs](https://img.shields.io/endpoint?url=https%3A%2F%2Fxquik.com%2Fbadges%2Fskill-installs.json)](https://xquik.com/trust#skill-installs)
[![Xquik verified revenue on TrustMRR](https://img.shields.io/endpoint?url=https%3A%2F%2Fxquik.com%2Fbadges%2Frevenue.json)](https://trustmrr.com/startup/xquik)
[![Twitter API p99 server read time](https://img.shields.io/endpoint?url=https%3A%2F%2Fxquik.com%2Fbadges%2Frest-p99.json)](https://xquik.com/trust#speed)
[![Xquik GitHub stars](https://img.shields.io/endpoint?url=https%3A%2F%2Fxquik.com%2Fbadges%2Fgithub-stars.json)](https://github.com/Xquik-dev)

- 54,000+ downloads of Xquik's Twitter API packages on npm, PyPI, RubyGems, NuGet, Packagist & Terraform ([source](https://xquik.com/trust#downloads)) <!-- trust:downloads 54576 -->
- 10,000+ users of Xquik's Twitter scraper Actors on Apify ([source](https://apify.com/xquik)) <!-- trust:apify-users 10119 -->
- 7,000,000+ runs of Xquik's Twitter scraper Actors on Apify ([source](https://apify.com/xquik)) <!-- trust:apify-runs 7076266 -->
- 4.66 of 5 for the X Tweet Scraper from 16 Apify reviews ([source](https://apify.com/xquik/x-tweet-scraper/reviews)) <!-- trust:apify-rating 4.66 16 -->
- 4,100+ accounts on xquik.com ([source](https://xquik.com/trust#accounts)) <!-- trust:accounts 4126 -->
- 1,600+ installs of Xquik's Twitter Skills on skills.sh ([source](https://xquik.com/trust#skill-installs)) <!-- trust:skill-installs 1619 -->
- $40,000+ in revenue verified by TrustMRR ([source](https://trustmrr.com/startup/xquik)) <!-- trust:revenue 40329 -->
- 13.8 s p99 REST API server read time over 7 days, failed reads included ([source](https://xquik.com/trust#speed)) <!-- trust:rest-p99 13778 -->
- 380+ GitHub stars across Xquik's repos ([source](https://github.com/Xquik-dev)) <!-- trust:github-stars 386 -->

Checked on 2026-10-28. See each number with its date & source on [xquik.com/trust](https://xquik.com/trust) or as [JSON](https://xquik.com/trust.json).

<!-- trust:end -->

## Questions

### Do I need an X developer account?

No. Public reads need only an Xquik API key. Private reads & X account actions
need a connected X account.

### Is this the official X API?

No. Xquik is an independent third-party service with its own REST API. The extension
calls that API, not the official X API.

## Links

- [Xquik](https://xquik.com)
- [MCP docs](https://docs.xquik.com/mcp/overview)
- [Trust](https://xquik.com/trust)

## More Xquik tools

- [X (Twitter) scraper API & Twitter MCP server](https://github.com/Xquik-dev/x-twitter-scraper) with REST, MCP & Skill setup.
- Twitter API SDKs for [TypeScript](https://github.com/Xquik-dev/x-twitter-scraper-typescript), [Python](https://github.com/Xquik-dev/x-twitter-scraper-python), [Go](https://github.com/Xquik-dev/x-twitter-scraper-go), [Ruby](https://github.com/Xquik-dev/x-twitter-scraper-ruby), [Java](https://github.com/Xquik-dev/x-twitter-scraper-java), [Kotlin](https://github.com/Xquik-dev/x-twitter-scraper-kotlin), [C#](https://github.com/Xquik-dev/x-twitter-scraper-csharp) & [PHP](https://github.com/Xquik-dev/x-twitter-scraper-php).
- [Twitter CLI & X CLI](https://github.com/Xquik-dev/x-twitter-scraper-cli), the [X API alternative skill](https://github.com/Xquik-dev/x-api) and [Twitter advanced search operators](https://github.com/Xquik-dev/x-twitter-advanced-search) with tested examples.
- Twitter agent plugins for [OpenClaw](https://github.com/Xquik-dev/tweetclaw) & [Hermes Agent](https://github.com/Xquik-dev/hermes-tweet), and the [Twitter API documentation source](https://github.com/Xquik-dev/xquik-docs).
- Twitter integrations for [n8n](https://github.com/Xquik-dev/n8n-nodes-xquik), [Prefect](https://github.com/Xquik-dev/prefect-xquik), [Haystack](https://github.com/Xquik-dev/xquik-haystack), [Paperclip](https://github.com/Xquik-dev/paperclip-plugin-xquik), [Terraform](https://github.com/Xquik-dev/terraform-provider-x-twitter-scraper), [Convex](https://github.com/Xquik-dev/xquik-convex), [Supabase](https://github.com/Xquik-dev/xquik-supabase) & [Strapi](https://github.com/Xquik-dev/strapi-plugin-xquik).
- Twitter MCP for [AI agents](https://github.com/Xquik-dev/xquik-mcp), [VS Code](https://github.com/Xquik-dev/xquik-vscode) & [Raycast](https://github.com/Xquik-dev/xquik-raycast).
- [Xquik X API & Twitter scraper](https://xquik.com) and the [Twitter API documentation](https://docs.xquik.com/api-reference/overview).
