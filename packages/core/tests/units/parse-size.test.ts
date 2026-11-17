import { describe, expect, it } from "vitest";
import { parseSize } from "../../src/units/parse-size";

describe("parseSize", () => {
    it("reads a number as pixels and a unitless string as percent", () => {
        expect(parseSize(50)).toEqual({ value: 50, unit: "px" });
        expect(parseSize("50")).toEqual({ value: 50, unit: "%" });
    });

    it("reads each unit", () => {
        for (const unit of ["%", "px", "rem", "em", "vh", "vw"] as const) {
            expect(parseSize(`12.5${unit}`)).toEqual({ value: 12.5, unit });
        }
        expect(parseSize(" .5 rem ")).toEqual({ value: 0.5, unit: "rem" });
    });

    it("rejects what is not a size", () => {
        for (const size of ["", "abc", "10pt", "-5%", "1e3px", "10 % 2"]) {
            expect(parseSize(size)).toBeUndefined();
        }
        expect(parseSize(-1)).toBeUndefined();
        expect(parseSize(Number.NaN)).toBeUndefined();
        expect(parseSize(Number.POSITIVE_INFINITY)).toBeUndefined();
    });
});
