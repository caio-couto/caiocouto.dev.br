import { describe, it, expect } from "vitest";
import { Series } from "./Series.js";
import { Post } from "./Post.js";
import { Slug } from "../value-objects/Slug.js";
import { CoverImage } from "../value-objects/CoverImage.js";
import { SeriesRef } from "../value-objects/SeriesRef.js";

const mockCover = CoverImage.from({ src: "/img.png", width: 1, height: 1, format: "png" });

function makePost(order: number, slug: string): Post {
  return new Post(
    Slug.from(slug),
    `Post ${order}`,
    "Summary",
    mockCover,
    [],
    new Date("2026-01-01"),
    SeriesRef.from("my-series", order),
  );
}

function makeSeries(posts: Post[]): Series {
  return new Series(
    Slug.from("my-series"),
    "My Series",
    "A series.",
    mockCover,
    posts,
  );
}

describe("Series", () => {
  it("previousPost retorna undefined para o primeiro post", () => {
    const p1 = makePost(1, "post-1");
    const p2 = makePost(2, "post-2");
    expect(makeSeries([p1, p2]).previousPost(p1)).toBeUndefined();
  });

  it("previousPost retorna o post com order - 1", () => {
    const p1 = makePost(1, "post-1");
    const p2 = makePost(2, "post-2");
    expect(makeSeries([p1, p2]).previousPost(p2)?.slug.toString()).toBe("post-1");
  });

  it("nextPost retorna undefined para o último post", () => {
    const p1 = makePost(1, "post-1");
    const p2 = makePost(2, "post-2");
    expect(makeSeries([p1, p2]).nextPost(p2)).toBeUndefined();
  });

  it("nextPost retorna o post com order + 1", () => {
    const p1 = makePost(1, "post-1");
    const p2 = makePost(2, "post-2");
    expect(makeSeries([p1, p2]).nextPost(p1)?.slug.toString()).toBe("post-2");
  });

  it("previousPost retorna undefined quando post não tem seriesRef", () => {
    const postSemRef = new Post(
      Slug.from("orphan"),
      "Orphan",
      "No series",
      mockCover,
      [],
      new Date(),
    );
    expect(makeSeries([]).previousPost(postSemRef)).toBeUndefined();
  });
});
