import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface flex h-full flex-col gap-2 bg-palette-base p-2 text-palette-contrast",
    "font-(family-name:--sp-font) text-(length:--sp-font-size)",
);

export const toolbar = "flex flex-wrap items-center gap-1";

/** a toggle reads as on while its panel shows */
export const toggle =
    "aria-pressed:bg-palette-soft aria-pressed:text-palette-contrast";

/** Live or Paused, with the feed's clock; the dot is green while it plays */
export const live = cn(
    "flex items-center gap-1.5 px-2 text-xs text-palette-accent/85 tabular-nums",
    "before:size-2 before:rounded-full before:bg-palette-line data-playing:before:bg-(--sp-focus-line)",
);

export const end = "ms-auto flex items-center gap-1";

/** the group fills what is left of the frame; its flex direction is the package's (structural) */
export const group = cn(
    "min-h-0 flex-1 overflow-hidden rounded-(--sp-radius)",
    "border-(length:--sp-border) border-(--sp-panel-line) bg-(--sp-canvas-bg)",
);

/** a nested group fills its panel */
export const nested = "h-full";

/** the services: a quieter surface; their buttons read the panel's `data-collapsed` */
export const services = "palette-surface bg-palette-soft";

export const rail = "flex h-full flex-col gap-0.5 overflow-auto p-2";

export const caption = cn(
    "truncate px-1 pt-1 pb-1.5 text-xs font-(--sp-title-weight) tracking-wide text-palette-accent/85 uppercase",
    "in-data-collapsed:sr-only",
);

/** a service: its name, its p95 and a sparkline; collapsed to a rail, its health dot only */
export const service = cn(
    "grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 rounded-(--sp-radius) px-2 py-1.5 text-start text-palette-contrast outline-none",
    "hover:bg-palette-base aria-pressed:bg-palette-base aria-pressed:font-(--sp-title-weight)",
    "focus-visible:outline-(length:--sp-focus-width) focus-visible:-outline-offset-2 focus-visible:outline-(--sp-focus-line)",
    "in-data-collapsed:flex in-data-collapsed:justify-center in-data-collapsed:px-0",
);

export const allIcon = "size-3.5 shrink-0 text-palette-accent/85";

/** what a service's health looks like: a dot on its own palette */
export const health = {
    healthy: "palette-green size-2 shrink-0 rounded-full bg-palette-base",
    degraded: "palette-orange size-2 shrink-0 rounded-full bg-palette-base",
    failing:
        "palette-danger size-2 shrink-0 animate-pulse rounded-full bg-palette-base motion-reduce:animate-none",
};

/** the name and the figures leave with the room for them; the button keeps its name (`aria-label`) */
export const name = "truncate in-data-collapsed:hidden";

export const figure =
    "text-end text-xs text-palette-accent/85 tabular-nums in-data-collapsed:hidden";

export const sparkline =
    "palette-blue col-span-3 h-5 w-full overflow-visible in-data-collapsed:hidden";

export const sparklinePath =
    "fill-none stroke-palette-accent stroke-[1.25] [stroke-linejoin:round]";

/** the charts' row: a nested group, as tall as its panel */
export const metrics = "h-full";

/** a chart: a title bar, then the plot stretched to what is left of its panel */
export const chart =
    "palette-raised flex h-full min-w-0 flex-col bg-palette-base";

/** a pane's title bar; the logs' is as tall as their collapsed size (2rem) */
export const bar = cn(
    "flex h-8 shrink-0 items-center gap-2 px-(--sp-panel-padding)",
    "border-b-(length:--sp-border) border-(--sp-panel-line)",
);

export const tab =
    "truncate text-xs font-(--sp-title-weight) tracking-wide text-palette-accent/85 uppercase";

export const scope = "min-w-0 truncate text-xs text-palette-accent/85";

/** the chart's latest value, in the chart's palette */
export const value = {
    latency:
        "palette-blue ms-auto shrink-0 font-mono text-sm font-(--sp-title-weight) text-palette-accent tabular-nums",
    errors: "palette-danger ms-auto shrink-0 font-mono text-sm font-(--sp-title-weight) text-palette-accent tabular-nums",
};

export const plot =
    "relative min-h-0 flex-1 px-(--sp-panel-padding) pt-5 pb-(--sp-panel-padding)";

/** the scale's top, over the plot */
export const max =
    "absolute start-(--sp-panel-padding) top-1 text-[0.6875rem] text-palette-accent/85 tabular-nums";

/** the plot, in the chart's palette: blue for the latency, red for the errors */
export const svg = {
    latency: "palette-blue block size-full overflow-visible",
    errors: "palette-danger block size-full overflow-visible",
};

export const gridLine = "stroke-(--sp-panel-line) [stroke-dasharray:2_3]";

export const baseline = "stroke-(--sp-panel-line)";

export const area = "fill-palette-accent/15";

export const line =
    "fill-none stroke-palette-accent stroke-[1.5] [stroke-linejoin:round]";

export const pane = "palette-raised flex h-full flex-col bg-palette-base";

export const status = "ms-auto truncate text-xs text-palette-accent/85";

export const jump = "palette-blue h-6 text-palette-accent";

/** the log tail: one scroll container, followed while it is at the bottom */
export const tail = cn(
    "min-h-0 flex-1 overflow-auto py-1 font-mono text-xs leading-5 outline-none",
    "focus-visible:outline-(length:--sp-focus-width) focus-visible:-outline-offset-2 focus-visible:outline-(--sp-focus-line)",
);

export const lines = "flex min-w-max flex-col";

export const logLine =
    "flex gap-3 px-(--sp-panel-padding) whitespace-pre hover:bg-palette-soft/60";

