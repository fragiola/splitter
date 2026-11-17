// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CommandEvent, PanelAddPayload } from "../../src/commands/types";
import { veto } from "../../src/commands/types";
import {
    createSplitterEngine,
    type SplitterEngine,
} from "../../src/engine/splitter-engine";
import type { EngineEvent } from "../../src/engine/verbs";
import { createSplitterModel, type SplitterModel } from "../../src/state/model";
import type { Orientation } from "../../src/state/types";

type PanelSpec = Omit<PanelAddPayload, "groupId"> & { id: string };

/** Gives an element a layout size and a client rect along both axes. */
function sized(element: HTMLElement, size: number): HTMLElement {
    Object.defineProperty(element, "offsetWidth", {
        configurable: true,
        value: size,
    });
    Object.defineProperty(element, "offsetHeight", {
        configurable: true,
        value: size,
    });
    element.getBoundingClientRect = () =>
        ({
            width: size,
            height: size,
            x: 0,
            y: 0,
            top: 0,
            left: 0,
            right: size,
            bottom: size,
        }) as DOMRect;
    return element;
}

interface Fixture {
    model: SplitterModel;
    engine: SplitterEngine;
    root: HTMLElement;
    panels: Map<string, HTMLElement>;
    separators: Map<string, HTMLElement>;
    events: CommandEvent[];
    sizes: () => number[];
}

let cleanup: (() => void)[] = [];
afterEach(() => {
    for (const fn of cleanup) fn();
    cleanup = [];
    document.body.innerHTML = "";
});

/**
 * Renders a group the way an adapter does: the markup first, then one batch registering the
 * group and its panels, then the elements bound. Each panel's element is `size` pixels.
 */
function render(
    specs: PanelSpec[],
    options: {
        orientation?: Orientation;
        dir?: "ltr" | "rtl";
        size?: number;
        engine?: Parameters<typeof createSplitterEngine>[1];
    } = {},
): Fixture {
    const model = createSplitterModel();
    const engine = createSplitterEngine(model, options.engine);
    cleanup.push(() => engine.adapter.destroy());
    const root = document.createElement("div");
    if (options.dir) root.style.direction = options.dir;
    document.body.append(root);
    const panelSize = options.size ?? 250;
    model.run("batch", {
        commands: [
            {
                command: "group.add",
                payload: {
                    id: "g",
                    orientation: options.orientation ?? "horizontal",
                },
            },
            ...specs.map((spec, order) => ({
                command: "panel.add" as const,
                payload: { ...spec, groupId: "g", order },
            })),
        ],
    });
    const panels = new Map<string, HTMLElement>();
    const separators = new Map<string, HTMLElement>();
    specs.forEach((spec, index) => {
        if (index > 0) {
            const separator = document.createElement("div");
            separator.setPointerCapture = vi.fn();
            separator.hasPointerCapture = vi.fn(() => true);
            separator.releasePointerCapture = vi.fn();
            separator.tabIndex = 0;
            root.append(separator);
            separators.set(`${specs[index - 1]?.id}:${spec.id}`, separator);
        }
        const panel = sized(document.createElement("div"), panelSize);
        panel.id = `dom-${spec.id}`;
        root.append(panel);
        panels.set(spec.id, panel);
    });
    engine.adapter.bindGroup("g", root);
    for (const [id, element] of panels) engine.adapter.bindPanel(id, element);
    for (const [id, element] of separators)
        engine.adapter.bindSeparator(id, element);
    const events: CommandEvent[] = [];
    model.subscribe((event) => events.push(event));
    const sizes = () => {
        const group = model.get("group-by", { id: "g" });
        return group ? group.panelIds.map((id) => group.layout[id] ?? -1) : [];
    };
    return { model, engine, root, panels, separators, events, sizes };
}

function element<V>(map: Map<string, V>, key: string): V {
    const value = map.get(key);
    if (value === undefined) throw new Error(`no ${key}`);
    return value;
}

