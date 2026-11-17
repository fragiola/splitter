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

export const nested = "h-full";

export const panel =
    "palette-raised flex h-full flex-col gap-1 overflow-auto bg-palette-base p-(--sp-panel-padding)";

export const title = "truncate font-(--sp-title-weight)";

export const text = "text-palette-accent/85";

/**
 * The box is 1px: that is what the engine measures. `::before` is the hit area, 4px on either side
 * of it in every state; `::after` is the sash, a 1px line that grows to 4px and takes the accent
 * colour on hover (after 300ms, and at once when the pointer leaves), while dragging and on focus.
 * `relative z-10` keeps the hit area above the panels it overlaps.
 */
export const separator = cn(
    "palette-raised relative z-10 shrink-0 outline-none select-none",
    "data-[orientation=vertical]:w-px data-[orientation=vertical]:cursor-col-resize",
    "data-[orientation=horizontal]:h-px data-[orientation=horizontal]:cursor-row-resize",
    // the hit area: the same in every state
    "before:absolute",
    "data-[orientation=vertical]:before:inset-y-0 data-[orientation=vertical]:before:-inset-x-1",
    "data-[orientation=horizontal]:before:inset-x-0 data-[orientation=horizontal]:before:-inset-y-1",
    // the sash, centred on the box
    "after:pointer-events-none after:absolute after:bg-(--sp-separator-color)",
    "after:transition-[width,height,background-color] after:duration-(--sp-motion)",
    "data-[orientation=vertical]:after:inset-y-0 data-[orientation=vertical]:after:left-1/2 data-[orientation=vertical]:after:w-px data-[orientation=vertical]:after:-translate-x-1/2",
    "data-[orientation=horizontal]:after:inset-x-0 data-[orientation=horizontal]:after:top-1/2 data-[orientation=horizontal]:after:h-px data-[orientation=horizontal]:after:-translate-y-1/2",
    // hovered, after a short delay
    "not-data-disabled:hover:after:bg-(--sp-separator-active) not-data-disabled:hover:after:delay-300",
    "not-data-disabled:hover:data-[orientation=vertical]:after:w-1 not-data-disabled:hover:data-[orientation=horizontal]:after:h-1",
    // dragged or focused: at once
    "data-dragging:after:bg-(--sp-separator-active) data-dragging:data-[orientation=vertical]:after:w-1 data-dragging:data-[orientation=horizontal]:after:h-1",
    "focus-visible:after:bg-(--sp-focus-line) focus-visible:data-[orientation=vertical]:after:w-1 focus-visible:data-[orientation=horizontal]:after:h-1",
    "data-disabled:cursor-not-allowed",
);
