import { expect, test } from "@playwright/test";
import { atPath, openExample } from "../helpers";
import { extentOf } from "./helpers";

// preserve-pixel-size: when the group narrows, the sidebar keeps its pixels and the editor takes
// up the change.

test("the sidebar keeps its width when the group narrows", async ({ page }) => {
    await openExample(page, "fixed-size-panels");
    const sidebar = atPath(page, "/g0/p0");
    const editor = atPath(page, "/g0/p1");
    const before = {
        sidebar: await extentOf(sidebar),
        editor: await extentOf(editor),
    };
    expect(Math.abs(before.sidebar - 220)).toBeLessThanOrEqual(1);

    await page.getByRole("button", { name: "Narrow the group" }).click();
    await expect
        .poll(async () => before.editor - (await extentOf(editor)))
        .toBeGreaterThan(100);
    expect(
        Math.abs((await extentOf(sidebar)) - before.sidebar),
    ).toBeLessThanOrEqual(1.5);
});
