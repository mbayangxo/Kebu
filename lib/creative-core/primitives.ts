/**
 * Pilot native primitives (3C DESIGN FREEZE D3): section, group, text, image.
 *
 * Strict schemas — unknown props are rejected on write. Props are optional unless content
 * needs them; the renderer supplies the visual default for an absent prop, so `unsetProp`
 * always means "back to the type default".
 */
import { compositionProps, compositionProperties, groupCompositionProps, groupCompositionProperties } from "./composition";
import { richRunsSchema } from "./rich-text";
import { z } from "zod";
import { visualEffectProps, visualEffectProperties } from "./visual-effects";
import { validateNativeMotion } from "./motion";
import type { Capability, NodeTypeDefinition, PropertyDescriptor } from "./registry";
import { spatialProps, spatialProperties, canvasHeightProperty, canvasHeightSchema } from "./spatial";

/** Hex colour or a theme token reference (`token:primary`). */
const colorValue = z
  .string()
  .trim()
  .max(40)
  .regex(/^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|token:[a-zA-Z][a-zA-Z0-9]{0,31})$/, "Use a hex colour or a theme colour");

/** Same allow-list as 3B `safeHref`. */
const linkValue = z
  .string()
  .trim()
  .max(300)
  .refine(
    (v) =>
      v === "" ||
      v.startsWith("#") ||
      (v.startsWith("/") && !v.startsWith("//") && !v.includes("\\")) ||
      v.startsWith("https://") ||
      v.startsWith("http://") ||
      v.startsWith("mailto:") ||
      v.startsWith("tel:") ||
      /^[a-z0-9][a-z0-9-]*$/.test(v),
    { message: "Invalid link" },
  );

