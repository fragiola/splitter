import { describe, expect, it } from "vitest";
import { createSplitterModel } from "../../src/state/model";
import { group, sizes } from "../fixture";

describe("registering groups and panels", () => {
    it("gives a new group its default layout as panels register", () => {
        const model = group([
            { id: "a", defaultSize: "20%" },
            { id: "b" },
            { id: "c" },
        ]);
        expect(sizes(model)).toEqual([20, 40, 40]);
        expect(
            model.get("panels-by", { groupId: "g" }).map(({ id }) => id),
        ).toEqual(["a", "b", "c"]);
    });

    it("sorts panels by their order (document position), not by when they registered", () => {
        const model = group([
            { id: "c", order: 2 },
            { id: "a", order: 0 },
            { id: "b", order: 1 },
        ]);
        expect(model.get("group-by", { id: "g" })?.panelIds).toEqual([
            "a",
            "b",
            "c",
        ]);
        expect(
            model.get("separators-by", { groupId: "g" }).map(({ id }) => id),
        ).toEqual(["a:b", "b:c"]);
    });

    it("places a conditional panel where it is in the markup, and derives its separators", () => {
        const model = group([
            { id: "a", order: 0 },
            { id: "c", order: 1 },
        ]);
        expect(
            model.get("separators-by", { groupId: "g" }).map(({ id }) => id),
        ).toEqual(["a:c"]);
        model.run("batch", {
            commands: [
                {
                    command: "panel.update",
                    payload: { panelId: "c", order: 2 },
                },
                {
                    command: "panel.add",
                    payload: { id: "b", groupId: "g", order: 1 },
                },
            ],
        });
        expect(model.get("group-by", { id: "g" })?.panelIds).toEqual([
            "a",
            "b",
            "c",
        ]);
        const separators = model.get("separators-by", { groupId: "g" });
        expect(
            separators.map(({ id, index, panelIds }) => ({
                id,
                index,
                panelIds,
            })),
        ).toEqual([
            { id: "a:b", index: 0, panelIds: ["a", "b"] },
            { id: "b:c", index: 1, panelIds: ["b", "c"] },
        ]);
        expect(model.get("separator-by", { id: "a:c" })).toBeUndefined();
        model.run("panel.remove", { panelId: "b" });
        expect(model.get("separator-by", { id: "a:c" })?.index).toBe(0);
        expect(sizes(model)).toEqual([50, 50]);
    });

    it("remembers the layout of each panel set: hiding and showing a panel keeps the others' sizes", () => {
        const model = group([
            { id: "a", order: 0 },
            { id: "b", order: 1 },
            { id: "c", order: 2 },
        ]);
        model.run("group.set-layout", {
            groupId: "g",
            layout: { a: 20, b: 50, c: 30 },
        });
        model.run("panel.remove", { panelId: "c" });
        // a set never seen takes its default layout
        expect(sizes(model)).toEqual([50, 50]);
        model.run("group.set-layout", {
            groupId: "g",
            layout: { a: 30, b: 70 },
        });
        model.run("panel.add", { id: "c", groupId: "g", order: 2 });
        expect(sizes(model)).toEqual([20, 50, 30]);
        expect(model.get("group-by", { id: "g" })?.pristine).toBe(false);
        model.run("panel.remove", { panelId: "c" });
        expect(sizes(model)).toEqual([30, 70]);
        // the memory is not part of the document
        expect(model.get("splitter-json")).toEqual({
            version: 1,
            groups: [
                {
                    id: "g",
                    panels: [
                        { id: "a", size: 30 },
                        { id: "b", size: 70 },
                    ],
                },
            ],
        });
    });

    it("remembers only a layout the user changed, clamped to the constraints when it comes back", () => {
        const model = group([{ id: "a" }, { id: "b" }]);
        model.run("panel.add", { id: "c", groupId: "g" });
        model.run("panel.remove", { panelId: "c" });
        expect(model.get("group-by", { id: "g" })?.layoutMemory).toEqual({});
        model.run("panel.resize", { panelId: "a", size: "10%" });
        model.run("panel.add", { id: "c", groupId: "g" });
        model.run("panel.update", { panelId: "a", minSize: "25%" });
        model.run("panel.remove", { panelId: "c" });
        expect(sizes(model)).toEqual([25, 75]);
    });

    it("keeps the registration order on equal orders, and appends without one", () => {
        const model = group([{ id: "a" }, { id: "b" }]);
        model.run("panel.add", { id: "c", groupId: "g" });
        expect(model.get("panel-by", { id: "c" })?.order).toBe(2);
        model.run("panel.update", { panelId: "c", order: 0 });
        expect(model.get("group-by", { id: "g" })?.panelIds).toEqual([
            "a",
            "c",
            "b",
        ]);
    });

    it("finds a separator between panels whose ids hold a colon", () => {
        const model = group([{ id: "x:1" }, { id: "x:2" }]);
        expect(model.get("separator-by", { id: "x:1:x:2" })?.panelIds).toEqual([
            "x:1",
            "x:2",
        ]);
    });

    it("refuses ids in use and groups or panels that do not exist", () => {
        const model = group([{ id: "a" }]);
        expect(model.run("group.add", { id: "g" })).toMatchObject({
            ok: false,
            error: { code: "refused", path: "/id" },
        });
        expect(model.run("panel.add", { id: "a", groupId: "g" })).toMatchObject(
            {
                ok: false,
                error: { code: "refused", path: "/id" },
            },
        );
        expect(model.run("panel.add", { groupId: "nope" })).toMatchObject({
            ok: false,
            error: { code: "not_found", path: "/groupId" },
        });
        expect(model.run("panel.remove", { panelId: "nope" })).toMatchObject({
            ok: false,
            error: { code: "not_found" },
        });
        expect(
            model.run("separator.move", { separatorId: "a:z", delta: 1 }),
        ).toMatchObject({
            ok: false,
            error: { code: "not_found", path: "/separatorId" },
        });
    });

    it("refuses __proto__ as an id", () => {
        const model = createSplitterModel();
        expect(model.run("group.add", { id: "__proto__" })).toMatchObject({
            ok: false,
            error: { code: "invalid_payload", path: "/id" },
        });
    });

    it("removes a group with its panels", () => {
        const model = group([{ id: "a" }, { id: "b" }]);
        expect(model.run("group.remove", { groupId: "g" })).toEqual({
            ok: true,
            value: { groupId: "g", panelIds: ["a", "b"] },
        });
        expect(model.get("groups")).toEqual([]);
        expect(model.get("panel-by", { id: "a" })).toBeUndefined();
    });

    it("keeps a changed layout on removal with keepLayout, until the group registers again", () => {
        const model = group([{ id: "a" }, { id: "b" }]);
        model.run("panel.resize", { panelId: "a", size: "30%" });
        model.run("group.remove", { groupId: "g", keepLayout: true });
        expect(model.get("groups")).toEqual([]);
        expect(model.get("splitter-json")).toEqual({
            version: 1,
            groups: [
                {
                    id: "g",
                    panels: [
                        { id: "a", size: 30 },
                        { id: "b", size: 70 },
                    ],
                },
            ],
        });
        model.run("batch", {
            commands: [
                { command: "group.add", payload: { id: "g" } },
                { command: "panel.add", payload: { id: "a", groupId: "g" } },
                { command: "panel.add", payload: { id: "b", groupId: "g" } },
            ],
        });
        expect(model.get("layout-by", { groupId: "g" })).toEqual({
            a: 30,
            b: 70,
        });
    });

    it("keeps nothing for a default layout, or without keepLayout", () => {
        const model = group([{ id: "a" }, { id: "b" }]);
        model.run("group.remove", { groupId: "g", keepLayout: true });
        expect(model.get("state").pending).toEqual({});
        const changed = group([{ id: "a" }, { id: "b" }]);
        changed.run("panel.resize", { panelId: "a", size: "30%" });
        changed.run("group.remove", { groupId: "g" });
        expect(changed.get("state").pending).toEqual({});
    });

    it("updates a group's orientation, nesting and disabled flag", () => {
        const model = group([{ id: "a" }, { id: "b" }]);
        model.run("group.update", {
            groupId: "g",
            orientation: "vertical",
            parentPanelId: "outer",
            disabled: true,
        });
        expect(model.get("group-by", { id: "g" })).toMatchObject({
            orientation: "vertical",
            parentPanelId: "outer",
            disabled: true,
        });
        model.run("group.update", { groupId: "g", parentPanelId: null });
        expect(
            model.get("group-by", { id: "g" })?.parentPanelId,
        ).toBeUndefined();
    });

    it("holds nested groups in one model", () => {
        const model = createSplitterModel();
        model.run("batch", {
            commands: [
                { command: "group.add", payload: { id: "outer" } },
                {
                    command: "panel.add",
                    payload: {
                        id: "nav",
                        groupId: "outer",
                        defaultSize: "25%",
                    },
                },
                {
                    command: "panel.add",
                    payload: { id: "main", groupId: "outer" },
                },
                {
                    command: "group.add",
                    payload: {
                        id: "inner",
                        orientation: "vertical",
                        parentPanelId: "main",
                    },
                },
                {
                    command: "panel.add",
                    payload: { id: "editor", groupId: "inner" },
                },
                {
                    command: "panel.add",
                    payload: {
                        id: "terminal",
                        groupId: "inner",
                        defaultSize: "30%",
                    },
                },
            ],
        });
        model.run("separator.move", {
            separatorId: "editor:terminal",
            delta: 20,
        });
        expect(sizes(model, "outer")).toEqual([25, 75]);
        expect(sizes(model, "inner")).toEqual([90, 10]);
        expect(model.get("splitter-json").groups.map(({ id }) => id)).toEqual([
            "outer",
            "inner",
        ]);
        // removing the outer group leaves the nested one: it unregisters on its own
        model.run("group.remove", { groupId: "outer" });
        expect(model.get("group-by", { id: "inner" })?.parentPanelId).toBe(
            "main",
        );
    });
});

