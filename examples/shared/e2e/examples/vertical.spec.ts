import { expect, test } from "@playwright/test";
import { atPath, openExample } from "../helpers";
import { dragBy, extentOf, near, rendered, valueNow } from "./helpers";

// A vertical group: its separator is horizontal, drags along the block axis and answers Up and
// Down.

test.beforeEach(async ({ page }) => {
    await openExample(page, "vertical");
});

test("stacks its panels, with a horizontal separator between them", async ({
    page,
}) => {
    await expect(atPath(page, "/g0")).toHaveAttribute(
        "data-orientation",
        "vertical",
    );
    const separator = page.getByRole("separator", { name: "Resize editor" });
    await expect(separator).toHaveAttribute("aria-orientation", "horizontal");
    const editor = await atPath(page, "/g0/p0").boundingBox();
    const terminal = await atPath(page, "/g0/p1").boundingBox();
    expect((terminal?.y ?? 0) > (editor?.y ?? 0)).toBe(true);
});

test("drags up and down, and moves with Up and Down", async ({ page }) => {
    const separator = page.getByRole("separator", { name: "Resize editor" });
    const editor = atPath(page, "/g0/p0");
    const before = await extentOf(editor, "height");
    await dragBy(page, separator, 0, -60);
    near(await extentOf(editor, "height"), before - 60, 2);

    const value = await valueNow(separator);
    await separator.focus();
    await page.keyboard.press("ArrowDown");
    // polled: a framework may render after the key (Angular, zoneless)
    await expect.poll(() => valueNow(separator)).toBeCloseTo(value + 5, 5);
    // the inline arrows do nothing on a vertical group
    await page.keyboard.press("ArrowRight");
    await rendered(page);
    expect(await valueNow(separator)).toBeCloseTo(value + 5, 5);
});
