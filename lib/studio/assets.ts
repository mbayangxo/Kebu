export type AssetMeta={id:string;kind:"image"|"video"|"audio";url:string;file_name:string|null;tags?:string[];folder?:string|null;favorite?:boolean;width?:number|null;height?:number|null;duration_ms?:number|null};
export function normalizeAssetTags(v:unknown){if(!Array.isArray(v))return[];return [...new Set(v.map(x=>String(x).trim().toLowerCase()).filter(Boolean))].slice(0,20)}
export function searchAssets(rows:AssetMeta[],q:string,kind:"all"|AssetMeta["kind"]="all",favorites=false){const n=q.trim().toLowerCase();return rows.filter(x=>(kind==="all"||x.kind===kind)&&(!favorites||x.favorite)&&(!n||[x.file_name,x.folder,...(x.tags??[])].filter(Boolean).join(" ").toLowerCase().includes(n)))}
export function assetCacheKey(id:string){return `studio-asset:${id}`}
