import {describe, expect, it} from "vitest";
import {Post} from "./Post.js";
import {Category} from "./Category.js";
import {Slug} from "../value-objects/Slug.js";
import {CoverImage} from "../value-objects/CoverImage.js";
import {SeriesRef} from "../value-objects/SeriesRef.js";

const mockCover = CoverImage.from({src: "/img.png", width: 1, height: 1, format: "png"});
const tsCategory = new Category(Slug.from("typescript"), "TypeScript");
const astroCategory = new Category(Slug.from("astro"), "Astro");

function makePost(
    slug = "hello-world",
    categories: Category[] = [tsCategory],
    seriesRef?: SeriesRef,
): Post {
    return new Post(
        Slug.from(slug),
        "Hello World",
        "A summary",
        mockCover,
        categories,
        new Date("2026-01-01"),
        seriesRef,
    );
}

describe("Post", () => {
    it("belongsToSeries retorna false sem seriesRef", () => {
        expect(makePost().belongsToSeries()).toBe(false);
    });

    it("belongsToSeries retorna true com seriesRef", () => {
        const post = makePost("hello", [], SeriesRef.from("my-series", 1));
        expect(post.belongsToSeries()).toBe(true);
    });

    it("isInCategory retorna true quando o post tem a categoria", () => {
        expect(makePost("p", [tsCategory]).isInCategory(tsCategory)).toBe(true);
    });

    it("isInCategory retorna false quando o post não tem a categoria", () => {
        expect(makePost("p", [tsCategory]).isInCategory(astroCategory)).toBe(false);
    });

    it("sharesCategoryWith retorna true para categorias em comum", () => {
        const a = makePost("a", [tsCategory]);
        const b = makePost("b", [tsCategory, astroCategory]);
        expect(a.sharesCategoryWith(b)).toBe(true);
    });

    it("sharesCategoryWith retorna false sem categorias em comum", () => {
        const a = makePost("a", [tsCategory]);
        const b = makePost("b", [astroCategory]);
        expect(a.sharesCategoryWith(b)).toBe(false);
    });

    it("sharesCategoryWith retorna false para o mesmo post sem categorias", () => {
        const a = makePost("a", []);
        expect(a.sharesCategoryWith(a)).toBe(false);
    });
});
