// Resizing, collapsing and expanding a panel from code, through the model's commands. The cases
// are ported from React Resizable Panels (https://github.com/bvaughn/react-resizable-panels,
// lib/global/utils/getImperativeItemMethods.test.ts), which is the behaviour reference, adapted to
// Splitter's commands. Copyright (c) 2018 Brian Vaughn. MIT licence, see LICENSE.
import { describe, expect, test } from "vitest";
import { createSplitterModel } from "../../src/state/model";

interface Declared {
    collapsedSize?: number;
    collapsedThreshold?: number;
    collapsible?: boolean;
    defaultSize?: number;
    disabled?: boolean;
    maxSize?: number;
    minSize?: number;
}

const pct = (value: number | undefined) =>
    value === undefined ? undefined : `${value}%`;

/** A 1000px horizontal group of panels "0", "1", … declared in percent, and its layout changes. */
function init(panels: Declared[]) {
    const model = createSplitterModel();
    const added = model.run("batch", {
        commands: [
            { command: "group.add", payload: { id: "group" } },
            ...panels.map((panel, index) => ({
                command: "panel.add" as const,
                payload: {
                    id: `${index}`,
                    groupId: "group",
                    ...(panel.collapsible === undefined
                        ? {}
                        : { collapsible: panel.collapsible }),
                    ...(panel.disabled === undefined
                        ? {}
                        : { disabled: panel.disabled }),
                    ...Object.fromEntries(
                        (
                            [
                                "collapsedSize",
                                "collapsedThreshold",
                                "defaultSize",
                                "maxSize",
                                "minSize",
                            ] as const
                        ).flatMap((key) =>
                            panel[key] === undefined
                                ? []
                                : [[key, pct(panel[key])]],
                        ),
                    ),
                },
            })),
            {
                command: "group.measure",
                payload: { groupId: "group", axisSize: 1000 },
            },
        ],
    });
    expect(added.ok).toBe(true);
    const changes: number[][] = [];
    model.subscribe(({ before, after }) => {
        const prev = before.groups.group?.layout;
        const next = after.groups.group?.layout;
        if (next && prev !== next) {
            changes.push(panels.map((_, index) => next[`${index}`] ?? -1));
        }
    });
    const api = (index: number) => {
        const panelId = `${index}`;
        return {
            collapse: () => model.run("panel.collapse", { panelId }),
            expand: () => model.run("panel.expand", { panelId }),
            resize: (size: string) =>
                model.run("panel.resize", { panelId, size }),
            isCollapsed: () => model.is("panel-collapsed", { panelId }),
        };
    };
    return { model, changes, api };
}

