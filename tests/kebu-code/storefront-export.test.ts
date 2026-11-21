import JSZip from "jszip";
import { expect, it } from "vitest";
import { sourceExport } from "@/lib/kebu-code/source-export";
import { storefrontLink } from "@/lib/kebu-code/storefront";
import { fileNames, starterFiles } from "@/lib/kebu-code/workspace";

it("exports a usable storefront page without modifying the owner's source",async()=>{
  const store={subdomain:"test-store",url:"https://kebu.test/sites/test-store/catalog"};
  const zip=await JSZip.loadAsync(await sourceExport(starterFiles,store));
  for(const name of fileNames)expect(await zip.file(name)?.async("string")).toBe(starterFiles[name]);
  expect(await zip.file("shop.html")?.async("string")).toContain('<a href="https://kebu.test/sites/test-store/catalog">');
  expect(await zip.file("STOREFRONT.txt")?.async("string")).toContain(storefrontLink(store));
  const plain=await JSZip.loadAsync(await sourceExport(starterFiles));
  expect(Object.keys(plain.files).sort()).toEqual([...fileNames].sort());
});
it("never formats credential-bearing, mismatched or active scheme URLs",()=>{
  for(const url of ["javascript:alert(1)","https://user:secret@store.test/sites/test-store","https://store.test/sites/other","https://store.test/sites/test-store?token=private"]){
    expect(()=>storefrontLink({subdomain:"test-store",url})).toThrow();
  }
});
