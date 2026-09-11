"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { labelForSectionType } from "@/lib/create/builder-section-catalog";
import { blocksForSection, type SectionBlockPreview } from "@/lib/create/section-blocks";

type SectionRow = {
  id: string;
  section_type: string;
  sort_order: number;
  hidden?: boolean;
  props?: Record<string, unknown>;
};

/** Small colored pill thumbnail showing section category. */
function SectionIcon({ type }: { type: string }) {
  const { bg, letter } = iconForType(type);
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded text-[8px] font-black uppercase"
      style={{
        width: 20,
        height: 20,
        background: bg,
        color: "#fff",
        letterSpacing: "0.01em",
      }}
    >
      {letter}
    </span>
  );
}

function iconForType(type: string): { bg: string; letter: string } {
  switch (type) {
    case "navigation": return { bg: "#3B82F6", letter: "≡" };
    case "hero": return { bg: "#6366F1", letter: "H" };
    case "editorial-hero": return { bg: "#6366F1", letter: "EH" };
    case "announcement-bar": return { bg: "#F59E0B", letter: "!" };
    case "marquee": return { bg: "#F97316", letter: "~" };
    case "split": return { bg: "#3B82F6", letter: "S" };
    case "category-tiles": return { bg: "#3B82F6", letter: "CT" };
    case "text": return { bg: "#6B7280", letter: "T" };
    case "free-text": return { bg: "#6B7280", letter: "FT" };
    case "features": return { bg: "#6B7280", letter: "F" };
    case "image": return { bg: "#8B5CF6", letter: "I" };
    case "gallery": return { bg: "#8B5CF6", letter: "G" };
    case "video": return { bg: "#8B5CF6", letter: "V" };
    case "audio": return { bg: "#8B5CF6", letter: "A" };
    case "products": return { bg: "#10B981", letter: "P" };
    case "contact": return { bg: "#10B981", letter: "C" };
    case "whatsapp": return { bg: "#25D366", letter: "W" };
    case "map": return { bg: "#10B981", letter: "M" };
    case "form": return { bg: "#F97316", letter: "FM" };
    case "newsletter": return { bg: "#F97316", letter: "N" };
    case "blog-list": return { bg: "#6B7280", letter: "B" };
    case "email-popup": return { bg: "#F97316", letter: "EP" };
    case "testimonials": return { bg: "#F97316", letter: "Q" };
    case "faq": return { bg: "#F97316", letter: "?" };
    case "events": return { bg: "#F97316", letter: "E" };
    case "footer": return { bg: "#3B82F6", letter: "F" };
    default: return { bg: "#9CA3AF", letter: type.slice(0, 2).toUpperCase() };
  }
}

