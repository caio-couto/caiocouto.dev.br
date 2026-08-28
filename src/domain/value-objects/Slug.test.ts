import {describe, expect, it} from "vitest";
import {Slug} from "./Slug.js";

describe("Slug", () => {
    it("cria a partir de string válida", () => {
        expect(Slug.from("hello-world").toString()).toBe("hello-world");
    });

    it("normaliza uppercase para lowercase", () => {
        expect(Slug.from("Hello-World").toString()).toBe("hello-world");
    });

    it("substitui espaços por hífens", () => {
        expect(Slug.from("hello world").toString()).toBe("hello-world");
    });

    it("remove caracteres inválidos", () => {
        expect(Slug.from("hello@world!").toString()).toBe("helloworld");
    });

    it("lança erro para string vazia", () => {
        expect(() => Slug.from("")).toThrow("Invalid slug");
    });

    it("lança erro para string que resulta em vazia após normalização", () => {
        expect(() => Slug.from("!!!")).toThrow("Invalid slug");
    });

    it("equals retorna true para slugs iguais", () => {
        expect(Slug.from("foo").equals(Slug.from("foo"))).toBe(true);
    });

    it("equals retorna false para slugs diferentes", () => {
        expect(Slug.from("foo").equals(Slug.from("bar"))).toBe(false);
    });
});
