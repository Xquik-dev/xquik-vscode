// SPDX-FileCopyrightText: 2026 Xquik Contributors
// SPDX-License-Identifier: MIT

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const epoch = execFileSync(
  'git',
  ['show', '--no-patch', '--format=%ct', 'HEAD'],
  { encoding: 'utf8' },
).trim();

function packageHash(directory: string, name: string): string {
  const vsix = path.join(directory, `${name}.vsix`);
  execFileSync(
    'npx',
    ['--no-install', 'vsce', 'package', '--no-dependencies', '--out', vsix],
    {
      env: { ...process.env, SOURCE_DATE_EPOCH: epoch },
      stdio: ['ignore', 'ignore', 'inherit'],
    },
  );
  return createHash('sha256').update(readFileSync(vsix)).digest('hex');
}

const directory = mkdtempSync(path.join(tmpdir(), 'xquik-vsix-'));
try {
  const first = packageHash(directory, 'first');
  const second = packageHash(directory, 'second');
  console.log(JSON.stringify({ first, second }));
  process.exitCode = first === second ? 0 : 1;
} finally {
  rmSync(directory, { force: true, recursive: true });
}
