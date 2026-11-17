import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface flex h-full flex-col gap-2 bg-palette-base p-2 text-palette-contrast",
    "font-(family-name:--sp-font) text-(length:--sp-font-size)",
);

export const toolbar = "flex flex-wrap items-center gap-1";

/** a toggle reads as on while its panel shows */
export const toggle =
    "aria-pressed:bg-palette-soft aria-pressed:text-palette-contrast";

/** the group fills what is left of the frame; its flex direction is the package's (structural) */
export const group = cn(
    "min-h-0 flex-1 overflow-hidden rounded-(--sp-radius)",
    "border-(length:--sp-border) border-(--sp-panel-line) bg-(--sp-canvas-bg)",
);

/** a nested group fills its panel */
export const nested = "h-full";

/** the explorer, the outline and the terminal: a quieter surface than the editor */
export const side = "palette-surface bg-palette-soft";

export const pane = "flex h-full flex-col gap-2 overflow-auto p-2";

export const heading =
    "px-1 text-xs font-(--sp-title-weight) tracking-wide text-palette-accent/85 uppercase";

export const list = "flex flex-col";

/** a file, indented by its depth (complete class names: Tailwind reads the source) */
const INDENT = ["ps-1", "ps-4", "ps-7", "ps-10"];

export const file = (depth: number) =>
    cn(
        "flex items-center gap-1.5 rounded-(--sp-radius) py-0.5 pe-1",
        "data-active:bg-palette-base data-active:text-palette-contrast",
        INDENT[Math.min(depth, INDENT.length - 1)],
    );

export const icon = "size-3.5 shrink-0 text-palette-accent/85";

export const name = "truncate";

export const symbol = "truncate px-1 py-0.5 font-mono text-xs";

export const editor = "palette-raised flex h-full flex-col bg-palette-base";

export const tab = cn(
    "self-start border-e-(length:--sp-border) border-b-2 border-e-(--sp-panel-line) border-b-(--sp-separator-active)",
    "px-3 py-1.5 font-mono text-xs",
);

export const code =
    "min-h-0 flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed";

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
