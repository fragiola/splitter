// From Grid Layout (fragiola/grid-layout, packages/angular/tests/setup.ts), same author and licence.
import "@angular/compiler";
import "@testing-library/jest-dom/vitest";
import { setupTestBed } from "@analogjs/vitest-angular/setup-testbed";
import { afterEach, vi } from "vitest";

// zoneless, as an Angular 22 app is by default; every fixture is destroyed after its test
setupTestBed({
    zoneless: true,
    errorOnUnknownElements: true,
    errorOnUnknownProperties: true,
});
afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
});
