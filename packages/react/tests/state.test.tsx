import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
    createSplitterModel,
    Splitter,
    type SplitterModel,
    type SplitterRef,
    useSplitterRef,
    useSplitterState,
} from "../src";

// useSplitterState follows an answer of the model, re-rendering only when that answer changes.

describe("useSplitterState", () => {
    it("re-renders inside a group when its answer changes, and only then", () => {
        const model = createSplitterModel();
        let renders = 0;
        function Status() {
            renders++;
            const collapsed = useSplitterState(({ model }) =>
                model.is("panel-collapsed", { panelId: "a" }),
            );
            return <output>{collapsed ? "collapsed" : "expanded"}</output>;
        }
        render(
            <Splitter.Group id="g" model={model}>
                <Splitter.Panel id="a" collapsible minSize="20%">
                    <Status />
                </Splitter.Panel>
                <Splitter.Separator />
                <Splitter.Panel id="b" />
            </Splitter.Group>,
        );
        expect(screen.getByRole("status").textContent).toBe("expanded");
        const before = renders;
        act(() => {
            model.run("panel.resize", { panelId: "a", size: "40%" });
        });
        // a resize does not change the answer: no render
        expect(renders).toBe(before);
        act(() => {
            model.run("panel.collapse", { panelId: "a" });
        });
        expect(screen.getByRole("status").textContent).toBe("collapsed");
        act(() => {
            model.run("panel.expand", { panelId: "a" });
        });
        expect(screen.getByRole("status").textContent).toBe("expanded");
    });

    it("reads a splitter through its ref from outside, undefined until a group holds it", () => {
        let ref: SplitterRef | undefined;
        let seen: unknown[] = [];
        function Toolbar(props: { splitterRef: SplitterRef }) {
            const size = useSplitterState(
                ({ model }) =>
                    model.get("panel-size-by", { panelId: "a" })?.percentage,
                { splitterRef: props.splitterRef },
            );
            seen.push(size);
            return null;
        }
        function App(props: { model: SplitterModel; shown: boolean }) {
            const splitterRef = useSplitterRef();
            ref = splitterRef;
            return (
                <>
                    <Toolbar splitterRef={splitterRef} />
                    {props.shown && (
                        <Splitter.Group
                            id="g"
                            model={props.model}
                            splitterRef={splitterRef}
                        >
                            <Splitter.Panel id="a" />
                            <Splitter.Separator />
                            <Splitter.Panel id="b" />
                        </Splitter.Group>
                    )}
                </>
            );
        }
        const model = createSplitterModel();
        const { rerender } = render(<App model={model} shown={false} />);
        expect(seen).toEqual([undefined]);
        seen = [];
        rerender(<App model={model} shown />);
        expect(seen.at(-1)).toBe(50);
        act(() => {
            model.run("panel.resize", { panelId: "a", size: "30%" });
        });
        expect(seen.at(-1)).toBe(30);
        expect(ref?.current?.groupId).toBe("g");
    });

    it("keeps an equal answer with isEqual, and throws outside a group without a ref", () => {
        const model = createSplitterModel();
        const answers: unknown[] = [];
        function Layout() {
            const ids = useSplitterState(
                ({ model }) =>
                    model
                        .get("panels-by", { groupId: "g" })
                        .map(({ id }) => id),
                {
                    isEqual: (a, b) =>
                        a.length === b.length &&
                        a.every((id, i) => id === b[i]),
                },
            );
            answers.push(ids);
            return null;
        }
        render(
            <Splitter.Group id="g" model={model}>
                <Splitter.Panel id="a">
                    <Layout />
                </Splitter.Panel>
                <Splitter.Separator />
                <Splitter.Panel id="b" />
            </Splitter.Group>,
        );
        const count = answers.length;
        const last = answers.at(-1);
        expect(last).toEqual(["a", "b"]);
        act(() => {
            model.run("panel.resize", { panelId: "a", size: "30%" });
        });
        // a new array of the same ids: kept, so no render
        expect(answers).toHaveLength(count);
        function Outside() {
            useSplitterState(({ groupId }) => groupId);
            return null;
        }
        const error = console.error;
        console.error = () => {};
        try {
            expect(() => render(<Outside />)).toThrow(
                "useSplitter must be used inside Splitter.Group",
            );
        } finally {
            console.error = error;
        }
    });
});
