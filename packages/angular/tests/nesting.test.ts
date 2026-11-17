import { Component, effect, input, signal } from "@angular/core";
import { describe, expect, it, vi } from "vitest";
import {
    type CommandEvent,
    createSplitterModel,
    createSplitterRef,
    injectGroup,
    injectSplitter,
    SPLITTER,
    type SplitterContextValue,
    type SplitterRef,
} from "../src/public-api";
import { at, grows, press, render, settle } from "./helpers";

// Nested groups (D3): a group inside a panel joins its parent's model, so one model holds the whole
// layout, and code outside the root reaches it through a splitterRef.

@Component({
    selector: "test-nested",
    imports: [SPLITTER],
    template: `
        <div splitterGroup id="outer" [splitterRef]="splitterRef()">
            <div splitterPanel id="nav" defaultSize="20%"></div>
            <div splitterSeparator></div>
            <div splitterPanel id="main">
                @if (inner()) {
                    <div splitterGroup id="inner" orientation="vertical">
                        <div splitterPanel id="editor"></div>
                        <div splitterSeparator></div>
                        <div splitterPanel id="terminal" defaultSize="25%"></div>
                    </div>
                }
            </div>
        </div>
    `,
})
class Nested {
    readonly splitterRef = signal<SplitterRef | undefined>(undefined);
    readonly inner = signal(true);
}

