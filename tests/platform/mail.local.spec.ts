import { test, expect, type BrowserContext, type Page } from "playwright/test";

const userA = "11111111-1111-4111-8111-111111111111"; // alice
const userB = "22222222-2222-4222-8222-222222222222"; // bob
const userC = "33333333-3333-4333-8333-333333333333"; // carol
const founder = "44444444-4444-4444-8444-444444444444";
const employee = "77777777-7777-4777-8777-777777777777"; // active business member, not a founder

async function session(context: BrowserContext, id: string) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = [
    Buffer.from('{"alg":"none","typ":"JWT"}').toString("base64url"),
    Buffer.from(JSON.stringify({ sub: id, exp })).toString("base64url"),
    "fixture",
  ].join(".");
  await context.addCookies([{
    name: "sb-127-auth-token",
    value: "base64-" + Buffer.from(JSON.stringify({
      access_token: token, refresh_token: "fixture", expires_at: exp, expires_in: 3600, token_type: "bearer",
      user: { id, email: id + "@example.test", app_metadata: {}, user_metadata: {} },
    })).toString("base64url"),
    url: "http://127.0.0.1:38450", sameSite: "Lax",
  }]);
}
async function state(request: import("playwright/test").APIRequestContext) { return (await request.get("http://127.0.0.1:38451/__qa/state")).json(); }
async function reset(request: import("playwright/test").APIRequestContext) { await request.post("http://127.0.0.1:38451/__qa/reset"); }
function trackErrors(page: Page) { const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message)); return errors; }

async function activateMailbox(page: Page, displayName: string, localPart: string) {
  await page.goto("/email");
  await page.getByLabel("Display name", { exact: true }).fill(displayName);
  await page.getByLabel("Kebu email name", { exact: true }).fill(localPart);
  await page.getByRole("button", { name: "Create my Kebu email", exact: true }).click();
  await expect(page.getByRole("button", { name: "+ New message", exact: true }).first()).toBeVisible();
}

async function composeAndSend(page: Page, opts: { to: string; subject: string; body: string }) {
  await page.getByRole("button", { name: "+ New message", exact: true }).first().click();
  await page.getByLabel("To", { exact: true }).fill(opts.to);
  await page.getByLabel("Subject", { exact: true }).fill(opts.subject);
  await page.getByPlaceholder("Write your email…", { exact: true }).fill(opts.body);
  await page.getByRole("button", { name: "Send →", exact: true }).click();
}

