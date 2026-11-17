// Type fixtures (compiled by `pnpm typecheck`, never run): the model's typed surface.
import { createSplitterModel, type SplitterModel } from "../../src/state/model";
import type { SplitterTypes } from "../../src/state/types";

function use(_value: unknown): void {}

/** `true` when `A` and `B` are the same union. */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

// the model's whole surface: one verb per member (a new member must be added here on purpose)
export const modelSurface: Same<
    keyof SplitterModel,
    "run" | "dispatch" | "can" | "check" | "get" | "is" | "use" | "subscribe"
> = true;

interface AppTypes extends SplitterTypes {
    groupId: "main" | "sidebar";
    panelId: "nav" | "editor" | "preview";
}

export function typedIds(): void {
    const model = createSplitterModel<AppTypes>();
    model.run("panel.collapse", { panelId: "nav" });
    // @ts-expect-error: not a panel of the registry
    model.run("panel.collapse", { panelId: "other" });
    model.run("group.reset", { groupId: "main" });
    // @ts-expect-error: not a group of the registry
    model.get("layout-by", { groupId: "other" });
    model.is("panel-collapsed", { panelId: "editor" });
    // @ts-expect-error: not a panel of the registry
    model.is("panel-collapsed", { panelId: "x" });
}

export function results(model: SplitterModel): void {
    const resized = model.run("panel.resize", { panelId: "a", size: "30%" });
    if (resized.ok) {
        const size: number = resized.value.size;
        use(size);
    } else {
        const code: string = resized.error.code;
        use(code);
    }
    const moved = model.check("separator.move", {
        separatorId: "a:b",
        delta: 5,
    });
    if (moved.ok) {
        const layout: Record<string, number> = moved.value.layout;
        use(layout);
    }
    // @ts-expect-error: a delta is a number
    model.run("separator.move", { separatorId: "a:b", delta: "5" });
    // @ts-expect-error: unknown command
    model.run("panel.fly", {});
    // @ts-expect-error: a size is a number or a string
    model.run("panel.resize", { panelId: "a", size: true });
}

export function queries(model: SplitterModel): void {
    const groups = model.get("groups");
    const json = model.get("splitter-json");
    const version: 1 = json.version;
    const commands = model.get("commands");
    use([groups, version, commands]);
    const layout = model.get("layout-by", { groupId: "g" });
    use(layout?.a);
    // @ts-expect-error: layout-by takes a groupId
    model.get("layout-by");
    // @ts-expect-error: the key takes the entity's own id
    model.get("panel-by", { panelId: "a" });
    // @ts-expect-error: an unknown key
    model.get("panel-width");
    const collapsed: boolean = model.is("panel-collapsed", { panelId: "a" });
    use(collapsed);
}

export function middleware(model: SplitterModel): void {
    model.use((ctx, next) => {
        if (ctx.command === "panel.resize") {
            const size: string | number = ctx.payload.size;
            use(size);
        } else if (ctx.command === "separator.move") {
            // @ts-expect-error: a move has no panelId
            ctx.payload.panelId;
        }
        return next();
    });
    model.subscribe((event) => {
        const transient: boolean = event.transient;
        use(transient);
    });
}
