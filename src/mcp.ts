// SPDX-FileCopyrightText: 2026 Xquik Contributors
// SPDX-License-Identifier: MIT

import type { ApiKey } from './apiKey';

const MCP_URL = 'https://xquik.com/mcp';
const MCP_CONFIG = JSON.stringify(
  { mcpServers: { xquik: { serverUrl: MCP_URL } } },
  undefined,
  2,
);
const SERVER_NAME = 'xquik';

// Windsurf is now Devin Desktop, whose Cascade reads mcp_config.json and ignores vscode.lm.
const MANUAL_EDITORS = /windsurf|devin/iu;

interface CursorServer {
  readonly name: string;
  readonly server: {
    readonly headers: Record<string, string>;
    readonly url: string;
  };
}

interface CursorMcp {
  readonly registerServer: (server: CursorServer) => PromiseLike<void> | void;
  readonly unregisterServer: (name: string) => PromiseLike<void> | void;
}

interface EditorApi {
  readonly cursor?: { readonly mcp?: unknown };
  readonly env: { readonly appName: string };
  readonly lm?: { readonly registerMcpServerDefinitionProvider?: unknown };
}

type McpHost =
  | { readonly kind: 'cursor'; readonly mcp: CursorMcp }
  | { readonly kind: 'manual' }
  | { readonly kind: 'native' };

interface McpProviderDeps<Definition> {
  readonly define: (headers: Record<string, string>) => Definition;
  readonly readKey: () => Promise<ApiKey | undefined>;
}

interface McpProvider<Definition> {
  readonly provideMcpServerDefinitions: () => Definition[];
  readonly resolveMcpServerDefinition: (
    server: Definition,
  ) => Promise<Definition>;
}

function isCursorMcp(value: unknown): value is CursorMcp {
  return (
    typeof value === 'object' &&
    value !== null &&
    'registerServer' in value &&
    typeof value.registerServer === 'function' &&
    'unregisterServer' in value &&
    typeof value.unregisterServer === 'function'
  );
}

function detectHost(editor: EditorApi): McpHost {
  const cursorMcp = editor.cursor?.mcp;
  if (MANUAL_EDITORS.test(editor.env.appName)) return { kind: 'manual' };
  if (isCursorMcp(cursorMcp)) return { kind: 'cursor', mcp: cursorMcp };
  return typeof editor.lm?.registerMcpServerDefinitionProvider === 'function'
    ? { kind: 'native' }
    : { kind: 'manual' };
}

function authorization(key: ApiKey): Record<string, string> {
  return { Authorization: `Bearer ${key}` };
}

function createMcpProvider<Definition>({
  define,
  readKey,
}: McpProviderDeps<Definition>): McpProvider<Definition> {
  return {
    provideMcpServerDefinitions: (): Definition[] => [define({})],
    resolveMcpServerDefinition: async (
      server: Definition,
    ): Promise<Definition> => {
      const key = await readKey();
      return key === undefined ? server : define(authorization(key));
    },
  };
}

// Cursor stops the old client after unregistering, and that stop takes down a server registered too soon.
async function syncCursorServer(
  mcp: CursorMcp,
  key: ApiKey | undefined,
): Promise<void> {
  await mcp.unregisterServer(SERVER_NAME);
  await mcp.registerServer({
    name: SERVER_NAME,
    server: {
      headers: key === undefined ? {} : authorization(key),
      url: MCP_URL,
    },
  });
}

export { createMcpProvider, detectHost, MCP_CONFIG, MCP_URL, syncCursorServer };
export type { CursorMcp, CursorServer, McpHost, McpProvider };
