import { describe, expect, it } from "vitest";
import { adjustLayoutByDelta } from "../../src/layout/adjust-layout-by-delta";
import { defaultLayout } from "../../src/layout/default-layout";
import { normalizeLayout } from "../../src/layout/normalize-layout";
import {
    compareLayoutNumbers,
    formatLayoutNumber,
    layoutNumbersEqual,
} from "../../src/layout/numbers";
import { preservePixelSizes } from "../../src/layout/preserve-pixel-sizes";
import { isCollapsedIn, resizePanel } from "../../src/layout/resize-panel";
import { resolveConstraints } from "../../src/layout/resolve-constraints";
import { separatorValues } from "../../src/layout/separator-values";
import { validateLayout } from "../../src/layout/validate-layout";
import { validatePanelSize } from "../../src/layout/validate-panel-size";
import { panels } from "./helpers";

describe("layout numbers", () => {
    it("rounds to three decimals and compares rounded", () => {
        expect(formatLayoutNumber(33.33333)).toBe(33.333);
        expect(layoutNumbersEqual(10.0001, 10)).toBe(true);
        expect(layoutNumbersEqual(10.1, 10, 0.1)).toBe(true);
        expect(compareLayoutNumbers(10.0001, 10)).toBe(0);
        expect(compareLayoutNumbers(11, 10)).toBe(1);
        expect(compareLayoutNumbers(9, 10)).toBe(-1);
    });
});

describe("validatePanelSize", () => {
    const [collapsible] = panels([
        { collapsible: true, collapsedSize: 5, minSize: 25, maxSize: 80 },
    ]);
    if (!collapsible) throw new Error("no panel");

    it("clamps to the maximum, and a non-collapsible panel to its minimum", () => {
        const [plain] = panels([{ minSize: 10, maxSize: 50 }]);
        if (!plain) throw new Error("no panel");
        expect(
            validatePanelSize({ constraints: plain, prevSize: 20, size: 60 }),
        ).toBe(50);
        expect(
            validatePanelSize({ constraints: plain, prevSize: 20, size: 2 }),
        ).toBe(10);
    });

    it("snaps a collapsible panel at halfway between collapsed and minimum", () => {
        const at = (size: number, prevSize = 25) =>
            validatePanelSize({ constraints: collapsible, prevSize, size });
        expect(at(16)).toBe(25);
        expect(at(14)).toBe(5);
        // from collapsed, it opens past the halfway point
        expect(at(14, 5)).toBe(5);
        expect(at(16, 5)).toBe(25);
        expect(at(90)).toBe(80);
    });

    it("keeps a disabled panel's size unless overridden", () => {
        const [disabled] = panels([{ disabled: true }]);
        if (!disabled) throw new Error("no panel");
        expect(
            validatePanelSize({
                constraints: disabled,
                prevSize: 30,
                size: 60,
            }),
        ).toBe(30);
        expect(
            validatePanelSize({
                constraints: disabled,
                prevSize: 30,
                size: 60,
                overrideDisabled: true,
            }),
        ).toBe(60);
    });
});

describe("defaultLayout", () => {
    it("shares the space equally between panels without a default size", () => {
        expect(defaultLayout(panels([{}, {}, {}]))).toEqual({
            a: 33.334,
            b: 33.333,
            c: 33.333,
        });
    });

    it("gives each default size, and the rest to the others", () => {
        expect(
            defaultLayout(
                panels([{ defaultSize: 20 }, {}, { defaultSize: 30 }]),
            ),
        ).toEqual({ a: 20, b: 50, c: 30 });
        expect(
            defaultLayout(
                panels([{ defaultSize: 15 }, { defaultSize: 15 }, {}, {}]),
            ),
        ).toEqual({ a: 15, b: 15, c: 35, d: 35 });
    });

    it("validates the result against the constraints", () => {
        expect(
            defaultLayout(panels([{ defaultSize: 10, minSize: 30 }, {}])),
        ).toEqual({
            a: 30,
            b: 70,
        });
    });

    it("lays out 2 to 5 panels to 100", () => {
        for (let count = 2; count <= 5; count++) {
            const layout = defaultLayout(
                panels(Array.from({ length: count }, () => ({}))),
            );
            const total = Object.values(layout).reduce(
                (sum, size) => sum + size,
                0,
            );
            expect(layoutNumbersEqual(total, 100)).toBe(true);
            expect(Object.keys(layout)).toHaveLength(count);
        }
    });
});

describe("normalizeLayout", () => {
    it("scales sizes to 100, ignoring constraints", () => {
        expect(normalizeLayout({ a: 1, b: 3 }, ["a", "b"])).toEqual({
            a: 25,
            b: 75,
        });
    });

    it("keeps exactly the panels given: a missing one is 0, an extra is dropped", () => {
        expect(normalizeLayout({ a: 50, z: 50 }, ["a", "b"])).toEqual({
            a: 100,
            b: 0,
        });
    });

    it("shares 100 equally when every size is 0", () => {
        expect(normalizeLayout({ a: 0, b: 0 }, ["a", "b"])).toEqual({
            a: 50,
            b: 50,
        });
    });
});

