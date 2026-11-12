import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const read=(p:string)=>readFileSync(join(process.cwd(),p),"utf8");
describe("Studio brand tools and editor craft",()=>{
 it("scopes brand kits to the active Kebu workspace",()=>{const s=read("app/api/studio/brand-kit/route.ts");expect(s).toContain("loadActiveWorkspaceScope");expect(s).toContain("Switch to the Kebu space that owns this brand kit.");expect(s).toContain('.eq("business_id", workspace.activeBusinessId)')});
 it("exposes usable tools rather than placeholder app cards",()=>{const s=read("app/components/studio/studio-tools-panel.tsx");expect(s).toContain('title="Tools"');expect(s).toContain('action:"text"');expect(s).toContain('href:"/studio/templates"')});
 it("integrates tools, richer layers and inspector into the real editor",()=>{const s=read("app/components/studio/studio-canvas-editor.tsx");expect(s).toContain("StudioToolsPanel");expect(s).toContain("Top layer appears first");expect(s).toContain("Inspector");expect(s).toContain("Unlock layer")});
 it("keeps brand application editable and workspace-aware",()=>{const s=read("app/components/studio/studio-brand-apply-panel.tsx");expect(s).toContain("editable, never flattened");expect(s).toContain("Business Kebu brand system");expect(s).toContain("/studio/brand")});
});