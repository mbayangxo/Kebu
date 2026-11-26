import { z } from "zod";

/**
 * A real ProseMirror/TipTap document node — loose on purpose (TipTap's own node
 * shapes vary by extension), but structurally real: every node is either a leaf
 * text node or has a type and, recursively, real child content. This rejects
 * garbage (a string, a plain object with no `type`, an array) without needing
 * to enumerate every node/mark type TipTap's StarterKit + Link extension produce.
 */
const richNodeSchema: z.ZodType<RichNode> = z.lazy(() =>
  z.object({
    type: z.string().min(1),
    text: z.string().optional(),
    content: z.array(richNodeSchema).optional(),
    marks: z.array(z.object({ type: z.string().min(1) }).passthrough()).optional(),
  }).passthrough(),
);

export type RichNode = {
  type: string;
  text?: string;
  content?: RichNode[];
  marks?: { type: string }[];
  [key: string]: unknown;
};

export const richDocumentSchema = z.object({
  type: z.literal("doc"),
  content: z.array(richNodeSchema).default([]),
}).passthrough();

export type RichDocument = z.infer<typeof richDocumentSchema>;

/** A real recursive text extraction — every text leaf, block boundaries become newlines. */
export function extractPlainText(doc: unknown): string {
  const parsed = richDocumentSchema.safeParse(doc);
  if (!parsed.success) return "";
  const lines: string[] = [];
  let current = "";
  const BLOCK_TYPES = new Set(["paragraph", "heading", "blockquote", "listItem", "codeBlock"]);
  function walk(node: RichNode) {
    if (typeof node.text === "string") { current += node.text; return; }
    const isBlock = BLOCK_TYPES.has(node.type);
    for (const child of node.content ?? []) walk(child);
    if (isBlock) { lines.push(current); current = ""; }
    else if (node.type === "hardBreak") { lines.push(current); current = ""; }
  }
  for (const node of parsed.data.content) walk(node);
  if (current.length) lines.push(current);
  return lines.join("\n").slice(0, 20_000);
}

/** A minimal, real, single-paragraph document for migrating a plain-text body into the rich model. */
export function plainTextToRichDocument(text: string): RichDocument {
  const paragraphs = text.length ? text.split(/\n+/) : [""];
  return {
    type: "doc",
    content: paragraphs.map((line) => ({
      type: "paragraph",
      content: line.length ? [{ type: "text", text: line }] : [],
    })),
  };
}

/** A real, valid, minimal HTML export — escapes text, renders the real block/mark structure. */
export function richDocumentToHtml(doc: unknown, title: string): string {
  const parsed = richDocumentSchema.safeParse(doc);
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  function renderMarks(text: string, marks?: { type: string }[]): string {
    let html = escape(text);
    for (const mark of marks ?? []) {
      if (mark.type === "bold") html = `<strong>${html}</strong>`;
      else if (mark.type === "italic") html = `<em>${html}</em>`;
      else if (mark.type === "strike") html = `<s>${html}</s>`;
      else if (mark.type === "code") html = `<code>${html}</code>`;
    }
    return html;
  }
  function renderInline(nodes: RichNode[]): string {
    return nodes.map((n) => (typeof n.text === "string" ? renderMarks(n.text, n.marks) : n.type === "hardBreak" ? "<br/>" : "")).join("");
  }
  function renderNode(node: RichNode): string {
    const inner = () => renderInline(node.content ?? []);
    const children = () => (node.content ?? []).map(renderNode).join("");
    switch (node.type) {
      case "paragraph": return `<p>${inner()}</p>`;
      case "heading": {
        const level = Math.min(6, Math.max(1, Number((node as { attrs?: { level?: number } }).attrs?.level ?? 1)));
        return `<h${level}>${inner()}</h${level}>`;
      }
      case "bulletList": return `<ul>${children()}</ul>`;
      case "orderedList": return `<ol>${children()}</ol>`;
      case "listItem": return `<li>${children()}</li>`;
      case "blockquote": return `<blockquote>${children()}</blockquote>`;
      case "codeBlock": return `<pre><code>${escape((node.content ?? []).map((n) => n.text ?? "").join(""))}</code></pre>`;
      case "horizontalRule": return "<hr/>";
      default: return children() || inner();
    }
  }
  const body = parsed.success ? parsed.data.content.map(renderNode).join("\n") : "";
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(title)}</title></head><body>${body}</body></html>`;
}
