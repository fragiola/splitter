import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface flex h-full flex-col gap-3 bg-palette-base p-3 text-palette-contrast",
    "font-(family-name:--sp-font) text-(length:--sp-font-size)",
);

/** the group fills what is left of the frame; its flex direction is the package's (structural) */
export const group = cn(
    "min-h-0 flex-1 overflow-hidden rounded-(--sp-radius)",
    "border-(length:--sp-border) border-(--sp-panel-line) bg-(--sp-canvas-bg)",
);

export const side =
    "palette-surface flex h-full flex-col gap-1 overflow-auto bg-palette-soft p-(--sp-panel-padding)";

export const panel =
    "palette-raised flex h-full flex-col gap-1 overflow-auto bg-palette-base p-(--sp-panel-padding)";

export const title = "truncate font-(--sp-title-weight)";

export const text = "text-palette-accent/85";

/**
 * The theme draws it: a box of `--sp-separator-size` (what the engine measures) filled with
 * `--sp-separator-bg` and a line of `--sp-separator-line` in the middle of a grab area of
 * `--sp-separator-grab` (`::before`); the button takes the place of the theme's grip. The cursor
 * follows the separator's own orientation, the colours its state.
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
    "data-disabled:cursor-not-allowed",
);

/**
 * The button sits in the middle of the line, centred on it; once the panel before the separator is
 * collapsed, it moves beside the line, into the room left. A separator does not carry its panels'
 * state, so `[[data-collapsed]+*_&]` reads the `data-collapsed` of the panel just before it (its
 * previous sibling in the markup).
 */
export const toggle = cn(
    "palette-raised absolute top-1/2 left-1/2 z-10 flex size-6 -translate-1/2 cursor-pointer items-center justify-center",
    "rounded-[calc(var(--sp-radius)*100)] border-(length:--sp-border) border-(--sp-separator-color) bg-palette-base text-palette-accent shadow-(--sp-shadow)",
    "transition-[background-color,border-color,translate] duration-(--sp-motion) outline-none",
    "hover:border-(--sp-separator-hover) hover:bg-palette-soft",
    "focus-visible:outline-(length:--sp-focus-width) focus-visible:outline-(--sp-focus-line) focus-visible:outline-offset-1",
    "[[data-collapsed]+*_&]:translate-x-0",
);

/** points at the panel it hides; turned once that panel is collapsed */
export const icon = cn(
    "size-3.5 transition-transform duration-(--sp-motion)",
    "[[data-collapsed]+*_&]:rotate-180",
);
