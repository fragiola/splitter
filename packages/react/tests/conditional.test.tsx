import { act, render } from "@testing-library/react";
import { Fragment, StrictMode } from "react";
import { describe, expect, it } from "vitest";
import {
    type CommandEvent,
    createSplitterModel,
    Splitter,
    type SplitterModel,
} from "../src";
import { at, grows, parts, press } from "./helpers";

// Conditional panels (D3): panels mount and unmount in any order; the order comes from the
// document, never from mount order, and the layout stays normalized.

const IDS = ["a", "b", "c", "d"] as const;

function Conditional(props: {
    model: SplitterModel;
    shown: readonly string[];
    strict?: boolean;
}) {
    const tree = (
        <Splitter.Group id="g" model={props.model}>
            {IDS.filter((id) => props.shown.includes(id)).map((id, index) => (
                <Fragment key={id}>
                    {index > 0 && <Splitter.Separator />}
                    <Splitter.Panel id={id} />
                </Fragment>
            ))}
        </Splitter.Group>
    );
    return props.strict ? <StrictMode>{tree}</StrictMode> : tree;
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

    for (const strict of [false, true]) {
        for (const sequence of sequences) {
            it(`keep the document order when they mount as ${sequence.join(", ")}${strict ? " (StrictMode)" : ""}`, () => {
                const model = createSplitterModel();
                const shown: string[] = [];
                const { container, rerender } = render(
                    <Conditional model={model} shown={shown} strict={strict} />,
                );
                for (const id of sequence) {
                    shown.push(id);
                    rerender(
                        <Conditional
                            model={model}
                            shown={[...shown]}
                            strict={strict}
                        />,
                    );
                    const expected = IDS.filter((each) => shown.includes(each));
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
                    shown.splice(shown.indexOf(id), 1);
                    rerender(
                        <Conditional
                            model={model}
                            shown={[...shown]}
                            strict={strict}
                        />,
                    );
                    expect(panelIds(model)).toEqual(
                        IDS.filter((each) => shown.includes(each)),
                    );
                    expect(sum(grows(container))).toBe(100);
                }
            });
        }
    }

    it("the separator before a panel added in the middle moves it", () => {
        const model = createSplitterModel();
        const { container, rerender } = render(
            <Conditional model={model} shown={["a", "c"]} />,
        );
        rerender(<Conditional model={model} shown={["a", "b", "c"]} />);
        expect(
            parts(container, "separator").map(
                (element) => element.dataset.splitterPath,
            ),
        ).toEqual(["/g0/s0", "/g0/s1"]);
        act(() => press(at(container, "/g0/s1"), "ArrowRight"));
        expect(model.get("layout-by", { groupId: "g" })).toEqual({
            a: 33.334,
            b: 38.333,
            c: 28.333,
        });
    });
});

describe("registration", () => {
    it("registers a group and its panels once, in one batch, under StrictMode", () => {
        const model = createSplitterModel();
        const events: CommandEvent[] = [];
        model.subscribe((event) => events.push(event));
        render(<Conditional model={model} shown={["a", "b", "c"]} strict />);
        expect(model.get("groups")).toHaveLength(1);
        expect(panelIds(model)).toEqual(["a", "b", "c"]);
        const last = events.filter(({ command }) => command === "batch").at(-1);
        expect(last?.commands?.map(({ command }) => command)).toEqual([
            "group.add",
            "panel.add",
            "panel.add",
            "panel.add",
        ]);
    });

    it("unregisters everything on unmount, and a layout the user changed comes back on remount", () => {
        const model = createSplitterModel();
        const { unmount } = render(
            <Conditional model={model} shown={["a", "b"]} strict />,
        );
        act(() => {
            model.run("panel.resize", { panelId: "a", size: "30%" });
        });
        unmount();
        expect(model.get("groups")).toEqual([]);
        expect(model.get("state").panels).toEqual({});
        const { container } = render(
            <Conditional model={model} shown={["a", "b"]} strict />,
        );
        expect(grows(container)).toEqual([30, 70]);
    });

    it("takes a saved layout from the model's document", () => {
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
        const { container } = render(
            <Conditional model={model} shown={["a", "b"]} strict />,
        );
        expect(grows(container)).toEqual([25, 75]);
    });
});
