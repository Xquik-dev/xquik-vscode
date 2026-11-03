// SPDX-FileCopyrightText: 2026 Xquik Contributors
// SPDX-License-Identifier: MIT

import * as vscode from 'vscode';

import type { ApiKey, KeyStore } from './apiKey';
import type { ApiFailure, XquikClient } from './client';
import type { McpHost } from './mcp';

import { parseApiKey } from './apiKey';
import { MCP_CONFIG } from './mcp';
import { renderPosts, renderProfile } from './render';

const API_KEYS_URL = 'https://dashboard.xquik.com/en/account?tab=api-keys';
const CREDITS_URL = 'https://dashboard.xquik.com/en/account?tab=subscription';
const WELCOMED_STATE = 'xquik.welcomed';
const UNAUTHORIZED = 401;
const PAYMENT_REQUIRED = 402;

interface CommandDeps {
  readonly client: XquikClient;
  readonly keys: KeyStore;
  readonly mcpHost: McpHost['kind'];
}

interface Offer {
  readonly label: string;
  readonly run: () => Promise<unknown>;
}

type Notifier = (
  message: string,
  ...items: string[]
) => Thenable<string | undefined>;

type CommandRun = (
  deps: CommandDeps,
  input: string | undefined,
) => Promise<unknown>;

type KeyedRun = (
  deps: CommandDeps,
  key: ApiKey,
  input: string | undefined,
) => Promise<void>;

const SIGN_IN_OFFER: Offer = {
  label: 'Sign In',
  run: async (): Promise<unknown> =>
    vscode.commands.executeCommand('xquik.signIn'),
};

const GET_KEY_OFFER: Offer = {
  label: 'Open API Keys',
  run: async (): Promise<unknown> =>
    vscode.env.openExternal(vscode.Uri.parse(API_KEYS_URL)),
};

const ADD_CREDITS_OFFER: Offer = {
  label: 'Add Credits',
  run: async (): Promise<unknown> =>
    vscode.env.openExternal(vscode.Uri.parse(CREDITS_URL)),
};

const COPY_CONFIG_OFFER: Offer = {
  label: 'Copy MCP Config',
  run: async (): Promise<unknown> =>
    vscode.commands.executeCommand('xquik.copyMcpConfig'),
};

const FAILURE_OFFERS: ReadonlyMap<number, Offer> = new Map([
  [UNAUTHORIZED, SIGN_IN_OFFER],
  [PAYMENT_REQUIRED, ADD_CREDITS_OFFER],
]);

async function present(
  show: Notifier,
  message: string,
  offer: Offer | undefined,
): Promise<void> {
  const picked = await (offer === undefined
    ? show(message)
    : show(message, offer.label));
  if (picked !== undefined) await offer?.run();
}

// The editor settles a message only once the person dismisses it, so a command must not wait on one.
function notify(show: Notifier, message: string, offer?: Offer): void {
  present(show, message, offer).catch((): void => {});
}

function reportFailure(failed: ApiFailure): void {
  notify(
    vscode.window.showErrorMessage,
    failed.message,
    FAILURE_OFFERS.get(failed.status),
  );
}

async function openMarkdown(content: string): Promise<void> {
  const document = await vscode.workspace.openTextDocument({
    content,
    language: 'markdown',
  });
  await vscode.window.showTextDocument(document);
}

async function withProgress<T>(
  title: string,
  task: () => Promise<T>,
): Promise<T> {
  return vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title },
    task,
  );
}

async function askFor(
  input: string | undefined,
  options: vscode.InputBoxOptions,
): Promise<string | undefined> {
  const answer = input ?? (await vscode.window.showInputBox(options));
  const trimmed = answer?.trim();
  return trimmed === '' ? undefined : trimmed;
}

