// Type fixtures, checked by `pnpm typecheck` (ngc, strict templates): `@ts-expect-error` marks
// what must not compile.
import { Component } from "@angular/core";
import {
    createSplitterModel,
    createSplitterRef,
    injectSplitter,
    injectSplitterState,
    type Layout,
    type PanelResizeEvent,
    SPLITTER,
    type SplitterTypes,
} from "../../src/public-api";

interface Types extends SplitterTypes {
    readonly groupId: "main";
    readonly panelId: "left" | "right";
}

/** The directives in a strict template: the group's registry comes from its model. */
@Component({
    selector: "fixture-typed",
    imports: [SPLITTER],
    template: `
        <div splitterGroup id="main" [model]="model" [(layout)]="layout" (layoutCommit)="save($event)" #g="splitterGroup">
            <div splitterPanel id="left" defaultSize="30%" [minSize]="120" collapsible (resize)="resized($event)" #p="splitterPanel">
                {{ p.state().collapsed ? "collapsed" : "" }}
            </div>
            <div splitterSeparator aria-label="Resize" [disabled]="g.state().dragging"></div>
            <div splitterPanel id="right"></div>
        </div>
    `,
})
export class Typed {
    readonly model = createSplitterModel<Types>();
    layout: Readonly<Layout> | undefined;

    save(layout: Readonly<Layout>): void {
        void layout;
    }

    resized(event: PanelResizeEvent): void {
        void event.size.percentage;
    }
}

export function injected(): void {
    const splitter = injectSplitter<Types>();
    splitter().model.run("panel.resize", { panelId: "left", size: "30%" });
    // @ts-expect-error: not a panel id of the registry
    splitter().model.run("panel.resize", { panelId: "nope", size: "30%" });
    const collapsed = injectSplitterState<Types, boolean>(({ model }) =>
        model.is("panel-collapsed", { panelId: "right" }),
    );
    const yes: boolean = collapsed();
    void yes;
    const outside = injectSplitter(createSplitterRef());
    // @ts-expect-error: null while no root group holds the ref
    outside().model;
}
