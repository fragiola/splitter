import { expect, test } from "@playwright/test";
import { atPath, openExample } from "../helpers";
import { dragBy, extentOf, near, valueNow } from "./helpers";

// A database console: the schema beside a SQL editor stacked above its results (a group nested in
// the root one, one model). The results collapse from the toolbar and with Enter on their
// separator; Run expands them and shows the rows; Reset layout puts both groups back.

const REM = 16;
const EDITOR = "/g0/p1/g0/p0";
const RESULTS = "/g0/p1/g0/p1";

test.beforeEach(async ({ page }) => {
    await openExample(page, "database-console");
    await expect(atPath(page, "/g0/p1/g0")).toBeVisible();
    // the schema's default width is in rem: it is laid out once the group is measured, and a drag
    // must start from where the separators end up
    await expect
        .poll(async () => Math.round(await extentOf(atPath(page, "/g0/p0"))))
        .toBe(16 * REM);
});

test("the separator between the editor and the results resizes them", async ({
    page,
}) => {
    const editor = atPath(page, EDITOR);
    const results = atPath(page, RESULTS);
    const separator = page.getByRole("separator", { name: "Resize results" });
    await expect(separator).toHaveAttribute("aria-orientation", "horizontal");
    const before = {
        editor: await extentOf(editor, "height"),
        results: await extentOf(results, "height"),
    };

    await dragBy(page, separator, 0, 80);
    await expect
        .poll(() => extentOf(editor, "height"))
        .toBeGreaterThan(before.editor + 60);
    near(
        before.editor + before.results,
        (await extentOf(editor, "height")) +
            (await extentOf(results, "height")),
    );

    // the editor keeps its minimum in pixels
    await dragBy(page, separator, 0, -600);
    await expect.poll(() => extentOf(editor, "height")).toBeLessThan(130);
    near(await extentOf(editor, "height"), 120);
});

test("the toolbar button and Enter on the separator collapse and expand the results", async ({
    page,
}) => {
    const results = atPath(page, RESULTS);
    const toggle = page.getByRole("button", { name: "Results", exact: true });
    const separator = page.getByRole("separator", { name: "Resize results" });
    await expect(results).toHaveAttribute("data-collapsible", "");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    const height = await extentOf(results, "height");

    await toggle.click();
    await expect(results).toHaveAttribute("data-collapsed", "");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    // collapsed to its title bar
    await expect.poll(() => extentOf(results, "height")).toBeLessThan(3 * REM);
    near(await extentOf(results, "height"), 2 * REM);
    await toggle.click();
    await expect(results).not.toHaveAttribute("data-collapsed");
    await expect
        .poll(() => extentOf(results, "height"))
        .toBeGreaterThan(height - 1.5);

    await separator.focus();
    await page.keyboard.press("Enter");
    await expect(results).toHaveAttribute("data-collapsed", "");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await page.keyboard.press("Enter");
    await expect(results).not.toHaveAttribute("data-collapsed");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    near(await extentOf(results, "height"), height);
});

test("Run expands collapsed results and shows the rows", async ({ page }) => {
    const results = atPath(page, RESULTS);
    const region = page.getByRole("region", { name: "Results" });
    await expect(region.getByRole("table")).toHaveCount(0);
    await expect(region).toContainText("Run the query");

    await page.getByRole("button", { name: "Results", exact: true }).click();
    await expect(results).toHaveAttribute("data-collapsed", "");

    await page.getByRole("button", { name: "Run" }).click();
    await expect(results).not.toHaveAttribute("data-collapsed");
    const table = region.getByRole("table");
    await expect(table).toBeVisible();
    await expect(table.getByRole("columnheader")).toHaveText([
        "country",
        "orders",
        "revenue",
        "avg_order",
    ]);
    await expect(table.locator("tbody").getByRole("row")).toHaveCount(8);
    await expect(region).toContainText("8 rows");
});

test("Reset layout restores the default layout of both groups", async ({
    page,
}) => {
    const schema = page.getByRole("separator", { name: "Resize schema" });
    const results = page.getByRole("separator", { name: "Resize results" });
    const defaults = {
        schema: await valueNow(schema),
        results: await valueNow(results),
    };

    await dragBy(page, schema, 120, 0);
    await dragBy(page, results, 0, -60);
    await page.getByRole("button", { name: "Results", exact: true }).click();
    await expect(atPath(page, RESULTS)).toHaveAttribute("data-collapsed", "");
    await expect.poll(() => valueNow(schema)).not.toBe(defaults.schema);

    await page.getByRole("button", { name: "Reset layout" }).click();
    await expect(atPath(page, RESULTS)).not.toHaveAttribute("data-collapsed");
    await expect(schema).toHaveAttribute(
        "aria-valuenow",
        String(defaults.schema),
    );
    await expect(results).toHaveAttribute(
        "aria-valuenow",
        String(defaults.results),
    );
    near(await extentOf(atPath(page, "/g0/p0")), 16 * REM);
});
