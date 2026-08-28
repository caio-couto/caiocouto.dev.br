<script lang="ts">
  import type {Post} from "../domain/entities/Post.js";
  import PostCard from "./PostCard.svelte";

  const {posts}: { posts: Post[] } = $props();
</script>

{#if posts.length > 0}
    <aside>
        <h2>Você também pode gostar</h2>
        <section>
            {#each posts as post (post.slug.toString())}
                <PostCard {post}/>
            {/each}
        </section>
    </aside>
{/if}
