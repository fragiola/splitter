import { Component, input, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";
import {
    createSplitterModel,
    createSplitterRef,
    injectSplitterState,
    SPLITTER,
    type SplitterRef,
} from "../src/public-api";
import { render, settle } from "./helpers";

// injectSplitterState follows an answer of the model, as a signal that changes only when that
// answer changes.

describe("injectSplitterState", () => {
    it("changes inside a group when its answer changes, and only then", async () => {
        const model = createSplitterModel();
        let renders = 0;
        @Component({
            selector: "test-status",
            template: `<output>{{ text() }}</output>`,
        })
        class Status {
            readonly collapsed = injectSplitterState(({ model }) =>
                model.is("panel-collapsed", { panelId: "a" }),
            );
            text(): string {
                renders++;
                return this.collapsed() ? "collapsed" : "expanded";
            }
        }
        @Component({
            selector: "test-status-app",
            imports: [SPLITTER, Status],
            template: `
                <div splitterGroup id="g" [model]="model">
                    <div splitterPanel id="a" collapsible minSize="20%"><test-status /></div>
                    <div splitterSeparator></div>
                    <div splitterPanel id="b"></div>
                </div>
            `,
        })
        class StatusApp {
            readonly model = model;
        }
        const { container } = await render(StatusApp);
        const output = () => container.querySelector("output")?.textContent;
        expect(output()).toBe("expanded");
        const before = renders;
        model.run("panel.resize", { panelId: "a", size: "40%" });
        await settle();
        // a resize does not change the answer: the component is not checked again
        expect(renders).toBe(before);
        model.run("panel.collapse", { panelId: "a" });
        await settle();
        expect(output()).toBe("collapsed");
        model.run("panel.expand", { panelId: "a" });
        await settle();
        expect(output()).toBe("expanded");
    });

    it("reads a splitter through its ref from outside, undefined until a group holds it", async () => {
        const model = createSplitterModel();
        const seen: unknown[] = [];
        @Component({ selector: "test-toolbar", template: `{{ read() }}` })
        class Toolbar {
            readonly splitterRef = input.required<SplitterRef>();
            readonly size = injectSplitterState(
                ({ model }) =>
                    model.get("panel-size-by", { panelId: "a" })?.percentage,
                { splitterRef: () => this.splitterRef() },
            );
            read(): string {
                seen.push(this.size());
                return "";
            }
        }
        @Component({
            selector: "test-toolbar-app",
            imports: [SPLITTER, Toolbar],
            template: `
                <test-toolbar [splitterRef]="splitterRef" />
                @if (shown()) {
                    <div splitterGroup id="g" [model]="model" [splitterRef]="splitterRef">
                        <div splitterPanel id="a"></div>
                        <div splitterSeparator></div>
                        <div splitterPanel id="b"></div>
                    </div>
                }
            `,
        })
        class ToolbarApp {
            readonly model = model;
            readonly splitterRef = createSplitterRef();
            readonly shown = signal(false);
        }
        const { app } = await render(ToolbarApp);
        expect(seen.at(-1)).toBeUndefined();
        app.shown.set(true);
        await settle();
        expect(seen.at(-1)).toBe(50);
        model.run("panel.resize", { panelId: "a", size: "30%" });
        await settle();
        expect(seen.at(-1)).toBe(30);
        expect(app.splitterRef.current?.groupId).toBe("g");
        app.shown.set(false);
        await settle();
        expect(seen.at(-1)).toBeUndefined();
    });

    it("keeps an equal answer with isEqual, and throws outside a group without a ref", async () => {
        const model = createSplitterModel();
        const answers: unknown[] = [];
        @Component({ selector: "test-ids", template: `{{ read() }}` })
        class Ids {
            readonly ids = injectSplitterState(
                ({ model }) =>
                    model
                        .get("panels-by", { groupId: "g" })
                        .map(({ id }) => id),
                {
                    isEqual: (a, b) =>
                        a.length === b.length &&
                        a.every((id, i) => id === b[i]),
                },
            );
            read(): string {
                answers.push(this.ids());
                return "";
            }
        }
        @Component({
            selector: "test-ids-app",
            imports: [SPLITTER, Ids],
            template: `
                <div splitterGroup id="g" [model]="model">
                    <div splitterPanel id="a"><test-ids /></div>
                    <div splitterSeparator></div>
                    <div splitterPanel id="b"></div>
                </div>
            `,
        })
        class IdsApp {
            readonly model = model;
        }
        await render(IdsApp);
        const count = answers.length;
        expect(answers.at(-1)).toEqual(["a", "b"]);
        model.run("panel.resize", { panelId: "a", size: "30%" });
        await settle();
        // a new array of the same ids: kept, so the component is not checked again
        expect(answers).toHaveLength(count);
        @Component({ selector: "test-outside", template: "" })
        class Outside {
            constructor() {
                injectSplitterState(({ groupId }) => groupId);
            }
        }
        expect(() => TestBed.createComponent(Outside)).toThrow(
            "injectSplitterState must be used inside [splitterGroup]",
        );
    });

    it("selects again when a signal its selector reads changes", async () => {
        const model = createSplitterModel();
        const panelId = signal("a");
        let size: (() => number | undefined) | undefined;
        @Component({ selector: "test-probe", template: "" })
        class Probe {
            constructor() {
                size = injectSplitterState(
                    ({ model }) =>
                        model.get("panel-size-by", { panelId: panelId() })
                            ?.percentage,
                );
            }
        }
        @Component({
            selector: "test-probe-app",
            imports: [SPLITTER, Probe],
            template: `
                <div splitterGroup id="g" [model]="model">
                    <test-probe />
                    <div splitterPanel id="a" defaultSize="30%"></div>
                    <div splitterSeparator></div>
                    <div splitterPanel id="b"></div>
                </div>
            `,
        })
        class ProbeApp {
            readonly model = model;
        }
        await render(ProbeApp);
        expect(size?.()).toBe(30);
        panelId.set("b");
        expect(size?.()).toBe(70);
    });
});
