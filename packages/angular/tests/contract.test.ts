import { Component, ErrorHandler, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";
import {
    type GroupPartState,
    type InjectPartResult,
    injectGroup,
    injectPanel,
    injectSeparator,
    injectSplitter,
    type PanelPartState,
    type SeparatorPartState,
    SPLITTER,
    type SplitterContextValue,
    SplitterGroup,
    SplitterPanel,
    SplitterSeparator,
} from "../src/public-api";
import { at, parts, press, render, settle } from "./helpers";

// The primitive contract (guidelines components/primitives.md, AGENTS.md rule 14), in Angular: the
// directives go on the app's own elements, which keep their attributes, classes, styles and
// listeners; the parts add only their structural style, their state as data-* and ARIA, no text
// and no names.

const ALL = ["/g0", "/g0/p0", "/g0/s0", "/g0/p1"];

@Component({
    selector: "test-bare",
    imports: [SPLITTER],
    template: `<div splitterGroup id="g"><div splitterPanel id="a"></div><div splitterSeparator></div><div splitterPanel id="b"></div></div>`,
})
class Bare {}

describe("the app's elements", () => {
    it("keep their own tags, attributes, classes and styles", async () => {
        @Component({
            selector: "test-own",
            imports: [SPLITTER],
            template: `
                <section splitterGroup id="g" title="group" aria-describedby="help" class="g" style="color: red">
                    <article splitterPanel id="a" lang="pt" class="p" [class.on]="true" style="padding: 4px"></article>
                    <hr splitterSeparator aria-label="Resize" class="s" style="width: 4px" />
                    <article splitterPanel id="b"></article>
                </section>
            `,
        })
        class Own {}
        const { container } = await render(Own);
        const group = at(container, "/g0");
        expect(group.tagName).toBe("SECTION");
        expect(group).toHaveAttribute("title", "group");
        expect(group).toHaveAttribute("aria-describedby", "help");
        expect(group).toHaveClass("g");
        expect(group.style.color).toBe("red");
        const panel = at(container, "/g0/p0");
        expect(panel.tagName).toBe("ARTICLE");
        expect(panel).toHaveAttribute("lang", "pt");
        expect(panel).toHaveClass("p", "on");
        expect(panel.style.padding).toBe("4px");
        expect(panel.style.flexGrow).toBe("50");
        const separator = at(container, "/g0/s0");
        expect(separator.tagName).toBe("HR");
        expect(separator).toHaveAttribute("role", "separator");
        expect(separator).toHaveAttribute("aria-label", "Resize");
        expect(separator).toHaveClass("s");
        expect(separator.style.width).toBe("4px");
    });

    it("never override the structural style with their own", async () => {
        @Component({
            selector: "test-override",
            imports: [SPLITTER],
            template: `
                <div splitterGroup id="g" style="display: block; flex-direction: column">
                    <div splitterPanel id="a" style="flex-grow: 3; overflow: auto"></div>
                    <div splitterSeparator style="flex-shrink: 1"></div>
                    <div splitterPanel id="b"></div>
                </div>
            `,
        })
        class Override {}
        const { container } = await render(Override);
        expect(at(container, "/g0").style.display).toBe("flex");
        expect(at(container, "/g0").style.flexDirection).toBe("row");
        expect(at(container, "/g0/p0").style.flexGrow).toBe("50");
        expect(at(container, "/g0/p0").style.overflow).toBe("hidden");
        expect(at(container, "/g0/s0").style.flexShrink).toBe("0");
    });

    it("run their own listeners after the engine's, through Angular's error handler", async () => {
        const handleError = vi.fn();
        TestBed.configureTestingModule({
            providers: [{ provide: ErrorHandler, useValue: { handleError } }],
            // the app's handler gets the error, as in an app (TestBed rethrows it by default)
            rethrowApplicationErrors: false,
        });
        const order: string[] = [];
        @Component({
            selector: "test-listeners",
            imports: [SPLITTER],
            template: `
                <div splitterGroup id="g" (layoutChange)="changed($event)">
                    <div splitterPanel id="a"></div>
                    <div splitterSeparator (keydown)="keydown($event)"></div>
                    <div splitterPanel id="b"></div>
                </div>
            `,
        })
        class Listeners {
            changed(layout: Readonly<Record<string, number>> | undefined) {
                order.push(`layout:${layout?.a}`);
            }
            keydown(event: KeyboardEvent) {
                // the separator already moved, and marked the key as handled
                order.push(`own:${event.defaultPrevented}`);
                throw new Error("listener failed");
            }
        }
        const { container } = await render(Listeners);
        order.length = 0;
        await press(at(container, "/g0/s0"), "ArrowRight");
        expect(order).toEqual(["layout:55", "own:true"]);
        expect(at(container, "/g0/p0").style.flexGrow).toBe("55");
        expect(
            handleError.mock.calls.map(([error]) => (error as Error).message),
        ).toEqual(["listener failed"]);
    });
});

describe("inline style is structural only", () => {
    it("sets flex sizing, overflow on panels and touch-action on separators, nothing cosmetic", async () => {
        const { container } = await render(Bare);
        const keys = (element: HTMLElement) =>
            // (jsdom also lists the shorthand of the flex longhands)
            [...element.style].filter((key) => key !== "flex").sort();
        expect(keys(at(container, "/g0"))).toEqual(
            ["display", "flex-direction", "flex-wrap"].sort(),
        );
        expect(keys(at(container, "/g0/p0"))).toEqual(
            ["flex-basis", "flex-grow", "flex-shrink", "overflow"].sort(),
        );
        expect(keys(at(container, "/g0/s0"))).toEqual(
            ["flex-grow", "flex-shrink", "touch-action"].sort(),
        );
    });

    it("stacks a vertical group", async () => {
        @Component({
            selector: "test-vertical",
            imports: [SPLITTER],
            template: `<div splitterGroup id="g" orientation="vertical"><div splitterPanel id="a"></div><div splitterSeparator></div><div splitterPanel id="b"></div></div>`,
        })
        class Vertical {}
        const { container } = await render(Vertical);
        expect(at(container, "/g0").style.flexDirection).toBe("column");
        expect(at(container, "/g0/s0")).toHaveAttribute(
            "aria-orientation",
            "horizontal",
        );
    });
});

describe("data-* attributes", () => {
    it('are present or absent, never "false"', async () => {
        @Component({
            selector: "test-flags",
            imports: [SPLITTER],
            template: `
                <div splitterGroup id="g" [disabled]="on()">
                    <div splitterPanel id="a" [collapsible]="on()" [disabled]="on()"></div>
                    <div splitterSeparator></div>
                    <div splitterPanel id="b"></div>
                </div>
            `,
        })
        class Flags {
            readonly on = signal(false);
        }
        const { container, app } = await render(Flags);
        const values = () =>
            [...container.querySelectorAll("*")].flatMap((element) =>
                [...element.attributes]
                    .filter(({ name }) => name.startsWith("data-"))
                    .map(({ value }) => value),
            );
        expect(values()).not.toContain("false");
        expect(at(container, "/g0")).not.toHaveAttribute("data-disabled");
        expect(at(container, "/g0/p0")).not.toHaveAttribute("data-collapsible");
        app.on.set(true);
        await settle();
        expect(values()).not.toContain("false");
        expect(at(container, "/g0")).toHaveAttribute("data-disabled", "");
        expect(at(container, "/g0/p0")).toHaveAttribute("data-collapsible", "");
        expect(at(container, "/g0/p0")).toHaveAttribute("data-disabled", "");
        expect(at(container, "/g0/s0")).toHaveAttribute("data-disabled", "");
    });

    it("take a bare boolean attribute as true", async () => {
        @Component({
            selector: "test-bare-flags",
            imports: [SPLITTER],
            template: `<div splitterGroup id="g" disabled><div splitterPanel id="a" collapsible></div><div splitterSeparator></div><div splitterPanel id="b"></div></div>`,
        })
        class BareFlags {}
        const { container } = await render(BareFlags);
        expect(at(container, "/g0")).toHaveAttribute("data-disabled", "");
        expect(at(container, "/g0/p0")).toHaveAttribute("data-collapsible", "");
    });

    it("name the part and its path on every element", async () => {
        const { container } = await render(Bare);
        const all = [...container.querySelectorAll<HTMLElement>("*")];
        expect(all.map((element) => element.dataset.splitterPath)).toEqual(ALL);
        expect(all.map((element) => element.dataset.splitterPart)).toEqual([
            "group",
            "panel",
            "separator",
            "panel",
        ]);
        expect(at(container, "/g0")).toHaveAttribute(
            "data-orientation",
            "horizontal",
        );
        expect(at(container, "/g0/s0")).toHaveAttribute(
            "data-orientation",
            "vertical",
        );
    });
});

describe("names and text", () => {
    it("render no text and no name of their own", async () => {
        const { container } = await render(Bare);
        expect(container.textContent).toBe("");
        expect(container.querySelector("[aria-label]")).toBeNull();
        expect(container.querySelector("[aria-labelledby]")).toBeNull();
    });

    it("leave the app's content alone, and hand a template the part's state", async () => {
        @Component({
            selector: "test-content",
            imports: [SPLITTER],
            template: `
                <div splitterGroup id="g">
                    <div splitterPanel id="a" #p="splitterPanel">{{ p.state().id }}:{{ p.state().size }}</div>
                    <div splitterSeparator><span>grip</span></div>
                    <div splitterPanel id="b">right</div>
                </div>
            `,
        })
        class Content {}
        const { container } = await render(Content);
        expect(at(container, "/g0/p0").textContent).toBe("a:50");
        expect(at(container, "/g0/s0").querySelector("span")?.textContent).toBe(
            "grip",
        );
        expect(at(container, "/g0/p1").textContent).toBe("right");
    });
});

describe("the separator's ARIA (Window Splitter)", () => {
    it("comes from the engine, with tabindex 0 unless disabled", async () => {
        @Component({
            selector: "test-aria",
            imports: [SPLITTER],
            template: `<div splitterGroup id="g"><div splitterPanel id="a"></div><div splitterSeparator [disabled]="disabled()"></div><div splitterPanel id="b"></div></div>`,
        })
        class Aria {
            readonly disabled = signal<boolean | undefined>(undefined);
        }
        const { container, app } = await render(Aria);
        const separator = at(container, "/g0/s0");
        expect(separator).toHaveAttribute("role", "separator");
        expect(separator).toHaveAttribute("aria-orientation", "vertical");
        expect(separator).toHaveAttribute("aria-valuenow", "50");
        expect(separator).toHaveAttribute("aria-valuemin", "0");
        expect(separator).toHaveAttribute("aria-valuemax", "100");
        expect(separator).toHaveAttribute("aria-controls", "a");
        expect(separator).toHaveAttribute("tabindex", "0");
        app.disabled.set(true);
        await settle();
        expect(separator).not.toHaveAttribute("tabindex");
        expect(separator).toHaveAttribute("aria-disabled", "true");
    });
});

describe("injection functions have one shape", () => {
    it("injectSplitter gives { model, engine, groupId }; each part's injection function { state }", async () => {
        const seen: {
            splitter?: () => SplitterContextValue;
            group?: InjectPartResult<GroupPartState>;
            panel?: InjectPartResult<PanelPartState>;
            separator?: InjectPartResult<SeparatorPartState>;
        } = {};
        @Component({ selector: "test-in-panel", template: "" })
        class InPanel {
            constructor() {
                seen.splitter = injectSplitter();
                seen.group = injectGroup();
                seen.panel = injectPanel();
            }
        }
        @Component({ selector: "test-in-separator", template: "" })
        class InSeparator {
            constructor() {
                seen.separator = injectSeparator();
            }
        }
        @Component({
            selector: "test-probes",
            imports: [SPLITTER, InPanel, InSeparator],
            template: `
                <div splitterGroup id="g">
                    <div splitterPanel id="a"><test-in-panel /></div>
                    <div splitterSeparator><test-in-separator /></div>
                    <div splitterPanel id="b"></div>
                </div>
            `,
        })
        class Probes {}
        await render(Probes);
        const splitter = seen.splitter?.();
        expect(Object.keys(splitter ?? {}).sort()).toEqual([
            "engine",
            "groupId",
            "model",
        ]);
        expect(splitter?.groupId).toBe("g");
        expect(splitter?.model.get("layout-by", { groupId: "g" })).toEqual({
            a: 50,
            b: 50,
        });
        for (const result of [seen.group, seen.panel, seen.separator]) {
            expect(Object.keys(result ?? {})).toEqual(["state"]);
        }
        expect(seen.group?.state()).toEqual({
            id: "g",
            orientation: "horizontal",
            disabled: false,
            dragging: false,
            path: "/g0",
        } satisfies GroupPartState);
        expect(seen.panel?.state()).toMatchObject({ id: "a", size: 50 });
        expect(seen.separator?.state()).toMatchObject({
            id: "a:b",
            path: "/g0/s0",
        });
    });

    it("throw outside their part", () => {
        @Component({ selector: "test-outside", template: "" })
        class Outside {
            constructor() {
                injectSplitter();
            }
        }
        @Component({ selector: "test-no-panel", template: "" })
        class NoPanel {
            constructor() {
                injectPanel();
            }
        }
        @Component({
            selector: "test-panel-outside",
            imports: [SPLITTER],
            template: `<div splitterPanel></div>`,
        })
        class PanelOutside {}
        expect(() => TestBed.createComponent(Outside)).toThrow(
            /injectSplitter must be used inside \[splitterGroup\]/,
        );
        expect(() => TestBed.createComponent(NoPanel)).toThrow(
            /injectPanel must be used inside \[splitterPanel\]/,
        );
        expect(() => TestBed.createComponent(PanelOutside)).toThrow(
            /\[splitterPanel\] must be used inside \[splitterGroup\]/,
        );
    });
});

it("SPLITTER lists every directive, as the React and Vue namespace lists every part", async () => {
    expect(SPLITTER).toEqual([SplitterGroup, SplitterPanel, SplitterSeparator]);
    const { container } = await render(Bare);
    expect(parts(container, "panel")).toHaveLength(2);
});
