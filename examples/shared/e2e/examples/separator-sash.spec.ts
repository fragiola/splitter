import { expect, type Locator, test } from "@playwright/test";
import { openExample } from "../helpers";
import { boxOf, middle, valueNow } from "./helpers";

// The sash: a 1px line at rest that grows to 4px after a short hover delay and while dragging,
// read on computed styles (`::after` is the sash, `::before` the hit area). The delay is read
// from the style, and the thickness is polled: no fixed wait.

test.beforeEach(async ({ page }) => {
    await openExample(page, "separator-sash");
});

const sash = (separator: Locator) =>
    separator.evaluate((el) => {
        const style = getComputedStyle(el, "::after");
        return {
            width: Number.parseFloat(style.width),
            delay: style.transitionDelay,
        };
    });

const hitArea = (separator: Locator) =>
    separator.evaluate((el) =>
        Number.parseFloat(getComputedStyle(el, "::before").width),
    );

test("a 1px line at rest, 4px after a hover delay, back to 1px when the pointer leaves", async ({
    page,
}) => {
    const separator = page.getByRole("separator", { name: "Resize explorer" });
    expect((await boxOf(separator)).width).toBe(1);
    expect((await sash(separator)).width).toBe(1);
    const area = await hitArea(separator);
    expect(area).toBeGreaterThanOrEqual(9);

    const at = await middle(separator);
    await page.mouse.move(at.x, at.y);
    // hovered: the thickening waits for its delay, then lands at 4px
    await expect.poll(async () => (await sash(separator)).delay).toBe("0.3s");
    await expect.poll(async () => (await sash(separator)).width).toBe(4);
    expect(await hitArea(separator)).toBe(area);

    await page.mouse.move(at.x + 200, at.y);
    await expect.poll(async () => (await sash(separator)).width).toBe(1);
});

test("4px while dragging, over the same hit area, and the drag resizes", async ({
    page,
}) => {
    const separator = page.getByRole("separator", { name: "Resize editor" });
    expect((await boxOf(separator)).height).toBe(1);
    const area = await separator.evaluate((el) =>
        Number.parseFloat(getComputedStyle(el, "::before").height),
    );
    const thickness = () =>
        separator.evaluate((el) =>
            Number.parseFloat(getComputedStyle(el, "::after").height),
        );
    expect(await thickness()).toBe(1);

    const before = await valueNow(separator);
    const at = await middle(separator);
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.move(at.x, at.y - 40, { steps: 8 });
    await expect(separator).toHaveAttribute("data-dragging", "");
    await expect.poll(thickness).toBe(4);
    expect(
        await separator.evaluate((el) =>
            Number.parseFloat(getComputedStyle(el, "::before").height),
        ),
    ).toBe(area);
    await page.mouse.up();
    await expect.poll(() => valueNow(separator)).toBeLessThan(before);
});

test("4px on keyboard focus, at once", async ({ page }) => {
    const separator = page.getByRole("separator", { name: "Resize explorer" });
    await separator.focus();
    await page.keyboard.press("ArrowRight");
    await expect.poll(async () => (await sash(separator)).width).toBe(4);
});
