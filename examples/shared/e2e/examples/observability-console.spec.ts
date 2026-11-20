import { expect, type Page, test } from "@playwright/test";
import { atPath, openExample } from "../helpers";
import { dragBy, extentOf, near, valueNow } from "./helpers";

// A live observability console in three nested groups of one model: the services rail | the
// charts (latency | errors, a group of their own) over the log tail | the trace inspector. The feed
// ticks twice a second on a timer; the page's clock is Playwright's (`page.clock`), so a test moves
// time on instead of waiting for it, and the feed is paused before a value is read twice.

const REM = 16;
const RAIL = "/g0/p0";
const CENTER = "/g0/p1";
const CHARTS = "/g0/p1/g0/p0";
const LOGS = "/g0/p1/g0/p1";
const INSPECTOR = "/g0/p2";

async function open(page: Page) {
    await page.clock.install();
    await openExample(page, "observability-console");
    await expect(atPath(page, "/g0/p1/g0/p0/g0")).toBeVisible();
    // the rail's default width is in rem: it is laid out once the group is measured, and a drag
    // must start from where the separators end up
    await expect
        .poll(async () => Math.round(await extentOf(atPath(page, RAIL))))
        .toBe(15 * REM);
}

const lines = (page: Page) =>
    page.getByRole("log", { name: "Log tail" }).getByRole("listitem");

const latency = (page: Page) => page.getByTestId("latency-now");

test.beforeEach(async ({ page }) => {
    await open(page);
});

test("the values move while it plays and hold after Pause", async ({
    page,
}) => {
    const clock = page.getByTestId("clock");
    await expect(clock).toContainText("Live");
    const before = await clock.textContent();
    await page.clock.runFor(2000);
    await expect(clock).not.toHaveText(before ?? "");

    await page.getByRole("button", { name: "Pause" }).click();
    await expect(clock).toContainText("Paused");
    const held = {
        clock: await clock.textContent(),
        latency: await latency(page).textContent(),
        errors: await page.getByTestId("errors-now").textContent(),
        lines: await lines(page).count(),
        last: await lines(page).last().textContent(),
    };
    await page.clock.runFor(5000);
    await expect(clock).toHaveText(held.clock ?? "");
    await expect(latency(page)).toHaveText(held.latency ?? "");
    await expect(page.getByTestId("errors-now")).toHaveText(held.errors ?? "");
    await expect(lines(page)).toHaveCount(held.lines);
    await expect(lines(page).last()).toHaveText(held.last ?? "");

    await page.getByRole("button", { name: "Play" }).click();
    await page.clock.runFor(2000);
    await expect(clock).not.toHaveText(held.clock ?? "");
});

test("under reduced motion the feed starts paused", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    const clock = page.getByTestId("clock");
    await expect(clock).toContainText("Paused");
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
    const held = await clock.textContent();
    await page.clock.runFor(3000);
    await expect(clock).toHaveText(held ?? "");
});

test("the charts and logs separator resizes both while the logs stream", async ({
    page,
}) => {
    const charts = atPath(page, CHARTS);
    const logs = atPath(page, LOGS);
    const separator = page.getByRole("separator", {
        name: "Resize charts and logs",
    });
    await expect(separator).toHaveAttribute("aria-orientation", "horizontal");
    const before = {
        charts: await extentOf(charts, "height"),
        logs: await extentOf(logs, "height"),
        last: await lines(page).last().textContent(),
    };

    await dragBy(page, separator, 0, 80);
    await expect
        .poll(() => extentOf(charts, "height"))
        .toBeGreaterThan(before.charts + 60);
    near(
        before.charts + before.logs,
        (await extentOf(charts, "height")) + (await extentOf(logs, "height")),
    );
    // the charts' plots follow their panel
    const plot = page.getByRole("region", { name: "p95 latency" });
    near(await extentOf(plot, "height"), await extentOf(charts, "height"));

    // the logs kept streaming, and the tail still shows the newest line
    await page.clock.runFor(2000);
    await expect(lines(page).last()).not.toHaveText(before.last ?? "");
    await expect(lines(page).last()).toBeInViewport();

    // the latency and errors separator resizes the two charts
    const metrics = page.getByRole("separator", {
        name: "Resize latency and errors",
    });
    const width = await extentOf(plot);
    await dragBy(page, metrics, -60, 0);
    await expect.poll(() => extentOf(plot)).toBeLessThan(width - 40);
});

test("Enter on the charts and logs separator collapses the logs to their title bar", async ({
    page,
}) => {
    const logs = atPath(page, LOGS);
    const separator = page.getByRole("separator", {
        name: "Resize charts and logs",
    });
    await expect(logs).toHaveAttribute("data-collapsible", "");
    const height = await extentOf(logs, "height");
    await separator.focus();
    await page.keyboard.press("Enter");
    await expect(logs).toHaveAttribute("data-collapsed", "");
    await expect.poll(() => extentOf(logs, "height")).toBeLessThan(3 * REM);
    near(await extentOf(logs, "height"), 2 * REM);
    await page.keyboard.press("Enter");
    await expect(logs).not.toHaveAttribute("data-collapsed");
    await expect
        .poll(() => extentOf(logs, "height"))
        .toBeGreaterThan(height - 1.5);
});

