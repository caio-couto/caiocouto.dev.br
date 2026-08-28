import {getCollection} from "astro:content";
import type {IPostRepository} from "../../domain/repositories/IPostRepository.js";
import type {Post} from "../../domain/entities/Post.js";
import type {Category} from "../../domain/entities/Category.js";
import type {Slug} from "../../domain/value-objects/Slug.js";
import {PaginatedResult} from "../../domain/value-objects/PaginatedResult.js";
import {PostMapper} from "../mappers/PostMapper.js";

export class AstroPostRepository implements IPostRepository {
    public async findAll(): Promise<Post[]> {
        const entries = await getCollection("posts");

        return entries
            .map(entry => PostMapper.toDomain(entry))
            .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    }

    public async findBySlug(slug: Slug): Promise<Post | undefined> {
        const all: Post[] = await this.findAll();

        return all.find(p => p.slug.equals(slug));
    }

    public async findByCategory(category: Category): Promise<Post[]> {
        const all: Post[] = await this.findAll();

        return all.filter(p => p.isInCategory(category));
    }

    public async findBySeries(seriesSlug: Slug): Promise<Post[]> {
        const all: Post[] = await this.findAll();

        return all
            .filter(p => p.seriesRef?.seriesSlug.equals(seriesSlug))
            .sort((a, b) => (a.seriesRef?.order ?? 0) - (b.seriesRef?.order ?? 0));
    }

    public async findSuggestions(post: Post, limit: number): Promise<Post[]> {
        const all: Post[] = await this.findAll();

        return all
            .filter(p => !p.slug.equals(post.slug) && p.sharesCategoryWith(post))
            .slice(0, limit);
    }

    public async paginate(page: number, perPage: number): Promise<PaginatedResult<Post>> {
        const all: Post[] = await this.findAll();
        const totalItems: number = all.length;
        const totalPages: number = Math.max(1, Math.ceil(totalItems / perPage));
        const items: Post[] = all.slice((page - 1) * perPage, page * perPage);

        return new PaginatedResult(items, page, totalPages, totalItems);
    }
}
