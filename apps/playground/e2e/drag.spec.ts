import { expect, test } from "@playwright/test";
import {
    at,
    commits,
    DIRS,
    drag,
    layoutOf,
    openFixture,
    rounded,
} from "./helpers";

// Pointer drags on the unstyled fixture, left to right and right to left: transient steps while
// the pointer moves, one commit on release, the origin back when middleware vetoes it.

for (const dir of DIRS) {
    test.describe(dir, () => {
        test("a drag resizes the panels on each side of the separator, then commits once", async ({
            page,
        }) => {
            await openFixture(page, dir);
            expect(rounded(await layoutOf(page))).toEqual({
                a: 30,
                b: 50,
                c: 20,
            });
            const before = await commits(page);
            await drag(page, at(page, "/g0/s0"), dir, 10, { release: false });
            await expect(at(page, "/g0/s0")).toHaveAttribute(
                "data-dragging",
                "",
            );
            expect(rounded(await layoutOf(page))).toEqual({
                a: 40,
                b: 40,
                c: 20,
            });
            // the steps are transient: nothing is committed while the pointer moves
            expect(await commits(page)).toBe(before);
            await page.mouse.up();
            await expect.poll(() => commits(page)).toBe(before + 1);
            await expect(at(page, "/g0/s0")).not.toHaveAttribute(
                "data-dragging",
            );
            await expect(at(page, "/g0/s0")).toHaveAttribute(
                "aria-valuenow",
                "40",
            );
        });

        test("a drag stops at the limits of the panels on both sides", async ({
            page,
        }) => {
            await openFixture(page, dir);
            // c's maximum is 40%: b gives it 20% more, no further
            await drag(page, at(page, "/g0/s1"), dir, -40);
            expect(rounded(await layoutOf(page))).toEqual({
                a: 30,
                b: 30,
                c: 40,
            });
            // a grows by 40%: b gives what its 10% minimum allows, then c, the next one, the rest
            await drag(page, at(page, "/g0/s0"), dir, 40);
            expect(rounded(await layoutOf(page))).toEqual({
                a: 70,
                b: 10,
                c: 20,
            });
        });

        test("a vetoed release puts the layout back where the drag started", async ({
            page,
        }) => {
            await openFixture(page, dir, "veto=1");
            const before = await commits(page);
            await drag(page, at(page, "/g0/s0"), dir, 10, { release: false });
            expect(rounded(await layoutOf(page)).a).toBe(40);
            await page.mouse.up();
            await expect
                .poll(async () => rounded(await layoutOf(page)))
                .toEqual({ a: 30, b: 50, c: 20 });
            expect(await commits(page)).toBe(before);
        });

        test("a vertical group drags along the block axis", async ({
            page,
        }) => {
            await openFixture(page, dir, "orientation=vertical");
            await drag(page, at(page, "/g0/s0"), dir, 10, { vertical: true });
            expect(rounded(await layoutOf(page)).a).toBe(40);
        });
    });
}

test("a click without movement commits nothing", async ({ page }) => {
    await openFixture(page, "ltr");
    const before = await commits(page);
    await at(page, "/g0/s0").click();
    await page.waitForTimeout(100);
    expect(await commits(page)).toBe(before);
});

test("a dir switched at runtime mirrors the drag at once", async ({ page }) => {
    await openFixture(page, "ltr");
    await page.evaluate(() => {
        document.documentElement.dir = "rtl";
    });
    // dragged toward the inline end of a right-to-left page: to the left
    await drag(page, at(page, "/g0/s0"), "rtl", 10);
    await expect
        .poll(async () => rounded(await layoutOf(page)))
        .toEqual({ a: 40, b: 40, c: 20 });
});
