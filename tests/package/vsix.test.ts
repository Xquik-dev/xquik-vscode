// SPDX-FileCopyrightText: 2026 Xquik Contributors
// SPDX-License-Identifier: MIT

import { expect, it } from 'bun:test';
import { strFromU8, unzipSync } from 'fflate';
import { readFileSync, statSync } from 'node:fs';
import { z } from 'zod';

const MANIFEST = z.object({
  homepage: z.string(),
  name: z.string(),
  version: z.string(),
});

const repository = MANIFEST.parse(
  JSON.parse(readFileSync('package.json', 'utf8')),
);
const vsix = `dist/${repository.name}-${repository.version}.vsix`;
const entries = unzipSync(readFileSync(vsix));
const texts = Object.entries(entries)
  .filter(([path]): boolean => !path.endsWith('.png'))
  .map(([path, bytes]): [string, string] => [path, strFromU8(bytes)]);

// The word stays split because it may appear nowhere in this repository.
const BANNED_WORDING = new RegExp(['scr', 'ap(?:e|ing)'].join(''), 'iu');
const REAL_LOOKING_KEY = /xq_[0-9A-Za-z]{16,}/u;

it('vsix > the package holds only those files & its manifests', (): void => {
  expect(Object.keys(entries).toSorted()).toStrictEqual([
    '[Content_Types].xml',
    'extension.vsixmanifest',
    'extension/LICENSE.txt',
    'extension/changelog.md',
    'extension/dist/extension.js',
    'extension/media/icon.png',
    'extension/package.json',
    'extension/readme.md',
  ]);
});

it('vsix > the package stays under 1 MB', (): void => {
  expect(statSync(vsix).size).toBeLessThan(1_000_000);
});

it.each(texts)('vsix > %s avoids the banned wording', (_path, text): void => {
  expect(text).not.toMatch(BANNED_WORDING);
});

it.each(texts)('vsix > %s holds no real-looking key', (_path, text): void => {
  expect(text).not.toMatch(REAL_LOOKING_KEY);
});

it('vsix > the icon is at least 128 px on each side', (): void => {
  const header = Buffer.from(entries['extension/media/icon.png'] ?? []);
  expect(header.readUInt32BE(16)).toBeGreaterThanOrEqual(128);
  expect(header.readUInt32BE(20)).toBeGreaterThanOrEqual(128);
});

it('vsix > the packed homepage is exactly the site root', (): void => {
  const [, manifest = ''] =
    texts.find(([path]): boolean => path === 'extension/package.json') ?? [];
  const packed = MANIFEST.parse(JSON.parse(manifest));
  expect(packed.homepage).toBe('https://xquik.com');
});
