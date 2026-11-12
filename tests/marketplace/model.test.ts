import { describe,it,expect } from "vitest";
import { validAppUrl,listingInput } from "@/lib/marketplace/model";
describe("developer app manifests",()=>{
  it.each(["javascript:alert(1)","http://apps.example","https://localhost","https://127.0.0.1","https://2130706433","https://0x7f000001","https://[::1]/","https://app.internal","https://example.com:444","https://user:secret@example.com","https://apps.example/?token=secret","https://apps.example/#token","https://apps.example/%0aheader"])("rejects unsafe or secret-bearing launch URL %s",value=>{
    expect(validAppUrl(value)).toBe(false);
  });
  it("accepts a public HTTPS app path and refuses KEBU's own origin as a third-party app",()=>{
    expect(validAppUrl("https://apps.example/product")).toBe(true);
    expect(validAppUrl("https://apps.example/product","https://apps.example")).toBe(false);
  });
  it("never copies developer-assigned ownership, approval or revisions",()=>{
    const app=listingInput({name:"App name",category:"business_tool",pricing:"free",description:"Long enough",
      owner_id:"attacker",status:"published",revision:77,installs:100000,permissions:["wallet"]});
    expect(app).toMatchObject({name:"App name",pricing:"free"});
    for(const key of ["owner_id","status","revision","installs","permissions"])expect(app).not.toHaveProperty(key);
  });
  it("handles null, arrays, length limits and invalid prices without throwing",()=>{
    for(const value of [null,[],"app",{}, {name:"App",category:"business_tool",pricing:"paid",price_xof:1.5}]) {
      expect(listingInput(value)).toBeNull();
    }
  });
});
