import { Component, input, signal } from "@angular/core";
import { describe, expect, it, vi } from "vitest";
import {
    type CommandEvent,
    createSplitterModel,
    type Layout,
    type PanelResizeEvent,
    SPLITTER,
    type SplitterModel,
} from "../src/public-api";
import { at, grows, press, render, settle } from "./helpers";

// Inputs map onto commands: what a group, a panel and a separator declare reaches the model, and
// a change of an input is one command.

function commandsOf(model: SplitterModel) {
    const events: CommandEvent[] = [];
    model.subscribe((event) => events.push(event));
    return () =>
        events.splice(0).map(({ command, payload }) => ({ command, payload }));
}

describe("the group's layout", () => {
    it("is controlled with [(layout)]", async () => {
        @Component({
            selector: "test-two-way",
            imports: [SPLITTER],
            template: `
                <div splitterGroup id="g" [(layout)]="layout">
                    <div splitterPanel id="a"></div>
                    <div splitterSeparator></div>
                    <div splitterPanel id="b"></div>
                </div>
            `,
        })
        class TwoWay {
            readonly layout = signal<Readonly<Layout> | undefined>({
                a: 30,
                b: 70,
            });
        }
        const { container, app } = await render(TwoWay);
        expect(grows(container)).toEqual([30, 70]);
        app.layout.set({ a: 60, b: 40 });
        await settle();
        expect(grows(container)).toEqual([60, 40]);
        await press(at(container, "/g0/s0"), "ArrowRight");
        expect(grows(container)).toEqual([65, 35]);
        expect(app.layout()).toEqual({ a: 65, b: 35 });
    });

    it("follows a one-way [layout] when it changes, and never keeps the app's object", async () => {
        const model = createSplitterModel();
        @Component({
            selector: "test-one-way",
            imports: [SPLITTER],
            template: `
                <div splitterGroup id="g" [model]="model" [layout]="layout()">
                    <div splitterPanel id="a"></div>
                    <div splitterSeparator></div>
                    <div splitterPanel id="b"></div>
                </div>
            `,
        })
        class OneWay {
            readonly model = model;
            readonly layout = signal<Layout>({ a: 30, b: 70 });
        }
        const { container, app } = await render(OneWay);
        expect(grows(container)).toEqual([30, 70]);
        const next = { a: 20, b: 80 };
        app.layout.set(next);
        await settle();
        expect(grows(container)).toEqual([20, 80]);
        expect(model.get("layout-by", { groupId: "g" })).toEqual(next);
        expect(model.get("layout-by", { groupId: "g" })).not.toBe(next);
    });

    @Component({
        selector: "test-default-layout",
        imports: [SPLITTER],
        template: `
            <div splitterGroup id="g" [model]="model()" [defaultLayout]="defaultLayout()">
                <div splitterPanel id="a"></div>
                <div splitterSeparator></div>
                <div splitterPanel id="b"></div>
            </div>
        `,
    })
    class DefaultLayout {
        readonly model = input.required<SplitterModel>();
        readonly defaultLayout = input<Layout>({ a: 30, b: 70 });
    }

    it("starts from defaultLayout unless the model saved one", async () => {
        const fresh = await render(DefaultLayout, (fixture) =>
            fixture.componentRef.setInput("model", createSplitterModel()),
        );
        expect(grows(fresh.container)).toEqual([30, 70]);
        fresh.fixture.destroy();
        const saved = createSplitterModel({
            version: 1,
            groups: [
                {
                    id: "g",
                    panels: [
                        { id: "a", size: 45 },
                        { id: "b", size: 55 },
                    ],
                },
            ],
        });
        const { container } = await render(DefaultLayout, (fixture) =>
            fixture.componentRef.setInput("model", saved),
        );
        expect(grows(container)).toEqual([45, 55]);
    });

    it("ignores a defaultLayout that does not name the group's panels", async () => {
        const { container } = await render(DefaultLayout, (fixture) => {
            fixture.componentRef.setInput("model", createSplitterModel());
            fixture.componentRef.setInput("defaultLayout", { x: 10, y: 90 });
        });
        expect(grows(container)).toEqual([50, 50]);
    });
});

