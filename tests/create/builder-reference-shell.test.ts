import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const chrome = readFileSync("app/components/create/builder-studio-chrome.tsx", "utf8");
const editor = readFileSync("app/create/[id]/page.tsx", "utf8");

describe("reference-led Builder shell", () => {
  it("uses the shared Kebu brand and real ecosystem destinations", () => {
    expect(chrome).toContain("<KebuMark size={30}");
    expect(chrome).toContain("BuilderEcosystemRail");
    expect(chrome).toContain('href: "/studio"');
    expect(chrome).toContain('href: "/library"');
  });

  it("keeps the real editor actions wired", () => {
    expect(chrome).toContain("onSaveDraft");
    expect(chrome).toContain("onPublish");
    expect(chrome).toContain("onUndo");
    expect(chrome).toContain("onRedo");
    expect(chrome).toContain("onPageChange");
    expect(editor).toContain("<BuilderEcosystemRail />");
  });
});
