import { createHmac, timingSafeEqual } from "node:crypto";

export type WaveSession = {id:string;amount:string;currency:string;client_reference:string;
  checkout_status:string;payment_status:string;when_expires:string;transaction_id?:string};

/** Wave's documented timestamp + raw-body signature, including rotating secrets. */
export function verifyWaveSignature(body:string,header:string|null,secret=process.env.WAVE_WEBHOOK_SECRET?.trim(),now=Date.now()):boolean {
  if(!header||!secret) return false;
  const parts=header.split(",").map(p=>p.trim());
  const timestamps=parts.filter(p=>p.startsWith("t="));
  if(timestamps.length!==1 || !/^t=\d+$/.test(timestamps[0])) return false;
  const timestamp=timestamps[0].slice(2),age=now/1000-Number(timestamp);
  if(!Number.isFinite(age)||age>300||age< -30) return false;
  const expected=Buffer.from(createHmac("sha256",secret).update(timestamp+body).digest("hex"),"hex");
  return parts.filter(p=>/^v1=[a-f0-9]{64}$/.test(p)).some(p=>timingSafeEqual(expected,Buffer.from(p.slice(3),"hex")));
}

export async function waveRequest(path:string,body?:Record<string,unknown>):Promise<Response|null> {
  const key=process.env.WAVE_API_KEY?.trim();if(!key) return null;
  const raw=body?JSON.stringify(body):"";
  const signing=process.env.WAVE_API_SIGNING_SECRET?.trim();
  const timestamp=String(Math.floor(Date.now()/1000));
  const signature=signing?`t=${timestamp},v1=${createHmac("sha256",signing).update(timestamp+raw).digest("hex")}`:null;
  return fetch(`${(process.env.WAVE_API_BASE_URL||"https://api.wave.com").replace(/\/$/,"")}${path}`,{
    method:body?"POST":"GET",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json",...(signature?{"Wave-Signature":signature}:{})},
    ...(body?{body:raw}:{}),signal:AbortSignal.timeout(15_000),
  });
}
export function waveSessionMatches(session:WaveSession,expected:{id:string;reference:string;amountXof:number}):boolean {
  return session.id===expected.id && session.client_reference===expected.reference && session.currency==="XOF"
    && /^\d+$/.test(session.amount) && Number.isSafeInteger(expected.amountXof) && expected.amountXof>0
    && Number(session.amount)===expected.amountXof;
}
export async function retrieveWaveSession(id:string):Promise<WaveSession|null> {
  if(!/^cos-[a-zA-Z0-9_-]+$/.test(id)) return null;
  try {const response=await waveRequest(`/v1/checkout/sessions/${encodeURIComponent(id)}`);
    return response?.ok?await response.json() as WaveSession:null;
  } catch {return null;}
}
