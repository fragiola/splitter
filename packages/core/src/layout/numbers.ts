// Layout number rounding and comparison, derived from React Resizable Panels
// (https://github.com/bvaughn/react-resizable-panels, lib/global/utils/formatLayoutNumber.ts,
// layoutNumbersEqual.ts, compareLayoutNumbers.ts). Copyright (c) 2018 Brian Vaughn. MIT licence,
// see LICENSE.

/** Rounds a layout number to three decimals: every size the rules produce goes through it. */
export function formatLayoutNumber(value: number): number {
    return Number.parseFloat(value.toFixed(3));
}

/** Whether two layout numbers are equal once rounded (within `tolerance`). */
export function layoutNumbersEqual(
    actual: number,
    expected: number,
    tolerance = 0,
): boolean {
    return (
        Math.abs(formatLayoutNumber(actual) - formatLayoutNumber(expected)) <=
        tolerance
    );
}

/** -1, 0 or 1 as `actual` is below, equal to (rounded) or above `expected`. */
export function compareLayoutNumbers(actual: number, expected: number): number {
    if (layoutNumbersEqual(actual, expected)) {
        return 0;
    }
    return actual > expected ? 1 : -1;
}
