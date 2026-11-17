import { expect, type Locator, type Page } from "@playwright/test";

// The fixture's geometry (src/fixture/splitter-fixture.tsx): a group whose panels share 600px on
// its axis, so 1% is 6px.

export const PIXELS_PER_PERCENT = 6;

export const DIRS = ["ltr", "rtl"] as const;
export type Dir = (typeof DIRS)[number];

/** The fixture's page for a direction, with its query. */
export function fixture(dir: Dir, query = ""): string {
    return `/fixtures/${dir === "rtl" ? "rtl" : "basic"}/${query ? `?${query}` : ""}`;
}

/** Opens the fixture and waits for its group to register. */
export async function openFixture(page: Page, dir: Dir, query = "") {
    await page.goto(fixture(dir, query));
    await expect(at(page, "/g0/s1")).toHaveAttribute("aria-valuenow", /\d/);
}

/** The part at a path (`data-splitter-path`). */
export function at(page: Page, path: string): Locator {
    return page.locator(`[data-splitter-path="${path}"]`);
}

/** The committed layout, as the fixture shows it. */
export async function layoutOf(page: Page): Promise<Record<string, number>> {
    return JSON.parse((await page.getByTestId("layout").textContent()) ?? "{}");
}

/** How many commits the fixture was told of (`onLayoutCommit`). */
export async function commits(page: Page): Promise<number> {
    return Number(await page.getByTestId("commits").textContent());
}

/** The center of an element on screen. */
export async function center(locator: Locator) {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    return {
        x: (box?.x ?? 0) + (box?.width ?? 0) / 2,
        y: (box?.y ?? 0) + (box?.height ?? 0) / 2,
    };
}

/**
 * Presses a separator with the mouse and moves it by `percent` of the group toward the inline end
 * (the block end in a vertical group), then releases unless told not to.
 */
export async function drag(
    page: Page,
    separator: Locator,
    dir: Dir,
    percent: number,
    options: { release?: boolean; vertical?: boolean } = {},
) {
    const from = await center(separator);
    const pixels = percent * PIXELS_PER_PERCENT;
    const sign = dir === "rtl" && !options.vertical ? -1 : 1;
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(
        options.vertical ? from.x : from.x + sign * pixels,
        options.vertical ? from.y + pixels : from.y,
        { steps: 8 },
    );
    if (options.release !== false) await page.mouse.up();
}

/** Every size of a layout, rounded to a tenth: pixels round. */
export function rounded(layout: Record<string, number>) {
    return Object.fromEntries(
        Object.entries(layout).map(([id, size]) => [
            id,
            Math.round(size * 10) / 10,
        ]),
    );
}
