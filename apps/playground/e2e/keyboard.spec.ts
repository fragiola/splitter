import { expect, test } from "@playwright/test";
import { at, DIRS, layoutOf, openFixture, rounded } from "./helpers";

// The Window Splitter keys on the unstyled fixture, mirrored in right to left.

for (const dir of DIRS) {
    test.describe(dir, () => {
        test("the arrow toward the end grows the panel before the separator", async ({
            page,
        }) => {
            await openFixture(page, dir);
            const separator = at(page, "/g0/s0");
            await separator.focus();
            const [grow, shrink] =
                dir === "rtl"
                    ? ["ArrowLeft", "ArrowRight"]
                    : ["ArrowRight", "ArrowLeft"];
            await page.keyboard.press(grow);
            await expect(separator).toHaveAttribute("aria-valuenow", "35");
            await page.keyboard.press(shrink);
            await page.keyboard.press(shrink);
            await expect(separator).toHaveAttribute("aria-valuenow", "25");
            expect(rounded(await layoutOf(page))).toEqual({
                a: 25,
                b: 55,
                c: 20,
            });
        });
    });
}

test("the ARIA values follow the constraints of both sides", async ({
    page,
}) => {
    await openFixture(page, "ltr");
    const separator = at(page, "/g0/s1");
    await expect(separator).toHaveAttribute("role", "separator");
    await expect(separator).toHaveAttribute("aria-orientation", "vertical");
    await expect(separator).toHaveAttribute("aria-controls", "b");
    // b shrinks until c reaches its 40% maximum, and grows until c is gone (c has no minimum)
    await expect(separator).toHaveAttribute("aria-valuemin", "30");
    await expect(separator).toHaveAttribute("aria-valuemax", "70");
});

test("Home, End and Enter; Up and Down in a vertical group", async ({
    page,
}) => {
    await openFixture(page, "ltr", "orientation=vertical");
    const separator = at(page, "/g0/s0");
    await expect(separator).toHaveAttribute("aria-orientation", "horizontal");
    await separator.focus();
    await page.keyboard.press("ArrowDown");
    await expect(separator).toHaveAttribute("aria-valuenow", "35");
    await page.keyboard.press("ArrowUp");
    await expect(separator).toHaveAttribute("aria-valuenow", "30");
    // End: b down to its minimum, then c (no minimum) gone
    await page.keyboard.press("End");
    await expect(separator).toHaveAttribute("aria-valuenow", "90");
    await page.keyboard.press("Home");
    await expect(separator).toHaveAttribute("aria-valuenow", "5");
    await expect(at(page, "/g0/p0")).toHaveAttribute("data-collapsed", "");
    await page.keyboard.press("Enter");
    await expect(at(page, "/g0/p0")).not.toHaveAttribute("data-collapsed");
    await page.keyboard.press("Enter");
    await expect(separator).toHaveAttribute("aria-valuenow", "5");
});
