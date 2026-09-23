import assert from 'node:assert/strict';
import test from 'node:test';

import { isBlank, nameKey, normaliseName } from '../../src/lib/names.js';
import { slugify, uniqueSlug } from '../../src/lib/slug.js';
import { isValidExternalUrl, safeExternalUrl } from '../../src/lib/url.js';
import { formatDate } from '../../src/lib/dates.js';

test('normaliseName trims and collapses, but never removes, whitespace', () => {
  assert.equal(normaliseName('  Greed  '), 'Greed');
  assert.equal(normaliseName('moon   lit'), 'moon lit');
  assert.equal(normaliseName('moon\t\nlit'), 'moon lit');

  // Collapsing is not removal: these must stay distinct names.
  assert.notEqual(normaliseName('moon lit'), normaliseName('moonlit'));

  assert.equal(normaliseName(null), '');
  assert.equal(normaliseName(undefined), '');
});

test('nameKey makes duplicate detection case- and whitespace-insensitive', () => {
  // The database COLLATE NOCASE catches only the first of these pairs; the
  // rest are exactly why normalisation has to happen before comparison.
  assert.equal(nameKey('Greed'), nameKey('greed'));
  assert.equal(nameKey('Greed'), nameKey('  GREED  '));
  assert.equal(nameKey('moon lit'), nameKey('Moon   Lit'));

  assert.notEqual(nameKey('moon lit'), nameKey('moonlit'));
});

test('isBlank treats whitespace-only input as empty', () => {
  for (const value of ['', '   ', '\t\n', null, undefined]) {
    assert.equal(isBlank(value), true, `${JSON.stringify(value)} is blank`);
  }

  assert.equal(isBlank('a'), false);
  assert.equal(isBlank('  a  '), false);
});

test('slugify produces URL-safe slugs and never returns an empty string', () => {
  assert.equal(slugify('Aria'), 'aria');
  assert.equal(slugify('Aria the Cartographer'), 'aria-the-cartographer');
  assert.equal(slugify('Élodie'), 'elodie', 'accents are folded, not dropped');
  assert.equal(slugify('  spaced   out  '), 'spaced-out');
  assert.equal(slugify('a/b?c#d'), 'a-b-c-d');
  assert.equal(slugify('--hyphens--'), 'hyphens', 'no leading or trailing hyphen');

  // A name of only punctuation would otherwise yield '', which cannot be a URL.
  assert.equal(slugify('!!!'), 'item');
  assert.equal(slugify(''), 'item');
});

test('uniqueSlug appends a counter rather than colliding', () => {
  const taken = new Set(['aria', 'aria-2', 'aria-3']);

  assert.equal(uniqueSlug('Brann', taken), 'brann');
  assert.equal(uniqueSlug('Aria', taken), 'aria-4');

  // Two different names that slugify identically still get distinct slugs.
  const growing = new Set();
  const first = uniqueSlug('Moon Lit', growing);
  growing.add(first);
  const second = uniqueSlug('moon-lit', growing);

  assert.equal(first, 'moon-lit');
  assert.equal(second, 'moon-lit-2');
});

test('safeExternalUrl accepts only absolute http and https URLs', () => {
  assert.equal(safeExternalUrl('https://example.com/art'), 'https://example.com/art');
  assert.equal(safeExternalUrl('http://example.com'), 'http://example.com/');
  assert.equal(safeExternalUrl('  https://example.com/  '), 'https://example.com/');

  for (const bad of [
    'javascript:alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=',
    'file:///etc/passwd',
    '/relative/path',
    'example.com',
    '',
    '   ',
    null,
    undefined,
  ]) {
    assert.equal(safeExternalUrl(bad), null, `${JSON.stringify(bad)} must be rejected`);
  }
});

test('isValidExternalUrl agrees with safeExternalUrl', () => {
  assert.equal(isValidExternalUrl('https://example.com'), true);
  assert.equal(isValidExternalUrl('javascript:alert(1)'), false);
  assert.equal(isValidExternalUrl(''), false);
});

test('formatDate renders a plain date and survives bad input', () => {
  assert.equal(formatDate('2024-03-05T12:34:56.000Z'), '2024-03-05');
  assert.equal(formatDate(''), '');
  assert.equal(formatDate(null), '');
  assert.equal(formatDate('not a date'), '', 'unparseable input must not throw');
});
