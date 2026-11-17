/** A CSS unit a size may be declared in. */
export type SizeUnit = "%" | "px" | "em" | "rem" | "vh" | "vw";

/**
 * A size as declared on a panel (`minSize`, `maxSize`, `defaultSize`, `collapsedSize`,
 * `collapsedThreshold`), read as React Resizable Panels reads it: a number is pixels (`240`), a
 * string carries its unit (`"30%"`, `"240px"`, `"15rem"`, `"2em"`, `"40vh"`, `"25vw"`), and a
 * string without a unit is a percentage (`"30"`).
 */
export type SizeValue = number | string;

/** A size split into its number and its unit. */
export interface ParsedSize {
    readonly value: number;
    readonly unit: SizeUnit;
}

/** The JSON Schema pattern of a size string: a non-negative number and an optional unit. */
export const SIZE_PATTERN =
    "^\\s*(\\d+(\\.\\d+)?|\\.\\d+)\\s*(%|px|rem|em|vh|vw)?\\s*$";

const SIZE = new RegExp(SIZE_PATTERN);

/** Splits a size into its number and unit; undefined when it is not a valid size. */
export function parseSize(size: SizeValue): ParsedSize | undefined {
    if (typeof size === "number") {
        return Number.isFinite(size) && size >= 0
            ? { value: size, unit: "px" }
            : undefined;
    }
    const match = SIZE.exec(size);
    if (!match) {
        return undefined;
    }
    const unit = (match[3] ?? "%") as SizeUnit;
    return { value: Number.parseFloat(match[1] ?? ""), unit };
}
