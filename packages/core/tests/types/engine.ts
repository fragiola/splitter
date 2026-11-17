// Type fixtures (compiled by `pnpm typecheck`, never run): the engine's typed surface.
import type { SplitterEngine } from "../../src/engine/splitter-engine";

function use(_value: unknown): void {}

/** `true` when `A` and `B` are the same union. */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

// the engine's whole surface: the model's verbs, plus what only adapters call
export const engineSurface: Same<
    keyof SplitterEngine,
    | "run"
    | "dispatch"
    | "can"
    | "check"
    | "get"
    | "is"
    | "use"
    | "subscribe"
    | "adapter"
> = true;

export function actions(engine: SplitterEngine): void {
    const measured = engine.run("measure", {});
    if (measured.ok) {
        const ids: string[] = measured.value.groupIds;
        use(ids);
    }
    engine.can("focus-separator", { separatorId: "a:b" });
    // @ts-expect-error: an action has no dot
    engine.run("panel.resize", {});
    // @ts-expect-error: focus-separator needs its separator
    engine.run("focus-separator", {});
    const aria = engine.get("separator-aria-by", { separatorId: "a:b" });
    const now: number | undefined = aria?.["aria-valuenow"];
    use(now);
    const direction: "ltr" | "rtl" = engine.get("direction-by", {
        groupId: "g",
    });
    const dragging: string | undefined = engine.get("dragging-separator-id");
    use([direction, dragging]);
    engine.is("separator-dragging", { separatorId: "a:b" });
}
