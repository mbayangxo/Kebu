import { test, expect } from "playwright/test";
test.skip(process.env.KEBU_LOCAL_OPERATION_UI !== "1", "Isolated real-component harness only");

test("saved cutout geometry survives preview and fixture reload without Russian fallback", async ({ page }) => {
  await page.goto("/collage-local-probe");
  await expect(page.getByTestId("fixture-controls")).toHaveAttribute("data-ready", "true");
  const layer = page.locator('[data-kebu-layer="cutoutAccent"]');
  await expect(layer).toBeVisible();
  await expect(page.getByTestId("fixture-controls")).toHaveAttribute("data-ready", "true");
  await layer.press("Enter");
  await expect(layer).toHaveCSS("outline-width", "2px");
  await layer.press("ArrowRight");
  await expect(layer).toHaveCSS("left", /./);
  const geometry = () => layer.evaluate(el => {
    const style = (el as HTMLElement).style;
    return { left: style.left, top: style.top, width: style.width, opacity: style.opacity };
  });
  await expect.poll(async () => (await geometry()).left).toBe("21%");
  const savedGeometry = await geometry();
  await page.getByRole("button", { name: "Save fixture", exact: true }).click();
  await page.getByRole("button", { name: "Preview composition" }).click();
  expect(await geometry()).toEqual(savedGeometry);
  await expect(layer.locator("img")).toHaveAttribute("src", /maylecor/);
  await expect(layer.getByRole("link")).toHaveAttribute("href", "/collage-local-probe/about");
  await expect(page.getByRole("button", { name: /Drag to move|Resize hero|Change background/i })).toHaveCount(0);
  await expect(page.locator('[data-kebu-site-nav="1"]')).toHaveCount(1);
  expect(await page.locator("body").innerText()).not.toMatch(/[А-Яа-я]/);
  await page.reload();
  await page.getByRole("button", { name: "Load fixture", exact: true }).click();
  expect(await geometry()).toEqual(savedGeometry);
});

test("navigation uses narrow container width inside a desktop viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/collage-local-probe");
  await expect(page.getByTestId("fixture-controls")).toHaveAttribute("data-ready", "true");
  await page.getByRole("button", { name: "Preview composition" }).click();
  await page.getByRole("button", { name: "Toggle narrow frame" }).click();
  await expect(page.getByRole("navigation", { name: "Site", exact: true })).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Site pages", exact: true })).toBeVisible();
  const frame = page.getByTestId("composition");
  expect(await frame.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: "evidence/3c/s5/collage-narrow-preview.png" });
});

test("parallax changes geometry on scroll and motion-off removes the track", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 700 });
  await page.goto("/collage-local-probe");
  await expect(page.getByTestId("fixture-controls")).toHaveAttribute("data-ready", "true");
  await page.getByRole("button", { name: "Preview composition" }).click();
  const layer = page.locator('[data-kebu-layer="cutoutAccent"]');
  const before = await layer.evaluate(el => getComputedStyle(el).transform);
  await page.mouse.move(1100, 500);
  await page.mouse.wheel(0, 450);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await expect.poll(() => layer.evaluate(el => getComputedStyle(el).transform)).not.toBe(before);
  await page.getByRole("button", { name: "Toggle motion" }).click();
  await expect(page.locator(".lb-editor-scroll-scene")).toHaveCount(0);
});


test("ordinary section picker creates an editable collage without private artist assets", async ({ page }) => {
  await page.goto("/collage-local-probe");
  await expect(page.getByTestId("fixture-controls")).toHaveAttribute("data-ready", "true");
  await page.getByRole("button", { name: "Add section", exact: false }).click();
  await page.getByRole("button", { name: /Cutout collage/ }).click();
  await expect(page.locator('[data-kebu-layer="titleLogo"]')).toBeVisible();
  await expect(page.locator('[data-kebu-layer] img')).toHaveCount(0);
  await page.getByRole("button", { name: "Save fixture", exact: true }).click();
  await page.getByRole("button", { name: "Preview composition" }).click();
  await expect(page.locator('[data-kebu-layer="titleLogo"]')).toContainText("Your name");
  await expect(page.locator('[data-kebu-site-nav="1"]')).toHaveCount(1);
});


test("phone viewport respects reduced motion without hiding the saved portraits", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/collage-local-probe");
  await expect(page.getByTestId("fixture-controls")).toHaveAttribute("data-ready", "true");
  await page.getByRole("button", { name: "Preview composition" }).click();
  await expect(page.locator(".lb-editor-scroll-scene")).toHaveCount(0);
  await expect(page.locator('[data-kebu-layer="cutoutAccent"] img')).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Site pages", exact: true })).toBeVisible();
  await page.screenshot({ path: "evidence/3c/s5/collage-phone-reduced-motion.png" });
});


test("ordinary cutout controls make opposite horizontal movements on actual scroll", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 700 });
  await page.goto("/collage-local-probe");
  await expect(page.getByTestId("fixture-controls")).toHaveAttribute("data-ready", "true");
  await expect(page.getByTestId("fixture-controls")).toHaveAttribute("data-ready", "true");
  const panel = page.getByText("Scroll-driven cutout movement", { exact: true }).locator("..");
  await panel.locator("summary").click();
  await panel.getByLabel("Moving layer", { exact: true }).selectOption("cutoutAccent");
  await panel.getByRole("button", { name: "Right", exact: true }).click();
  await panel.getByLabel("Moving layer", { exact: true }).selectOption("cutoutLeft");
  await panel.getByRole("button", { name: "Left", exact: true }).click();
  await page.getByRole("button", { name: "Save fixture", exact: true }).click();
  await panel.locator("summary").click();
  await page.getByRole("button", { name: "Preview composition", exact: true }).click();
  const right = page.locator('[data-kebu-layer="cutoutAccent"]');
  const left = page.locator('[data-kebu-layer="cutoutLeft"]');
  const x = (layer: typeof right) => layer.evaluate(el => new DOMMatrix(getComputedStyle(el).transform === "none" ? undefined : getComputedStyle(el).transform).m41);
  const beforeRight = await x(right), beforeLeft = await x(left);
  await page.mouse.move(1100, 500); await page.mouse.wheel(0, 450);
  await expect.poll(() => x(right)).toBeGreaterThan(beforeRight);
  await expect.poll(() => x(left)).toBeLessThan(beforeLeft);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".lb-editor-scroll-scene")).toHaveCount(0);
});


test("stacked cutout scenes keep one navigation and independent scroll tracks", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 700 });
  await page.goto("/collage-local-probe");
  await expect(page.getByTestId("fixture-controls")).toHaveAttribute("data-ready", "true");
  await page.getByRole("button", { name: "Toggle second scene", exact: true }).click();
  await page.getByRole("button", { name: "Preview composition", exact: true }).click();
  await expect(page.locator('[data-kebu-site-nav="1"]')).toHaveCount(1);
  await expect(page.locator(".lb-editor-scroll-scene")).toHaveCount(2);
  const second = page.locator('[data-kebu-layer="cutoutAccent"]').nth(1);
  const before = await second.evaluate(el => getComputedStyle(el).transform);
  const destination = await page.locator(".lb-editor-scroll-scene").nth(1).evaluate(el => el.getBoundingClientRect().top + window.scrollY + 400);
  await page.mouse.move(1100, 500); await page.mouse.wheel(0, destination);
  await expect.poll(() => second.evaluate(el => getComputedStyle(el).transform)).not.toBe(before);
});
