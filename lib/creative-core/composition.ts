import { z } from "zod";
import type { PropertyDescriptor } from "./registry";
export const compositionProps={fillContainer:z.boolean().optional(),gridSpan:z.number().int().min(1).max(6).optional()};
export const compositionProperties:readonly PropertyDescriptor[]=[
 {key:"fillContainer",label:"Fill the container",control:"toggle",capability:"layout.positioned",overridable:true,group:"layout"},
 {key:"gridSpan",label:"Columns to span",control:"number",capability:"layout.positioned",overridable:true,group:"layout"},
];
export const groupCompositionProps={layout:z.enum(["flex","grid","carousel","masonry"]).optional(),columns:z.number().int().min(1).max(6).optional(),padding:z.enum(["none","sm","md","lg","xl"]).optional()};
export const groupCompositionProperties:readonly PropertyDescriptor[]=[
 {key:"layout",label:"Container layout",control:"select",capability:"layout.flow",overridable:true,group:"layout",options:[{value:"flex",label:"Flexible flow"},{value:"grid",label:"Grid"},{value:"carousel",label:"Horizontal gallery"},{value:"masonry",label:"Masonry"}]},
 {key:"columns",label:"Columns",control:"number",capability:"layout.flow",overridable:true,group:"layout"},
 {key:"padding",label:"Inner spacing",control:"select",capability:"layout.flow",overridable:true,group:"layout",options:[{value:"none",label:"None"},{value:"sm",label:"Small"},{value:"md",label:"Medium"},{value:"lg",label:"Large"},{value:"xl",label:"Extra large"}]},
];
