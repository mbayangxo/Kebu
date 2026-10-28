/** Real 16-bit PCM WAV, preserving the decoded timeline mix and sample rate. */
export function encodePcmWav(buffer: Pick<AudioBuffer, 'numberOfChannels'|'length'|'sampleRate'|'getChannelData'>): Blob {
  const channels = Math.min(2, buffer.numberOfChannels);
  if (!channels || !buffer.length) throw new Error('The export contains no audio.');
  const bytes = new ArrayBuffer(44 + buffer.length * channels * 2), view = new DataView(bytes);
  const text = (offset: number, value: string) => { for (let i=0;i<value.length;i++) view.setUint8(offset+i,value.charCodeAt(i)); };
  text(0,'RIFF'); view.setUint32(4,bytes.byteLength-8,true); text(8,'WAVE'); text(12,'fmt ');
  view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,channels,true);
  view.setUint32(24,buffer.sampleRate,true); view.setUint32(28,buffer.sampleRate*channels*2,true);
  view.setUint16(32,channels*2,true); view.setUint16(34,16,true); text(36,'data'); view.setUint32(40,bytes.byteLength-44,true);
  const samples=Array.from({length:channels},(_,i)=>buffer.getChannelData(i));
  for(let frame=0;frame<buffer.length;frame++)for(let channel=0;channel<channels;channel++){
    const sample=Math.max(-1,Math.min(1,samples[channel][frame]));
    view.setInt16(44+(frame*channels+channel)*2,Math.round(sample*(sample<0?32768:32767)),true);
  }
  return new Blob([bytes],{type:'audio/wav'});
}
export async function timelineRecordingToWav(recording: Blob): Promise<Blob> {
  const context = new AudioContext();
  try { return encodePcmWav(await context.decodeAudioData(await recording.arrayBuffer())); }
  finally { await context.close(); }
}
