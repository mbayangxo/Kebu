import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { AppShell } from "@/app/components/app-shell";
import { requireUser } from "@/lib/create/auth";

const capabilities = ["register", "kitchen", "pickup"] as const;
const deviceKinds = ["register", "kiosk", "kitchen"] as const;
const route = (id: string) => `/business/${id}/retail/staff`;
const cookieName = (id: string) => `retail-device-${id}`;
const fingerprint = (token: string) => createHash("sha256").update(token).digest("hex");

async function adminDb(id: string) {
  if (!z.uuid().safeParse(id).success) notFound();
  const auth = await requireUser();
  if ("error" in auth) {
    if (auth.error.status === 401) redirect(`/login?next=${route(id)}`);
    throw new Error("Retail authentication is unavailable.");
  }
  const { data, error } = await auth.supabase.from("business_members").select("role")
    .eq("business_id", id).eq("user_id", auth.user.id).eq("status", "active").maybeSingle();
  if (error) throw new Error("Could not check retail permissions.");
  if (data?.role !== "founder" && data?.role !== "administrator") notFound();
  return auth.supabase;
}

const assignmentInput = z.object({ location_id: z.uuid(), user_id: z.uuid(), capability: z.enum(capabilities) });
type Assignment = z.infer<typeof assignmentInput>;
type Member = { user_id: string; email: string | null; role: string };

async function assign(id: string, form: FormData) {
  "use server";
  const db = await adminDb(id);
  const input = assignmentInput.safeParse(Object.fromEntries(form));
  if (!input.success) redirect(`${route(id)}?result=invalid`);
  const { data: members, error: rosterError } = await db.rpc("retail_staff_roster", { target_business: id });
  if (rosterError || !(members as Member[] | null)?.some((member) => member.user_id === input.data.user_id)) {
    redirect(`${route(id)}?result=invalid`);
  }
  const { error } = await db.from("retail_staff_assignments").insert({ business_id: id, ...input.data });
  redirect(`${route(id)}?result=${error && error.code !== "23505" ? "failed" : "assigned"}`);
}

async function removeAssignment(id: string, form: FormData) {
  "use server";
  const db = await adminDb(id);
  const input = assignmentInput.safeParse(Object.fromEntries(form));
  if (!input.success) redirect(`${route(id)}?result=invalid`);
  const { location_id, user_id, capability } = input.data;
  const { error } = await db.from("retail_staff_assignments").delete()
    .eq("business_id", id).eq("location_id", location_id).eq("user_id", user_id).eq("capability", capability);
  redirect(`${route(id)}?result=${error ? "failed" : "removed"}`);
}

async function enroll(id: string, form: FormData) {
  "use server";
  const db = await adminDb(id);
  const input = z.object({ location_id: z.uuid(), kind: z.enum(deviceKinds), label: z.string().trim().min(1).max(80) })
    .safeParse(Object.fromEntries(form));
  if (!input.success) redirect(`${route(id)}?result=invalid`);
  const jar = await cookies();
  const prior = jar.get(cookieName(id))?.value;
  if (prior) {
    const { data, error } = await db.rpc("retail_device_is_active", { target_business: id, fingerprint: fingerprint(prior) });
    if (error || data) redirect(`${route(id)}?result=${error ? "failed" : "already"}`);
  }
  const token = randomBytes(32).toString("hex");
  const { error } = await db.from("retail_devices").insert({ business_id: id, ...input.data, credential_hash: fingerprint(token) });
  if (error) redirect(`${route(id)}?result=failed`);
  jar.set(cookieName(id), token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 60 * 60 * 24 * 90 });
  redirect(`${route(id)}?result=enrolled`);
}

async function revoke(id: string, form: FormData) {
  "use server";
  const db = await adminDb(id);
  const device = z.uuid().safeParse(form.get("device"));
  if (!device.success) redirect(`${route(id)}?result=invalid`);
  const { data, error } = await db.from("retail_devices").update({ revoked_at: new Date().toISOString() })
    .eq("id", device.data).eq("business_id", id).is("revoked_at", null).select("id").maybeSingle();
  redirect(`${route(id)}?result=${error || !data ? "failed" : "revoked"}`);
}

