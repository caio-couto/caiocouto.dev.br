import {describe, expect, it} from "vitest";
import {PaginatedResult} from "./PaginatedResult.js";

describe("PaginatedResult", () => {
    it("hasNextPage retorna true quando não está na última página", () => {
        const result = new PaginatedResult(["a", "b"], 1, 3, 9);
        expect(result.hasNextPage()).toBe(true);
    });

    it("hasNextPage retorna false na última página", () => {
        const result = new PaginatedResult(["a"], 3, 3, 7);
        expect(result.hasNextPage()).toBe(false);
    });

    it("hasPreviousPage retorna false na primeira página", () => {
        const result = new PaginatedResult(["a"], 1, 3, 9);
        expect(result.hasPreviousPage()).toBe(false);
    });

    it("hasPreviousPage retorna true quando não está na primeira página", () => {
        const result = new PaginatedResult(["a"], 2, 3, 9);
        expect(result.hasPreviousPage()).toBe(true);
    });

    it("expõe items, currentPage, totalPages e totalItems", () => {
        const result = new PaginatedResult(["x"], 2, 5, 45);
        expect(result.items).toEqual(["x"]);
        expect(result.currentPage).toBe(2);
        expect(result.totalPages).toBe(5);
        expect(result.totalItems).toBe(45);
    });
});
