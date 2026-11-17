// From Dockable (fragiola/dockable, packages/angular/src/lib/utils/helpers.ts), same author and licence.
// What the directives share: the host element, the boolean inputs, the `data-*` values of the host
// bindings, and the structural style written onto the host.

import {
    DestroyRef,
    ElementRef,
    effect,
    inject,
    untracked,
} from "@angular/core";

/**
 * A `data-*` attribute's value for a host binding: `true` → present (empty), `false` or
 * `undefined` → absent (`null`), never `"false"`.
 */
export function dataAttr(
    value: boolean | string | number | undefined | null,
): string | null {
    if (value === true) {
        return "";
    }
    if (value === false || value === undefined || value === null) {
        return null;
    }
    return String(value);
}

/** The host element of the directive being created. */
export function injectHost(): HTMLElement {
    return inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
}

/** Runs `teardown` when the directive (or component) being created is destroyed. */
export function onDestroy(teardown: () => void): void {
    inject(DestroyRef).onDestroy(teardown);
}

/** `true` for a bare attribute (`<div splitterPanel collapsible>`), else the value as a boolean. */
export function booleanInput(value: unknown): boolean {
    return value === "" || (value !== "false" && Boolean(value));
}

/** Like {@link booleanInput}, keeping `undefined` (the core's default). */
export function optionalBoolean(value: unknown): boolean | undefined {
    return value === undefined || value === null
        ? undefined
        : booleanInput(value);
}

/** Structural inline style, camelCase keys (`flexGrow`): an undefined value leaves the key alone. */
export type StructuralStyle = Readonly<
    Record<string, string | number | undefined>
>;

const kebab = (key: string) =>
    key.startsWith("--")
        ? key
        : key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

/**
 * Applies a part's structural style to its element, and keeps it applied as it changes: the keys
 * it sets win over the consumer's static `style` (the directive writes them after the element is
 * created; a host style binding would lose to it); a key it stops setting gets the consumer's
 * value back. Every other key of the consumer's style is untouched.
 */
export function bindStructuralStyle(
    element: HTMLElement,
    style: () => StructuralStyle,
): void {
    /** the keys set now, with the consumer's value they replaced */
    const owned = new Map<string, string>();
    effect(() => {
        const next = new Map<string, string>();
        for (const [key, value] of Object.entries(style())) {
            if (value !== undefined) {
                next.set(kebab(key), String(value));
            }
        }
        untracked(() => {
            for (const [name, previous] of owned) {
                if (!next.has(name)) {
                    if (previous === "") {
                        element.style.removeProperty(name);
                    } else {
                        element.style.setProperty(name, previous);
                    }
                    owned.delete(name);
                }
            }
            for (const [name, value] of next) {
                if (!owned.has(name)) {
                    owned.set(name, element.style.getPropertyValue(name));
                }
                if (element.style.getPropertyValue(name) !== value) {
                    element.style.setProperty(name, value);
                }
            }
        });
    });
}
