import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { dragBy, valueNow } from "./helpers";

// Undo and redo from `_kit/undo.ts`: a whole drag is one step, so is a key press.

test.beforeEach(async ({ page }) => {
    await openExample(page, "undo-redo");
});

test("undoes and redoes a drag and a key press, with the buttons and the shortcuts", async ({
    page,
}) => {
    const undo = page.getByRole("button", { name: "Undo" });
    const redo = page.getByRole("button", { name: "Redo" });
    const separator = page.getByRole("separator", { name: "Resize outline" });
    const history = page.getByRole("list", { name: "History" });
    await expect(undo).toBeDisabled();

    await dragBy(page, separator, 100, 0);
    const dragged = await valueNow(separator);
    expect(dragged).toBeGreaterThan(25);
    await expect(history.getByRole("listitem")).toHaveCount(1);

    await separator.focus();
    await page.keyboard.press("ArrowRight");
    await expect(history.getByRole("listitem")).toHaveCount(2);

    await undo.click();
    expect(await valueNow(separator)).toBeCloseTo(dragged, 5);
    await undo.click();
    await expect(separator).toHaveAttribute("aria-valuenow", "25");
    await expect(undo).toBeDisabled();

    await redo.click();
    expect(await valueNow(separator)).toBeCloseTo(dragged, 5);

    await page.locator("body").click({ position: { x: 2, y: 2 } });
    await page.keyboard.press("ControlOrMeta+z");
    await expect(separator).toHaveAttribute("aria-valuenow", "25");
    await page.keyboard.press("ControlOrMeta+Shift+z");
    expect(await valueNow(separator)).toBeCloseTo(dragged, 5);
});

test("a collapse is a step too", async ({ page }) => {
    const separator = page.getByRole("separator", { name: "Resize outline" });
    await separator.focus();
    await page.keyboard.press("Enter");
    await expect(separator).toHaveAttribute("aria-valuenow", "0");
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(separator).toHaveAttribute("aria-valuenow", "25");
});
