import type {Series} from "../entities/Series.js";
import type {Post} from "../entities/Post.js";
import type {Slug} from "../value-objects/Slug.js";

export interface ISeriesRepository {
    findAll(): Promise<Series[]>;

    findBySlug(slug: Slug): Promise<Series | undefined>;

    findByPost(post: Post): Promise<Series | undefined>;
}
 