import {it,expect} from 'vitest';
import {unsupportedKebuDisplayCharacters} from '../../lib/studio/kebu-display-coverage';
it('accepts the supported source repertoire and canonically equivalent accents',()=>{
 expect(unsupportedKebuDisplayCharacters('KEBU 2026 É E\u0301 À Ç!?')).toEqual([]);
});
it('reports unsupported lowercase, extended language glyphs and symbols without changing them',()=>{
 expect(unsupportedKebuDisplayCharacters('a Ñ Ë € Ñ')).toEqual(['a','Ñ','Ë','€']);
});
