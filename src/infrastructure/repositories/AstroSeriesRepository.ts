import {getCollection} from "astro:content";
import type {ISeriesRepository} from "../../domain/repositories/ISeriesRepository.js";
import type {Series} from "../../domain/entities/Series.js";
import type {Post} from "../../domain/entities/Post.js";
import type {Slug} from "../../domain/value-objects/Slug.js";
import {SeriesMapper} from "../mappers/SeriesMapper.js";
import {PostMapper} from "../mappers/PostMapper.js";

export class AstroSeriesRepository implements ISeriesRepository {
    public async findAll(): Promise<Series[]> {
        const [seriesEntries, postEntries] = await Promise.all([
            getCollection("series"),
            getCollection("posts"),
        ]);

        const allPosts: Post[] = postEntries.map(entry => PostMapper.toDomain(entry));

        return seriesEntries.map(entry => {
            const seriesSlugStr: string = entry.id.replace(/\.json$/, "");
            const seriesPosts: Post[] = allPosts
                .filter(p => p.seriesRef?.seriesSlug.toString() === seriesSlugStr)
                .sort((a, b) => (a.seriesRef?.order ?? 0) - (b.seriesRef?.order ?? 0));

            return SeriesMapper.toDomain(entry, seriesPosts);
        });
    }

    public async findBySlug(slug: Slug): Promise<Series | undefined> {
        const all: Series[] = await this.findAll();

        return all.find(s => s.slug.equals(slug));
    }

    public async findByPost(post: Post): Promise<Series | undefined> {
        if (!post.seriesRef) return undefined;
        
        return this.findBySlug(post.seriesRef.seriesSlug);
    }
}
