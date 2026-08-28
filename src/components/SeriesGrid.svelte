<script lang="ts">
  import type {Series} from "../domain/entities/Series.js";
  import SeriesCard from "./SeriesCard.svelte";

  interface Props {
        seriesList: Series[];
    }

    const {seriesList}: Props = $props();
</script>

<ul class="series-grid">
    {#each seriesList as series (series.slug.toString())}
        <li class="series-grid__item">
            <SeriesCard {series}/>
        </li>
    {/each}
</ul>

<style>
    .series-grid {
        display: flex;
        gap: var(--space-6);
        overflow-x: auto;
        padding: var(--space-3) 0;
        scrollbar-width: thin;
        scrollbar-color: var(--color-border) transparent;
    }

    .series-grid__item {
        display: flex;
        flex-shrink: 0;
    }
</style>
