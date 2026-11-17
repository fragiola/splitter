import { expect, test } from "@playwright/test";

// Scenarios are dev-only entries of the playground; the splitter's behaviour itself is covered by
// the fixture specs.

test("lists the scenarios by area, and opens one from the sidebar", async ({
    page,
}) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Playground" });
    await expect(nav.getByRole("heading", { name: "Scenarios" })).toBeVisible();
    await nav.getByRole("link", { name: "Nested stress" }).click();
    await expect(page).toHaveURL(/\?scenario=layout%2Fnested-stress$/);
    // four levels: a group nested three times
    await expect(
        page.locator('[data-splitter-path="/g0/p1/g0/p1/g0/p1/g0"]'),
    ).toBeVisible();
});

test("the commands scenario logs what the model runs, and its JSON follows", async ({
    page,
}) => {
    await page.goto("/?scenario=api/commands");
    const log = page.getByTestId("command-name");
    await page.getByRole("button", { name: "panel.collapse right" }).click();
    await expect(log.first()).toHaveText("panel.collapse");
    await expect(page.getByTestId("splitter-json")).toContainText(
        '"collapsed": true',
    );
});
