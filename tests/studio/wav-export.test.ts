import {test,expect} from 'vitest';
import {encodePcmWav} from '../../lib/studio/wav-export';
test('WAV contains interleaved clamped PCM samples and correct duration metadata',async()=>{
  const channels=[new Float32Array([-2,-.5,0,1]),new Float32Array([2,.5,0,-1])];
  const blob=encodePcmWav({numberOfChannels:2,length:4,sampleRate:48000,getChannelData:i=>channels[i]});
  const bytes=await blob.arrayBuffer(),v=new DataView(bytes),text=new TextDecoder().decode(bytes);
  expect(blob.type).toBe('audio/wav');expect(text.slice(0,4)).toBe('RIFF');expect(text.slice(8,12)).toBe('WAVE');
  expect(v.getUint32(4,true)).toBe(bytes.byteLength-8);expect(v.getUint16(22,true)).toBe(2);expect(v.getUint32(24,true)).toBe(48000);
  expect(v.getUint32(40,true)).toBe(16);expect(v.getInt16(44,true)).toBe(-32768);expect(v.getInt16(46,true)).toBe(32767);
  expect(v.getInt16(48,true)).toBe(-16384);expect(v.getInt16(50,true)).toBe(16384);
});
