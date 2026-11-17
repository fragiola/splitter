import { describe, expect, it } from "vitest";
import * as core from "../../src/index";

describe("the model in plain Node", () => {
    it("loads, runs and saves with no DOM at all", () => {
        expect(typeof globalThis.document).toBe("undefined");
        expect(typeof globalThis.window).toBe("undefined");
        const model = core.createSplitterModel();
        model.run("batch", {
            commands: [
                { command: "group.add", payload: { id: "g" } },
                {
                    command: "panel.add",
                    payload: { id: "a", groupId: "g", minSize: 200 },
                },
                { command: "panel.add", payload: { id: "b", groupId: "g" } },
                {
                    command: "group.measure",
                    payload: { groupId: "g", axisSize: 800 },
                },
            ],
        });
        expect(model.get("layout-by", { groupId: "g" })).toEqual({
            a: 50,
            b: 50,
        });
        expect(
            model.check("panel.resize", { panelId: "a", size: 100 }),
        ).toEqual({
            ok: true,
            value: { size: 25 },
        });
        const json = model.get("splitter-json");
        expect(JSON.parse(JSON.stringify(json))).toEqual(json);
    });

    it("creates an engine without touching the DOM", () => {
        const engine = core.createSplitterEngine(core.createSplitterModel());
        expect(engine.run("measure", {})).toEqual({
            ok: true,
            value: { groupIds: [] },
        });
        expect(engine.get("dragging-separator-id")).toBeUndefined();
    });
});
