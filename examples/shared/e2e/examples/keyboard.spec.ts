import { expect, test } from "@playwright/test";
import { atPath, openExample } from "../helpers";
import { valueNow } from "./helpers";

// The WAI-ARIA Window Splitter pattern: focusable separators with their values, the arrows,
// Home and End, Enter, and F6.

test.beforeEach(async ({ page }) => {
    await openExample(page, "keyboard");
});

test("each separator is focusable and says its values and the panel it controls", async ({
    page,
}) => {
    const separator = page.getByRole("separator", { name: "Resize outline" });
    await expect(separator).toHaveAttribute("tabindex", "0");
    await expect(separator).toHaveAttribute("aria-orientation", "vertical");
    await expect(separator).toHaveAttribute("aria-valuenow", "30");
    await expect(separator).toHaveAttribute("aria-valuemax", "50");
    await expect(separator).toHaveAttribute("aria-controls", "outline");
    await expect(atPath(page, "/g0/p0")).toHaveAttribute("id", "outline");
});

test("Tab reaches the separators in order", async ({ page }) => {
    await page.getByRole("separator", { name: "Resize outline" }).focus();
    await page.keyboard.press("Tab");
    await expect(
        page.getByRole("separator", { name: "Resize document" }),
    ).toBeFocused();
});

test("the arrows resize by 5%, Home and End go to the limits", async ({
    page,
}) => {
    const separator = page.getByRole("separator", { name: "Resize outline" });
    await separator.focus();
    await page.keyboard.press("ArrowRight");
    await expect(separator).toHaveAttribute("aria-valuenow", "35");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(separator).toHaveAttribute("aria-valuenow", "25");
    await page.keyboard.press("End");
    await expect(separator).toHaveAttribute("aria-valuenow", "50");
    // Up and Down belong to vertical groups
    await page.keyboard.press("ArrowDown");
    await expect(separator).toHaveAttribute("aria-valuenow", "50");
    await page.keyboard.press("Home");
    expect(await valueNow(separator)).toBe(
        Number(await separator.getAttribute("aria-valuemin")),
    );
});

test("Enter collapses the panel before the separator and expands it back", async ({
    page,
}) => {
    const separator = page.getByRole("separator", { name: "Resize outline" });
    const outline = atPath(page, "/g0/p0");
    await separator.focus();
    await page.keyboard.press("Enter");
    await expect(outline).toHaveAttribute("data-collapsed", "");
    await expect(separator).toHaveAttribute("aria-valuenow", "0");
    await page.keyboard.press("Enter");
    await expect(outline).not.toHaveAttribute("data-collapsed");
    await expect(separator).toHaveAttribute("aria-valuenow", "30");
});

test("F6 moves to the next separator, Shift+F6 back", async ({ page }) => {
    const outline = page.getByRole("separator", { name: "Resize outline" });
    const document = page.getByRole("separator", { name: "Resize document" });
    await outline.focus();
    await page.keyboard.press("F6");
    await expect(document).toBeFocused();
    await page.keyboard.press("Shift+F6");
    await expect(outline).toBeFocused();
});
