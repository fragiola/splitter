import { describe, expect, it, vi } from "vitest";
import { veto } from "../../src/commands/types";
import { createSplitterModel } from "../../src/state/model";
import { group, sizes } from "../fixture";

describe("the command bus", () => {
    it("never throws on bad input: every failure is a result", () => {
        const model = group([{ id: "a" }, { id: "b" }]);
        const code = (result: { ok: boolean; error?: { code: string } }) =>
            result.ok ? "ok" : result.error?.code;
        expect(code(model.run("panel.collapse", { panelId: "nope" }))).toBe(
            "not_found",
        );
        expect(code(model.run("panel.collapse", { panelId: "a" }))).toBe(
            "refused",
        );
        // @ts-expect-error: a malformed payload
        expect(code(model.run("panel.resize", { panelId: "a" }))).toBe(
            "invalid_payload",
        );
        expect(
            code(model.dispatch({ command: "panel.fly", payload: {} })),
        ).toBe("unknown_command");
        model.use(() => veto("no"));
        expect(
            code(model.run("panel.resize", { panelId: "a", size: "30%" })),
        ).toBe("vetoed");
    });

    it("reports a throwing middleware as middleware_error", () => {
        const model = group([{ id: "a" }, { id: "b" }]);
        model.use(() => {
            throw new Error("boom");
        });
        expect(model.run("group.reset", { groupId: "g" })).toEqual({
            ok: false,
            error: { code: "middleware_error", message: "boom" },
        });
    });

    it("points invalid_payload at the field, with every issue", () => {
        const model = group([{ id: "a" }, { id: "b" }]);
        const result = model.check("separator.move", {
            separatorId: "a:b",
            // @ts-expect-error: a string delta
            delta: "far",
        });
        expect(result).toMatchObject({
            ok: false,
            error: { code: "invalid_payload", path: "/delta" },
        });
    });

    it("runs can and check through the middleware chain as a dry run", () => {
        const model = group([{ id: "a" }, { id: "b" }]);
        const seen: boolean[] = [];
        model.use((ctx, next) => {
            seen.push(ctx.dryRun);
            if (ctx.command === "panel.resize" && ctx.payload.size === "90%") {
                return veto("too big");
            }
            return next();
        });
        const before = model.get("state");
        expect(model.can("panel.resize", { panelId: "a", size: "30%" })).toBe(
            true,
        );
        expect(
            model.check("panel.resize", { panelId: "a", size: "90%" }),
        ).toMatchObject({
            ok: false,
            error: { code: "vetoed", message: "too big" },
        });
        expect(seen).toEqual([true, true]);
        expect(model.get("state")).toBe(before);
        expect(
            model.check("panel.resize", { panelId: "a", size: "30%" }),
        ).toEqual({ ok: true, value: { size: 30 } });
    });

    it("lets a middleware rewrite the payload (validated again) and observe the result", () => {
        const model = group([{ id: "a" }, { id: "b" }]);
        const results: unknown[] = [];
        model.use((ctx, next) => {
            if (ctx.command === "panel.resize") {
                ctx.payload = { ...ctx.payload, size: "20%" };
            }
            results.push(next());
            return undefined;
        });
        model.run("panel.resize", { panelId: "a", size: "60%" });
        expect(sizes(model)).toEqual([20, 80]);
        expect(results).toEqual([{ ok: true, value: { size: 20 } }]);

        model.use((ctx, next) => {
            if (ctx.command === "panel.resize") {
                ctx.payload = { ...ctx.payload, size: "huge" };
            }
            return next();
        });
        const rewritten = model.run("panel.resize", {
            panelId: "a",
            size: "60%",
        });
        expect(!rewritten.ok && rewritten.error.message).toMatch(
            /^rewritten by a middleware/,
        );
    });

    it("narrows the payload on the command name and reads through ctx.get", () => {
        const model = group([{ id: "a" }, { id: "b" }]);
        const seen: unknown[] = [];
        model.use((ctx, next) => {
            if (ctx.command === "panel.collapse") {
                seen.push(ctx.get("panel-by", { id: ctx.payload.panelId })?.id);
            }
            if (ctx.command === "panel.add" && ctx.inBatch) {
                seen.push(
                    ctx.get("group-by", { id: ctx.payload.groupId })?.panelIds,
                );
            }
            return next();
        });
        model.run("panel.collapse", { panelId: "a" });
        model.run("batch", {
            commands: [
                { command: "panel.add", payload: { id: "c", groupId: "g" } },
                { command: "panel.add", payload: { id: "d", groupId: "g" } },
            ],
        });
        expect(seen).toEqual(["a", ["a", "b"], ["a", "b", "c"]]);
    });

    it("emits one event per commit with before, after, transient and meta", () => {
        const model = group([{ id: "a" }, { id: "b" }]);
        const listener = vi.fn();
        model.subscribe(listener);
        const before = model.get("state");
        model.run(
            "separator.move",
            { separatorId: "a:b", delta: 10 },
            { transient: true, meta: { from: "test" } },
        );
        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener.mock.calls[0]?.[0]).toMatchObject({
            command: "separator.move",
            payload: { separatorId: "a:b", delta: 10 },
            result: { layout: { a: 60, b: 40 } },
            before,
            after: model.get("state"),
            transient: true,
            meta: { from: "test" },
        });
        model.run("panel.collapse", { panelId: "a" });
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it("refuses a non-transient command as a transient step", () => {
        const model = group([{ id: "a" }, { id: "b" }]);
        expect(
            model.run("group.reset", { groupId: "g" }, { transient: true }),
        ).toMatchObject({
            ok: false,
            error: { code: "invalid_payload", path: "/transient" },
        });
    });

    it("runs a batch as one atomic step with one event", () => {
        const model = group([{ id: "a" }, { id: "b" }]);
        const listener = vi.fn();
        model.subscribe(listener);
        const before = model.get("state");
        const failed = model.run("batch", {
            commands: [
                {
                    command: "panel.resize",
                    payload: { panelId: "a", size: "30%" },
                },
                { command: "panel.collapse", payload: { panelId: "nope" } },
            ],
        });
        expect(failed).toMatchObject({
            ok: false,
            error: { code: "not_found", path: "/commands/1/payload/panelId" },
        });
        expect(model.get("state")).toBe(before);
        expect(listener).not.toHaveBeenCalled();

        const done = model.run("batch", {
            commands: [
                {
                    command: "panel.resize",
                    payload: { panelId: "a", size: "30%" },
                },
                {
                    command: "batch",
                    payload: {
                        commands: [
                            {
                                command: "panel.resize",
                                payload: { panelId: "a", size: "40%" },
                            },
                        ],
                    },
                },
            ],
        });
        expect(done).toEqual({
            ok: true,
            value: { results: [{ size: 30 }, { size: 40 }] },
        });
        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener.mock.calls[0]?.[0].commands).toHaveLength(2);
    });

    it("queues a command a middleware runs, after the current one", () => {
        const model = group([{ id: "a" }, { id: "b" }]);
        let queued: unknown;
        model.use((ctx, next) => {
            if (ctx.command === "panel.resize" && !ctx.dryRun) {
                queued = model.run("group.reset", { groupId: "g" });
            }
            return next();
        });
        model.run("panel.resize", { panelId: "a", size: "30%" });
        expect(queued).toMatchObject({ ok: false, error: { code: "queued" } });
        expect(sizes(model)).toEqual([50, 50]);
    });

    it("refuses a command a middleware runs during a dry run: can and check commit nothing", () => {
        const model = createSplitterModel();
        const results: unknown[] = [];
        model.use((ctx, next) => {
            if (ctx.command === "group.add" && ctx.payload.id === "g") {
                results.push(model.run("group.add", { id: "side" }));
                results.push(
                    model.dispatch({
                        command: "group.add",
                        payload: { id: "other" },
                    }),
                );
            }
            return next();
        });
        const listener = vi.fn();
        model.subscribe(listener);
        expect(model.can("group.add", { id: "g" })).toBe(true);
        expect(model.check("group.add", { id: "g" }).ok).toBe(true);
        expect(results).toHaveLength(4);
        for (const result of results) {
            expect(result).toMatchObject({
                ok: false,
                error: { code: "refused" },
            });
        }
        expect(model.get("groups")).toEqual([]);
        expect(listener).not.toHaveBeenCalled();
    });

    it("dispatches untrusted JSON, validated first", () => {
        const model = group([{ id: "a" }, { id: "b" }]);
        expect(model.dispatch("x")).toMatchObject({
            error: { code: "invalid_payload", path: "" },
        });
        expect(model.dispatch({ command: 1, payload: {} })).toMatchObject({
            error: { path: "/command" },
        });
        expect(
            model.dispatch({ command: "group.reset", payload: [] }),
        ).toMatchObject({
            error: { path: "/payload" },
        });
        expect(
            model.dispatch({ command: "group.reset", payload: {} }),
        ).toMatchObject({ error: { path: "/payload/groupId" } });
        expect(
            model.dispatch({
                command: "group.reset",
                payload: { groupId: "g" },
                extra: 1,
            }),
        ).toMatchObject({ error: { path: "/extra" } });
        expect(
            model.dispatch({
                command: "panel.resize",
                payload: { panelId: "a", size: "25%" },
                transient: "yes",
            }),
        ).toMatchObject({ error: { path: "/transient" } });
        const listener = vi.fn();
        model.subscribe(listener);
        expect(
            model.dispatch(
                {
                    command: "panel.resize",
                    payload: { panelId: "a", size: "25%" },
                    transient: true,
                },
                { meta: { source: "assistant" } },
            ),
        ).toEqual({ ok: true, value: { size: 25 } });
        expect(listener.mock.calls[0]?.[0]).toMatchObject({
            transient: true,
            meta: { source: "assistant" },
        });
    });

    it("keeps the state frozen and shares what did not change", () => {
        const model = createSplitterModel();
        model.run("group.add", { id: "one" });
        model.run("group.add", { id: "two" });
        model.run("panel.add", { id: "a", groupId: "one" });
        const before = model.get("state");
        model.run("panel.add", { id: "b", groupId: "two" });
        const after = model.get("state");
        expect(after).not.toBe(before);
        expect(after.groups.one).toBe(before.groups.one);
        expect(after.panels.a).toBe(before.panels.a);
        expect(Object.isFrozen(after)).toBe(true);
        expect(Object.isFrozen(after.groups.two?.layout)).toBe(true);
        expect(Object.isFrozen(after.panels.b)).toBe(true);
        // a command that changes nothing keeps the very same state
        model.run("group.update", { groupId: "one" });
        expect(model.get("state")).toBe(after);
    });

    it("binds its verbs", () => {
        const model = group([{ id: "a" }, { id: "b" }]);
        const { run, can, check, get, is, use, subscribe, dispatch } = model;
        expect(run("panel.resize", { panelId: "a", size: "30%" }).ok).toBe(
            true,
        );
        expect(can("group.reset", { groupId: "g" })).toBe(true);
        expect(check("group.reset", { groupId: "g" }).ok).toBe(true);
        expect(get("layout-by", { groupId: "g" })).toEqual({ a: 30, b: 70 });
        expect(is("group-disabled", { groupId: "g" })).toBe(false);
        expect(typeof use((_ctx, next) => next())).toBe("function");
        expect(typeof subscribe(() => undefined)).toBe("function");
        expect(
            dispatch({ command: "group.reset", payload: { groupId: "g" } }).ok,
        ).toBe(true);
    });

    it("removes middleware and listeners", () => {
        const model = group([{ id: "a" }, { id: "b" }]);
        const listener = vi.fn();
        const unsubscribe = model.subscribe(listener);
        const remove = model.use(() => veto());
        expect(model.can("group.reset", { groupId: "g" })).toBe(false);
        remove();
        unsubscribe();
        model.run("panel.resize", { panelId: "a", size: "30%" });
        expect(listener).not.toHaveBeenCalled();
    });

    it("generates ids with createId, skipping used ones, and none in a dry run", () => {
        let n = 0;
        const model = createSplitterModel(undefined, {
            createId: (kind) => `${kind}-x${n++ % 2}`,
        });
        expect(model.check("group.add", {})).toEqual({
            ok: true,
            value: { groupId: "group-x0" },
        });
        expect(model.run("group.add", {})).toEqual({
            ok: true,
            value: { groupId: "group-x1" },
        });
        const defaultIds = createSplitterModel();
        expect(defaultIds.run("group.add", {})).toEqual({
            ok: true,
            value: { groupId: "group-1" },
        });
        expect(defaultIds.run("panel.add", { groupId: "group-1" })).toEqual({
            ok: true,
            value: { panelId: "panel-1" },
        });
    });

    it("lists every command with its schemas", () => {
        const model = createSplitterModel();
        const commands = model.get("commands");
        expect(commands.map(({ name }) => name)).toEqual([
            "group.add",
            "group.update",
            "group.remove",
            "group.set-layout",
            "group.reset",
            "group.measure",
            "panel.add",
            "panel.update",
            "panel.remove",
            "panel.resize",
            "panel.collapse",
            "panel.expand",
            "separator.move",
            "separator.update",
            "batch",
        ]);
        for (const info of commands) {
            expect(info.description.length).toBeGreaterThan(20);
            expect(info.payloadSchema.type).toBe("object");
            expect(info.resultSchema.type).toBe("object");
        }
    });
});
