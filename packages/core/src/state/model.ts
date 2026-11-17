import { COMMAND_DEFINITIONS } from "../commands/catalogue";
import { fail, invalid, type ReduceContext } from "../commands/define";
import type {
    BatchStep,
    CommandContext,
    CommandContextGetKey,
    CommandEvent,
    CommandListener,
    CommandName,
    CommandResult,
    Middleware,
    PayloadOf,
    ResultOf,
    RunOptions,
} from "../commands/types";
import { isObject, validate } from "../schema/validator";
import { loadState } from "./document";
import { Draft } from "./draft";
import { type CreateId, IdSource } from "./ids";
import {
    type ModelGetKey,
    type ModelGetPayload,
    type ModelGetResult,
    type ModelIsKey,
    type ModelIsPayload,
    type QueryArgs,
    queryGet,
    queryIs,
} from "./queries";
import type {
    AnyTypes,
    SplitterJson,
    SplitterState,
    SplitterTypes,
} from "./types";

/** Options of {@link createSplitterModel}. */
export interface SplitterModelOptions {
    /** generates the id of a group or panel added without one; default `` `${kind}-${n}` `` */
    createId?: CreateId | undefined;
}

/**
 * What the app adds to a dispatched command: never read from the untrusted input, so `meta` can
 * say who asked (`{ source: "assistant" }`) for middleware to decide on.
 */
export interface DispatchOptions {
    meta?: Readonly<Record<string, unknown>> | undefined;
}

/**
 * The splitter model: every group's panels, constraints, sizes and collapsed state, and their
 * rules. An immutable state that only commands change, usable in plain Node (no DOM). Every member
 * is one verb:
 *
 * - `run` changes the state (a command, through the middleware chain); `dispatch` is `run` for
 *   untrusted JSON;
 * - `can` answers whether `run` would succeed; `check` returns what it would return;
 * - `get` reads (`model.get("layout-by", { groupId })`); `is` asks a yes/no question
 *   (`model.is("panel-collapsed", { panelId })`);
 * - `use` adds a middleware around every command; `subscribe` listens to every commit.
 *
 * Every method is bound: it can be passed around on its own.
 */
export interface SplitterModel<T extends SplitterTypes = AnyTypes> {
    /** changes the state: runs a command (typed) through the middleware chain; never throws on bad input */
    run<C extends CommandName>(
        command: C,
        payload: PayloadOf<T, C>,
        options?: RunOptions,
    ): CommandResult<ResultOf<T, C>>;
    /**
     * `run` for a command given as untrusted JSON `{ command, payload, transient? }`, validated;
     * `options.meta` (the app's, not the input's) reaches middleware and listeners
     */
    dispatch(input: unknown, options?: DispatchOptions): CommandResult<unknown>;
    /** whether `run` would succeed now (nothing is committed or emitted) */
    can<C extends CommandName>(
        command: C,
        payload: PayloadOf<T, C>,
        options?: RunOptions,
    ): boolean;
    /** what `run` would return (its value, or why it is refused), without committing or emitting */
    check<C extends CommandName>(
        command: C,
        payload: PayloadOf<T, C>,
        options?: RunOptions,
    ): CommandResult<ResultOf<T, C>>;
    /** reads from the current state */
    get<K extends ModelGetKey>(
        key: K,
        ...payload: QueryArgs<ModelGetPayload<T, K>>
    ): ModelGetResult<T, K>;
    /** asks a yes/no question about the current state */
    is<K extends ModelIsKey>(key: K, payload: ModelIsPayload<T, K>): boolean;
    /** adds a middleware around every command (the first added runs outermost); returns its remover */
    use(middleware: Middleware<T>): () => void;
    /** listens to every committed command (one event per commit); returns its remover */
    subscribe(listener: CommandListener): () => void;
}

