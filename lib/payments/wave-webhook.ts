import { createHmac, timingSafeEqual } from "node:crypto";

/** Wave signs timestamp + exact raw body, with no separator. */
export function verifyWaveWebhookSignature(body:string,header:string|null,secret:string,now=Date.now()):boolean {
  if (!header || !secret.trim()) return false;
  let timestamp:string|undefined;
  const signatures:string[]=[];
  for (const component of header.split(",")) {
    const [key,value,extra]=component.trim().split("=");
    if (!key || !value || extra!==undefined) return false;
    if (key==="t") {
      if (timestamp!==undefined || !/^\d{1,16}$/.test(value)) return false;
      timestamp=value;
    } else if (key==="v1") {
      if (!/^[a-f\d]{64}$/i.test(value)) return false;
      signatures.push(value);
    }
  }
  if (!timestamp || !signatures.length) return false;
  const seconds=Number(timestamp);
  if (!Number.isSafeInteger(seconds) || seconds<=0 || !Number.isFinite(now) || Math.abs(now/1000-seconds)>300) return false;
  const expected=createHmac("sha256",secret).update(timestamp+body).digest();
  return signatures.some(value=>timingSafeEqual(expected,Buffer.from(value,"hex")));
}
