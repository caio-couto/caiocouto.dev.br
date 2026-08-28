<script lang="ts">
  import type {Post} from "../domain/entities/Post.js";
  import PostGrid from "./PostGrid.svelte";

  interface Props {
        posts: Post[];
    }

    const {posts}: Props = $props();
</script>

{#if posts.length > 0}
    <aside class="suggestions">
        <h2 class="suggestions__label">Você também pode gostar</h2>
        <PostGrid {posts}/>
    </aside>
{/if}

<style>
    .suggestions {
        margin-top: var(--space-20);
    }

    .suggestions__label {
        margin: 0 0 var(--space-5);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-normal);
        letter-spacing: var(--letter-spacing-wider);
        text-transform: uppercase;
        color: var(--color-accent);
    }
</style>
