import { cn } from "#/lib/cn";
import type { Presence, Tone } from "./data";

export const frame = cn(
    "palette-surface flex h-full flex-col gap-2 bg-palette-base p-2 text-palette-contrast",
    "font-(family-name:--sp-font) text-(length:--sp-font-size)",
);

export const toolbar = "flex flex-wrap items-center gap-2";

export const workspace =
    "flex items-center gap-2 ps-1 font-(--sp-title-weight) text-palette-contrast";

export const logo = "size-4 shrink-0 text-palette-accent";

/** the toggle reads as on while the member list shows */
export const toggle =
    "ms-auto aria-pressed:bg-palette-soft aria-pressed:text-palette-contrast";

/** the group fills what is left of the frame; its flex direction is the package's (structural) */
export const group = cn(
    "min-h-0 flex-1 overflow-hidden rounded-(--sp-radius)",
    "border-(length:--sp-border) border-(--sp-panel-line) bg-(--sp-canvas-bg)",
);

/** the channels and the members: a quieter surface than the conversation */
export const side = "palette-surface bg-palette-soft";

export const nav = "flex h-full flex-col gap-0.5 overflow-auto p-2";

export const caption =
    "truncate px-2 pt-1 pb-1.5 text-xs font-(--sp-title-weight) tracking-wide text-palette-accent/85 uppercase";

/** a channel: bold while it has unread messages (`data-unread`), filled while open (`data-active`) */
export const channel = cn(
    "flex w-full items-center gap-1.5 rounded-(--sp-radius) px-2 py-1.5 text-start text-palette-contrast outline-none",
    "hover:bg-palette-base data-active:bg-palette-base data-unread:font-(--sp-title-weight)",
    "focus-visible:outline-(length:--sp-focus-width) focus-visible:-outline-offset-2 focus-visible:outline-(--sp-focus-line)",
);

export const hash = "size-3.5 shrink-0 text-palette-accent/85";

export const name = "min-w-0 flex-1 truncate";

export const count =
    "palette-blue rounded-full bg-palette-soft px-1.5 text-xs font-normal text-palette-accent tabular-nums";

/** the conversation and the thread: the raised surface the messages sit on */
export const pane = "palette-raised flex h-full flex-col bg-palette-base";

export const header = cn(
    "flex shrink-0 items-center gap-2 px-(--sp-panel-padding) py-2",
    "border-b-(length:--sp-border) border-(--sp-panel-line)",
);

export const heading = "flex min-w-0 flex-1 flex-col";

export const title = "truncate font-(--sp-title-weight)";

export const topic = "truncate text-xs text-palette-accent/85";

export const close = "shrink-0";

export const feed = "min-h-0 flex-1 overflow-auto py-2";

/** a message: an avatar beside its byline and text; filled while its thread is open */
export const post = cn(
    "grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 px-(--sp-panel-padding) py-2",
    "hover:bg-palette-soft/60 data-active:bg-palette-soft",
);

const TONES: Record<Tone, string> = {
    blue: "palette-blue",
    green: "palette-green",
    orange: "palette-orange",
    purple: "palette-purple",
};

/** the author's initials on their palette; round, or square where the theme has no radius */
export const avatar = (tone: Tone) =>
    cn(
        TONES[tone],
        "row-span-3 flex size-8 shrink-0 items-center justify-center rounded-[calc(var(--sp-radius)*100)]",
        "bg-palette-base text-xs font-(--sp-title-weight) text-palette-contrast select-none",
    );

export const byline = "flex min-w-0 items-baseline gap-2";

export const author = "truncate font-(--sp-title-weight)";

export const time = "shrink-0 text-xs text-palette-accent/85 tabular-nums";

export const text = "leading-relaxed break-words";

/** the link to a message's thread */
export const replies = cn(
    "palette-blue mt-1 w-fit rounded-(--sp-radius) px-1.5 py-0.5 text-xs font-(--sp-title-weight) text-palette-accent outline-none",
    "hover:bg-palette-soft focus-visible:outline-(length:--sp-focus-width) focus-visible:outline-(--sp-focus-line)",
);

/** the line between the message a thread starts from and its replies */
export const divider = cn(
    "flex items-center gap-2 px-(--sp-panel-padding) py-1 text-xs text-palette-accent/85",
    "after:h-(--sp-border) after:flex-1 after:bg-(--sp-panel-line)",
);

/** a message box: the input and its send button in one frame */
export const composer = cn(
    "m-(--sp-panel-padding) mt-0 flex shrink-0 items-center gap-1 rounded-(--sp-radius) bg-palette-soft py-1 ps-3 pe-1",
    "border-(length:--sp-border) border-(--sp-panel-line)",
    "focus-within:outline-(length:--sp-focus-width) focus-within:outline-(--sp-focus-line)",
);

export const input =
    "min-w-0 flex-1 bg-transparent py-1 text-palette-contrast outline-none placeholder:text-palette-accent/70";

export const send = "shrink-0";

export const people = "flex flex-col gap-0.5";

export const person = "flex items-center gap-2 rounded-(--sp-radius) px-2 py-1";

/** a smaller avatar for the member list */
export const face = (tone: Tone) =>
    cn(
        TONES[tone],
        "flex size-6 shrink-0 items-center justify-center rounded-[calc(var(--sp-radius)*100)]",
        "bg-palette-base text-[0.625rem] font-(--sp-title-weight) text-palette-contrast select-none",
    );

export const who = "flex min-w-0 flex-1 flex-col leading-tight";

export const role = "truncate text-xs text-palette-accent/85";

const PRESENCE: Record<Presence, string> = {
    online: "palette-green bg-palette-base",
    away: "palette-orange bg-palette-base",
    offline: "border-(length:--sp-border) border-palette-accent/70",
};

/** the presence dot: green online, orange away, an empty ring offline (its group says it in words) */
export const presence = (status: Presence) =>
    cn("size-2 shrink-0 rounded-full", PRESENCE[status]);

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
