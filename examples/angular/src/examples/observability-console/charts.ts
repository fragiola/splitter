// What the console draws, as plain data: the series a chart shows, its scale, its SVG paths and a
// trace's waterfall. No chart library: a chart is an <svg> with a fixed viewBox stretched to its
// panel (`preserveAspectRatio="none"`, strokes that do not scale), so it redraws to any size the
// splitter gives it without measuring anything.

import {
    HISTORY,
    type LogLine,
    type ServiceId,
    type Telemetry,
    type Trace,
} from "../_kit/telemetry";

/** A chart's viewBox: one unit per point across, 0 to 100 down. */
export const VIEW_WIDTH = HISTORY - 1;
export const VIEW_HEIGHT = 100;
export const VIEW_BOX = `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`;

/** The heights of a chart's grid lines, in viewBox units (a quarter, half and three quarters). */
export const GRID = [25, 50, 75];

export interface Series {
    /** p95 latency, in milliseconds, oldest first */
    readonly latency: readonly number[];
    /** error rate, in percent, oldest first */
    readonly errors: readonly number[];
}

/** One service's series, or the mean of every service's (`undefined`: all of them). */
export function seriesOf(
    telemetry: Telemetry,
    service: ServiceId | undefined,
): Series {
    const services = service
        ? telemetry.services.filter((s) => s.id === service)
        : telemetry.services;
    const mean = (pickSeries: (index: number) => readonly number[]) =>
        Array.from({ length: HISTORY }, (_, i) => {
            let sum = 0;
            for (let s = 0; s < services.length; s++) {
                sum += pickSeries(s)[i] ?? 0;
            }
            return sum / Math.max(services.length, 1);
        });
    return {
        latency: mean((s) => services[s]?.latency ?? []),
        errors: mean((s) => services[s]?.errors ?? []),
    };
}

/** The top of a chart's scale: the series' maximum rounded up to 1, 2 or 5 times a power of ten. */
export function scaleOf(values: readonly number[], floor = 1): number {
    const max = Math.max(floor, ...values);
    const power = 10 ** Math.floor(Math.log10(max));
    for (const step of [1, 2, 5, 10]) {
        if (max <= step * power) return step * power;
    }
    return 10 * power;
}

function pointsOf(values: readonly number[], max: number): string[] {
    const offset = VIEW_WIDTH - (values.length - 1);
    return values.map((value, i) => {
        const y = VIEW_HEIGHT - (Math.min(value, max) / max) * VIEW_HEIGHT;
        return `${offset + i},${Math.round(y * 100) / 100}`;
    });
}

/** The line through a series, scaled to `max`. */
export function linePath(values: readonly number[], max: number): string {
    return `M${pointsOf(values, max).join("L")}`;
}

/** The area under a series, scaled to `max`. */
export function areaPath(values: readonly number[], max: number): string {
    const points = pointsOf(values, max);
    const first = points[0]?.split(",")[0] ?? "0";
    return `M${first},${VIEW_HEIGHT}L${points.join("L")}L${VIEW_WIDTH},${VIEW_HEIGHT}Z`;
}

export function formatMs(value: number): string {
    return `${Math.round(value)} ms`;
}

export function formatPercent(value: number): string {
    return `${value.toFixed(2)}%`;
}

/** The log lines of one service, or all of them. */
export function logsOf(
    telemetry: Telemetry,
    service: ServiceId | undefined,
): readonly LogLine[] {
    return service
        ? telemetry.logs.filter((line) => line.service === service)
        : telemetry.logs;
}

/** The latest traces of one service (the ones it took part in), or of all of them. */
export function tracesOf(
    telemetry: Telemetry,
    service: ServiceId | undefined,
    count: number,
): readonly Trace[] {
    const traces = service
        ? telemetry.traces.filter((trace) =>
              trace.spans.some((span) => span.service === service),
          )
        : telemetry.traces;
    return traces.slice(0, count);
}

export interface Bar {
    readonly id: string;
    readonly label: string;
    readonly service: ServiceId;
    readonly depth: number;
    readonly failed: boolean;
    readonly duration: string;
    /** where the bar starts and how long it is, in a viewBox 100 units wide */
    readonly x: number;
    readonly width: number;
}

/** A trace as a waterfall: one bar per span, placed on the trace's duration. */
export function waterfallOf(trace: Trace): readonly Bar[] {
    const total = Math.max(trace.duration, 1);
    return trace.spans.map((span) => ({
        id: span.id,
        label: span.name,
        service: span.service,
        depth: span.depth,
        failed: span.failed,
        duration: formatMs(span.duration),
        x: (span.start / total) * 100,
        width: Math.max((span.duration / total) * 100, 0.5),
    }));
}
