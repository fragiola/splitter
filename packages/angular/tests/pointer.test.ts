import { Component, input, signal } from "@angular/core";
import { describe, expect, it } from "vitest";
import {
    type CommandEvent,
    createSplitterModel,
    type Layout,
    SPLITTER,
    type SplitterModel,
    veto,
} from "../src/public-api";
import { at, grows, pointer, render, stubPanelRects } from "./helpers";

// Pointer drags (D8): the engine runs them on the separator element; each step is a transient
// commit (`layoutChange`), the release one commit (`layoutCommit`). Angular never writes what the
// engine does mid-drag.

@Component({
    selector: "test-drag",
    imports: [SPLITTER],
    template: `
        <div splitterGroup id="g" [model]="model()" (layoutChange)="changes.push($event)" (layoutCommit)="commits.push($event)">
            <div splitterPanel id="a"></div>
            <div splitterSeparator></div>
            <div splitterPanel id="b"></div>
        </div>
    `,
})
class Drag {
    readonly model = input<SplitterModel | undefined>(undefined);
    readonly changes: (Readonly<Layout> | undefined)[] = [];
    readonly commits: Readonly<Layout>[] = [];
}

/** `[(layout)]`: the layout the app holds follows the group, and the group the app's. */
@Component({
    selector: "test-controlled",
    imports: [SPLITTER],
    template: `
        <div splitterGroup id="g" [model]="model()" [(layout)]="layout" (layoutCommit)="commits.push($event)">
            <div splitterPanel id="a"></div>
            <div splitterSeparator></div>
            <div splitterPanel id="b"></div>
        </div>
    `,
})
class Controlled {
    readonly model = input.required<SplitterModel>();
    readonly layout = signal<Readonly<Layout> | undefined>({ a: 50, b: 50 });
    readonly commits: Readonly<Layout>[] = [];
}

function vetoRelease(model: SplitterModel): void {
    model.use((ctx, next) =>
        ctx.command === "separator.move" && !ctx.transient ? veto() : next(),
    );
}

async function drag(container: HTMLElement) {
    const separator = at(container, "/g0/s0");
    await pointer(separator, "pointerdown", { clientX: 500 });
    await pointer(separator, "pointermove", { clientX: 600 });
    await pointer(separator, "pointermove", { clientX: 700 });
    await pointer(separator, "pointerup", { clientX: 700 });
}

describe("pointer drags", () => {
    it("resize the panels, with data-dragging while the drag runs", async () => {
        // two panels of 500px: the group is 1000px along its axis
        stubPanelRects(500);
        const { container, app } = await render(Drag);
        app.changes.length = 0;
        const separator = at(container, "/g0/s0");
        await pointer(separator, "pointerdown", { clientX: 500 });
        expect(separator).toHaveAttribute("data-dragging", "");
        expect(at(container, "/g0")).toHaveAttribute("data-dragging", "");
        await pointer(separator, "pointermove", { clientX: 600 });
        expect(grows(container)).toEqual([60, 40]);
        await pointer(separator, "pointermove", { clientX: 700 });
        expect(grows(container)).toEqual([70, 30]);
        expect(app.changes).toEqual([
            { a: 60, b: 40 },
            { a: 70, b: 30 },
        ]);
        expect(app.commits).toEqual([]);
        await pointer(separator, "pointerup", { clientX: 700 });
        expect(separator).not.toHaveAttribute("data-dragging");
        expect(at(container, "/g0")).not.toHaveAttribute("data-dragging");
        expect(app.commits).toEqual([{ a: 70, b: 30 }]);
        expect(separator).toHaveAttribute("aria-valuenow", "70");
    });

    it("go back to where they started when middleware vetoes the release", async () => {
        stubPanelRects(500);
        const model = createSplitterModel();
        vetoRelease(model);
        const { container } = await render(Drag, (fixture) =>
            fixture.componentRef.setInput("model", model),
        );
        const separator = at(container, "/g0/s0");
        await pointer(separator, "pointerdown", { clientX: 500 });
        await pointer(separator, "pointermove", { clientX: 800 });
        expect(grows(container)).toEqual([80, 20]);
        await pointer(separator, "pointerup", { clientX: 800 });
        expect(grows(container)).toEqual([50, 50]);
    });

    describe("with [(layout)]", () => {
        it("keeps the drag steps transient and commits once", async () => {
            stubPanelRects(500);
            const model = createSplitterModel();
            const { container, app } = await render(Controlled, (fixture) =>
                fixture.componentRef.setInput("model", model),
            );
            const events: CommandEvent[] = [];
            model.subscribe((event) => events.push(event));
            await drag(container);
            // the layout that comes back is the model's: no group.set-layout echoes it
            expect(
                events.map(({ command, transient }) => [command, transient]),
            ).toEqual([
                ["separator.move", true],
                ["separator.move", true],
                ["separator.move", false],
            ]);
            expect(app.commits).toEqual([{ a: 70, b: 30 }]);
            expect(app.layout()).toEqual({ a: 70, b: 30 });
            expect(grows(container)).toEqual([70, 30]);
        });

        it("goes back to where it started when middleware vetoes the release", async () => {
            stubPanelRects(500);
            const model = createSplitterModel();
            vetoRelease(model);
            const { container, app } = await render(Controlled, (fixture) =>
                fixture.componentRef.setInput("model", model),
            );
            await drag(container);
            expect(app.commits).toEqual([]);
            expect(model.get("layout-by", { groupId: "g" })).toEqual({
                a: 50,
                b: 50,
            });
            expect(app.layout()).toEqual({ a: 50, b: 50 });
            expect(grows(container)).toEqual([50, 50]);
        });
    });
});
