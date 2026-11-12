import { test, expect } from "playwright/test";
test.skip(process.env.KEBU_LOCAL_OPERATION_UI !== "1", "Isolated renderer gate, not hosted authentication/SQL proof.");

for (const width of [1440, 390]) {
  test(`creative drafts remain usable at ${width}px and respect reduced motion`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    // Match RootLayout's public-site chrome flag; no production route or credentials are used.
    await page.setExtraHTTPHeaders({ "x-kebu-is-public-site": "1" });
    await page.goto("/world-local-probe");
    await expect(page.getByRole("button", { name: "Learn something about Africa" })).toHaveCount(0);
    const world = page.locator(".creative-world");
    await expect(world.getByRole("heading", { name: "WE MAKE PEOPLE HARD TO IGNORE" })).toBeVisible();
    expect(await world.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await expect(world.locator(".world-intro")).toHaveCSS("opacity", "1");
    await expect(world.locator(".world-card").first()).toHaveCSS("opacity", "1");
    await expect.poll(() => world.evaluate(el => { let opacity = 1; for (let parent: Element | null = el; parent; parent = parent.parentElement) opacity *= Number(getComputedStyle(parent).opacity); return opacity; })).toBe(1);
    await page.screenshot({ path: `evidence/3c/s5/dklns-draft-${width}.png`, fullPage: true });
    await world.getByRole("button", { name: "film", exact: true }).click();
    await expect(world.locator(".world-empty")).toHaveText("No film added yet.");
    await world.getByRole("button", { name: "people", exact: true }).click();
    const card = world.getByRole("button", { name: "Open May Lècor", exact: true });
    await card.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(card).toBeFocused();
    await page.getByRole("button", { name: "View K-Direction", exact: true }).click();
    await expect(world.getByRole("heading", { name: "WHAT’S MOVING" })).toBeVisible();
    await expect(world.locator(".world-intro")).toHaveCSS("opacity", "1");
    await expect(world.locator(".world-card").first()).toHaveCSS("opacity", "1");
    await expect.poll(() => world.evaluate(el => { let opacity = 1; for (let parent: Element | null = el; parent; parent = parent.parentElement) opacity *= Number(getComputedStyle(parent).opacity); return opacity; })).toBe(1);
    await page.screenshot({ path: `evidence/3c/s5/kdirection-draft-${width}.png`, fullPage: true });
    await world.getByRole("button", { name: "← VIDEOS", exact: true }).click();
    await expect(world.locator(".world-intro h1")).toHaveText("VIDEOS");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(world.locator(".world-stage")).toHaveCSS("animation-name", "none");
    await world.getByRole("button", { name: "↑ ARTISTS", exact: true }).click();
    await expect(world.getByRole("button", { name: "Open May Lècor", exact: true })).toBeVisible();
    const bounds = await world.evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth, overflow: [...el.querySelectorAll("*")].map(node => ({ tag: node.tagName, cls: node.className, text: node.textContent?.slice(0, 35), left: node.getBoundingClientRect().left, right: node.getBoundingClientRect().right, width: node.getBoundingClientRect().width })).filter(node => node.left < 0 || node.right > el.getBoundingClientRect().right + 1) }));
    await page.screenshot({ path: `evidence/3c/s5/kdirection-artists-${width}.png`, fullPage: true });
    expect(bounds.scroll <= bounds.width + 1, JSON.stringify(bounds)).toBe(true);
  });
}
