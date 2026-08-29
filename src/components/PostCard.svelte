<script lang="ts">
  import type {Post} from "../domain/entities/Post.js";
  import CornerBox from "./CornerBox.svelte";
  import type {ImageSource} from "../domain/value-objects/CoverImage.ts";
  import type {Category} from "../domain/entities/Category.ts";

  interface Props {
        post: Post;
    }

    const {post}: Props = $props();

    const cover: ImageSource = post.cover.toImageSource();
    const dateStr: string = post.publishedAt.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
    const category: Category = post.categories[0];
</script>

<CornerBox tag="a" href={`/posts/${post.slug}`} class="post-card">
    <img
            src={cover.src}
            alt={post.title}
            width={cover.width}
            height={cover.height}
            class="post-card__cover"
    />
    <div class="post-card__body">
        {#if category}
            <span class="post-card__category">{category.name}</span>
        {/if}
        <h2 class="post-card__title">{post.title}</h2>
        <p class="post-card__summary">{post.summary}</p>
        <span class="post-card__meta">Caio Couto · {dateStr}</span>
    </div>
</CornerBox>

<style>
    :global(.post-card) {
        display: flex;
        flex-direction: column;
        background-color: var(--color-surface);
        border: var(--border-width-dash) dashed var(--color-text);
        text-decoration: none;
        color: var(--color-text);
        transition: border-color 0.15s ease;
    }

    :global(.post-card:hover) {
        border-color: var(--color-accent);
    }

    :global(.post-card:hover .corner-box__marker) {
        color: var(--color-accent);
    }

    .post-card__cover {
        width: 100%;
        height: var(--cover-height-card);
        object-fit: cover;
        border-bottom: var(--border-width) solid var(--color-border);
    }

    .post-card__body {
        padding: var(--space-5);
        display: flex;
        flex-direction: column;
        flex: 1;
        gap: var(--space-2);
    }

    .post-card__category {
        font-size: var(--font-size-2xs);
        letter-spacing: var(--letter-spacing-wide);
        text-transform: uppercase;
        color: var(--color-accent);
    }

    .post-card__title {
        margin: 0;
        font-size: var(--font-size-md);
        font-weight: var(--font-weight-semibold);
        line-height: var(--line-height-snug);
    }

    .post-card__summary {
        margin: 0;
        font-size: var(--font-size-sm);
        color: var(--color-text-muted);
        line-height: var(--line-height-normal);
        flex: 1;
    }

    .post-card__meta {
        font-size: var(--font-size-xs);
        color: var(--color-text-muted);
    }
</style>