function pointer(
    target: HTMLElement,
    type: string,
    init: PointerEventInit = {},
) {
    const event = new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        isPrimary: true,
        pointerType: "mouse",
        button: 0,
        ...init,
    });
    target.dispatchEvent(event);
    return event;
}

function key(target: HTMLElement, name: string, init: KeyboardEventInit = {}) {
    const event = new KeyboardEvent("keydown", {
        key: name,
        bubbles: true,
        cancelable: true,
        ...init,
    });
    target.dispatchEvent(event);
    return event;
}

describe("binding and measuring", () => {
    it("measures a group through its element's window and reports it as a transient step", () => {
        const { model } = render([{ id: "a", minSize: 100 }, { id: "b" }]);
        expect(model.get("group-by", { id: "g" })?.measure).toEqual({
            axisSize: 500,
            fontSize: 16,
            rootFontSize: 16,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
        });
        expect(
            model.get("panel-constraints-by", { panelId: "a" })?.minSize,
        ).toBe(20);
    });

    it("observes size changes with the window's ResizeObserver", () => {
        const callbacks: (() => void)[] = [];
        const observed: Element[] = [];
        const view = window as Window & { ResizeObserver?: unknown };
        const original = view.ResizeObserver;
        view.ResizeObserver = class {
            constructor(callback: () => void) {
                callbacks.push(callback);
            }
            observe(target: Element) {
                observed.push(target);
            }
            unobserve() {}
            disconnect() {}
        };
        cleanup.push(() => {
            view.ResizeObserver = original;
        });
        const { model, panels, root, events } = render([
            {
                id: "a",
                defaultSize: 100,
                groupResizeBehavior: "preserve-pixel-size",
            },
            { id: "b" },
        ]);
        expect(observed).toContain(root);
        expect(observed).toContain(element(panels, "a"));
        expect(model.get("layout-by", { groupId: "g" })).toEqual({
            a: 20,
            b: 80,
        });
        model.run("panel.resize", { panelId: "b", size: "60%" });
        // the group doubles: the fixed panel keeps its pixels
        sized(element(panels, "a"), 400);
        sized(element(panels, "b"), 600);
        for (const callback of callbacks) callback();
        expect(model.get("group-by", { id: "g" })?.measure?.axisSize).toBe(
            1000,
        );
        expect(model.get("layout-by", { groupId: "g" })).toEqual({
            a: 20,
            b: 80,
        });
        expect(events.at(-1)).toMatchObject({
            command: "group.measure",
            transient: true,
        });
    });

    it("measures again when a panel bound before it registered joins the group", () => {
        const { model, engine, root } = render([{ id: "a" }, { id: "b" }]);
        const c = sized(document.createElement("div"), 500);
        root.append(c);
        engine.adapter.bindPanel("c", c);
        expect(model.get("group-by", { id: "g" })?.measure?.axisSize).toBe(500);
        model.run("panel.add", { id: "c", groupId: "g" });
        expect(model.get("group-by", { id: "g" })?.measure?.axisSize).toBe(
            1000,
        );
    });

    it("does not report a measure that did not change", () => {
        const { engine, events } = render([{ id: "a" }, { id: "b" }]);
        engine.adapter.bindPanel(
            "a",
            element(
                new Map([["a", sized(document.createElement("div"), 250)]]),
                "a",
            ),
        );
        expect(
            events.filter(({ command }) => command === "group.measure"),
        ).toEqual([]);
        expect(engine.run("measure", { groupId: "g" })).toEqual({
            ok: true,
            value: { groupIds: ["g"] },
        });
        expect(
            events.filter(({ command }) => command === "group.measure"),
        ).toHaveLength(1);
    });
});

