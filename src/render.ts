// SPDX-FileCopyrightText: 2026 Xquik Contributors
// SPDX-License-Identifier: MIT

import type { Post, Profile } from './client';

const MINUTE_LENGTH = 16;

interface Measure {
  readonly count: number | null | undefined;
  readonly many: string;
  readonly one: string;
}

function joinPresent(parts: readonly string[], separator: string): string {
  return parts.filter((part): boolean => part !== '').join(separator);
}

function labelled(label: string, value: string): string {
  return value === '' ? '' : `${label} ${value}`;
}

function renderMeasure({ count, many, one }: Measure): string {
  if (count === null || count === undefined) return '';
  return `${count.toLocaleString('en-US')} ${count === 1 ? one : many}`;
}

function renderMeasures(measures: readonly Measure[]): string {
  return joinPresent(
    measures.map((measure): string => renderMeasure(measure)),
    ' · ',
  );
}

function renderDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : `${date.toISOString().slice(0, MINUTE_LENGTH).replace('T', ' ')} UTC`;
}

function renderQuote(text: string): string {
  if (text === '') return '';
  return text
    .split('\n')
    .map((line): string => `> ${line}`)
    .join('\n');
}

function renderPost(post: Post): string {
  const heading =
    post.author === null || post.author === undefined
      ? `Post ${post.id}`
      : `@${post.author.username} (${post.author.name})`;
  return joinPresent(
    [
      `## ${heading}`,
      renderQuote(post.text),
      renderMeasures([
        { count: post.likeCount, many: 'likes', one: 'like' },
        { count: post.retweetCount, many: 'reposts', one: 'repost' },
        { count: post.replyCount, many: 'replies', one: 'reply' },
        { count: post.viewCount, many: 'views', one: 'view' },
      ]),
      labelled('Posted', renderDate(post.createdAt ?? '')),
      `[Open on X](${post.url ?? `https://x.com/i/status/${post.id}`})`,
    ],
    '\n\n',
  );
}

function renderPosts(query: string, posts: readonly Post[]): string {
  return [
    `# X posts for \`${query}\``,
    posts.length === 1 ? '1 post' : `${posts.length.toString()} posts`,
    ...posts.map((post): string => renderPost(post)),
  ].join('\n\n');
}

function renderProfile(profile: Profile): string {
  const details = joinPresent(
    [
      labelled('- **Verified**', profile.isVerified === true ? 'Yes' : ''),
      labelled('- **Location**', profile.location ?? ''),
      labelled('- **Joined**', renderDate(profile.createdAt ?? '')),
      labelled('- **Website**', profile.url ?? ''),
    ],
    '\n',
  );
  return joinPresent(
    [
      `# ${profile.name} (@${profile.username})`,
      renderQuote(profile.description ?? ''),
      renderMeasures([
        { count: profile.followers, many: 'followers', one: 'follower' },
        { count: profile.following, many: 'following', one: 'following' },
        { count: profile.statusesCount, many: 'posts', one: 'post' },
      ]),
      details,
      `[Open on X](https://x.com/${profile.username})`,
    ],
    '\n\n',
  );
}

export { renderPosts, renderProfile };
