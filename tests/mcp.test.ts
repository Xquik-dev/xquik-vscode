// SPDX-FileCopyrightText: 2026 Xquik Contributors
// SPDX-License-Identifier: MIT

import { expect, it } from 'bun:test';

import type { ApiKey } from '../src/apiKey';
import type { CursorMcp, CursorServer, McpProvider } from '../src/mcp';

import { API_KEY } from '../src/apiKey';
import {
  createMcpProvider,
  detectHost,
  MCP_CONFIG,
  syncCursorServer,
} from '../src/mcp';

const KEY = API_KEY.parse('xq_test');
const NO_KEY = new Map<string, ApiKey>().get('none');
const LM = { registerMcpServerDefinitionProvider: (): void => {} };

interface Definition {
  readonly headers: Record<string, string>;
}

function recordingCursor(): {
  readonly log: Array<CursorServer | string>;
  readonly mcp: CursorMcp;
} {
  const log: Array<CursorServer | string> = [];
  return {
    log,
    mcp: {
      registerServer: (server): void => {
        log.push(server);
      },
      unregisterServer: (name): void => {
        log.push(name);
      },
    },
  };
}

function providerWith(key: ApiKey | undefined): McpProvider<Definition> {
  return createMcpProvider<Definition>({
    define: (headers): Definition => ({ headers }),
    readKey: async (): Promise<ApiKey | undefined> => key,
  });
}

it.each([
  ['Windsurf', 'manual'],
  ['Devin Desktop', 'manual'],
  ['VSCodium', 'native'],
  ['Visual Studio Code', 'native'],
] as const)(
  'detectHost > %s with vscode.lm is a %s host',
  (appName, kind): void => {
    expect(detectHost({ env: { appName }, lm: LM }).kind).toBe(kind);
  },
);

it('detectHost > vscode.cursor.mcp wins over vscode.lm & keeps the Cursor API', (): void => {
  const { mcp } = recordingCursor();
  expect(
    detectHost({ cursor: { mcp }, env: { appName: 'Cursor' }, lm: LM }),
  ).toStrictEqual({ kind: 'cursor', mcp });
});

it('detectHost > Windsurf stays manual even with both editor APIs', (): void => {
  const { mcp } = recordingCursor();
  expect(
    detectHost({ cursor: { mcp }, env: { appName: 'Windsurf' }, lm: LM }).kind,
  ).toBe('manual');
});

it('detectHost > an unknown vscode.cursor.mcp shape is not the Cursor API', (): void => {
  expect(
    detectHost({ cursor: { mcp: {} }, env: { appName: 'Cursor' }, lm: LM })
      .kind,
  ).toBe('native');
});

it('detectHost > an editor with neither API is manual', (): void => {
  expect(detectHost({ env: { appName: 'Editor' } }).kind).toBe('manual');
  expect(detectHost({ env: { appName: 'Editor' }, lm: {} }).kind).toBe(
    'manual',
  );
});

it('MCP provider > a provided definition never holds the key', (): void => {
  expect(providerWith(KEY).provideMcpServerDefinitions()).toStrictEqual([
    { headers: {} },
  ]);
});

it('MCP provider > resolving with a key adds the bearer header', async (): Promise<void> => {
  const provider = providerWith(KEY);
  const [provided] = provider.provideMcpServerDefinitions();
  expect(
    await provider.resolveMcpServerDefinition(provided ?? { headers: {} }),
  ).toStrictEqual({ headers: { Authorization: 'Bearer xq_test' } });
});

it('MCP provider > resolving without a key leaves the definition for OAuth', async (): Promise<void> => {
  const provider = providerWith(NO_KEY);
  const provided = { headers: {} };
  expect(await provider.resolveMcpServerDefinition(provided)).toBe(provided);
});

it('Cursor sync > a key replaces the server with the bearer header', async (): Promise<void> => {
  const { log, mcp } = recordingCursor();
  await syncCursorServer(mcp, KEY);
  expect(log).toStrictEqual([
    'xquik',
    {
      name: 'xquik',
      server: {
        headers: { Authorization: 'Bearer xq_test' },
        url: 'https://xquik.com/mcp',
      },
    },
  ]);
});

it('Cursor sync > no key replaces the server without any header', async (): Promise<void> => {
  const { log, mcp } = recordingCursor();
  await syncCursorServer(mcp, NO_KEY);
  expect(log).toStrictEqual([
    'xquik',
    { name: 'xquik', server: { headers: {}, url: 'https://xquik.com/mcp' } },
  ]);
});

it('Cursor sync > the new server registers only after the old one has stopped', async (): Promise<void> => {
  const { log, mcp } = recordingCursor();
  await syncCursorServer(
    {
      ...mcp,
      unregisterServer: async (name): Promise<void> => {
        await Promise.resolve();
        log.push(`stopped ${name}`);
      },
    },
    NO_KEY,
  );
  expect(log).toStrictEqual([
    'stopped xquik',
    { name: 'xquik', server: { headers: {}, url: 'https://xquik.com/mcp' } },
  ]);
});

it('MCP config > the copied config names the hosted server & holds no secret', (): void => {
  expect(MCP_CONFIG).toBe(
    '{"mcpServers":{"xquik":{"serverUrl":"https://xquik.com/mcp"}}}',
  );
});
