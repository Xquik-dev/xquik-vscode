// SPDX-FileCopyrightText: 2026 Xquik Contributors
// SPDX-License-Identifier: MIT

import * as vscode from 'vscode';

import { version as extensionVersion } from '#manifest';

import type { KeyStore } from './apiKey';
import type { CursorMcp, McpHost } from './mcp';

import { API_KEY_SECRET, createKeyStore } from './apiKey';
import { createClient } from './client';
import { notify, registerCommands, welcome } from './commands';
import {
  createMcpProvider,
  detectHost,
  MCP_URL,
  syncCursorServer,
} from './mcp';

interface McpDeps {
  readonly keys: KeyStore;
  readonly secrets: vscode.SecretStorage;
  readonly version: string;
}

interface ExtensionApi {
  readonly mcpHost: McpHost['kind'];
}

function onKeyChange(
  secrets: vscode.SecretStorage,
  listener: () => void,
): vscode.Disposable {
  return secrets.onDidChange(({ key }): void => {
    if (key === API_KEY_SECRET) listener();
  });
}

function connectNative({
  keys,
  secrets,
  version,
}: McpDeps): vscode.Disposable[] {
  const changed = new vscode.EventEmitter<void>();
  const provider = createMcpProvider({
    define: (headers): vscode.McpHttpServerDefinition =>
      new vscode.McpHttpServerDefinition(
        'Xquik',
        vscode.Uri.parse(MCP_URL),
        headers,
        version,
      ),
    readKey: keys.read,
  });
  return [
    changed,
    vscode.lm.registerMcpServerDefinitionProvider('xquik.mcp', {
      ...provider,
      onDidChangeMcpServerDefinitions: changed.event,
    }),
    onKeyChange(secrets, (): void => {
      changed.fire();
    }),
  ];
}

async function connectCursor(
  mcp: CursorMcp,
  { keys, secrets }: McpDeps,
): Promise<vscode.Disposable[]> {
  async function sync(): Promise<void> {
    await syncCursorServer(mcp, await keys.read());
  }
  await sync();
  return [
    onKeyChange(secrets, (): void => {
      sync().catch((): void => {
        notify(
          vscode.window.showErrorMessage,
          'Could not update the Xquik MCP server. Reload the window, then try again.',
        );
      });
    }),
  ];
}

async function connectMcp(
  host: McpHost,
  deps: McpDeps,
): Promise<vscode.Disposable[]> {
  if (host.kind === 'cursor') return connectCursor(host.mcp, deps);
  return host.kind === 'native' ? connectNative(deps) : [];
}

async function activate(
  context: vscode.ExtensionContext,
): Promise<ExtensionApi> {
  const keys = createKeyStore(context.secrets);
  const client = createClient({
    fetch: async (url, init): Promise<Response> => globalThis.fetch(url, init),
    version: extensionVersion,
  });
  const host = detectHost(vscode);
  await vscode.commands.executeCommand(
    'setContext',
    'xquik.mcpHost',
    host.kind,
  );
  context.subscriptions.push(
    ...registerCommands({ client, keys, mcpHost: host.kind }),
    ...(await connectMcp(host, {
      keys,
      secrets: context.secrets,
      version: extensionVersion,
    })),
  );
  await welcome(context.globalState, keys);
  return { mcpHost: host.kind };
}

export { activate };
