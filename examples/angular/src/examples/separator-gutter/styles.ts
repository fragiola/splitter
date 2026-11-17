import { cn } from "#/lib/cn";

/** the canvas the cards sit on */
export const frame = cn(
    "palette-surface flex h-full flex-col bg-palette-soft p-(--sp-panel-padding) text-palette-contrast",
    "font-(family-name:--sp-font) text-(length:--sp-font-size)",
);

/** no frame of its own: the cards are the panels */
export const group = "min-h-0 flex-1";

export const nested = "h-full";

/** a panel drawn as a card: its corners, frame and shadow come from the theme */
export const card = cn(
    "palette-raised rounded-(--sp-radius) border-(length:--sp-border) border-(--sp-panel-line) bg-palette-base shadow-(--sp-shadow)",
);

export const panel =
    "flex h-full flex-col gap-1 overflow-auto p-(--sp-panel-padding)";

export const title = "truncate font-(--sp-title-weight)";

export const text = "text-palette-accent/85";

/**
 * The gutter: as wide as the theme's padding (what the engine measures) and transparent, so the
 * canvas shows through. Its `::before` is a 2px line along it, between the cards' corners,
 * transparent at rest and drawn on hover, while `data-dragging` and on focus.
 */
export const separator = cn(
    "palette-surface relative z-10 shrink-0 outline-none select-none",
    "data-[orientation=vertical]:w-(--sp-panel-padding) data-[orientation=vertical]:cursor-col-resize",
    "data-[orientation=horizontal]:h-(--sp-panel-padding) data-[orientation=horizontal]:cursor-row-resize",
    "before:absolute before:rounded-full before:bg-transparent before:transition-colors before:duration-(--sp-motion)",
    "data-[orientation=vertical]:before:inset-y-(--sp-radius) data-[orientation=vertical]:before:left-1/2 data-[orientation=vertical]:before:w-0.5 data-[orientation=vertical]:before:-translate-x-1/2",
    "data-[orientation=horizontal]:before:inset-x-(--sp-radius) data-[orientation=horizontal]:before:top-1/2 data-[orientation=horizontal]:before:h-0.5 data-[orientation=horizontal]:before:-translate-y-1/2",
    "not-data-disabled:hover:before:bg-(--sp-separator-hover) data-dragging:before:bg-(--sp-separator-active)",
    "focus-visible:before:bg-(--sp-focus-line)",
    "data-disabled:cursor-not-allowed",
);