describe("panel.collapse", () => {
    test.each([20, 30])(
        "collapses and restores a panel with threshold %s",
        (collapsedThreshold) => {
            const { api, changes } = init([
                {
                    collapsedSize: 5,
                    collapsedThreshold,
                    collapsible: true,
                    defaultSize: 25,
                    minSize: 25,
                },
                {},
            ]);
            api(0).collapse();
            expect(api(0).isCollapsed()).toBe(true);
            expect(changes.at(-1)).toEqual([5, 95]);
            api(0).expand();
            expect(api(0).isCollapsed()).toBe(false);
            expect(changes.at(-1)).toEqual([25, 75]);
        },
    );

    test("is refused when the panel is not collapsible", () => {
        const { api, changes } = init([{}, {}]);
        const result = api(0).collapse();
        expect(result.ok).toBe(false);
        expect(!result.ok && result.error.code).toBe("refused");
        expect(changes).toEqual([]);
    });

    test("gives space to panels before it rather than expanding a collapsed panel after it", () => {
        const { api, changes } = init([
            {
                collapsedSize: 5,
                collapsible: true,
                defaultSize: 50,
                minSize: 20,
            },
            {
                collapsedSize: 5,
                collapsible: true,
                defaultSize: 40,
                minSize: 20,
            },
            {
                collapsedSize: 5,
                collapsible: true,
                defaultSize: 5,
                minSize: 20,
            },
            {
                collapsedSize: 5,
                collapsible: true,
                defaultSize: 5,
                minSize: 20,
            },
        ]);
        api(1).collapse();
        expect(api(2).isCollapsed()).toBe(true);
        expect(changes).toEqual([[85, 5, 5, 5]]);
    });

    test("gives space to the nearest panel that isn't collapsed", () => {
        const { api, changes } = init([
            {
                collapsedSize: 5,
                collapsible: true,
                defaultSize: 5,
                minSize: 20,
            },
            {
                collapsedSize: 5,
                collapsible: true,
                defaultSize: 60,
                minSize: 20,
            },
            {
                collapsedSize: 5,
                collapsible: true,
                defaultSize: 5,
                minSize: 20,
            },
            {
                collapsedSize: 5,
                collapsible: true,
                defaultSize: 30,
                minSize: 20,
            },
        ]);
        api(1).collapse();
        expect(changes).toEqual([[5, 5, 5, 85]]);
    });

    test("does nothing if the panel is already collapsed", () => {
        const { api, changes } = init([
            { defaultSize: 0, collapsible: true },
            {},
        ]);
        expect(api(0).collapse()).toEqual({ ok: true, value: { size: 0 } });
        expect(changes).toEqual([]);
    });

    test("resizes the panel to its collapsed size", () => {
        const { api, changes } = init([
            { defaultSize: 50, collapsible: true },
            {},
        ]);
        api(0).collapse();
        expect(changes).toEqual([[0, 100]]);
    });

    test("collapses a disabled panel (code may)", () => {
        const { api, changes } = init([
            { collapsible: true, defaultSize: 50, disabled: true },
            {},
        ]);
        api(0).collapse();
        expect(changes).toEqual([[0, 100]]);
    });
});

