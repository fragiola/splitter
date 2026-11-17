import { describe, expect, it } from "vitest";
import { createSplitterModel } from "../../src/state/model";

function nestedModel() {
    const model = createSplitterModel();
    model.run("batch", {
        commands: [
            // the nested group registers first, as an adapter's child-first effects do
            {
                command: "group.add",
                payload: { id: "inner", parentPanelId: "b" },
            },
            { command: "panel.add", payload: { id: "x", groupId: "inner" } },
            { command: "panel.add", payload: { id: "y", groupId: "inner" } },
            { command: "group.add", payload: { id: "outer" } },
            { command: "panel.add", payload: { id: "a", groupId: "outer" } },
            { command: "panel.add", payload: { id: "b", groupId: "outer" } },
            { command: "group.add", payload: { id: "other" } },
        ],
    });
    return model;
}

describe("paths", () => {
    it("names groups, panels and separators from their root", () => {
        const model = nestedModel();
        expect(model.get("group-path-by", { groupId: "outer" })).toBe("/g0");
        expect(model.get("group-path-by", { groupId: "other" })).toBe("/g1");
        expect(model.get("group-path-by", { groupId: "inner" })).toBe(
            "/g0/p1/g0",
        );
        expect(model.get("panel-path-by", { panelId: "a" })).toBe("/g0/p0");
        expect(model.get("panel-path-by", { panelId: "y" })).toBe(
            "/g0/p1/g0/p1",
        );
        expect(model.get("separator-path-by", { separatorId: "a:b" })).toBe(
            "/g0/s0",
        );
        expect(model.get("separator-path-by", { separatorId: "x:y" })).toBe(
            "/g0/p1/g0/s0",
        );
    });

    it("is undefined for what is not registered, and a root for a group whose parent panel is not", () => {
        const model = nestedModel();
        expect(model.get("group-path-by", { groupId: "nope" })).toBeUndefined();
        expect(model.get("panel-path-by", { panelId: "nope" })).toBeUndefined();
        expect(
            model.get("separator-path-by", { separatorId: "a:x" }),
        ).toBeUndefined();
        model.run("panel.remove", { panelId: "b" });
        expect(model.get("group-path-by", { groupId: "inner" })).toBe("/g0");
        expect(model.get("group-path-by", { groupId: "outer" })).toBe("/g1");
    });
});