describe("pointer drags", () => {
    it("captures the pointer, runs transient steps, then one final command", () => {
        const { model, engine, separators, events, sizes } = render([
            { id: "a" },
            { id: "b" },
        ]);
        const separator = element(separators, "a:b");
        const engineEvents: EngineEvent[] = [];
        engine.subscribe((event) => engineEvents.push(event));

        pointer(separator, "pointerdown", { clientX: 250, clientY: 0 });
        expect(separator.setPointerCapture).toHaveBeenCalledWith(1);
        expect(engine.is("separator-dragging", { separatorId: "a:b" })).toBe(
            true,
        );
        expect(engine.is("group-dragging", { groupId: "g" })).toBe(true);
        expect(engine.get("dragging-separator-id")).toBe("a:b");

        pointer(separator, "pointermove", { clientX: 300 });
        expect(sizes()).toEqual([60, 40]);
        pointer(separator, "pointermove", { clientX: 350 });
        expect(sizes()).toEqual([70, 30]);
        // another pointer is ignored
        pointer(separator, "pointermove", { clientX: 0, pointerId: 2 });
        expect(sizes()).toEqual([70, 30]);
        pointer(separator, "pointerup", { clientX: 350 });

        const moves = events.filter(
            ({ command }) => command === "separator.move",
        );
        expect(moves.map(({ transient }) => transient)).toEqual([
            true,
            true,
            false,
        ]);
        expect(moves.at(-1)?.payload).toEqual({
            separatorId: "a:b",
            delta: 20,
            origin: { a: 50, b: 50 },
            source: "pointer",
        });
        expect(sizes()).toEqual([70, 30]);
        expect(engine.is("separator-dragging", { separatorId: "a:b" })).toBe(
            false,
        );
        expect(engineEvents.filter(({ type }) => type === "dragging")).toEqual([
            { type: "dragging", separatorId: "a:b" },
            { type: "dragging", separatorId: undefined },
        ]);
        expect(model.get("layout-by", { groupId: "g" })).toEqual({
            a: 70,
            b: 30,
        });
    });

    it("restores the layout when middleware vetoes the final command", () => {
        const { model, separators, events, sizes } = render([
            { id: "a" },
            { id: "b" },
        ]);
        model.use((ctx, next) =>
            ctx.command === "separator.move" && !ctx.transient
                ? veto("not now")
                : next(),
        );
        const separator = element(separators, "a:b");
        pointer(separator, "pointerdown", { clientX: 250 });
        pointer(separator, "pointermove", { clientX: 400 });
        expect(sizes()).toEqual([80, 20]);
        pointer(separator, "pointerup", { clientX: 400 });
        expect(sizes()).toEqual([50, 50]);
        expect(events.at(-1)).toMatchObject({
            command: "group.set-layout",
            transient: true,
            meta: { restore: true },
        });
        expect(
            events.some(
                ({ command, transient }) =>
                    command === "separator.move" && !transient,
            ),
        ).toBe(false);
    });

    it("emits no command for a click without a move", () => {
        const { separators, events } = render([{ id: "a" }, { id: "b" }]);
        const separator = element(separators, "a:b");
        pointer(separator, "pointerdown", { clientX: 250 });
        pointer(separator, "pointerup", { clientX: 250 });
        expect(events).toEqual([]);
    });

    it("commits the last step when the pointer is cancelled", () => {
        const { separators, events, sizes } = render([
            { id: "a" },
            { id: "b" },
        ]);
        const separator = element(separators, "a:b");
        pointer(separator, "pointerdown", { clientX: 250 });
        pointer(separator, "pointermove", { clientX: 200 });
        pointer(separator, "pointercancel", { clientX: 0 });
        expect(sizes()).toEqual([40, 60]);
        expect(events.at(-1)).toMatchObject({
            command: "separator.move",
            transient: false,
        });
    });

    it("mirrors the drag in right-to-left", () => {
        const { separators, sizes, engine } = render(
            [{ id: "a" }, { id: "b" }],
            { dir: "rtl" },
        );
        expect(engine.get("direction-by", { groupId: "g" })).toBe("rtl");
        const separator = element(separators, "a:b");
        pointer(separator, "pointerdown", { clientX: 250 });
        pointer(separator, "pointermove", { clientX: 300 });
        pointer(separator, "pointerup", { clientX: 300 });
        expect(sizes()).toEqual([40, 60]);
    });

    it("follows a dir switched at runtime on an ancestor, without a measure", async () => {
        const { root, engine, separators, sizes } = render([
            { id: "a" },
            { id: "b" },
        ]);
        const views: EngineEvent[] = [];
        engine.subscribe((event) => views.push(event));
        expect(engine.get("direction-by", { groupId: "g" })).toBe("ltr");
        // jsdom computes no direction from dir: the style gives it, the attribute triggers it
        root.style.direction = "rtl";
        document.body.setAttribute("dir", "rtl");
        await Promise.resolve();
        expect(engine.get("direction-by", { groupId: "g" })).toBe("rtl");
        expect(views).toContainEqual({
            type: "direction",
            groupId: "g",
            direction: "rtl",
        });
        const separator = element(separators, "a:b");
        pointer(separator, "pointerdown", { clientX: 250 });
        pointer(separator, "pointermove", { clientX: 300 });
        pointer(separator, "pointerup", { clientX: 300 });
        expect(sizes()).toEqual([40, 60]);
        // a dir inside the group's content is not the group's
        root.style.direction = "ltr";
        const inner = document.createElement("p");
        root.append(inner);
        inner.setAttribute("dir", "ltr");
        await Promise.resolve();
        expect(engine.get("direction-by", { groupId: "g" })).toBe("rtl");
        document.body.removeAttribute("dir");
    });

    it("drags a vertical group along y", () => {
        const { separators, sizes } = render([{ id: "a" }, { id: "b" }], {
            orientation: "vertical",
        });
        const separator = element(separators, "a:b");
        pointer(separator, "pointerdown", { clientX: 0, clientY: 250 });
        pointer(separator, "pointermove", { clientX: 400, clientY: 200 });
        pointer(separator, "pointerup", { clientX: 400, clientY: 200 });
        expect(sizes()).toEqual([40, 60]);
    });

    it("ignores secondary buttons and disabled separators", () => {
        const { model, separators, events } = render([
            { id: "a" },
            { id: "b" },
        ]);
        const separator = element(separators, "a:b");
        pointer(separator, "pointerdown", { clientX: 250, button: 2 });
        pointer(separator, "pointermove", { clientX: 300 });
        model.run("separator.update", { separatorId: "a:b", disabled: true });
        pointer(separator, "pointerdown", { clientX: 250 });
        pointer(separator, "pointermove", { clientX: 300 });
        pointer(separator, "pointerup", { clientX: 300 });
        expect(events.map(({ command }) => command)).toEqual([
            "separator.update",
        ]);
        expect(separator.setPointerCapture).not.toHaveBeenCalled();
    });
});