describe("panel.update", () => {
    it("changes constraints, clamps the layout, and null removes one", () => {
        const model = group([{ id: "a" }, { id: "b" }]);
        model.run("panel.resize", { panelId: "a", size: "20%" });
        model.run("panel.update", { panelId: "a", minSize: "30%" });
        expect(sizes(model)).toEqual([30, 70]);
        model.run("panel.update", {
            panelId: "a",
            minSize: null,
            collapsible: true,
        });
        const panel = model.get("panel-by", { id: "a" });
        expect(panel?.minSize).toBeUndefined();
        expect(panel?.collapsible).toBe(true);
        expect(model.is("panel-collapsible", { panelId: "a" })).toBe(true);
    });

    it("derives a default layout again when the layout is still the default", () => {
        const model = group([{ id: "a" }, { id: "b" }]);
        model.run("panel.update", { panelId: "a", defaultSize: "10%" });
        expect(sizes(model)).toEqual([10, 90]);
        model.run("panel.resize", { panelId: "a", size: "40%" });
        model.run("panel.update", { panelId: "a", defaultSize: "20%" });
        expect(sizes(model)).toEqual([40, 60]);
    });
});

describe("group.set-layout and group.reset", () => {
    it("scales, clamps and returns the layout applied", () => {
        const model = group([{ id: "a", maxSize: "50%" }, { id: "b" }]);
        expect(
            model.run("group.set-layout", {
                groupId: "g",
                layout: { a: 3, b: 1 },
            }),
        ).toEqual({
            ok: true,
            value: { layout: { a: 50, b: 50 } },
        });
        expect(
            model.run("group.set-layout", {
                groupId: "g",
                layout: { a: 20, b: 80 },
            }),
        ).toEqual({
            ok: true,
            value: { layout: { a: 20, b: 80 } },
        });
    });

    it("needs exactly the group's panels", () => {
        const model = group([{ id: "a" }, { id: "b" }]);
        expect(
            model.run("group.set-layout", { groupId: "g", layout: { a: 100 } }),
        ).toMatchObject({
            ok: false,
            error: { code: "invalid_payload", path: "/layout" },
        });
        expect(
            model.run("group.set-layout", {
                groupId: "g",
                layout: { a: 50, b: 40, z: 10 },
            }),
        ).toMatchObject({
            ok: false,
            error: { code: "invalid_payload", path: "/layout/z" },
        });
        expect(
            model.run("group.set-layout", {
                groupId: "g",
                layout: { a: 150, b: 0 },
            }),
        ).toMatchObject({
            ok: false,
            error: { code: "invalid_payload", path: "/layout/a" },
        });
    });

    it("resets to the default layout", () => {
        const model = group([{ id: "a", defaultSize: "30%" }, { id: "b" }]);
        model.run("panel.resize", { panelId: "a", size: "60%" });
        expect(model.run("group.reset", { groupId: "g" })).toEqual({
            ok: true,
            value: { layout: { a: 30, b: 70 } },
        });
    });
});

