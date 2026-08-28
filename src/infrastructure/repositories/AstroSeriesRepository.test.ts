import {beforeEach, describe, expect, it, vi} from "vitest";
import {AstroSeriesRepository} from "./AstroSeriesRepository.js";
import {Slug} from "../../domain/value-objects/Slug.js";
import {CoverImage} from "../../domain/value-objects/CoverImage.js";
import {SeriesRef} from "../../domain/value-objects/SeriesRef.js";
import {Post} from "../../domain/entities/Post.js";
import {getCollection} from "astro:content";

vi.mock("astro:content", () => ({
    getCollection: vi.fn(),
}));

const mockCover = {src: "/img.png", width: 1, height: 1, format: "png"};

function makePostEntry(overrides: {
    id?: string;
    series?: string;
    seriesOrder?: number;
} = {}) {
    return {
        id: overrides.id ?? "hello-world",
        data: {
            title: "Hello",
            summary: "Summary",
            cover: mockCover,
            categories: ["astro"],
            publishedAt: new Date("2026-01-01"),
            series: overrides.series,
            seriesOrder: overrides.seriesOrder,
        },
    };
}

function makeSeriesEntry(id = "my-series") {
    return {
        id,
        data: {
            title: "My Series",
            description: "A series.",
            cover: mockCover,
        },
    };
}

const repo = new AstroSeriesRepository();

beforeEach(() => {
    vi.mocked(getCollection).mockReset();
});

describe("AstroSeriesRepository", () => {
    describe("findAll", () => {
        it("retorna séries com seus posts ordenados", async () => {
            vi.mocked(getCollection).mockImplementation(async (name: string) => {
                if (name === "series") return [makeSeriesEntry("getting-started")] as any;
                return [
                    makePostEntry({id: "post-2", series: "getting-started", seriesOrder: 2}),
                    makePostEntry({id: "post-1", series: "getting-started", seriesOrder: 1}),
                ] as any;
            });

            const series = await repo.findAll();
            expect(series).toHaveLength(1);
            expect(series[0].slug.toString()).toBe("getting-started");
            expect(series[0].posts).toHaveLength(2);
            expect(series[0].posts[0].slug.toString()).toBe("post-1");
        });

        it("retorna série vazia quando não há posts associados", async () => {
            vi.mocked(getCollection).mockImplementation(async (name: string) => {
                if (name === "series") return [makeSeriesEntry("empty-series")] as any;
                return [] as any;
            });

            const series = await repo.findAll();
            expect(series[0].posts).toHaveLength(0);
        });
    });

    describe("findBySlug", () => {
        it("retorna a série correta pelo slug", async () => {
            vi.mocked(getCollection).mockImplementation(async (name: string) => {
                if (name === "series") return [makeSeriesEntry("getting-started")] as any;
                return [] as any;
            });

            const series = await repo.findBySlug(Slug.from("getting-started"));
            expect(series?.slug.toString()).toBe("getting-started");
        });

        it("retorna undefined para slug inexistente", async () => {
            vi.mocked(getCollection).mockImplementation(async (name: string) => {
                if (name === "series") return [makeSeriesEntry("getting-started")] as any;
                return [] as any;
            });

            expect(await repo.findBySlug(Slug.from("nao-existe"))).toBeUndefined();
        });
    });

    describe("findByPost", () => {
        it("retorna a série do post", async () => {
            vi.mocked(getCollection).mockImplementation(async (name: string) => {
                if (name === "series") return [makeSeriesEntry("getting-started")] as any;
                return [makePostEntry({id: "post-1", series: "getting-started", seriesOrder: 1})] as any;
            });

            const post = new Post(
                Slug.from("post-1"),
                "Post 1",
                "Summary",
                CoverImage.from(mockCover),
                [],
                new Date(),
                SeriesRef.from("getting-started", 1),
            );

            const series = await repo.findByPost(post);
            expect(series?.slug.toString()).toBe("getting-started");
        });

        it("retorna undefined para post sem série", async () => {
            vi.mocked(getCollection).mockResolvedValue([] as any);

            const post = new Post(
                Slug.from("orphan"),
                "Orphan",
                "No series",
                CoverImage.from(mockCover),
                [],
                new Date(),
            );

            expect(await repo.findByPost(post)).toBeUndefined();
        });
    });
});
