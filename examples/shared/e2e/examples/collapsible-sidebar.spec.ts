import { expect, test } from "@playwright/test";
import { atPath, openExample } from "../helpers";
import { dragBy, extentOf } from "./helpers";

// Collapsing: a drag past the threshold collapses the sidebar to its rail, a drag back, Enter on
// the separator and the toolbar's button expand it to the size it had.

const REM = 16;

test.beforeEach(async ({ page }) => {
    await openExample(page, "collapsible-sidebar");
});

test("a drag past the threshold collapses the sidebar, a drag back expands it", async ({
    page,
}) => {
    const sidebar = atPath(page, "/g0/p0");
    const separator = page.getByRole("separator", { name: "Resize sidebar" });
    await expect(sidebar).toHaveAttribute("data-collapsible", "");
    await expect(sidebar).not.toHaveAttribute("data-collapsed");

    await dragBy(page, separator, -400, 0);
    await expect(sidebar).toHaveAttribute("data-collapsed", "");
    expect(Math.abs((await extentOf(sidebar)) - 3 * REM)).toBeLessThanOrEqual(
        1,
    );
    // the labels left with the room for them; the links keep their names
    await expect(page.getByText("Search", { exact: true })).toBeHidden();
    await expect(page.getByRole("link", { name: "Search" })).toBeVisible();
    await expect(
        page.getByRole("button", { name: "Expand the sidebar" }),
    ).toBeVisible();

    await dragBy(page, separator, 300, 0);
    await expect(sidebar).not.toHaveAttribute("data-collapsed");
    expect(await extentOf(sidebar)).toBeGreaterThanOrEqual(10 * REM - 1);
});

test("Enter on the separator collapses and expands, back to the size it had", async ({
    page,
}) => {
    const sidebar = atPath(page, "/g0/p0");
    const separator = page.getByRole("separator", { name: "Resize sidebar" });
    await dragBy(page, separator, 60, 0);
    const width = await extentOf(sidebar);

    await separator.focus();
    await page.keyboard.press("Enter");
    await expect(sidebar).toHaveAttribute("data-collapsed", "");
    await page.keyboard.press("Enter");
    await expect(sidebar).not.toHaveAttribute("data-collapsed");
    expect(Math.abs((await extentOf(sidebar)) - width)).toBeLessThanOrEqual(1);
});

test("the button collapses and expands through the model", async ({ page }) => {
    const sidebar = atPath(page, "/g0/p0");
    await page.getByRole("button", { name: "Collapse the sidebar" }).click();
    await expect(sidebar).toHaveAttribute("data-collapsed", "");
    await page.getByRole("button", { name: "Expand the sidebar" }).click();
    await expect(sidebar).not.toHaveAttribute("data-collapsed");
    await expect(
        page.getByRole("button", { name: "Collapse the sidebar" }),
    ).toBeVisible();
});