describe("the keyboard (Window Splitter)", () => {
    it("moves the separator with the arrows in left-to-right", () => {
        const { separators, sizes } = render([{ id: "a" }, { id: "b" }]);
        const separator = element(separators, "a:b");
        expect(key(separator, "ArrowRight").defaultPrevented).toBe(true);
        expect(sizes()).toEqual([55, 45]);
        key(separator, "ArrowLeft");
        key(separator, "ArrowLeft");
        expect(sizes()).toEqual([45, 55]);
        expect(key(separator, "ArrowUp").defaultPrevented).toBe(false);
        expect(sizes()).toEqual([45, 55]);
    });

    it("mirrors the arrows in right-to-left", () => {
        const { separators, sizes } = render([{ id: "a" }, { id: "b" }], {
            dir: "rtl",
        });
        const separator = element(separators, "a:b");
        key(separator, "ArrowLeft");
        expect(sizes()).toEqual([55, 45]);
        key(separator, "ArrowRight");
        key(separator, "ArrowRight");
        expect(sizes()).toEqual([45, 55]);
    });

    it("uses up and down in a vertical group, with the configured step", () => {
        const { separators, sizes } = render([{ id: "a" }, { id: "b" }], {
            orientation: "vertical",
            engine: { keyboardStep: 10 },
        });
        const separator = element(separators, "a:b");
        key(separator, "ArrowDown");
        expect(sizes()).toEqual([60, 40]);
        key(separator, "ArrowUp");
        key(separator, "ArrowUp");
        expect(sizes()).toEqual([40, 60]);
    });

    it("moves to the limits with Home and End, and toggles collapse with Enter", () => {
        const { model, separators, sizes } = render([
            { id: "a", collapsible: true, minSize: "20%", maxSize: "70%" },
            { id: "b" },
        ]);
        const separator = element(separators, "a:b");
        key(separator, "End");
        expect(sizes()).toEqual([70, 30]);
        key(separator, "Home");
        expect(sizes()).toEqual([0, 100]);
        // it expands back to its size before collapsing
        key(separator, "Enter");
        expect(sizes()).toEqual([70, 30]);
        model.run("panel.resize", { panelId: "a", size: "40%" });
        key(separator, "Enter");
        expect(model.is("panel-collapsed", { panelId: "a" })).toBe(true);
        key(separator, "Enter");
        expect(sizes()).toEqual([40, 60]);
    });

    it("collapses and expands with Enter across that separator only, as a keyboard move", () => {
        const { model, separators, sizes, events } = render([
            { id: "a" },
            { id: "b", collapsible: true, minSize: "20%" },
            { id: "c", maxSize: "50%" },
        ]);
        model.run("group.set-layout", {
            groupId: "g",
            layout: { a: 25, b: 25, c: 50 },
        });
        events.length = 0;
        // c cannot take b's space, and a is behind another separator
        key(element(separators, "b:c"), "Enter");
        expect(sizes()).toEqual([25, 25, 50]);
        model.run("panel.update", { panelId: "c", maxSize: null });
        model.run("group.set-layout", {
            groupId: "g",
            layout: { a: 40, b: 30, c: 30 },
        });
        events.length = 0;
        key(element(separators, "b:c"), "Enter");
        expect(sizes()).toEqual([40, 0, 60]);
        expect(
            events.map(({ command, payload }) => [command, payload]),
        ).toEqual([
            [
                "separator.move",
                { separatorId: "b:c", delta: -30, source: "keyboard" },
            ],
        ]);
        key(element(separators, "b:c"), "Enter");
        expect(sizes()).toEqual([40, 30, 30]);
    });

    it("leaves disabled panels alone on Enter", () => {
        const before = render([
            { id: "a", collapsible: true, minSize: "20%", disabled: true },
            { id: "b" },
        ]);
        key(element(before.separators, "a:b"), "Enter");
        expect(before.sizes()).toEqual([50, 50]);
        const after = render([
            { id: "c", collapsible: true, minSize: "20%" },
            { id: "d", disabled: true },
        ]);
        key(element(after.separators, "c:d"), "Enter");
        expect(after.sizes()).toEqual([50, 50]);
    });

    it("does nothing on Enter when the panel before is not collapsible", () => {
        const { separators, events } = render([{ id: "a" }, { id: "b" }]);
        key(element(separators, "a:b"), "Enter");
        expect(events).toEqual([]);
    });

    it("moves focus between separators with F6", () => {
        const { separators } = render([{ id: "a" }, { id: "b" }, { id: "c" }]);
        const first = element(separators, "a:b");
        const second = element(separators, "b:c");
        first.focus();
        key(first, "F6");
        expect(document.activeElement).toBe(second);
        key(second, "F6");
        expect(document.activeElement).toBe(first);
        key(first, "F6", { shiftKey: true });
        expect(document.activeElement).toBe(second);
    });

    it("ignores a disabled separator and an event already handled", () => {
        const { model, root, separators, sizes } = render([
            { id: "a" },
            { id: "b" },
        ]);
        const separator = element(separators, "a:b");
        root.addEventListener("keydown", (event) => event.preventDefault(), {
            capture: true,
        });
        key(separator, "ArrowRight");
        expect(sizes()).toEqual([50, 50]);
        const other = render([{ id: "c" }, { id: "d" }]);
        other.model.run("group.update", { groupId: "g", disabled: true });
        key(element(other.separators, "c:d"), "ArrowRight");
        expect(other.sizes()).toEqual([50, 50]);
        expect(model.get("layout-by", { groupId: "g" })).toEqual({
            a: 50,
            b: 50,
        });
    });
});

