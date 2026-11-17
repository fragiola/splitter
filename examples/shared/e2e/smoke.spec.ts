// From Grid Layout (fragiola/grid-layout, examples/shared/e2e/smoke.spec.ts), same author and licence.
import { expect, test } from "@playwright/test";
import { listMetaSlugs } from "../scripts/examples-lib.ts";
import {
    collectErrors,
    EXAMPLES,
    openExample,
    part,
    reset,
    THEMES,
} from "./helpers";

// Every example mounts, registers its groups (every part has a path), and logs no error, in every
// theme (`THEMES`: light, dark, ide, paper, terminal); a new example folder is covered without
// touching this file.

/** Examples that must exist: the smoke run is meaningless without them. */
const REQUIRED: string[] = ["basic-horizontal", "styling-showcase"];

const known = new Set(listMetaSlugs());
const missing = REQUIRED.filter((slug) => !known.has(slug));
if (missing.length > 0) {
    throw new Error(
        `smoke.spec.ts: REQUIRED names examples that do not exist: ${missing.join(", ")}`,
    );
}

test("the index lists every example", async ({ page }) => {
    await page.goto("./");
    await expect(page.getByTestId("stage").getByRole("link")).toHaveCount(
        EXAMPLES.length,
    );
});

for (const example of EXAMPLES) {
    for (const theme of THEMES) {
        test(`${example.slug} renders in ${theme.name}`, async ({ page }) => {
            const errors = collectErrors(page);
            await openExample(page, example.slug, { theme: theme.name });
            // every part registered: a part without a path is one the model does not know
            for (const name of ["group", "panel", "separator"] as const) {
                for (const element of await part(page, name).all()) {
                    await expect(element).toHaveAttribute(
                        "data-splitter-path",
                        /^\/g\d/,
                    );
                }
            }
            // every separator has a name: the package renders none (D10)
            for (const separator of await part(page, "separator").all()) {
                await expect(separator).toHaveAccessibleName(/.+/);
            }
            // the site's Reset reloads the frame: the example must come back
            await reset(page);
            expect(errors).toEqual([]);
        });
    }
}
