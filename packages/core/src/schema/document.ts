import { idField, percentField } from "./fragments";

/** The JSON Schema of a saved panel. */
const panelJsonSchema = {
    type: "object",
    description: "a saved panel",
    properties: {
        id: idField("the panel's id, as in the markup"),
        size: percentField("its size, in percent"),
        collapsed: { type: "boolean", description: "whether it is collapsed" },
        restoreSize: percentField(
            "the size, in percent, it returns to when it expands",
        ),
    },
    required: ["id", "size"],
    additionalProperties: false,
} as const;

/** The JSON Schema of a saved group. */
const groupJsonSchema = {
    type: "object",
    description: "a saved group: its layout, by panel id",
    properties: {
        id: idField("the group's id, as in the markup"),
        panels: {
            type: "array",
            items: panelJsonSchema,
            description: "its panels, in order",
        },
    },
    required: ["id", "panels"],
    additionalProperties: false,
} as const;

/**
 * The JSON Schema (2020-12) of the document, version 1: what the user changed. Constraints are not
 * part of it; they come back with the markup.
 */
export const splitterJsonSchema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "Splitter document",
    description:
        "The layouts a user gave a splitter: each group's panel sizes by id, which panels are collapsed, and the size each returns to on expand.",
    type: "object",
    properties: {
        version: { const: 1, description: "the document's version" },
        groups: {
            type: "array",
            items: groupJsonSchema,
            description: "the saved groups",
        },
    },
    required: ["version", "groups"],
    additionalProperties: false,
} as const;
