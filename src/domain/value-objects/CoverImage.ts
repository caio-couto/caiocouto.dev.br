export interface ImageSource {
    src: string;
    width: number;
    height: number;
    format: string;
}

export class CoverImage {
    private constructor(private readonly source: ImageSource) {
    }

    public static from(source: ImageSource): CoverImage {
        return new CoverImage(source);
    }

    public toImageSource(): ImageSource {
        return this.source;
    }
}
