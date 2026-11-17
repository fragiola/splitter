// What the directive tests share: a component rendered in the document that settles (Angular
// renders on its own scheduler, zoneless, and a group registers after its first render), the parts
// by path, the panels' sizes, keys and pointers to drive.

import { ApplicationRef, type Type } from "@angular/core";
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { vi } from "vitest";

/** Lets Angular render, run its effects and after-render hooks, and the timers they schedule. */
export async function settle(): Promise<void> {
    for (let i = 0; i < 3; i++) {
        await TestBed.inject(ApplicationRef).whenStable();
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
}

/**
 * Renders `component` in the document (focus and events need it) and lets it settle; `prepare`
 * sets its inputs and state before its first render.
 */
export async function render<C>(
    component: Type<C>,
    prepare?: (fixture: ComponentFixture<C>) => void,
): Promise<{ fixture: ComponentFixture<C>; container: HTMLElement; app: C }> {
    const fixture = TestBed.createComponent(component);
    prepare?.(fixture);
    const container = fixture.nativeElement as HTMLElement;
    if (!container.isConnected) {
        document.body.append(container);
    }
    fixture.autoDetectChanges();
    await settle();
    return { fixture, container, app: fixture.componentInstance };
}

/** Every element of a part, in document order. */
export function parts(
    container: Element,
    part: "group" | "panel" | "separator",
): HTMLElement[] {
    return [
        ...container.querySelectorAll<HTMLElement>(
            `[data-splitter-part="${part}"]`,
        ),
    ];
}

/** The one element of a part at a path. */
export function at(container: Element, path: string): HTMLElement {
    const element = container.querySelector<HTMLElement>(
        `[data-splitter-path="${path}"]`,
    );
    if (!element) throw new Error(`nothing at ${path}`);
    return element;
}

/** Each panel's flex grow factor, in document order (its size in percent once registered). */
export function grows(container: Element): number[] {
    return parts(container, "panel").map((panel) =>
        Number(panel.style.flexGrow),
    );
}

/** Presses a key on an element, as a focused separator receives it, and lets Angular render. */
export async function press(element: HTMLElement, key: string): Promise<void> {
    element.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
    );
    await settle();
}

/** Double clicks an element and lets Angular render. */
export async function doubleClick(element: HTMLElement): Promise<void> {
    element.dispatchEvent(
        new MouseEvent("dblclick", { bubbles: true, cancelable: true }),
    );
    await settle();
}

/**
 * Gives every panel a client rect `size` pixels wide and high, so a pointer drag has an axis size
 * to divide by (jsdom lays nothing out). Restored after the test.
 */
export function stubPanelRects(size = 500): void {
    const original = HTMLElement.prototype.getBoundingClientRect;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
        function (this: HTMLElement) {
            if (this.dataset.splitterPart === "panel") {
                return {
                    width: size,
                    height: size,
                    x: 0,
                    y: 0,
                    top: 0,
                    left: 0,
                    right: size,
                    bottom: size,
                    toJSON: () => ({}),
                } as DOMRect;
            }
            return original.call(this);
        },
    );
}

/** Dispatches a primary mouse pointer event, then lets Angular render. */
export async function pointer(
    target: HTMLElement,
    type: string,
    init: PointerEventInit = {},
): Promise<void> {
    target.dispatchEvent(
        new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerId: 1,
            isPrimary: true,
            pointerType: "mouse",
            button: 0,
            ...init,
        }),
    );
    await settle();
}
