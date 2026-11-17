// From Grid Layout (fragiola/grid-layout, examples/angular/tests/kit.test.ts), same author and licence.
// @vitest-environment jsdom

import { Component, signal, type Type } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it } from "vitest";
import { ClickableButton } from "#/components/atoms/clickable";
import { SWITCH } from "#/components/ui/switch";

// The Angular kit renders what the React kit renders: the same element, role, state attributes and
// classes, so the shared e2e specs and the themes read both the same. The framework-free kit files
// are React's, byte for byte (tests/vendored.test.ts), and tested in examples/react.

afterEach(() => {
    TestBed.resetTestingModule();
    document.body.innerHTML = "";
    localStorage.clear();
});

/** Renders `component` and returns its element, once stable. */
async function render<T>(component: Type<T>) {
    const fixture = TestBed.createComponent(component);
    await fixture.whenStable();
    return {
        root: fixture.nativeElement as HTMLElement,
        fixture,
        stable: () => fixture.whenStable(),
    };
}

const classes = (element: Element | null) =>
    element?.getAttribute("class")?.split(/\s+/) ?? [];

describe("the Angular UI kit", () => {
    it("Clickable.Button is a button with the clickable classes", async () => {
        @Component({
            imports: [ClickableButton],
            template: `<button kitClickable variant="outline" size="sm" aria-label="Add" [class]="'extra'">Add</button>`,
        })
        class Host {}
        const { root } = await render(Host);
        const button = root.querySelector("button");
        expect(button?.getAttribute("type")).toBe("button");
        expect(button?.getAttribute("aria-label")).toBe("Add");
        expect(button?.getAttribute("data-slot")).toBe("clickable-button");
        expect(classes(button)).toEqual(
            expect.arrayContaining([
                "border-palette-line",
                "h-8",
                "px-3",
                "extra",
            ]),
        );
    });

    it("Clickable.Button takes a type, for a form's submit", async () => {
        @Component({
            imports: [ClickableButton],
            template: `<button kitClickable type="submit">Save</button>`,
        })
        class Host {}
        const { root } = await render(Host);
        expect(root.querySelector("button")?.getAttribute("type")).toBe(
            "submit",
        );
    });

    it("a disabled Clickable.Button is disabled and dimmed", async () => {
        @Component({
            imports: [ClickableButton],
            template: `<button kitClickable disabled>Save</button>`,
        })
        class Host {}
        const { root } = await render(Host);
        const button = root.querySelector("button");
        expect(button?.disabled).toBe(true);
        expect(classes(button)).toContain("opacity-50");
    });

    it("Switch is a switch that marks its checked state as Base UI does, and binds both ways", async () => {
        @Component({
            imports: [SWITCH],
            template: `
                <button kitSwitch [(checked)]="on" aria-labelledby="label"><span kitSwitchThumb></span></button>
                <span id="label">Bounded</span>
            `,
        })
        class Host {
            readonly on = signal(true);
        }
        const { root, fixture, stable } = await render(Host);
        const button = root.querySelector("button");
        const thumb = root.querySelector("[kitSwitchThumb]");
        expect(button?.getAttribute("role")).toBe("switch");
        expect(button?.getAttribute("type")).toBe("button");
        expect(button?.getAttribute("aria-checked")).toBe("true");
        expect(button?.hasAttribute("data-checked")).toBe(true);
        expect(thumb?.hasAttribute("data-checked")).toBe(true);
        expect(classes(button)).toContain("data-checked:bg-palette-ring");
        expect(classes(thumb)).toContain("data-checked:translate-x-3");

        button?.click();
        await stable();
        expect(fixture.componentInstance.on()).toBe(false);
        expect(button?.getAttribute("aria-checked")).toBe("false");
        expect(button?.hasAttribute("data-checked")).toBe(false);
        expect(thumb?.hasAttribute("data-checked")).toBe(false);
    });
});
