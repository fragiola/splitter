// The log tail's rule: it follows the newest line while it is scrolled to the bottom, and holds
// where the reader scrolled. Only the reader's scrolls decide. A scroll the browser makes because
// the tail's height changed (its panel resized: the browser keeps the visible lines in place)
// leaves the tail following as it was, so a drag of a separator never stops it.

/** How close to the bottom the tail still counts as followed, in pixels. */
const FOLLOW = 8;

export interface TailFollower {
    /** after a scroll of `element`: whether the tail follows now, given whether it followed */
    scrolled(element: HTMLElement, following: boolean): boolean;
    /** after a render: scrolls `element` to its newest line while the tail follows */
    rendered(element: HTMLElement, following: boolean): void;
}

export function createTailFollower(): TailFollower {
    // the height the tail had when it last scrolled or rendered
    let height = -1;
    return {
        scrolled(element, following) {
            const resized = element.clientHeight !== height;
            height = element.clientHeight;
            if (resized) return following;
            const { scrollHeight, scrollTop, clientHeight } = element;
            return scrollHeight - scrollTop - clientHeight < FOLLOW;
        },
        rendered(element, following) {
            height = element.clientHeight;
            if (following) element.scrollTop = element.scrollHeight;
        },
    };
}
