/** Unicode repertoire in the original glyph source; lowercase remains unsupported. */
export const KEBU_DISPLAY_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,-:;!?'()/ÉÈÀÇ";
export function unsupportedKebuDisplayCharacters(text: string): string[] {
  return [...new Set([...text.normalize('NFC')].filter(char => !KEBU_DISPLAY_CHARACTERS.includes(char)))];
}