describe("group.measure: units and the group resize behaviour", () => {
    it("resolves pixel, rem and viewport constraints once measured, without a DOM", () => {
        const model = group([
            { id: "a", defaultSize: 200, minSize: "10rem" },
            { id: "b", maxSize: "80vw" },
        ]);
        // before a measure, sizes in px cannot resolve: an equal split
        expect(sizes(model)).toEqual([50, 50]);
        expect(model.is("group-measured", { groupId: "g" })).toBe(false);
        model.run(
            "group.measure",
            {
                groupId: "g",
                axisSize: 1000,
                rootFontSize: 16,
                viewportWidth: 1200,
            },
            { transient: true },
        );
        expect(model.is("group-measured", { groupId: "g" })).toBe(true);
        expect(sizes(model)).toEqual([20, 80]);
        expect(
            model.get("panel-constraints-by", { panelId: "a" }),
        ).toMatchObject({
            minSize: 16,
            defaultSize: 20,
        });
        expect(
            model.get("panel-constraints-by", { panelId: "b" })?.maxSize,
        ).toBe(96);
        // can and check answer with the measured constraints
        expect(
            model.check("panel.resize", { panelId: "a", size: 100 }),
        ).toEqual({
            ok: true,
            value: { size: 16 },
        });
        expect(model.get("panel-size-by", { panelId: "a" })).toEqual({
            percentage: 20,
            pixels: 200,
        });
    });

    it("keeps a user's layout and clamps it to the new constraints", () => {
        const model = group([{ id: "a", minSize: 300 }, { id: "b" }], {
            axisSize: 1000,
        });
        model.run("panel.resize", { panelId: "a", size: "40%" });
        model.run("group.measure", { groupId: "g", axisSize: 500 });
        expect(sizes(model)).toEqual([60, 40]);
    });

    it("preserve-relative-size keeps percentages when the group resizes", () => {
        const model = group([{ id: "a" }, { id: "b" }], { axisSize: 1000 });
        model.run("panel.resize", { panelId: "a", size: "30%" });
        model.run("group.measure", { groupId: "g", axisSize: 2000 });
        expect(sizes(model)).toEqual([30, 70]);
    });

    it("preserve-pixel-size keeps a panel's pixels when the group resizes", () => {
        const model = group(
            [
                {
                    id: "a",
                    defaultSize: 200,
                    groupResizeBehavior: "preserve-pixel-size",
                },
                { id: "b" },
                { id: "c" },
            ],
            { axisSize: 1000 },
        );
        model.run("panel.resize", { panelId: "b", size: "50%" });
        expect(sizes(model)).toEqual([20, 50, 30]);
        model.run("group.measure", { groupId: "g", axisSize: 2000 });
        expect(sizes(model)).toEqual([10, 56.25, 33.75]);
        expect(model.get("panel-size-by", { panelId: "a" })?.pixels).toBe(200);
    });

    it("keeps a collapsed panel collapsed at its resolved collapsed size", () => {
        const model = group(
            [
                { id: "a", collapsible: true, collapsedSize: 50, minSize: 200 },
                { id: "b" },
            ],
            { axisSize: 1000 },
        );
        model.run("panel.collapse", { panelId: "a" });
        expect(sizes(model)).toEqual([5, 95]);
        model.run("group.measure", { groupId: "g", axisSize: 500 });
        expect(model.is("panel-collapsed", { panelId: "a" })).toBe(true);
        expect(sizes(model)).toEqual([10, 90]);
    });
});

