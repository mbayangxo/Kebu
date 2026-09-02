"use client";

/** Reorder / edit site nav links — used by K-Direction and navigation sections. */
export function NavLinksEditor({
  links,
  onChange,
}: {
  links: { label: string; href: string }[];
  onChange: (next: { label: string; href: string }[]) => void;
}) {
  function move(idx: number, dir: -1 | 1) {
    const next = [...links];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    const a = next[idx]!;
    next[idx] = next[j]!;
    next[j] = a;
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#FF5500" }}>
        Nav menu — reorder with ↑ ↓
      </p>
      {links.map((link, idx) => (
        <div key={idx} className="space-y-1 rounded-lg p-2" style={{ border: "1px solid #EEE" }}>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded px-1.5 py-0.5 text-[10px] font-bold"
              style={{ border: "1px solid #DDE0F0" }}
              disabled={idx === 0}
              onClick={() => move(idx, -1)}
              aria-label="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              className="rounded px-1.5 py-0.5 text-[10px] font-bold"
              style={{ border: "1px solid #DDE0F0" }}
              disabled={idx === links.length - 1}
              onClick={() => move(idx, 1)}
              aria-label="Move down"
            >
              ↓
            </button>
            <span className="text-[9px] opacity-50">{idx + 1}</span>
            <button
              type="button"
              className="ml-auto text-[10px] font-bold uppercase text-red-600"
              onClick={() => onChange(links.filter((_, i) => i !== idx))}
            >
              Remove
            </button>
          </div>
          <input
            className="w-full text-xs rounded px-2 py-1"
            style={{ border: "1px solid #DDE0F0" }}
            value={link.label}
            placeholder="Label (Artist, Events…)"
            onChange={(e) => {
              const next = [...links];
              next[idx] = { ...next[idx]!, label: e.target.value };
              onChange(next);
            }}
          />
          <input
            className="w-full text-xs rounded px-2 py-1"
            style={{ border: "1px solid #DDE0F0" }}
            value={link.href}
            placeholder="/page or https://…"
            onChange={(e) => {
              const next = [...links];
              next[idx] = { ...next[idx]!, href: e.target.value };
              onChange(next);
            }}
          />
        </div>
      ))}
      <button
        type="button"
        className="w-full rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
        style={{ border: "1px solid #DDE0F0" }}
        onClick={() => onChange([...links, { label: "New page", href: "/about" }])}
      >
        + Add nav link
      </button>
    </div>
  );
}
