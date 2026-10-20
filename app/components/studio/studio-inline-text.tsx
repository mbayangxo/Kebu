"use client";

import { useLayoutEffect, useRef, type CSSProperties } from "react";

/** The browser owns the editing DOM so document updates cannot reset the caret. */
export function StudioInlineText({ text, name, editing, style, onChange, onFinish, onCancel }: {
  text: string;
  name: string;
  editing: boolean;
  style: CSSProperties;
  onChange: (text: string) => void;
  onFinish: (changed: boolean) => void;
  onCancel: (original: string) => void;
}) {
  const element = useRef<HTMLParagraphElement>(null);
  const session = useRef({ active: false, initial: text, draft: text, composing: false });

  useLayoutEffect(() => {
    const node = element.current;
    if (!node) return;
    if (!editing) {
      if (node.textContent !== text) node.textContent = text;
      session.current = { active: false, initial: text, draft: text, composing: false };
    } else if (!session.current.active) {
      node.textContent = text;
      session.current = { active: true, initial: text, draft: text, composing: false };
      node.focus({ preventScroll: true });
      const range = document.createRange();
      range.selectNodeContents(node); range.collapse(false);
      const selection = window.getSelection();
      selection?.removeAllRanges(); selection?.addRange(range);
    } else if (!session.current.composing && text !== session.current.draft) {
      // A deliberate external edit/undo may replace the text. Local echoes never do.
      node.textContent = text;
      session.current.draft = text;
    }
  }, [editing, text]);

  function publishInput() {
    const node = element.current;
    if (!node || !session.current.active || session.current.composing) return;
    const next = node.innerText.slice(0, 500);
    if (node.innerText !== next) node.innerText = next;
    if (next === session.current.draft) return;
    session.current.draft = next;
    onChange(next);
  }

  return <p
    ref={element}
    style={style}
    role={editing ? "textbox" : undefined}
    aria-label={editing ? `Edit ${name}` : undefined}
    aria-multiline={editing ? true : undefined}
    contentEditable={editing ? "plaintext-only" : false}
    suppressContentEditableWarning
    onPointerDown={event => { if (editing) event.stopPropagation(); }}
    onInput={publishInput}
    onCompositionStart={() => { session.current.composing = true; }}
    onCompositionEnd={() => { session.current.composing = false; publishInput(); }}
    onBlur={() => {
      const current = session.current;
      if (!current.active) return;
      current.composing = false; publishInput(); current.active = false;
      onFinish(current.draft !== current.initial);
    }}
    onKeyDown={event => {
      if (!editing) return;
      event.stopPropagation();
      if (event.nativeEvent.isComposing || event.keyCode === 229) return;
      if (event.key === "Escape") {
        event.preventDefault();
        session.current.active = false;
        onCancel(session.current.initial);
        event.currentTarget.blur();
      } else if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault(); event.currentTarget.blur();
      }
    }}
  />;
}
