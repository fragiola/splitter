import { describe, expect, it, vi } from "vitest";
import { Fragment, h, reactive, ref, shallowRef } from "vue";
import {
    type CommandEvent,
    createSplitterModel,
    type Layout,
    Splitter,
    type SplitterModel,
} from "../src";
import { at, grows, press, render, settle } from "./helpers";

// Props map onto commands: what a group, a panel and a separator declare reaches the model, and
// a change of a prop is one command.

function commandsOf(model: SplitterModel) {
    const events: CommandEvent[] = [];
    model.subscribe((event) => events.push(event));
    return () =>
        events.splice(0).map(({ command, payload }) => ({ command, payload }));
}

const twoPanels = () => [
    h(Splitter.Panel, { id: "a" }),
    h(Splitter.Separator),
    h(Splitter.Panel, { id: "b" }),
];

describe("the group's layout", () => {
    it("is controlled with v-model:layout", async () => {
        const layout = ref<Readonly<Layout>>({ a: 30, b: 70 });
        const { container } = await render(() =>
            h(
                Splitter.Group,
                {
                    id: "g",
                    layout: layout.value,
                    "onUpdate:layout": (next: Readonly<Layout>) => {
                        layout.value = { ...next };
                    },
                },
                twoPanels,
            ),
        );
        expect(grows(container)).toEqual([30, 70]);
        layout.value = { a: 60, b: 40 };
        await settle();
        expect(grows(container)).toEqual([60, 40]);
        await press(at(container, "/g0/s0"), "ArrowRight");
        expect(grows(container)).toEqual([65, 35]);
        expect(layout.value).toEqual({ a: 65, b: 35 });
    });

    it("follows a reactive layout changed in place, and never keeps the proxy", async () => {
        const model = createSplitterModel();
        const layout = reactive({ a: 30, b: 70 });
        const { container } = await render(() =>
            h(Splitter.Group, { id: "g", model, layout }, twoPanels),
        );
        expect(grows(container)).toEqual([30, 70]);
        layout.a = 20;
        layout.b = 80;
        await settle();
        expect(grows(container)).toEqual([20, 80]);
        expect(model.get("layout-by", { groupId: "g" })).toEqual({
            a: 20,
            b: 80,
        });
    });

    it("starts from defaultLayout unless the model saved one", async () => {
        const app = (model: SplitterModel) =>
            h(
                Splitter.Group,
                { id: "g", model, defaultLayout: { a: 30, b: 70 } },
                twoPanels,
            );
        const fresh = await render(() => app(createSplitterModel()));
        expect(grows(fresh.container)).toEqual([30, 70]);
        fresh.wrapper.unmount();
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
        const { container } = await render(() => app(saved));
        expect(grows(container)).toEqual([45, 55]);
    });

    it("ignores a defaultLayout that does not name the group's panels", async () => {
        const { container } = await render(() =>
            h(
                Splitter.Group,
                { id: "g", defaultLayout: { x: 10, y: 90 } },
                () => [
                    h(Splitter.Panel, { id: "a" }),
                    h(Splitter.Panel, { id: "b" }),
                ],
            ),
        );
        expect(grows(container)).toEqual([50, 50]);
    });
});

