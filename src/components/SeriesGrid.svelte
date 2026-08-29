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
    padding: var(--space-6) var(--space-8);
    scrollbar-width: thin;
    scrollbar-color: var(--color-border) transparent;
    scroll-snap-type: x mandatory;
    scroll-padding-inline: var(--space-8);
  }

  .series-grid__item {
    display: flex;
    flex-shrink: 0;
    scroll-snap-align: center;
    transform: scale(0.88);
    transition: transform 0.35s ease, opacity 0.35s ease;
    opacity: 0.65;
  }

  .series-grid__item--active {
    transform: scale(1);
    opacity: 1;
  }
</style>
