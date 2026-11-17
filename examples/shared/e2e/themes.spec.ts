// From Grid Layout (fragiola/grid-layout, examples/shared/e2e/themes.spec.ts), same author and licence.
import { expect, type Page, test } from "@playwright/test";
import { boxOf, valueNow } from "./examples/helpers";
import { atPath, openExample, THEMES } from "./helpers";

// The example themes (examples/shared/src/themes) are every app's, so their checks run here, on
// computed styles (verify by compiling, not by reading class names). A theme changes the shape of
// the examples' separators, not only their colours: the box the engine measures
// (--sp-separator-size), the line in the middle of a wider grab area (--sp-separator-line,
// --sp-separator-grab, `::before`), the box's fill (--sp-separator-bg) and a grip (--sp-grip,
// `::after`).

test("the themes paint different floors, whatever the page theme", async ({
    page,
}) => {
    const seen = new Set<string>();
    for (const theme of THEMES) {
        await page.goto(`./?theme=${theme.name}`);
        await expect(page.locator("body")).toHaveAttribute(
            "data-example-theme",
            theme.name,
        );
        seen.add(
            await page
                .getByTestId("stage")
                .evaluate((el) => getComputedStyle(el).backgroundColor),
        );
    }
    expect(seen.size).toBe(THEMES.length);
});

test("a theme declares the splitter tokens the examples read", async ({
    page,
}) => {
    for (const theme of THEMES) {
        await page.goto(`./?theme=${theme.name}`);
        const tokens = await page.getByTestId("stage").evaluate((el) => {
            const style = getComputedStyle(el);
            return [
                "--sp-font",
                "--sp-separator-size",
                "--sp-separator-grab",
                "--sp-grip",
                "--sp-separator-bg",
                "--sp-separator-color",
                "--sp-focus-line",
            ].map((name) => style.getPropertyValue(name).trim());
        });
        for (const value of tokens) expect(value, theme.name).not.toBe("");
    }
});

/** How the theme draws a separator side by side panels: what the eye and the pointer meet. */
async function separatorShape(page: Page, path: string) {
    return atPath(page, path).evaluate((el) => {
        const box = getComputedStyle(el);
        const grab = getComputedStyle(el, "::before");
        const grip = getComputedStyle(el, "::after");
        const px = (value: string) => Number.parseFloat(value) || 0;
        const token = (name: string) => box.getPropertyValue(name).trim();
        return {
            box: el.getBoundingClientRect().width,
            background: box.backgroundColor,
            grab: px(grab.width),
            line: px(grab.width) - px(grab.paddingLeft) - px(grab.paddingRight),
            grip: grip.display,
            tokens: {
                box: px(token("--sp-separator-size")),
                grab: px(token("--sp-separator-grab")),
                line: px(token("--sp-separator-line")),
                grip: token("--sp-grip"),
            },
        };
    });
}

test("a theme changes the shape of an example's separators, not only their colours", async ({
    page,
}) => {
    const shapes = new Map<
        string,
        Awaited<ReturnType<typeof separatorShape>>
    >();
    for (const theme of THEMES) {
        await openExample(page, "basic-horizontal", { theme: theme.name });
        const shape = await separatorShape(page, "/g0/s0");
        // the example reads the theme's tokens
        expect(shape.box, theme.name).toBeCloseTo(shape.tokens.box, 0);
        expect(shape.grab, theme.name).toBeCloseTo(shape.tokens.grab, 0);
        expect(shape.line, theme.name).toBeCloseTo(shape.tokens.line, 0);
        expect(shape.grip, theme.name).toBe(shape.tokens.grip);
        // the pointer meets at least the box
        expect(shape.grab, theme.name).toBeGreaterThanOrEqual(shape.box);
        shapes.set(theme.name, shape);
    }
    const ide = shapes.get("ide");
    const paper = shapes.get("paper");
    const terminal = shapes.get("terminal");
    const light = shapes.get("light");
    // a hairline, grabbed wider than it is drawn
    expect(ide?.box).toBeLessThanOrEqual(1);
    expect(ide?.grab).toBeGreaterThan(ide?.box ?? 0);
    expect(ide?.grip).toBe("none");
    // a wide gutter with a grip
    expect(paper?.box).toBeGreaterThan(light?.box ?? 0);
    expect(paper?.grip).toBe("block");
    expect(paper?.background).toBe("rgba(0, 0, 0, 0)");
    // a blocky bar: the line fills its box
    expect(terminal?.line).toBeGreaterThan(1);
    expect(terminal?.line).toBeCloseTo(terminal?.box ?? 0, 0);
    expect(terminal?.grip).toBe("none");
    // no two of these themes draw it alike
    const drawn = ["light", "ide", "paper", "terminal"].map((name) => {
        const { tokens: _, ...shape } = shapes.get(name) ?? {};
        return JSON.stringify(shape);
    });
    expect(new Set(drawn).size).toBe(drawn.length);
});

test("a hairline separator takes the pointer beside its line", async ({
    page,
}) => {
    await openExample(page, "basic-horizontal", { theme: "ide" });
    const separator = atPath(page, "/g0/s0");
    const before = await valueNow(separator);
    const box = await boxOf(separator);
    // inside the grab area, outside the drawn box
    const x = box.x + box.width + 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 60, y, { steps: 10 });
    await page.mouse.up();
    await expect.poll(() => valueNow(separator)).toBeGreaterThan(before);
});
