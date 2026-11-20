import { z } from "zod";

export const fileNames = ["index.html", "styles.css", "app.js"] as const;
export type CodeFile = (typeof fileNames)[number];
export const filesSchema = z.strictObject({
  "index.html": z.string().min(1).max(10000),
  "styles.css": z.string().max(8000),
  "app.js": z.string().max(8000),
}).refine(files => new TextEncoder().encode(JSON.stringify(files)).length <= 46000, "Source exceeds the workspace limit");
export type CodeFiles = z.infer<typeof filesSchema>;
const rev = z.number().int().positive().max(2147483646);
export const snapshotSchema = z.object({revision:rev, files:filesSchema});
export const workspaceSchema = z.object({
  id:z.string().uuid(), title:z.string(), revision:rev, files:filesSchema,
  history:z.array(snapshotSchema).max(8), updated_at:z.string(),
});
export type CodeWorkspace = z.infer<typeof workspaceSchema>;
export const actionSchema = z.discriminatedUnion("action", [
  z.strictObject({action:z.literal("create"),title:z.string().trim().min(1).max(80)}),
  z.strictObject({action:z.literal("save"),id:z.string().uuid(),base:rev,files:filesSchema}),
  z.strictObject({action:z.literal("restore"),id:z.string().uuid(),base:rev,target:rev}),
  z.strictObject({action:z.literal("propose"),id:z.string().uuid(),base:rev,prompt:z.string().trim().min(1).max(1600),store:z.string().trim().max(63).regex(/^$|^[a-z0-9]+(?:-[a-z0-9]+)*$/)}),
]);
export const proposalSchema = z.strictObject({
  summary:z.string().min(1).max(800),
  files:z.strictObject({"index.html":z.string().min(1).max(10000),"styles.css":z.string().max(8000),"app.js":z.string().max(8000)}),
});
export const starterFiles: CodeFiles = {
  "index.html": '<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>My Kebu app</title><link rel="stylesheet" href="styles.css"></head>\n<body><main><h1>My Kebu app</h1><p>Give your project a purpose, then make it yours.</p></main><script defer src="app.js"></script></body>\n</html>',
  "styles.css":"body { margin: 0; padding: 3rem 1.5rem; font: 16px system-ui; color: #182822; background: #faf8f3; }\nmain { max-width: 680px; margin: auto; }",
  "app.js":"// Add interaction for the exported app here.\n",
};
export function saveSnapshot(current:CodeWorkspace,files:CodeFiles){
  return {files,revision:current.revision+1,history:[{revision:current.revision,files:current.files},...current.history].slice(0,8)};
}