describe("nested groups", () => {
    it("share one model and one engine, and nest in their panel", async () => {
        const seen: Record<string, () => SplitterContextValue> = {};
        @Component({ selector: "test-probe", template: "" })
        class Probe {
            readonly name = input.required<string>();
            readonly splitter = injectSplitter();
            constructor() {
                effect(() => {
                    seen[this.name()] = this.splitter;
                });
            }
        }
        @Component({
            selector: "test-shared",
            imports: [SPLITTER, Probe],
            template: `
                <div splitterGroup id="outer">
                    <test-probe name="outer" />
                    <div splitterPanel id="a"></div>
                    <div splitterSeparator></div>
                    <div splitterPanel id="b">
                        <div splitterGroup id="inner">
                            <test-probe name="inner" />
                            <div splitterPanel id="x"></div>
                            <div splitterSeparator></div>
                            <div splitterPanel id="y"></div>
                        </div>
                    </div>
                </div>
            `,
        })
        class Shared {}
        await render(Shared);
        const outer = seen.outer?.();
        const inner = seen.inner?.();
        expect(inner?.model).toBe(outer?.model);
        expect(inner?.engine).toBe(outer?.engine);
        expect(outer?.groupId).toBe("outer");
        expect(inner?.groupId).toBe("inner");
        const model = outer?.model;
        expect(
            model
                ?.get("groups")
                .map(({ id }) => id)
                .sort(),
        ).toEqual(["inner", "outer"]);
        expect(model?.get("group-by", { id: "inner" })?.parentPanelId).toBe(
            "b",
        );
        // nothing changed yet: the document saves no group
        expect(model?.get("splitter-json").groups).toHaveLength(0);
        model?.run("group.set-layout", {
            groupId: "inner",
            layout: { x: 30, y: 70 },
        });
        model?.run("group.set-layout", {
            groupId: "outer",
            layout: { a: 40, b: 60 },
        });
        expect(model?.get("splitter-json").groups).toHaveLength(2);
    });

    it("give every element its path from the root", async () => {
        const { container } = await render(Nested);
        expect(
            [...container.querySelectorAll<HTMLElement>("*")].map(
                (element) => element.dataset.splitterPath,
            ),
        ).toEqual([
            "/g0",
            "/g0/p0",
            "/g0/s0",
            "/g0/p1",
            "/g0/p1/g0",
            "/g0/p1/g0/p0",
            "/g0/p1/g0/s0",
            "/g0/p1/g0/p1",
        ]);
        expect(at(container, "/g0/p1/g0/p1").style.flexGrow).toBe("25");
    });

    it("resize independently: a key on the inner separator moves only the inner group", async () => {
        const { container } = await render(Nested);
        await press(at(container, "/g0/p1/g0/s0"), "ArrowDown");
        expect(at(container, "/g0/p1/g0/p0").style.flexGrow).toBe("80");
        expect(at(container, "/g0/p0").style.flexGrow).toBe("20");
    });

    it("a nested group is destroyed on its own and the outer one keeps its layout", async () => {
        const ref = createSplitterRef();
        const { app, fixture } = await render(Nested);
        fixture.componentInstance.splitterRef.set(ref);
        await settle();
        app.inner.set(false);
        await settle();
        const model = ref.current?.model;
        expect(model?.get("groups").map(({ id }) => id)).toEqual(["outer"]);
        expect(model?.get("layout-by", { groupId: "outer" })).toEqual({
            nav: 20,
            main: 80,
        });
    });

    it("a group given another model is a root of its own", async () => {
        const other = createSplitterModel();
        @Component({
            selector: "test-own-model",
            imports: [SPLITTER],
            template: `
                <div splitterGroup id="outer">
                    <div splitterPanel id="a">
                        <div splitterGroup id="own" [model]="other">
                            <div splitterPanel id="x"></div>
                        </div>
                    </div>
                </div>
            `,
        })
        class OwnModel {
            readonly other = other;
        }
        await render(OwnModel);
        expect(other.get("groups").map(({ id }) => id)).toEqual(["own"]);
        expect(other.get("group-by", { id: "own" })?.parentPanelId).toBe(
            undefined,
        );
    });

    it("a nested group's state does not change when its parent panel resizes", async () => {
        const model = createSplitterModel();
        let changes = 0;
        @Component({ selector: "test-inner-probe", template: "" })
        class InnerProbe {
            constructor() {
                const group = injectGroup();
                effect(() => {
                    group.state();
                    changes++;
                });
            }
        }
        @Component({
            selector: "test-quiet",
            imports: [SPLITTER, InnerProbe],
            template: `
                <div splitterGroup id="outer" [model]="model">
                    <div splitterPanel id="a">
                        <div splitterGroup id="inner" orientation="vertical">
                            <test-inner-probe />
                            <div splitterPanel id="x"></div>
                            <div splitterSeparator></div>
                            <div splitterPanel id="y"></div>
                        </div>
                    </div>
                    <div splitterSeparator></div>
                    <div splitterPanel id="b"></div>
                </div>
            `,
        })
        class Quiet {
            readonly model = model;
        }
        const { container } = await render(Quiet);
        const events: CommandEvent[] = [];
        model.subscribe((event) => events.push(event));
        const before = changes;
        for (let i = 0; i < 5; i++) {
            await press(at(container, "/g0/s0"), "ArrowRight");
        }
        expect(at(container, "/g0/p0").style.flexGrow).toBe("75");
        expect(changes - before).toBe(0);
        // the outer separator's moves only (and the measures they cause): nothing for the inner group
        expect(
            events
                .filter(({ command }) => command !== "group.measure")
                .map(({ command }) => command),
        ).toEqual(Array(5).fill("separator.move"));
    });

    it("a new parent panel id moves the nested group in place, without creating it again", async () => {
        let created = 0;
        @Component({ selector: "test-content", template: "<i></i>" })
        class Content {
            constructor() {
                created++;
            }
        }
        const model = createSplitterModel();
        @Component({
            selector: "test-move",
            imports: [SPLITTER, Content],
            template: `
                <div splitterGroup id="outer" [model]="model">
                    <div splitterPanel [id]="parentId()">
                        <div splitterGroup id="inner">
                            <div splitterPanel id="x"><test-content /></div>
                            <div splitterSeparator></div>
                            <div splitterPanel id="y"></div>
                            @if (extra()) {
                                <div splitterSeparator></div>
                                <div splitterPanel id="z"></div>
                            }
                        </div>
                    </div>
                    <div splitterSeparator></div>
                    <div splitterPanel id="b"></div>
                </div>
            `,
        })
        class Move {
            readonly model = model;
            readonly parentId = signal("a");
            readonly extra = signal(false);
        }
        const { container, app } = await render(Move);
        await press(at(container, "/g0/p0/g0/s0"), "ArrowRight");
        // another set of panels remembers the layout the user gave x and y
        app.extra.set(true);
        await settle();
        const inner = model.get("group-by", { id: "inner" });
        expect(Object.values(inner?.layoutMemory ?? {})).toEqual([
            { x: 55, y: 45 },
        ]);
        const grown = grows(container);
        expect(created).toBe(1);

        app.parentId.set("a2");
        await settle();
        expect(created).toBe(1);
        expect(grows(container)).toEqual(grown);
        const moved = model.get("group-by", { id: "inner" });
        expect(moved?.parentPanelId).toBe("a2");
        expect(moved?.panelIds).toEqual(["x", "y", "z"]);
        expect(moved?.layout).toEqual(inner?.layout);
        expect(moved?.layoutMemory).toEqual(inner?.layoutMemory);
        // and it comes back
        app.extra.set(false);
        await settle();
        expect(model.get("layout-by", { groupId: "inner" })).toEqual({
            x: 55,
            y: 45,
        });
        expect(at(container, "/g0/p0/g0/p1").id).toBe("y");
    });
});

