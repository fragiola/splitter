import { Component, input, signal } from "@angular/core";
import { describe, expect, it } from "vitest";
import {
    type CommandEvent,
    createSplitterModel,
    SPLITTER,
    type SplitterModel,
} from "../src/public-api";
import { at, grows, parts, press, render, settle } from "./helpers";

// Conditional panels (D3): panels are created and destroyed in any order; the order comes from the
// document, never from creation order, and the layout stays normalized.

const IDS = ["a", "b", "c", "d"] as const;

@Component({
    selector: "test-conditional",
    imports: [SPLITTER],
    template: `
        @if (mounted()) {
            <div splitterGroup id="g" [model]="model()">
                @for (id of ids(); track id; let first = $first) {
                    @if (!first) {
                        <div splitterSeparator></div>
                    }
                    <div splitterPanel [id]="id"></div>
                }
            </div>
        }
    `,
})
class Conditional {
    readonly model = input.required<SplitterModel>();
    readonly shown = signal<readonly string[]>([]);
    readonly mounted = signal(true);
    ids(): string[] {
        return IDS.filter((id) => this.shown().includes(id));
    }
}

async function conditional(model: SplitterModel, shown: readonly string[]) {
    const rendered = await render(Conditional, (fixture) => {
        fixture.componentRef.setInput("model", model);
        fixture.componentInstance.shown.set(shown);
    });
    return rendered;
}

function panelIds(model: SplitterModel): readonly string[] {
    return model.get("group-by", { id: "g" })?.panelIds ?? [];
}

function sum(values: number[]): number {
    return (
        Math.round(values.reduce((total, value) => total + value, 0) * 1000) /
        1000
    );
}

describe("conditional panels", () => {
    // every order in which the four panels can appear, one at a time, then disappear
    const sequences: string[][] = [
        ["a", "b", "c", "d"],
        ["d", "c", "b", "a"],
        ["c", "a", "d", "b"],
        ["b", "d", "a", "c"],
    ];

    for (const sequence of sequences) {
        it(`keep the document order when they appear as ${sequence.join(", ")}`, async () => {
            const model = createSplitterModel();
            const { container, app } = await conditional(model, []);
            for (const id of sequence) {
                app.shown.set([...app.shown(), id]);
                await settle();
                const expected = IDS.filter((each) =>
                    app.shown().includes(each),
                );
                expect(panelIds(model)).toEqual(expected);
                expect(sum(grows(container))).toBe(100);
                // every separator element has the separator between its neighbours
                expect(
                    parts(container, "separator").map((element) =>
                        element.getAttribute("aria-controls"),
                    ),
                ).toEqual(expected.slice(0, -1));
            }
            for (const id of [...sequence].reverse().slice(0, -1)) {
                app.shown.set(app.shown().filter((each) => each !== id));
                await settle();
                expect(panelIds(model)).toEqual(
                    IDS.filter((each) => app.shown().includes(each)),
                );
                expect(sum(grows(container))).toBe(100);
            }
        });
    }

    it("the separator before a panel added in the middle moves it", async () => {
        const model = createSplitterModel();
        const { container, app } = await conditional(model, ["a", "c"]);
        app.shown.set(["a", "b", "c"]);
        await settle();
        expect(
            parts(container, "separator").map(
                (element) => element.dataset.splitterPath,
            ),
        ).toEqual(["/g0/s0", "/g0/s1"]);
        await press(at(container, "/g0/s1"), "ArrowRight");
        expect(model.get("layout-by", { groupId: "g" })).toEqual({
            a: 33.334,
            b: 38.333,
            c: 28.333,
        });
    });
});

describe("registration", () => {
    it("registers a group and its panels once, in one batch", async () => {
        const model = createSplitterModel();
        const events: CommandEvent[] = [];
        model.subscribe((event) => events.push(event));
        await conditional(model, ["a", "b", "c"]);
        expect(model.get("groups")).toHaveLength(1);
        expect(panelIds(model)).toEqual(["a", "b", "c"]);
        const batches = events.filter(({ command }) => command === "batch");
        expect(batches[0]?.commands?.map(({ command }) => command)).toEqual([
            "group.add",
            "panel.add",
            "panel.add",
            "panel.add",
        ]);
    });

    it("unregisters everything when destroyed, and a layout the user changed comes back when created again", async () => {
        const model = createSplitterModel();
        const first = await conditional(model, ["a", "b"]);
        model.run("panel.resize", { panelId: "a", size: "30%" });
        first.fixture.destroy();
        await settle();
        expect(model.get("groups")).toEqual([]);
        expect(model.get("state").panels).toEqual({});
        const { container } = await conditional(model, ["a", "b"]);
        expect(grows(container)).toEqual([30, 70]);
    });

    it("keeps that layout when the group is created again in place", async () => {
        const model = createSplitterModel();
        const { container, app } = await conditional(model, ["a", "b"]);
        model.run("panel.resize", { panelId: "a", size: "30%" });
        app.mounted.set(false);
        await settle();
        expect(model.get("groups")).toEqual([]);
        app.mounted.set(true);
        await settle();
        expect(grows(container)).toEqual([30, 70]);
        expect(panelIds(model)).toEqual(["a", "b"]);
    });

    it("a panel created again under its id (a new @for item) stays registered", async () => {
        const model = createSplitterModel();
        @Component({
            selector: "test-recreated",
            imports: [SPLITTER],
            template: `
                <div splitterGroup id="g" [model]="model">
                    @for (item of items(); track item) {
                        <div splitterPanel [id]="item.id"></div>
                    }
                </div>
            `,
        })
        class Recreated {
            readonly model = model;
            readonly items = signal([{ id: "a" }, { id: "b" }]);
        }
        const { app } = await render(Recreated);
        // new objects: the @for destroys both panels and creates them again
        app.items.set([{ id: "a" }, { id: "b" }]);
        await settle();
        expect(panelIds(model)).toEqual(["a", "b"]);
    });

    it("another id creates the group again, under the new id, with @for's track", async () => {
        const model = createSplitterModel();
        @Component({
            selector: "test-rekeyed",
            imports: [SPLITTER],
            template: `
                @for (id of [groupId()]; track id) {
                    <div splitterGroup [id]="id" [model]="model">
                        <div splitterPanel id="a"></div>
                        <div splitterSeparator></div>
                        <div splitterPanel id="b"></div>
                    </div>
                }
            `,
        })
        class Rekeyed {
            readonly model = model;
            readonly groupId = signal("g");
        }
        const { container, app } = await render(Rekeyed);
        app.groupId.set("h");
        await settle();
        expect(model.get("groups").map((group) => group.id)).toEqual(["h"]);
        expect(at(container, "/g0/s0")).toHaveAttribute("aria-controls", "a");
    });

    it("takes a saved layout from the model's document", async () => {
        const model = createSplitterModel({
            version: 1,
            groups: [
                {
                    id: "g",
                    panels: [
                        { id: "a", size: 25 },
                        { id: "b", size: 75 },
                    ],
                },
            ],
        });
        const { container } = await conditional(model, ["a", "b"]);
        expect(grows(container)).toEqual([25, 75]);
    });
});
