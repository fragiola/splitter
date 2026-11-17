import { expect, test } from "@playwright/test";
import { atPath, openExample, part } from "../helpers";
import { dragBy, extentOf, near } from "./helpers";

// A team chat: the thread panel is rendered while a thread is open and lands between the
// conversation and the members, where the markup puts it; opened again, it has the size the user
// gave it (the group's layout memory). The members collapse from the header; the channels keep
// their rem constraints.

const REM = 16;

test.beforeEach(async ({ page }) => {
    await openExample(page, "chat-thread");
    // the default layout is in rem: it is laid out once the group is measured, and a drag must
    // start from where the separators end up
    await expect
        .poll(async () => Math.round(await extentOf(atPath(page, "/g0/p0"))))
        .toBe(14 * REM);
});

test("opening a thread adds its panel between the conversation and the members, closing removes it", async ({
    page,
}) => {
    await expect(part(page, "panel")).toHaveCount(3);
    await expect(atPath(page, "/g0/p1")).toHaveAttribute("id", "conversation");
    await expect(atPath(page, "/g0/p2")).toHaveAttribute("id", "members");

    const replies = page.getByRole("button", { name: "3 replies" });
    await replies.click();
    await expect(part(page, "panel")).toHaveCount(4);
    await expect(atPath(page, "/g0/p0")).toHaveAttribute("id", "channels");
    await expect(atPath(page, "/g0/p1")).toHaveAttribute("id", "conversation");
    await expect(atPath(page, "/g0/p2")).toHaveAttribute("id", "thread");
    await expect(atPath(page, "/g0/p3")).toHaveAttribute("id", "members");
    await expect(replies).toHaveAttribute("aria-expanded", "true");
    const thread = page.getByRole("region", { name: "Thread" });
    await expect(thread).toContainText("Good catch: a 2px offset");
    await expect(
        page.getByRole("separator", { name: "Resize thread" }),
    ).toHaveAttribute("aria-controls", "conversation");
    await expect(
        page.getByRole("separator", { name: "Resize members" }),
    ).toHaveAttribute("aria-controls", "thread");

    await page.getByRole("button", { name: "Close thread" }).click();
    await expect(part(page, "panel")).toHaveCount(3);
    await expect(thread).toBeHidden();
    await expect(atPath(page, "/g0/p2")).toHaveAttribute("id", "members");
    await expect(page.getByRole("separator")).toHaveCount(2);
});

test("a thread opened again has the size the user gave it", async ({
    page,
}) => {
    await page.getByRole("button", { name: "3 replies" }).click();
    const thread = atPath(page, "/g0/p2");
    await expect(thread).toHaveAttribute("id", "thread");
    const opened = await extentOf(thread);

    // wider by a drag of the separator before it
    await dragBy(
        page,
        page.getByRole("separator", { name: "Resize thread" }),
        -90,
        0,
    );
    await expect.poll(() => extentOf(thread)).toBeGreaterThan(opened + 60);
    const resized = await extentOf(thread);

    await page.getByRole("button", { name: "Close thread" }).click();
    await expect(part(page, "panel")).toHaveCount(3);

    // another message's thread uses the same panel, at the same size
    await page.getByRole("button", { name: "4 replies" }).click();
    await expect(atPath(page, "/g0/p2")).toHaveAttribute("id", "thread");
    await expect(page.getByRole("region", { name: "Thread" })).toContainText(
        "Icon set v2",
    );
    await expect
        .poll(async () => Math.abs((await extentOf(thread)) - resized))
        .toBeLessThanOrEqual(1.5);
    near(await extentOf(thread), resized);
});

test("the header's toggle collapses and expands the member list", async ({
    page,
}) => {
    const members = atPath(page, "/g0/p2");
    const toggle = page.getByRole("button", { name: "Members", exact: true });
    await expect(members).toHaveAttribute("data-collapsible", "");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    const width = await extentOf(members);

    await toggle.click();
    await expect(members).toHaveAttribute("data-collapsed", "");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect.poll(() => extentOf(members)).toBeLessThan(1);

    await toggle.click();
    await expect(members).not.toHaveAttribute("data-collapsed");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => extentOf(members)).toBeGreaterThan(width - 1.5);
    near(await extentOf(members), width);
});

test("the channel list stays between its rem constraints", async ({ page }) => {
    const channels = atPath(page, "/g0/p0");
    const separator = page.getByRole("separator", { name: "Resize channels" });

    await dragBy(page, separator, -200, 0);
    await expect.poll(() => extentOf(channels)).toBeLessThan(14 * REM - 20);
    near(await extentOf(channels), 10 * REM);

    await dragBy(page, separator, 300, 0);
    await expect.poll(() => extentOf(channels)).toBeGreaterThan(14 * REM);
    near(await extentOf(channels), 20 * REM);
});

test("a message sent shows in the conversation, a reply in the thread", async ({
    page,
}) => {
    const conversation = page.getByRole("region", { name: "Conversation" });
    await page.getByRole("textbox", { name: "Message #design" }).fill("Hello");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(conversation.getByRole("listitem").last()).toContainText(
        "Hello",
    );

    await page.getByRole("button", { name: "3 replies" }).click();
    await page.getByRole("textbox", { name: "Reply" }).fill("On it");
    await page.getByRole("button", { name: "Send reply" }).click();
    await expect(
        page
            .getByRole("region", { name: "Thread" })
            .getByRole("listitem")
            .last(),
    ).toContainText("On it");
    await expect(page.getByRole("button", { name: "4 replies" })).toHaveCount(
        2,
    );
});
