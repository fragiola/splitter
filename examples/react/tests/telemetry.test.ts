import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    createTelemetryFeed,
    HISTORY,
    healthOf,
    LOG_LIMIT,
    SERVICE_IDS,
    TICK_MS,
    TRACE_LIMIT,
} from "../src/examples/_kit/telemetry.ts";
import {
    areaPath,
    linePath,
    scaleOf,
    seriesOf,
    VIEW_HEIGHT,
    VIEW_WIDTH,
    waterfallOf,
} from "../src/examples/observability-console/charts.ts";

// `_kit/telemetry.ts` is the observability console's live data: seeded (the same seed, the same
// telemetry, so the specs and the three frameworks see the same scene), ticking on a timer only
// while it plays and the document shows. `observability-console/charts.ts` turns it into what
// the console draws. Checked here without a DOM; `document` is a stand-in where it matters.

describe("the telemetry feed", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it("starts with every service's charts full, the same for the same seed", () => {
        const a = createTelemetryFeed({ seed: 3 }).current();
        const b = createTelemetryFeed({ seed: 3 }).current();
        const c = createTelemetryFeed({ seed: 4 }).current();
        expect(a).toEqual(b);
        expect(a).not.toEqual(c);
        expect(a.services.map((s) => s.id)).toEqual(SERVICE_IDS);
        for (const service of a.services) {
            expect(service.latency).toHaveLength(HISTORY);
            expect(service.errors).toHaveLength(HISTORY);
            expect(Math.min(...service.latency)).toBeGreaterThanOrEqual(0);
        }
        expect(a.logs.length).toBeGreaterThan(0);
        expect(a.traces.length).toBeGreaterThan(0);
    });

    it("ticks while it plays, holds while it is paused", () => {
        const feed = createTelemetryFeed();
        const seen: number[] = [];
        feed.subscribe((telemetry) => seen.push(telemetry.tick));
        const first = feed.current();
        vi.advanceTimersByTime(TICK_MS * 4);
        expect(seen).toEqual([]);
        expect(feed.current()).toBe(first);

        feed.play();
        expect(feed.playing).toBe(true);
        vi.advanceTimersByTime(TICK_MS * 3);
        expect(seen).toEqual([first.tick + 1, first.tick + 2, first.tick + 3]);
        expect(feed.current().time).toBe(first.time + 3 * TICK_MS);

        feed.pause();
        vi.advanceTimersByTime(TICK_MS * 4);
        expect(seen).toHaveLength(3);
        feed.dispose();
    });

    it("stops while the document is hidden, and goes on when it shows", () => {
        const listeners = new Set<() => void>();
        const doc = {
            visibilityState: "visible",
            addEventListener: (_: string, listener: () => void) =>
                listeners.add(listener),
            removeEventListener: (_: string, listener: () => void) =>
                listeners.delete(listener),
        };
        vi.stubGlobal("document", doc);
        const feed = createTelemetryFeed();
        const start = feed.current().tick;
        feed.play();
        expect(listeners.size).toBe(1);
        vi.advanceTimersByTime(TICK_MS * 2);
        expect(feed.current().tick).toBe(start + 2);

        doc.visibilityState = "hidden";
        for (const listener of listeners) listener();
        vi.advanceTimersByTime(TICK_MS * 6);
        expect(feed.current().tick).toBe(start + 2);

        doc.visibilityState = "visible";
        for (const listener of listeners) listener();
        vi.advanceTimersByTime(TICK_MS);
        expect(feed.current().tick).toBe(start + 3);

        // paused, it no longer follows the document
        feed.pause();
        expect(listeners.size).toBe(0);
    });

    it("keeps its logs and traces bounded, and every trace starts with its root span", () => {
        const feed = createTelemetryFeed();
        for (let n = 0; n < 400; n++) feed.step();
        const telemetry = feed.current();
        expect(telemetry.logs.length).toBeLessThanOrEqual(LOG_LIMIT);
        expect(telemetry.traces.length).toBeLessThanOrEqual(TRACE_LIMIT);
        // newest last, each line once
        const times = telemetry.logs.map((line) => line.time);
        expect([...times].sort((a, b) => a - b)).toEqual(times);
        const ids = new Set(telemetry.logs.map((line) => line.id));
        expect(ids.size).toBe(telemetry.logs.length);
        for (const trace of telemetry.traces) {
            const [root] = trace.spans;
            expect(root?.depth).toBe(0);
            expect(root?.start).toBe(0);
            expect(root?.duration).toBe(trace.duration);
            for (const span of trace.spans) {
                expect(span.start + span.duration).toBeLessThanOrEqual(
                    trace.duration,
                );
            }
        }
    });

    it("tells a service's health from its error rate", () => {
        expect(healthOf(0.3)).toBe("healthy");
        expect(healthOf(1.5)).toBe("degraded");
        expect(healthOf(4)).toBe("failing");
    });
});

describe("the console's charts", () => {
    const telemetry = createTelemetryFeed().current();

    it("show one service, or the mean of every service", () => {
        const one = seriesOf(telemetry, "checkout");
        const checkout = telemetry.services.find((s) => s.id === "checkout");
        expect(one.latency).toEqual(checkout?.latency);
        const all = seriesOf(telemetry, undefined);
        const mean =
            telemetry.services.reduce(
                (sum, s) => sum + (s.latency[0] ?? 0),
                0,
            ) / telemetry.services.length;
        expect(all.latency[0]).toBeCloseTo(mean);
        expect(all.latency).toHaveLength(HISTORY);
    });

    it("scale to 1, 2 or 5 times a power of ten above the maximum", () => {
        expect(scaleOf([12, 80])).toBe(100);
        expect(scaleOf([120])).toBe(200);
        expect(scaleOf([0.3], 1)).toBe(1);
        expect(scaleOf([3.4], 1)).toBe(5);
    });

    it("draw inside their viewBox, the newest point on the right edge", () => {
        const values = [0, 50, 100, 150];
        const line = linePath(values, 100);
        expect(line.startsWith(`M${VIEW_WIDTH - 3},${VIEW_HEIGHT}`)).toBe(true);
        expect(line.endsWith(`L${VIEW_WIDTH},0`)).toBe(true);
        expect(
            areaPath(values, 100).endsWith(`L${VIEW_WIDTH},${VIEW_HEIGHT}Z`),
        ).toBe(true);
    });

    it("lay a trace out as a waterfall on its duration", () => {
        const trace = telemetry.traces[0];
        expect(trace).toBeDefined();
        if (!trace) return;
        const bars = waterfallOf(trace);
        expect(bars).toHaveLength(trace.spans.length);
        expect(bars[0]?.x).toBe(0);
        expect(bars[0]?.width).toBeCloseTo(100);
        for (const bar of bars) {
            expect(bar.x + bar.width).toBeLessThanOrEqual(100.5);
        }
    });
});
