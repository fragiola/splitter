import type { PanelAddPayload } from "../src/commands/types";
import { createSplitterModel, type SplitterModel } from "../src/state/model";
import type { Orientation, SplitterJson } from "../src/state/types";

/** A panel of {@link group}: its id and what `panel.add` takes besides. */
export type PanelSpec = Omit<PanelAddPayload, "groupId">;

/** A model with one group "g" of these panels, registered in one batch (as an adapter does). */
export function group(
    panels: PanelSpec[],
    options: {
        json?: SplitterJson;
        orientation?: Orientation;
        axisSize?: number;
    } = {},
): SplitterModel {
    const model = createSplitterModel(options.json);
    const result = model.run("batch", {
        commands: [
            {
                command: "group.add",
                payload: {
                    id: "g",
                    ...(options.orientation
                        ? { orientation: options.orientation }
                        : {}),
                },
            },
            ...panels.map((panel) => ({
                command: "panel.add" as const,
                payload: { ...panel, groupId: "g" },
            })),
            ...(options.axisSize === undefined
                ? []
                : [
                      {
                          command: "group.measure" as const,
                          payload: { groupId: "g", axisSize: options.axisSize },
                      },
                  ]),
        ],
    });
    if (!result.ok) {
        throw new Error(result.error.message);
    }
    return model;
}

/** The sizes of group "g", in panel order. */
export function sizes(model: SplitterModel, groupId = "g"): number[] {
    const group = model.get("group-by", { id: groupId });
    return group ? group.panelIds.map((id) => group.layout[id] ?? -1) : [];
}
