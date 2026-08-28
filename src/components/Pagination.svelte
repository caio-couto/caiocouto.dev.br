<script lang="ts">
  import type {PaginatedResult} from "../domain/value-objects/PaginatedResult.js";

  interface Props {
        result: PaginatedResult<unknown>;
        baseUrl: string;
    }

    const {result, baseUrl}: Props = $props();

    const prevUrl: string | null = result.hasPreviousPage()
        ? `${baseUrl}/${result.currentPage - 1}`
        : null;
    const nextUrl: string | null = result.hasNextPage()
        ? `${baseUrl}/${result.currentPage + 1}`
        : null;
</script>

<nav class="pagination" aria-label="Paginação">
    {#if prevUrl}
        <a href={prevUrl} class="pagination__link" rel="prev">← anterior</a>
    {:else}
        <span class="pagination__link pagination__link--disabled">← anterior</span>
    {/if}

    <span class="pagination__info">{result.currentPage} / {result.totalPages}</span>

    {#if nextUrl}
        <a href={nextUrl} class="pagination__link" rel="next">próxima →</a>
    {:else}
        <span class="pagination__link pagination__link--disabled">próxima →</span>
    {/if}
</nav>

<style>
    .pagination {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-8);
        padding: var(--space-12) 0;
        font-size: var(--font-size-sm);
    }

    .pagination__link {
        color: var(--color-accent);
        text-decoration: none;
    }

    .pagination__link:hover {
        color: var(--color-accent-hover);
    }

    .pagination__link--disabled {
        color: var(--color-border);
        cursor: default;
    }

    .pagination__info {
        color: var(--color-text-muted);
    }
</style>
