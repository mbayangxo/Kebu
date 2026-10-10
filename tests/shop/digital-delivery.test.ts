import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), sign: vi.fn(), update: vi.fn(), send: vi.fn(), ack: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({rpc:mocks.rpc,storage:{from:()=>({createSignedUrl:mocks.sign})}}) }));
vi.mock("@/lib/opportunity/admin",()=>({createServiceClient:()=>({rpc:mocks.rpc,from:()=>({update:mocks.update})})}));
vi.mock("@/lib/email/send-campaign",()=>({sendCampaignEmail:mocks.send}));
import { GET as download } from "@/app/api/dl/[token]/route";
import { GET as deliver } from "@/app/api/cron/digital-delivery/route";
import { emailDownloadLink } from "@/lib/shop/digital-downloads";
const token="a".repeat(64);
const row={id:"delivery",token,file_path:"project/product/file.pdf",expires_at:"2026-10-12T00:00:00Z",max_downloads:1,
  recipient_email:"recipient@example.com",shop_name:"Shop",product_name:"Book",notification_lease_id:"lease"};
const request=(auth?:string)=>new Request("https://kebu.app/api/cron/digital-delivery",{headers:auth?{authorization:auth}:{}}) as NextRequest;
const getDownload=()=>download(request(),{params:Promise.resolve({token})});
describe("digital delivery HTTP boundaries",()=>{
  beforeEach(()=>{
    vi.clearAllMocks();vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","https://qa.supabase.co");vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY","fixture-only");
    vi.stubEnv("CRON_SECRET","fixture-cron");vi.stubEnv("RESEND_API_KEY","fixture-only");vi.stubEnv("RESEND_FROM_EMAIL","shop@example.com");
    mocks.rpc.mockImplementation(async(name:string)=>({data:name==="resolve_paid_shop_download"?row:name==="consume_paid_shop_download"?true:[row],error:null}));
    mocks.sign.mockResolvedValue({data:{signedUrl:"https://qa.supabase.co/storage/file?signed=fixture"},error:null});
    mocks.send.mockResolvedValue(true);mocks.ack.mockResolvedValue({data:[{id:"delivery"}],error:null});
    mocks.update.mockImplementation(()=>({eq:()=>({eq:()=>({select:mocks.ack})})}));
  });
  afterEach(()=>vi.unstubAllEnvs());
  it("redirects only after the quota transaction and prevents caching/referrer leakage",async()=>{
    const response=await getDownload();expect(response.status).toBe(302);
    expect(mocks.rpc).toHaveBeenLastCalledWith("consume_paid_shop_download",{p_token:token});
    expect(response.headers.get("cache-control")).toContain("no-store");expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });
  it("does not consume a download when Storage signing fails",async()=>{
    mocks.sign.mockResolvedValue({data:null,error:{message:"Unavailable"}});
    expect((await getDownload()).status).toBe(503);expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it("refuses a refund or quota race after signing",async()=>{
    mocks.rpc.mockImplementation(async(name:string)=>({data:name==="resolve_paid_shop_download"?row:false,error:null}));
    const response=await getDownload();expect(response.status).toBe(410);expect(response.headers.get("location")).toBeNull();
  });
  it("fails closed on an unavailable payment/quota check",async()=>{
    mocks.rpc.mockResolvedValue({data:null,error:{message:"Private SQL failure"}});
    const response=await getDownload();expect(response.status).toBe(503);expect(await response.text()).not.toContain("SQL");
  });
  it("denies cron access when its secret is absent or incorrect",async()=>{
    expect((await deliver(request())).status).toBe(401);vi.stubEnv("CRON_SECRET","");
    expect((await deliver(request("Bearer fixture-cron"))).status).toBe(401);expect(mocks.send).not.toHaveBeenCalled();
  });
  it("sends a leased gift email with a stable key and acknowledges only its lease",async()=>{
    expect((await deliver(request("Bearer fixture-cron"))).status).toBe(200);
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({to:"recipient@example.com",idempotencyKey:"digital-delivery/delivery"}));
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({notification_sent_at:expect.any(String)}));
  });
  it("retains failed sends for retry and surfaces a failed acknowledgement",async()=>{
    mocks.send.mockResolvedValue(false);expect((await deliver(request("Bearer fixture-cron"))).status).toBe(503);expect(mocks.update).not.toHaveBeenCalled();
    mocks.send.mockResolvedValue(true);mocks.ack.mockResolvedValue({data:[],error:null});
    expect((await deliver(request("Bearer fixture-cron"))).status).toBe(503);
  });
  it("escapes merchant/product names in download mail",async()=>{
    await emailDownloadLink({to:"buyer@example.com",from:"shop@example.com",shopName:"<script>shop</script>",productName:'<img src=x onerror="bad">',downloadUrl:"https://kebu.app/api/dl/"+token,expiresAt:row.expires_at,maxDownloads:1});
    const html=mocks.send.mock.calls[0][0].html as string;expect(html).not.toContain("<script>");expect(html).not.toContain("<img");expect(html).toContain("&lt;img");
  });
});
