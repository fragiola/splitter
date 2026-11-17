import { expect, test } from "@playwright/test";
import { atPath, openExample } from "../helpers";
import { dragBy, valueNow } from "./helpers";

// Persistence: every commit saves the model's JSON document in localStorage, and a reload restores
// it before the first paint, both groups and the collapsed terminal.

test("a reload restores the layout, nested group and collapsed panel included", async ({
    page,
}) => {
    await openExample(page, "persistent-layout");
    const sidebar = page.getByRole("separator", { name: "Resize sidebar" });
    const editor = page.getByRole("separator", { name: "Resize editor" });
    await dragBy(page, sidebar, 120, 0);
    const width = await valueNow(sidebar);
    expect(width).toBeGreaterThan(25);
    // End gives the editor all it can take: the collapsible terminal collapses
    await editor.focus();
    await page.keyboard.press("End");
    await expect(atPath(page, "/g0/p1/g0/p1")).toHaveAttribute(
        "data-collapsed",
        "",
    );
    const editorSize = await valueNow(editor);

    await page.reload();
    await expect(atPath(page, "/g0")).toBeVisible();
    await expect(sidebar).toHaveAttribute("aria-valuenow", String(width));
    await expect(atPath(page, "/g0/p1/g0/p1")).toHaveAttribute(
        "data-collapsed",
        "",
    );
    await expect(editor).toHaveAttribute("aria-valuenow", String(editorSize));
});

test("Reset puts the defaults back, and they are what a reload shows", async ({
    page,
}) => {
    await openExample(page, "persistent-layout");
    const sidebar = page.getByRole("separator", { name: "Resize sidebar" });
    await dragBy(page, sidebar, 120, 0);
    await page.getByRole("button", { name: "Reset the layout" }).click();
    await expect(sidebar).toHaveAttribute("aria-valuenow", "25");
    await page.reload();
    await expect(sidebar).toHaveAttribute("aria-valuenow", "25");
});

test("an unreadable saved layout falls back to the defaults", async ({
    page,
}) => {
    await openExample(page, "persistent-layout");
    await page.evaluate(() => {
        for (const key of Object.keys(localStorage)) {
            localStorage.setItem(key, '{"version": 99}');
        }
    });
    await page.reload();
    await expect(
        page.getByRole("separator", { name: "Resize sidebar" }),
    ).toHaveAttribute("aria-valuenow", "25");
});
