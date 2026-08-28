export class PaginatedResult<T> {
    constructor(
        readonly items: T[],
        readonly currentPage: number,
        readonly totalPages: number,
        readonly totalItems: number,
    ) {
    }

    public hasNextPage(): boolean {
        return this.currentPage < this.totalPages;
    }

    public hasPreviousPage(): boolean {
        return this.currentPage > 1;
    }
}
