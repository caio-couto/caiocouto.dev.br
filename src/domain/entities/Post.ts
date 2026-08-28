import { Slug } from "../value-objects/Slug.js";
import { CoverImage } from "../value-objects/CoverImage.js";
import { SeriesRef } from "../value-objects/SeriesRef.js";
import { Category } from "./Category.js";

export class Post {
  constructor(
    readonly slug: Slug,
    readonly title: string,
    readonly summary: string,
    readonly cover: CoverImage,
    readonly categories: Category[],
    readonly publishedAt: Date,
    readonly seriesRef?: SeriesRef,
  ) {}

  belongsToSeries(): boolean {
    return this.seriesRef !== undefined;
  }

  isInCategory(category: Category): boolean {
    return this.categories.some(c => c.slug.equals(category.slug));
  }

  sharesCategoryWith(other: Post): boolean {
    return this.categories.some(c => other.isInCategory(c));
  }
}