export const time = "shrink-0 text-palette-accent/60";

/** a line's level, on its own palette */
export const level = {
    info: "palette-blue w-10 shrink-0 text-palette-accent uppercase",
    warn: "palette-orange w-10 shrink-0 text-palette-accent uppercase",
    error: "palette-danger w-10 shrink-0 font-(--sp-title-weight) text-palette-accent uppercase",
};

export const logService = "w-18 shrink-0 truncate text-palette-accent/85";

export const message = "text-palette-contrast";

/** the inspector: the latest traces, then the selected one as a waterfall */
export const inspector =
    "palette-raised flex h-full min-w-0 flex-col bg-palette-base";

export const traces = cn(
    "flex shrink-0 flex-col gap-0.5 p-1",
    "border-b-(length:--sp-border) border-(--sp-panel-line)",
);

/** a trace: pressed while it is the one shown */
export const trace = cn(
    "grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-2 rounded-(--sp-radius) px-2 py-1 text-start text-xs outline-none",
    "hover:bg-palette-soft/60 aria-pressed:bg-palette-soft",
    "focus-visible:outline-(length:--sp-focus-width) focus-visible:-outline-offset-2 focus-visible:outline-(--sp-focus-line)",
);

export const operation = "truncate font-mono";

/** a trace's duration, red when it failed */
export function duration(failed: boolean) {
    return failed
        ? "palette-danger text-end text-palette-accent tabular-nums"
        : "text-end text-palette-accent/85 tabular-nums";
}

export const traceService = "col-span-2 truncate text-palette-accent/85";

export const detail =
    "flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-(--sp-panel-padding)";

export const traceTitle = "truncate font-mono font-(--sp-title-weight)";

export const traceMeta = "text-xs text-palette-accent/85 tabular-nums";

export const spans = "flex flex-col gap-1.5";

export const span = "grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 text-xs";

/** a span's name, indented by its depth in the trace */
export function spanName(depth: number) {
    if (depth === 0) return "truncate font-mono";
    if (depth === 1) return "truncate ps-3 font-mono";
    return "truncate ps-6 font-mono";
}

export const spanDuration = "text-end text-palette-accent/85 tabular-nums";

export const track = "col-span-2 block h-2 w-full";

/** a span's bar: the trace's blue, red when the span failed */
export function spanBar(failed: boolean) {
    return failed
        ? "palette-danger fill-palette-base"
        : "palette-blue fill-palette-base";
}

export const empty =
    "flex flex-1 items-center justify-center p-(--sp-panel-padding) text-center text-xs text-palette-accent/85";

/** what a screen reader hears beside a short visual */
export const hidden = "sr-only";

/**
 * The theme draws it: a box of `--sp-separator-size` (what the engine measures) filled with
 * `--sp-separator-bg`, a line of `--sp-separator-line` in the middle of a grab area of
 * `--sp-separator-grab` (`::before`, centred on the box, so a hairline still takes the pointer)
 * and, in the themes that show one (`--sp-grip`), a grip (`::after`). The cursor follows the
 * separator's own orientation (`vertical` between side by side panels), the colours its state:
 * hovered (never while disabled), dragged (`data-dragging`), focused.
 */
export const separator = cn(
    "palette-raised relative z-10 flex shrink-0 items-center justify-center bg-(--sp-separator-bg) outline-none select-none",
    "data-[orientation=vertical]:w-(--sp-separator-size) data-[orientation=vertical]:cursor-col-resize",
    "data-[orientation=horizontal]:h-(--sp-separator-size) data-[orientation=horizontal]:cursor-row-resize",
    // the grab area: its padding leaves the line in its middle (the background stops at the content)
    "before:absolute before:bg-(--sp-separator-color) before:bg-clip-content before:transition-colors before:duration-(--sp-motion)",
    "data-[orientation=vertical]:before:inset-y-0 data-[orientation=vertical]:before:inset-x-[calc((var(--sp-separator-size)-var(--sp-separator-grab))/2)]",
    "data-[orientation=vertical]:before:px-[calc((var(--sp-separator-grab)-var(--sp-separator-line))/2)]",
    "data-[orientation=horizontal]:before:inset-x-0 data-[orientation=horizontal]:before:inset-y-[calc((var(--sp-separator-size)-var(--sp-separator-grab))/2)]",
    "data-[orientation=horizontal]:before:py-[calc((var(--sp-separator-grab)-var(--sp-separator-line))/2)]",
    "not-data-disabled:hover:before:bg-(--sp-separator-hover) data-dragging:before:bg-(--sp-separator-active)",
    "focus-visible:before:bg-(--sp-focus-line)",
    "focus-visible:data-[orientation=vertical]:before:px-[calc((var(--sp-separator-grab)-max(var(--sp-separator-line),var(--sp-focus-width)))/2)]",
    "focus-visible:data-[orientation=horizontal]:before:py-[calc((var(--sp-separator-grab)-max(var(--sp-separator-line),var(--sp-focus-width)))/2)]",
    // the grip, centred on the box
    "after:pointer-events-none after:[display:var(--sp-grip)] after:rounded-(--sp-radius) after:bg-(--sp-separator-color) after:transition-colors after:duration-(--sp-motion)",
    "data-[orientation=vertical]:after:h-8 data-[orientation=vertical]:after:w-1",
    "data-[orientation=horizontal]:after:h-1 data-[orientation=horizontal]:after:w-8",
    "not-data-disabled:hover:after:bg-(--sp-separator-hover) data-dragging:after:bg-(--sp-separator-active) focus-visible:after:bg-(--sp-focus-line)",
    "data-disabled:cursor-not-allowed",
);
