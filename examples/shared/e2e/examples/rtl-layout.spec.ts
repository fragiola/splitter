import { expect, test } from "@playwright/test";
import { atPath, openExample } from "../helpers";
import { boxOf, dragBy, extentOf, near } from "./helpers";

// Right to left: the first panel starts at the right, drags and arrows are mirrored.

test.beforeEach(async ({ page }) => {
    await openExample(page, "rtl-layout");
});

test("lays the first panel out at the right", async ({ page }) => {
    const folders = await boxOf(atPath(page, "/g0/p0"));
    const messages = await boxOf(atPath(page, "/g0/p1"));
    const reading = await boxOf(atPath(page, "/g0/p2"));
    expect(folders.x).toBeGreaterThan(messages.x);
    expect(messages.x).toBeGreaterThan(reading.x);
});

test("a drag toward the left grows the panel before the separator", async ({
    page,
}) => {
    const separator = page.getByRole("separator", { name: "Resize folders" });
    const folders = atPath(page, "/g0/p0");
    const width = await extentOf(folders);
    await dragBy(page, separator, -80, 0);
    near(await extentOf(folders), width + 80, 2);
    await expect(separator).not.toHaveAttribute("aria-valuenow", "25");
});

test("ArrowLeft grows the panel before the separator, ArrowRight shrinks it", async ({
    page,
}) => {
    const separator = page.getByRole("separator", { name: "Resize folders" });
    await separator.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(separator).toHaveAttribute("aria-valuenow", "30");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(separator).toHaveAttribute("aria-valuenow", "20");
});
