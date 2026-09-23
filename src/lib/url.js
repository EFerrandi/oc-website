/**
 * Accept only absolute http/https URLs.
 *
 * Anything else (empty, malformed, javascript:, relative) returns null, and
 * callers then render the name as plain text rather than a broken or unsafe
 * link (FR-005).
 */
export function safeExternalUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  return parsed.href;
}

export function isValidExternalUrl(value) {
  return safeExternalUrl(value) !== null;
}
