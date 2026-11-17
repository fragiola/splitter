import { expect, test } from "@playwright/test";
import { at, DIRS, drag, layoutOf, openFixture, rounded } from "./helpers";

// Collapsing by drag: past half the minimum the panel snaps to its collapsed size, and back.

for (const dir of DIRS) {
    test(`${dir}: a drag past the threshold collapses a, a drag back expands it`, async ({
        page,
    }) => {
        await openFixture(page, dir);
        const a = at(page, "/g0/p0");
        // 30% - 15% = 15%: under a's 20% minimum, but above the threshold, halfway between
        // its collapsed size and its minimum (12.5%): a stays at its minimum
        await drag(page, at(page, "/g0/s0"), dir, -15);
        expect(rounded(await layoutOf(page)).a).toBe(20);
        await expect(a).not.toHaveAttribute("data-collapsed");
        // past the threshold (20% - 10% = 10%): a collapses to 5%
        await drag(page, at(page, "/g0/s0"), dir, -10);
        expect(rounded(await layoutOf(page)).a).toBe(5);
        await expect(a).toHaveAttribute("data-collapsed", "");
        // and back past the threshold: a opens at its minimum or more
        await drag(page, at(page, "/g0/s0"), dir, 20);
        await expect(a).not.toHaveAttribute("data-collapsed");
        expect((await layoutOf(page)).a).toBeGreaterThanOrEqual(20);
    });
}
