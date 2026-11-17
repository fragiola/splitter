import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface flex h-full flex-col gap-2 bg-palette-base p-2 text-palette-contrast",
    "font-(family-name:--sp-font) text-(length:--sp-font-size)",
);

export const toolbar = "flex flex-wrap items-center gap-1";

/** the primary action, on its own palette */
export const run = "palette-green me-1";

/** the toggle reads as on while the results show */
export const toggle =
    "aria-pressed:bg-palette-soft aria-pressed:text-palette-contrast";

export const connection =
    "ms-auto flex items-center gap-1.5 truncate text-xs text-palette-accent/85";

export const db = "size-3.5 shrink-0";

/** the group fills what is left of the frame; its flex direction is the package's (structural) */
export const group = cn(
    "min-h-0 flex-1 overflow-hidden rounded-(--sp-radius)",
    "border-(length:--sp-border) border-(--sp-panel-line) bg-(--sp-canvas-bg)",
);

/** a nested group fills its panel */
export const nested = "h-full";

/** the schema: a quieter surface than the editor */
export const side = "palette-surface bg-palette-soft";

export const tree = "flex h-full flex-col gap-0.5 overflow-auto p-2";

export const caption =
    "flex items-center gap-1.5 truncate px-1 pt-1 pb-1.5 text-xs font-(--sp-title-weight) tracking-wide text-palette-accent/85 uppercase";

/** a table's row: its arrow turns while the table is open (`<details open>`) */
export const summary = cn(
    "flex cursor-pointer list-none items-center gap-1.5 rounded-(--sp-radius) px-1 py-1 outline-none select-none",
    "hover:bg-palette-base [&::-webkit-details-marker]:hidden",
    "focus-visible:outline-(length:--sp-focus-width) focus-visible:-outline-offset-2 focus-visible:outline-(--sp-focus-line)",
);

export const chevron =
    "size-3.5 shrink-0 text-palette-accent/85 transition-transform duration-(--sp-motion) in-open:rotate-90";

export const icon = "size-3.5 shrink-0 text-palette-accent/85";

export const table = "min-w-0 flex-1 truncate";

export const rows = "shrink-0 text-xs text-palette-accent/85 tabular-nums";

export const columns = "flex flex-col pb-1 ps-6";

export const column = "flex items-center gap-1.5 px-1 py-0.5 font-mono text-xs";

/** a key column: the primary key on its own palette, a foreign key quieter */
export const key =
    "palette-orange size-3 shrink-0 text-palette-accent data-[key=foreign]:opacity-60";

export const spacer = "size-3 shrink-0";

/** what the key icon says, for a screen reader */
export const hidden = "sr-only";

export const columnName = "min-w-0 flex-1 truncate";

export const type = "shrink-0 text-palette-accent/85";

export const pane = "palette-raised flex h-full flex-col bg-palette-base";

/** a pane's title bar; the results' is as tall as their collapsed size (2rem) */
export const bar = cn(
    "flex h-8 shrink-0 items-center gap-2 px-(--sp-panel-padding)",
    "border-b-(length:--sp-border) border-(--sp-panel-line)",
);

export const tab =
    "truncate text-xs font-(--sp-title-weight) tracking-wide text-palette-accent/85 uppercase";

export const status = "ms-auto truncate text-xs text-palette-accent/85";

/** the editor: line numbers beside the text, scrolled together */
export const code = cn(
    "flex min-h-0 flex-1 overflow-auto font-mono text-xs leading-5",
    "focus-within:outline-(length:--sp-focus-width) focus-within:-outline-offset-2 focus-within:outline-(--sp-focus-line)",
);

export const gutter =
    "sticky start-0 shrink-0 bg-palette-base py-2 ps-(--sp-panel-padding) pe-3 text-end text-palette-accent/60 select-none";

export const sql =
    "min-w-0 flex-1 resize-none overflow-hidden bg-transparent py-2 pe-(--sp-panel-padding) whitespace-pre text-palette-contrast outline-none field-sizing-content";

export const output = "min-h-0 flex-1 overflow-auto";

export const grid = "w-full border-collapse text-xs tabular-nums";

/** a header cell stays on top while the rows scroll */
export const head = cn(
    "sticky top-0 bg-palette-soft px-(--sp-panel-padding) py-1.5 text-start font-(--sp-title-weight) data-numeric:text-end",
    "border-b-(length:--sp-border) border-(--sp-panel-line)",
);

export const row = "hover:bg-palette-soft/60";

export const cell = cn(
    "px-(--sp-panel-padding) py-1 font-mono data-numeric:text-end",
    "border-b-(length:--sp-border) border-(--sp-panel-line)",
);

export const empty =
    "flex h-full flex-col items-center justify-center gap-1 p-(--sp-panel-padding) text-center text-palette-accent/85";

export const shortcut = cn(
    "rounded-(--sp-radius) bg-palette-soft px-1.5 py-0.5 font-mono text-xs",
    "border-(length:--sp-border) border-(--sp-panel-line)",
);

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
