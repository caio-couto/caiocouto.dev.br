import type {Category} from "../entities/Category.js";
import type {Slug} from "../value-objects/Slug.js";

export interface ICategoryRepository {
    findAll(): Promise<Category[]>;

    findBySlug(slug: Slug): Promise<Category | undefined>;
}
