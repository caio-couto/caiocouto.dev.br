<script lang="ts">
  import type {Series} from "../domain/entities/Series.js";

  const {series}: { series: Series } = $props();
</script>

<article>
    <a href={`/series/${series.slug}`}>
        <img src={series.cover.toImageSource().src} alt={series.title}/>
        <div>
            <h2>{series.title}</h2>
            <p>{series.description}</p>
            <span>{series.posts.length} posts</span>
        </div>
    </a>
</article>
