import {Category} from "../../domain/entities/Category.js";
import {Slug} from "../../domain/value-objects/Slug.js";

export class CategoryMapper {
    public static toDomain(slug: string): Category {
        const name: string = slug
            .split("-")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
        
        return new Category(Slug.from(slug), name);
    }
}
