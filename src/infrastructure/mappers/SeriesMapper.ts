import type {CollectionEntry} from "astro:content";
import {Series} from "../../domain/entities/Series.js";
import {Slug} from "../../domain/value-objects/Slug.js";
import {CoverImage} from "../../domain/value-objects/CoverImage.js";
import type {Post} from "../../domain/entities/Post.js";

export class SeriesMapper {
    public static toDomain(entry: CollectionEntry<"series">, posts: Post[]): Series {
        const slug: string = entry.id.replace(/\.json$/, "");

        return new Series(
            Slug.from(slug),
            entry.data.title,
            entry.data.description,
            CoverImage.from(entry.data.cover),
            posts,
        );
    }
}
