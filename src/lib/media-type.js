export const VIDEO_EXTENSIONS = new Map([
  ['video/mp4', 'mp4'],
  ['video/webm', 'webm'],
]);

export function isVideoMime(mime) {
  return typeof mime === 'string' && VIDEO_EXTENSIONS.has(mime);
}

/**
 * Identify a video by its leading bytes, never by the client-declared type.
 * MP4 carries an `ftyp` box at offset 4; WebM (Matroska) starts with the EBML
 * magic number.
 */
export function sniffVideoType(buffer) {
  if (!buffer || buffer.length < 12) return null;

  if (buffer.subarray(4, 8).toString('latin1') === 'ftyp') return 'video/mp4';

  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return 'video/webm';
  }

  return null;
}
