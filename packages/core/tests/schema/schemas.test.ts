import { describe, expect, it } from "vitest";
import { COMMANDS } from "../../src/commands/catalogue";
import { splitterJsonSchema } from "../../src/schema/document";
import type { JsonSchema } from "../../src/schema/types";
import { validate } from "../../src/schema/validator";

/** Every property schema of a schema, with its path. */
function properties(schema: JsonSchema, path = ""): [string, JsonSchema][] {
    const own = Object.entries(schema.properties ?? {}).flatMap(
        ([name, child]) => [
            [`${path}/${name}`, child] as [string, JsonSchema],
            ...properties(child, `${path}/${name}`),
        ],
    );
    const items = schema.items ? properties(schema.items, `${path}/items`) : [];
    return [...own, ...items];
}

describe("the command schemas", () => {
    it("describe every field (they are tool definitions for an assistant)", () => {
        const missing = COMMANDS.flatMap((command) =>
            [command.payloadSchema, command.resultSchema].flatMap((schema) =>
                properties(schema)
                    .filter(([, child]) => !child.description)
                    .map(([path]) => `${command.name}${path}`),
            ),
        );
        expect(missing).toEqual([]);
    });

    it("are closed objects", () => {
        for (const command of COMMANDS) {
            expect(command.payloadSchema.additionalProperties).toBe(false);
            expect(command.resultSchema.additionalProperties).toBe(false);
        }
    });

    it("name every id field <entity>Id, except an entity's own id", () => {
        const offenders = COMMANDS.flatMap((command) =>
            [command.payloadSchema, command.resultSchema].flatMap((schema) =>
                properties(schema)
                    .map(([path]) => path.split("/").at(-1) ?? "")
                    .filter((name) => /id$/i.test(name) && name !== "id")
                    .filter(
                        (name) =>
                            !/^(?:[a-z]+)?(?:group|panel|separator|Group|Panel|Separator)Ids?$/.test(
                                name,
                            ),
                    )
                    .map((name) => `${command.name}: ${name}`),
            ),
        );
        expect(offenders).toEqual([]);
    });

    it("validate sizes in every unit and refuse malformed ones", () => {
        const panelAdd = COMMANDS.find(({ name }) => name === "panel.add");
        if (!panelAdd) throw new Error("no panel.add");
        for (const size of [
            0,
            240,
            "30",
            "30%",
            "240px",
            "15rem",
            "2em",
            "40vh",
            "25vw",
        ]) {
            expect(
                validate(panelAdd.payloadSchema, {
                    groupId: "g",
                    minSize: size,
                }),
            ).toEqual([]);
        }
        for (const size of [-1, "30pt", "wide", true]) {
            expect(
                validate(panelAdd.payloadSchema, {
                    groupId: "g",
                    minSize: size,
                }).length,
            ).toBeGreaterThan(0);
        }
    });
});

describe("the document schema", () => {
    it("describes every field", () => {
        expect(
            properties(splitterJsonSchema)
                .filter(([, child]) => !child.description)
                .map(([path]) => path),
        ).toEqual([]);
    });
});

describe("the validator", () => {
    it("checks maps, patterns and maximums", () => {
        const schema: JsonSchema = {
            type: "object",
            additionalProperties: { type: "number", maximum: 10 },
        };
        expect(validate(schema, { a: 1, b: 11, c: "x" })).toEqual([
            { path: "/b", message: "must be <= 10" },
            { path: "/c", message: "must be a number" },
        ]);
        expect(validate({ type: "string", pattern: "^a+$" }, "b")).toEqual([
            { path: "", message: "must match ^a+$" },
        ]);
    });

    it("escapes keys in its JSON pointers", () => {
        expect(
            validate(
                { type: "object", additionalProperties: { type: "number" } },
                { "a/b~": "x" },
            ),
        ).toEqual([{ path: "/a~1b~0", message: "must be a number" }]);
    });
});
