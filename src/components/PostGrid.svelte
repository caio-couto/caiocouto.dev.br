<script lang="ts">
    import type {Post} from "../domain/entities/Post.js";
    import PostCard from "./PostCard.svelte";

    const {posts}: { posts: Post[] } = $props();
</script>

<section>
    {#each posts as post (post.slug.toString())}
        <PostCard {post}/>
    {/each}
</section>
 