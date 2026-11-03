// SPDX-FileCopyrightText: 2026 Xquik Contributors
// SPDX-License-Identifier: MIT

import * as z from 'zod';

const API_KEY_SECRET = 'xquik.apiKey';

const API_KEY = z
  .string()
  .trim()
  .transform((value): string => value.replace(/^Bearer\s+/iu, ''))
  .pipe(z.string().regex(/^xq_\S+$/u))
  .brand<'ApiKey'>();

type ApiKey = z.output<typeof API_KEY>;

interface Secrets {
  readonly delete: (id: string) => PromiseLike<void>;
  readonly get: (id: string) => PromiseLike<string | undefined>;
  readonly store: (id: string, value: string) => PromiseLike<void>;
}

interface KeyStore {
  readonly clear: () => Promise<void>;
  readonly read: () => Promise<ApiKey | undefined>;
  readonly write: (key: ApiKey) => Promise<void>;
}

function parseApiKey(raw: string | undefined): ApiKey | undefined {
  const key = API_KEY.safeParse(raw);
  return key.success ? key.data : undefined;
}

function createKeyStore(secrets: Secrets): KeyStore {
  return {
    clear: async (): Promise<void> => {
      await secrets.delete(API_KEY_SECRET);
    },
    read: async (): Promise<ApiKey | undefined> =>
      parseApiKey(await secrets.get(API_KEY_SECRET)),
    write: async (key: ApiKey): Promise<void> => {
      await secrets.store(API_KEY_SECRET, key);
    },
  };
}

export { API_KEY, API_KEY_SECRET, createKeyStore, parseApiKey };
export type { ApiKey, KeyStore, Secrets };
