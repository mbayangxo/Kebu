import JSZip from "jszip";

const escapeXml = (text: string) => text.replace(/[\uFFFE\uFFFF]/g, "\uFFFD").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// A minimal Word package. Content is text only, never interpreted as HTML or XML.
export async function documentWordBytes(content: string) {
  const zip = new JSZip();
  const paragraphs = content.split(/\r\n?|\n/).map(line => {
    const heading = /^(#{1,6})[ \t]+(.+)$/.exec(line);
    const text = heading ? heading[2] : line.replace(/^[-*] /, "• ");
    const formatting = heading ? `<w:rPr><w:b/><w:sz w:val="${heading[1].length === 1 ? 36 : 28}"/></w:rPr>` : "";
    return `<w:p><w:r>${formatting}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
  }).join("");
  zip.file("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file("_rels/.rels", '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="${ns}"><w:body>${paragraphs}</w:body></w:document>`);
  return zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
}

export async function downloadDocument(title: string, content: string, format: "docx" | "md") {
  const blob = format === "docx" ? new Blob([await documentWordBytes(content)], { type: mime }) :
    new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = (title.replace(/[^\p{L}\p{N} _-]/gu, "").trim().slice(0, 70) || "kebu-document") + "." + format;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}
