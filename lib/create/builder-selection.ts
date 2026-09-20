export type BuilderElementKind = "text" | "image" | "cutout" | "background" | "control";

export type BuilderElementSelection = {
  sectionId: string;
  elementId: string;
  kind: BuilderElementKind;
  label: string;
};

export function builderElementSelection(
  sectionId: string,
  elementId: string,
  kind: BuilderElementKind,
  label: string,
): BuilderElementSelection {
  return {
    sectionId,
    elementId,
    kind,
    label: label.trim() || "Element",
  };
}

export function selectionBelongsToSection(
  selection: BuilderElementSelection | null,
  sectionId: string | null,
): boolean {
  return Boolean(selection && sectionId && selection.sectionId === sectionId);
}
