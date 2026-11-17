import { SIZE_PATTERN } from "../units/parse-size";

/** What an id may not be: `__proto__` would reach an object's prototype. */
export const ID_PATTERN = "^(?!__proto__$)";

/** An id field of a payload, a result or the document: a non-empty string. */
export function idField<const D extends string>(description: D) {
    return {
        type: "string",
        minLength: 1,
        pattern: ID_PATTERN,
        description,
    } as const;
}

/** A size as declared: pixels as a number, or a string with its unit (no unit: percent). */
export function sizeField<const D extends string>(description: D) {
    return {
        description,
        anyOf: [
            { type: "number", minimum: 0 },
            { type: "string", pattern: SIZE_PATTERN },
        ],
    } as const;
}

/** A percentage, from 0 to 100. */
export function percentField<const D extends string>(description: D) {
    return { type: "number", minimum: 0, maximum: 100, description } as const;
}

/** A layout: each panel's size by `panelId`, in percent. */
export function layoutField<const D extends string>(description: D) {
    return {
        type: "object",
        description,
        additionalProperties: { type: "number", minimum: 0, maximum: 100 },
    } as const;
}

/** The orientation of a group. */
export function orientationField<const D extends string>(description: D) {
    return {
        enum: ["horizontal", "vertical"],
        description,
    } as const;
}
