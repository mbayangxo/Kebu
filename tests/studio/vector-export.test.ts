import {test,expect} from 'vitest';
import {canvasPageSchema} from '../../lib/studio/canvas-document';
import {exportEditableSvg} from '../../lib/studio/vector-export';
test('exports editable text and geometry with escaped labels and rotation',()=>{
 const page=canvasPageSchema.parse({id:'page',name:'Art',width:1080,height:1080,layers:[{id:'text',type:'text',name:'<script>',x:20,y:30,width:500,height:100,text:'May & music',rotation:20},{id:'shape',type:'ellipse',x:5,y:5,width:100,height:80,fill:'#ff0080'}]});
 const svg=exportEditableSvg(page);expect(svg).toContain('<text');expect(svg).toContain('May &amp; music');expect(svg).toContain('<ellipse');expect(svg).toContain('rotate(20');expect(svg).not.toContain('<script>');expect(svg).not.toContain('<image');
});
test('unsupported media fails rather than flattening artwork or dropping layers',()=>{
 const page=canvasPageSchema.parse({id:'p',width:1080,height:1080,layers:[{id:'image',type:'image',x:0,y:0,width:100,height:100}]});expect(()=>exportEditableSvg(page)).toThrow('cannot yet');
});
