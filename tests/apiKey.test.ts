// SPDX-FileCopyrightText: 2026 Xquik Contributors
// SPDX-License-Identifier: MIT

import { expect, it } from 'bun:test';
import * as fc from 'fast-check';

import type { ApiKey } from '../src/apiKey';

import { API_KEY, createKeyStore, parseApiKey } from '../src/apiKey';

const keyBody = fc.stringMatching(/^[0-9A-Za-z_-]{1,64}$/u);

function memorySecrets(initial: Record<string, string> = {}): {
  readonly delete: (id: string) => Promise<void>;
  readonly entries: Map<string, string>;
  readonly get: (id: string) => Promise<string | undefined>;
  readonly store: (id: string, value: string) => Promise<void>;
} {
  const entries = new Map(Object.entries(initial));
  return {
    delete: async (id): Promise<void> => {
      entries.delete(id);
    },
    entries,
    get: async (id): Promise<string | undefined> => entries.get(id),
    store: async (id, value): Promise<void> => {
      entries.set(id, value);
    },
  };
}

it('parseApiKey > a pasted key survives padding & a Bearer prefix', (): void => {
  fc.assert(
    fc.property(
      keyBody,
      fc.constantFrom('', ' ', '\n', '\t  '),
      fc.constantFrom('', 'Bearer ', 'bearer ', 'Bearer   '),
      fc.constantFrom('', ' ', '\n'),
      (body, before, prefix, after) => {
        expect<string | undefined>(
          parseApiKey(`${before}${prefix}xq_${body}${after}`),
        ).toBe(`xq_${body}`);
      },
    ),
  );
});

it('parseApiKey > a value without the xq_ prefix is no key', (): void => {
  fc.assert(
    fc.property(fc.string(), (value) => {
      fc.pre(!/^\s*(?:Bearer\s+)?xq_/iu.test(value));
      expect(parseApiKey(value)).toBeUndefined();
    }),
  );
});

it('parseApiKey > whitespace inside a key rejects it', (): void => {
  fc.assert(
    fc.property(
      keyBody,
      fc.constantFrom(' ', '\n', '\t'),
      keyBody,
      (start, gap, end) => {
        expect(parseApiKey(`xq_${start}${gap}${end}`)).toBeUndefined();
      },
    ),
  );
});

it.each([[''], ['xq_'], ['Bearer '], ['Bearer xq_']])(
  'parseApiKey > %j is no key',
  (value): void => {
    expect(parseApiKey(value)).toBeUndefined();
  },
);

it('parseApiKey > a missing value is no key', (): void => {
  const missing = new Map<string, string>().get('missing');
  expect(parseApiKey(missing)).toBeUndefined();
});

it('ApiKey > a plain string is not a key until it is parsed', (): void => {
  // @ts-expect-error A key must come through parseApiKey.
  const key: ApiKey = 'xq_plain';
  expect<string | undefined>(parseApiKey(key)).toBe('xq_plain');
});

it('key store > a written key reads back & clearing removes it', async (): Promise<void> => {
  const keys = createKeyStore(memorySecrets());
  await keys.write(API_KEY.parse('xq_stored'));
  expect<string | undefined>(await keys.read()).toBe('xq_stored');
  await keys.clear();
  expect(await keys.read()).toBeUndefined();
});

it('key store > a stored value that is no key reads as no key', async (): Promise<void> => {
  const secrets = memorySecrets({ 'xquik.apiKey': 'not a key' });
  expect(await createKeyStore(secrets).read()).toBeUndefined();
});
