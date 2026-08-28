<script lang="ts">
  import type {Series} from "../domain/entities/Series.js";
  import SeriesCard from "./SeriesCard.svelte";

  const {seriesList}: { seriesList: Series[] } = $props();
</script>

<section>
    {#each seriesList as series (series.slug.toString())}
        <SeriesCard {series}/>
    {/each}
</section>
