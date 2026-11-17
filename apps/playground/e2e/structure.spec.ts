import { expect, test } from "@playwright/test";
import { at, layoutOf, openFixture, rounded } from "./helpers";

// The parts' contract on the unstyled fixture: paths, state attributes, structural style only,
// and a panel rendered conditionally that lands where the markup puts it.

test("every part has its path, its part name and its state", async ({
    page,
}) => {
    await openFixture(page, "ltr");
    const group = at(page, "/g0");
    await expect(group).toHaveAttribute("data-splitter-part", "group");
    await expect(group).toHaveAttribute("data-orientation", "horizontal");
    await expect(at(page, "/g0/p0")).toHaveAttribute(
        "data-splitter-part",
        "panel",
    );
    await expect(at(page, "/g0/p0")).toHaveAttribute("data-collapsible", "");
    await expect(at(page, "/g0/s0")).toHaveAttribute(
        "data-splitter-part",
        "separator",
    );
    // a boolean data-* is present or absent, never "false"
    await expect(at(page, "/g0/p1")).not.toHaveAttribute("data-collapsible");
    // the only inline style is structural
    const style = await at(page, "/g0/p0").getAttribute("style");
    expect(style).toMatch(/flex: 30 1 0/);
    expect(style).not.toMatch(/color|background|cursor|border/);
});

test("a panel rendered later lands where the markup puts it", async ({
    page,
}) => {
    await openFixture(page, "ltr");
    await page.getByTestId("toggle-x").click();
    await expect(at(page, "/g0/p1")).toHaveAttribute("id", "x");
    await expect(at(page, "/g0/p2")).toHaveAttribute("id", "b");
    await expect(at(page, "/g0/s0")).toHaveAccessibleName("Resize a");
    await expect(at(page, "/g0/s1")).toHaveAccessibleName("Resize x");
    const layout = await layoutOf(page);
    expect(Object.keys(layout).sort()).toEqual(["a", "b", "c", "x"]);
    expect(
        Object.values(layout).reduce((sum, size) => sum + size, 0),
    ).toBeCloseTo(100, 5);

    await page.getByTestId("toggle-x").click();
    await expect(at(page, "/g0/p1")).toHaveAttribute("id", "b");
    expect(Object.keys(rounded(await layoutOf(page))).sort()).toEqual([
        "a",
        "b",
        "c",
    ]);
});

test("the model's JSON document names what the user changed", async ({
    page,
}) => {
    await openFixture(page, "ltr");
    await at(page, "/g0/s0").focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByTestId("json")).toContainText('"version":1');
    await expect(page.getByTestId("json")).toContainText('"id":"fixture"');
});