describe("separator.move", () => {
    it("moves the boundary: positive grows the panels before it", () => {
        const model = group([{ id: "a" }, { id: "b" }]);
        expect(
            model.run("separator.move", { separatorId: "a:b", delta: 10 }),
        ).toEqual({
            ok: true,
            value: { layout: { a: 60, b: 40 } },
        });
        model.run("separator.move", { separatorId: "a:b", delta: -30 });
        expect(sizes(model)).toEqual([30, 70]);
    });

    it("measures each step of a drag from its origin, so a collapse threshold works", () => {
        const model = group([
            { id: "a", collapsible: true, minSize: "20%" },
            { id: "b" },
        ]);
        model.run("group.set-layout", {
            groupId: "g",
            layout: { a: 30, b: 70 },
        });
        const origin = { a: 30, b: 70 };
        const step = (delta: number) =>
            model.run(
                "separator.move",
                { separatorId: "a:b", delta, origin },
                { transient: true },
            );
        step(-5);
        expect(sizes(model)).toEqual([25, 75]);
        step(-15);
        expect(sizes(model)).toEqual([20, 80]);
        step(-21);
        expect(sizes(model)).toEqual([0, 100]);
        expect(model.is("panel-collapsed", { panelId: "a" })).toBe(true);
        expect(model.get("panel-by", { id: "a" })?.restoreSize).toBe(20);
        step(-5);
        expect(sizes(model)).toEqual([25, 75]);
    });

    it("collapses and expands in one keyboard step", () => {
        const model = group([
            { id: "a", collapsible: true, minSize: "20%" },
            { id: "b" },
        ]);
        model.run("group.set-layout", {
            groupId: "g",
            layout: { a: 20, b: 80 },
        });
        model.run("separator.move", {
            separatorId: "a:b",
            delta: -5,
            source: "keyboard",
        });
        expect(sizes(model)).toEqual([0, 100]);
        model.run("separator.move", {
            separatorId: "a:b",
            delta: 5,
            source: "keyboard",
        });
        expect(sizes(model)).toEqual([20, 80]);
    });

    it("never resizes a disabled panel, directly or indirectly", () => {
        const model = group([
            { id: "a" },
            { id: "b", disabled: true },
            { id: "c" },
        ]);
        const before = sizes(model);
        for (const separatorId of ["a:b", "b:c"]) {
            for (const delta of [-30, -5, 5, 30]) {
                model.run("separator.move", { separatorId, delta });
                expect(sizes(model)[1]).toBe(before[1]);
            }
        }
        expect(model.is("panel-disabled", { panelId: "b" })).toBe(true);
    });

    it("is refused on a disabled separator or in a disabled group", () => {
        const model = group([{ id: "a" }, { id: "b" }, { id: "c" }]);
        model.run("separator.update", { separatorId: "a:b", disabled: true });
        expect(model.is("separator-disabled", { separatorId: "a:b" })).toBe(
            true,
        );
        expect(
            model.run("separator.move", { separatorId: "a:b", delta: 5 }),
        ).toMatchObject({
            ok: false,
            error: { code: "refused" },
        });
        // its panels still resize through the other separator
        expect(
            model.run("separator.move", { separatorId: "b:c", delta: 5 }).ok,
        ).toBe(true);
        model.run("group.update", { groupId: "g", disabled: true });
        expect(model.is("separator-disabled", { separatorId: "b:c" })).toBe(
            true,
        );
        expect(
            model.can("separator.move", { separatorId: "b:c", delta: 5 }),
        ).toBe(false);
        // code still resizes the panels of a disabled group
        expect(
            model.run("panel.resize", { panelId: "a", size: "10%" }).ok,
        ).toBe(true);
    });

    it("refuses an origin that is not the group's layout", () => {
        const model = group([{ id: "a" }, { id: "b" }]);
        expect(
            model.run("separator.move", {
                separatorId: "a:b",
                delta: 5,
                origin: { a: 100 },
            }),
        ).toMatchObject({
            ok: false,
            error: { code: "invalid_payload", path: "/origin" },
        });
    });

    it.each([2, 3, 4, 5])(
        "keeps %i panels summing to 100 within their constraints",
        (count) => {
            const ids = Array.from({ length: count }, (_, i) => `p${i}`);
            const model = group(
                ids.map((id) => ({ id, minSize: "10%", maxSize: "60%" })),
            );
            for (let i = 0; i < count - 1; i++) {
                for (const delta of [-50, 50, -7.5, 12.25]) {
                    model.run("separator.move", {
                        separatorId: `${ids[i]}:${ids[i + 1]}`,
                        delta,
                    });
                    const layout = sizes(model);
                    const total = layout.reduce((sum, size) => sum + size, 0);
                    expect(Math.abs(total - 100)).toBeLessThan(0.01);
                    for (const size of layout) {
                        expect(size).toBeGreaterThanOrEqual(10);
                        expect(size).toBeLessThanOrEqual(60);
                    }
                }
            }
        },
    );
});

