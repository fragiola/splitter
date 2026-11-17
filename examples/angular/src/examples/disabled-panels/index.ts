import { Component, signal } from "@angular/core";
import { SPLITTER } from "@fragiola/splitter-angular";
import { SWITCH } from "#/components/ui/switch";
import * as styles from "./styles";

let made = 0;

// Three ways to keep a layout still. A disabled panel (the toolbox) is never moved by a
// separator, so the one beside it cannot move. A disabled separator (between the layers and the
// properties) is out of the tab order and ignores the pointer. A disabled group locks every
// separator. Code can still resize them all (`panel.resize`).
@Component({
    selector: "example-disabled-panels",
    imports: [SPLITTER, SWITCH],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div [class]="styles.toolbar">
                <span [class]="styles.toggle">
                    <button kitSwitch [(checked)]="locked" [attr.aria-labelledby]="lockLabel">
                        <span kitSwitchThumb></span>
                    </button>
                    <span [id]="lockLabel">Lock the layout</span>
                </span>
            </div>
            <div splitterGroup [disabled]="locked()" [class]="styles.group">
                <div splitterPanel id="toolbox" defaultSize="18%" disabled>
                    <section aria-label="Toolbox" [class]="styles.panel">
                        <h2 [class]="styles.title">Toolbox</h2>
                        <p [class]="styles.text">A disabled panel.</p>
                    </section>
                </div>
                <div
                    splitterSeparator
                    aria-label="Resize toolbox"
                    [class]="styles.separator"
                ></div>
                <div splitterPanel id="canvas" minSize="20%">
                    <section aria-label="Canvas" [class]="styles.panel">
                        <h2 [class]="styles.title">Canvas</h2>
                        <p [class]="styles.text">Its separator with the layers moves.</p>
                    </section>
                </div>
                <div
                    splitterSeparator
                    aria-label="Resize canvas"
                    [class]="styles.separator"
                ></div>
                <div splitterPanel id="layers" defaultSize="22%" minSize="10%">
                    <section aria-label="Layers" [class]="styles.panel">
                        <h2 [class]="styles.title">Layers</h2>
                        <p [class]="styles.text">Resizable from the canvas.</p>
                    </section>
                </div>
                <div
                    splitterSeparator
                    disabled
                    aria-label="Resize layers"
                    [class]="styles.separator"
                ></div>
                <div splitterPanel id="properties" defaultSize="22%">
                    <section aria-label="Properties" [class]="styles.panel">
                        <h2 [class]="styles.title">Properties</h2>
                        <p [class]="styles.text">Behind a disabled separator.</p>
                    </section>
                </div>
            </div>
        </div>
    `,
})
export default class DisabledPanels {
    protected readonly styles = styles;
    protected readonly locked = signal(false);
    // the id that names the switch (React's `useId`)
    protected readonly lockLabel = `disabled-panels-lock-${made++}`;
}
