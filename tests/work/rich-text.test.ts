import { describe, expect, it } from "vitest";
import { extractPlainText, plainTextToRichDocument, richDocumentSchema, richDocumentToHtml } from "@/lib/work/rich-text";

describe("richDocumentSchema", () => {
  it("accepts a real TipTap document", () => {
    const doc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hi" }] }] };
    expect(richDocumentSchema.safeParse(doc).success).toBe(true);
  });
  it("rejects garbage that is not a real document tree", () => {
    expect(richDocumentSchema.safeParse("just a string").success).toBe(false);
    expect(richDocumentSchema.safeParse([]).success).toBe(false);
    expect(richDocumentSchema.safeParse({ content: [] }).success).toBe(false); // missing type:"doc"
    expect(richDocumentSchema.safeParse({ type: "doc", content: [{ text: "no type" }] }).success).toBe(false);
  });
  it("preserves unknown attrs via passthrough instead of stripping them", () => {
    const doc = { type: "doc", content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "T" }] }] };
    const parsed = richDocumentSchema.parse(doc);
    expect((parsed.content[0] as { attrs?: { level: number } }).attrs?.level).toBe(2);
  });
});

describe("extractPlainText", () => {
  it("joins block boundaries with newlines and concatenates inline text", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Hello " }, { type: "text", text: "world", marks: [{ type: "bold" }] }] },
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Title" }] },
      ],
    };
    expect(extractPlainText(doc)).toBe("Hello world\nTitle");
  });
  it("turns a hardBreak into a line boundary within a single paragraph", () => {
    const doc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "line1" }, { type: "hardBreak" }, { type: "text", text: "line2" }] }] };
    expect(extractPlainText(doc)).toBe("line1\nline2");
  });
  it("returns empty string for a non-document instead of throwing", () => {
    expect(extractPlainText(null)).toBe("");
    expect(extractPlainText("not a doc")).toBe("");
    expect(extractPlainText({ type: "wrong" })).toBe("");
  });
  it("truncates at 20,000 characters, matching the body column's own limit", () => {
    const doc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x".repeat(25000) }] }] };
    expect(extractPlainText(doc).length).toBe(20000);
  });
});

describe("plainTextToRichDocument / extractPlainText round-trip", () => {
  it("round-trips multi-line plain text through the rich document shape", () => {
    const text = "first line\nsecond line";
    const doc = plainTextToRichDocument(text);
    expect(richDocumentSchema.safeParse(doc).success).toBe(true);
    expect(extractPlainText(doc)).toBe(text);
  });
  it("produces a valid empty document for empty text", () => {
    const doc = plainTextToRichDocument("");
    expect(richDocumentSchema.safeParse(doc).success).toBe(true);
    expect(extractPlainText(doc)).toBe("");
  });
});

describe("richDocumentToHtml", () => {
  it("escapes text and renders real mark/block structure", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "<script>alert(1)</script>" }] },
        { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "item", marks: [{ type: "bold" }] }] }] }] },
      ],
    };
    const html = richDocumentToHtml(doc, "My Doc");
    expect(html).toContain("<title>My Doc</title>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("<ul><li><p><strong>item</strong></p></li></ul>");
  });
  it("renders a valid empty document instead of throwing on invalid input", () => {
    const html = richDocumentToHtml("not a document", "Untitled");
    expect(html).toContain("<title>Untitled</title>");
    expect(html).toContain("<body></body>");
  });
});