const messages = {
  invalid: "Choose a valid store, staff member, and access option.",
  failed: "The change could not be saved. Try again.",
  assigned: "Store access granted.",
  removed: "Store access removed.",
  enrolled: "This browser is enrolled.",
  already: "This browser already has an active enrollment. Revoke it before enrolling again.",
  revoked: "Device access revoked.",
};
const field = "rounded-lg border bg-transparent p-2";
const button = "w-fit rounded-lg border px-4 py-2 font-semibold";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ result?: string }> }) {
  const { id } = await params;
  const db = await adminDb(id);
  const { result } = await searchParams;
  const token = (await cookies()).get(cookieName(id))?.value;
  const [locations, members, assignments, devices, enrollment] = await Promise.all([
    db.from("retail_locations").select("id,name,active").eq("business_id", id).order("name"),
    db.rpc("retail_staff_roster", { target_business: id }),
    db.from("retail_staff_assignments").select("location_id,user_id,capability").eq("business_id", id),
    db.from("retail_devices").select("id,location_id,label,kind,revoked_at").eq("business_id", id).order("enrolled_at", { ascending: false }),
    token ? db.rpc("retail_device_is_active", { target_business: id, fingerprint: fingerprint(token) }) : { data: false, error: null },
  ]);
  const failed = locations.error || members.error || assignments.error || devices.error || enrollment.error;
  const roster = (members.data ?? []) as Member[];
  const active = (locations.data ?? []).filter((item) => item.active);
  const storeName = (store: string) => locations.data?.find((item) => item.id === store)?.name ?? "Unknown store";
  const staffName = (user: string) => roster.find((item) => item.user_id === user)?.email ?? "Inactive or unnamed member";
  const options = active.map((store) => <option key={store.id} value={store.id}>{store.name}</option>);

  return <AppShell title="Retail access">
    <section className="mx-auto max-w-4xl space-y-6 px-4 py-8" aria-labelledby="retail-access-title">
      <Link className="text-sm underline" href={`/business/${id}/retail`}>Retail locations</Link>
      <h2 id="retail-access-title" className="text-3xl font-semibold">Staff and devices</h2>
      {result && Object.hasOwn(messages, result) && <p role="status">{messages[result as keyof typeof messages]}</p>}
      {failed ? <p role="alert">Could not load retail access. <Link className="underline" href={route(id)}>Retry</Link></p> : <>
        <section className="space-y-3 rounded-xl border p-4">
          <h3 className="text-lg font-semibold">Store staff permissions</h3>
          <ul className="divide-y">
            {(assignments.data as Assignment[]).map((entry) => <li className="flex flex-wrap items-center justify-between gap-2 py-2" key={`${entry.location_id}/${entry.user_id}/${entry.capability}`}>
              <span>{staffName(entry.user_id)} · {storeName(entry.location_id)} · {entry.capability}</span>
              <form action={removeAssignment.bind(null, id)}>
                <input type="hidden" name="location_id" value={entry.location_id} />
                <input type="hidden" name="user_id" value={entry.user_id} />
                <input type="hidden" name="capability" value={entry.capability} />
                <button className={button}>Remove access</button>
              </form>
            </li>)}
          </ul>
          {active.length && roster.length ? <form className="grid gap-3 sm:grid-cols-3" action={assign.bind(null, id)}>
            <label className="grid gap-1">Staff member<select required className={field} name="user_id">{roster.map((member) => <option value={member.user_id} key={member.user_id}>{member.email ?? member.role}</option>)}</select></label>
            <label className="grid gap-1">Staff store<select required className={field} name="location_id">{options}</select></label>
            <label className="grid gap-1">Permission<select required className={field} name="capability">{capabilities.map((option) => <option key={option}>{option}</option>)}</select></label>
            <button className={button}>Grant access</button>
          </form> : <p>Add an active store and team member to grant access.</p>}
        </section>
        <section className="space-y-3 rounded-xl border p-4">
          <h3 className="text-lg font-semibold">Store devices</h3>
          <p>{enrollment.data ? "This browser is enrolled." : "Open this page on the browser you want to enroll."}</p>
          {enrollment.data && <div className="flex gap-4">
            <Link className="underline" href={`/retail-order/${id}/register`}>Open register</Link>
            <Link className="underline" href={`/retail-order/${id}/kiosk`}>Open self-service menu</Link>
            <Link className="underline" href={`/business/${id}/retail/kitchen`}>Open kitchen queue</Link>
          </div>}
          <ul className="divide-y">
            {devices.data?.map((device) => <li className="flex flex-wrap items-center justify-between gap-2 py-2" key={device.id}>
              <span>{device.label} · {storeName(device.location_id)} · {device.kind} · {device.revoked_at ? "Revoked" : "Enrolled"}</span>
              {!device.revoked_at && <form action={revoke.bind(null, id)}>
                <input type="hidden" name="device" value={device.id} /><button className={button}>Revoke device</button>
              </form>}
            </li>)}
          </ul>
          {active.length && !enrollment.data ? <form className="grid gap-3 sm:grid-cols-3" action={enroll.bind(null, id)}>
            <label className="grid gap-1">Device name<input required name="label" maxLength={80} className={field} /></label>
            <label className="grid gap-1">Device store<select required className={field} name="location_id">{options}</select></label>
            <label className="grid gap-1">Device type<select required className={field} name="kind">{deviceKinds.map((option) => <option key={option}>{option}</option>)}</select></label>
            <button className={button}>Enroll this browser</button>
          </form> : null}
        </section>
      </>}
    </section>
  </AppShell>;
}