function SortableSectionRow({
  section,
  selected,
  expanded,
  blocks,
  onSelect,
  onToggleExpand,
  onMoveUp,
  onMoveDown,
  onRemove,
  onToggleHidden,
  isFirst,
  isLast,
}: {
  section: SectionRow;
  selected: boolean;
  expanded: boolean;
  blocks: SectionBlockPreview[];
  onSelect: () => void;
  onToggleExpand: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove?: () => void;
  onToggleHidden?: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });
  const [showActions, setShowActions] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : section.hidden ? 0.45 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="space-y-0.5">
      <div
        className="group flex items-center gap-1.5 rounded-lg px-1.5 py-1.5"
        style={{
          background: selected ? "#EEF2FF" : "transparent",
          outline: selected ? "1.5px solid #C7D2FE" : undefined,
        }}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Drag handle */}
        <button
          type="button"
          className="shrink-0 cursor-grab active:cursor-grabbing px-0.5 text-[12px] leading-none"
          style={{ color: "#C0C0C0", touchAction: "none" }}
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>

        {/* Type icon thumbnail */}
        <SectionIcon type={section.section_type} />

        {/* Section label — clicking selects */}
        <button
          type="button"
          onClick={onSelect}
          className="min-w-0 flex-1 truncate text-left text-[12px] font-medium"
          style={{ color: section.hidden ? "#9CA3AF" : "#1A1A1A" }}
        >
          {labelForSectionType(section.section_type)}
          {section.hidden ? (
            <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>
              Hidden
            </span>
          ) : null}
        </button>

        {/* Expand toggle for blocks */}
        {blocks.length > 0 ? (
          <button
            type="button"
            onClick={onToggleExpand}
            className="shrink-0 text-[10px]"
            style={{ color: "#9CA3AF" }}
            aria-label={expanded ? "Collapse blocks" : "Expand blocks"}
            aria-expanded={expanded}
          >
            {expanded ? "▾" : "▸"}
          </button>
        ) : null}

        {/* Hover actions */}
        {showActions || selected ? (
          <div className="flex shrink-0 items-center gap-0.5">
            {onToggleHidden ? (
              <button
                type="button"
                onClick={onToggleHidden}
                className="rounded px-1 py-0.5 text-[9px] font-semibold"
                style={{ color: "#5C5C5C" }}
                aria-label={section.hidden ? "Show" : "Hide"}
              >
                {section.hidden ? "Show" : "Hide"}
              </button>
            ) : null}
            <button
              type="button"
              disabled={isFirst}
              onClick={onMoveUp}
              className="rounded px-0.5 py-0.5 text-[11px] disabled:opacity-20"
              style={{ color: "#5C5C5C" }}
              aria-label="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              disabled={isLast}
              onClick={onMoveDown}
              className="rounded px-0.5 py-0.5 text-[11px] disabled:opacity-20"
              style={{ color: "#5C5C5C" }}
              aria-label="Move down"
            >
              ↓
            </button>
            {onRemove ? (
              <button
                type="button"
                onClick={onRemove}
                className="rounded px-0.5 py-0.5 text-[11px] font-semibold"
                style={{ color: "#DC2626" }}
                aria-label={`Remove ${labelForSectionType(section.section_type)}`}
              >
                ×
              </button>
            ) : null}
          </div>
        ) : null}

        {/* Chevron — always visible, indicates "click to edit" */}
        <button
          type="button"
          onClick={onSelect}
          className="shrink-0 text-[11px] ml-0.5"
          style={{ color: selected ? "#6366F1" : "#C0C0C0" }}
          aria-label="Edit section"
          tabIndex={-1}
        >
          ›
        </button>
      </div>

      {/* Nested blocks */}
      {expanded && blocks.length > 0 ? (
        <ul className="ml-7 space-y-0.5 border-l border-[#E5E7EB] pl-2">
          {blocks.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={onSelect}
                className="w-full truncate rounded px-1.5 py-1 text-left text-[11px] hover:bg-black/[0.04]"
                style={{ color: "#5C5C5C" }}
              >
                {b.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Shopify-style section list — icon thumbnail + chevron + expandable blocks. */
export function BuilderSectionListDnd({
  sections,
  selectedSectionId,
  onSelect,
  onReorder,
  onMoveUp,
  onMoveDown,
  onRemove,
  onToggleHidden,
}: {
  sections: SectionRow[];
  selectedSectionId: string | null;
  onSelect: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onRemove?: (id: string) => void;
  onToggleHidden?: (id: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = sections.map((s) => s.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = [...ids];
    const [removed] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, removed!);
    onReorder(next);
  }

  if (sections.length === 0) {
    return (
      <p className="px-2 py-3 text-[11px] leading-relaxed" style={{ color: "#9CA3AF" }}>
        No sections yet — use + Add section below.
      </p>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-0.5">
          {sections.map((section, index) => {
            const blocks = blocksForSection(section.section_type, section.props);
            const expanded = expandedId === section.id || selectedSectionId === section.id;
            return (
              <SortableSectionRow
                key={section.id}
                section={section}
                selected={selectedSectionId === section.id}
                expanded={expanded}
                blocks={blocks}
                onSelect={() => {
                  onSelect(section.id);
                  setExpandedId(section.id);
                }}
                onToggleExpand={() =>
                  setExpandedId((prev) => (prev === section.id ? null : section.id))
                }
                onMoveUp={() => onMoveUp(section.id)}
                onMoveDown={() => onMoveDown(section.id)}
                onRemove={onRemove ? () => onRemove(section.id) : undefined}
                onToggleHidden={onToggleHidden ? () => onToggleHidden(section.id) : undefined}
                isFirst={index === 0}
                isLast={index === sections.length - 1}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
