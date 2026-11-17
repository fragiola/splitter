import { expect, test } from "@playwright/test";
import { atPath, openExample } from "../helpers";
import { dragBy, extentOf, near, valueNow } from "./helpers";

// The drawer tab: a pull tab on a thin line, above a bottom panel. Dragging the tab resizes the
// drawer, and so do the arrows on the separator.

test.beforeEach(async ({ page }) => {
    await openExample(page, "separator-drawer-tab");
});

test("dragging the tab pulls the drawer up and pushes it down", async ({
    page,
}) => {
    const drawer = atPath(page, "/g0/p1");
    const tab = page.getByTestId("drawer-tab");
    await expect(tab).toBeVisible();
    const height = await extentOf(drawer, "height");

    await dragBy(page, tab, 0, -60);
    await expect
        .poll(() => extentOf(drawer, "height"))
        .toBeGreaterThan(height + 50);
    near(await extentOf(drawer, "height"), height + 60, 2);

    await dragBy(page, tab, 0, 40);
    await expect
        .poll(() => extentOf(drawer, "height"))
        .toBeLessThan(height + 30);
});

test("the arrows on the separator resize the drawer", async ({ page }) => {
    const drawer = atPath(page, "/g0/p1");
    const separator = page.getByRole("separator", { name: "Resize drawer" });
    await expect(separator).toHaveAttribute("aria-orientation", "horizontal");
    const height = await extentOf(drawer, "height");
    const before = await valueNow(separator);

    await separator.focus();
    await page.keyboard.press("ArrowUp");
    await expect.poll(() => valueNow(separator)).toBe(before - 5);
    expect(await extentOf(drawer, "height")).toBeGreaterThan(height);

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await expect.poll(() => valueNow(separator)).toBe(before + 5);
    expect(await extentOf(drawer, "height")).toBeLessThan(height);
});
