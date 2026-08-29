<script lang="ts">
    import type {Post} from "../domain/entities/Post.js";

    interface Props {
        posts: Post[];
        currentSlug?: string;
    }

    const {posts, currentSlug}: Props = $props();
</script>

<ul class="post-list">
    {#each posts as post (post.slug.toString())}
        {@const isCurrent = post.slug.toString() === currentSlug}
        <li class="post-list__item" class:post-list__item--current={isCurrent}>
            <a href={`/posts/${post.slug}`} class="post-list__link" aria-current={isCurrent ? "page" : undefined}>
                <span class="post-list__title">{post.title}</span>
                <time class="post-list__date" datetime={post.publishedAt.toISOString()}>
                    {post.publishedAt.toLocaleDateString("pt-BR", {day: "2-digit", month: "short", year: "numeric"})}
                </time>
            </a>
        </li>
    {/each}
</ul>

<style>
    .post-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
    }

    .post-list__item {
        border-bottom: var(--border-width) solid var(--color-border);
    }

    .post-list__item:first-child {
        border-top: var(--border-width) solid var(--color-border);
    }

    .post-list__link {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: var(--space-4);
        padding: var(--space-3) 0;
        text-decoration: none;
        color: var(--color-text-muted);
        transition: color 0.15s ease;
    }

    .post-list__link:hover {
        color: var(--color-text);
    }

    .post-list__item--current .post-list__link {
        color: var(--color-accent);
        pointer-events: none;
    }

    .post-list__title {
        font-size: var(--font-size-sm);
        line-height: var(--line-height-snug);
    }

    .post-list__item--current .post-list__title::before {
        content: "→ ";
    }

    .post-list__date {
        font-size: var(--font-size-xs);
        white-space: nowrap;
        flex-shrink: 0;
        color: var(--color-text-muted);
        font-family: var(--font-family-mono), monospace;
    }
</style>
