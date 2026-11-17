// Validating a whole layout against its panels' constraints. Ported from React Resizable Panels
// (https://github.com/bvaughn/react-resizable-panels, lib/global/utils/validateAxisLayout.test.ts), adapted to
// Splitter's names: the upstream tests are the behaviour reference. Copyright (c) 2018 Brian
// Vaughn. MIT licence, see LICENSE.
import { describe, expect, test } from "vitest";
import type { Layout, ResolvedConstraints } from "../../src/layout/types";
import { validateLayout } from "../../src/layout/validate-layout";

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/** React Resizable Panels' name for one panel's resolved constraints. */
type ResizeItemConstraints = Mutable<Omit<ResolvedConstraints, "panelId">> & {
    itemId: string;
};

function toResolved(
    items: readonly ResizeItemConstraints[],
): ResolvedConstraints[] {
    return items.map(({ itemId, ...rest }) => ({ ...rest, panelId: itemId }));
}

function c(
    partials: Partial<ResizeItemConstraints>[],
): ResizeItemConstraints[] {
    return partials.map((current, index) => ({
        collapsedSize: 0,
        collapsedThreshold: undefined,
        collapsible: false,
        defaultSize: undefined,
        disabled: false,
        groupResizeBehavior: "preserve-relative-size",
        maxSize: 100,
        minSize: 0,
        ...current,
        itemId: `${index}`,
    }));
}

function l(numbers: number[]): Layout {
    const layout: Layout = {};
    numbers.forEach((current, index) => {
        layout[index] = current;
    });
    return layout;
}

function validateAxisLayout({
    layout,
    itemConstraints,
}: {
    layout: Layout;
    itemConstraints: ResizeItemConstraints[];
}): Layout {
    return validateLayout(layout, toResolved(itemConstraints));
}

describe("validateAxisLayout", () => {
    test("should accept requested layout if there are no constraints provided", () => {
        expect(
            validateAxisLayout({
                layout: l([10, 60, 30]),
                itemConstraints: c([{}, {}, {}]),
            }),
        ).toEqual(l([10, 60, 30]));
    });

    test("should normalize layouts that do not total 100%", () => {
        expect(
            validateAxisLayout({
                layout: l([10, 20, 20]),
                itemConstraints: c([{}, {}, {}]),
            }),
        ).toEqual(l([20, 40, 40]));

        expect(
            validateAxisLayout({
                layout: l([50, 100, 50]),
                itemConstraints: c([{}, {}, {}]),
            }),
        ).toEqual(l([25, 50, 25]));
    });

    // Splitter: a layout that does not match its panels is not an error here (the commands refuse
    // it with invalid_payload); a missing panel counts as 0 and an extra one is dropped.
    test("should fit layouts that do not match the number of panels", () => {
        expect(
            validateAxisLayout({
                layout: l([10, 20, 30]),
                itemConstraints: c([{}, {}]),
            }),
        ).toEqual(l([33.333, 66.667]));

        expect(
            validateAxisLayout({
                layout: l([50, 50]),
                itemConstraints: c([{}, {}, {}]),
            }),
        ).toEqual(l([50, 50, 0]));
    });

    describe("minimum size constraints", () => {
        test("should adjust the layout to account for minimum percentage sizes", () => {
            expect(
                validateAxisLayout({
                    layout: l([25, 75]),
                    itemConstraints: c([
                        {
                            minSize: 35,
                        },
                        {},
                    ]),
                }),
            ).toEqual(l([35, 65]));
        });

        test("should account for multiple panels with minimum size constraints", () => {
            expect(
                validateAxisLayout({
                    layout: l([20, 60, 20]),
                    itemConstraints: c([
                        {
                            minSize: 25,
                        },
                        {},
                        {
                            minSize: 25,
                        },
                    ]),
                }),
            ).toEqual(l([25, 50, 25]));
        });
    });

    describe("maximum size constraints", () => {
        test("should adjust the layout to account for maximum percentage sizes", () => {
            expect(
                validateAxisLayout({
                    layout: l([25, 75]),
                    itemConstraints: c([{}, { maxSize: 65 }]),
                }),
            ).toEqual(l([35, 65]));
        });

        test("should account for multiple panels with maximum size constraints", () => {
            expect(
                validateAxisLayout({
                    layout: l([20, 60, 20]),
                    itemConstraints: c([
                        {
                            maxSize: 15,
                        },
                        { maxSize: 50 },
                        {},
                    ]),
                }),
            ).toEqual(l([15, 50, 35]));
        });
    });

    describe("collapsible panels", () => {
        test("should not collapse a panel that's at or above the minimum size", () => {
            expect(
                validateAxisLayout({
                    layout: l([25, 75]),
                    itemConstraints: c([
                        { collapsible: true, minSize: 25 },
                        {},
                    ]),
                }),
            ).toEqual(l([25, 75]));
        });

        test("should collapse a panel once it drops below the halfway point between collapsed and minimum percentage sizes", () => {
            expect(
                validateAxisLayout({
                    layout: l([15, 85]),
                    itemConstraints: c([
                        {
                            collapsible: true,
                            collapsedSize: 10,
                            minSize: 20,
                        },
                        {},
                    ]),
                }),
            ).toEqual(l([20, 80]));

            expect(
                validateAxisLayout({
                    layout: l([14, 86]),
                    itemConstraints: c([
                        {
                            collapsible: true,
                            collapsedSize: 10,
                            minSize: 20,
                        },
                        {},
                    ]),
                }),
            ).toEqual(l([10, 90]));
        });
    });
});
