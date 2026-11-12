import { expect, test } from "vitest";
import { open3jDatabase, owner, other, projectId } from "./fixtures/3j-database";
import { type Op, type PageId } from "@/lib/creative-core";

test.skipIf(!process.env.KEBU_LOCAL_PGLITE_ROOT)("twenty-page migration accepts page 14 and 20, rejects page 21 and strangers atomically", async () => {
  const server=await open3jDatabase();
  const operation=(index:number):Op=>({op:"insertPage",page:{id:crypto.randomUUID() as PageId,title:`Page ${index}`,slug:`page-${index}`,orderKey:`V${String.fromCharCode(65+index)}`,deviceLayout:{}}});
  try{
    for(let index=1;index<20;index++){
      await server.apply({txId:crypto.randomUUID(),origin:"user",label:"Add page",ops:[operation(index)],expect:{}});
      if(index===13)expect((await server.read()).pages).toHaveLength(14);
    }
    expect((await server.read()).pages).toHaveLength(20);
    const tx={txId:crypto.randomUUID(),origin:"user" as const,label:"Reject overflow",ops:[operation(20)],expect:{}};
    // Exercise SQL itself, not only the client preflight.
    expect((await server.queryAs<{apply_node_ops:unknown}>("authenticated",owner,"select apply_node_ops($1,$2)",[projectId,tx])).rows[0].apply_node_ops).toMatchObject({status:"rejected",message:"Maximum 20 pages per site"});
    expect((await server.read()).pages).toHaveLength(20);
    await expect(server.queryAs("authenticated",other,"select apply_node_ops($1,$2)",[projectId,{...tx,txId:crypto.randomUUID()}])).rejects.toThrow();
    expect((await server.read()).pages).toHaveLength(20);
  }finally{await server.close();}
},60000);
