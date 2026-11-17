import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface flex h-full flex-col gap-2 bg-palette-base p-2 text-palette-contrast",
    "font-(family-name:--sp-font) text-(length:--sp-font-size)",
);

export const toolbar = "flex flex-wrap items-center gap-2";

/** the toggle reads as on while the folders show their labels */
export const toggle =
    "aria-pressed:bg-palette-soft aria-pressed:text-palette-contrast";

export const hint = "ms-auto text-xs text-palette-accent/85";

/** the group fills what is left of the frame; its flex direction is the package's (structural) */
export const group = cn(
    "min-h-0 flex-1 overflow-hidden rounded-(--sp-radius)",
    "border-(length:--sp-border) border-(--sp-panel-line) bg-(--sp-canvas-bg)",
);

/** the folders: a quieter surface; their content reads the panel's `data-collapsed` */
export const folders = "palette-surface bg-palette-soft";

export const nav = "flex h-full flex-col gap-0.5 overflow-auto p-2";

export const folder = cn(
    "flex w-full items-center gap-2 rounded-(--sp-radius) px-2 py-1.5 text-start text-palette-contrast outline-none",
    "hover:bg-palette-base data-active:bg-palette-base data-active:font-(--sp-title-weight)",
    "focus-visible:outline-(length:--sp-focus-width) focus-visible:-outline-offset-2 focus-visible:outline-(--sp-focus-line)",
    // collapsed to a rail: icons only, centred
    "in-data-collapsed:justify-center in-data-collapsed:px-0",
);

export const icon = "size-4 shrink-0";

/** the label and the count leave with the room for them; the button keeps its name (`aria-label`) */
export const label = "flex-1 truncate in-data-collapsed:hidden";

export const count =
    "palette-blue rounded-full bg-palette-soft px-1.5 text-xs text-palette-accent tabular-nums in-data-collapsed:hidden";

export const list = "palette-raised bg-palette-base";

export const pane = "flex h-full flex-col";

export const heading = cn(
    "flex items-baseline justify-between gap-2 px-(--sp-panel-padding) py-2 font-(--sp-title-weight)",
    "border-b-(length:--sp-border) border-(--sp-panel-line)",
);

export const total = "text-xs font-normal text-palette-accent/85 tabular-nums";

export const messages = "min-h-0 flex-1 overflow-auto";

/** a message: bold while unread (`data-unread`), marked on its start edge while open (`data-active`) */
export const message = cn(
    "grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-0.5 px-(--sp-panel-padding) py-2 text-start outline-none",
    "border-s-2 border-b-(length:--sp-border) border-s-transparent border-b-(--sp-panel-line)",
    "hover:bg-palette-soft/60 data-active:border-s-(--sp-focus-line) data-active:bg-palette-soft",
    "focus-visible:outline-(length:--sp-focus-width) focus-visible:-outline-offset-2 focus-visible:outline-(--sp-focus-line)",
);

/** the sender, with a dot while the message is unread */
export const from = cn(
    "truncate in-data-unread:font-(--sp-title-weight)",
    "before:me-1.5 before:hidden before:size-2 before:rounded-full before:bg-(--sp-focus-line) in-data-unread:before:inline-block",
);

export const date = "text-xs text-palette-accent/85 tabular-nums";

export const subject =
    "col-span-2 truncate in-data-unread:font-(--sp-title-weight)";

export const snippet = "col-span-2 truncate text-xs text-palette-accent/85";

export const reader =
    "palette-raised flex h-full flex-col overflow-auto bg-palette-base";

export const header = cn(
    "flex flex-col gap-1 p-(--sp-panel-padding)",
    "border-b-(length:--sp-border) border-(--sp-panel-line)",
);

export const title = "text-lg leading-snug font-(--sp-title-weight)";

export const meta = "text-xs text-palette-accent/85";

export const body =
    "flex max-w-prose flex-col gap-3 p-(--sp-panel-padding) leading-relaxed";

export const empty = "m-auto text-palette-accent/85";

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
