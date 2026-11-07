"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import type { RichDocument } from "@/lib/work/rich-text";
import { KEBU } from "@/lib/kebu-brand";

const EXTENSIONS = [
  StarterKit,
  Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
  Placeholder.configure({ placeholder: "Start writing…" }),
];

function ToolbarButton({ active, disabled, label, title, onClick }: { active?: boolean; disabled?: boolean; label: string; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      className="min-h-9 min-w-9 rounded-md px-2 text-xs font-semibold disabled:opacity-30"
      style={{ background: active ? "#FFF3EC" : "transparent", color: active ? KEBU.orange : "inherit" }}
    >
      {label}
    </button>
  );
}

function Toolbar({ editor, disabled }: { editor: Editor; disabled: boolean }) {
  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) return;
    if (!url.trim()) { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };
  return (
    <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-1 border-b pb-2" style={{ borderColor: KEBU.border }}>
      <ToolbarButton title="Bold (Ctrl+B)" label="B" disabled={disabled} active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
      <ToolbarButton title="Italic (Ctrl+I)" label="I" disabled={disabled} active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <ToolbarButton title="Strikethrough" label="S" disabled={disabled} active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} />
      <ToolbarButton title="Inline code" label="</>" disabled={disabled} active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} />
      <span className="mx-1 h-5 w-px" style={{ background: KEBU.border }} />
      <ToolbarButton title="Heading 1" label="H1" disabled={disabled} active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
      <ToolbarButton title="Heading 2" label="H2" disabled={disabled} active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
      <ToolbarButton title="Heading 3" label="H3" disabled={disabled} active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
      <span className="mx-1 h-5 w-px" style={{ background: KEBU.border }} />
      <ToolbarButton title="Bullet list" label="•—" disabled={disabled} active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <ToolbarButton title="Numbered list" label="1." disabled={disabled} active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
      <ToolbarButton title="Quote" label="❝" disabled={disabled} active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
      <ToolbarButton title="Code block" label="{ }" disabled={disabled} active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
      <ToolbarButton title="Divider" label="—" disabled={disabled} onClick={() => editor.chain().focus().setHorizontalRule().run()} />
      <span className="mx-1 h-5 w-px" style={{ background: KEBU.border }} />
      <ToolbarButton title="Link" label="Link" disabled={disabled} active={editor.isActive("link")} onClick={setLink} />
      <span className="mx-1 h-5 w-px" style={{ background: KEBU.border }} />
      <ToolbarButton title="Undo (Ctrl+Z)" label="Undo" disabled={disabled} onClick={() => editor.chain().focus().undo().run()} />
      <ToolbarButton title="Redo (Ctrl+Shift+Z)" label="Redo" disabled={disabled} onClick={() => editor.chain().focus().redo().run()} />
    </div>
  );
}

/**
 * A real TipTap editor bound to a single document's lifetime. `docKey` must
 * change (e.g. the item id) whenever the editor should load a *different*
 * document's `initialContent` — switching it recreates the editor instance,
 * same as React's own key-based remount convention; it does not resync on
 * every render, so the parent owns the actual persisted content between
 * remounts via onUpdate.
 */
export function DocumentEditor({ docKey, initialContent, disabled, onUpdate, onBlur, onSaveShortcut }: {
  docKey: string;
  initialContent: RichDocument;
  disabled: boolean;
  onUpdate: (doc: RichDocument) => void;
  onBlur: () => void;
  onSaveShortcut: () => void;
}) {
  const editor = useEditor({
    extensions: EXTENSIONS,
    content: initialContent,
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "kebu-doc-prose", "aria-label": "Document text" },
      handleKeyDown: (_view, event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "s") { event.preventDefault(); onSaveShortcut(); return true; }
        return false;
      },
    },
    onUpdate: ({ editor: current }) => onUpdate(current.getJSON() as RichDocument),
    onBlur: () => onBlur(),
  }, [docKey]);

  useEffect(() => { editor?.setEditable(!disabled); }, [editor, disabled]);

  if (!editor) return <div className="kebu-doc-prose" />;
  return (
    <div className="mt-3 rounded-xl border bg-white p-4" style={{ borderColor: KEBU.border }}>
      <Toolbar editor={editor} disabled={disabled} />
      <EditorContent editor={editor} className="mt-3" />
    </div>
  );
}