function prefixed(
    result: CommandResult<unknown>,
    prefix: string,
): CommandResult<unknown> {
    if (result.ok || prefix === "") {
        return result;
    }
    const { error: failure } = result;
    return {
        ok: false,
        error: {
            ...failure,
            ...(failure.path !== undefined
                ? { path: `${prefix}${failure.path}` }
                : {}),
            ...(failure.issues
                ? {
                      issues: failure.issues.map((issue) => ({
                          path: `${prefix}${issue.path}`,
                          message: issue.message,
                      })),
                  }
                : {}),
        },
    };
}

/** Where a command's errors point: into its payload, and at its transient flag. */
interface ErrorPaths {
    readonly payload: string;
    readonly transient: string;
}

/** One top-level execution: the draft it runs on, and what it collects (the steps of a batch). */
interface Execution {
    readonly draft: Draft;
    readonly dryRun: boolean;
    readonly options: RunOptions;
    readonly steps: BatchStep[];
    /** an exception a reducer threw: rethrown once the chain unwound */
    thrown: { error: unknown } | undefined;
}

class Model<T extends SplitterTypes> implements SplitterModel<T> {
    private state: SplitterState;
    private readonly ids: IdSource;
    private readonly middleware: Middleware<T>[] = [];
    private readonly listeners = new Set<CommandListener>();
    private inFlight = 0;
    private readonly queue: (() => void)[] = [];
    private readonly events: CommandEvent[] = [];
    private delivering = false;

    constructor(state: SplitterState, ids: IdSource) {
        this.state = state;
        this.ids = ids;
        // the bus can be passed around detached: `const { run } = model`
        this.run = this.run.bind(this);
        this.dispatch = this.dispatch.bind(this);
        this.can = this.can.bind(this);
        this.check = this.check.bind(this);
        this.get = this.get.bind(this);
        this.is = this.is.bind(this);
        this.use = this.use.bind(this);
        this.subscribe = this.subscribe.bind(this);
    }

    get<K extends ModelGetKey>(
        key: K,
        ...payload: QueryArgs<ModelGetPayload<T, K>>
    ): ModelGetResult<T, K> {
        return queryGet(this.state, key, payload[0]) as ModelGetResult<T, K>;
    }

    is<K extends ModelIsKey>(key: K, payload: ModelIsPayload<T, K>): boolean {
        return queryIs(this.state, key, payload);
    }

    use(middleware: Middleware<T>): () => void {
        this.middleware.push(middleware);
        return () => {
            const at = this.middleware.indexOf(middleware);
            if (at >= 0) {
                this.middleware.splice(at, 1);
            }
        };
    }

    subscribe(listener: CommandListener): () => void {
        const wrapper: CommandListener = (event) => listener(event);
        this.listeners.add(wrapper);
        return () => {
            this.listeners.delete(wrapper);
        };
    }

    run<C extends CommandName>(
        command: C,
        payload: PayloadOf<T, C>,
        options?: RunOptions,
    ): CommandResult<ResultOf<T, C>> {
        return this.enqueueOrExecute(
            command,
            payload,
            options,
            "",
        ) as CommandResult<ResultOf<T, C>>;
    }

    can<C extends CommandName>(
        command: C,
        payload: PayloadOf<T, C>,
        options?: RunOptions,
    ): boolean {
        return this.check(command, payload, options).ok;
    }

    check<C extends CommandName>(
        command: C,
        payload: PayloadOf<T, C>,
        options?: RunOptions,
    ): CommandResult<ResultOf<T, C>> {
        return this.execute(
            command,
            payload,
            options ?? {},
            true,
            "",
        ) as CommandResult<ResultOf<T, C>>;
    }

