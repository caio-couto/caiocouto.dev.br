import {getCollection} from "astro:content";
import type {ICategoryRepository} from "../../domain/repositories/ICategoryRepository.js";
import type {Category} from "../../domain/entities/Category.js";
import type {Slug} from "../../domain/value-objects/Slug.js";
import {CategoryMapper} from "../mappers/CategoryMapper.js";

export class AstroCategoryRepository implements ICategoryRepository {
    public async findAll(): Promise<Category[]> {
        const entries = await getCollection("posts");
        const slugSet = new Set<string>();

        for (const entry of entries) {
            for (const slug of entry.data.categories) {
                slugSet.add(slug);
            }
        }

        return Array.from(slugSet).sort().map(slug => CategoryMapper.toDomain(slug));
    }

    public async findBySlug(slug: Slug): Promise<Category | undefined> {
        const all: Category[] = await this.findAll();

        return all.find(c => c.slug.equals(slug));
    }
}