describe("ARIA values", () => {
    it("gives each separator its Window Splitter attributes", () => {
        const { engine, model } = render([
            { id: "a", minSize: "10%", maxSize: "80%" },
            { id: "b", minSize: "30%" },
            { id: "c" },
        ]);
        model.run("group.set-layout", {
            groupId: "g",
            layout: { a: 30, b: 40, c: 30 },
        });
        expect(engine.get("separator-aria-by", { separatorId: "a:b" })).toEqual(
            {
                role: "separator",
                "aria-orientation": "vertical",
                "aria-valuenow": 30,
                "aria-valuemin": 10,
                "aria-valuemax": 70,
                "aria-controls": "dom-a",
            },
        );
        model.run("separator.update", { separatorId: "b:c", disabled: true });
        expect(
            engine.get("separator-aria-by", { separatorId: "b:c" }),
        ).toMatchObject({
            "aria-valuenow": 40,
            "aria-disabled": true,
        });
        expect(
            engine.get("separator-aria-by", { separatorId: "x:y" }),
        ).toBeUndefined();
    });

    it("is horizontal in a vertical group, and the same in right-to-left", () => {
        const vertical = render([{ id: "a" }, { id: "b" }], {
            orientation: "vertical",
        });
        expect(
            vertical.engine.get("separator-aria-by", { separatorId: "a:b" })?.[
                "aria-orientation"
            ],
        ).toBe("horizontal");
        const rtl = render([{ id: "c" }, { id: "d" }], { dir: "rtl" });
        expect(
            rtl.engine.get("separator-aria-by", { separatorId: "c:d" }),
        ).toMatchObject({
            "aria-orientation": "vertical",
            "aria-valuenow": 50,
            "aria-valuemin": 0,
            "aria-valuemax": 100,
        });
    });
});

