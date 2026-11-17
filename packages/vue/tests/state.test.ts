import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, shallowRef } from "vue";
import {
    createSplitterModel,
    Splitter,
    type SplitterRef,
    useSplitterRef,
    useSplitterState,
} from "../src";
import { mountApp, render, settle } from "./helpers";

// useSplitterState follows an answer of the model, as a computed ref that changes only when that
// answer changes.

describe("useSplitterState", () => {
    it("re-renders inside a group when its answer changes, and only then", async () => {
        const model = createSplitterModel();
        let renders = 0;
        const Status = defineComponent({
            setup() {
                const collapsed = useSplitterState(({ model }) =>
                    model.is("panel-collapsed", { panelId: "a" }),
                );
                return () => {
                    renders++;
                    return h(
                        "output",
                        collapsed.value ? "collapsed" : "expanded",
                    );
                };
            },
        });
        const { container } = await render(() =>
            h(Splitter.Group, { id: "g", model }, () => [
                h(
                    Splitter.Panel,
                    { id: "a", collapsible: true, minSize: "20%" },
                    () => [h(Status)],
                ),
                h(Splitter.Separator),
                h(Splitter.Panel, { id: "b" }),
            ]),
        );
        const output = () => container.querySelector("output")?.textContent;
        expect(output()).toBe("expanded");
        const before = renders;
        model.run("panel.resize", { panelId: "a", size: "40%" });
        await settle();
        // a resize does not change the answer: no render
        expect(renders).toBe(before);
        model.run("panel.collapse", { panelId: "a" });
        await settle();
        expect(output()).toBe("collapsed");
        model.run("panel.expand", { panelId: "a" });
        await settle();
        expect(output()).toBe("expanded");
    });

    it("reads a splitter through its ref from outside, undefined until a group holds it", async () => {
        const model = createSplitterModel();
        const shown = shallowRef(false);
        let held: SplitterRef | undefined;
        const seen: unknown[] = [];
        const Toolbar = defineComponent({
            props: { splitterRef: { type: Object, required: true } },
            setup(props) {
                const size = useSplitterState(
                    ({ model }) =>
                        model.get("panel-size-by", { panelId: "a" })
                            ?.percentage,
                    { splitterRef: () => props.splitterRef as SplitterRef },
                );
                return () => {
                    seen.push(size.value);
                    return null;
                };
            },
        });
        const App = defineComponent({
            setup() {
                const splitterRef = useSplitterRef();
                held = splitterRef;
                return () => [
                    h(Toolbar, { splitterRef }),
                    shown.value
                        ? h(
                              Splitter.Group,
                              { id: "g", model, splitterRef },
                              () => [
                                  h(Splitter.Panel, { id: "a" }),
                                  h(Splitter.Separator),
                                  h(Splitter.Panel, { id: "b" }),
                              ],
                          )
                        : null,
                ];
            },
        });
        await mountApp(App);
        expect(seen).toEqual([undefined]);
        shown.value = true;
        await settle();
        expect(seen.at(-1)).toBe(50);
        model.run("panel.resize", { panelId: "a", size: "30%" });
        await settle();
        expect(seen.at(-1)).toBe(30);
        expect(held?.current?.groupId).toBe("g");
        shown.value = false;
        await settle();
        expect(seen.at(-1)).toBeUndefined();
    });

    it("keeps an equal answer with isEqual, and throws outside a group without a ref", async () => {
        const model = createSplitterModel();
        const answers: unknown[] = [];
        const Layout = defineComponent({
            setup() {
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
                return () => {
                    answers.push(ids.value);
                    return null;
                };
            },
        });
        await render(() =>
            h(Splitter.Group, { id: "g", model }, () => [
                h(Splitter.Panel, { id: "a" }, () => [h(Layout)]),
                h(Splitter.Separator),
                h(Splitter.Panel, { id: "b" }),
            ]),
        );
        const count = answers.length;
        expect(answers.at(-1)).toEqual(["a", "b"]);
        model.run("panel.resize", { panelId: "a", size: "30%" });
        await settle();
        // a new array of the same ids: kept, so no render
        expect(answers).toHaveLength(count);
        vi.spyOn(console, "warn").mockImplementation(() => {});
        const Outside = defineComponent({
            setup() {
                useSplitterState(({ groupId }) => groupId);
                return () => null;
            },
        });
        await expect(mountApp(Outside)).rejects.toThrow(
            "useSplitter must be used inside Splitter.Group",
        );
    });

    it("selects again when a reactive value its selector reads changes", async () => {
        const model = createSplitterModel();
        const panelId = shallowRef("a");
        let size: { value: number | undefined } | undefined;
        const Probe = defineComponent({
            setup() {
                size = useSplitterState(
                    ({ model }) =>
                        model.get("panel-size-by", { panelId: panelId.value })
                            ?.percentage,
                );
                return () => null;
            },
        });
        await render(() =>
            h(Splitter.Group, { id: "g", model }, () => [
                h(Probe),
                h(Splitter.Panel, { id: "a", defaultSize: "30%" }),
                h(Splitter.Separator),
                h(Splitter.Panel, { id: "b" }),
            ]),
        );
        expect(size?.value).toBe(30);
        panelId.value = "b";
        expect(size?.value).toBe(70);
    });
});
