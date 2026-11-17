import { expect, test } from "@playwright/test";
import { atPath, openExample } from "../helpers";
import { dragBy, extentOf, near, valueNow } from "./helpers";

// A group nested in a panel: its path starts with the panel's, and each separator resizes its own
// group only.

test.beforeEach(async ({ page }) => {
    await openExample(page, "nested-groups");
});

test("nests the vertical group in the main panel", async ({ page }) => {
    const inner = atPath(page, "/g0/p1/g0");
    await expect(inner).toHaveAttribute("data-orientation", "vertical");
    await expect(atPath(page, "/g0/p1/g0/s0")).toHaveAccessibleName(
        "Resize editor",
    );
});

test("each separator resizes its own group", async ({ page }) => {
    const outer = page.getByRole("separator", { name: "Resize sidebar" });
    const inner = page.getByRole("separator", { name: "Resize editor" });
    const sidebar = atPath(page, "/g0/p0");
    const editor = atPath(page, "/g0/p1/g0/p0");

    const innerValue = await valueNow(inner);
    const sidebarWidth = await extentOf(sidebar);
    await dragBy(page, outer, 80, 0);
    near(await extentOf(sidebar), sidebarWidth + 80, 2);
    expect(await valueNow(inner)).toBe(innerValue);

    const outerValue = await valueNow(outer);
    const editorHeight = await extentOf(editor, "height");
    await dragBy(page, inner, 0, -50);
    near(await extentOf(editor, "height"), editorHeight - 50, 2);
    expect(await valueNow(outer)).toBe(outerValue);
});