describe("double click", () => {
    it("resets the panel with a default size", () => {
        const { model, separators, sizes } = render([
            { id: "a", defaultSize: 150 },
            { id: "b" },
        ]);
        model.run("panel.resize", { panelId: "a", size: "70%" });
        element(separators, "a:b").dispatchEvent(
            new MouseEvent("dblclick", { bubbles: true, cancelable: true }),
        );
        expect(sizes()).toEqual([30, 70]);
    });

    it("does not reset when a panel beside the separator is disabled", () => {
        for (const disabled of ["a", "b"]) {
            const { model, separators, sizes } = render([
                { id: "a", defaultSize: "30%", disabled: disabled === "a" },
                { id: "b", disabled: disabled === "b" },
            ]);
            model.run("group.set-layout", {
                groupId: "g",
                layout: { a: 60, b: 40 },
            });
            const event = new MouseEvent("dblclick", {
                bubbles: true,
                cancelable: true,
            });
            element(separators, "a:b").dispatchEvent(event);
            expect(sizes()).toEqual([60, 40]);
            expect(event.defaultPrevented).toBe(false);
            expect(
                model.is("separator-resettable", { separatorId: "a:b" }),
            ).toBe(false);
        }
    });

    it("can be turned off for the engine or for one separator", () => {
        for (const off of ["engine", "separator"] as const) {
            const { model, separators, sizes } = render(
                [{ id: "a", defaultSize: "30%" }, { id: "b" }],
                off === "engine"
                    ? { engine: { resetOnDoubleClick: false } }
                    : {},
            );
            if (off === "separator") {
                model.run("separator.update", {
                    separatorId: "a:b",
                    resetOnDoubleClick: false,
                });
            }
            model.run("panel.resize", { panelId: "a", size: "70%" });
            element(separators, "a:b").dispatchEvent(
                new MouseEvent("dblclick", { bubbles: true }),
            );
            expect(sizes()).toEqual([70, 30]);
        }
    });
});

