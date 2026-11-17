import { expect, type Locator, type Page } from "@playwright/test";

// What the example specs share: boxes on screen, a separator dragged by the mouse, a panel's size
// as the separator before it reports it (`aria-valuenow`), and the inline direction.

/** An element's box on screen. */
export async function boxOf(locator: Locator) {
    const box = await locator.boundingBox();
    expect(box, "on screen").not.toBeNull();
    return box ?? { x: 0, y: 0, width: 0, height: 0 };
}

/** The centre of an element on screen. */
export async function middle(locator: Locator) {
    const box = await boxOf(locator);
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Presses `separator` at its centre, moves by `dx`, `dy` pixels, and releases unless told not to. */
export async function dragBy(
    page: Page,
    separator: Locator,
    dx: number,
    dy: number,
    options: { release?: boolean } = {},
) {
    const from = await middle(separator);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + dx, from.y + dy, { steps: 10 });
    if (options.release !== false) await page.mouse.up();
}

/**
 * Waits for two animation frames: whatever the last event scheduled has rendered (Angular,
 * zoneless, renders after the event), so a value read next that must not have changed is not
 * read before a change could show.
 */
export async function rendered(page: Page) {
    await page.evaluate(
        () =>
            new Promise<void>((resolve) =>
                requestAnimationFrame(() =>
                    requestAnimationFrame(() => resolve()),
                ),
            ),
    );
}

/** A separator's `aria-valuenow`: the size of the panel before it, in percent. */
export async function valueNow(separator: Locator): Promise<number> {
    return Number(await separator.getAttribute("aria-valuenow"));
}

/** An element's width (or height, for a vertical group) on screen, in pixels. */
export async function extentOf(
    locator: Locator,
    axis: "width" | "height" = "width",
): Promise<number> {
    return (await boxOf(locator))[axis];
}

/** Within one pixel: what flex layout rounds to. */
export function near(actual: number, expected: number, tolerance = 1.5) {
    expect(
        Math.abs(actual - expected),
        `${actual} ≈ ${expected}`,
    ).toBeLessThanOrEqual(tolerance);
}
