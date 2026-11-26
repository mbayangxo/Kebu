/** Keep Unicode graphemes intact when wrapping or spacing creative text. */
const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });
export function creativeTextGraphemes(text: string): string[] {
  return Array.from(graphemes.segment(text), segment => segment.segment);
}

/** Pre-wrapped text: retain authored spaces/newlines and break oversized words. */
export function wrapCreativeText(text: string, width: number, measure: (text: string) => number): string[] {
  if (!Number.isFinite(width) || width <= 0) throw new RangeError("Text width must be positive.");
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const token of paragraph.match(/\S+|[^\S\n]+/gu) ?? []) {
      if (/\S/u.test(token) && measure(token) <= width) {
        if (line && measure(line + token) > width) { lines.push(line); line = ""; }
        line += token;
      } else {
        for (const character of creativeTextGraphemes(token)) {
          if (line && measure(line + character) > width) { lines.push(line); line = ""; }
          line += character;
        }
      }
    }
    lines.push(line);
  }
  return lines;
}