test("the inspector collapses into the center and comes back at its size", async ({
    page,
}) => {
    const inspector = atPath(page, INSPECTOR);
    const center = atPath(page, CENTER);
    const toggle = page.getByRole("button", { name: "Inspector" });
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    const before = {
        inspector: await extentOf(inspector),
        center: await extentOf(center),
    };
    expect(before.inspector).toBeGreaterThan(12 * REM);

    await toggle.click();
    await expect(inspector).toHaveAttribute("data-collapsed", "");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect.poll(() => extentOf(inspector)).toBeLessThan(1);
    near(await extentOf(center), before.center + before.inspector);

    await toggle.click();
    await expect(inspector).not.toHaveAttribute("data-collapsed");
    await expect.poll(() => extentOf(inspector)).toBeGreaterThan(12 * REM);
    near(await extentOf(inspector), before.inspector);
    near(await extentOf(center), before.center);
});

test("the rail collapses to its health dots, and a service filters the charts, logs and traces", async ({
    page,
}) => {
    const rail = atPath(page, RAIL);
    const toggle = page.getByRole("button", { name: "Services", exact: true });
    const services = page.getByRole("navigation", { name: "Services" });
    await page.getByRole("button", { name: "Pause" }).click();

    const checkout = services.getByRole("button", { name: "Checkout" });
    await checkout.click();
    await expect(checkout).toHaveAttribute("aria-pressed", "true");
    await expect(
        page.getByRole("region", { name: "p95 latency" }),
    ).toContainText("Checkout");
    await expect(page.getByRole("region", { name: "Logs" })).toContainText(
        "Checkout",
    );
    expect(await lines(page).count()).toBeGreaterThan(0);
    for (const service of await page.getByTestId("log-service").all()) {
        await expect(service).toHaveText("checkout");
    }
    // the rail's figure for the service is the chart's value
    await expect(latency(page)).toHaveText(
        (await checkout.locator("span").nth(2).textContent()) ?? "",
    );

    await toggle.click();
    await expect(rail).toHaveAttribute("data-collapsed", "");
    await expect.poll(() => extentOf(rail)).toBeLessThan(3 * REM);
    near(await extentOf(rail), 2.75 * REM);
    // collapsed, the buttons keep their names
    const all = services.getByRole("button", { name: "All services" });
    await expect(all).toBeVisible();
    await all.click();
    await expect(all).toHaveAttribute("aria-pressed", "true");
    await expect(
        page.getByRole("region", { name: "p95 latency" }),
    ).toContainText("All services");

    await toggle.click();
    await expect(rail).not.toHaveAttribute("data-collapsed");
    await expect.poll(() => extentOf(rail)).toBeGreaterThan(14 * REM);
});

test("the log tail follows the newest line, and holds where the reader scrolled", async ({
    page,
}) => {
    const tail = page.getByRole("log", { name: "Log tail" });
    const distance = () =>
        tail.evaluate(
            (element) =>
                element.scrollHeight - element.scrollTop - element.clientHeight,
        );
    await expect.poll(distance).toBeLessThan(2);
    await expect(page.getByRole("region", { name: "Logs" })).toContainText(
        "Following",
    );

    await tail.hover();
    await page.mouse.wheel(0, -200);
    const jump = page.getByRole("button", { name: "Jump to latest" });
    await expect(jump).toBeVisible();
    const top = await tail.evaluate((element) => element.scrollTop);
    await page.clock.runFor(2000);
    await expect.poll(distance).toBeGreaterThan(100);
    near(await tail.evaluate((element) => element.scrollTop), top, 40);

    await jump.click();
    await expect.poll(distance).toBeLessThan(2);
    await expect(jump).toHaveCount(0);
});

test("the layout survives a reload, and Reset layout restores every group", async ({
    page,
}) => {
    const rail = page.getByRole("separator", { name: "Resize services" });
    const stream = page.getByRole("separator", {
        name: "Resize charts and logs",
    });
    const metrics = page.getByRole("separator", {
        name: "Resize latency and errors",
    });
    const defaults = {
        rail: await valueNow(rail),
        stream: await valueNow(stream),
        metrics: await valueNow(metrics),
    };

    await dragBy(page, rail, 60, 0);
    await dragBy(page, stream, 0, -40);
    await dragBy(page, metrics, 80, 0);
    await page.getByRole("button", { name: "Inspector" }).click();
    await expect(atPath(page, INSPECTOR)).toHaveAttribute("data-collapsed", "");
    await expect.poll(() => valueNow(metrics)).not.toBe(defaults.metrics);
    const moved = {
        rail: await valueNow(rail),
        stream: await valueNow(stream),
        metrics: await valueNow(metrics),
    };

    await page.reload();
    await expect(atPath(page, "/g0")).toBeVisible();
    await expect(atPath(page, INSPECTOR)).toHaveAttribute("data-collapsed", "");
    await expect(rail).toHaveAttribute("aria-valuenow", String(moved.rail));
    await expect(stream).toHaveAttribute("aria-valuenow", String(moved.stream));
    await expect(metrics).toHaveAttribute(
        "aria-valuenow",
        String(moved.metrics),
    );

    await page.getByRole("button", { name: "Reset layout" }).click();
    await expect(atPath(page, INSPECTOR)).not.toHaveAttribute("data-collapsed");
    await expect(rail).toHaveAttribute("aria-valuenow", String(defaults.rail));
    await expect(stream).toHaveAttribute(
        "aria-valuenow",
        String(defaults.stream),
    );
    await expect(metrics).toHaveAttribute(
        "aria-valuenow",
        String(defaults.metrics),
    );
    near(await extentOf(atPath(page, RAIL)), 15 * REM);

    await page.reload();
    await expect(atPath(page, "/g0")).toBeVisible();
    await expect(rail).toHaveAttribute("aria-valuenow", String(defaults.rail));
});