/** HTTPS URL or same-origin public asset path (as 3B `imageUrl`, without plain http). */
const imageSrc = z.union([
  z.literal(""),
  z.string().trim().max(2000).regex(/^https:\/\/[^\s"'<>]+$/, "Image address must start with https://"),
  z.string().trim().max(2000).regex(/^\/(?!\/)[a-zA-Z0-9._\-/]+(\?[a-zA-Z0-9._\-=&%]+)?$/, "Invalid image path"),
]);

const space = z.enum(["none", "sm", "md", "lg", "xl"]);
const align = z.enum(["start", "center", "end"]);

const SPACE_OPTIONS = [
  { value: "none", label: "None" },
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
  { value: "xl", label: "Extra large" },
] as const;
const ALIGN_OPTIONS = [
  { value: "start", label: "Start" },
  { value: "center", label: "Centre" },
  { value: "end", label: "End" },
] as const;

const PILOT_CHILDREN = ["group", "text", "image", "video"] as const;
const MAX_CHILDREN = 50;
const childOrderSchema = z.array(z.uuid()).max(MAX_CHILDREN).refine(ids => new Set(ids).size === ids.length, "Each child may appear only once").optional();
const childOrderProperty: PropertyDescriptor = { key: "childOrder", label: "Order inside this container", control: "order", capability: "nesting", overridable: true, group: "layout" };

const caps = (...list: Capability[]) => new Set<Capability>(list);
const prop = (d: PropertyDescriptor) => d;

export const sectionPropsSchema = z.strictObject({
  gap: space.optional(),
  minHeightVh: z.number().finite().min(0).max(100).optional(),
  contentPlacement: z.enum(["start","center","end"]).optional(),
  childOrder: childOrderSchema,
  canvasHeight: canvasHeightSchema,
  background: colorValue.optional(),
  paddingY: space.optional(),
  width: z.enum(["narrow", "default", "wide", "full"]).optional(),
  align: align.optional(),
  hidden: z.boolean().optional(),
});

export const groupPropsSchema = z.strictObject({
  ...groupCompositionProps,
  background: colorValue.optional(),
  ...visualEffectProps,
  childOrder: childOrderSchema,
  ...spatialProps,
  ...compositionProps,
  canvasHeight: canvasHeightSchema,
  direction: z.enum(["row", "column"]).optional(),
  gap: space.optional(),
  align: z.enum(["start", "center", "end", "stretch"]).optional(),
  justify: z.enum(["start", "center", "end", "between"]).optional(),
  wrap: z.boolean().optional(),
  hidden: z.boolean().optional(),
});

export const textPropsSchema = z.strictObject({
  ...visualEffectProps,
  fontSize: z.number().finite().min(8).max(256).optional(),
  lineHeight: z.number().finite().min(0.8).max(3).optional(),
  letterSpacing: z.number().finite().min(-10).max(30).optional(),
  ...spatialProps,
  ...compositionProps,
  text: z.string().max(5000),
  runs: richRunsSchema.optional(),
  variant: z.enum(["heading", "subheading", "body", "eyebrow", "caption"]).optional(),
  align: align.optional(),
  color: colorValue.optional(),
  href: linkValue.optional(),
  hidden: z.boolean().optional(),
});

export const imagePropsSchema = z.strictObject({
  ...visualEffectProps,
  focalX: z.number().finite().min(0).max(100).optional(),
  focalY: z.number().finite().min(0).max(100).optional(),
  ...spatialProps,
  ...compositionProps,
  src: imageSrc,
  fit: z.enum(["cover", "contain"]).optional(),
  aspectRatio: z.enum(["auto", "1:1", "4:3", "3:2", "16:9", "3:4", "2:3"]).optional(),
  radius: z.enum(["none", "sm", "md", "lg", "full"]).optional(),
  href: linkValue.optional(),
  hidden: z.boolean().optional(),
});

export const sectionDefinition: NodeTypeDefinition = {
  type: "section",
  version: 1,
  displayName: "Section",
  capabilities: caps("layout.positioned", "layout.flow", "nesting", "fill", "responsive.overrides", "a11y", "motion", "interaction"),
  propsSchema: sectionPropsSchema,
  writePolicy: "reject-unknown",
  validateWrite: validateNativeMotion,
  properties: [
    prop({key:"gap",label:"Spacing between items",control:"select",capability:"layout.flow",overridable:true,group:"layout",options:SPACE_OPTIONS}),
    prop({key:"minHeightVh",label:"Minimum height (% of screen)",control:"number",capability:"layout.flow",overridable:true,group:"layout"}),
    prop({key:"contentPlacement",label:"Vertical content position",control:"select",capability:"layout.flow",overridable:true,group:"layout",options:ALIGN_OPTIONS}),
    canvasHeightProperty,
    childOrderProperty,
    prop({ key: "background", label: "Background colour", control: "color", capability: "fill", overridable: false, group: "style" }),
    prop({ key: "paddingY", label: "Vertical spacing", control: "select", capability: "layout.flow", overridable: true, group: "layout", options: SPACE_OPTIONS }),
    prop({
      key: "width",
      label: "Content width",
      control: "select",
      capability: "layout.flow",
      overridable: true,
      group: "layout",
      options: [
        { value: "narrow", label: "Narrow" },
        { value: "default", label: "Default" },
        { value: "wide", label: "Wide" },
        { value: "full", label: "Full width" },
      ],
    }),
    prop({ key: "align", label: "Content alignment", control: "select", capability: "layout.flow", overridable: true, group: "layout", options: ALIGN_OPTIONS }),
  ],
  children: { allow: PILOT_CHILDREN, max: MAX_CHILDREN },
  placement: "root",
  migrations: [],
  a11yDefaults: { role: "region" },
};

export const groupDefinition: NodeTypeDefinition = {
  type: "group",
  version: 1,
  displayName: "Group",
  capabilities: caps("layout.positioned", "layout.flow", "nesting", "fill", "responsive.overrides", "a11y", "motion", "interaction", "effects", "mask"),
  propsSchema: groupPropsSchema,
  writePolicy: "reject-unknown",
  validateWrite: validateNativeMotion,
  properties: [
    ...spatialProperties,
    ...compositionProperties,
    ...visualEffectProperties,
    ...groupCompositionProperties,
    prop({key:"background",label:"Background colour",control:"color",capability:"fill",overridable:false,group:"style"}),
    canvasHeightProperty,
    childOrderProperty,
    prop({
      key: "direction",
      label: "Direction",
      control: "select",
      capability: "layout.flow",
      overridable: true,
      group: "layout",
      options: [
        { value: "row", label: "Side by side" },
        { value: "column", label: "Stacked" },
      ],
    }),
    prop({ key: "gap", label: "Spacing between items", control: "select", capability: "layout.flow", overridable: true, group: "layout", options: SPACE_OPTIONS }),
    prop({
      key: "align",
      label: "Cross-axis alignment",
      control: "select",
      capability: "layout.flow",
      overridable: true,
      group: "layout",
      options: [...ALIGN_OPTIONS, { value: "stretch", label: "Stretch" }],
    }),
    prop({
      key: "justify",
      label: "Main-axis distribution",
      control: "select",
      capability: "layout.flow",
      overridable: true,
      group: "layout",
      options: [...ALIGN_OPTIONS, { value: "between", label: "Space between" }],
    }),
    prop({ key: "wrap", label: "Wrap items", control: "toggle", capability: "layout.flow", overridable: true, group: "layout" }),
  ],
  children: { allow: PILOT_CHILDREN, max: MAX_CHILDREN },
  placement: "nested",
  migrations: [],
};

export const textDefinition: NodeTypeDefinition = {
  type: "text",
  version: 1,
  displayName: "Text",
  capabilities: caps("layout.positioned", "text.edit", "typography", "fill", "links", "responsive.overrides", "a11y", "motion", "interaction", "effects", "mask"),
  propsSchema: textPropsSchema,
  writePolicy: "reject-unknown",
  validateWrite: validateNativeMotion,
  properties: [
    ...spatialProperties,
    ...compositionProperties,
    ...visualEffectProperties,
    ...([["fontSize", "Font size (px)"], ["lineHeight", "Line height"], ["letterSpacing", "Letter spacing (px)"]] as const).map(([key, label]) => prop({ key, label, control: "number", capability: "typography", overridable: true, group: "style" })),
    prop({ key: "runs", label: "Rich text formatting", control: "rich-text", capability: "text.edit", overridable: true, group: "content" }),
    prop({ key: "text", label: "Text", control: "textarea", capability: "text.edit", overridable: true, group: "content" }),
    prop({
      key: "variant",
      label: "Text style",
      control: "select",
      capability: "typography",
      overridable: true,
      group: "style",
      options: [
        { value: "heading", label: "Heading" },
        { value: "subheading", label: "Subheading" },
        { value: "body", label: "Body" },
        { value: "eyebrow", label: "Eyebrow" },
        { value: "caption", label: "Caption" },
      ],
    }),
    prop({ key: "align", label: "Text alignment", control: "select", capability: "typography", overridable: true, group: "style", options: ALIGN_OPTIONS }),
    prop({ key: "color", label: "Text colour", control: "color", capability: "fill", overridable: false, group: "style" }),
    prop({ key: "href", label: "Link", control: "link", capability: "links", overridable: false, group: "content" }),
  ],
  children: "none",
  placement: "nested",
  migrations: [],
};

export const imageDefinition: NodeTypeDefinition = {
  type: "image",
  version: 1,
  displayName: "Image",
  capabilities: caps("layout.positioned", "media", "links", "responsive.overrides", "a11y", "motion", "interaction", "effects", "mask"),
  propsSchema: imagePropsSchema,
  writePolicy: "reject-unknown",
  validateWrite: validateNativeMotion,
  properties: [
    ...spatialProperties,
    ...compositionProperties,
    ...visualEffectProperties,
    ...([["focalX", "Horizontal focal point (%)"], ["focalY", "Vertical focal point (%)"]] as const).map(([key, label]) => prop({ key, label, control: "number", capability: "media", overridable: true, group: "style" })),
    prop({ key: "src", label: "Image", control: "media", capability: "media", overridable: true, group: "content" }),
    prop({
      key: "fit",
      label: "Image fit",
      control: "select",
      capability: "media",
      overridable: true,
      group: "style",
      options: [
        { value: "cover", label: "Fill the frame" },
        { value: "contain", label: "Show whole image" },
      ],
    }),
    prop({
      key: "aspectRatio",
      label: "Aspect ratio",
      control: "select",
      capability: "media",
      overridable: true,
      group: "layout",
      options: [
        { value: "auto", label: "Original" },
        { value: "1:1", label: "Square" },
        { value: "4:3", label: "4:3" },
        { value: "3:2", label: "3:2" },
        { value: "16:9", label: "16:9" },
        { value: "3:4", label: "3:4 portrait" },
        { value: "2:3", label: "2:3 portrait" },
      ],
    }),
    prop({
      key: "radius",
      label: "Corner rounding",
      control: "select",
      capability: "media",
      overridable: false,
      group: "style",
      options: [
        { value: "none", label: "Square" },
        { value: "sm", label: "Small" },
        { value: "md", label: "Medium" },
        { value: "lg", label: "Large" },
        { value: "full", label: "Round" },
      ],
    }),
    prop({ key: "href", label: "Link", control: "link", capability: "links", overridable: false, group: "content" }),
  ],
  children: "none",
  placement: "nested",
  migrations: [],
  a11yDefaults: { role: "img" },
};


export const videoPropsSchema = z.strictObject({
  ...spatialProps,
  ...compositionProps, ...visualEffectProps,
  src: imageSrc, poster: imageSrc.optional(),
  captionsSrc: imageSrc.optional(), captionsLanguage: z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/).max(35).optional(),
  fit: z.enum(["cover","contain"]).optional(), aspectRatio: z.enum(["auto","1:1","4:3","16:9","3:4"]).optional(),
  hidden: z.boolean().optional(),
});
export const videoDefinition: NodeTypeDefinition = {
 type:"video",version:1,displayName:"Video",capabilities:caps("layout.positioned","media","responsive.overrides","a11y","motion","interaction","effects","mask"),
 propsSchema:videoPropsSchema,writePolicy:"reject-unknown",validateWrite:validateNativeMotion,
 properties:[...spatialProperties,...compositionProperties,...visualEffectProperties,
  prop({key:"src",label:"Video address",control:"video",capability:"media",overridable:true,group:"content"}),
  prop({key:"poster",label:"Poster image",control:"media",capability:"media",overridable:true,group:"content"}),
  prop({key:"captionsSrc",label:"Captions address (.vtt)",control:"text",capability:"media",overridable:true,group:"content"}),
  prop({key:"captionsLanguage",label:"Caption language (e.g. en or fr)",control:"text",capability:"media",overridable:true,group:"content"}),
  prop({key:"fit",label:"Video fit",control:"select",capability:"media",overridable:true,group:"style",options:[{value:"contain",label:"Show whole video"},{value:"cover",label:"Fill the frame"}]}),
  prop({key:"aspectRatio",label:"Aspect ratio",control:"select",capability:"media",overridable:true,group:"layout",options:[{value:"auto",label:"Original"},{value:"1:1",label:"Square"},{value:"4:3",label:"4:3"},{value:"16:9",label:"16:9"},{value:"3:4",label:"Portrait"}]}),
 ],children:"none",placement:"nested",migrations:[],
};

export const PILOT_DEFINITIONS: readonly NodeTypeDefinition[] = [sectionDefinition, groupDefinition, textDefinition, imageDefinition, videoDefinition];

/** Visual defaults shared by the native renderer and inspector, never eagerly persisted. */
export const PILOT_DEFAULT_PROPS: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
  section: { paddingY: "lg", width: "default", align: "start" },
  group: { direction: "column", gap: "md", align: "stretch", justify: "start", wrap: false },
  text: { variant: "body", align: "start" },
  video: { fit: "contain", aspectRatio: "16:9", captionsLanguage: "en" },
  image: { fit: "cover", aspectRatio: "auto", radius: "none" },
};
