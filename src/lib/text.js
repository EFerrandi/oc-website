export function splitParagraphs(text) {
  return String(text)
    .replace(/\r\n?/g, '\n')
    .split(/\n[^\S\n]*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