describe("panel order from the document", () => {
    it("sorts a conditional panel by its document position", () => {
        const { model, engine, root, panels, events } = render([
            { id: "a" },
            { id: "c" },
        ]);
        // the adapter adds "b", rendered between "a" and "c", with no order it knows
        const b = sized(document.createElement("div"), 250);
        root.insertBefore(b, element(panels, "c"));
        model.run("panel.add", { id: "b", groupId: "g" });
        engine.adapter.bindPanel("b", b);
        expect(model.get("group-by", { id: "g" })?.panelIds).toEqual([
            "a",
            "c",
            "b",
        ]);
        expect(engine.adapter.syncOrder("g").ok).toBe(true);
        expect(model.get("group-by", { id: "g" })?.panelIds).toEqual([
            "a",
            "b",
            "c",
        ]);
        // the adapter's own step: a listener tells it from the user's
        expect(events.at(-1)).toMatchObject({
            command: "batch",
            meta: { source: "adapter" },
        });
        expect(
            model.get("separators-by", { groupId: "g" }).map(({ id }) => id),
        ).toEqual(["a:b", "b:c"]);
        expect(engine.adapter.syncOrder("g")).toEqual({
            ok: true,
            value: { results: [] },
        });
        expect(engine.adapter.syncOrder("nope").ok).toBe(false);
    });

    it("runs before the separator element's own listeners, even those added before it bound", () => {
        const model = createSplitterModel();
        const engine = createSplitterEngine(model);
        cleanup.push(() => engine.adapter.destroy());
        const root = document.createElement("div");
        const separator = document.createElement("div");
        const seen: string[] = [];
        // a framework that attaches the element's listeners as it creates it (Angular)
        separator.addEventListener("keydown", (event) =>
            seen.push(`own:${event.defaultPrevented}`),
        );
        separator.addEventListener("dblclick", (event) =>
            seen.push(`own:${event.defaultPrevented}`),
        );
        root.append(
            sized(document.createElement("div"), 250),
            separator,
            sized(document.createElement("div"), 250),
        );
        document.body.append(root);
        model.run("batch", {
            commands: [
                { command: "group.add", payload: { id: "g" } },
                {
                    command: "panel.add",
                    payload: { id: "a", groupId: "g", defaultSize: "30%" },
                },
                { command: "panel.add", payload: { id: "b", groupId: "g" } },
            ],
        });
        engine.adapter.bindGroup("g", root);
        engine.adapter.syncSeparators("g", [separator]);
        model.subscribe(({ after }) =>
            seen.push(`layout:${after.groups.g?.layout.a}`),
        );
        key(separator, "ArrowRight");
        separator.dispatchEvent(
            new MouseEvent("dblclick", { bubbles: true, cancelable: true }),
        );
        expect(seen).toEqual([
            "layout:35",
            "own:true",
            "layout:30",
            "own:true",
        ]);
    });

    it("keeps a separator element's listeners when it is rebound under a new id", () => {
        const { model, engine, separators, sizes } = render([
            { id: "a" },
            { id: "c" },
        ]);
        const separator = element(separators, "a:c");
        model.run("panel.add", { id: "b", groupId: "g", order: 2 });
        engine.adapter.bindSeparator("c:b", separator);
        key(separator, "ArrowRight");
        expect(sizes()).toEqual([33.334, 38.333, 28.333]);
    });
});

