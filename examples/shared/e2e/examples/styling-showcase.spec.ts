import { expect, test } from "@playwright/test";
import { atPath, openExample } from "../helpers";
import { middle } from "./helpers";

// Styling from state attributes: the cursor from the separator's orientation, the colours from
// hover and `data-dragging` (checked on computed styles: a class that compiled to nothing fails).

test.beforeEach(async ({ page }) => {
    await openExample(page, "styling-showcase");
});

const cursor = (page: import("@playwright/test").Page, path: string) =>
    atPath(page, path).evaluate((el) => getComputedStyle(el).cursor);

const line = (page: import("@playwright/test").Page, path: string) =>
    atPath(page, path).evaluate(
        (el) => getComputedStyle(el, "::before").backgroundColor,
    );

test("the cursor follows the separator's orientation", async ({ page }) => {
    expect(await cursor(page, "/g0/s0")).toBe("col-resize");
    expect(await cursor(page, "/g0/p1/g0/s0")).toBe("row-resize");
});

test("the line lights on hover and while dragging", async ({ page }) => {
    const rest = await line(page, "/g0/s0");
    const at = await middle(atPath(page, "/g0/s0"));
    await page.mouse.move(at.x, at.y);
    await expect.poll(() => line(page, "/g0/s0")).not.toBe(rest);
    const hover = await line(page, "/g0/s0");
    await page.mouse.down();
    await page.mouse.move(at.x + 20, at.y, { steps: 4 });
    await expect(atPath(page, "/g0/s0")).toHaveAttribute("data-dragging", "");
    await expect.poll(() => line(page, "/g0/s0")).not.toBe(hover);
    await page.mouse.up();
});
