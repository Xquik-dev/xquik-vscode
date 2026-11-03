// SPDX-FileCopyrightText: 2026 Xquik Contributors
// SPDX-License-Identifier: MIT

import { expect, it } from 'bun:test';

import type { FetchFunction } from '../src/client';

import { API_KEY } from '../src/apiKey';
import { createClient } from '../src/client';

const KEY = API_KEY.parse('xq_test');

const POST_BODY = {
  author: { name: 'NASA', username: 'NASA', verified: true },
  createdAt: 'Mon Nov 02 22:30:01 +0000 2026',
  id: '1',
  likeCount: 3,
  replyCount: 1,
  retweetCount: 2,
  text: 'Liftoff',
  unknownField: true,
  url: 'https://x.com/NASA/status/1',
  viewCount: 40,
};

const PROFILE_BODY = {
  createdAt: 'Wed Dec 19 20:20:32 +0000 2007',
  description: 'Exploring the universe',
  followers: 92_288_349,
  following: 200,
  id: '11348282',
  isVerified: true,
  location: null,
  name: 'NASA',
  statusesCount: 74_486,
  unknownField: true,
  url: 'http://www.nasa.gov/',
  username: 'NASA',
};

interface FetchCall {
  readonly init: RequestInit;
  readonly url: string;
}

function answering(
  status: number,
  body: string,
): { readonly calls: FetchCall[]; readonly fetch: FetchFunction } {
  const calls: FetchCall[] = [];
  return {
    calls,
    fetch: async (url, init): Promise<Response> => {
      calls.push({ init, url });
      return new Response(body, { status });
    },
  };
}

function clientAnswering(
  status: number,
  body: unknown,
): {
  readonly calls: FetchCall[];
  readonly client: ReturnType<typeof createClient>;
} {
  const { calls, fetch } = answering(status, JSON.stringify(body));
  return { calls, client: createClient({ fetch, version: '0.1.0' }) };
}

it('client > every request goes to xquik.com with the key & the version', async (): Promise<void> => {
  const { calls, client } = clientAnswering(200, {});
  await client.account(KEY);
  expect(calls).toHaveLength(1);
  expect(calls[0]?.url).toBe('https://xquik.com/api/v1/account');
  expect(calls[0]?.init.headers).toStrictEqual({
    'user-agent': 'xquik-vscode/0.1.0',
    'x-api-key': 'xq_test',
  });
});

it('client > a search asks for 20 posts with the query encoded', async (): Promise<void> => {
  const { calls, client } = clientAnswering(200, { tweets: [] });
  await client.searchPosts(KEY, 'from:NASA moon & mars');
  const url = new URL(calls[0]?.url ?? '');
  expect(`${url.origin}${url.pathname}`).toBe(
    'https://xquik.com/api/v1/x/tweets/search',
  );
  expect(url.searchParams.get('q')).toBe('from:NASA moon & mars');
  expect(url.searchParams.get('limit')).toBe('20');
});

it('client > a search returns its posts & ignores unknown fields', async (): Promise<void> => {
  const { client } = clientAnswering(200, {
    filtered_count: 0,
    has_next_page: false,
    next_cursor: '',
    tweets: [POST_BODY],
  });
  expect(await client.searchPosts(KEY, 'moon')).toStrictEqual({
    ok: true,
    value: [
      {
        author: { name: 'NASA', username: 'NASA' },
        createdAt: 'Mon Nov 02 22:30:01 +0000 2026',
        id: '1',
        likeCount: 3,
        replyCount: 1,
        retweetCount: 2,
        text: 'Liftoff',
        url: 'https://x.com/NASA/status/1',
        viewCount: 40,
      },
    ],
  });
});

it('client > a post keeps working when X omits its counts, author & link', async (): Promise<void> => {
  const { client } = clientAnswering(200, {
    tweets: [{ id: '2', text: 'Hello' }],
  });
  expect(await client.searchPosts(KEY, 'moon')).toStrictEqual({
    ok: true,
    value: [{ id: '2', text: 'Hello' }],
  });
});

it.each([
  ['@NASA', 'https://xquik.com/api/v1/x/users/%40NASA'],
  ['  NASA\n', 'https://xquik.com/api/v1/x/users/NASA'],
  [
    'https://x.com/NASA',
    'https://xquik.com/api/v1/x/users/https%3A%2F%2Fx.com%2FNASA',
  ],
])(
  'client > a profile lookup of %j calls %s',
  async (input, url): Promise<void> => {
    const { calls, client } = clientAnswering(200, PROFILE_BODY);
    await client.lookUpProfile(KEY, input);
    expect(calls[0]?.url).toBe(url);
  },
);

it('client > a profile accepts null fields & ignores unknown ones', async (): Promise<void> => {
  const { client } = clientAnswering(200, PROFILE_BODY);
  expect(await client.lookUpProfile(KEY, 'NASA')).toStrictEqual({
    ok: true,
    value: {
      createdAt: 'Wed Dec 19 20:20:32 +0000 2007',
      description: 'Exploring the universe',
      followers: 92_288_349,
      following: 200,
      id: '11348282',
      isVerified: true,
      location: null,
      name: 'NASA',
      statusesCount: 74_486,
      url: 'http://www.nasa.gov/',
      username: 'NASA',
    },
  });
});

it.each([
  [401, 'invalid_key', 'Check your API key.'],
  [402, 'no_credits', 'Add credits to continue.'],
  [404, 'user_not_found', 'That account does not exist.'],
  [429, 'rate_limited', 'Try again in a minute.'],
])(
  'client > a %i answer keeps its status & message',
  async (status, error, message): Promise<void> => {
    const { client } = clientAnswering(status, { error, message, reason: 'x' });
    expect(await client.account(KEY)).toStrictEqual({
      message,
      ok: false,
      status,
    });
  },
);

it.each([
  ['an error body without a message', 500, JSON.stringify({ error: 'x' })],
  ['an HTML error page', 502, '<html>Bad gateway</html>'],
  ['an empty rejection', 401, ''],
])(
  'client > %s keeps its status & asks for a retry',
  async (_name, status, body): Promise<void> => {
    const { fetch } = answering(status, body);
    const result = await createClient({ fetch, version: '0.1.0' }).account(KEY);
    expect(result).toStrictEqual({
      message: 'Xquik could not answer right now. Try again in a minute.',
      ok: false,
      status,
    });
  },
);

it.each([
  ['a success body that is not JSON', 'not json'],
  ['a body that breaks the contract', JSON.stringify({ tweets: [{ id: 1 }] })],
])(
  'client > %s asks for an update instead of rendering',
  async (_name, body): Promise<void> => {
    const { fetch } = answering(200, body);
    const client = createClient({ fetch, version: '0.1.0' });
    expect(await client.searchPosts(KEY, 'moon')).toStrictEqual({
      message:
        'Xquik sent an answer this version cannot read. Update the extension, then try again.',
      ok: false,
      status: 0,
    });
  },
);

it('client > a network failure becomes status 0 with a next step', async (): Promise<void> => {
  const client = createClient({
    fetch: async (): Promise<Response> => {
      throw new TypeError('fetch failed');
    },
    version: '0.1.0',
  });
  expect(await client.account(KEY)).toStrictEqual({
    message: 'Could not reach Xquik. Check your connection, then try again.',
    ok: false,
    status: 0,
  });
});
