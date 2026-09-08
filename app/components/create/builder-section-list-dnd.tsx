"use client";

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

type SectionRow = {
  id: string;
  section_type: string;
  sort_order: number;
};

function SortableSectionRow({
  section,
  selected,
  onSelect,
  onMoveUp,
  onMoveDown,
  onRemove,
  isFirst,
  isLast,
}: {
  section: SectionRow;
  selected: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove?: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border px-2 py-2 flex items-center gap-2 ${
        selected ? "border-[#FF5500] bg-[#FFF3EB]" : "border-[#E8E6DF] bg-white"
      }`}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-[10px] px-1 text-[#8A8074]"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <button type="button" onClick={onSelect} className="flex-1 text-left text-xs font-semibold truncate">
        {labelForSectionType(section.section_type)}
      </button>
      <div className="flex gap-1 shrink-0">
        <button type="button" disabled={isFirst} onClick={onMoveUp} className="text-[10px] px-1 disabled:opacity-30">
          ↑
        </button>
        <button type="button" disabled={isLast} onClick={onMoveDown} className="text-[10px] px-1 disabled:opacity-30">
          ↓
        </button>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="text-[10px] px-1.5 font-semibold text-[#B91C1C]"
            aria-label={`Remove ${labelForSectionType(section.section_type)}`}
          >
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function BuilderSectionListDnd({
  sections,
  selectedSectionId,
  onSelect,
  onReorder,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  sections: SectionRow[];
  selectedSectionId: string | null;
  onSelect: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  /** Shorten the page — persists via DELETE sections. */
  onRemove?: (id: string) => void;
}) {
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

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {sections.map((section, idx) => (
            <SortableSectionRow
              key={section.id}
              section={section}
              selected={selectedSectionId === section.id}
              onSelect={() => onSelect(section.id)}
              onMoveUp={() => onMoveUp(section.id)}
              onMoveDown={() => onMoveDown(section.id)}
              onRemove={onRemove ? () => onRemove(section.id) : undefined}
              isFirst={idx === 0}
              isLast={idx === sections.length - 1}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
