import {Slug} from "./Slug.js";

export class SeriesRef {
    private constructor(
        readonly seriesSlug: Slug,
        readonly order: number,
    ) {
    }

    static from(seriesSlug: string, order: number): SeriesRef {
        return new SeriesRef(Slug.from(seriesSlug), order);
    }
}