describe("separator.update and its questions", () => {
    it("records the double click option, and tells whether a double click resets", () => {
        const model = group([
            { id: "a", defaultSize: "30%" },
            { id: "b" },
            { id: "c" },
        ]);
        expect(model.is("separator-resettable", { separatorId: "a:b" })).toBe(
            true,
        );
        expect(model.is("separator-resettable", { separatorId: "b:c" })).toBe(
            false,
        );
        model.run("separator.update", {
            separatorId: "a:b",
            resetOnDoubleClick: false,
        });
        expect(
            model.get("separator-by", { id: "a:b" })?.resetOnDoubleClick,
        ).toBe(false);
        expect(model.is("separator-resettable", { separatorId: "a:b" })).toBe(
            false,
        );
    });

    it("forgets the options of a separator that no longer exists", () => {
        const model = group([{ id: "a" }, { id: "b" }, { id: "c" }]);
        model.run("separator.update", { separatorId: "a:b", disabled: true });
        model.run("panel.remove", { panelId: "b" });
        expect(model.get("group-by", { id: "g" })?.separators).toEqual({});
    });

    it("answers the separator's values for assistive technology", () => {
        const model = group([
            {
                id: "a",
                collapsible: true,
                collapsedSize: "5%",
                minSize: "20%",
                maxSize: "70%",
            },
            { id: "b", minSize: "20%" },
        ]);
        model.run("panel.resize", { panelId: "a", size: "35%" });
        expect(
            model.get("separator-values-by", { separatorId: "a:b" }),
        ).toEqual({
            panelId: "a",
            valueNow: 35,
            valueMin: 5,
            valueMax: 70,
        });
        expect(
            model.get("separator-values-by", { separatorId: "z:y" }),
        ).toBeUndefined();
    });

    it("answers unknown ids with undefined or false", () => {
        const model = group([{ id: "a" }, { id: "b" }]);
        expect(model.get("group-by", { id: "z" })).toBeUndefined();
        expect(model.get("layout-by", { groupId: "z" })).toBeUndefined();
        expect(model.get("panels-by", { groupId: "z" })).toEqual([]);
        expect(model.get("separators-by", { groupId: "z" })).toEqual([]);
        expect(model.get("panel-size-by", { panelId: "z" })).toBeUndefined();
        expect(model.is("panel-collapsed", { panelId: "z" })).toBe(false);
        expect(model.is("separator-disabled", { separatorId: "z" })).toBe(
            false,
        );
        expect(model.get("panel-size-by", { panelId: "a" })).toEqual({
            percentage: 50,
            pixels: undefined,
        });
    });
});
