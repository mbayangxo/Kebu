/**
 * Vitest stand-in for next/font/google. The real loaders only run inside Next's compiler;
 * this returns the same shape, with `variable` echoing the requested CSS variable so tests
 * can assert which theme font variables a render applies.
 */
type FontOptions = { variable?: string };
type LoadedFont = { className: string; variable: string; style: { fontFamily: string } };

function loader(family: string) {
  return (options: FontOptions = {}): LoadedFont => ({
    className: `test-font-${family}`,
    variable: `test-font-var${options.variable ?? ""}`,
    style: { fontFamily: family },
  });
}

export const Abril_Fatface = loader("Abril_Fatface");
export const Bebas_Neue = loader("Bebas_Neue");
export const Dancing_Script = loader("Dancing_Script");
export const Fraunces = loader("Fraunces");
export const Great_Vibes = loader("Great_Vibes");
export const IBM_Plex_Sans = loader("IBM_Plex_Sans");
export const Inter = loader("Inter");
export const Lobster = loader("Lobster");
export const Oswald = loader("Oswald");
export const Pacifico = loader("Pacifico");
export const Playfair_Display = loader("Playfair_Display");
export const Plus_Jakarta_Sans = loader("Plus_Jakarta_Sans");
export const Syne = loader("Syne");
