<script lang="ts">
  import type {Post} from "../domain/entities/Post.js";
  import PostCard from "./PostCard.svelte";

  interface Props {
        posts: Post[];
    }

    const {posts}: Props = $props();
</script>

<ul class="post-grid">
    {#each posts as post (post.slug.toString())}
        <li class="post-grid__item">
            <PostCard {post}/>
        </li>
    {/each}
</ul>

<style>
    .post-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(16.25rem, 1fr));
        gap: var(--space-6);
    }

    .post-grid__item {
        display: flex;
    }

    .post-grid__item :global(.post-card) {
        width: 100%;
    }
</style>
