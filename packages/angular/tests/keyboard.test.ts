import { Component, signal } from "@angular/core";
import { describe, expect, it, vi } from "vitest";
import { type Layout, SPLITTER } from "../src/public-api";
import { at, doubleClick, grows, press, render, settle } from "./helpers";

// The keyboard (D8, WAI-ARIA APG Window Splitter): the engine answers keys on a focused separator;
// Angular renders the result.

@Component({
    selector: "test-keys",
    imports: [SPLITTER],
    template: `
        <div splitterGroup id="g" [keyboardStep]="keyboardStep()" (layoutChange)="changed($event)" (layoutCommit)="committed($event)">
            <div splitterPanel id="a" minSize="20%" maxSize="80%" collapsible collapsedSize="5%" defaultSize="50%"
                (collapse)="collapsed()" (expand)="expanded()"></div>
            <div splitterSeparator aria-label="Resize" [disabled]="disabled()" [resetOnDoubleClick]="reset()"></div>
            <div splitterPanel id="b"></div>
        </div>
    `,
})
class Keys {
    readonly keyboardStep = signal<number | undefined>(undefined);
    readonly disabled = signal<boolean | undefined>(undefined);
    readonly reset = signal<boolean | undefined>(undefined);
    readonly changes: (Readonly<Layout> | undefined)[] = [];
    readonly commits: Readonly<Layout>[] = [];
    readonly collapsed = vi.fn();
    readonly expanded = vi.fn();
    changed(layout: Readonly<Layout> | undefined) {
        this.changes.push(layout);
    }
    committed(layout: Readonly<Layout>) {
        this.commits.push(layout);
    }
}

function keys(prepare?: (app: Keys) => void) {
    return render(Keys, (fixture) => prepare?.(fixture.componentInstance));
}

describe("the keyboard", () => {
    it("resizes with the arrows and updates the ARIA value", async () => {
        const { container } = await keys();
        const separator = at(container, "/g0/s0");
        await press(separator, "ArrowRight");
        expect(grows(container)).toEqual([55, 45]);
        expect(separator).toHaveAttribute("aria-valuenow", "55");
        await press(separator, "ArrowLeft");
        await press(separator, "ArrowLeft");
        expect(grows(container)).toEqual([45, 55]);
    });

    it("uses the root group's keyboard step", async () => {
        const { container } = await keys((app) => app.keyboardStep.set(10));
        await press(at(container, "/g0/s0"), "ArrowRight");
        expect(grows(container)).toEqual([60, 40]);
    });

    it("moves to the limits with Home and End", async () => {
        const { container } = await keys();
        const separator = at(container, "/g0/s0");
        await press(separator, "End");
        expect(grows(container)).toEqual([80, 20]);
        await press(separator, "Home");
        // the panel before is collapsible: Home collapses it
        expect(grows(container)[0]).toBeLessThanOrEqual(20);
    });

    it("toggles collapse with Enter, with (collapse) and (expand)", async () => {
        const { container, app } = await keys();
        const separator = at(container, "/g0/s0");
        const panel = at(container, "/g0/p0");
        await press(separator, "Enter");
        expect(grows(container)).toEqual([5, 95]);
        expect(panel).toHaveAttribute("data-collapsed", "");
        expect(app.collapsed).toHaveBeenCalledTimes(1);
        await press(separator, "Enter");
        expect(grows(container)).toEqual([50, 50]);
        expect(panel).not.toHaveAttribute("data-collapsed");
        expect(app.expanded).toHaveBeenCalledTimes(1);
    });

    it("reports each key as a change and a commit", async () => {
        const { container, app } = await keys();
        // the layout it registered with is a change, not a commit
        expect(app.changes.at(-1)).toEqual({ a: 50, b: 50 });
        expect(app.commits).toEqual([]);
        await press(at(container, "/g0/s0"), "ArrowRight");
        expect(app.changes.at(-1)).toEqual({ a: 55, b: 45 });
        expect(app.commits).toEqual([{ a: 55, b: 45 }]);
        // a key that changes nothing reports nothing
        const calls = app.changes.length;
        await press(at(container, "/g0/s0"), "a");
        expect(app.changes).toHaveLength(calls);
    });

    it("ignores a disabled separator, which leaves the tab order", async () => {
        const { container } = await keys((app) => app.disabled.set(true));
        const separator = at(container, "/g0/s0");
        expect(separator).not.toHaveAttribute("tabindex");
        expect(separator).toHaveAttribute("data-disabled", "");
        await press(separator, "ArrowRight");
        expect(grows(container)).toEqual([50, 50]);
    });

    it("double click resets the panel to its default size", async () => {
        const { container, app } = await keys();
        const separator = at(container, "/g0/s0");
        await press(separator, "ArrowRight");
        expect(grows(container)).toEqual([55, 45]);
        await doubleClick(separator);
        expect(grows(container)).toEqual([50, 50]);
        await press(separator, "ArrowRight");
        app.reset.set(false);
        await settle();
        await doubleClick(separator);
        expect(grows(container)).toEqual([55, 45]);
    });
});