describe("the external ref", () => {
    it("injectSplitter(splitterRef) gives code outside the root its model, engine and root group", async () => {
        let outside: (() => SplitterContextValue | null) | undefined;
        @Component({ selector: "test-toolbar", template: "" })
        class Toolbar {
            readonly splitterRef = input.required<SplitterRef>();
            constructor() {
                outside = injectSplitter(() => this.splitterRef());
            }
        }
        @Component({
            selector: "test-with-ref",
            imports: [SPLITTER, Toolbar],
            template: `
                <test-toolbar [splitterRef]="splitterRef" />
                @if (shown()) {
                    <div splitterGroup id="outer" [splitterRef]="splitterRef">
                        <div splitterPanel id="nav" defaultSize="20%"></div>
                        <div splitterSeparator></div>
                        <div splitterPanel id="main"></div>
                    </div>
                }
            `,
        })
        class WithRef {
            readonly splitterRef = createSplitterRef();
            readonly shown = signal(false);
        }
        const { app } = await render(WithRef);
        expect(outside?.()).toBeNull();
        app.shown.set(true);
        await settle();
        const held = outside?.();
        expect(held?.groupId).toBe("outer");
        held?.model.run("panel.resize", { panelId: "nav", size: "30%" });
        expect(held?.model.get("layout-by", { groupId: "outer" })).toEqual({
            nav: 30,
            main: 70,
        });
        app.shown.set(false);
        await settle();
        expect(outside?.()).toBeNull();
    });

    it("createSplitterRef works outside a component, and is released when the root goes", async () => {
        const splitterRef = createSplitterRef();
        const { fixture } = await render(Nested);
        fixture.componentInstance.splitterRef.set(splitterRef);
        await settle();
        expect(splitterRef.current?.groupId).toBe("outer");
        expect(
            splitterRef.current?.model.get("layout-by", { groupId: "inner" }),
        ).toEqual({ editor: 75, terminal: 25 });
        fixture.destroy();
        expect(splitterRef.current).toBeNull();
    });
});

describe("layoutCommit in nested groups", () => {
    it("fires for a commit of its own group only", async () => {
        const outer = vi.fn();
        const inner = vi.fn();
        const model = createSplitterModel();
        @Component({
            selector: "test-commits",
            imports: [SPLITTER],
            template: `
                <div splitterGroup id="g" [model]="model" (layoutCommit)="outer($event)">
                    <div splitterPanel id="a"></div>
                    <div splitterSeparator></div>
                    <div splitterPanel id="b">
                        <div splitterGroup id="h" (layoutCommit)="inner($event)">
                            <div splitterPanel id="c"></div>
                            <div splitterSeparator></div>
                            <div splitterPanel id="d"></div>
                        </div>
                    </div>
                </div>
            `,
        })
        class Commits {
            readonly model = model;
            readonly outer = outer;
            readonly inner = inner;
        }
        await render(Commits);
        // registering is not a commit
        expect(outer).not.toHaveBeenCalled();
        expect(inner).not.toHaveBeenCalled();
        // a drag step of the outer group, then a commit of the inner one
        model.run(
            "separator.move",
            { separatorId: "a:b", delta: 10 },
            { transient: true },
        );
        model.run("group.set-layout", {
            groupId: "h",
            layout: { c: 10, d: 90 },
        });
        expect(outer).not.toHaveBeenCalled();
        expect(inner.mock.calls).toEqual([[{ c: 10, d: 90 }]]);
        // the outer group's own commit, at the layout its step reached
        model.run("separator.move", {
            separatorId: "a:b",
            delta: 10,
            origin: { a: 50, b: 50 },
        });
        expect(outer.mock.calls).toEqual([[{ a: 60, b: 40 }]]);
    });
});