describe("prop changes become commands", () => {
    it("a group's orientation and disabled flag: group.update", async () => {
        const model = createSplitterModel();
        const on = shallowRef(false);
        const { container } = await render(() =>
            h(
                Splitter.Group,
                {
                    id: "g",
                    model,
                    orientation: on.value ? "vertical" : "horizontal",
                    disabled: on.value,
                },
                twoPanels,
            ),
        );
        const sent = commandsOf(model);
        on.value = true;
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
        const props = shallowRef<{ minSize?: string; collapsible?: boolean }>({
            minSize: "60%",
        });
        const { container } = await render(() =>
            h(Splitter.Group, { id: "g", model }, () => [
                h(Splitter.Panel, { id: "a", ...props.value }),
                h(Splitter.Separator),
                h(Splitter.Panel, { id: "b" }),
            ]),
        );
        expect(grows(container)).toEqual([60, 40]);
        const sent = commandsOf(model);
        props.value = { collapsible: true };
        await settle();
        expect(sent()).toEqual([
            {
                command: "panel.update",
                payload: { panelId: "a", minSize: null, collapsible: true },
            },
        ]);
        expect(at(container, "/g0/p0")).toHaveAttribute("data-collapsible", "");
        props.value = { collapsible: true };
        await settle();
        expect(sent()).toEqual([]);
    });

    it("a panel's id: removed under the old one, added under the new one", async () => {
        const model = createSplitterModel();
        const id = shallowRef("a");
        const { container } = await render(() =>
            h(Splitter.Group, { id: "g", model }, () => [
                h(Splitter.Panel, { id: id.value }),
                h(Splitter.Separator),
                h(Splitter.Panel, { id: "b" }),
            ]),
        );
        id.value = "c";
        await settle();
        expect(model.get("group-by", { id: "g" })?.panelIds).toEqual([
            "c",
            "b",
        ]);
        expect(at(container, "/g0/p0").id).toBe("c");
        expect(at(container, "/g0/s0")).toHaveAttribute("aria-controls", "c");
    });

    it("a separator's disabled and resetOnDoubleClick: separator.update", async () => {
        const model = createSplitterModel();
        const disabled = shallowRef<boolean | undefined>(undefined);
        await render(() =>
            h(Splitter.Group, { id: "g", model }, () => [
                h(Splitter.Panel, { id: "a" }),
                h(Splitter.Separator, { disabled: disabled.value }),
                h(Splitter.Panel, { id: "b" }),
            ]),
        );
        const sent = commandsOf(model);
        disabled.value = true;
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

    it("a separator's prop back to undefined sends its default", async () => {
        const model = createSplitterModel();
        const props = shallowRef<{
            disabled?: boolean;
            resetOnDoubleClick?: boolean;
        }>({ disabled: true, resetOnDoubleClick: false });
        const { container } = await render(() =>
            h(Splitter.Group, { id: "g", model }, () => [
                h(Splitter.Panel, { id: "a" }),
                h(Splitter.Separator, props.value),
                h(Splitter.Panel, { id: "b" }),
            ]),
        );
        expect(model.is("separator-disabled", { separatorId: "a:b" })).toBe(
            true,
        );
        const sent = commandsOf(model);
        props.value = { resetOnDoubleClick: false };
        await settle();
        expect(sent()).toEqual([
            {
                command: "separator.update",
                payload: { separatorId: "a:b", disabled: false },
            },
        ]);
        expect(model.is("separator-disabled", { separatorId: "a:b" })).toBe(
            false,
        );
        expect(at(container, "/g0/s0").hasAttribute("data-disabled")).toBe(
            false,
        );
        props.value = {};
        await settle();
        expect(sent()).toEqual([
            {
                command: "separator.update",
                payload: { separatorId: "a:b", resetOnDoubleClick: true },
            },
        ]);
        props.value = {};
        await settle();
        expect(sent()).toEqual([]);
    });
});

describe("the adapter's commands", () => {
    it("carry meta.source adapter, so a listener tells them from the user's steps", async () => {
        const model = createSplitterModel();
        const events: CommandEvent[] = [];
        model.subscribe((event) => events.push(event));
        const props = shallowRef<{
            third?: boolean;
            min?: string;
            layout?: Layout;
        }>({});
        const { container, wrapper } = await render(() =>
            h(
                Splitter.Group,
                { id: "g", model, layout: props.value.layout },
                () => [
                    h(Splitter.Panel, { id: "a", minSize: props.value.min }),
                    h(Splitter.Separator, { disabled: props.value.third }),
                    h(Splitter.Panel, { id: "b" }),
                    props.value.third
                        ? h(Fragment, [
                              h(Splitter.Separator),
                              h(Splitter.Panel, { id: "c" }),
                          ])
                        : null,
                ],
            ),
        );
        props.value = {
            third: true,
            min: "10%",
            layout: { a: 20, b: 40, c: 40 },
        };
        await settle();
        props.value = { min: "10%" };
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
        wrapper.unmount();
        expect(sources()).toEqual([["group.remove", "adapter"]]);
    });
});

describe("panel callbacks", () => {
    it("@resize gets the size, and the previous one (none the first time)", async () => {
        const onResize = vi.fn();
        const { container } = await render(() =>
            h(Splitter.Group, { id: "g" }, () => [
                h(Splitter.Panel, { id: "a", onResize }),
                h(Splitter.Separator),
                h(Splitter.Panel, { id: "b" }),
            ]),
        );
        expect(onResize).toHaveBeenLastCalledWith(
            { percentage: 50, pixels: undefined },
            undefined,
        );
        await press(at(container, "/g0/s0"), "ArrowLeft");
        expect(onResize).toHaveBeenLastCalledWith(
            { percentage: 45, pixels: undefined },
            { percentage: 50, pixels: undefined },
        );
    });
});

describe("ids", () => {
    it("are generated when not given, and the panel's DOM id is its panel id", async () => {
        const { container } = await render(() =>
            h(Splitter.Group, null, () => [
                h(Splitter.Panel),
                h(Splitter.Separator),
                h(Splitter.Panel),
            ]),
        );
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
        await render(() => [
            h(Splitter.Group, { id: "g", model }, () => [
                h(Splitter.Panel, { id: "a" }),
            ]),
            h(Splitter.Group, { id: "g", model }, () => [
                h(Splitter.Panel, { id: "b" }),
            ]),
        ]);
        expect(error).toHaveBeenCalledWith(
            expect.stringContaining('Splitter.Group "g"'),
        );
        expect(model.get("group-by", { id: "g" })?.panelIds).toEqual(["a"]);
    });
});
