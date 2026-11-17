import { expect, type Page, test } from "@playwright/test";
import { atPath, openExample } from "../helpers";
import { boxOf, dragBy, near, valueNow } from "./helpers";

// A markdown editor: the Editor / Split / Preview buttons collapse a pane or restore the split
// through the model and show the mode the model is in; the switch stacks the panes and keeps
// their sizes; the preview follows the text and shows HTML as text.

test.beforeEach(async ({ page }) => {
    await openExample(page, "markdown-editor");
});

const mode = (page: Page, name: string) =>
    page
        .getByRole("group", { name: "Mode" })
        .getByRole("button", { name, exact: true });

test("each mode button collapses the pane it hides, and the pressed one follows the model", async ({
    page,
}) => {
    const editor = atPath(page, "/g0/p0");
    const preview = atPath(page, "/g0/p1");
    const separator = page.getByRole("separator", { name: "Resize editor" });
    await expect(mode(page, "Split")).toHaveAttribute("aria-pressed", "true");
    await dragBy(page, separator, -80, 0);
    await expect.poll(() => valueNow(separator)).not.toBe(50);
    const split = await valueNow(separator);

    await mode(page, "Editor").click();
    await expect(preview).toHaveAttribute("data-collapsed", "");
    await expect(editor).not.toHaveAttribute("data-collapsed");
    await expect(mode(page, "Editor")).toHaveAttribute("aria-pressed", "true");
    await expect(mode(page, "Split")).toHaveAttribute("aria-pressed", "false");

    await mode(page, "Preview").click();
    await expect(editor).toHaveAttribute("data-collapsed", "");
    await expect(preview).not.toHaveAttribute("data-collapsed");
    await expect(mode(page, "Preview")).toHaveAttribute("aria-pressed", "true");

    // Split expands the hidden pane back to the size it had
    await mode(page, "Split").click();
    await expect(editor).not.toHaveAttribute("data-collapsed");
    await expect(preview).not.toHaveAttribute("data-collapsed");
    await expect(separator).toHaveAttribute("aria-valuenow", String(split));
    await expect(mode(page, "Split")).toHaveAttribute("aria-pressed", "true");

    // a drag that collapses a pane presses its mode too
    await dragBy(page, separator, 700, 0);
    await expect(preview).toHaveAttribute("data-collapsed", "");
    await expect(mode(page, "Editor")).toHaveAttribute("aria-pressed", "true");
});

test("the switch stacks the panes and keeps their sizes", async ({ page }) => {
    const group = atPath(page, "/g0");
    const editor = atPath(page, "/g0/p0");
    const preview = atPath(page, "/g0/p1");
    const separator = page.getByRole("separator", { name: "Resize editor" });
    const stacked = page.getByRole("switch", { name: "Stacked" });
    await dragBy(page, separator, -100, 0);
    await expect.poll(() => valueNow(separator)).not.toBe(50);
    const size = await valueNow(separator);
    await expect(group).toHaveAttribute("data-orientation", "horizontal");

    await stacked.click();
    await expect(group).toHaveAttribute("data-orientation", "vertical");
    await expect(separator).toHaveAttribute("aria-orientation", "horizontal");
    await expect(separator).toHaveAttribute("aria-valuenow", String(size));
    // one above the other, as wide as each other, and the separator drags up and down
    await expect
        .poll(async () => {
            const [top, bottom] = [await boxOf(editor), await boxOf(preview)];
            return bottom.y >= top.y + top.height - 1;
        })
        .toBe(true);
    near((await boxOf(editor)).width, (await boxOf(preview)).width);
    await dragBy(page, separator, 0, 60);
    await expect.poll(() => valueNow(separator)).toBeGreaterThan(size);
    const moved = await valueNow(separator);

    await stacked.click();
    await expect(group).toHaveAttribute("data-orientation", "horizontal");
    await expect(separator).toHaveAttribute("aria-valuenow", String(moved));
});

test("the preview follows the text", async ({ page }) => {
    const source = page.getByRole("textbox", { name: "Markdown" });
    const preview = page.getByTestId("preview");
    await expect(
        preview.getByRole("heading", { name: "Release checklist" }),
    ).toBeVisible();

    await source.fill("# Hello\n\nSome *words* and `code`.\n\n- one\n- two");
    await expect(
        preview.getByRole("heading", { level: 1, name: "Hello" }),
    ).toBeVisible();
    await expect(preview.locator("em")).toHaveText("words");
    await expect(preview.locator("code")).toHaveText("code");
    await expect(preview.getByRole("listitem")).toHaveCount(2);

    await source.press("End");
    await source.pressSequentially("\n\n## More");
    await expect(
        preview.getByRole("heading", { level: 2, name: "More" }),
    ).toBeVisible();
});

test("HTML in the text is shown as text, never as markup", async ({ page }) => {
    const source = page.getByRole("textbox", { name: "Markdown" });
    const preview = page.getByTestId("preview");
    const html = '<img src="x" onerror="window.pwned = 1"> <b>bold</b>';
    await source.fill(html);
    await expect(preview).toHaveText(html);
    await expect(preview.locator("img, b")).toHaveCount(0);
    expect(await page.evaluate(() => "pwned" in window), "no handler ran").toBe(
        false,
    );
});
