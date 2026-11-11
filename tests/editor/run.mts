#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Xquik Contributors
// SPDX-License-Identifier: MIT

import { build } from 'esbuild';
import { execFileSync, spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as z from 'zod';

const STUB = fileURLToPath(new URL('stub', import.meta.url));
const REPOSITORY = fileURLToPath(new URL('../..', import.meta.url));
const TIMEOUT_MS = 180_000;
const KILL_GRACE_MS = 10_000;
const OUTPUT_CHUNKS = 200;
const FLAGS = [
  // A fresh Cursor profile opens the agent window, which loads only built-in extensions.
  '--classic',
  '--skip-welcome',
  '--skip-release-notes',
  '--disable-workspace-trust',
  '--use-mock-keychain',
];
const MANIFEST = z.object({
  name: z.string(),
  publisher: z.string(),
  version: z.string(),
});
const PRODUCT = z.object({ applicationName: z.string() });
const SUITE_RESULT = z.record(z.string(), z.unknown());
const SETTINGS = {
  'extensions.autoCheckUpdates': false,
  'extensions.autoUpdate': false,
  'telemetry.telemetryLevel': 'off',
  'update.mode': 'none',
};

interface Editor {
  readonly binary: string;
  readonly cli: string;
}

interface EditorRun {
  readonly exitCode: number | null;
  readonly output: string;
  readonly signal: NodeJS.Signals | null;
}

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function resolveEditor(editorPath: string): Editor {
  const app = /^.+?\.app(?=\/|$)/u.exec(realpathSync(editorPath))?.[0];
  if (app === undefined)
    throw new Error(`${editorPath} is not in a macOS app.`);
  const resources = path.join(app, 'Contents/Resources/app');
  const { applicationName } = PRODUCT.parse(
    readJson(path.join(resources, 'product.json')),
  );
  const infoPlist = path.join(app, 'Contents/Info.plist');
  const executable = execFileSync(
    'plutil',
    ['-extract', 'CFBundleExecutable', 'raw', infoPlist],
    { encoding: 'utf8' },
  ).trim();
  return {
    binary: path.join(app, 'Contents/MacOS', executable),
    cli: path.join(resources, 'bin', applicationName),
  };
}

function readApiKey(): string | undefined {
  const service = process.env['XQUIK_EDITOR_KEYCHAIN_SERVICE'];
  return service === undefined
    ? undefined
    : execFileSync('security', ['find-generic-password', '-s', service, '-w'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'inherit'],
      }).trim();
}

function editorEnvironment(): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      ([name]) => !/^(?:ELECTRON_|VSCODE_)/u.test(name),
    ),
  );
}

async function launch(
  binary: string,
  flags: readonly string[],
  env: NodeJS.ProcessEnv,
): Promise<EditorRun> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, flags, {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const output: Buffer[] = [];
    const collect = (chunk: Buffer): void => {
      output.push(chunk);
      if (output.length > OUTPUT_CHUNKS) output.shift();
    };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    const term = setTimeout((): void => {
      child.kill('SIGTERM');
    }, TIMEOUT_MS);
    const kill = setTimeout((): void => {
      child.kill('SIGKILL');
    }, TIMEOUT_MS + KILL_GRACE_MS);
    child.once('error', reject);
    child.once('close', (exitCode, signal) => {
      clearTimeout(term);
      clearTimeout(kill);
      resolve({ exitCode, output: Buffer.concat(output).toString(), signal });
    });
  });
}

async function bundleSuite(outfile: string): Promise<void> {
  await build({
    bundle: true,
    entryPoints: [path.join(STUB, 'suite.ts')],
    external: ['vscode'],
    format: 'cjs',
    logLevel: 'error',
    outfile,
    platform: 'node',
    target: 'node22',
  });
}

async function main(): Promise<number> {
  const [vsixPath, editorPath, resultPath = 'dist/editor-proof.json'] =
    process.argv.slice(2);
  if (vsixPath === undefined || editorPath === undefined) {
    console.error(
      'Run node tests/editor/run.mts <vsix> <editor app or binary> [result json].',
    );
    return 2;
  }
  const { name, publisher, version } = MANIFEST.parse(
    readJson(path.join(REPOSITORY, 'package.json')),
  );
  const installed = `${publisher}.${name}@${version}`;
  const editor = resolveEditor(editorPath);
  const apiKey = readApiKey();
  const redact = (text: string): string =>
    apiKey === undefined ? text : text.replaceAll(apiKey, '[redacted]');
  const env = editorEnvironment();
  const temporary = mkdtempSync(path.join(tmpdir(), 'xq-'));
  const root = realpathSync(temporary);
  const extensions = path.join(root, 'extensions');
  const suite = path.join(root, 'suite.cjs');
  const suiteResult = path.join(root, 'suite.json');
  const userData = path.join(root, 'data');
  const profile = [
    `--user-data-dir=${userData}`,
    `--extensions-dir=${extensions}`,
  ];
  try {
    await bundleSuite(suite);
    mkdirSync(path.join(userData, 'User'), { recursive: true });
    writeFileSync(
      path.join(userData, 'User/settings.json'),
      JSON.stringify(SETTINGS),
    );
    execFileSync(
      editor.cli,
      [...profile, '--install-extension', path.resolve(vsixPath)],
      { env, stdio: ['ignore', 'ignore', 'inherit'] },
    );
    const listed = execFileSync(
      editor.cli,
      [...profile, '--list-extensions', '--show-versions'],
      { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'inherit'] },
    );
    if (!listed.split('\n').includes(installed))
      throw new Error(`The editor lists ${listed.trim()}, not ${installed}.`);
    const editorRun = await launch(
      editor.binary,
      [
        ...profile,
        ...FLAGS,
        `--extensionDevelopmentPath=${STUB}`,
        `--extensionTestsPath=${suite}`,
      ],
      {
        ...env,
        ...(apiKey === undefined ? {} : { XQUIK_API_KEY: apiKey }),
        XQUIK_EDITOR_EXTENSIONS_DIR: extensions,
        XQUIK_EDITOR_RESULT: suiteResult,
      },
    );
    const proof = existsSync(suiteResult)
      ? SUITE_RESULT.parse(readJson(suiteResult))
      : {};
    const ok = editorRun.exitCode === 0 && proof['ok'] === true;
    const text = redact(
      JSON.stringify(
        {
          ...proof,
          editor: editorPath,
          exitCode: editorRun.exitCode,
          installed,
          ok,
          signal: editorRun.signal,
          version,
        },
        undefined,
        2,
      ),
    );
    mkdirSync(path.dirname(path.resolve(resultPath)), { recursive: true });
    writeFileSync(resultPath, `${text}\n`);
    console.log(text);
    if (!ok) console.error(redact(editorRun.output));
    return ok ? 0 : 1;
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}

process.exitCode = await main();
