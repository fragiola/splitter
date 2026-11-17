import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface flex h-full flex-col gap-3 bg-palette-base p-3 text-palette-contrast",
    "font-(family-name:--sp-font) text-(length:--sp-font-size)",
);

/** the group: dimmed panels while one of its separators drags */
export const group = cn(
    "group/splitter min-h-0 flex-1 overflow-hidden rounded-(--sp-radius)",
    "border-(length:--sp-border) border-(--sp-panel-line) bg-(--sp-canvas-bg)",
);

export const nested = "h-full";

/** a panel's palette, chosen per panel; the panel fades while a drag runs anywhere in the group */
const tinted =
    "transition-opacity duration-(--sp-motion) group-data-dragging/splitter:opacity-70";

export const blue = cn(
    "palette-blue bg-palette-soft text-palette-accent",
    tinted,
);

export const green = cn(
    "palette-green bg-palette-soft text-palette-accent",
    tinted,
);

export const orange = cn(
    "palette-orange bg-palette-soft text-palette-accent",
    tinted,
);

export const panel =
    "flex h-full flex-col gap-1 overflow-auto p-(--sp-panel-padding)";

export const title = "truncate font-(--sp-title-weight)";

export const text = "opacity-85";

/**
 * A hit area twice the theme's, a hairline in the middle and a grip on it. Everything that changes
 * reads a state attribute: the cursor `data-orientation`, the colours hover, `data-dragging` and
 * focus, the cursor of a disabled one `data-disabled`.
 */
export const separator = cn(
    "group/separator palette-surface relative flex shrink-0 items-center justify-center bg-palette-base outline-none select-none",
    "data-[orientation=vertical]:w-[calc(var(--sp-separator-size)*2)] data-[orientation=vertical]:cursor-col-resize",
    "data-[orientation=horizontal]:h-[calc(var(--sp-separator-size)*2)] data-[orientation=horizontal]:cursor-row-resize",
    "before:absolute before:bg-(--sp-separator-color) before:transition-colors before:duration-(--sp-motion)",
    "data-[orientation=vertical]:before:inset-y-0 data-[orientation=vertical]:before:w-(--sp-separator-line)",
    "data-[orientation=horizontal]:before:inset-x-0 data-[orientation=horizontal]:before:h-(--sp-separator-line)",
    "not-data-disabled:hover:before:bg-(--sp-separator-hover) data-dragging:before:bg-(--sp-separator-active)",
    "focus-visible:before:bg-(--sp-focus-line)",
    "data-disabled:cursor-not-allowed",
);

/** the grip: a pill on the line, lit by the separator's state */
export const grip = cn(
    "palette-raised relative flex items-center justify-center rounded-full",
    "border-(length:--sp-border) border-(--sp-separator-color) bg-palette-base text-palette-accent shadow-(--sp-shadow)",
    "transition-colors duration-(--sp-motion)",
    "group-data-[orientation=vertical]/separator:h-6 group-data-[orientation=vertical]/separator:w-3.5",
    "group-data-[orientation=horizontal]/separator:h-3.5 group-data-[orientation=horizontal]/separator:w-6",
    "group-hover/separator:border-(--sp-separator-hover)",
    "group-data-dragging/separator:border-(--sp-separator-active) group-data-dragging/separator:text-(--sp-separator-active)",
    "group-focus-visible/separator:border-(--sp-focus-line) group-focus-visible/separator:outline-(length:--sp-focus-width) group-focus-visible/separator:outline-(--sp-focus-line)",
);

/** one grip icon, turned a quarter for a horizontal separator */
export const icon =
    "size-3 group-data-[orientation=horizontal]/separator:rotate-90";
