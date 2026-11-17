import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface flex h-full flex-col gap-3 bg-palette-base p-3 text-palette-contrast",
    "font-(family-name:--sp-font) text-(length:--sp-font-size)",
);

/** the group fills what is left of the frame; its canvas shows between the panels */
export const group = cn(
    "min-h-0 flex-1 overflow-hidden rounded-(--sp-radius)",
    "border-(length:--sp-border) border-(--sp-panel-line) bg-(--sp-canvas-bg)",
);

export const nested = "h-full";

export const panel =
    "palette-raised flex h-full flex-col gap-1 overflow-auto bg-palette-base p-(--sp-panel-padding)";

export const title = "truncate font-(--sp-title-weight)";

export const text = "text-palette-accent/85";

/**
 * A 12px box (what the engine measures, wide enough for the dots) showing the group's canvas. The
 * cursor follows the separator's own orientation, the dots its state.
 */
export const separator = cn(
    "group/separator palette-raised relative z-10 flex shrink-0 items-center justify-center outline-none select-none",
    "data-[orientation=vertical]:w-3 data-[orientation=vertical]:cursor-col-resize",
    "data-[orientation=horizontal]:h-3 data-[orientation=horizontal]:cursor-row-resize",
    "transition-colors duration-(--sp-motion) focus-visible:bg-palette-soft",
    "data-disabled:cursor-not-allowed",
);

/** the dots line up along the separator: a column in a vertical one, a row in a horizontal one */
export const grip = cn(
    "pointer-events-none flex gap-[3px]",
    "group-data-[orientation=vertical]/separator:flex-col group-data-[orientation=horizontal]/separator:flex-row",
);

/** a dot: round, or square in the square themes; lit on hover, drag and focus */
export const dot = cn(
    "size-1 rounded-[calc(var(--sp-radius)*100)] bg-palette-accent/45",
    "transition-[background-color,scale] duration-(--sp-motion)",
    "group-not-data-disabled/separator:group-hover/separator:bg-(--sp-separator-hover)",
    "group-data-dragging/separator:scale-125 group-data-dragging/separator:bg-(--sp-separator-active)",
    "group-focus-visible/separator:scale-125 group-focus-visible/separator:bg-(--sp-focus-line)",
);
