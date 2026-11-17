import { expect, test } from "@playwright/test";
import { atPath, openExample } from "../helpers";
import { boxOf, middle, rendered, valueNow } from "./helpers";

// The collapse button inside a separator: it collapses and expands the panel before it, and a
// press, a key or a double click on it never reaches the separator (no drag, no keyboard move,
// no reset).

test.beforeEach(async ({ page }) => {
    await openExample(page, "separator-collapse-button");
});

test("the button collapses and expands the panel before the separator", async ({
    page,
}) => {
    const outline = atPath(page, "/g0/p0");
    const separator = page.getByRole("separator", { name: "Resize outline" });
    await page.getByRole("button", { name: "Collapse the outline" }).click();
    await expect(outline).toHaveAttribute("data-collapsed", "");
    await expect.poll(() => valueNow(separator)).toBe(0);
    const expand = page.getByRole("button", { name: "Expand the outline" });
    await expect(expand).toHaveAttribute("aria-expanded", "false");
    await expand.click();
    await expect(outline).not.toHaveAttribute("data-collapsed");
    await expect(
        page.getByRole("button", { name: "Collapse the outline" }),
    ).toHaveAttribute("aria-expanded", "true");
});

test("a double click on the button never resets the layout", async ({
    page,
}) => {
    const outline = atPath(page, "/g0/p0");
    const separator = page.getByRole("separator", { name: "Resize outline" });
    // pressed near its top: the button sits in its middle
    const box = await boxOf(separator);
    await page.mouse.move(box.x + box.width / 2, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 80, box.y + 20, {
        steps: 10,
    });
    await page.mouse.up();
    await expect.poll(() => valueNow(separator)).toBeGreaterThan(33);
    const moved = await valueNow(separator);

    // a real double click's second press lands beside the button, which moved with the
    // separator: the event itself is what must not reach the separator
    await page
        .getByRole("button", { name: "Collapse the outline" })
        .dispatchEvent("dblclick", { bubbles: true });
    await rendered(page);
    await expect(outline).not.toHaveAttribute("data-collapsed");
    expect(await valueNow(separator)).toBe(moved);

    // the separator's own double click still resets it
    await separator.dispatchEvent("dblclick", { bubbles: true });
    await expect.poll(() => valueNow(separator)).toBe(30);
});

test("pressing the button and moving never drags the separator", async ({
    page,
}) => {
    const separator = page.getByRole("separator", { name: "Resize outline" });
    const before = await valueNow(separator);
    const at = await middle(
        page.getByRole("button", { name: "Collapse the outline" }),
    );
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.move(at.x + 80, at.y, { steps: 8 });
    await rendered(page);
    await expect(separator).not.toHaveAttribute("data-dragging");
    expect(await valueNow(separator)).toBe(before);
    await page.mouse.up();
    await rendered(page);
    expect(await valueNow(separator)).toBe(before);
    await expect(atPath(page, "/g0/p0")).not.toHaveAttribute("data-collapsed");
});

test("Enter on the button toggles once; the separator's own keys still work", async ({
    page,
}) => {
    const outline = atPath(page, "/g0/p0");
    const separator = page.getByRole("separator", { name: "Resize outline" });
    const before = await valueNow(separator);
    await page.getByRole("button", { name: "Collapse the outline" }).focus();
    await page.keyboard.press("ArrowRight");
    await rendered(page);
    expect(await valueNow(separator)).toBe(before);
    await page.keyboard.press("Enter");
    await expect(outline).toHaveAttribute("data-collapsed", "");
    await page.keyboard.press("Enter");
    await expect(outline).not.toHaveAttribute("data-collapsed");

    await separator.focus();
    await page.keyboard.press("Enter");
    await expect(outline).toHaveAttribute("data-collapsed", "");
});