describe("input changes become commands", () => {
    it("a group's orientation and disabled flag: group.update", async () => {
        const model = createSplitterModel();
        @Component({
            selector: "test-group-inputs",
            imports: [SPLITTER],
            template: `
                <div splitterGroup id="g" [model]="model" [orientation]="on() ? 'vertical' : 'horizontal'" [disabled]="on()">
                    <div splitterPanel id="a"></div>
                    <div splitterSeparator></div>
                    <div splitterPanel id="b"></div>
                </div>
            `,
        })
        class GroupInputs {
            readonly model = model;
            readonly on = signal(false);
        }
        const { container, app } = await render(GroupInputs);
        const sent = commandsOf(model);
        app.on.set(true);
        await settle();
        expect(sent()).toEqual([
            {
                command: "group.update",
                payload: {
                    groupId: "g",
                    orientation: "vertical",
                    disabled: true,
                },
            },
        ]);
        expect(at(container, "/g0").style.flexDirection).toBe("column");
        expect(at(container, "/g0")).toHaveAttribute(
            "data-orientation",
            "vertical",
        );
        expect(at(container, "/g0/s0")).toHaveAttribute("data-disabled", "");
    });

    it("a panel's constraints: panel.update, null for one removed", async () => {
        const model = createSplitterModel();
        @Component({
            selector: "test-panel-inputs",
            imports: [SPLITTER],
            template: `
                <div splitterGroup id="g" [model]="model">
                    <div splitterPanel id="a" [minSize]="minSize()" [collapsible]="collapsible()"></div>
                    <div splitterSeparator></div>
                    <div splitterPanel id="b"></div>
                </div>
            `,
        })
        class PanelInputs {
            readonly model = model;
            readonly minSize = signal<string | undefined>("60%");
            readonly collapsible = signal<boolean | undefined>(undefined);
        }
        const { container, app } = await render(PanelInputs);
        expect(grows(container)).toEqual([60, 40]);
        const sent = commandsOf(model);
        app.minSize.set(undefined);
        app.collapsible.set(true);
        await settle();
        expect(sent()).toEqual([
            {
                command: "panel.update",
                payload: { panelId: "a", minSize: null, collapsible: true },
            },
        ]);
        expect(at(container, "/g0/p0")).toHaveAttribute("data-collapsible", "");
        app.collapsible.set(true);
        await settle();
        expect(sent()).toEqual([]);
    });

    it("a panel's id: removed under the old one, added under the new one", async () => {
        const model = createSplitterModel();
        @Component({
            selector: "test-panel-id",
            imports: [SPLITTER],
            template: `
                <div splitterGroup id="g" [model]="model">
                    <div splitterPanel [id]="id()"></div>
                    <div splitterSeparator></div>
                    <div splitterPanel id="b"></div>
                </div>
            `,
        })
        class PanelId {
            readonly model = model;
            readonly id = signal("a");
        }
        const { container, app } = await render(PanelId);
        app.id.set("c");
        await settle();
        expect(model.get("group-by", { id: "g" })?.panelIds).toEqual([
            "c",
            "b",
        ]);
        expect(at(container, "/g0/p0").id).toBe("c");
        expect(at(container, "/g0/s0")).toHaveAttribute("aria-controls", "c");
    });

    @Component({
        selector: "test-separator-inputs",
        imports: [SPLITTER],
        template: `
            <div splitterGroup id="g" [model]="model()">
                <div splitterPanel id="a"></div>
                <div splitterSeparator [disabled]="disabled()" [resetOnDoubleClick]="reset()"></div>
                <div splitterPanel id="b"></div>
            </div>
        `,
    })
    class SeparatorInputs {
        readonly model = input.required<SplitterModel>();
        readonly disabled = signal<boolean | undefined>(undefined);
        readonly reset = signal<boolean | undefined>(undefined);
    }

    it("a separator's disabled and resetOnDoubleClick: separator.update", async () => {
        const model = createSplitterModel();
        const { app } = await render(SeparatorInputs, (fixture) =>
            fixture.componentRef.setInput("model", model),
        );
        const sent = commandsOf(model);
        app.disabled.set(true);
        await settle();
        expect(sent()).toEqual([
            {
                command: "separator.update",
                payload: { separatorId: "a:b", disabled: true },
            },
        ]);
        expect(model.is("separator-disabled", { separatorId: "a:b" })).toBe(
            true,
        );
    });

    it("a separator's input back to undefined sends its default", async () => {
        const model = createSplitterModel();
        const { container, app } = await render(SeparatorInputs, (fixture) => {
            fixture.componentRef.setInput("model", model);
            fixture.componentInstance.disabled.set(true);
            fixture.componentInstance.reset.set(false);
        });
        expect(model.is("separator-disabled", { separatorId: "a:b" })).toBe(
            true,
        );
        const sent = commandsOf(model);
        app.disabled.set(undefined);
        await settle();
        expect(sent()).toEqual([
            {
                command: "separator.update",
                payload: { separatorId: "a:b", disabled: false },
            },
        ]);
        expect(at(container, "/g0/s0").hasAttribute("data-disabled")).toBe(
            false,
        );
        app.reset.set(undefined);
        await settle();
        expect(sent()).toEqual([
            {
                command: "separator.update",
                payload: { separatorId: "a:b", resetOnDoubleClick: true },
            },
        ]);
        app.reset.set(undefined);
        await settle();
        expect(sent()).toEqual([]);
    });
});

