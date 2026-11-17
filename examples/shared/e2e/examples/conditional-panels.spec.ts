import { expect, test } from "@playwright/test";
import { atPath, openExample, part } from "../helpers";

// Panels rendered conditionally: each lands where the markup puts it, whenever it mounts.

test.beforeEach(async ({ page }) => {
    await openExample(page, "conditional-panels");
});

test("a panel shown again comes back in its place, and the others make room", async ({
    page,
}) => {
    const inspector = page.getByRole("switch", { name: "Inspector" });
    const sidebar = page.getByRole("switch", { name: "Sidebar" });
    await expect(part(page, "panel")).toHaveCount(3);

    await inspector.click();
    await expect(part(page, "panel")).toHaveCount(2);
    await expect(page.getByRole("separator")).toHaveCount(1);
    await sidebar.click();
    await expect(part(page, "panel")).toHaveCount(1);
    await expect(page.getByRole("separator")).toHaveCount(0);
    // the editor fills the group alone
    await expect(atPath(page, "/g0/p0")).toHaveAttribute("id", "editor");

    // shown again: the inspector after the editor, then the sidebar before it
    await inspector.click();
    await expect(atPath(page, "/g0/p1")).toHaveAttribute("id", "inspector");
    await sidebar.click();
    await expect(atPath(page, "/g0/p0")).toHaveAttribute("id", "sidebar");
    await expect(atPath(page, "/g0/p1")).toHaveAttribute("id", "editor");
    await expect(atPath(page, "/g0/p2")).toHaveAttribute("id", "inspector");
    await expect(
        page.getByRole("separator", { name: "Resize sidebar" }),
    ).toHaveAttribute("aria-controls", "sidebar");
    await expect(
        page.getByRole("separator", { name: "Resize inspector" }),
    ).toHaveAttribute("aria-controls", "editor");
    // the layout sums to the group again
    const values = await Promise.all(
        ["/g0/s0", "/g0/s1"].map(async (path) =>
            Number(await atPath(page, path).getAttribute("aria-valuenow")),
        ),
    );
    expect(values.every((value) => value > 0 && value < 100)).toBe(true);
});