describe("panel.expand", () => {
    test("is refused when the panel is not collapsible", () => {
        const { api, changes } = init([{ defaultSize: 0 }, {}]);
        expect(api(0).expand().ok).toBe(false);
        expect(changes).toEqual([]);
    });

    test("does nothing if the panel is not collapsed", () => {
        const { api, changes } = init([
            { collapsible: true, defaultSize: 50 },
            {},
        ]);
        expect(api(0).expand()).toEqual({ ok: true, value: { size: 50 } });
        expect(changes).toEqual([]);
    });

    test("expands the panel to its size before it collapsed", () => {
        const { api, changes, model } = init([
            { collapsible: true, defaultSize: 50, minSize: 25 },
            {},
        ]);
        api(0).resize("35");
        expect(changes.at(-1)).toEqual([35, 65]);
        api(0).collapse();
        expect(changes.at(-1)).toEqual([0, 100]);
        expect(model.get("panel-by", { id: "0" })?.restoreSize).toBe(35);
        api(0).expand();
        expect(changes).toHaveLength(3);
        expect(changes.at(-1)).toEqual([35, 65]);
    });

    test("expands the panel to its minimum size as a fallback", () => {
        const { api, changes } = init([
            { collapsible: true, defaultSize: 0, minSize: 25 },
            {},
        ]);
        api(0).expand();
        expect(changes).toEqual([[25, 75]]);
    });

    test("expands to a non-zero size if minSize is 0 (upstream issue 561)", () => {
        const { api, changes } = init([
            { collapsible: true, defaultSize: 0, minSize: 0 },
            {},
        ]);
        api(0).expand();
        expect(changes).toEqual([[1, 99]]);
    });

    test("expands a disabled panel (code may)", () => {
        const { api, changes } = init([
            { defaultSize: 0, collapsible: true, disabled: true, minSize: 10 },
            {},
        ]);
        api(0).expand();
        expect(changes).toEqual([[10, 90]]);
    });

    test("takes space from panels before it rather than collapsing a panel after it", () => {
        const { api, changes } = init([
            { defaultSize: 40, minSize: 20 },
            { defaultSize: 35, minSize: 20 },
            {
                collapsedSize: 5,
                collapsible: true,
                defaultSize: 5,
                minSize: 20,
            },
            {
                collapsedSize: 5,
                collapsible: true,
                defaultSize: 20,
                minSize: 20,
            },
        ]);
        api(2).expand();
        expect(api(3).isCollapsed()).toBe(false);
        expect(changes).toEqual([[40, 20, 20, 20]]);
    });

    test("restores the previous size by shrinking several panels to their minimum, rather than collapsing one", () => {
        const { api, changes } = init([
            { defaultSize: 20, minSize: 20 },
            {
                collapsedSize: 5,
                collapsible: true,
                defaultSize: 40,
                minSize: 20,
            },
            {
                collapsedSize: 5,
                collapsible: true,
                defaultSize: 20,
                minSize: 20,
            },
            {
                collapsedSize: 5,
                collapsible: true,
                defaultSize: 20,
                minSize: 20,
            },
        ]);
        api(1).collapse();
        expect(changes.at(-1)).toEqual([20, 5, 55, 20]);
        api(3).resize("35%");
        expect(changes.at(-1)).toEqual([20, 5, 40, 35]);
        api(1).expand();
        expect(api(2).isCollapsed()).toBe(false);
        expect(api(3).isCollapsed()).toBe(false);
        expect(changes.at(-1)).toEqual([20, 40, 20, 20]);
    });

    test("expands to the largest size that fits when restoring would collapse another panel", () => {
        const { api, changes } = init([
            { defaultSize: 10, minSize: 10 },
            {
                collapsedSize: 5,
                collapsible: true,
                defaultSize: 60,
                minSize: 20,
            },
            {
                collapsedSize: 5,
                collapsible: true,
                defaultSize: 5,
                minSize: 20,
            },
            {
                collapsedSize: 5,
                collapsible: true,
                defaultSize: 25,
                minSize: 20,
            },
        ]);
        api(1).collapse();
        expect(changes.at(-1)).toEqual([10, 5, 5, 80]);
        api(2).expand();
        expect(changes.at(-1)).toEqual([10, 5, 20, 65]);
        api(1).expand();
        expect(api(2).isCollapsed()).toBe(false);
        expect(api(3).isCollapsed()).toBe(false);
        expect(changes.at(-1)).toEqual([10, 50, 20, 20]);
    });

    test("takes space from the nearest panel that can give it, rather than collapsing one at its minimum", () => {
        const { api, changes } = init([
            {
                collapsedSize: 5,
                collapsible: true,
                defaultSize: 20,
                minSize: 20,
            },
            {
                collapsedSize: 5,
                collapsible: true,
                defaultSize: 40,
                minSize: 20,
            },
            {
                collapsedSize: 5,
                collapsible: true,
                defaultSize: 20,
                minSize: 20,
            },
            {
                collapsedSize: 5,
                collapsible: true,
                defaultSize: 20,
                minSize: 20,
            },
        ]);
        api(1).collapse();
        expect(changes.at(-1)).toEqual([20, 5, 55, 20]);
        api(3).resize("55%");
        expect(changes.at(-1)).toEqual([20, 5, 20, 55]);
        api(1).expand();
        expect(api(2).isCollapsed()).toBe(false);
        expect(changes.at(-1)).toEqual([20, 40, 20, 20]);
    });

    test("takes space from panels before it when the panels after it are collapsed", () => {
        const { api, changes } = init([
            { defaultSize: 45 },
            { defaultSize: 45 },
            {
                collapsedSize: 5,
                collapsible: true,
                defaultSize: 5,
                minSize: 20,
            },
            {
                collapsedSize: 5,
                collapsible: true,
                defaultSize: 5,
                minSize: 20,
            },
        ]);
        api(2).expand();
        expect(api(2).isCollapsed()).toBe(false);
        expect(api(3).isCollapsed()).toBe(true);
        expect(changes).toEqual([[45, 30, 20, 5]]);
    });
});