describe("preservePixelSizes", () => {
    const constraints = panels([
        { groupResizeBehavior: "preserve-pixel-size" },
        {},
        {},
    ]);

    it("keeps a fixed panel's pixels and shares the rest proportionally", () => {
        // 200px of 1000px, then the group grows to 2000px
        expect(
            preservePixelSizes({
                layout: { a: 20, b: 40, c: 40 },
                constraints,
                prevAxisSize: 1000,
                nextAxisSize: 2000,
            }),
        ).toEqual({ a: 10, b: 45, c: 45 });
    });

    it("is the identity when nothing preserves pixels, nothing changed, or a size is 0", () => {
        const layout = { a: 20, b: 40, c: 40 };
        expect(
            preservePixelSizes({
                layout,
                constraints: panels([{}, {}, {}]),
                prevAxisSize: 1000,
                nextAxisSize: 500,
            }),
        ).toBe(layout);
        for (const [prev, next] of [
            [1000, 1000],
            [0, 1000],
            [1000, 0],
        ] as const) {
            expect(
                preservePixelSizes({
                    layout,
                    constraints,
                    prevAxisSize: prev,
                    nextAxisSize: next,
                }),
            ).toBe(layout);
        }
    });

    it("needs a relative panel to take the rest", () => {
        const layout = { a: 50, b: 50 };
        expect(
            preservePixelSizes({
                layout,
                constraints: panels([
                    { groupResizeBehavior: "preserve-pixel-size" },
                    { groupResizeBehavior: "preserve-pixel-size" },
                ]),
                prevAxisSize: 1000,
                nextAxisSize: 500,
            }),
        ).toBe(layout);
    });
});

describe("resolveConstraints", () => {
    it("resolves every unit against the measure", () => {
        const measure = {
            axisSize: 1000,
            fontSize: 20,
            rootFontSize: 10,
            viewportWidth: 2000,
            viewportHeight: 800,
        };
        expect(
            resolveConstraints(
                "p",
                {
                    minSize: 100,
                    maxSize: "50%",
                    defaultSize: "20rem",
                    collapsible: true,
                    collapsedSize: "2em",
                    collapsedThreshold: "1vw",
                },
                measure,
            ),
        ).toEqual({
            panelId: "p",
            minSize: 10,
            maxSize: 50,
            defaultSize: 20,
            collapsible: true,
            collapsedSize: 4,
            collapsedThreshold: 2,
            disabled: false,
            groupResizeBehavior: "preserve-relative-size",
        });
        expect(
            resolveConstraints("p", { minSize: "10vh" }, measure).minSize,
        ).toBe(8);
    });

    it("drops what cannot be resolved before a measure, and keeps percentages", () => {
        expect(
            resolveConstraints(
                "p",
                { minSize: "100px", maxSize: "60%", defaultSize: 200 },
                undefined,
            ),
        ).toMatchObject({ minSize: 0, maxSize: 60, defaultSize: undefined });
    });

    it("never lets the maximum fall below the minimum", () => {
        expect(
            resolveConstraints(
                "p",
                { minSize: "40%", maxSize: "20%" },
                undefined,
            ),
        ).toMatchObject({ minSize: 40, maxSize: 40 });
    });
});

describe("resizePanel", () => {
    it("returns the same layout for an unknown panel or the same size", () => {
        const layout = { a: 50, b: 50 };
        const constraints = panels([{}, {}]);
        expect(
            resizePanel({ layout, constraints, panelId: "z", size: 10 }),
        ).toBe(layout);
        expect(
            resizePanel({ layout, constraints, panelId: "a", size: 50 }),
        ).toBe(layout);
    });

    it("tells a collapsed panel", () => {
        const [item] = panels([{ collapsible: true, collapsedSize: 5 }]);
        if (!item) throw new Error("no panel");
        expect(isCollapsedIn(item, { a: 5 })).toBe(true);
        expect(isCollapsedIn(item, { a: 6 })).toBe(false);
    });
});

describe("separatorValues", () => {
    it("reaches from the collapsed size to the maximum of the panel before it", () => {
        expect(
            separatorValues(
                { a: 35, b: 65 },
                panels([
                    {
                        collapsible: true,
                        collapsedSize: 5,
                        minSize: 20,
                        maxSize: 70,
                    },
                    { minSize: 20 },
                ]),
                0,
            ),
        ).toEqual({ panelId: "a", valueNow: 35, valueMin: 5, valueMax: 70 });
    });

    it("considers the other panels' constraints", () => {
        expect(
            separatorValues(
                { a: 50, b: 50 },
                panels([{ minSize: 10 }, { minSize: 30, maxSize: 80 }]),
                0,
            ),
        ).toEqual({ panelId: "a", valueNow: 50, valueMin: 20, valueMax: 70 });
    });

    it("is undefined after the last panel", () => {
        expect(separatorValues({ a: 100 }, panels([{}]), 0)).toBeUndefined();
    });
});

describe("purity", () => {
    it("never changes its inputs", () => {
        const layout = Object.freeze({ a: 30, b: 40, c: 30 });
        const constraints = Object.freeze(
            panels([
                { minSize: 10, collapsible: true },
                { maxSize: 60 },
                {},
            ]).map((item) => Object.freeze(item)),
        );
        expect(() => {
            adjustLayoutByDelta({
                delta: 25,
                initialLayout: layout,
                prevLayout: layout,
                constraints,
                pivotIndices: [0, 1],
                trigger: "pointer",
            });
            validateLayout({ a: 10, b: 90, c: 0 }, constraints);
            defaultLayout(constraints);
            resizePanel({ layout, constraints, panelId: "b", size: 10 });
            separatorValues(layout, constraints, 1);
            preservePixelSizes({
                layout,
                constraints,
                prevAxisSize: 100,
                nextAxisSize: 200,
            });
        }).not.toThrow();
        expect(layout).toEqual({ a: 30, b: 40, c: 30 });
    });
});
