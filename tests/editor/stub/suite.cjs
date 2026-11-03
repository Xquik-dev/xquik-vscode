// SPDX-FileCopyrightText: 2026 Xquik Contributors
// SPDX-License-Identifier: MIT

const assert = require('node:assert/strict');
const { writeFile } = require('node:fs/promises');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');

const vscode = require('vscode');

const EXTENSION_ID = 'xquik.xquik';
const SEARCH_URL = 'https://xquik.com/api/v1/x/tweets/search';
const PROMPT_SETTLE_MS = 1000;
const COMMANDS = [
  'xquik.copyMcpConfig',
  'xquik.lookUpProfile',
  'xquik.searchPosts',
  'xquik.signIn',
  'xquik.signOut',
];

function countSearches() {
  const original = globalThis.fetch;
  const count = { value: 0 };
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith(SEARCH_URL)) count.value += 1;
    return original(url, init);
  };
  return count;
}

function activeText() {
  return vscode.window.activeTextEditor?.document.getText() ?? '';
}

async function searchWithoutKey(searches) {
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

async function proveInstalled(proof) {
  const extension = vscode.extensions.getExtension(EXTENSION_ID);
  assert.ok(extension, `${EXTENSION_ID} is not loaded`);
  assert.ok(
    extension.extensionPath.startsWith(
      `${process.env.XQUIK_EDITOR_EXTENSIONS_DIR}${path.sep}`,
    ),
    `${EXTENSION_ID} loaded from ${extension.extensionPath}`,
  );
  const { mcpHost } = await extension.activate();
  const commands = await vscode.commands.getCommands(true);
  for (const command of COMMANDS) {
    assert.ok(commands.includes(command), `${command} is not registered`);
  }
  Object.assign(proof, {
    commands: COMMANDS,
    extensionPath: extension.extensionPath,
    mcpHost,
    version: extension.packageJSON.version,
  });
}

async function proveLive(proof, key) {
  const searches = countSearches();
  await vscode.commands.executeCommand(
    'xquik.signIn',
    'xq_rejected_by_the_api',
  );
  await searchWithoutKey(searches);

  await vscode.commands.executeCommand('xquik.signIn', key);
  await vscode.commands.executeCommand('xquik.searchPosts', 'from:NASA');
  assert.equal(searches.value, 1, 'the signed-in search made 1 API call');
  assert.match(activeText(), /https:\/\/x\.com\/\w+\/status\/\d+/u);

  await vscode.commands.executeCommand('xquik.lookUpProfile', '@NASA');
  assert.match(activeText(), /@NASA/u);

  await vscode.commands.executeCommand('xquik.signOut');
  await searchWithoutKey(searches);
  Object.assign(proof, { live: true });
}

async function run() {
  const proof = {
    appName: vscode.env.appName,
    cursorMcp: vscode.cursor?.mcp !== undefined,
    editorVersion: vscode.version,
    lmRegisterMcpServerDefinitionProvider:
      typeof vscode.lm?.registerMcpServerDefinitionProvider === 'function',
    live: false,
    ok: false,
  };
  try {
    await proveInstalled(proof);
    const key = process.env.XQUIK_API_KEY;
    if (key !== undefined) await proveLive(proof, key);
    proof.ok = true;
  } catch (error) {
    proof.error = String(error);
    throw error;
  } finally {
    await writeFile(
      process.env.XQUIK_EDITOR_RESULT,
      JSON.stringify(proof, undefined, 2),
    );
  }
}

module.exports = { run };