    dispatch(
        input: unknown,
        options: DispatchOptions = {},
    ): CommandResult<unknown> {
        if (!isObject(input)) {
            return fail(
                "invalid_payload",
                "must be an object { command, payload }",
                "",
            );
        }
        const { command, payload, transient } = input;
        if (typeof command !== "string") {
            return fail("invalid_payload", "must be a string", "/command");
        }
        if (!COMMAND_DEFINITIONS.has(command)) {
            return fail(
                "unknown_command",
                `unknown command "${command}"`,
                "/command",
            );
        }
        if (!isObject(payload)) {
            return fail("invalid_payload", "must be an object", "/payload");
        }
        if (transient !== undefined && typeof transient !== "boolean") {
            return fail("invalid_payload", "must be a boolean", "/transient");
        }
        for (const key of Object.keys(input)) {
            if (key !== "command" && key !== "payload" && key !== "transient") {
                return fail("invalid_payload", "is not allowed", `/${key}`);
            }
        }
        return this.enqueueOrExecute(
            command,
            payload,
            {
                ...(transient === undefined ? {} : { transient }),
                ...(options.meta === undefined ? {} : { meta: options.meta }),
            },
            "/payload",
        );
    }

    private enqueueOrExecute(
        command: string,
        payload: unknown,
        options: RunOptions | undefined,
        prefix: string,
    ): CommandResult<unknown> {
        if (this.inFlight > 0) {
            // issued from a middleware: runs once the current command committed
            this.queue.push(() => {
                this.execute(command, payload, options ?? {}, false, prefix);
            });
            return fail(
                "queued",
                `"${command}" was issued while another command was running; it runs after it`,
            );
        }
        try {
            return this.execute(command, payload, options ?? {}, false, prefix);
        } finally {
            // a throwing listener or reducer must not strand the commands a middleware queued
            this.drain();
        }
    }

    private drain() {
        while (this.inFlight === 0 && this.queue.length > 0) {
            this.queue.shift()?.();
        }
    }

    private execute(
        command: string,
        payload: unknown,
        options: RunOptions,
        dryRun: boolean,
        prefix: string,
    ): CommandResult<unknown> {
        // a dry run commits nothing, not even the ids it generated
        const ids = dryRun ? this.ids.clone() : this.ids;
        const draft = new Draft(this.state, ids);
        const execution: Execution = {
            draft,
            dryRun,
            options,
            steps: [],
            thrown: undefined,
        };
        if (!dryRun) {
            this.inFlight++;
        }
        let ran: { result: CommandResult<unknown>; payload: unknown };
        try {
            ran = this.runChain(
                execution,
                command,
                payload,
                { payload: prefix, transient: "/transient" },
                false,
            );
        } finally {
            if (!dryRun) {
                this.inFlight--;
            }
        }
        if (execution.thrown) {
            throw execution.thrown.error;
        }
        const { result } = ran;
        if (!result.ok || dryRun) {
            return result;
        }
        const before = this.state;
        this.state = draft.commit();
        const event: CommandEvent = {
            command: command as CommandName,
            payload: ran.payload,
            result: result.value,
            before,
            after: this.state,
            transient: options.transient === true,
            meta: options.meta,
            ...(command === "batch" ? { commands: execution.steps } : {}),
        };
        this.emit(event);
        return result;
    }

