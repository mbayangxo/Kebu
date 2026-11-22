import JSZip from "jszip";
import { expect, it } from "vitest";
import { sourceExport } from "@/lib/kebu-code/source-export";
import { storefrontLink, storefrontProductUrl } from "@/lib/kebu-code/storefront";
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

it("links to verified product cards and escapes published product names",async()=>{
  const id="44444444-4444-4444-8444-444444444444";
  const store={subdomain:"test-store",url:"https://kebu.test/sites/test-store/catalog",products:[{id,name:"Tea & <Ginger>"}]};
  expect(storefrontProductUrl(store,id)).toBe(store.url+"#product-"+id);
  expect(()=>storefrontProductUrl(store,"55555555-5555-4555-8555-555555555555")).toThrow();
  const zip=await JSZip.loadAsync(await sourceExport(starterFiles,store));
  const html=await zip.file("shop.html")!.async("string");
  expect(html).toContain("Shop Tea &amp; &lt;Ginger&gt;");
  expect(html).toContain('href="'+store.url+'#product-'+id+'"');
});

it("binds a suggested quantity to exactly the verified product and rejects ambiguous quantities", async () => {
  const { storefrontSelectionUrl } = await import("@/lib/kebu-code/storefront");
  const { readShopSelection } = await import("@/lib/create/shop-selection");
  const id = "44444444-4444-4444-8444-444444444444";
  const store = { subdomain: "test-store", url: "https://kebu.test/sites/test-store", products: [{ id, name: "Tea" }] };
  const url = new URL(storefrontSelectionUrl(store, id, 3));
  expect(readShopSelection(url, id)).toBe(3);
  expect(readShopSelection(url, "55555555-5555-4555-8555-555555555555")).toBeNull();
  url.searchParams.append("kebu_qty", "2");
  expect(readShopSelection(url, id)).toBeNull();
  url.searchParams.set("kebu_qty", "0");
  expect(readShopSelection(url, id)).toBeNull();
  expect(() => storefrontSelectionUrl(store, id, 21)).toThrow();
});