describe("panel.resize", () => {
    test("ignores a no-op size", () => {
        const { api, changes } = init([{ defaultSize: 10 }, {}]);
        api(0).resize("10%");
        expect(changes).toEqual([]);
    });

    test("ignores a size it clamps back to the current one", () => {
        const { api, changes } = init([{ defaultSize: 10, minSize: 10 }, {}]);
        expect(api(0).resize("0%")).toEqual({ ok: true, value: { size: 10 } });
        expect(changes).toEqual([]);
    });

    test("clamps the size to the constraints", () => {
        const { api, changes } = init([{ defaultSize: 25, minSize: 10 }, {}]);
        api(0).resize("0%");
        expect(changes).toEqual([[10, 90]]);
    });

    test("takes space from panels before it if the panels after it can't shrink", () => {
        const { api, changes } = init([
            { defaultSize: 40 },
            { defaultSize: 40 },
            { defaultSize: 10 },
            { defaultSize: 10, minSize: 10 },
        ]);
        api(2).resize("30%");
        expect(changes).toEqual([[40, 20, 30, 10]]);
    });

    test("takes the rest from panels before it if the panels after it can only partially shrink", () => {
        const { api, changes } = init([
            { defaultSize: 40 },
            { defaultSize: 40 },
            { defaultSize: 10 },
            { defaultSize: 10, minSize: 5 },
        ]);
        api(2).resize("30%");
        expect(changes).toEqual([[40, 25, 30, 5]]);
    });

    test("gives space to panels before it if the panels after it can't grow", () => {
        const { api, changes } = init([
            { defaultSize: 40 },
            { defaultSize: 40 },
            { defaultSize: 10 },
            { defaultSize: 10, maxSize: 10 },
        ]);
        api(2).resize("5%");
        expect(changes).toEqual([[40, 45, 5, 10]]);
    });

    test("resizes a disabled panel (code may)", () => {
        const { api, changes } = init([
            { defaultSize: 25, disabled: true, minSize: 10 },
            {},
        ]);
        api(0).resize("0%");
        expect(changes).toEqual([[10, 90]]);
    });

    test("does nothing when resizing the only panel", () => {
        const { api, changes } = init([{ defaultSize: 100 }]);
        expect(api(0).resize("50%").ok).toBe(true);
        expect(changes).toEqual([]);
    });

    test("the last panel keeps the rest when every panel before it is collapsed", () => {
        const { api, changes } = init([
            { collapsible: true, defaultSize: 0, minSize: 20 },
            { collapsible: true, defaultSize: 0, minSize: 20 },
            { defaultSize: 100 },
        ]);
        api(2).resize("50%");
        expect(changes).toEqual([]);
    });

    test("the last panel resizes normally when the panels before it are not all collapsed", () => {
        const { api, changes } = init([
            { defaultSize: 30 },
            { defaultSize: 30 },
            { defaultSize: 40 },
        ]);
        api(2).resize("20%");
        expect(changes).toEqual([[30, 50, 20]]);
    });

    test("accepts every unit once the group is measured", () => {
        const { model } = init([{}, {}]);
        model.run("group.measure", {
            groupId: "group",
            axisSize: 1000,
            fontSize: 20,
            rootFontSize: 10,
            viewportWidth: 2000,
            viewportHeight: 800,
        });
        const sizeOf = (size: string | number) => {
            const result = model.run("panel.resize", { panelId: "0", size });
            return result.ok ? result.value.size : undefined;
        };
        expect(sizeOf("30%")).toBe(30);
        expect(sizeOf("40")).toBe(40);
        expect(sizeOf(250)).toBe(25);
        expect(sizeOf("100px")).toBe(10);
        expect(sizeOf("20rem")).toBe(20);
        expect(sizeOf("20em")).toBe(40);
        expect(sizeOf("10vw")).toBe(20);
        expect(sizeOf("50vh")).toBe(40);
    });

    test("refuses a pixel size before the group is measured, and a malformed one", () => {
        const model = createSplitterModel();
        model.run("group.add", { id: "g" });
        model.run("panel.add", { id: "a", groupId: "g" });
        model.run("panel.add", { id: "b", groupId: "g" });
        const pixels = model.check("panel.resize", { panelId: "a", size: 100 });
        expect(!pixels.ok && pixels.error.code).toBe("refused");
        expect(model.can("panel.resize", { panelId: "a", size: "30%" })).toBe(
            true,
        );
        const malformed = model.check("panel.resize", {
            panelId: "a",
            size: "wide",
        });
        expect(!malformed.ok && malformed.error).toMatchObject({
            code: "invalid_payload",
            path: "/size",
        });
    });
});
