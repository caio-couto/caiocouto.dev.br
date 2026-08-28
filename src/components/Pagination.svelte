<script lang="ts">
  import type { PaginatedResult } from "../domain/value-objects/PaginatedResult.js";

  const {
    result,
    baseUrl,
  }: { result: PaginatedResult<unknown>; baseUrl: string } = $props();

  const prevUrl = result.hasPreviousPage()
    ? `${baseUrl}/${result.currentPage - 1}`
    : null;
  const nextUrl = result.hasNextPage()
    ? `${baseUrl}/${result.currentPage + 1}`
    : null;
</script>

<nav aria-label="Paginação">
  {#if prevUrl}
    <a href={prevUrl} rel="prev">← Anterior</a>
  {/if}
  <span>{result.currentPage} / {result.totalPages}</span>
  {#if nextUrl}
    <a href={nextUrl} rel="next">Próxima →</a>
  {/if}
</nav>
