import { describe, expect, it } from "vitest";
import { sizeToPercentage, sizeToPixels } from "../../src/units/resolve-size";

const measure = {
    axisSize: 800,
    fontSize: 20,
    rootFontSize: 16,
    viewportWidth: 1600,
    viewportHeight: 900,
};

describe("sizeToPixels", () => {
    it("converts every unit", () => {
        expect(sizeToPixels("25%", measure)).toBe(200);
        expect(sizeToPixels(120, measure)).toBe(120);
        expect(sizeToPixels("2em", measure)).toBe(40);
        expect(sizeToPixels("2rem", measure)).toBe(32);
        expect(sizeToPixels("10vw", measure)).toBe(160);
        expect(sizeToPixels("10vh", measure)).toBe(90);
    });

    it("is undefined when the measure it needs is missing", () => {
        expect(sizeToPixels("2em", { axisSize: 800 })).toBeUndefined();
        expect(sizeToPixels("10vh", { axisSize: 800 })).toBeUndefined();
        expect(sizeToPixels("10%", undefined)).toBeUndefined();
        expect(sizeToPixels("bad", measure)).toBeUndefined();
    });
});

describe("sizeToPercentage", () => {
    it("needs no measure for a percentage", () => {
        expect(sizeToPercentage("33.3333%", undefined)).toBe(33.333);
        expect(sizeToPercentage("40", undefined)).toBe(40);
    });

    it("resolves other units against the measured axis", () => {
        expect(sizeToPercentage(200, measure)).toBe(25);
        expect(sizeToPercentage("10rem", measure)).toBe(20);
        expect(sizeToPercentage("8vw", measure)).toBe(16);
    });

    it("is undefined before a measure, or with an empty axis", () => {
        expect(sizeToPercentage(200, undefined)).toBeUndefined();
        expect(sizeToPercentage(200, { axisSize: 0 })).toBeUndefined();
    });
});
