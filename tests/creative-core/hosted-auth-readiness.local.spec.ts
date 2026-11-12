import { test, expect } from "playwright/test";
import { clickAddSection, createPage, deletePage, editFirstText, expectBuilderViewport, redo, renamePage, SECTION_SELECTOR, sectionAction, undo, waitForBuilder } from "../create/e2e-builder-helpers";
import { openBuilderSqlBridge } from "./fixtures/builder-sql-bridge";
import { projectId } from "./fixtures/3j-database";
import { roots } from "../../lib/creative-core";

test.skip(process.env.KEBU_LOCAL_OPERATION_UI !== "1" || !process.env.KEBU_LOCAL_PGLITE_ROOT,
  "Actual local Next pages and migrated SQL; not hosted Supabase authentication.");

test("authenticated acceptance refuses the actual sign-in route", async ({ page }) => {
  await page.goto("/login");
  await expect(waitForBuilder(page)).rejects.toThrow();
});

test("the real text helper commits to SQL and survives a reload", async ({ page }) => {
  const authority = await openBuilderSqlBridge(page);
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/create/${projectId}`); await waitForBuilder(page);
    await editFirstText(page, "Authenticated gate persisted text");
    await expect.poll(() => Object.values(authority.server.current().nodes).some(node => node.props.text === "Authenticated gate persisted text")).toBe(true);
    await page.reload(); await waitForBuilder(page);
    await expect(page.getByRole("heading", { name: "Authenticated gate persisted text", exact: true })).toBeVisible();
    expect(authority.transactions).toHaveLength(1);
    expect(authority.legacyWrites).toEqual([]);
  } finally { await authority.server.close(); }
});

test("the real add-section helper requires an inserted SQL root and keyboard undo/redo", async ({ page }) => {
  const authority = await openBuilderSqlBridge(page);
  const rootCount = () => Object.values(authority.server.current().nodes).filter(node => node.parentId === null).length;
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/create/${projectId}`); await waitForBuilder(page);
    const before = rootCount();
    await clickAddSection(page);
    await expect.poll(rootCount).toBe(before + 1);
    await undo(page); await expect.poll(rootCount).toBe(before);
    await redo(page); await expect.poll(rootCount).toBe(before + 1);
    expect(authority.transactions).toHaveLength(3);
    expect(authority.legacyWrites).toEqual([]);
  } finally { await authority.server.close(); }
});

test("published template preview cannot satisfy authenticated Builder readiness", async ({ page }) => {
  await page.goto("/create/preview/musician-artist");
  await expect(waitForBuilder(page)).rejects.toThrow();
});

test("page helpers create, rename and delete through actual native SQL operations", async ({ page }) => {
  const authority = await openBuilderSqlBridge(page);
  const pageCount = () => Object.keys(authority.server.current().pages).length;
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/create/${projectId}`); await waitForBuilder(page);
    const before = pageCount();
    await createPage(page, "Gate disposable page");
    await expect.poll(pageCount).toBe(before + 1);
    await renamePage(page, "Gate disposable page", "Gate renamed page");
    await expect.poll(() => Object.values(authority.server.current().pages).some(item => item.title === "Gate renamed page")).toBe(true);
    await deletePage(page, "Gate renamed page");
    await expect.poll(pageCount).toBe(before);
    expect(authority.transactions).toHaveLength(3);
    expect(authority.legacyWrites).toEqual([]);
  } finally { await authority.server.close(); }
});

test("section actions target the selected root and persist duplicate, order and removal", async ({ page }) => {
  const authority = await openBuilderSqlBridge(page);
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/create/${projectId}`); await waitForBuilder(page);
    const before = new Set(Object.keys(authority.server.current().nodes));
    const sections = page.locator(SECTION_SELECTOR), visibleBefore = await sections.count();
    await sectionAction(page, sections.first(), "duplicate");
    await expect(sections).toHaveCount(visibleBefore + 1);
    const clone = Object.values(authority.server.current().nodes).find(node => node.parentId === null && !before.has(node.id))!;
    expect(clone).toBeTruthy();
    const element = page.locator(`[data-kcd-root-id="${clone.id}"]`);
    await sectionAction(page, element, "move-up");
    await expect.poll(() => roots(authority.server.current(), clone.pageId)[0].id).toBe(clone.id);
    await sectionAction(page, element, "delete");
    await expect(element).toHaveCount(0);
    await expect.poll(() => Object.keys(authority.server.current().nodes).length).toBe(before.size);
    expect(authority.transactions).toHaveLength(3);
    expect(authority.legacyWrites).toEqual([]);
  } finally { await authority.server.close(); }
});

for (const width of [390, 430, 768, 1024, 1440]) test(`actual migrated local Builder satisfies strict readiness and viewport at ${width}px`, async ({ page }) => {
  const authority = await openBuilderSqlBridge(page);
  try {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`/create/${projectId}`);
    await waitForBuilder(page);
    await expect(page.getByRole("region", { name: "Site canvas", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save draft", exact: true }).first()).toBeVisible();
    await expectBuilderViewport(page, width);
    expect(authority.transactions).toHaveLength(0);
    expect(authority.legacyWrites).toEqual([]);
  } finally { await authority.server.close(); }
});
