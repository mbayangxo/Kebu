import JSZip from "jszip";
import { fileNames, type CodeFiles } from "./workspace";
import { storefrontLink, storefrontProductLink, type Storefront } from "./storefront";

export async function sourceExport(files: CodeFiles, store?: Storefront) {
  const zip = new JSZip();
  for (const name of fileNames) zip.file(name, files[name]);
  if (store) {
    const link = storefrontLink(store);
    const products = store.products?.map(product => storefrontProductLink(store, product.id)) ?? [];
    const productList = products.length ? "<ul>" + products.map(item => "<li>" + item + "</li>").join("") + "</ul>" : "";
    zip.file("shop.html", '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Shop on Kebu</title></head><body><main><h1>Shop on Kebu</h1><p>Browse products and place your order on the published storefront.</p>' + link + productList + '</main></body></html>');
    zip.file("STOREFRONT.txt", "Open shop.html to reach the store. To include the link in your main app, paste this inside the body of index.html:\n\n" + [link, ...products].join("\n") + "\n\nOrders and payments are handled by the storefront. This export has no checkout credentials.");
  }
  return zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
}
