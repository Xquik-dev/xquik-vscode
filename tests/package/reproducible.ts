// SPDX-FileCopyrightText: 2026 Xquik Contributors
// SPDX-License-Identifier: MIT

import { unzipSync } from 'fflate';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

function hashEntries(vsix: string): Map<string, string> {
  const entries = unzipSync(readFileSync(vsix));
  return new Map(
    Object.entries(entries).map(([entry, bytes]): [string, string] => [
      entry,
      createHash('sha256').update(bytes).digest('hex'),
    ]),
  );
}

function packageEntries(directory: string, name: string): Map<string, string> {
  const vsix = path.join(directory, `${name}.vsix`);
  execFileSync(
    'npx',
    ['--no-install', 'vsce', 'package', '--no-dependencies', '--out', vsix],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  );
  return hashEntries(vsix);
}

const directory = mkdtempSync(path.join(tmpdir(), 'xquik-vsix-'));
try {
  const first = packageEntries(directory, 'first');
  const second = packageEntries(directory, 'second');
  const entries = [...new Set([...first.keys(), ...second.keys()])].toSorted();
  const differing = entries.filter(
    (entry): boolean => first.get(entry) !== second.get(entry),
  );
  console.log(JSON.stringify({ differing, files: entries.length }));
  process.exitCode = differing.length === 0 ? 0 : 1;
} finally {
  rmSync(directory, { force: true, recursive: true });
}
