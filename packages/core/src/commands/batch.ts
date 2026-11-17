import { validate } from "../schema/validator";
import { defineCommand, type Failure, invalid, ok } from "./define";

const batchEntrySchema = {
    type: "object",
    properties: {
        command: { type: "string", description: "the command's name" },
        payload: { type: "object", description: "its payload" },
    },
    required: ["command", "payload"],
    additionalProperties: false,
} as const;

const batchPayloadSchema = {
    type: "object",
    properties: {
        commands: {
            type: "array",
            items: batchEntrySchema,
            description: "the commands to run, in order",
        },
    },
    required: ["commands"],
    additionalProperties: false,
} as const;

export const batch = defineCommand({
    name: "batch",
    description:
        "Runs several commands in order as one atomic step: if any fails, none applies. Emits one change event. Nested batches are flattened. An adapter registers a group and its panels with one batch.",
    transient: true,
    payloadSchema: batchPayloadSchema,
    resultSchema: {
        type: "object",
        properties: {
            results: {
                type: "array",
                items: {},
                description: "each command's value, in order",
            },
        },
        required: ["results"],
        additionalProperties: false,
    },
    reduce(payload, { runInBatch }) {
        const results: unknown[] = [];
        const runAll = (
            commands: readonly { command: string; payload: unknown }[],
            path: string,
        ): Failure | undefined => {
            for (const [i, entry] of commands.entries()) {
                const at = `${path}/${i}`;
                if (entry.command === "batch") {
                    const nested = entry.payload as {
                        commands: { command: string; payload: unknown }[];
                    };
                    const failed =
                        invalid(
                            validate(
                                batchPayloadSchema,
                                entry.payload,
                                `${at}/payload`,
                            ),
                        ) ?? runAll(nested.commands, `${at}/payload/commands`);
                    if (failed) {
                        return failed;
                    }
                    continue;
                }
                const result = runInBatch(entry.command, entry.payload, at);
                if (!result.ok) {
                    return result;
                }
                results.push(result.value);
            }
            return undefined;
        };
        return runAll(payload.commands, "/commands") ?? ok({ results });
    },
});
