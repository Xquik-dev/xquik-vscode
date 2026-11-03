// SPDX-FileCopyrightText: 2026 Xquik Contributors
// SPDX-License-Identifier: MIT

import { expect, it } from 'bun:test';

import { renderPosts, renderProfile } from '../src/render';

it('renderPosts > a post shows its author, text, counts, date & link', (): void => {
  const markdown = renderPosts('from:NASA', [
    {
      author: { name: 'NASA', username: 'NASA' },
      createdAt: 'Mon Nov 02 22:30:01 +0000 2026',
      id: '1',
      likeCount: 12_345,
      replyCount: 1,
      retweetCount: 2,
      text: 'Liftoff\nWe have liftoff',
      url: 'https://x.com/NASA/status/1',
      viewCount: 1_000_000,
    },
  ]);
  expect(markdown).toBe(
    [
      '# X posts for `from:NASA`',
      '1 post',
      '## @NASA (NASA)',
      '> Liftoff\n> We have liftoff',
      '12,345 likes · 2 reposts · 1 reply · 1,000,000 views',
      'Posted 2026-11-02 22:30 UTC',
      '[Open on X](https://x.com/NASA/status/1)',
    ].join('\n\n'),
  );
});

it('renderPosts > a post with only an id & text still links to X', (): void => {
  expect(renderPosts('moon', [{ id: '2', text: 'Hello' }])).toBe(
    [
      '# X posts for `moon`',
      '1 post',
      '## Post 2',
      '> Hello',
      '[Open on X](https://x.com/i/status/2)',
    ].join('\n\n'),
  );
});

it('renderPosts > a count of 0 stays visible & null counts drop out', (): void => {
  const markdown = renderPosts('moon', [
    { id: '3', likeCount: 0, text: 'Quiet', viewCount: null },
  ]);
  expect(markdown).toContain('\n\n0 likes\n\n');
  expect(markdown).not.toContain('views');
});

it('renderPosts > an ISO date renders like a live X date', (): void => {
  const markdown = renderPosts('moon', [
    { createdAt: '2025-01-15T12:00:00Z', id: '4', text: 'Dated' },
  ]);
  expect(markdown).toContain('Posted 2025-01-15 12:00 UTC');
});

it('renderPosts > a date that cannot be parsed stays as X sent it', (): void => {
  const markdown = renderPosts('moon', [
    { createdAt: 'yesterday', id: '5', text: 'Dated' },
  ]);
  expect(markdown).toContain('Posted yesterday');
});

it('renderPosts > several posts keep their order under a total', (): void => {
  const markdown = renderPosts('moon', [
    { id: '6', text: 'First' },
    { id: '7', text: 'Second' },
  ]);
  expect(markdown).toContain('\n\n2 posts\n\n');
  expect(markdown.indexOf('First')).toBeLessThan(markdown.indexOf('Second'));
});

it('renderProfile > a full profile shows its bio, counts, details & link', (): void => {
  const markdown = renderProfile({
    createdAt: 'Wed Dec 19 20:20:32 +0000 2007',
    description: 'Exploring the universe\nFor everyone',
    followers: 92_288_349,
    following: 200,
    id: '11348282',
    isVerified: true,
    location: 'Pale Blue Dot',
    name: 'NASA',
    statusesCount: 74_486,
    url: 'http://www.nasa.gov/',
    username: 'NASA',
  });
  expect(markdown).toBe(
    [
      '# NASA (@NASA)',
      '> Exploring the universe\n> For everyone',
      '92,288,349 followers · 200 following · 74,486 posts',
      [
        '- **Verified** Yes',
        '- **Location** Pale Blue Dot',
        '- **Joined** 2007-12-19 20:20 UTC',
        '- **Website** http://www.nasa.gov/',
      ].join('\n'),
      '[Open on X](https://x.com/NASA)',
    ].join('\n\n'),
  );
});

it('renderProfile > a sparse profile shows only what X returned', (): void => {
  expect(
    renderProfile({
      description: '',
      id: '1',
      isVerified: false,
      location: null,
      name: 'Name',
      username: 'name',
    }),
  ).toBe(['# Name (@name)', '[Open on X](https://x.com/name)'].join('\n\n'));
});
