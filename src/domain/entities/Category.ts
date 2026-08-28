import { Slug } from "../value-objects/Slug.js";

export class Category {
  constructor(
    readonly slug: Slug,
    readonly name: string,
  ) {}
}
