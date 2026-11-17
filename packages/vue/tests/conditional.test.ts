import { describe, expect, it } from "vitest";
import { Fragment, h, shallowRef, type VNodeChild } from "vue";
import {
    type CommandEvent,
    createSplitterModel,
    Splitter,
    type SplitterModel,
} from "../src";
import { at, grows, parts, press, render, settle } from "./helpers";

// Conditional panels (D3): panels mount and unmount in any order; the order comes from the
// document, never from mount order, and the layout stays normalized.

const IDS = ["a", "b", "c", "d"] as const;

function conditional(
    model: SplitterModel,
    shown: readonly string[],
): VNodeChild {
    return h(Splitter.Group, { id: "g", model }, () =>
        IDS.filter((id) => shown.includes(id)).map((id, index) =>
            h(Fragment, { key: id }, [
                index > 0 ? h(Splitter.Separator) : null,
                h(Splitter.Panel, { id }),
            ]),
        ),
    );
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
        it(`keep the document order when they mount as ${sequence.join(", ")}`, async () => {
            const model = createSplitterModel();
            const shown = shallowRef<string[]>([]);
            const { container } = await render(() =>
                conditional(model, shown.value),
            );
            for (const id of sequence) {
                shown.value = [...shown.value, id];
                await settle();
                const expected = IDS.filter((each) =>
                    shown.value.includes(each),
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
                shown.value = shown.value.filter((each) => each !== id);
                await settle();
                expect(panelIds(model)).toEqual(
                    IDS.filter((each) => shown.value.includes(each)),
                );
                expect(sum(grows(container))).toBe(100);
            }
        });
    }

    it("the separator before a panel added in the middle moves it", async () => {
        const model = createSplitterModel();
        const shown = shallowRef(["a", "c"]);
        const { container } = await render(() =>
            conditional(model, shown.value),
        );
        shown.value = ["a", "b", "c"];
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
        await render(() => conditional(model, ["a", "b", "c"]));
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

    it("unregisters everything on unmount, and a layout the user changed comes back on remount", async () => {
        const model = createSplitterModel();
        const first = await render(() => conditional(model, ["a", "b"]));
        model.run("panel.resize", { panelId: "a", size: "30%" });
        first.wrapper.unmount();
        expect(model.get("groups")).toEqual([]);
        expect(model.get("state").panels).toEqual({});
        const { container } = await render(() =>
            conditional(model, ["a", "b"]),
        );
        expect(grows(container)).toEqual([30, 70]);
    });

    it("keeps that layout when the group remounts in place", async () => {
        const model = createSplitterModel();
        const shown = shallowRef(true);
        const { container } = await render(() =>
            shown.value ? conditional(model, ["a", "b"]) : null,
        );
        model.run("panel.resize", { panelId: "a", size: "30%" });
        shown.value = false;
        await settle();
        expect(model.get("groups")).toEqual([]);
        shown.value = true;
        await settle();
        expect(grows(container)).toEqual([30, 70]);
        expect(panelIds(model)).toEqual(["a", "b"]);
    });

    it("remounts a group given another id, under the new id", async () => {
        const model = createSplitterModel();
        const id = shallowRef("g");
        const { container } = await render(() =>
            h(Splitter.Group, { id: id.value, model }, () => [
                h(Splitter.Panel, { id: "a" }),
                h(Splitter.Separator),
                h(Splitter.Panel, { id: "b" }),
            ]),
        );
        id.value = "h";
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
        const { container } = await render(() =>
            conditional(model, ["a", "b"]),
        );
        expect(grows(container)).toEqual([25, 75]);
    });
});