test("two Kebu users create personal mailboxes and email each other back and forth, with real SQL persistence across reload", async ({ page, request }) => {
  await reset(request);
  await session(page.context(), userA);
  const errors = trackErrors(page);
  await activateMailbox(page, "Alice", "alice");

  await session(page.context(), userB);
  await activateMailbox(page, "Bob", "bob");

  await session(page.context(), userA);
  await page.goto("/email");
  await composeAndSend(page, { to: "bob@kebu.africa", subject: "Hello Bob", body: "Hi Bob, this is Alice." });
  await expect(page.getByPlaceholder("Write your email…")).not.toBeVisible();

  const afterSend = await state(request);
  const bobMailbox = afterSend.mailboxes.find((m: { address: string }) => m.address === "bob@kebu.africa");
  const delivered = afterSend.messages.find((m: { mailbox_id: string; subject: string }) => m.mailbox_id === bobMailbox.id && m.subject === "Hello Bob");
  expect(delivered).toMatchObject({ direction: "inbound", folder: "inbox", from_address: "alice@kebu.africa", status: "received" });

  await session(page.context(), userB);
  await page.goto("/email");
  await expect(page.getByText("Hello Bob", { exact: true })).toBeVisible();
  await page.getByText("Hello Bob", { exact: true }).click();
  await expect(page.getByText("Hi Bob, this is Alice.", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Reply", exact: true }).first().click();
  await expect(page.getByLabel("To", { exact: true })).toHaveValue("alice@kebu.africa");
  await page.getByPlaceholder("Write your email…", { exact: true }).fill("Hi Alice, Bob here.");
  await page.getByRole("button", { name: "Send →", exact: true }).click();
  await expect(page.getByPlaceholder("Write your email…")).not.toBeVisible();

  await session(page.context(), userA);
  await page.goto("/email");
  await expect(page.getByText("Re: Hello Bob", { exact: true })).toBeVisible();
  await page.getByText("Re: Hello Bob", { exact: true }).click();
  await expect(page.getByText("Hi Alice, Bob here.", { exact: true })).toBeVisible();

  expect(errors).toEqual([]);
});

test("forwarding: a message to a mailbox with an active forward lands in both the original and the forward-target inbox", async ({ page, request }) => {
  await reset(request);
  await session(page.context(), userA);
  await activateMailbox(page, "Alice", "alice");
  await session(page.context(), userB);
  await activateMailbox(page, "Bob", "bob");
  await session(page.context(), userC);
  await activateMailbox(page, "Carol", "carol");

  await session(page.context(), userB);
  await page.goto("/email");
  await page.getByRole("button", { name: "Forwarding", exact: false }).click();
  await page.getByLabel("Forward to address", { exact: true }).fill("carol@kebu.africa");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Forwarding to", { exact: false })).toBeVisible();
  await expect(page.getByText("carol@kebu.africa", { exact: true })).toBeVisible();

  await session(page.context(), userA);
  await page.goto("/email");
  await composeAndSend(page, { to: "bob@kebu.africa", subject: "Forward test", body: "This should reach both inboxes." });
  await expect(page.getByPlaceholder("Write your email…")).not.toBeVisible();

  const afterSend = await state(request);
  const bobMailbox = afterSend.mailboxes.find((m: { address: string }) => m.address === "bob@kebu.africa");
  const carolMailbox = afterSend.mailboxes.find((m: { address: string }) => m.address === "carol@kebu.africa");
  const bobCopy = afterSend.messages.find((m: { mailbox_id: string; subject: string }) => m.mailbox_id === bobMailbox.id && m.subject === "Forward test");
  const carolCopy = afterSend.messages.find((m: { mailbox_id: string; subject: string }) => m.mailbox_id === carolMailbox.id && m.subject === "Forward test");
  expect(bobCopy).toBeTruthy();
  expect(carolCopy).toMatchObject({ forwarded_from_message_id: bobCopy.id, forward_depth: 1, from_address: "alice@kebu.africa" });

  await session(page.context(), userC);
  await page.goto("/email");
  await expect(page.getByText("Forward test", { exact: true })).toBeVisible();

  await session(page.context(), userB);
  await page.goto("/email");
  await expect(page.getByText("Forward test", { exact: true })).toBeVisible();
});

test("forwarding to an external address queues a real outbound delivery job, without needing a live provider", async ({ page, request }) => {
  await reset(request);
  await session(page.context(), userA);
  await activateMailbox(page, "Alice", "alice");
  await session(page.context(), userC);
  await activateMailbox(page, "Carol", "carol");

  await page.getByRole("button", { name: "Forwarding", exact: false }).click();
  await page.getByLabel("Forward to address", { exact: true }).fill("someone@gmail.test");
  await page.getByRole("button", { name: "Save", exact: true }).click();

  await session(page.context(), userA);
  await page.goto("/email");
  await composeAndSend(page, { to: "carol@kebu.africa", subject: "External forward test", body: "Forward me out." });
  await expect(page.getByPlaceholder("Write your email…")).not.toBeVisible();

  const afterSend = await state(request);
  const carolMailbox = afterSend.mailboxes.find((m: { address: string }) => m.address === "carol@kebu.africa");
  const forwardedCopy = afterSend.messages.find((m: { mailbox_id: string; to_addresses: string[] }) => m.mailbox_id === carolMailbox.id && m.to_addresses?.[0] === "someone@gmail.test");
  expect(forwardedCopy).toMatchObject({ direction: "outbound", folder: "sent", status: "queued" });

  const job = afterSend.deliveryJobs.find((j: { message_id: string }) => j.message_id === forwardedCopy.id);
  expect(job).toMatchObject({ provider: "resend", status: "queued" });
  expect(job.idempotency_key.startsWith("forward:")).toBe(true);
});

test("retrying a failed send keeps the typed message and delivers it on retry", async ({ page, request }) => {
  await reset(request);
  await session(page.context(), userA);
  const errors = trackErrors(page);
  await activateMailbox(page, "Alice", "alice");
  await session(page.context(), userB);
  await activateMailbox(page, "Bob", "bob");

  await session(page.context(), userA);
  await page.goto("/email");
  await page.getByRole("button", { name: "+ New message", exact: true }).first().click();
  await page.getByLabel("To", { exact: true }).fill("bob@kebu.africa");
  await page.getByLabel("Subject", { exact: true }).fill("Retry test");
  await page.getByPlaceholder("Write your email…", { exact: true }).fill("Please don't lose this.");

  let first = true;
  await page.route("**/api/mail/send", async (route) => {
    if (first) { first = false; await route.abort("failed"); return; }
    await route.continue();
  });

  await page.getByRole("button", { name: "Send →", exact: true }).click();
  await expect(page.getByPlaceholder("Write your email…")).toHaveValue("Please don't lose this.");
  await page.getByRole("button", { name: "Send →", exact: true }).click();
  await expect(page.getByPlaceholder("Write your email…")).not.toBeVisible();

  const after = await state(request);
  expect(after.messages.some((m: { subject: string }) => m.subject === "Retry test")).toBe(true);
  expect(errors).toEqual([]);
});

test("a signed-in user's own RLS session cannot read another user's mailbox messages", async ({ page, request }) => {
  await reset(request);
  await session(page.context(), userA);
  await activateMailbox(page, "Alice", "alice");
  await session(page.context(), userB);
  await activateMailbox(page, "Bob", "bob");

  const afterSetup = await state(request);
  const bobMailbox = afterSetup.mailboxes.find((m: { address: string }) => m.address === "bob@kebu.africa");

  await session(page.context(), userA);
  const res = await page.request.get(`http://127.0.0.1:38450/api/mail/messages?mailboxId=${bobMailbox.id}&view=inbox`);
  expect(res.ok()).toBe(true);
  expect((await res.json()).messages).toHaveLength(0);
});

test("a business mailbox created on an already-verified domain can send and receive like any other Kebu mailbox", async ({ page, request }) => {
  await reset(request);
  await session(page.context(), userA);
  await activateMailbox(page, "Alice", "alice");

  await session(page.context(), founder);
  await page.goto("/email");
  await page.getByPlaceholder("hello", { exact: true }).fill("hello");
  await page.locator('input[placeholder="Display name"]').fill("Fixture Biz Co");
  await page.getByRole("button", { name: "Create business email →", exact: true }).click();
  await expect(page.getByRole("button", { name: "+ New message", exact: true }).first()).toBeVisible();

  await session(page.context(), userA);
  await page.goto("/email");
  await composeAndSend(page, { to: "hello@bizmail.test", subject: "Business mail test", body: "Reaching the business inbox." });
  await expect(page.getByPlaceholder("Write your email…")).not.toBeVisible();

  await session(page.context(), founder);
  await page.goto("/email");
  await expect(page.getByText("Business mail test", { exact: true })).toBeVisible();
});

test("mobile viewport: the mail inbox is usable and does not overflow", async ({ page, request }) => {
  await reset(request);
  await session(page.context(), userA);
  await activateMailbox(page, "Alice", "alice");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/email");
  await expect(page.getByRole("button", { name: "+ New message", exact: true }).first()).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("mail-inbox-mobile.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("shared mailbox: founder creates it, grants an employee access, employee uses it, founder revokes access and it disappears for them", async ({ page, request }) => {
  await reset(request);

  await session(page.context(), founder);
  await page.goto("/email");
  await page.getByRole("button", { name: "Shared mailboxes", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Team access, no shared password", exact: true })).toBeVisible();
  await page.getByPlaceholder("support", { exact: true }).fill("support");
  await page.locator('input[placeholder="Display name"]').fill("Support Team");
  await page.getByRole("button", { name: "Create shared mailbox →", exact: true }).click();
  await expect(page.getByRole("main").getByText("support@bizmail.test", { exact: true })).toBeVisible();

  // founder is auto-added as manager; grant the employee access as a plain member.
  await page.getByRole("combobox").first().selectOption({ label: "Eve Employee" });
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText("Eve Employee", { exact: true })).toBeVisible();

  // The employee now sees it in their own mailbox switcher (real RLS access,
  // not just this fixture's trust of the request) and can open it with no error.
  await session(page.context(), employee);
  await page.goto("/email");
  await expect(page.getByRole("button", { name: "Support Team support@bizmail.test" })).toBeVisible();
  await page.getByRole("button", { name: "Support Team support@bizmail.test" }).click();
  await expect(page.getByText("Nothing here yet.", { exact: true })).toBeVisible();

  const afterGrant = await state(request);
  expect(afterGrant.sharedAccess).toHaveLength(2); // founder (manager, auto) + employee (member)
  expect(afterGrant.sharedAccess.some((row: { user_id: string; role: string }) => row.user_id === employee && row.role === "member")).toBe(true);

  // Founder revokes access; the mailbox must vanish from the employee's own
  // switcher on their next real load — not just stop appearing in some cache.
  await session(page.context(), founder);
  await page.goto("/email");
  await page.getByRole("button", { name: "Shared mailboxes", exact: true }).click();
  await page.getByRole("button", { name: "Remove: Eve Employee", exact: true }).click();
  await expect(page.getByText("Eve Employee", { exact: true })).not.toBeVisible();

  await session(page.context(), employee);
  await page.goto("/email");
  await expect(page.getByRole("button", { name: "Support Team support@bizmail.test" })).not.toBeVisible();

  const afterRevoke = await state(request);
  expect(afterRevoke.sharedAccess).toHaveLength(1);
});
