import { expect, test } from "@playwright/test";
import { atPath, openExample } from "../helpers";
import { dragBy, extentOf, middle, near, valueNow } from "./helpers";

// Dragging: a pointer drag moves the separator under it, the panels on each side follow, and a
// double click puts the panel before it back to its default size.

test.beforeEach(async ({ page }) => {
    await openExample(page, "basic-horizontal");
});

test("starts at the declared default sizes", async ({ page }) => {
    const group = await extentOf(atPath(page, "/g0"));
    const separators = page.getByRole("separator");
    await expect(separators).toHaveCount(2);
    expect(await valueNow(atPath(page, "/g0/s0"))).toBe(25);
    expect(await valueNow(atPath(page, "/g0/s1"))).toBe(50);
    // the panels share what the separators leave
    const panels = await Promise.all(
        [0, 1, 2].map((i) => extentOf(atPath(page, `/g0/p${i}`))),
    );
    const total = panels.reduce((a, b) => a + b, 0);
    near(panels[0] ?? 0, total * 0.25);
    near(panels[1] ?? 0, total * 0.5);
    expect(total).toBeLessThan(group);
});

test("a drag moves the separator under the pointer and resizes its two panels", async ({
    page,
}) => {
    const separator = page.getByRole("separator", {
        name: "Resize navigation",
    });
    const navigation = atPath(page, "/g0/p0");
    const content = atPath(page, "/g0/p1");
    const details = atPath(page, "/g0/p2");
    const before = {
        navigation: await extentOf(navigation),
        content: await extentOf(content),
        details: await extentOf(details),
        at: (await middle(separator)).x,
    };

    await dragBy(page, separator, 100, 0, { release: false });
    // while it drags, the separator and its group say so
    await expect(separator).toHaveAttribute("data-dragging", "");
    await expect(atPath(page, "/g0")).toHaveAttribute("data-dragging", "");
    await page.mouse.up();
    await expect(separator).not.toHaveAttribute("data-dragging");

    near(await extentOf(navigation), before.navigation + 100, 2);
    near(await extentOf(content), before.content - 100, 2);
    near(await extentOf(details), before.details, 1);
    near((await middle(separator)).x, before.at + 100, 2);
    expect(await valueNow(separator)).toBeGreaterThan(25);
});

test("a double click resets the panel before the separator", async ({
    page,
}) => {
    const separator = page.getByRole("separator", {
        name: "Resize navigation",
    });
    await dragBy(page, separator, 120, 0);
    expect(await valueNow(separator)).toBeGreaterThan(30);
    await separator.dblclick();
    await expect(separator).toHaveAttribute("aria-valuenow", "25");
});

test("the drag survives leaving the group: the pointer is captured", async ({
    page,
}) => {
    const separator = page.getByRole("separator", { name: "Resize content" });
    const from = await middle(separator);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    // far past the group's end and below it
    await page.mouse.move(from.x + 2000, from.y + 400, { steps: 10 });
    await page.mouse.up();
    // the content took everything the details could give
    await expect(atPath(page, "/g0/s1")).toHaveAttribute(
        "aria-valuenow",
        String(await atPath(page, "/g0/s1").getAttribute("aria-valuemax")),
    );
});
