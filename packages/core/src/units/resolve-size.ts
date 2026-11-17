import { formatLayoutNumber } from "../layout/numbers";
import { parseSize, type SizeValue } from "./parse-size";

/**
 * What the engine measured of a group on screen, reported through `group.measure` and kept out of
 * the JSON document: with it the model resolves every unit without a DOM.
 */
export interface GroupMeasure {
    /** the group's size along its orientation, in pixels: the sum of its panels' sizes */
    readonly axisSize: number;
    /** the group element's computed font size, in pixels (what `em` resolves against) */
    readonly fontSize?: number;
    /** the root element's computed font size, in pixels (what `rem` resolves against) */
    readonly rootFontSize?: number;
    /** the viewport's width, in pixels (what `vw` resolves against) */
    readonly viewportWidth?: number;
    /** the viewport's height, in pixels (what `vh` resolves against) */
    readonly viewportHeight?: number;
}

/** A size in pixels; undefined when the measure it needs is missing. */
export function sizeToPixels(
    size: SizeValue,
    measure: GroupMeasure | undefined,
): number | undefined {
    const parsed = parseSize(size);
    if (!parsed) {
        return undefined;
    }
    const { value, unit } = parsed;
    switch (unit) {
        case "px":
            return value;
        case "%":
            return measure === undefined
                ? undefined
                : (value / 100) * measure.axisSize;
        case "em":
            return measure?.fontSize === undefined
                ? undefined
                : value * measure.fontSize;
        case "rem":
            return measure?.rootFontSize === undefined
                ? undefined
                : value * measure.rootFontSize;
        case "vw":
            return measure?.viewportWidth === undefined
                ? undefined
                : (value / 100) * measure.viewportWidth;
        case "vh":
            return measure?.viewportHeight === undefined
                ? undefined
                : (value / 100) * measure.viewportHeight;
    }
}

/**
 * A size as a percentage of its group (rounded like every layout number). A percentage needs no
 * measure; any other unit needs the group measured (`axisSize` above 0) and, for `em`, `rem`,
 * `vw` and `vh`, the matching font size or viewport. Undefined when it cannot be resolved yet.
 */
export function sizeToPercentage(
    size: SizeValue,
    measure: GroupMeasure | undefined,
): number | undefined {
    const parsed = parseSize(size);
    if (!parsed) {
        return undefined;
    }
    if (parsed.unit === "%") {
        return formatLayoutNumber(parsed.value);
    }
    if (measure === undefined || measure.axisSize <= 0) {
        return undefined;
    }
    const pixels = sizeToPixels(size, measure);
    return pixels === undefined
        ? undefined
        : formatLayoutNumber((pixels / measure.axisSize) * 100);
}
