<script lang="ts">
    import type {Post} from "../domain/entities/Post.js";

    const {post}: { post: Post } = $props();
</script>

<article>
    <a href={`/posts/${post.slug}`}>
        <img src={post.cover.toImageSource().src} alt={post.title}/>
        <div>
            <ul>
                {#each post.categories as category}
                    <li><a href={`/categories/${category.slug}`}>{category.name}</a></li>
                {/each}
            </ul>
            <h2>{post.title}</h2>
            <p>{post.summary}</p>
            <time datetime={post.publishedAt.toISOString()}>
                {post.publishedAt.toLocaleDateString("pt-BR")}
            </time>
        </div>
    </a>
</article>
