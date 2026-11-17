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

export const panel =
    "palette-raised flex h-full flex-col gap-1 overflow-auto bg-palette-base p-(--sp-panel-padding)";

/** the drawer's own surface, a step below the canvas above it */
export const drawer =
    "palette-surface flex h-full flex-col gap-1 overflow-auto bg-palette-soft p-(--sp-panel-padding)";

export const title = "truncate font-(--sp-title-weight)";

export const text = "text-palette-accent/85";

/**
 * A thin line: the theme's line, at least 1px (what the engine measures). `::before` widens the
 * hit area to 4px on either side; the tab sticks out above the line. The line and the tab light
 * up together on hover, while `data-dragging` and on focus.
 */
export const separator = cn(
    "group/separator palette-raised relative z-10 shrink-0 bg-(--sp-separator-color) outline-none select-none",
    "transition-colors duration-(--sp-motion)",
    "data-[orientation=horizontal]:h-[max(var(--sp-separator-line),1px)] data-[orientation=horizontal]:cursor-row-resize",
    "before:absolute before:inset-x-0 before:-inset-y-1",
    "not-data-disabled:hover:bg-(--sp-separator-hover) data-dragging:bg-(--sp-separator-active)",
    "focus-visible:bg-(--sp-focus-line)",
    "data-disabled:cursor-not-allowed",
);

/** the pull tab: above the line, centred, open at the bottom where it meets the line */
export const tab = cn(
    "absolute bottom-full left-1/2 flex h-4 w-14 -translate-x-1/2 items-center justify-center",
    "rounded-t-[min(var(--sp-radius),0.5rem)] border-(length:--sp-border) border-b-0 border-(--sp-separator-color)",
    "bg-palette-base text-palette-accent/70 shadow-(--sp-shadow)",
    "transition-colors duration-(--sp-motion)",
    "group-not-data-disabled/separator:group-hover/separator:border-(--sp-separator-hover) group-not-data-disabled/separator:group-hover/separator:text-palette-accent",
    "group-data-dragging/separator:border-(--sp-separator-active) group-data-dragging/separator:text-palette-accent",
    "group-focus-visible/separator:border-(--sp-focus-line) group-focus-visible/separator:text-palette-accent",
);

export const icon = "size-3.5";
