import { expect, test } from "@playwright/test";
import { atPath, openExample } from "../helpers";
import { dragBy, extentOf } from "./helpers";

// Constraints in rem, percent and pixels: a drag stops at each limit, whatever its unit.

test.beforeEach(async ({ page }) => {
    await openExample(page, "size-constraints");
});

const REM = 16;

test("the files panel stays between 10rem and 20rem", async ({ page }) => {
    const separator = page.getByRole("separator", { name: "Resize files" });
    const files = atPath(page, "/g0/p0");
    await dragBy(page, separator, -600, 0);
    expect(Math.abs((await extentOf(files)) - 10 * REM)).toBeLessThanOrEqual(1);
    await dragBy(page, separator, 900, 0);
    expect(Math.abs((await extentOf(files)) - 20 * REM)).toBeLessThanOrEqual(1);
    await expect(page.getByTestId("files-size")).toContainText("320 px");
});

test("the preview stays between 120px and 360px", async ({ page }) => {
    const separator = page.getByRole("separator", { name: "Resize editor" });
    const preview = atPath(page, "/g0/p2");
    await dragBy(page, separator, 900, 0);
    expect(Math.abs((await extentOf(preview)) - 120)).toBeLessThanOrEqual(1);
    await dragBy(page, separator, -900, 0);
    expect(Math.abs((await extentOf(preview)) - 360)).toBeLessThanOrEqual(1);
});

test("the editor keeps at least 30%", async ({ page }) => {
    const panels = await Promise.all(
        [0, 1, 2].map((i) => extentOf(atPath(page, `/g0/p${i}`))),
    );
    const total = panels.reduce((a, b) => a + b, 0);
    await dragBy(
        page,
        page.getByRole("separator", { name: "Resize files" }),
        900,
        0,
    );
    await dragBy(
        page,
        page.getByRole("separator", { name: "Resize editor" }),
        -900,
        0,
    );
    expect(await extentOf(atPath(page, "/g0/p1"))).toBeGreaterThanOrEqual(
        total * 0.3 - 1,
    );
});
