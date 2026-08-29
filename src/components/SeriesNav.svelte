<script lang="ts">
  import type {Post} from "../domain/entities/Post.js";
  import type {Series} from "../domain/entities/Series.js";

  interface Props {
        series: Series;
        currentPost: Post;
    }

    const {series, currentPost}: Props = $props();

    const prev: Post | undefined = series.previousPost(currentPost);
    const next: Post | undefined = series.nextPost(currentPost);
</script>

<nav class="series-nav" aria-label="Navegação da série">
    <p class="series-nav__label">
        Série: <a href={`/series/${series.slug}`} class="series-nav__series-link">{series.title}</a>
    </p>
    <div class="series-nav__links">
        {#if prev}
            <a href={`/posts/${prev.slug}`} class="series-nav__link series-nav__link--prev" rel="prev">
                ← {prev.title}
            </a>
        {:else}
            <span></span>
        {/if}
        {#if next}
            <a href={`/posts/${next.slug}`} class="series-nav__link series-nav__link--next" rel="next">
                {next.title} →
            </a>
        {/if}
    </div>
</nav>

<style>
    .series-nav {
        border-top: var(--border-width) solid var(--color-border);
        border-bottom: var(--border-width) solid var(--color-border);
        padding: var(--space-6) 0;
        margin: var(--space-12) 0;
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
    }

    .series-nav__label {
        margin: 0;
        font-size: var(--font-size-sm);
        color: var(--color-text-muted);
    }

    .series-nav__series-link {
        color: var(--color-link);
        text-decoration: none;
    }

    .series-nav__series-link:hover {
        color: var(--color-accent);
    }

    .series-nav__links {
        display: flex;
        justify-content: space-between;
        gap: var(--space-4);
        font-size: var(--font-size-sm);
    }

    .series-nav__link {
        color: var(--color-link);
        text-decoration: none;
    }

    .series-nav__link:hover {
        color: var(--color-accent);
    }

    .series-nav__link--next {
        margin-left: auto;
    }
</style>