describe("the engine's verbs", () => {
    it("answers can, check and dispatch, and runs middleware around actions", () => {
        const { engine, separators } = render([{ id: "a" }, { id: "b" }]);
        expect(engine.can("focus-separator", { separatorId: "a:b" })).toBe(
            true,
        );
        expect(
            engine.check("focus-separator", { separatorId: "x:y" }),
        ).toMatchObject({
            ok: false,
            error: { code: "not_found", path: "/separatorId" },
        });
        expect(engine.check("measure", { groupId: "nope" }).ok).toBe(false);
        expect(
            engine.dispatch({
                action: "focus-separator",
                payload: { separatorId: "a:b" },
            }),
        ).toEqual({
            ok: true,
            value: { separatorId: "a:b" },
        });
        expect(document.activeElement).toBe(element(separators, "a:b"));
        expect(
            engine.dispatch({ action: "panel.resize", payload: {} }),
        ).toMatchObject({
            error: { code: "unknown_command" },
        });
        expect(
            engine.dispatch({ action: "measure", payload: { groupId: 1 } }),
        ).toMatchObject({
            error: { code: "invalid_payload", path: "/payload/groupId" },
        });
        expect(engine.dispatch("x")).toMatchObject({
            error: { code: "invalid_payload" },
        });
        const seen: string[] = [];
        const remove = engine.use((ctx, next) => {
            seen.push(`${ctx.action}:${ctx.dryRun}`);
            return ctx.action === "measure" ? veto() : next();
        });
        expect(engine.run("measure", {})).toMatchObject({
            ok: false,
            error: { code: "vetoed" },
        });
        expect(engine.can("focus-separator", { separatorId: "a:b" })).toBe(
            true,
        );
        remove();
        expect(engine.run("measure", {}).ok).toBe(true);
        expect(seen).toEqual(["measure:false", "focus-separator:true"]);
        expect(engine.is("group-bound", { groupId: "g" })).toBe(true);
    });

    it("stops listening once unbound", () => {
        const { model, engine, separators, sizes } = render([
            { id: "a" },
            { id: "b" },
        ]);
        const separator = element(separators, "a:b");
        const rebound = engine.adapter.bindSeparator("a:b", separator);
        rebound();
        key(separator, "ArrowRight");
        expect(sizes()).toEqual([50, 50]);
        engine.adapter.destroy();
        expect(engine.is("group-bound", { groupId: "g" })).toBe(false);
        expect(model.get("layout-by", { groupId: "g" })).toEqual({
            a: 50,
            b: 50,
        });
    });
});

describe("separators bound by document position", () => {
    it("gives the n-th separator element the group's n-th separator, in any order given", () => {
        const { model, engine, root, separators, sizes } = render([
            { id: "a" },
            { id: "b" },
            { id: "c" },
        ]);
        const first = element(separators, "a:b");
        const second = element(separators, "b:c");
        const extra = document.createElement("div");
        root.append(extra);
        expect(
            engine.adapter.syncSeparators("g", [extra, second, first]),
        ).toEqual([undefined, "b:c", "a:b"]);
        key(second, "ArrowRight");
        expect(sizes()).toEqual([33.334, 38.333, 28.333]);
        // a panel removed: the second element has no separator any more, and is unbound
        model.run("panel.remove", { panelId: "c" });
        expect(engine.adapter.syncSeparators("g", [first, second])).toEqual([
            "a:b",
            undefined,
        ]);
        const before = sizes();
        key(second, "ArrowRight");
        expect(sizes()).toEqual(before);
        expect(engine.adapter.syncSeparators("g", [])).toEqual([]);
        expect(engine.adapter.syncSeparators("nope", [first])).toEqual([
            undefined,
        ]);
    });

    it("has no side effect until a group binds, and stops listening to the model once none is", () => {
        const model = createSplitterModel();
        const subscribe = vi.spyOn(model, "subscribe");
        const engine = createSplitterEngine(model);
        expect(subscribe).not.toHaveBeenCalled();
        const root = document.createElement("div");
        document.body.append(root);
        const unbind = engine.adapter.bindGroup("g", root);
        expect(subscribe).toHaveBeenCalledTimes(1);
        unbind();
        // bound again after being unbound (a React StrictMode remount): it listens again
        engine.adapter.bindGroup("g", root);
        expect(subscribe).toHaveBeenCalledTimes(2);
        engine.adapter.destroy();
    });
});
