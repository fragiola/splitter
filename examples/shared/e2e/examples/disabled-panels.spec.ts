import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { dragBy, valueNow } from "./helpers";

// A disabled panel, a disabled separator and a disabled group: none of them moves.

test.beforeEach(async ({ page }) => {
    await openExample(page, "disabled-panels");
});

test("a disabled panel is not moved by the separator beside it", async ({
    page,
}) => {
    const separator = page.getByRole("separator", { name: "Resize toolbox" });
    const value = await valueNow(separator);
    await dragBy(page, separator, 80, 0);
    expect(await valueNow(separator)).toBe(value);
});

test("a disabled separator says so, leaves the tab order and ignores the pointer", async ({
    page,
}) => {
    const separator = page.getByRole("separator", { name: "Resize layers" });
    await expect(separator).toHaveAttribute("data-disabled", "");
    await expect(separator).toHaveAttribute("aria-disabled", "true");
    await expect(separator).not.toHaveAttribute("tabindex");
    const value = await valueNow(separator);
    await dragBy(page, separator, -80, 0);
    expect(await valueNow(separator)).toBe(value);
});

test("locking the group disables every separator", async ({ page }) => {
    const canvas = page.getByRole("separator", { name: "Resize canvas" });
    const value = await valueNow(canvas);
    await dragBy(page, canvas, 60, 0);
    expect(await valueNow(canvas)).toBeGreaterThan(value);

    await page.getByRole("switch", { name: "Lock the layout" }).click();
    for (const separator of await page.getByRole("separator").all()) {
        await expect(separator).toHaveAttribute("data-disabled", "");
    }
    const locked = await valueNow(canvas);
    await dragBy(page, canvas, -60, 0);
    expect(await valueNow(canvas)).toBe(locked);
});
