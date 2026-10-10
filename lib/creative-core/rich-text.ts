import { z } from "zod";

export const richLinkSchema = z.string().trim().max(300).refine(value => value === "" || /^#[^\s]*$/.test(value) || /^\/(?!\/)[^\\\s]*$/.test(value) || /^https?:\/\/[^\s"'<>]+$/.test(value) || /^(mailto:|tel:)[^\s"'<>]+$/.test(value) || /^[a-z0-9][a-z0-9-]*$/.test(value), "Invalid link");
export const richRunSchema = z.strictObject({ text: z.string().min(1).max(5000), bold: z.boolean().optional(), italic: z.boolean().optional(), underline: z.boolean().optional(), href: richLinkSchema.optional() });
export const richRunsSchema = z.array(richRunSchema).min(0).max(100).refine(runs => runs.reduce((sum, run) => sum + run.text.length, 0) <= 5000, "Keep text within 5,000 characters");
export type RichRun = z.infer<typeof richRunSchema>;
export type RichMark = "bold" | "italic" | "underline" | "href";

export function richTextValue(runs: readonly RichRun[]) { return runs.map(run => run.text).join(""); }
function compact(runs: RichRun[]): RichRun[] {
 const result:RichRun[]=[];
 for(const run of runs){if(!run.text)continue;const prior=result.at(-1);const marks={bold:run.bold,italic:run.italic,underline:run.underline,href:run.href};const old={bold:prior?.bold,italic:prior?.italic,underline:prior?.underline,href:prior?.href};if(prior && JSON.stringify(marks)===JSON.stringify(old))prior.text+=run.text;else result.push({...run});}
 return result;
}
/** Half-open UTF-16 textarea selection; preserve all unrelated content and marks. */
export function formatRichRange(text: string, runs: readonly RichRun[] | undefined, start: number, end: number, mark: RichMark, value: boolean | string): RichRun[] {
 if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end>text.length||end<=start)throw new Error("Select some text to format.");
 if(runs && richTextValue(runs)!==text)throw new Error("Text formatting does not match the saved text.");
 if(mark==="href" && !richLinkSchema.safeParse(value).success)throw new Error("Choose a valid link for the selected text.");
 const out:RichRun[]=[];let offset=0;
 for(const run of runs??[{text}]){
  const next=offset+run.text.length,from=Math.max(offset,start),to=Math.min(next,end);
  if(from>=to)out.push({...run});else{
   if(from>offset)out.push({...run,text:run.text.slice(0,from-offset)});
   const selected={...run,text:run.text.slice(from-offset,to-offset)};
   if(value===false||value==="")delete selected[mark];else Object.assign(selected,{[mark]:value});out.push(selected);
   if(to<next)out.push({...run,text:run.text.slice(to-offset)});
  }offset=next;
 }
 return richRunsSchema.parse(compact(out));
}
/** A single replacement inherits marks at the insertion point; unchanged suffix/prefix retain theirs. */
export function editRichText(oldText: string, nextText: string, runs: readonly RichRun[] | undefined): RichRun[] | undefined {
 if(!runs)return undefined;if(richTextValue(runs)!==oldText)throw new Error("Text formatting does not match the saved text.");if(!nextText)return undefined;if(!runs.length)return richRunsSchema.parse([{text:nextText}]);
 let prefix=0;while(prefix<oldText.length && prefix<nextText.length && oldText[prefix]===nextText[prefix])prefix++;
 let suffix=0;while(suffix<oldText.length-prefix && suffix<nextText.length-prefix && oldText[oldText.length-1-suffix]===nextText[nextText.length-1-suffix])suffix++;
 const end=oldText.length-suffix,out:RichRun[]=[];let offset=0,inserted=false;
 for(const run of runs){const next=offset+run.text.length;
  if(offset<prefix)out.push({...run,text:run.text.slice(0,Math.min(run.text.length,prefix-offset))});
  if(!inserted && next>=prefix){const middle=nextText.slice(prefix,nextText.length-suffix);if(middle)out.push({...run,text:middle});inserted=true;}
  if(next>end)out.push({...run,text:run.text.slice(Math.max(0,end-offset))});offset=next;
 }
 return richRunsSchema.parse(compact(out));
}

export function validateRichText(text: unknown, runs: unknown, href: unknown): string | null {
 if(runs===undefined)return null;const parsed=richRunsSchema.safeParse(runs);if(!parsed.success)return "Invalid rich text formatting.";
 if(richTextValue(parsed.data)!==text)return "Rich text formatting must match the text.";
 if(href && parsed.data.some(run=>run.href))return "Remove the whole-element link before linking selected text.";return null;
}
