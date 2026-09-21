"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
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
import { BUILDER } from "@/lib/create/builder-ui";

type SectionRow = {
  id: string;
  section_type: string;
  sort_order: number;
  hidden?: boolean;
  props?: Record<string, unknown>;
};

function SectionMarker() {
  return <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-black/20" />;
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
  onReorderBlocks,
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
  onReorderBlocks?: (fromIndex: number, toIndex: number) => void;
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
          background: selected ? "rgba(10,10,10,.045)" : "transparent",
          outline: selected ? "1px solid rgba(10,10,10,.08)" : undefined,
        }}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Drag handle — always visible, dims when not focused */}
        <button
          type="button"
          className="shrink-0 cursor-grab active:cursor-grabbing px-0.5 text-[12px] leading-none opacity-40 hover:opacity-100 transition-opacity"
          style={{ color: BUILDER.ink, touchAction: "none" }}
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>

        <SectionMarker />

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

        {showActions || selected ? (
          <details className="relative shrink-0">
            <summary
              className="flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-md text-[13px] text-black/40 hover:bg-black/[.05] hover:text-black"
              aria-label="Section options"
            >
              •••
            </summary>
            <div className="absolute right-0 top-8 z-30 min-w-[132px] rounded-lg border border-black/10 bg-white p-1 shadow-lg">
              {onToggleHidden ? (
                <button type="button" onClick={onToggleHidden} className="w-full rounded-md px-2.5 py-2 text-left text-[10px] font-semibold text-black/65 hover:bg-black/[.04]">
                  {section.hidden ? "Show section" : "Hide section"}
                </button>
              ) : null}
              {onRemove ? (
                <button type="button" onClick={onRemove} className="w-full rounded-md px-2.5 py-2 text-left text-[10px] font-semibold text-red-700 hover:bg-red-50">
                  Remove section
                </button>
              ) : null}
            </div>
          </details>
        ) : null}

        {/* Chevron — always visible, indicates "click to edit" */}
        <button
          type="button"
          onClick={onSelect}
          className="shrink-0 text-[11px] ml-0.5"
          style={{ color: selected ? "#0A0A0A" : "#B8B8B8" }}
          aria-label="Edit section"
          tabIndex={-1}
        >
          ›
        </button>
      </div>

      {/* Nested blocks */}
      {expanded && blocks.length > 0 ? (
        <ul className="ml-7 space-y-0.5 border-l border-[#E5E7EB] pl-2">
          {blocks.map((b, idx) => (
            <li key={b.id} className="group flex items-center gap-1">
              <button
                type="button"
                onClick={onSelect}
                className="min-w-0 flex-1 truncate rounded px-1.5 py-1 text-left text-[11px] hover:bg-black/[0.04]"
                style={{ color: "#5C5C5C" }}
              >
                {b.label}
              </button>
              {onReorderBlocks ? (
                <div className="hidden shrink-0 items-center gap-0 group-hover:flex">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => onReorderBlocks(idx, idx - 1)}
                    className="rounded px-0.5 py-0.5 text-[10px] disabled:opacity-20"
                    style={{ color: "#5C5C5C" }}
                    aria-label="Move item up"
                  >↑</button>
                  <button
                    type="button"
                    disabled={idx === blocks.length - 1}
                    onClick={() => onReorderBlocks(idx, idx + 1)}
                    className="rounded px-0.5 py-0.5 text-[10px] disabled:opacity-20"
                    style={{ color: "#5C5C5C" }}
                    aria-label="Move item down"
                  >↓</button>
                </div>
              ) : null}
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
  onReorderBlocks,
}: {
  sections: SectionRow[];
  selectedSectionId: string | null;
  onSelect: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onRemove?: (id: string) => void;
  onToggleHidden?: (id: string) => void;
  onReorderBlocks?: (sectionId: string, fromIndex: number, toIndex: number) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
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

  const focusActive = selectedSectionId !== null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-0.5">
          {sections.map((section, index) => {
            const blocks = blocksForSection(section.section_type, section.props);
            const expanded = expandedId === section.id || selectedSectionId === section.id;
            const isSelected = selectedSectionId === section.id;
            return (
              <div
                key={section.id}
                style={{
                  opacity: focusActive && !isSelected ? 0.45 : 1,
                  transition: "opacity 0.15s ease",
                }}
              >
                <SortableSectionRow
                  section={section}
                  selected={isSelected}
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
                  onReorderBlocks={onReorderBlocks ? (from, to) => onReorderBlocks(section.id, from, to) : undefined}
                  isFirst={index === 0}
                  isLast={index === sections.length - 1}
                />
              </div>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
