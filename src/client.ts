// SPDX-FileCopyrightText: 2026 Xquik Contributors
// SPDX-License-Identifier: MIT

import * as z from 'zod';

import type { ApiKey } from './apiKey';

const BASE_URL = 'https://xquik.com/api/v1';
const SEARCH_LIMIT = 20;
const TIMEOUT_MS = 30_000;
const UNREACHABLE_MESSAGE =
  'Could not reach Xquik. Check your connection, then try again.';
const UNREADABLE_MESSAGE =
  'Xquik sent an answer this version cannot read. Update the extension, then try again.';
const NO_ANSWER_MESSAGE =
  'Xquik could not answer right now. Try again in a minute.';

const COUNT = z.number().nullish();
const TEXT = z.string().nullish();

const POST = z.object({
  author: z.object({ name: z.string(), username: z.string() }).nullish(),
  createdAt: TEXT,
  id: z.string(),
  likeCount: COUNT,
  replyCount: COUNT,
  retweetCount: COUNT,
  text: z.string(),
  url: TEXT,
  viewCount: COUNT,
});

const PROFILE = z.object({
  createdAt: TEXT,
  description: TEXT,
  followers: COUNT,
  following: COUNT,
  id: z.string(),
  isVerified: z.boolean().nullish(),
  location: TEXT,
  name: z.string(),
  statusesCount: COUNT,
  url: TEXT,
  username: z.string(),
});

const SEARCH_PAGE = z
  .object({ tweets: z.array(POST) })
  .transform((page): Post[] => page.tweets);

const ACCOUNT = z.object({});
const ERROR_BODY = z.object({ message: z.string() });

type Post = z.output<typeof POST>;
type Profile = z.output<typeof PROFILE>;

interface ApiFailure {
  readonly message: string;
  readonly ok: false;
  readonly status: number;
}

interface ApiSuccess<T> {
  readonly ok: true;
  readonly value: T;
}

type ApiResult<T> = ApiFailure | ApiSuccess<T>;

type FetchFunction = (url: string, init: RequestInit) => Promise<Response>;

interface ClientDeps {
  readonly fetch: FetchFunction;
  readonly version: string;
}

interface XquikClient {
  readonly account: (key: ApiKey) => Promise<ApiResult<object>>;
  readonly lookUpProfile: (
    key: ApiKey,
    input: string,
  ) => Promise<ApiResult<Profile>>;
  readonly searchPosts: (
    key: ApiKey,
    query: string,
  ) => Promise<ApiResult<Post[]>>;
}

function failure(status: number, message: string): ApiFailure {
  return { message, ok: false, status };
}

function readFailure(status: number, body: unknown): ApiFailure {
  const error = ERROR_BODY.safeParse(body);
  return failure(
    status,
    error.success ? error.data.message : NO_ANSWER_MESSAGE,
  );
}

function createClient({ fetch, version }: ClientDeps): XquikClient {
  async function request<T>(
    key: ApiKey,
    path: string,
    schema: z.ZodType<T>,
  ): Promise<ApiResult<T>> {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: { 'user-agent': `xquik-vscode/${version}`, 'x-api-key': key },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }).catch((): undefined => undefined);
    if (response === undefined) return failure(0, UNREACHABLE_MESSAGE);
    const body: unknown = await response
      .json()
      .catch((): undefined => undefined);
    if (!response.ok) return readFailure(response.status, body);
    const parsed = schema.safeParse(body);
    return parsed.success
      ? { ok: true, value: parsed.data }
      : failure(0, UNREADABLE_MESSAGE);
  }

  return {
    account: async (key: ApiKey): Promise<ApiResult<object>> =>
      request(key, '/account', ACCOUNT),
    lookUpProfile: async (
      key: ApiKey,
      input: string,
    ): Promise<ApiResult<Profile>> =>
      request(key, `/x/users/${encodeURIComponent(input.trim())}`, PROFILE),
    searchPosts: async (
      key: ApiKey,
      query: string,
    ): Promise<ApiResult<Post[]>> => {
      const search = new URLSearchParams({
        limit: String(SEARCH_LIMIT),
        q: query,
      });
      return request(key, `/x/tweets/search?${search.toString()}`, SEARCH_PAGE);
    },
  };
}

export { createClient };
export type {
  ApiFailure,
  ApiResult,
  FetchFunction,
  Post,
  Profile,
  XquikClient,
};
