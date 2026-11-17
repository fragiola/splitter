import { createSplitterModel } from "@fragiola/splitter-react";
import { describe, expect, it } from "vitest";
import { createUndoHistory, undoKey } from "../src/examples/_kit/undo.ts";

// `_kit/undo.ts` is copyable app code: it is checked against a real model, without a DOM. A drag
// is transient steps then one commit; registering panels is not a step.

function model() {
    const made = createSplitterModel();
    made.run("batch", {
        commands: [
            { command: "group.add", payload: { id: "main" } },
            { command: "panel.add", payload: { id: "a", groupId: "main" } },
            { command: "panel.add", payload: { id: "b", groupId: "main" } },
        ],
    });
    return made;
}

const layout = (m: ReturnType<typeof model>) =>
    m.get("layout-by", { groupId: "main" });

describe("the undo history", () => {
    it("ignores registration, and makes one step of a whole drag", () => {
        const m = model();
        const history = createUndoHistory(m);
        m.run("panel.add", { id: "c", groupId: "main" });
        expect(history.getSnapshot().canUndo).toBe(false);
        const origin = layout(m);
        for (const delta of [2, 5, 9]) {
            m.run(
                "separator.move",
                { separatorId: "b:c", delta, origin },
                { transient: true },
            );
        }
        m.run("separator.move", { separatorId: "b:c", delta: 9, origin });
        expect(history.getSnapshot().undoSteps).toEqual(["separator.move"]);
        const moved = layout(m);
        expect(history.undo()).toBe(true);
        expect(layout(m)).toEqual(origin);
        expect(history.redo()).toBe(true);
        expect(layout(m)).toEqual(moved);
        history.dispose();
    });

    it("drops what was undone when a new step comes, and does not record its own restores", () => {
        const m = model();
        const history = createUndoHistory(m);
        m.run("separator.move", { separatorId: "a:b", delta: 10 });
        m.run("separator.move", { separatorId: "a:b", delta: 10 });
        history.undo();
        expect(history.getSnapshot()).toMatchObject({
            canUndo: true,
            canRedo: true,
        });
        m.run("panel.resize", { panelId: "a", size: "30%" });
        expect(history.getSnapshot()).toMatchObject({
            undoSteps: ["separator.move", "panel.resize"],
            canRedo: false,
        });
    });

    it("reads Ctrl/Cmd+Z, Shift for redo, and leaves text fields alone", () => {
        const key = (key: string, extra: object = {}) =>
            undoKey({
                key,
                ctrlKey: true,
                metaKey: false,
                shiftKey: false,
                target: null,
                ...extra,
            });
        expect(key("z")).toBe("undo");
        expect(key("Z", { shiftKey: true })).toBe("redo");
        expect(key("y")).toBe("redo");
        expect(key("z", { ctrlKey: false })).toBeUndefined();
        expect(key("a")).toBeUndefined();
    });
});
