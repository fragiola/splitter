import { act, render } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it } from "vitest";
import {
    createSplitterModel,
    createSplitterRef,
    Splitter,
    type SplitterContextValue,
    type SplitterRef,
    useSplitter,
    useSplitterRef,
} from "../src";
import { at, press } from "./helpers";

// Nested groups (D3): a group inside a panel joins its parent's model, so one model holds the whole
// layout, and code outside the root reaches it through a splitterRef.

function Nested(props: { splitterRef?: SplitterRef; inner?: boolean }) {
    const { splitterRef, inner = true } = props;
    return (
        <Splitter.Group id="outer" splitterRef={splitterRef}>
            <Splitter.Panel id="nav" defaultSize="20%" />
            <Splitter.Separator />
            <Splitter.Panel id="main">
                {inner && (
                    <Splitter.Group id="inner" orientation="vertical">
                        <Splitter.Panel id="editor" />
                        <Splitter.Separator />
                        <Splitter.Panel id="terminal" defaultSize="25%" />
                    </Splitter.Group>
                )}
            </Splitter.Panel>
        </Splitter.Group>
    );
}

describe("nested groups", () => {
    it("share one model and one engine, and nest in their panel", () => {
        const seen: Record<string, SplitterContextValue> = {};
        function Probe(props: { name: string }) {
            seen[props.name] = useSplitter();
            return null;
        }
        render(
            <Splitter.Group id="outer">
                <Probe name="outer" />
                <Splitter.Panel id="a" />
                <Splitter.Separator />
                <Splitter.Panel id="b">
                    <Splitter.Group id="inner">
                        <Probe name="inner" />
                        <Splitter.Panel id="x" />
                        <Splitter.Separator />
                        <Splitter.Panel id="y" />
                    </Splitter.Group>
                </Splitter.Panel>
            </Splitter.Group>,
        );
        expect(seen.inner?.model).toBe(seen.outer?.model);
        expect(seen.inner?.engine).toBe(seen.outer?.engine);
        expect(seen.outer?.groupId).toBe("outer");
        expect(seen.inner?.groupId).toBe("inner");
        const model = seen.outer?.model;
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
        act(() => {
            model?.run("group.set-layout", {
                groupId: "inner",
                layout: { x: 30, y: 70 },
            });
            model?.run("group.set-layout", {
                groupId: "outer",
                layout: { a: 40, b: 60 },
            });
        });
        expect(model?.get("splitter-json").groups).toHaveLength(2);
    });

    it("give every element its path from the root", () => {
        const { container } = render(<Nested />);
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

    it("resize independently: a key on the inner separator moves only the inner group", () => {
        const { container } = render(<Nested />);
        act(() => press(at(container, "/g0/p1/g0/s0"), "ArrowDown"));
        expect(at(container, "/g0/p1/g0/p0").style.flexGrow).toBe("80");
        expect(at(container, "/g0/p0").style.flexGrow).toBe("20");
    });

    it("a nested group unmounts on its own and the outer one keeps its layout", () => {
        const ref = createSplitterRef();
        const { rerender } = render(<Nested splitterRef={ref} />);
        rerender(<Nested splitterRef={ref} inner={false} />);
        const model = ref.current?.model;
        expect(model?.get("groups").map(({ id }) => id)).toEqual(["outer"]);
        expect(model?.get("layout-by", { groupId: "outer" })).toEqual({
            nav: 20,
            main: 80,
        });
    });

    it("a group given another model is a root of its own", () => {
        const other = createSplitterModel();
        render(
            <Splitter.Group id="outer">
                <Splitter.Panel id="a">
                    <Splitter.Group id="own" model={other}>
                        <Splitter.Panel id="x" />
                    </Splitter.Group>
                </Splitter.Panel>
            </Splitter.Group>,
        );
        expect(other.get("groups").map(({ id }) => id)).toEqual(["own"]);
        expect(other.get("group-by", { id: "own" })?.parentPanelId).toBe(
            undefined,
        );
    });
});

describe("the external ref", () => {
    it("useSplitterRef gives code outside the root its model, engine and root group", () => {
        let outside: SplitterContextValue | null = null;
        let renders = 0;
        function Toolbar(props: { splitterRef: SplitterRef }) {
            outside = useSplitter(props.splitterRef);
            renders++;
            return null;
        }
        function App(props: { mounted: boolean }) {
            const splitterRef = useSplitterRef();
            return (
                <>
                    <Toolbar splitterRef={splitterRef} />
                    {props.mounted && <Nested splitterRef={splitterRef} />}
                </>
            );
        }
        const { rerender } = render(
            <StrictMode>
                <App mounted={false} />
            </StrictMode>,
        );
        expect(outside).toBeNull();
        rerender(
            <StrictMode>
                <App mounted />
            </StrictMode>,
        );
        const held = outside as SplitterContextValue | null;
        expect(held?.groupId).toBe("outer");
        act(() => {
            held?.model.run("panel.resize", { panelId: "nav", size: "30%" });
        });
        expect(held?.model.get("layout-by", { groupId: "outer" })).toEqual({
            nav: 30,
            main: 70,
        });
        // the whole nested layout, in one model
        expect(
            held?.model.get("splitter-json").groups.map(({ id }) => id),
        ).toEqual(["outer"]);
        rerender(
            <StrictMode>
                <App mounted={false} />
            </StrictMode>,
        );
        expect(outside).toBeNull();
        expect(renders).toBeGreaterThan(0);
    });

    it("createSplitterRef works outside a component", () => {
        const splitterRef = createSplitterRef();
        const { unmount } = render(<Nested splitterRef={splitterRef} />);
        expect(splitterRef.current?.groupId).toBe("outer");
        expect(
            splitterRef.current?.model.get("layout-by", { groupId: "inner" }),
        ).toEqual({ editor: 75, terminal: 25 });
        unmount();
        expect(splitterRef.current).toBeNull();
    });
});
