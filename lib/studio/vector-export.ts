import type {CanvasPage} from './canvas-document';
const xml=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
/** Editable SVG geometry and live text. Unsupported artwork fails explicitly. */
export function exportEditableSvg(page:CanvasPage):string {
  const layers=page.layers.filter(layer=>layer.opacity>0).map(layer=>{
    if(layer.fillType==='linear_gradient'||layer.shadowBlur||layer.glowBlur||layer.outlineWidth||layer.blendMode&&layer.blendMode!=='normal')throw Error(`“${layer.name}” uses effects not yet supported by editable vector export.`);
    const w=layer.width,h=layer.height,fill=xml(layer.fill??'none'),stroke=xml(layer.stroke??'none');
    let shape:string;
    if(layer.type==='rect')shape=`<rect width="${w}" height="${h}" rx="${layer.cornerRadius??0}" fill="${fill}"/>`;
    else if(layer.type==='ellipse')shape=`<ellipse cx="${w/2}" cy="${h/2}" rx="${w/2}" ry="${h/2}" fill="${fill}"/>`;
    else if(layer.type==='line')shape=`<line x1="0" y1="0" x2="${w}" y2="${h}"/>`;
    else if(layer.type==='text'){
      // Live text is deliberately retained, never outlined or rasterized.
      shape=`<text y="${layer.fontSize??32}" font-size="${layer.fontSize??32}" font-family="${xml(layer.fontFamily??'sans-serif')}" font-weight="${xml(layer.fontWeight??'400')}" font-style="${xml(layer.fontStyle??'normal')}" fill="${xml(layer.color??'#ffffff')}">${xml(layer.text)}</text>`;
      if((layer.text??'').includes('\n'))throw Error('Multiline vector text is not supported yet.');
    }else throw Error(`“${layer.name}” cannot yet be exported as editable vectors.`);
    return `<g id="${xml(layer.id)}" aria-label="${xml(layer.name)}" opacity="${layer.opacity}" stroke="${stroke}" stroke-width="${layer.strokeWidth??0}" transform="translate(${layer.x} ${layer.y}) rotate(${layer.rotation} ${w/2} ${h/2})">${shape}</g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${page.width}" height="${page.height}" viewBox="0 0 ${page.width} ${page.height}"><title>${xml(page.name)}</title><rect width="100%" height="100%" fill="${xml(page.backgroundColor)}"/>${layers.join('')}</svg>`;
}
