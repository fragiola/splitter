import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { dragBy } from "./helpers";

// Code outside the group drives it through the external ref; the readout follows every change.

test("buttons outside the group resize, collapse and reset its panels", async ({
    page,
}) => {
    await openExample(page, "controlled-from-code");
    const sidebar = page.getByRole("separator", { name: "Resize sidebar" });
    const editor = page.getByRole("separator", { name: "Resize editor" });
    const readout = page.getByTestId("layout");
    await expect(readout).toHaveText(
        "sidebar 25% · editor 50% · inspector 25%",
    );

    await page.getByRole("button", { name: "Sidebar at 40%" }).click();
    await expect(sidebar).toHaveAttribute("aria-valuenow", "40");
    await expect(readout).toContainText("sidebar 40%");

    await page.getByRole("button", { name: "Toggle the inspector" }).click();
    await expect(readout).toContainText("inspector 0%");
    await page.getByRole("button", { name: "Toggle the inspector" }).click();
    await expect(readout).toContainText("inspector 25%");

    // a drag shows in the readout too
    await dragBy(page, editor, -60, 0);
    await expect(readout).not.toContainText("inspector 25%");

    await page.getByRole("button", { name: "Reset" }).click();
    await expect(readout).toHaveText(
        "sidebar 25% · editor 50% · inspector 25%",
    );
});
