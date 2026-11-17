// From Grid Layout (fragiola/grid-layout, apps/playground/e2e/shell.spec.ts), same author and licence.
import { expect, test } from "@playwright/test";

// The shell around the examples of examples/react and the scenarios: sidebar, theme, stage,
// source panel. The examples' own behaviour is covered by the shared suite (examples/shared/e2e);
// the splitter's by the fixtures' specs.

test("renders the sidebar and switches the example theme, restoring it from the URL", async ({
    page,
}) => {
    await page.goto("/");
    await expect(
        page
            .getByRole("navigation", { name: "Playground" })
            .getByRole("heading", { name: "Splitter playground" }),
    ).toBeVisible();
    const body = page.locator("body");
    await expect(body).toHaveAttribute("data-example-theme", "light");

    await page.getByRole("button", { name: "Dark" }).click();
    await expect(body).toHaveAttribute("data-example-theme", "dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page).toHaveURL(/theme=dark/);

    await page.reload();
    await expect(body).toHaveAttribute("data-example-theme", "dark");
    await expect(page.getByRole("button", { name: "Dark" })).toHaveAttribute(
        "aria-pressed",
        "true",
    );
});

test("shows an example on the stage, and its files in the source panel", async ({
    page,
}) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Playground" });
    await nav.getByRole("link", { name: "Basic horizontal" }).click();
    await expect(page).toHaveURL(/\?example=basic-horizontal$/);
    const stage = page.getByTestId("stage");
    await expect(stage.locator('[data-splitter-path="/g0/s1"]')).toBeVisible();

    await page.getByRole("button", { name: "Source" }).click();
    await expect(page.getByTestId("source-path")).toHaveText(
        "examples/react/src/examples/basic-horizontal/index.tsx",
    );
    await expect(
        page.getByRole("complementary", { name: "Source" }).locator("code"),
    ).toContainText("<Splitter.Group");
});

test("the shell keeps its own palette whatever the example theme", async ({
    page,
}) => {
    const shellIn = async (theme: string) => {
        await page.goto(`/?theme=${theme}`);
        await expect(page.locator("body")).toHaveAttribute(
            "data-example-theme",
            theme,
        );
        return page
            .locator("body")
            .evaluate((el) => getComputedStyle(el).backgroundColor);
    };
    // the light shell is not the light example theme's floor
    const stageIn = async () =>
        page
            .goto("/?example=basic-horizontal")
            .then(() =>
                page
                    .getByTestId("stage")
                    .evaluate((el) => getComputedStyle(el).backgroundColor),
            );
    expect(await shellIn("light")).not.toBe(await stageIn());
});

test("says so for an unknown example", async ({ page }) => {
    await page.goto("/?example=nope");
    await expect(page.getByText("No example with id “nope”.")).toBeVisible();
});

test("every page of the playground is kept out of search engines", async ({
    page,
}) => {
    for (const path of ["/", "/fixtures/basic/", "/fixtures/rtl/"]) {
        await page.goto(path);
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
            "content",
            "noindex",
        );
    }
});