    /**
     * Looks up, validates and runs one command through the middleware chain on the execution's
     * draft. Returns its result, its errors placed at `at`, and the payload the reducer ran with (a
     * middleware may have rewritten it).
     */
    private runChain(
        execution: Execution,
        command: string,
        payload: unknown,
        at: ErrorPaths,
        inBatch: boolean,
    ): { result: CommandResult<unknown>; payload: unknown } {
        const { draft, dryRun, options } = execution;
        const definition = COMMAND_DEFINITIONS.get(command);
        if (!definition) {
            return {
                result: fail("unknown_command", `unknown command "${command}"`),
                payload,
            };
        }
        const failed = invalid(
            validate(definition.payloadSchema, payload, at.payload),
        );
        if (failed) {
            return { result: failed, payload };
        }
        if (options.transient === true && !definition.transient) {
            return {
                result: fail(
                    "invalid_payload",
                    `"${command}" cannot run as a transient step`,
                    at.transient,
                ),
                payload,
            };
        }

        const validated = payload;
        // the command was looked up by name and the payload validated against its schema
        const context = {
            command: command as CommandName,
            payload: payload as PayloadOf<T, CommandName>,
            dryRun,
            transient: options.transient === true,
            inBatch,
            meta: options.meta,
            state: this.state,
            get: (key: CommandContextGetKey, query: unknown) =>
                queryGet(draft.snapshot(), key, query),
        } as CommandContext<T>;

        const reduceContext: ReduceContext = {
            draft,
            runInBatch: (subCommand, subPayload, path) => {
                const sub = this.runChain(
                    execution,
                    subCommand,
                    subPayload,
                    {
                        payload: `${path}/payload`,
                        transient: `${path}/command`,
                    },
                    true,
                );
                const { result } = sub;
                if (!result.ok) {
                    return result.error.code === "unknown_command"
                        ? fail(
                              "unknown_command",
                              result.error.message,
                              `${path}/command`,
                          )
                        : result;
                }
                execution.steps.push({
                    command: subCommand as CommandName,
                    payload: sub.payload,
                    result: result.value,
                });
                return result;
            },
        };

        let ranWith = payload;
        const core = (): CommandResult<unknown> => {
            const rewritten =
                context.payload !== validated &&
                invalid(
                    validate(definition.payloadSchema, context.payload),
                    "rewritten by a middleware: ",
                );
            if (rewritten) {
                return rewritten;
            }
            ranWith = context.payload;
            try {
                return definition.reduce(
                    context.payload as never,
                    reduceContext,
                );
            } catch (thrown) {
                execution.thrown ??= { error: thrown };
                return fail("refused", "the command failed");
            }
        };
        const result = prefixed(this.chain(context, core), at.payload);
        return { result, payload: ranWith };
    }

    private chain(
        context: CommandContext<T>,
        core: () => CommandResult<unknown>,
    ): CommandResult<unknown> {
        const list = [...this.middleware];
        const at = (i: number): CommandResult<unknown> => {
            const middleware = list[i];
            if (!middleware) {
                return core();
            }
            let called = false;
            let nextResult: CommandResult<unknown> = fail(
                "vetoed",
                "a middleware returned no result",
            );
            const next = () => {
                if (!called) {
                    called = true;
                    nextResult = at(i + 1);
                }
                return nextResult;
            };
            let out: CommandResult<unknown> | undefined;
            try {
                out = middleware(context, next);
            } catch (thrown) {
                return fail(
                    "middleware_error",
                    thrown instanceof Error ? thrown.message : String(thrown),
                );
            }
            if (out === undefined) {
                return nextResult;
            }
            return out;
        };
        return at(0);
    }

    private emit(event: CommandEvent) {
        this.events.push(event);
        if (this.delivering) {
            return;
        }
        this.delivering = true;
        let failure: { error: unknown } | undefined;
        try {
            for (
                let next = this.events.shift();
                next !== undefined;
                next = this.events.shift()
            ) {
                for (const listener of [...this.listeners]) {
                    try {
                        listener(next);
                    } catch (thrown) {
                        failure ??= { error: thrown };
                    }
                }
            }
        } finally {
            this.delivering = false;
        }
        if (failure) {
            throw failure.error;
        }
    }
}

/**
 * Creates a splitter model, empty or from a JSON v1 document (`model.get("splitter-json")`). The
 * document is validated; an invalid one throws a {@link SplitterValidationError} listing every
 * problem with its JSON path. Its saved groups apply as their panels register.
 */
export function createSplitterModel<T extends SplitterTypes = AnyTypes>(
    json?: SplitterJson,
    options: SplitterModelOptions = {},
): SplitterModel<T> {
    const state = loadState(json ?? { version: 1, groups: [] });
    return new Model<T>(state, new IdSource(options.createId));
}
