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
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : section.hidden ? 0.55 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="space-y-0.5">
      <div
        className="group flex items-center gap-0.5 rounded-md px-1 py-1"
        style={{
          background: selected ? "#EDEEEF" : "transparent",
          outline: selected ? "1px solid #D4D4D8" : undefined,
        }}
      >
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing px-0.5 text-[10px] text-[#8C8C8C]"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </button>
        <button
          type="button"
          onClick={onToggleExpand}
          className="w-4 shrink-0 text-[9px] text-[#8C8C8C]"
          aria-label={expanded ? "Collapse blocks" : "Expand blocks"}
          aria-expanded={expanded}
        >
          {blocks.length > 0 ? (expanded ? "▾" : "▸") : "·"}
        </button>
        <button
          type="button"
          onClick={onSelect}
          className="min-w-0 flex-1 truncate text-left text-[12px] font-medium tracking-tight"
          style={{ color: "#1A1A1A", fontFamily: "var(--font-jost), system-ui, sans-serif" }}
        >
          {labelForSectionType(section.section_type)}
          {section.hidden ? (
            <span className="ml-1 text-[9px] font-bold uppercase tracking-wider text-[#8C8C8C]">Hidden</span>
          ) : null}
        </button>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button type="button" disabled={isFirst} onClick={onMoveUp} className="rounded px-1 text-[10px] disabled:opacity-20" aria-label="Move up">
            ↑
          </button>
          <button type="button" disabled={isLast} onClick={onMoveDown} className="rounded px-1 text-[10px] disabled:opacity-20" aria-label="Move down">
            ↓
          </button>
          {onToggleHidden ? (
            <button
              type="button"
              onClick={onToggleHidden}
              className="rounded px-1 text-[10px] font-semibold"
              style={{ color: "#5C5C5C" }}
              aria-label={section.hidden ? "Show section" : "Hide section"}
            >
              {section.hidden ? "Show" : "Hide"}
            </button>
          ) : null}
          {onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              className="rounded px-1 text-[10px] font-semibold text-[#B91C1C]"
              aria-label={`Remove ${labelForSectionType(section.section_type)}`}
            >
              ⌫
            </button>
          ) : null}
        </div>
      </div>
      {expanded && blocks.length > 0 ? (
        <ul className="ml-6 space-y-0.5 border-l border-[#E5E5E5] pl-2">
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

/** Shopify-style section list — expandable rows with nested blocks. */
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
      <p className="px-1 py-3 text-[11px] leading-relaxed" style={{ color: "#8C8C8C" }}>
        No sections yet. Use + Add section below — like Shopify’s template list.
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
