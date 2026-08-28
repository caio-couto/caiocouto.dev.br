import type {Post} from "../entities/Post.js";
import type {Category} from "../entities/Category.js";
import type {Slug} from "../value-objects/Slug.js";
import type {PaginatedResult} from "../value-objects/PaginatedResult.js";

export interface IPostRepository {
    findAll(): Promise<Post[]>;

    findBySlug(slug: Slug): Promise<Post | undefined>;

    findByCategory(category: Category): Promise<Post[]>;

    findBySeries(seriesSlug: Slug): Promise<Post[]>;

    findSuggestions(post: Post, limit: number): Promise<Post[]>;

    paginate(page: number, perPage: number): Promise<PaginatedResult<Post>>;
}
