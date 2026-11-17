import { expect, type Locator, test } from "@playwright/test";
import { openExample } from "../helpers";
import { dragBy, middle, valueNow } from "./helpers";

// The gutter between cards: the separator and its line are transparent at rest, so only the
// canvas shows; the line is drawn on hover and on focus (computed styles).

const TRANSPARENT = "rgba(0, 0, 0, 0)";

test.beforeEach(async ({ page }) => {
    await openExample(page, "separator-gutter");
});

const colours = (separator: Locator) =>
    separator.evaluate((el) => ({
        box: getComputedStyle(el).backgroundColor,
        line: getComputedStyle(el, "::before").backgroundColor,
    }));

test("transparent at rest, a line on hover", async ({ page }) => {
    const separator = page.getByRole("separator", { name: "Resize tasks" });
    expect(await colours(separator)).toEqual({
        box: TRANSPARENT,
        line: TRANSPARENT,
    });
    const at = await middle(separator);
    await page.mouse.move(at.x, at.y);
    await expect
        .poll(async () => (await colours(separator)).line)
        .not.toBe(TRANSPARENT);
    expect((await colours(separator)).box).toBe(TRANSPARENT);
});

test("a line on keyboard focus", async ({ page }) => {
    const separator = page.getByRole("separator", { name: "Resize summary" });
    expect((await colours(separator)).line).toBe(TRANSPARENT);
    await separator.focus();
    await page.keyboard.press("ArrowDown");
    await expect
        .poll(async () => (await colours(separator)).line)
        .not.toBe(TRANSPARENT);
});

test("the gutter drags", async ({ page }) => {
    const separator = page.getByRole("separator", { name: "Resize tasks" });
    const before = await valueNow(separator);
    await dragBy(page, separator, 60, 0);
    await expect.poll(() => valueNow(separator)).toBeGreaterThan(before);
});
