import { describe, expect, it } from "vitest";
import {
    SplitterValidationError,
    validateSplitter,
} from "../../src/state/document";
import { createSplitterModel } from "../../src/state/model";
import type { SplitterJson } from "../../src/state/types";
import { group, type PanelSpec, sizes } from "../fixture";

const MARKUP: PanelSpec[] = [
    { id: "nav", collapsible: true, minSize: "15%", defaultSize: "25%" },
    { id: "main" },
    { id: "aside", defaultSize: "20%" },
];

describe("validateSplitter", () => {
    it("accepts a valid document", () => {
        expect(validateSplitter({ version: 1, groups: [] })).toEqual([]);
        expect(
            validateSplitter({
                version: 1,
                groups: [
                    {
                        id: "g",
                        panels: [
                            {
                                id: "a",
                                size: 0,
                                collapsed: true,
                                restoreSize: 30,
                            },
                            { id: "b", size: 100 },
                        ],
                    },
                ],
            }),
        ).toEqual([]);
    });

    it("returns every problem with its JSON path", () => {
        expect(validateSplitter({ version: 2, groups: [] })).toEqual([
            { path: "/version", message: "must be 1" },
        ]);
        expect(validateSplitter(null)).toEqual([
            { path: "", message: "must be an object" },
        ]);
        expect(
            validateSplitter({
                version: 1,
                groups: [
                    { id: "g", panels: [{ id: "a", size: 120 }, { size: 10 }] },
                ],
                extra: true,
            }),
        ).toEqual([
            { path: "/groups/0/panels/0/size", message: "must be <= 100" },
            { path: "/groups/0/panels/1/id", message: "is required" },
            { path: "/extra", message: "is not allowed" },
        ]);
    });

    it("finds ids saved twice", () => {
        expect(
            validateSplitter({
                version: 1,
                groups: [
                    { id: "g", panels: [{ id: "a", size: 100 }] },
                    { id: "g", panels: [{ id: "a", size: 100 }] },
                ],
            }),
        ).toEqual([
            { path: "/groups/1/id", message: 'group "g" is saved twice' },
            {
                path: "/groups/1/panels/0/id",
                message: 'panel "a" is saved twice',
            },
        ]);
    });

    it("makes createSplitterModel throw a SplitterValidationError with the issues", () => {
        let thrown: unknown;
        try {
            createSplitterModel({
                version: 1,
                groups: [{ id: "", panels: [] }],
            });
        } catch (error) {
            thrown = error;
        }
        expect(thrown).toBeInstanceOf(SplitterValidationError);
        expect((thrown as SplitterValidationError).issues).toEqual([
            {
                path: "/groups/0/id",
                message: "must have at least 1 character(s)",
            },
        ]);
        expect((thrown as Error).message).toMatch(/at "\/groups\/0\/id"/);
    });
});

describe("the JSON document", () => {
    it("saves what the user changed, not the constraints nor the measure", () => {
        const model = group(MARKUP, { axisSize: 1000 });
        model.run("panel.resize", { panelId: "main", size: "60%" });
        model.run("panel.collapse", { panelId: "nav" });
        expect(model.get("splitter-json")).toEqual({
            version: 1,
            groups: [
                {
                    id: "g",
                    panels: [
                        {
                            id: "nav",
                            size: 0,
                            collapsed: true,
                            restoreSize: 25,
                        },
                        { id: "main", size: 85 },
                        { id: "aside", size: 15 },
                    ],
                },
            ],
        });
    });

    it("round-trips: a new model with the same markup restores the same layout", () => {
        const model = group(MARKUP, { axisSize: 1000 });
        model.run("panel.resize", { panelId: "aside", size: "35%" });
        model.run("panel.collapse", { panelId: "nav" });
        const json = model.get("splitter-json");

        const restored = group(MARKUP, { json, axisSize: 1000 });
        expect(sizes(restored)).toEqual(sizes(model));
        expect(restored.is("panel-collapsed", { panelId: "nav" })).toBe(true);
        expect(restored.get("splitter-json")).toEqual(json);
        // and it expands back to where it was
        restored.run("panel.expand", { panelId: "nav" });
        expect(restored.get("layout-by", { groupId: "g" })?.nav).toBe(25);
    });

    it("is stable before any group registers", () => {
        const json: SplitterJson = {
            version: 1,
            groups: [
                {
                    id: "a",
                    panels: [
                        { id: "x", size: 30 },
                        { id: "y", size: 70 },
                    ],
                },
                { id: "b", panels: [{ id: "z", size: 100, restoreSize: 12 }] },
            ],
        };
        const model = createSplitterModel(json);
        expect(model.get("splitter-json")).toEqual(json);
        expect(model.get("groups")).toEqual([]);
        expect(
            createSplitterModel(model.get("splitter-json")).get(
                "splitter-json",
            ),
        ).toEqual(json);
    });

    it("applies a saved layout once the group holds exactly its saved panels", () => {
        const json: SplitterJson = {
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
        };
        const model = createSplitterModel(json);
        model.run("group.add", { id: "g" });
        model.run("panel.add", { id: "a", groupId: "g" });
        expect(sizes(model)).toEqual([100]);
        model.run("panel.add", { id: "b", groupId: "g" });
        expect(sizes(model)).toEqual([30, 70]);
        expect(model.get("state").pending).toEqual({});
    });

    it("leaves a saved layout pending when the panels differ (a conditional panel)", () => {
        const json: SplitterJson = {
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
        };
        const model = group(
            [
                { id: "a", order: 0 },
                { id: "c", order: 2 },
                { id: "b", order: 1 },
            ],
            { json },
        );
        expect(sizes(model)).toEqual([33.334, 33.333, 33.333]);
        model.run("panel.remove", { panelId: "c" });
        expect(sizes(model)).toEqual([30, 70]);
    });

    it("clamps a saved layout to the markup's constraints, and collapses at the new collapsed size", () => {
        const json: SplitterJson = {
            version: 1,
            groups: [
                {
                    id: "g",
                    panels: [
                        { id: "a", size: 0, collapsed: true, restoreSize: 30 },
                        { id: "b", size: 5 },
                        { id: "c", size: 95 },
                    ],
                },
            ],
        };
        const model = group(
            [
                {
                    id: "a",
                    collapsible: true,
                    collapsedSize: "4%",
                    minSize: "10%",
                },
                { id: "b", minSize: "20%" },
                { id: "c" },
            ],
            { json },
        );
        expect(sizes(model)).toEqual([4, 20, 76]);
        expect(model.is("panel-collapsed", { panelId: "a" })).toBe(true);
        expect(model.get("panel-by", { id: "a" })?.restoreSize).toBe(30);
    });

    it("scales a saved layout that does not sum to 100", () => {
        const json: SplitterJson = {
            version: 1,
            groups: [
                {
                    id: "g",
                    panels: [
                        { id: "a", size: 10 },
                        { id: "b", size: 30 },
                    ],
                },
            ],
        };
        expect(sizes(group([{ id: "a" }, { id: "b" }], { json }))).toEqual([
            25, 75,
        ]);
    });

    it("returns the same frozen document until the state changes", () => {
        const model = group([{ id: "a" }, { id: "b" }]);
        const json = model.get("splitter-json");
        expect(model.get("splitter-json")).toBe(json);
        expect(Object.isFrozen(json)).toBe(true);
        model.run("panel.resize", { panelId: "a", size: "10%" });
        expect(model.get("splitter-json")).not.toBe(json);
    });
});
