import { expect, test } from "vitest";
import { open3jDatabase } from "./fixtures/3j-database";
import { expectFor, type NodeId, type Op } from "@/lib/creative-core";
import { defaultMaylecorKsendrProps } from "@/lib/create/maylecor-ksendr-defaults";
import { deviceScopedPatch, DEVICE_OVERRIDE_KEYS } from "@/lib/create/device-overrides";
import { builderPatchOperations } from "@/lib/create/kcd-builder-operations";
import { writeRowProps } from "@/lib/create/kcd-adapter/sections";

test.skipIf(!process.env.KEBU_LOCAL_PGLITE_ROOT)("collage responsive image fields traverse actual SQL operations", async () => {
  const server = await open3jDatabase(), id = "55555555-5555-4555-8555-555555555555" as NodeId;
  try {
    const registry = await server.queryAs<{overridable:string[]}>("postgres", "11111111-1111-4111-8111-111111111111", "select overridable from kcd_node_types where type='legacy-section:legally-blonde-hero' and version=1");
    expect(registry.rows[0].overridable).toEqual(expect.arrayContaining([...DEVICE_OVERRIDE_KEYS["legally-blonde-hero"]!]));
    let doc = server.current();
    let ops: Op[] = [{ op: "insertNode", node: { id, type: "legacy-section:legally-blonde-hero", typeVersion: 1, props: defaultMaylecorKsendrProps(), overrides: {} }, pageId: doc.pages[0].id, parentId: null, orderKey: "V" }];
    await server.apply({ txId: crypto.randomUUID(), origin: "user", label: "Insert actual collage", ops, expect: expectFor(doc, ops) });
    for (const device of ["tablet", "mobile"] as const) {
      doc = server.current(); const node = doc.nodes[id];
      const patch = deviceScopedPatch("legally-blonde-hero", writeRowProps(node), device, { layerWidthScale: { cutoutAccent: .95 } });
      ops = builderPatchOperations(node, patch);
      await server.apply({ txId: crypto.randomUUID(), origin: "user", label: "Resize responsive image", ops, expect: expectFor(doc, ops) });
      expect(server.current().nodes[id].overrides[device]).toMatchObject({layerWidthScale:{cutoutAccent:.95}});
      expect(server.current().nodes[id].props.layerWidthScale).toBeUndefined();
    }
    doc=server.current();
    const text={id:'story-text',src:'',kind:'text',text:'May’s story',leftPct:10,topPct:20,widthPct:60,fontSize:96,fontFamily:'editorial',textColor:'#e9006b',outlineColor:'#ffffff',outlineWidth:4,zIndex:20};
    ops=builderPatchOperations(doc.nodes[id],{extraCutouts:[text]});
    await server.apply({txId:crypto.randomUUID(),origin:'user',label:'Save editable scene text',ops,expect:expectFor(doc,ops)});
    expect((await server.read()).nodes[id].props.extraCutouts).toEqual(expect.arrayContaining([expect.objectContaining({kind:'text',text:'May’s story',outlineWidth:4})]));
    doc=server.current();
    const mobilePatch=deviceScopedPatch('legally-blonde-hero',writeRowProps(doc.nodes[id]),'mobile',{extraCutouts:[{...text,leftPct:22,fontSize:72}]});
    ops=builderPatchOperations(doc.nodes[id],mobilePatch);
    await server.apply({txId:crypto.randomUUID(),origin:'user',label:'Save phone scene text',ops,expect:expectFor(doc,ops)});
    expect((await server.read()).nodes[id].overrides.mobile?.extraCutouts).toEqual(expect.arrayContaining([expect.objectContaining({kind:'text',leftPct:22,fontSize:72})]));
  } finally { await server.close(); }
}, 60000);
