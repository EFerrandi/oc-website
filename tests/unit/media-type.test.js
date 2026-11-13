import assert from 'node:assert/strict';
import test from 'node:test';

import { isVideoMime, sniffVideoType } from '../../src/lib/media-type.js';

const mp4 = Buffer.concat([
  Buffer.from([0x00, 0x00, 0x00, 0x18]),
  Buffer.from('ftypmp42'),
  Buffer.alloc(16),
]);
const webm = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(32)]);

test('sniffVideoType recognises MP4 and WebM by content', () => {
  assert.equal(sniffVideoType(mp4), 'video/mp4');
  assert.equal(sniffVideoType(webm), 'video/webm');
});

test('sniffVideoType rejects anything else, whatever its name suggests', () => {
  assert.equal(sniffVideoType(Buffer.from('this is plain text renamed .mp4')), null);
  assert.equal(sniffVideoType(Buffer.alloc(0)), null);
  assert.equal(sniffVideoType(null), null);
  assert.equal(sniffVideoType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), null);
});

test('isVideoMime only matches video types', () => {
  assert.equal(isVideoMime('video/mp4'), true);
  assert.equal(isVideoMime('video/webm'), true);
  assert.equal(isVideoMime('image/gif'), false);
  assert.equal(isVideoMime(undefined), false);
});
