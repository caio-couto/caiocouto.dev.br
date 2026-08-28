import {beforeEach, describe, expect, it, vi} from "vitest";
import {AstroCategoryRepository} from "./AstroCategoryRepository.js";
import {Slug} from "../../domain/value-objects/Slug.js";
import {getCollection} from "astro:content";

vi.mock("astro:content", () => ({
    getCollection: vi.fn(),
}));

const mockCover = {src: "/img.png", width: 1, height: 1, format: "png"};

function makeEntry(id: string, categories: string[]) {
    return {
        id,
        data: {
            title: "Title",
            summary: "Summary",
            cover: mockCover,
            categories,
            publishedAt: new Date("2026-01-01"),
        },
    };
}

const repo = new AstroCategoryRepository();

beforeEach(() => {
    vi.mocked(getCollection).mockReset();
});

describe("AstroCategoryRepository", () => {
    describe("findAll", () => {
        it("retorna categorias únicas derivadas dos posts", async () => {
            vi.mocked(getCollection).mockResolvedValue([
                makeEntry("post-1", ["typescript", "astro"]),
                makeEntry("post-2", ["typescript", "svelte"]),
            ] as any);

            const categories = await repo.findAll();
            const slugs = categories.map(c => c.slug.toString());
            expect(slugs).toEqual(["astro", "svelte", "typescript"]);
        });

        it("não duplica categorias que aparecem em múltiplos posts", async () => {
            vi.mocked(getCollection).mockResolvedValue([
                makeEntry("post-1", ["typescript"]),
                makeEntry("post-2", ["typescript"]),
                makeEntry("post-3", ["typescript"]),
            ] as any);

            const categories = await repo.findAll();
            expect(categories).toHaveLength(1);
        });

        it("retorna lista vazia quando não há posts", async () => {
            vi.mocked(getCollection).mockResolvedValue([] as any);
            expect(await repo.findAll()).toEqual([]);
        });

        it("gera o nome da categoria a partir do slug", async () => {
            vi.mocked(getCollection).mockResolvedValue([
                makeEntry("post-1", ["clean-code"]),
            ] as any);

            const categories = await repo.findAll();
            expect(categories[0].name).toBe("Clean Code");
        });
    });

    describe("findBySlug", () => {
        it("retorna a categoria correta pelo slug", async () => {
            vi.mocked(getCollection).mockResolvedValue([
                makeEntry("post-1", ["typescript"]),
            ] as any);

            const category = await repo.findBySlug(Slug.from("typescript"));
            expect(category?.name).toBe("Typescript");
        });

        it("retorna undefined para slug inexistente", async () => {
            vi.mocked(getCollection).mockResolvedValue([
                makeEntry("post-1", ["typescript"]),
            ] as any);

            expect(await repo.findBySlug(Slug.from("nao-existe"))).toBeUndefined();
        });
    });
});
