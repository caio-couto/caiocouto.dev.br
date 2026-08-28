import { Slug } from "../value-objects/Slug.js";
import { CoverImage } from "../value-objects/CoverImage.js";
import { Post } from "./Post.js";

export class Series {
  constructor(
    readonly slug: Slug,
    readonly title: string,
    readonly description: string,
    readonly cover: CoverImage,
    readonly posts: Post[],
  ) {}

  previousPost(current: Post): Post | undefined {
    if (!current.seriesRef) return undefined;
    return this.posts.find(p => p.seriesRef?.order === current.seriesRef!.order - 1);
  }

  nextPost(current: Post): Post | undefined {
    if (!current.seriesRef) return undefined;
    return this.posts.find(p => p.seriesRef?.order === current.seriesRef!.order + 1);
  }
}
