import { expect, type Page, test } from "@playwright/test";
import { atPath, openExample } from "../helpers";
import { boxOf, dragBy, middle, valueNow } from "./helpers";

// The three-dot grip: three dots on each separator, in a column between side by side panels and
// in a row between stacked ones (from the separator's own `data-orientation`), lit on hover.

test.beforeEach(async ({ page }) => {
    await openExample(page, "separator-three-dots");
});

/** The dots' centres, in document order. */
async function dots(page: Page, path: string) {
    const all = atPath(page, path).getByTestId("dot");
    await expect(all).toHaveCount(3);
    return Promise.all(
        (await all.all()).map(async (dot) => {
            const box = await boxOf(dot);
            return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        }),
    );
}

test("three dots in a column on a vertical separator, in a row on a horizontal one", async ({
    page,
}) => {
    await expect(atPath(page, "/g0/s0")).toHaveAttribute(
        "data-orientation",
        "vertical",
    );
    const column = await dots(page, "/g0/s0");
    for (const dot of column.slice(1)) {
        expect(Math.abs(dot.x - (column[0]?.x ?? 0))).toBeLessThan(1);
    }
    expect(column[1]?.y ?? 0).toBeGreaterThan(column[0]?.y ?? 0);
    expect(column[2]?.y ?? 0).toBeGreaterThan(column[1]?.y ?? 0);

    await expect(atPath(page, "/g0/p1/g0/s0")).toHaveAttribute(
        "data-orientation",
        "horizontal",
    );
    const row = await dots(page, "/g0/p1/g0/s0");
    for (const dot of row.slice(1)) {
        expect(Math.abs(dot.y - (row[0]?.y ?? 0))).toBeLessThan(1);
    }
    expect(row[1]?.x ?? 0).toBeGreaterThan(row[0]?.x ?? 0);
    expect(row[2]?.x ?? 0).toBeGreaterThan(row[1]?.x ?? 0);
});

test("the dots light on hover, and the separator still drags", async ({
    page,
}) => {
    const separator = page.getByRole("separator", { name: "Resize inbox" });
    const dot = separator.getByTestId("dot").first();
    const colour = () =>
        dot.evaluate((el) => getComputedStyle(el).backgroundColor);
    const rest = await colour();
    const at = await middle(separator);
    await page.mouse.move(at.x, at.y);
    await expect.poll(colour).not.toBe(rest);

    const before = await valueNow(separator);
    await dragBy(page, separator, 60, 0);
    await expect.poll(() => valueNow(separator)).toBeGreaterThan(before);
});
