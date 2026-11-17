import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface flex h-full flex-col gap-2 bg-palette-base p-2 text-palette-contrast",
    "font-(family-name:--sp-font) text-(length:--sp-font-size)",
);

export const toolbar = "flex flex-wrap items-center justify-between gap-3";

/** the segmented control: three buttons in one frame */
export const modes = cn(
    "inline-flex gap-0.5 rounded-(--sp-radius) p-0.5",
    "border-(length:--sp-border) border-(--sp-panel-line) bg-palette-soft",
);

/** the button of the mode the model is in reads as on */
export const mode =
    "aria-pressed:bg-palette-base aria-pressed:text-palette-contrast aria-pressed:shadow-(--sp-shadow)";

/** the switch and its visible label, which names it (`aria-labelledby`) */
export const stack = "inline-flex items-center gap-2 select-none";

/** the group fills what is left of the frame; its flex direction is the package's (structural) */
export const group = cn(
    "min-h-0 flex-1 overflow-hidden rounded-(--sp-radius)",
    "border-(length:--sp-border) border-(--sp-panel-line) bg-(--sp-canvas-bg)",
);

/** the editor: a quieter surface than the page it renders */
export const side = "palette-surface bg-palette-soft";

export const pane = "flex h-full flex-col";

export const tab = cn(
    "shrink-0 truncate px-(--sp-panel-padding) py-1.5 text-xs font-(--sp-title-weight) tracking-wide text-palette-accent/85 uppercase",
    "border-b-(length:--sp-border) border-(--sp-panel-line)",
);

export const source = cn(
    "min-h-0 flex-1 resize-none bg-transparent p-(--sp-panel-padding) font-mono text-xs leading-relaxed text-palette-contrast outline-none",
    "focus-visible:outline-(length:--sp-focus-width) focus-visible:-outline-offset-2 focus-visible:outline-(--sp-focus-line)",
);

export const page = "palette-raised flex h-full flex-col bg-palette-base";

/** the rendered document: its tags are the renderer's, styled from here */
export const preview = cn(
    "min-h-0 flex-1 overflow-auto p-(--sp-panel-padding) leading-relaxed",
    "[&>*+*]:mt-3",
    "[&_h1]:text-xl [&_h1]:leading-tight [&_h1]:font-(--sp-title-weight)",
    "[&_h2]:text-base [&_h2]:font-(--sp-title-weight) [&_h3]:font-(--sp-title-weight)",
    "[&_ol]:list-decimal [&_ol]:ps-5 [&_ul]:list-disc [&_ul]:ps-5 [&_li+li]:mt-1",
    "[&_code]:rounded-[calc(var(--sp-radius)/2)] [&_code]:bg-palette-soft [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.9em]",
    "[&_pre]:overflow-auto [&_pre]:rounded-(--sp-radius) [&_pre]:bg-palette-soft [&_pre]:p-3 [&_pre]:text-xs [&_pre_code]:bg-transparent [&_pre_code]:p-0",
    "[&_strong]:font-(--sp-title-weight)",
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
