import type { CollectionEntry } from "astro:content";
import { Post } from "../../domain/entities/Post.js";
import { Slug } from "../../domain/value-objects/Slug.js";
import { CoverImage } from "../../domain/value-objects/CoverImage.js";
import { SeriesRef } from "../../domain/value-objects/SeriesRef.js";
import { CategoryMapper } from "./CategoryMapper.js";

export class PostMapper {
  static toDomain(entry: CollectionEntry<"posts">): Post {
    const { data, id } = entry;
    const slug = id.replace(/\.(md|mdx)$/, "");

    if (data.series !== undefined && data.seriesOrder === undefined) {
      throw new Error(
        `Post "${id}" tem "series" definido mas está sem "seriesOrder".`,
      );
    }

    const seriesRef = data.series !== undefined
      ? SeriesRef.from(data.series, data.seriesOrder!)
      : undefined;

    return new Post(
      Slug.from(slug),
      data.title,
      data.summary,
      CoverImage.from(data.cover),
      data.categories.map(s => CategoryMapper.toDomain(s)),
      data.publishedAt,
      seriesRef,
    );
  }
}
