<script lang="ts">
  import type {Post} from "../domain/entities/Post.js";
  import type {Series} from "../domain/entities/Series.js";

  const {series, currentPost}: { series: Series; currentPost: Post } =
        $props();

    const prev = series.previousPost(currentPost);
    const next = series.nextPost(currentPost);
</script>

<nav aria-label="Navegação da série">
    <p>Série: <a href={`/series/${series.slug}`}>{series.title}</a></p>
    <div>
        {#if prev}
            <a href={`/posts/${prev.slug}`} rel="prev">← {prev.title}</a>
        {/if}
        {#if next}
            <a href={`/posts/${next.slug}`} rel="next">{next.title} →</a>
        {/if}
    </div>
</nav>
