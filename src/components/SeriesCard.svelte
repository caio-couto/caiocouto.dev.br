<script lang="ts">
  import type {Series} from "../domain/entities/Series.js";
  import CornerBox from "./CornerBox.svelte";
  import type {ImageSource} from "../domain/value-objects/CoverImage.ts";

  interface Props {
        series: Series;
    }

    const {series}: Props = $props();
    const cover: ImageSource = series.cover.toImageSource();
</script>

<CornerBox
        tag="a"
        href={`/series/${series.slug}`}
        class="series-card"
        color="var(--color-text-muted)"
>
    <img
            src={cover.src}
            alt={series.title}
            width={cover.width}
            height={cover.height}
            class="series-card__cover"
    />
    <div class="series-card__body">
        <h2 class="series-card__title">{series.title}</h2>
        <p class="series-card__description">{series.description}</p>
        {#if series.posts.length > 0}
            <ul class="series-card__episodes">
                {#each series.posts as post}
                    <li class="series-card__episode">
                        <span class="series-card__episode-arrow" aria-hidden="true">→</span>
                        {post.title}
                    </li>
                {/each}
            </ul>
        {/if}
    </div>
</CornerBox>

<style>
    :global(.series-card) {
        display: flex;
        flex-direction: column;
        background-color: var(--color-surface);
        border: var(--border-width-dash) dashed var(--color-text);
        text-decoration: none;
        color: var(--color-text);
        width: 20rem;
        flex-shrink: 0;
        transition: border-color 0.15s ease;
    }

    :global(.series-card:hover) {
        border-color: var(--color-accent);
    }

    :global(.series-card:hover .corner-box__marker) {
        color: var(--color-accent);
    }

    .series-card__cover {
        width: 100%;
        height: var(--cover-height-card);
        object-fit: cover;
        object-position: top;
        background-color: #000;
        display: block;
    }

    .series-card__body {
        padding: var(--space-6);
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
    }

    .series-card__title {
        margin: 0;
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-bold);
    }

    .series-card__description {
        margin: 0;
        font-size: var(--font-size-sm);
        color: var(--color-text-muted);
        line-height: var(--line-height-normal);
    }

    .series-card__episodes {
        border-top: var(--border-width) solid var(--color-border);
        padding-top: var(--space-3);
        margin-top: var(--space-2);
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        font-size: var(--font-size-sm);
        color: var(--color-text-muted);
    }

    .series-card__episode {
        display: flex;
        align-items: baseline;
        gap: var(--space-2);
    }

    .series-card__episode-arrow {
        color: var(--color-accent);
        flex-shrink: 0;
    }
</style>
