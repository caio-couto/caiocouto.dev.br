<script lang="ts">
    const {currentPath = ""}: { currentPath?: string } = $props();
</script>

<header>
    <nav>
        <a href="/" class:active={currentPath === "/"}>Blog</a>
        <a href="/series" class:active={currentPath.startsWith("/series")}>Séries</a>
        <a href="/categories" class:active={currentPath.startsWith("/categories")}>Categorias</a>
    </nav>
</header>
