import { describe, expect, it, vi } from "vitest";
import {
    defineComponent,
    h,
    shallowRef,
    type VNode,
    type VNodeChild,
} from "vue";
import {
    createSplitterModel,
    createSplitterRef,
    Splitter,
    type SplitterContextValue,
    type SplitterRef,
    useSplitter,
    useSplitterRef,
} from "../src";
import { at, press, render, settle } from "./helpers";

// Nested groups (D3): a group inside a panel joins its parent's model, so one model holds the whole
// layout, and code outside the root reaches it through a splitterRef.

function nested(
    props: { splitterRef?: SplitterRef; inner?: boolean } = {},
): VNodeChild {
    const { splitterRef, inner = true } = props;
    return h(Splitter.Group, { id: "outer", splitterRef }, () => [
        h(Splitter.Panel, { id: "nav", defaultSize: "20%" }),
        h(Splitter.Separator),
        h(Splitter.Panel, { id: "main" }, () =>
            inner
                ? [
                      h(
                          Splitter.Group,
                          { id: "inner", orientation: "vertical" },
                          () => [
                              h(Splitter.Panel, { id: "editor" }),
                              h(Splitter.Separator),
                              h(Splitter.Panel, {
                                  id: "terminal",
                                  defaultSize: "25%",
                              }),
                          ],
                      ),
                  ]
                : [],
        ),
    ]);
}

function probe(seen: Record<string, SplitterContextValue>, name: string) {
    return h(
        defineComponent({
            setup() {
                seen[name] = useSplitter();
                return () => null;
            },
        }),
    );
}

describe("nested groups", () => {
    it("share one model and one engine, and nest in their panel", async () => {
        const seen: Record<string, SplitterContextValue> = {};
        await render(() =>
            h(Splitter.Group, { id: "outer" }, () => [
                probe(seen, "outer"),
                h(Splitter.Panel, { id: "a" }),
                h(Splitter.Separator),
                h(Splitter.Panel, { id: "b" }, () => [
                    h(Splitter.Group, { id: "inner" }, () => [
                        probe(seen, "inner"),
                        h(Splitter.Panel, { id: "x" }),
                        h(Splitter.Separator),
                        h(Splitter.Panel, { id: "y" }),
                    ]),
                ]),
            ]),
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
        const { container } = await render(() => nested());
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
        const { container } = await render(() => nested());
        await press(at(container, "/g0/p1/g0/s0"), "ArrowDown");
        expect(at(container, "/g0/p1/g0/p0").style.flexGrow).toBe("80");
        expect(at(container, "/g0/p0").style.flexGrow).toBe("20");
    });

    it("a nested group unmounts on its own and the outer one keeps its layout", async () => {
        const ref = createSplitterRef();
        const inner = shallowRef(true);
        await render(() => nested({ splitterRef: ref, inner: inner.value }));
        inner.value = false;
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
        await render(() =>
            h(Splitter.Group, { id: "outer" }, () => [
                h(Splitter.Panel, { id: "a" }, () => [
                    h(Splitter.Group, { id: "own", model: other }, () => [
                        h(Splitter.Panel, { id: "x" }),
                    ]),
                ]),
            ]),
        );
        expect(other.get("groups").map(({ id }) => id)).toEqual(["own"]);
        expect(other.get("group-by", { id: "own" })?.parentPanelId).toBe(
            undefined,
        );
    });

    it("a nested group does not render again when its parent panel resizes", async () => {
        let renders = 0;
        // the slots are $stable, as a template's are
        const Inner = defineComponent({
            setup: () => () =>
                h(Splitter.Group, { id: "inner", orientation: "vertical" }, {
                    $stable: true,
                    render: ({
                        props,
                        children,
                    }: {
                        props: Record<string, unknown>;
                        children: VNode;
                    }) => {
                        renders++;
                        return h("div", props, [children]);
                    },
                    default: () => [
                        h(Splitter.Panel, { id: "x" }),
                        h(Splitter.Separator),
                        h(Splitter.Panel, { id: "y" }),
                    ],
                } as never),
        });
        const { container } = await render(() =>
            h(Splitter.Group, { id: "outer" }, {
                $stable: true,
                default: () => [
                    h(Splitter.Panel, { id: "a" }, {
                        $stable: true,
                        default: () => h(Inner),
                    } as never),
                    h(Splitter.Separator),
                    h(Splitter.Panel, { id: "b" }),
                ],
            } as never),
        );
        const before = renders;
        for (let i = 0; i < 5; i++) {
            await press(at(container, "/g0/s0"), "ArrowRight");
        }
        expect(at(container, "/g0/p0").style.flexGrow).toBe("75");
        expect(renders - before).toBe(0);
    });
});

describe("the external ref", () => {
    it("useSplitterRef gives code outside the root its model, engine and root group", async () => {
        const mounted = shallowRef(false);
        let outside: { value: SplitterContextValue | null } | undefined;
        const Toolbar = defineComponent({
            props: { splitterRef: { type: Object, required: true } },
            setup(props) {
                outside = useSplitter(() => props.splitterRef as SplitterRef);
                return () => null;
            },
        });
        const App = defineComponent({
            setup() {
                const splitterRef = useSplitterRef();
                return () => [
                    h(Toolbar, { splitterRef }),
                    mounted.value ? nested({ splitterRef }) : null,
                ];
            },
        });
        await render(() => h(App));
        expect(outside?.value).toBeNull();
        mounted.value = true;
        await settle();
        const held = outside?.value;
        expect(held?.groupId).toBe("outer");
        held?.model.run("panel.resize", { panelId: "nav", size: "30%" });
        expect(held?.model.get("layout-by", { groupId: "outer" })).toEqual({
            nav: 30,
            main: 70,
        });
        // the whole nested layout, in one model
        expect(
            held?.model.get("splitter-json").groups.map(({ id }) => id),
        ).toEqual(["outer"]);
        mounted.value = false;
        await settle();
        expect(outside?.value).toBeNull();
    });

    it("createSplitterRef works outside a component", async () => {
        const splitterRef = createSplitterRef();
        const { wrapper } = await render(() => nested({ splitterRef }));
        expect(splitterRef.current?.groupId).toBe("outer");
        expect(
            splitterRef.current?.model.get("layout-by", { groupId: "inner" }),
        ).toEqual({ editor: 75, terminal: 25 });
        wrapper.unmount();
        expect(splitterRef.current).toBeNull();
    });
});

describe("layout-commit in nested groups", () => {
    it("fires for a commit of its own group only", async () => {
        const outer = vi.fn();
        const inner = vi.fn();
        const model = createSplitterModel();
        await render(() =>
            h(Splitter.Group, { id: "g", model, onLayoutCommit: outer }, () => [
                h(Splitter.Panel, { id: "a" }),
                h(Splitter.Separator),
                h(Splitter.Panel, { id: "b" }, () => [
                    h(
                        Splitter.Group,
                        { id: "h", onLayoutCommit: inner },
                        () => [
                            h(Splitter.Panel, { id: "c" }),
                            h(Splitter.Separator),
                            h(Splitter.Panel, { id: "d" }),
                        ],
                    ),
                ]),
            ]),
        );
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
