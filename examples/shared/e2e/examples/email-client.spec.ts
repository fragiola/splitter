import { expect, test } from "@playwright/test";
import { atPath, openExample } from "../helpers";
import { dragBy, extentOf, near, valueNow } from "./helpers";

// An email client: the folders collapse to an icon rail by a drag and come back from the toolbar,
// the folders and the message list keep their pixels when the window resizes, the layout comes
// back after a reload, and a message clicked in the list shows in the reader.

const REM = 16;

test.beforeEach(async ({ page }) => {
    await openExample(page, "email-client");
    // the default layout is in rem and px: it is laid out once the group is measured, and a
    // drag must start from where the separators end up
    await expect
        .poll(async () => Math.round(await extentOf(atPath(page, "/g0/p1"))))
        .toBe(320);
});

test("a drag past the threshold collapses the folders to the rail, the toolbar button expands them", async ({
    page,
}) => {
    const folders = atPath(page, "/g0/p0");
    const separator = page.getByRole("separator", { name: "Resize folders" });
    const toggle = page.getByRole("button", { name: "Folders", exact: true });
    await expect(folders).toHaveAttribute("data-collapsible", "");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");

    await dragBy(page, separator, -300, 0);
    await expect(folders).toHaveAttribute("data-collapsed", "");
    await expect.poll(() => extentOf(folders)).toBeLessThan(4 * REM);
    near(await extentOf(folders), 3.25 * REM);
    // the labels left with the room for them; the buttons keep their names
    await expect(page.getByText("Starred", { exact: true })).toBeHidden();
    await expect(
        page.getByRole("button", { name: "Starred", exact: true }),
    ).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");

    await toggle.click();
    await expect(folders).not.toHaveAttribute("data-collapsed");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Starred", { exact: true })).toBeVisible();
    expect(await extentOf(folders)).toBeGreaterThanOrEqual(10 * REM - 1);
});

test("the folders and the message list keep their pixels when the window narrows", async ({
    page,
}) => {
    const folders = atPath(page, "/g0/p0");
    const list = atPath(page, "/g0/p1");
    const reader = atPath(page, "/g0/p2");
    // a width of the user's, not the default one
    await dragBy(
        page,
        page.getByRole("separator", { name: "Resize message list" }),
        60,
        0,
    );
    await expect.poll(() => extentOf(list)).toBeGreaterThan(320 + 30);
    const before = {
        folders: await extentOf(folders),
        list: await extentOf(list),
        reader: await extentOf(reader),
    };

    const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
    await page.setViewportSize({
        width: viewport.width - 240,
        height: viewport.height,
    });
    await expect
        .poll(async () => before.reader - (await extentOf(reader)))
        .toBeGreaterThan(200);
    near(await extentOf(list), before.list);
    near(await extentOf(folders), before.folders);
});

test("a reload brings the layout back, the collapsed rail included", async ({
    page,
}) => {
    const folders = atPath(page, "/g0/p0");
    const list = page.getByRole("separator", { name: "Resize message list" });
    await dragBy(page, list, 80, 0);
    await page.getByRole("button", { name: "Folders", exact: true }).click();
    await expect(folders).toHaveAttribute("data-collapsed", "");
    const size = await valueNow(list);

    await page.reload();
    await expect(atPath(page, "/g0")).toBeVisible();
    await expect(folders).toHaveAttribute("data-collapsed", "");
    await expect(list).toHaveAttribute("aria-valuenow", String(size));
    // and the rail expands back to the width the folders had
    await page.getByRole("button", { name: "Folders", exact: true }).click();
    await expect(folders).not.toHaveAttribute("data-collapsed");
    expect(await extentOf(folders)).toBeGreaterThanOrEqual(10 * REM - 1);
});

test("a message clicked in the list shows in the reader", async ({ page }) => {
    const reader = page.getByRole("article", { name: "Reader" });
    await expect(reader.getByRole("heading")).toHaveText(
        "Release notes for 0.4",
    );

    const lunch = page.getByRole("button", { name: /Lunch on Thursday/ });
    await lunch.click();
    await expect(lunch).toHaveAttribute("aria-current", "true");
    await expect(reader.getByRole("heading")).toHaveText("Lunch on Thursday?");
    await expect(reader).toContainText("around 12:30");

    // another folder lists its own messages and opens the first
    await page.getByRole("button", { name: "Sent", exact: true }).click();
    await expect(reader.getByRole("heading")).toHaveText("Keyboard shortcuts");
    await expect(
        page.getByRole("region", { name: "Messages" }).getByRole("listitem"),
    ).toHaveCount(1);
});
