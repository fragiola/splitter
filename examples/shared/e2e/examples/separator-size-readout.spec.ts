import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { middle, valueNow } from "./helpers";

// The size readout: a badge on the separator with the size of the panel before it, from the
// model, shown while the separator is focused or dragged and updated by every step.

test.beforeEach(async ({ page }) => {
    await openExample(page, "separator-size-readout");
});

test("hidden at rest, shown on keyboard focus with the panel's size", async ({
    page,
}) => {
    const separator = page.getByRole("separator", { name: "Resize source" });
    const readout = separator.getByTestId("readout");
    await expect(readout).toBeHidden();
    await expect(readout).toHaveText("50%");

    await separator.focus();
    await page.keyboard.press("ArrowRight");
    await expect(readout).toBeVisible();
    await expect.poll(() => valueNow(separator)).toBe(55);
    await expect(readout).toHaveText("55%");
});

test("shown while dragging, following each step", async ({ page }) => {
    const separator = page.getByRole("separator", { name: "Resize source" });
    const readout = separator.getByTestId("readout");
    const at = await middle(separator);
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.move(at.x - 60, at.y, { steps: 6 });
    await expect(separator).toHaveAttribute("data-dragging", "");
    await expect(readout).toBeVisible();
    await expect
        .poll(async () => `${Math.round(await valueNow(separator))}%`)
        .not.toBe("50%");
    await expect(readout).toHaveText(
        `${Math.round(await valueNow(separator))}%`,
    );
    const first = await readout.textContent();

    await page.mouse.move(at.x + 60, at.y, { steps: 6 });
    await expect(readout).not.toHaveText(first ?? "");
    await expect(readout).toHaveText(
        `${Math.round(await valueNow(separator))}%`,
    );
    await page.mouse.up();
    await expect(separator).not.toHaveAttribute("data-dragging");
    await expect(readout).toBeHidden();
});
