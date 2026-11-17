import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface flex h-full flex-col gap-3 bg-palette-base p-3 text-palette-contrast",
    "font-(family-name:--sp-font) text-(length:--sp-font-size)",
);

export const toolbar = "flex flex-col gap-2";

export const buttons = "flex flex-wrap items-center gap-2";

export const history = "flex min-h-6 flex-wrap gap-1.5 text-xs";

export const hint = "text-palette-accent/85";

/** an undone step stays listed, struck through, until a new change drops it */
export const step = cn(
    "rounded-(--sp-radius) border-(length:--sp-border) border-palette-line px-2 py-0.5",
    "data-undone:text-palette-accent/60 data-undone:line-through",
);

/** the group fills what is left of the frame; its flex direction is the package's (structural) */
export const group = cn(
    "min-h-0 flex-1 overflow-hidden rounded-(--sp-radius)",
    "border-(length:--sp-border) border-(--sp-panel-line) bg-(--sp-canvas-bg)",
);

export const panel =
    "palette-raised flex h-full flex-col gap-1 overflow-auto bg-palette-base p-(--sp-panel-padding)";

export const title = "truncate font-(--sp-title-weight)";

export const text = "text-palette-accent/85";

/**
 * A hit area of `--sp-separator-size` with a hairline drawn in its middle. The cursor follows the
 * separator's own orientation (`vertical` between side by side panels), the colours its state:
 * hovered (never while disabled), dragged (`data-dragging`), focused.
 */
export const separator = cn(
    "palette-raised relative flex shrink-0 items-center justify-center bg-palette-base outline-none select-none",
    "data-[orientation=vertical]:w-(--sp-separator-size) data-[orientation=vertical]:cursor-col-resize",
    "data-[orientation=horizontal]:h-(--sp-separator-size) data-[orientation=horizontal]:cursor-row-resize",
    "before:absolute before:bg-(--sp-separator-color) before:transition-colors before:duration-(--sp-motion)",
    "data-[orientation=vertical]:before:inset-y-0 data-[orientation=vertical]:before:w-(--sp-separator-line)",
    "data-[orientation=horizontal]:before:inset-x-0 data-[orientation=horizontal]:before:h-(--sp-separator-line)",
    "not-data-disabled:hover:before:bg-(--sp-separator-hover) data-dragging:before:bg-(--sp-separator-active)",
    "focus-visible:before:bg-(--sp-focus-line) focus-visible:data-[orientation=vertical]:before:w-(--sp-focus-width) focus-visible:data-[orientation=horizontal]:before:h-(--sp-focus-width)",
    "data-disabled:cursor-not-allowed",
);
