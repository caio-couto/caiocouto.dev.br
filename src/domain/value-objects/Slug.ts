export class Slug {
    private constructor(private readonly value: string) {
    }

    public static from(raw: string): Slug {
        const normalized: string = raw
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "");

        if (!normalized) throw new Error(`Invalid slug: "${raw}"`);
        
        return new Slug(normalized);
    }

    public toString(): string {
        return this.value;
    }

    public equals(other: Slug): boolean {
        return this.value === other.value;
    }
}
