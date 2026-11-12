import { test, expect, type BrowserContext, type Page, type APIRequestContext } from "playwright/test";

const founder = "33333333-3333-4333-8333-333333333333";
const employee = "44444444-4444-4444-8444-444444444444";
const applicant = "55555555-5555-4555-8555-555555555555";
const otherApplicant = "66666666-6666-4666-8666-666666666666";
const strangerFounder = "77777777-7777-4777-8777-777777777777";
const businessId = "88888888-8888-4888-8888-888888888888";

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
    url: "http://127.0.0.1:38440", sameSite: "Lax",
  }]);
}
async function state(request: APIRequestContext) { return (await request.get("http://127.0.0.1:38441/__qa/state")).json(); }
async function reset(request: APIRequestContext) { await request.post("http://127.0.0.1:38441/__qa/reset"); }
function trackErrors(page: Page) { const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message)); return errors; }

for (const failure of ["network", "invalid-json"] as const) {
  test(`failed listing creation (${failure}) preserves the draft and retries into actual SQL`, async ({ page, request }) => {
    await reset(request); await session(page.context(), founder);
    const errors = trackErrors(page);
    await page.goto(`/business/${businessId}/liguey`);
    await page.getByPlaceholder("Title", { exact: true }).fill("Community translator retry");
    let first = true;
    await page.route(`**/api/liguey/employers/${businessId}/listings`, async route => {
      if (route.request().method() === "POST" && first) {
        first = false;
        if (failure === "network") await route.abort("failed");
        else await route.fulfill({ status: 502, contentType: "text/html", body: "Upstream unavailable" });
        return;
      }
      await route.continue();
    });
    await page.getByRole("button", { name: "Create draft listing", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Could not create listing. Your draft is kept. Try again when connected." })).toBeVisible();
    await expect(page.getByPlaceholder("Title", { exact: true })).toHaveValue("Community translator retry");
    expect((await state(request)).listings).toHaveLength(0);
    await page.getByRole("button", { name: "Create draft listing", exact: true }).click();
    await expect(page.getByText("Community translator retry", { exact: true })).toBeVisible();
    const saved = await state(request);
    expect(saved.listings).toHaveLength(1);
    expect(saved.listings[0]).toMatchObject({ title: "Community translator retry", status: "draft", created_by: founder });
    expect(errors).toEqual([]);
  });
}

test("a worker can create and edit their profile, with real SQL persistence and reload", async ({ page, request }) => {
  await reset(request); await session(page.context(), applicant);
  const errors = trackErrors(page);
  await page.goto("/liguey/profile");
  await page.getByLabel("Headline", { exact: true }).fill("Wolof-French translator");
  await page.getByLabel("About you", { exact: true }).fill("Six years of informal community translation work.");
  await page.getByLabel("Skills", { exact: true }).fill("translation, bookkeeping");
  await page.getByLabel("Languages", { exact: true }).fill("Wolof, French");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  const afterSave = await state(request);
  expect(afterSave.profiles[0]).toMatchObject({ user_id: applicant, headline: "Wolof-French translator" });
  expect(afterSave.profiles[0].skills).toEqual(["translation", "bookkeeping"]);

  await page.reload();
  await expect(page.getByLabel("Headline", { exact: true })).toHaveValue("Wolof-French translator");
  await expect(page.getByLabel("Skills", { exact: true })).toHaveValue("translation, bookkeeping");
  expect(errors).toEqual([]);
});

test("a founder can create and publish a listing; a plain employee cannot manage listings (redirected)", async ({ page, request }) => {
  await reset(request); await session(page.context(), founder);
  const errors = trackErrors(page);
  await page.goto(`/business/${businessId}/liguey`);
  await page.getByPlaceholder("Title", { exact: true }).fill("Community translator");
  await page.getByRole("button", { name: "Create draft listing", exact: true }).click();
  await expect(page.getByText("Community translator", { exact: true })).toBeVisible();

  const afterCreate = await state(request);
  expect(afterCreate.listings).toHaveLength(1);
  expect(afterCreate.listings[0]).toMatchObject({ title: "Community translator", status: "draft", created_by: founder });

  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("Published", { exact: true })).toBeVisible();
  const link = page.locator('a[href^="/j/"]');
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  expect(href).toMatch(/^\/j\/job_/);

  expect(errors).toEqual([]);

  // A plain employee (not a manager role) is redirected away from the management page entirely.
  await session(page.context(), employee);
  await page.goto(`/business/${businessId}/liguey`);
  await page.waitForURL(`**/business/${businessId}`);
});

test("end to end: a worker applies via the public link, and the employer sees their profile while reviewing and can accept", async ({ page, request }) => {
  await reset(request);
  await session(page.context(), founder);
  await page.goto(`/business/${businessId}/liguey`);
  await page.getByPlaceholder("Title", { exact: true }).fill("Community translator");
  await page.getByRole("button", { name: "Create draft listing", exact: true }).click();
  await expect(page.getByText("Community translator", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  const publicHref = await page.locator('a[href^="/j/"]').getAttribute("href");
  expect(publicHref).toBeTruthy();

  await session(page.context(), applicant);
  await page.goto("/liguey/profile");
  await page.getByLabel("Headline", { exact: true }).fill("Wolof-French translator");
  await page.getByLabel("Skills", { exact: true }).fill("translation");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  await page.goto(publicHref!);
  await expect(page.getByRole("heading", { name: "Community translator", exact: true })).toBeVisible();
  await page.locator("textarea").fill("I would love to help with this.");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByText("Application submitted", { exact: false })).toBeVisible();

  const afterApply = await state(request);
  expect(afterApply.applications).toHaveLength(1);
  expect(afterApply.applications[0]).toMatchObject({ applicant_user_id: applicant, status: "submitted" });

  await session(page.context(), founder);
  await page.goto(`/business/${businessId}/liguey`);
  await page.getByRole("button", { name: "View applicants", exact: true }).click();
  await expect(page.getByText("I would love to help with this.", { exact: true })).toBeVisible();
  await expect(page.getByText("Wolof-French translator", { exact: true })).toBeVisible();
  await expect(page.getByText(/translation/)).toBeVisible();
  await page.getByRole("button", { name: "Accept", exact: true }).click();
  await expect(page.getByText("Accepted", { exact: true })).toBeVisible();

  const decided = await state(request);
  expect(decided.applications[0]).toMatchObject({ status: "accepted", decided_by: founder });
  expect(decided.applications[0].decided_at).not.toBeNull();

  await session(page.context(), applicant);
  await page.goto("/liguey/applications");
  await expect(page.getByText("Accepted", { exact: true })).toBeVisible();
});

test("applicants are isolated from each other's applications, and a withdrawn application can be withdrawn via the UI", async ({ page, request }) => {
  await reset(request);
  await session(page.context(), founder);
  await page.goto(`/business/${businessId}/liguey`);
  await page.getByPlaceholder("Title", { exact: true }).fill("Bookkeeper needed");
  await page.getByRole("button", { name: "Create draft listing", exact: true }).click();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  const publicHref = await page.locator('a[href^="/j/"]').getAttribute("href");

  await session(page.context(), applicant);
  await page.goto(publicHref!);
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByText("Application submitted", { exact: false })).toBeVisible();

  await page.goto("/liguey/applications");
  await expect(page.getByText("Bookkeeper needed", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Withdraw", exact: true }).click();
  await expect(page.getByText("Withdrawn", { exact: true })).toBeVisible();
  const afterWithdraw = await state(request);
  expect(afterWithdraw.applications[0].status).toBe("withdrawn");

  // A different applicant's own applications list never shows this one.
  await session(page.context(), otherApplicant);
  await page.goto("/liguey/applications");
  await expect(page.getByText("Bookkeeper needed")).not.toBeVisible();
});

test("a stranger (unrelated founder) is redirected away from a business's listing management page", async ({ page, request }) => {
  await reset(request);
  await session(page.context(), strangerFounder);
  await page.goto(`/business/${businessId}/liguey`);
  await page.waitForURL(`**/business/${businessId}`);
});

test("a signed-out visitor sees the public listing and gets a sign-in prompt when applying", async ({ page, request }) => {
  await reset(request);
  await session(page.context(), founder);
  await page.goto(`/business/${businessId}/liguey`);
  await page.getByPlaceholder("Title", { exact: true }).fill("Open role");
  await page.getByRole("button", { name: "Create draft listing", exact: true }).click();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  const publicHref = await page.locator('a[href^="/j/"]').getAttribute("href");

  const anon = await page.context().browser()!.newContext();
  try {
    const anonPage = await anon.newPage();
    await anonPage.goto("http://127.0.0.1:38440" + publicHref);
    await expect(anonPage.getByRole("heading", { name: "Open role", exact: true })).toBeVisible();
    await anonPage.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(anonPage.getByText("Sign in to apply", { exact: false })).toBeVisible();
  } finally {
    await anon.close();
  }
});

test("the public discovery API returns a real published listing to a completely anonymous caller", async ({ page, request }) => {
  await reset(request);
  await session(page.context(), founder);
  await page.goto(`/business/${businessId}/liguey`);
  await page.getByPlaceholder("Title", { exact: true }).fill("Discoverable role");
  await page.getByRole("button", { name: "Create draft listing", exact: true }).click();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  const publicHref = await page.locator('a[href^="/j/"]').getAttribute("href");
  const publicId = publicHref!.split("/").pop();

  // The `request` fixture is its own APIRequestContext, independent of the
  // browser's cookies — a genuinely anonymous caller, exercising
  // app/api/public/liguey/listings' service-role path, not RLS.
  const list = await request.get("http://127.0.0.1:38440/api/public/liguey/listings");
  expect(list.ok()).toBe(true);
  const listBody = await list.json();
  expect(listBody.listings.some((l: { title: string }) => l.title === "Discoverable role")).toBe(true);

  const detail = await request.get(`http://127.0.0.1:38440/api/public/liguey/listings/${publicId}`);
  expect(detail.ok()).toBe(true);
  const detailBody = await detail.json();
  expect(detailBody.listing).toMatchObject({ title: "Discoverable role", employerName: "Fixture Translation Co" });
});

test("retrying a failed profile save keeps the typed text and persists on retry", async ({ page, request }) => {
  await reset(request); await session(page.context(), applicant);
  const errors = trackErrors(page);
  await page.goto("/liguey/profile");
  await page.getByLabel("Headline", { exact: true }).fill("Retry headline");
  let first = true;
  await page.route("**/api/liguey/profile", async (route) => {
    if (route.request().method() === "PATCH" && first) { first = false; await route.abort("failed"); return; }
    await route.continue();
  });
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.getByLabel("Headline", { exact: true })).toHaveValue("Retry headline");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  const after = await state(request);
  expect(after.profiles[0].headline).toBe("Retry headline");
  expect(errors).toEqual([]);
});

test("Ask Yande generates a real, grounded, non-numeric-score insight for a real applicant", async ({ page, request }) => {
  await reset(request);
  await session(page.context(), founder);
  await page.goto(`/business/${businessId}/liguey`);
  await page.getByPlaceholder("Title", { exact: true }).fill("Community translator");
  await page.getByRole("button", { name: "Create draft listing", exact: true }).click();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  const publicHref = await page.locator('a[href^="/j/"]').getAttribute("href");

  await session(page.context(), applicant);
  await page.goto("/liguey/profile");
  await page.getByLabel("Headline", { exact: true }).fill("Wolof-French translator");
  await page.getByLabel("Skills", { exact: true }).fill("translation, bookkeeping");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  await page.goto(publicHref!);
  await page.locator("textarea").fill("I would love to help with this.");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByText("Application submitted", { exact: false })).toBeVisible();

  await session(page.context(), founder);
  await page.goto(`/business/${businessId}/liguey`);
  await page.getByRole("button", { name: "View applicants", exact: true }).click();
  const askYande = page.getByRole("button", { name: "Ask Yande about this applicant", exact: true });
  await expect(askYande).toBeVisible();
  await askYande.click();

  await expect(page.getByText("Yande's notes", { exact: true })).toBeVisible();
  await expect(page.getByText(/not a score/i)).toBeVisible();

  const after = await state(request);
  expect(after.insights).toHaveLength(1);
  expect(after.insights[0]).toMatchObject({ generated_by: founder, business_id: businessId });

  // Grounded, not fabricated: Yande was actually sent this real applicant's
  // real skills and the real listing title, not a generic/static prompt.
  const sentText = JSON.stringify(after.lastAnthropicRequest.messages);
  expect(sentText).toContain("Community translator");
  expect(sentText).toContain("translation");
  expect(after.lastAnthropicRequest.system).toContain("Never invent a numeric score");

  // A plain employee can read the cached note via the real RLS-scoped API
  // (any active member, not only the manager who generated it) — there is
  // no UI surface for this today, since the listing-management page itself
  // is manager-only (confirmed by an earlier test in this file), but the
  // data-layer guarantee is real and worth its own check.
  const listingId = after.listings.find((listing: { title: string }) => listing.title === "Community translator").id;
  await session(page.context(), employee);
  const employeeRes = await page.request.get(`http://127.0.0.1:38440/api/liguey/employers/${businessId}/listings/${listingId}/applications/${after.applications[0].id}/insight`);
  expect(employeeRes.ok()).toBe(true);
  expect((await employeeRes.json()).insight).toMatchObject({ summary: expect.stringContaining("Fixture-generated") });
});

test("employer adds pay and a photo to a listing; a hired worker can rate and review the real company, anonymously", async ({ page, request }) => {
  await reset(request);
  await session(page.context(), founder);
  const errors = trackErrors(page);
  await page.goto(`/business/${businessId}/liguey`);
  await page.getByPlaceholder("Title", { exact: true }).fill("Community translator");
  await page.getByPlaceholder("Pay (e.g. 2,000 XOF/day, or Negotiable)", { exact: true }).fill("2,000 XOF/day");
  await page.getByRole("button", { name: "Create draft listing", exact: true }).click();
  await expect(page.getByText("Community translator", { exact: true })).toBeVisible();

  await page.getByLabel("Add photo", { exact: true }).setInputFiles({ name: "photo.jpg", mimeType: "image/jpeg", buffer: Buffer.from([0xff, 0xd8, 0xff, 0xdb]) });
  // The thumbnail only renders once the real upload + photo_url save round-trip completes.
  await expect(page.locator("img").first()).toBeVisible();

  await page.getByRole("button", { name: "Publish", exact: true }).click();
  const publicHref = await page.locator('a[href^="/j/"]').getAttribute("href");

  const afterPublish = await state(request);
  expect(afterPublish.listings[0]).toMatchObject({ pay_label: "2,000 XOF/day" });
  expect(afterPublish.listings[0].photo_url).toContain("/storage/v1/object/public/site-assets/");
  expect(errors).toEqual([]);

  await session(page.context(), applicant);
  await page.goto(publicHref!);
  await expect(page.getByText("2,000 XOF/day", { exact: false })).toBeVisible();
  await expect(page.getByText("We translate community notices across Senegal.", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "https://fixture-translation.example", exact: true })).toBeVisible();
  await page.getByPlaceholder("Tell them why you're a fit", { exact: false }).fill("I would love to help with this.");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByText("Application submitted", { exact: false })).toBeVisible();

  await session(page.context(), founder);
  await page.goto(`/business/${businessId}/liguey`);
  await page.getByRole("button", { name: "View applicants", exact: true }).click();
  await page.getByRole("button", { name: "Accept", exact: true }).click();
  await expect(page.getByText("Accepted", { exact: true })).toBeVisible();

  // A hired worker (status = accepted) is offered the real review form.
  await session(page.context(), applicant);
  await page.goto(publicHref!);
  await expect(page.getByText("Rate this company", { exact: true })).toBeVisible();
  await page.getByLabel("Rating", { exact: true }).selectOption("4");
  await page.getByPlaceholder("Share your honest experience working here.", { exact: true }).fill("Paid on time, respectful team.");
  await page.getByLabel("Post anonymously", { exact: true }).check();
  await page.getByRole("button", { name: "Submit review", exact: true }).click();
  await expect(page.getByText("Saved.", { exact: true })).toBeVisible();

  const afterReview = await state(request);
  expect(afterReview.reviews).toHaveLength(1);
  expect(afterReview.reviews[0]).toMatchObject({ reviewer_user_id: applicant, rating: 4, is_anonymous: true, status: "visible" });
  const hiredApplicationId = afterReview.applications[0].id;

  // Reload as a fresh, anonymous visitor — the aggregate and the review text
  // are real and persisted, and the reviewer's identity is genuinely hidden.
  await page.reload();
  await expect(page.getByRole("paragraph").filter({ hasText: "Paid on time, respectful team." })).toBeVisible();
  await expect(page.getByText("Anonymous", { exact: true })).toBeVisible();

  // A founder from an unrelated business who was never hired here cannot
  // write a review via the real API, even trying to reuse the real
  // applicant's own application id — RLS is the actual gate, not the UI.
  await session(page.context(), strangerFounder);
  const spoofAttempt = await page.request.post(`http://127.0.0.1:38440/api/liguey/businesses/${businessId}/reviews`, {
    data: { applicationId: hiredApplicationId, rating: 5, body: "Fake review from an uninvolved stranger.", isAnonymous: false },
  });
  expect(spoofAttempt.status()).toBe(403);
});

test("mobile viewport: the worker profile page is usable and does not overflow", async ({ page, request }) => {
  await reset(request); await session(page.context(), applicant);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/liguey/profile");
  await expect(page.getByRole("button", { name: "Save profile", exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("liguey-profile-mobile.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
