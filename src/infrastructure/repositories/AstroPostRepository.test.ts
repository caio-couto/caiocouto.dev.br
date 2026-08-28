import {beforeEach, describe, expect, it, vi} from "vitest";
import {AstroPostRepository} from "./AstroPostRepository.js";
import {Slug} from "../../domain/value-objects/Slug.js";
import {getCollection} from "astro:content";

vi.mock("astro:content", () => ({
    getCollection: vi.fn(),
}));

const mockCover = {src: "/img.png", width: 1, height: 1, format: "png"};

function makeEntry(overrides: {
    id?: string;
    categories?: string[];
    publishedAt?: Date;
    series?: string;
    seriesOrder?: number;
} = {}) {
    return {
        id: overrides.id ?? "hello-world",
        data: {
            title: "Hello World",
            summary: "A summary",
            cover: mockCover,
            categories: overrides.categories ?? ["typescript"],
            publishedAt: overrides.publishedAt ?? new Date("2026-01-01"),
            series: overrides.series,
            seriesOrder: overrides.seriesOrder,
        },
    };
}

const repo = new AstroPostRepository();

beforeEach(() => {
    vi.mocked(getCollection).mockReset();
});

describe("AstroPostRepository", () => {
    describe("findAll", () => {
        it("retorna posts ordenados por data decrescente", async () => {
            vi.mocked(getCollection).mockResolvedValue([
                makeEntry({id: "old", publishedAt: new Date("2025-01-01")}),
                makeEntry({id: "new", publishedAt: new Date("2026-01-01")}),
            ] as any);

            const posts = await repo.findAll();
            expect(posts[0].slug.toString()).toBe("new");
            expect(posts[1].slug.toString()).toBe("old");
        });

        it("retorna lista vazia quando não há posts", async () => {
            vi.mocked(getCollection).mockResolvedValue([] as any);
            expect(await repo.findAll()).toEqual([]);
        });
    });

    describe("findBySlug", () => {
        it("retorna o post com o slug correspondente", async () => {
            vi.mocked(getCollection).mockResolvedValue([makeEntry({id: "hello-world"})] as any);
            const post = await repo.findBySlug(Slug.from("hello-world"));
            expect(post?.slug.toString()).toBe("hello-world");
        });

        it("retorna undefined para slug inexistente", async () => {
            vi.mocked(getCollection).mockResolvedValue([makeEntry({id: "hello-world"})] as any);
            const post = await repo.findBySlug(Slug.from("nao-existe"));
            expect(post).toBeUndefined();
        });
    });

    describe("findByCategory", () => {
        it("retorna posts que pertencem à categoria", async () => {
            vi.mocked(getCollection).mockResolvedValue([
                makeEntry({id: "ts-post", categories: ["typescript"]}),
                makeEntry({id: "astro-post", categories: ["astro"]}),
            ] as any);

            const {Category} = await import("../../domain/entities/Category.js");
            const {Slug: S} = await import("../../domain/value-objects/Slug.js");
            const cat = new Category(S.from("typescript"), "TypeScript");

            const posts = await repo.findByCategory(cat);
            expect(posts).toHaveLength(1);
            expect(posts[0].slug.toString()).toBe("ts-post");
        });
    });

    describe("findBySeries", () => {
        it("retorna posts da série ordenados por order", async () => {
            vi.mocked(getCollection).mockResolvedValue([
                makeEntry({id: "post-2", series: "my-series", seriesOrder: 2}),
                makeEntry({id: "post-1", series: "my-series", seriesOrder: 1}),
                makeEntry({id: "other"}),
            ] as any);

            const posts = await repo.findBySeries(Slug.from("my-series"));
            expect(posts).toHaveLength(2);
            expect(posts[0].slug.toString()).toBe("post-1");
            expect(posts[1].slug.toString()).toBe("post-2");
        });
    });

    describe("findSuggestions", () => {
        it("retorna posts com categorias em comum, excluindo o post atual", async () => {
            vi.mocked(getCollection).mockResolvedValue([
                makeEntry({id: "current", categories: ["typescript"]}),
                makeEntry({id: "related", categories: ["typescript", "astro"]}),
                makeEntry({id: "unrelated", categories: ["svelte"]}),
            ] as any);

            const posts = await repo.findAll();
            const current = posts.find(p => p.slug.toString() === "current")!;
            const suggestions = await repo.findSuggestions(current, 5);

            expect(suggestions).toHaveLength(1);
            expect(suggestions[0].slug.toString()).toBe("related");
        });

        it("respeita o limite informado", async () => {
            vi.mocked(getCollection).mockResolvedValue([
                makeEntry({id: "current", categories: ["typescript"]}),
                makeEntry({id: "a", categories: ["typescript"]}),
                makeEntry({id: "b", categories: ["typescript"]}),
                makeEntry({id: "c", categories: ["typescript"]}),
            ] as any);

            const posts = await repo.findAll();
            const current = posts.find(p => p.slug.toString() === "current")!;
            const suggestions = await repo.findSuggestions(current, 2);

            expect(suggestions).toHaveLength(2);
        });
    });

    describe("paginate", () => {
        it("retorna a página correta de posts", async () => {
            const entries = Array.from({length: 10}, (_, i) =>
                makeEntry({id: `post-${i + 1}`, publishedAt: new Date(2026, 0, i + 1)}),
            );
            vi.mocked(getCollection).mockResolvedValue(entries as any);

            const result = await repo.paginate(1, 3);
            expect(result.items).toHaveLength(3);
            expect(result.currentPage).toBe(1);
            expect(result.totalPages).toBe(4);
            expect(result.totalItems).toBe(10);
        });

        it("calcula hasNextPage corretamente", async () => {
            const entries = Array.from({length: 5}, (_, i) =>
                makeEntry({id: `post-${i + 1}`}),
            );
            vi.mocked(getCollection).mockResolvedValue(entries as any);

            const page1 = await repo.paginate(1, 3);
            expect(page1.hasNextPage()).toBe(true);

            const page2 = await repo.paginate(2, 3);
            expect(page2.hasNextPage()).toBe(false);
        });

        it("retorna totalPages mínimo de 1 para coleção vazia", async () => {
            vi.mocked(getCollection).mockResolvedValue([] as any);
            const result = await repo.paginate(1, 9);
            expect(result.totalPages).toBe(1);
        });
    });
});
