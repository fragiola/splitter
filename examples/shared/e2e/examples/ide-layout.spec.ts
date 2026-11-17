import { expect, test } from "@playwright/test";
import { atPath, openExample } from "../helpers";

// The workbench: three groups in one model, three collapsible panels toggled from the toolbar.

test("the toolbar collapses and expands the explorer, the outline and the terminal", async ({
    page,
}) => {
    await openExample(page, "ide-layout");
    await expect(atPath(page, "/g0/p1/g0/p0/g0")).toBeVisible();
    const toolbar = page.getByRole("toolbar", { name: "Panels" });
    for (const [name, path] of [
        ["Explorer", "/g0/p0"],
        ["Outline", "/g0/p1/g0/p0/g0/p1"],
        ["Terminal", "/g0/p1/g0/p1"],
    ] as const) {
        const button = toolbar.getByRole("button", { name });
        await expect(button).toHaveAttribute("aria-pressed", "true");
        await button.click();
        await expect(atPath(page, path)).toHaveAttribute("data-collapsed", "");
        await expect(button).toHaveAttribute("aria-pressed", "false");
        await button.click();
        await expect(atPath(page, path)).not.toHaveAttribute("data-collapsed");
    }
});
