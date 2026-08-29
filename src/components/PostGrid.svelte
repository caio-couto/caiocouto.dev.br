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
        grid-template-columns: repeat(3, 1fr);
        gap: var(--space-6);
    }

    .post-grid__item {
        display: flex;
    }
 
    .post-grid__item :global(.post-card) {
        width: 100%;
    }

    @media (max-width: 60rem) {
        .post-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (max-width: 40rem) {
        .post-grid {
            grid-template-columns: 1fr;
        }
    }
</style>