describe("the adapter's commands", () => {
    it("carry meta.source adapter, so a listener tells them from the user's steps", async () => {
        const model = createSplitterModel();
        const events: CommandEvent[] = [];
        model.subscribe((event) => events.push(event));
        @Component({
            selector: "test-sources",
            imports: [SPLITTER],
            template: `
                <div splitterGroup id="g" [model]="model" [layout]="layout()">
                    <div splitterPanel id="a" [minSize]="min()"></div>
                    <div splitterSeparator [disabled]="third()"></div>
                    <div splitterPanel id="b"></div>
                    @if (third()) {
                        <div splitterSeparator></div>
                        <div splitterPanel id="c"></div>
                    }
                </div>
            `,
        })
        class Sources {
            readonly model = model;
            readonly third = signal(false);
            readonly min = signal<string | undefined>(undefined);
            readonly layout = signal<Layout | undefined>(undefined);
        }
        const { container, app, fixture } = await render(Sources);
        app.third.set(true);
        app.min.set("10%");
        app.layout.set({ a: 20, b: 40, c: 40 });
        await settle();
        app.third.set(false);
        await settle();
        const sources = () =>
            events
                .filter(({ transient }) => !transient)
                .map(({ command, meta }) => [command, meta?.source]);
        expect(sources().length).toBeGreaterThan(3);
        expect(sources().filter(([, source]) => source !== "adapter")).toEqual(
            [],
        );
        events.length = 0;
        await press(at(container, "/g0/s0"), "ArrowRight");
        expect(sources()).toEqual([["separator.move", undefined]]);
        events.length = 0;
        fixture.destroy();
        await settle();
        expect(sources()).toEqual([["group.remove", "adapter"]]);
    });
});

describe("panel outputs", () => {
    it("(resize) gets the size, and the previous one (none the first time)", async () => {
        const resize = vi.fn();
        @Component({
            selector: "test-resize",
            imports: [SPLITTER],
            template: `
                <div splitterGroup id="g">
                    <div splitterPanel id="a" (resize)="resize($event)"></div>
                    <div splitterSeparator></div>
                    <div splitterPanel id="b"></div>
                </div>
            `,
        })
        class Resize {
            resize(event: PanelResizeEvent) {
                resize(event);
            }
        }
        const { container } = await render(Resize);
        expect(resize).toHaveBeenLastCalledWith({
            size: { percentage: 50, pixels: undefined },
            previous: undefined,
        });
        await press(at(container, "/g0/s0"), "ArrowLeft");
        expect(resize).toHaveBeenLastCalledWith({
            size: { percentage: 45, pixels: undefined },
            previous: { percentage: 50, pixels: undefined },
        });
    });
});

describe("ids", () => {
    it("are generated when not given, and the panel's DOM id is its panel id", async () => {
        @Component({
            selector: "test-no-ids",
            imports: [SPLITTER],
            template: `<div splitterGroup><div splitterPanel></div><div splitterSeparator></div><div splitterPanel></div></div>`,
        })
        class NoIds {}
        const { container } = await render(NoIds);
        const panel = at(container, "/g0/p0");
        expect(panel.id).not.toBe("");
        expect(at(container, "/g0/s0")).toHaveAttribute(
            "aria-controls",
            panel.id,
        );
    });

    it("a second group with the same id in one model is reported and not registered", async () => {
        const model = createSplitterModel();
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        @Component({
            selector: "test-twice",
            imports: [SPLITTER],
            template: `
                <div splitterGroup id="g" [model]="model"><div splitterPanel id="a"></div></div>
                <div splitterGroup id="g" [model]="model"><div splitterPanel id="b"></div></div>
            `,
        })
        class Twice {
            readonly model = model;
        }
        await render(Twice);
        expect(error).toHaveBeenCalledWith(
            expect.stringContaining('[splitterGroup] "g"'),
        );
        expect(model.get("group-by", { id: "g" })?.panelIds).toEqual(["a"]);
    });

    it("a group's id and model are read once: a change is reported", async () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        @Component({
            selector: "test-new-id",
            imports: [SPLITTER],
            template: `<div splitterGroup [id]="id()"><div splitterPanel id="a"></div></div>`,
        })
        class NewId {
            readonly id = signal("g");
        }
        const { app, container } = await render(NewId);
        app.id.set("h");
        await settle();
        expect(error).toHaveBeenCalledWith(
            expect.stringContaining("read once"),
        );
        expect(at(container, "/g0/p0")).toHaveAttribute("id", "a");
    });
});
