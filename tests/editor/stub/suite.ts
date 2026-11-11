// SPDX-FileCopyrightText: 2026 Xquik Contributors
// SPDX-License-Identifier: MIT

import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import * as vscode from 'vscode';
import * as z from 'zod';

const EXTENSION_ID = 'xquik.xquik';
const SEARCH_URL = 'https://xquik.com/api/v1/x/tweets/search';
const PROMPT_SETTLE_MS = 1000;
const POST_PATH = /^\/\w+\/status\/\d+$/u;
const COMMANDS = [
  'xquik.copyMcpConfig',
  'xquik.lookUpProfile',
  'xquik.searchPosts',
  'xquik.signIn',
  'xquik.signOut',
];

const ENVIRONMENT = z.object({
  XQUIK_API_KEY: z.string().optional(),
  XQUIK_EDITOR_EXTENSIONS_DIR: z.string(),
  XQUIK_EDITOR_RESULT: z.string(),
});
const EXTENSION_API = z.object({
  mcpHost: z.enum(['cursor', 'manual', 'native']),
});

interface EditorProbe {
  readonly cursor?: { readonly mcp?: unknown };
  readonly lm?: { readonly registerMcpServerDefinitionProvider?: unknown };
}

interface Installed {
  readonly commands: readonly string[];
  readonly extensionPath: string;
  readonly mcpHost: z.output<typeof EXTENSION_API>['mcpHost'];
}

interface Proof extends Partial<Installed> {
  readonly appName: string;
  readonly cursorMcp: boolean;
  readonly editorVersion: string;
  error?: string;
  live: boolean;
  readonly lmRegisterMcpServerDefinitionProvider: boolean;
  ok: boolean;
}

interface Counter {
  value: number;
}

function requestUrl(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') return input;
  return input instanceof URL ? input.href : input.url;
}

function countSearches(): Counter {
  const original = globalThis.fetch;
  const count: Counter = { value: 0 };
  globalThis.fetch = Object.assign(
    async (
      url: Parameters<typeof fetch>[0],
      init?: RequestInit,
    ): Promise<Response> => {
      if (requestUrl(url).startsWith(SEARCH_URL)) count.value += 1;
      return original(url, init);
    },
    { preconnect: original.preconnect },
  );
  return count;
}

function postLinks(text: string): URL[] {
  return [...text.matchAll(/\]\((?<link>[^)\s]+)\)/gu)]
    .map(({ groups }) => groups?.['link'] ?? '')
    .filter((link) => URL.canParse(link))
    .map((link) => new URL(link))
    .filter(
      ({ hostname, pathname }) =>
        hostname === 'x.com' && POST_PATH.test(pathname),
    );
}

function activeText(): string {
  return vscode.window.activeTextEditor?.document.getText() ?? '';
}

async function searchWithoutKey(searches: Counter): Promise<void> {
  const before = searches.value;
  const search = vscode.commands.executeCommand(
    'xquik.searchPosts',
    'from:NASA',
  );
  await delay(PROMPT_SETTLE_MS);
  await vscode.commands.executeCommand('workbench.action.closeQuickOpen');
  await search;
  assert.equal(searches.value, before, 'a search with no key reached the API');
}

async function proveInstalled(extensionsDirectory: string): Promise<Installed> {
  const extension = vscode.extensions.getExtension<unknown>(EXTENSION_ID);
  assert.ok(extension, `${EXTENSION_ID} is not loaded`);
  assert.ok(
    extension.extensionPath.startsWith(`${extensionsDirectory}${path.sep}`),
    `${EXTENSION_ID} loaded from ${extension.extensionPath}`,
  );
  const { mcpHost } = EXTENSION_API.parse(await extension.activate());
  const commands = await vscode.commands.getCommands(true);
  for (const command of COMMANDS) {
    assert.ok(commands.includes(command), `${command} is not registered`);
  }
  return {
    commands: COMMANDS,
    extensionPath: extension.extensionPath,
    mcpHost,
  };
}

async function proveLive(key: string): Promise<void> {
  const searches = countSearches();
  await vscode.commands.executeCommand(
    'xquik.signIn',
    'xq_rejected_by_the_api',
  );
  await searchWithoutKey(searches);

  await vscode.commands.executeCommand('xquik.signIn', key);
  await vscode.commands.executeCommand('xquik.searchPosts', 'from:NASA');
  assert.equal(searches.value, 1, 'the signed-in search made 1 API call');
  assert.ok(postLinks(activeText()).length > 0, 'the search shows a post link');

  await vscode.commands.executeCommand('xquik.lookUpProfile', '@NASA');
  assert.match(activeText(), /@NASA/u);

  await vscode.commands.executeCommand('xquik.signOut');
  await searchWithoutKey(searches);
}

async function run(): Promise<void> {
  const environment = ENVIRONMENT.parse(process.env);
  const editor: EditorProbe = vscode;
  const proof: Proof = {
    appName: vscode.env.appName,
    cursorMcp: editor.cursor?.mcp !== undefined,
    editorVersion: vscode.version,
    lmRegisterMcpServerDefinitionProvider:
      typeof editor.lm?.registerMcpServerDefinitionProvider === 'function',
    live: false,
    ok: false,
  };
  try {
    Object.assign(
      proof,
      await proveInstalled(environment.XQUIK_EDITOR_EXTENSIONS_DIR),
    );
    if (environment.XQUIK_API_KEY !== undefined) {
      await proveLive(environment.XQUIK_API_KEY);
      proof.live = true;
    }
    proof.ok = true;
  } catch (error) {
    proof.error = String(error);
    throw error;
  } finally {
    await writeFile(
      environment.XQUIK_EDITOR_RESULT,
      JSON.stringify(proof, undefined, 2),
    );
  }
}

export { run };