async function signIn(
  { client, keys, mcpHost }: CommandDeps,
  input?: string,
): Promise<ApiKey | undefined> {
  const answer = await askFor(input, {
    ignoreFocusOut: true,
    password: true,
    placeHolder: 'xq_...',
    prompt: `Paste your Xquik API key from ${API_KEYS_URL}`,
    title: 'Sign In With API Key',
    validateInput: (value): string | undefined =>
      parseApiKey(value) === undefined
        ? 'Paste a key that starts with xq_'
        : undefined,
  });
  if (answer === undefined) return undefined;
  const key = parseApiKey(answer);
  if (key === undefined) {
    notify(
      vscode.window.showErrorMessage,
      'That is not an Xquik API key. Copy a key that starts with xq_ from your dashboard.',
      GET_KEY_OFFER,
    );
    return undefined;
  }
  const account = await withProgress('Checking your API key', async () =>
    client.account(key),
  );
  if (!account.ok) {
    reportFailure(account);
    return undefined;
  }
  await keys.write(key);
  notify(
    vscode.window.showInformationMessage,
    'Signed in to Xquik.',
    mcpHost === 'manual' ? COPY_CONFIG_OFFER : undefined,
  );
  return key;
}

async function signOut({ keys }: CommandDeps): Promise<void> {
  await keys.clear();
  notify(vscode.window.showInformationMessage, 'Signed out of Xquik.');
}

async function searchPosts(
  { client }: CommandDeps,
  key: ApiKey,
  input: string | undefined,
): Promise<void> {
  const query = await askFor(input, {
    placeHolder: 'from:NASA',
    prompt: 'Enter words or X search operators.',
    title: 'Search X Posts',
  });
  if (query === undefined) return;
  const posts = await withProgress('Searching X posts', async () =>
    client.searchPosts(key, query),
  );
  if (!posts.ok) {
    reportFailure(posts);
  } else if (posts.value.length === 0) {
    notify(
      vscode.window.showInformationMessage,
      `No posts match ${query}. Remove a filter or try other words.`,
    );
  } else {
    await openMarkdown(renderPosts(query, posts.value));
  }
}

async function lookUpProfile(
  { client }: CommandDeps,
  key: ApiKey,
  input: string | undefined,
): Promise<void> {
  const username = await askFor(input, {
    placeHolder: '@NASA',
    prompt: 'Enter an X username or profile link.',
    title: 'Look Up X Profile',
  });
  if (username === undefined) return;
  const profile = await withProgress('Looking up the X profile', async () =>
    client.lookUpProfile(key, username),
  );
  if (profile.ok) await openMarkdown(renderProfile(profile.value));
  else reportFailure(profile);
}

async function copyMcpConfig(): Promise<void> {
  await vscode.env.clipboard.writeText(MCP_CONFIG);
  notify(
    vscode.window.showInformationMessage,
    'Copied. Paste it into mcp_config.json from the Cascade MCP menu, then enable Xquik.',
  );
}

function withKey(run: KeyedRun): CommandRun {
  return async (deps, input): Promise<void> => {
    const key = (await deps.keys.read()) ?? (await signIn(deps));
    if (key !== undefined) await run(deps, key, input);
  };
}

const COMMANDS: Readonly<Record<string, CommandRun>> = {
  'xquik.copyMcpConfig': copyMcpConfig,
  'xquik.lookUpProfile': withKey(lookUpProfile),
  'xquik.searchPosts': withKey(searchPosts),
  'xquik.signIn': signIn,
  'xquik.signOut': signOut,
};

function registerCommands(deps: CommandDeps): vscode.Disposable[] {
  return Object.entries(COMMANDS).map(([id, run]): vscode.Disposable =>
    vscode.commands.registerCommand(
      id,
      async (input: unknown): Promise<void> => {
        await run(deps, typeof input === 'string' ? input : undefined);
      },
    ),
  );
}

async function welcome(memento: vscode.Memento, keys: KeyStore): Promise<void> {
  if (memento.get(WELCOMED_STATE) === true) return;
  await memento.update(WELCOMED_STATE, true);
  if ((await keys.read()) !== undefined) return;
  notify(
    vscode.window.showInformationMessage,
    'Sign in with an Xquik API key to search X from your editor.',
    SIGN_IN_OFFER,
  );
}

export { notify, registerCommands, welcome };
