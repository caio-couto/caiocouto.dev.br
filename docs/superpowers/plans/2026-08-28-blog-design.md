# Blog Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar o design visual do blog conforme mockup criado no Claude Design.

**Architecture:** Paleta Gruvbox (escuro/claro), fonte JetBrains Mono, marcadores de canto `+` nos cards, toggle de tema via CSS custom properties + vanilla JS sem hidratação de framework.

**Tech Stack:** Astro 7, Svelte 5, CSS custom properties, JetBrains Mono (Google Fonts)

## Global Constraints

- Duplas aspas em todo código TS/JS/Svelte
- Zero `client:*` directives — zero JS de framework no cliente
- Toggle de tema via vanilla JS + `data-theme` no `<html>` + `localStorage`
- Paleta dark: `bg:#282828 bg1:#3c3836 bg2:#504945 fg:#ebdbb2 fg4:#a89984 accent:#fe8019 accent-hover:#fabd2f blue:#83a598 purple:#d3869b`
- Paleta light: `bg:#fbf1c7 bg1:#ebdbb2 bg2:#d5c4a1 fg:#3c3836 fg4:#7c6f64 accent:#af3a03 accent-hover:#9d3902 blue:#076678 purple:#8f3f71`
- Commit convencional em português após cada task

---

### Task 1: Sistema de Design — CSS Global + CornerBox

**Files:**
- Create: `src/styles/global.css`
- Create: `src/components/CornerBox.svelte`
- Modify: `src/layouts/BaseLayout.astro`

**Interfaces:**
- Produz: variáveis CSS `--bg`, `--bg1`, `--bg2`, `--fg`, `--fg4`, `--accent`, `--accent-hover`, `--blue`, `--purple` disponíveis globalmente
- Produz: componente `<CornerBox color?>` com `<slot>` para envolver qualquer caixa com marcadores `+`

- [ ] **Step 1: Criar `src/styles/global.css`**

```css
@import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap");

:root {
  --bg: #282828;
  --bg1: #3c3836;
  --bg2: #504945;
  --fg: #ebdbb2;
  --fg4: #a89984;
  --accent: #fe8019;
  --accent-hover: #fabd2f;
  --blue: #83a598;
  --purple: #d3869b;
}

[data-theme="light"] {
  --bg: #fbf1c7;
  --bg1: #ebdbb2;
  --bg2: #d5c4a1;
  --fg: #3c3836;
  --fg4: #7c6f64;
  --accent: #af3a03;
  --accent-hover: #9d3902;
  --blue: #076678;
  --purple: #8f3f71;
}

*, *::before, *::after { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
  line-height: 1.75;
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
}

a { color: var(--accent); }
a:hover { color: var(--accent-hover); }

pre { margin: 0; white-space: pre; font-family: "JetBrains Mono", ui-monospace, Menlo, monospace; }

::selection { background: var(--accent); color: var(--bg); }

img { display: block; max-width: 100%; }

ul { list-style: none; margin: 0; padding: 0; }
```

- [ ] **Step 2: Criar `src/components/CornerBox.svelte`**

```svelte
<script lang="ts">
  const {
    color = "var(--bg2)",
    tag = "div",
    class: className = "",
    style: extraStyle = "",
    ...rest
  }: {
    color?: string;
    tag?: string;
    class?: string;
    style?: string;
    [key: string]: unknown;
  } = $props();
</script>

<svelte:element
  this={tag}
  class={`corner-box ${className}`}
  style={`--corner-color:${color};${extraStyle}`}
  {...rest}
>
  <span class="corner tl">+</span>
  <span class="corner tr">+</span>
  <slot />
  <span class="corner bl">+</span>
  <span class="corner br">+</span>
</svelte:element>

<style>
  .corner-box {
    position: relative;
  }
  .corner {
    position: absolute;
    color: var(--corner-color, var(--bg2));
    font-size: 13px;
    line-height: 1;
    background: var(--bg);
    padding: 0 2px;
    z-index: 2;
    font-family: "JetBrains Mono", monospace;
  }
  .tl { top: -7px; left: -7px; }
  .tr { top: -7px; right: -7px; }
  .bl { bottom: -7px; left: -7px; }
  .br { bottom: -7px; right: -7px; }
</style>
```

- [ ] **Step 3: Atualizar `src/layouts/BaseLayout.astro`**

Adicionar import do CSS global, script de tema e remover a tag `<style>` local existente:

```astro
---
import "../styles/global.css";
import Header from "../components/Header.svelte";
import Footer from "../components/Footer.svelte";

interface Props {
  title: string;
  description?: string;
  ogImage?: string;
}

const {
  title,
  description = "Blog pessoal de Caio Couto",
  ogImage = "/og-default.png",
} = Astro.props;
---

<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content={ogImage} />
    <link rel="icon" href="/favicon.ico" />
    <script is:inline>
      (function () {
        var t = localStorage.getItem("theme") || "dark";
        document.documentElement.setAttribute("data-theme", t);
      })();
    </script>
  </head>
  <body>
    <Header />
    <main>
      <slot />
    </main>
    <Footer />
    <script is:inline>
      document.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-theme-toggle]");
        if (!btn) return;
        var cur = document.documentElement.getAttribute("data-theme") || "dark";
        var next = cur === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem("theme", next);
        document.querySelectorAll("[data-theme-label]").forEach(function (el) {
          el.textContent = next === "dark" ? "[ modo claro ]" : "[ modo escuro ]";
        });
      });
    </script>
  </body>
</html>
```

- [ ] **Step 4: Build e verificar sem erros**

```bash
pnpm build
```

Expected: build completo sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/styles/ src/components/CornerBox.svelte src/layouts/BaseLayout.astro
git commit -m "feat: adiciona sistema de design global e componente CornerBox"
```

---

### Task 2: Header e Footer

**Files:**
- Modify: `src/components/Header.svelte`
- Modify: `src/components/Footer.svelte`

**Interfaces:**
- Consome: variáveis CSS globais, atributo `data-theme` no `<html>`
- Produz: Header sticky com nav (Artigos, Séries, Sobre, RSS) + toggle de tema; Footer com copyright CC BY-SA 4.0

- [ ] **Step 1: Reescrever `src/components/Header.svelte`**

```svelte
<header>
  <a href="/" class="brand">Caio Couto</a>
  <nav>
    <a href="/">Artigos</a>
    <a href="/series">Séries</a>
    <a href="/sobre">Sobre</a>
    <a href="/rss.xml">RSS</a>
    <button data-theme-toggle aria-label="Alternar tema">
      <span data-theme-label>[ modo claro ]</span>
    </button>
  </nav>
</header>

<style>
  header {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 22px 40px;
    background: var(--bg1);
    border-bottom: 1px solid var(--bg2);
  }

  .brand {
    font-size: 17px;
    font-weight: 600;
    color: var(--fg);
    text-decoration: none;
    letter-spacing: 0.3px;
  }

  nav {
    display: flex;
    align-items: center;
    gap: 32px;
    font-size: 14px;
  }

  nav a {
    color: var(--fg);
    text-decoration: none;
  }
  nav a:hover { color: var(--accent); }

  button {
    margin-left: 12px;
    padding: 7px 12px;
    border: 1px solid var(--bg2);
    background: none;
    color: var(--fg);
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
    letter-spacing: 0.3px;
  }
  button:hover { border-color: var(--accent); color: var(--accent); }
</style>
```

- [ ] **Step 2: Reescrever `src/components/Footer.svelte`**

```svelte
<footer>
  <div>
    © {new Date().getFullYear()} Caio Couto ·
    <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>
  </div>
  <nav>
    <a href="https://github.com/caio-couto">github</a>
    <a href="/rss.xml">rss</a>
    <a href="mailto:cavalcantecaio.couto@gmail.com">email</a>
  </nav>
</footer>

<style>
  footer {
    border-top: 1px solid var(--bg2);
    background: var(--bg1);
    padding: 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    color: var(--fg4);
    font-size: 13px;
  }

  a { color: var(--fg4); text-decoration: none; }
  a:hover { color: var(--accent); }

  nav { display: flex; gap: 20px; }
</style>
```

- [ ] **Step 3: Build**

```bash
pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Header.svelte src/components/Footer.svelte
git commit -m "feat: redesenha Header e Footer com estilo Gruvbox"
```

---

### Task 3: PostCard e PostGrid

**Files:**
- Modify: `src/components/PostCard.svelte`
- Modify: `src/components/PostGrid.svelte`

**Interfaces:**
- Consome: `Post` (domain entity), `CornerBox.svelte`
- Produz: card de post com imagem, série, título, resumo, autor/data/tempo de leitura

- [ ] **Step 1: Reescrever `src/components/PostCard.svelte`**

```svelte
<script lang="ts">
  import type { Post } from "../domain/entities/Post.js";
  import CornerBox from "./CornerBox.svelte";

  const { post }: { post: Post } = $props();

  const cover = post.cover.toImageSource();
  const dateStr = post.publishedAt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
</script>

<CornerBox tag="a" href={`/posts/${post.slug}`} class="post-card">
  <img src={cover.src} alt={post.title} class="cover" />
  <div class="body">
    {#if post.seriesRef}
      <div class="series-label">
        {post.categories[0]?.name ?? ""}
      </div>
    {:else}
      <div class="series-label">
        {post.categories[0]?.name ?? ""}
      </div>
    {/if}
    <div class="title">{post.title}</div>
    <div class="summary">{post.summary}</div>
    <div class="meta">Caio Couto · {dateStr}</div>
  </div>
</CornerBox>

<style>
  :global(.post-card) {
    display: flex;
    flex-direction: column;
    background: var(--bg1);
    border: 1px solid var(--bg2);
    text-decoration: none;
    color: var(--fg);
  }
  :global(.post-card:hover) { border-color: var(--accent); }

  .cover {
    width: 100%;
    height: 180px;
    object-fit: cover;
    border-bottom: 1px solid var(--bg2);
  }

  .body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    flex: 1;
    gap: 10px;
  }

  .series-label {
    font-size: 11px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--accent);
  }

  .title {
    font-size: 18px;
    font-weight: 600;
    line-height: 1.3;
  }

  .summary {
    font-size: 14px;
    color: var(--fg4);
    line-height: 1.5;
    flex: 1;
  }

  .meta {
    font-size: 12px;
    color: var(--fg4);
  }
</style>
```

- [ ] **Step 2: Reescrever `src/components/PostGrid.svelte`**

```svelte
<script lang="ts">
  import type { Post } from "../domain/entities/Post.js";
  import PostCard from "./PostCard.svelte";

  const { posts }: { posts: Post[] } = $props();
</script>

<div class="grid">
  {#each posts as post (post.slug.toString())}
    <PostCard {post} />
  {/each}
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 24px;
  }
</style>
```

- [ ] **Step 3: Build**

```bash
pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/PostCard.svelte src/components/PostGrid.svelte
git commit -m "feat: redesenha PostCard e PostGrid"
```

---

### Task 4: SeriesCard, SeriesGrid e SeriesNav

**Files:**
- Modify: `src/components/SeriesCard.svelte`
- Modify: `src/components/SeriesGrid.svelte`
- Modify: `src/components/SeriesNav.svelte`

**Interfaces:**
- Consome: `Series` (domain entity), `Post` (domain entity), `CornerBox.svelte`
- Produz: card de série com capa, título, descrição, lista de episódios; nav de prev/next dentro de série

- [ ] **Step 1: Reescrever `src/components/SeriesCard.svelte`**

```svelte
<script lang="ts">
  import type { Series } from "../domain/entities/Series.js";
  import CornerBox from "./CornerBox.svelte";

  const { series }: { series: Series } = $props();
  const cover = series.cover.toImageSource();
</script>

<CornerBox tag="a" href={`/series/${series.slug}`} class="series-card" color="var(--accent)">
  <img src={cover.src} alt={series.title} class="cover" />
  <div class="body">
    <div class="title">{series.title}</div>
    <div class="description">{series.description}</div>
    <div class="episodes">
      {#each series.posts as post}
        <span>→ {post.title}</span>
      {/each}
    </div>
  </div>
</CornerBox>

<style>
  :global(.series-card) {
    display: flex;
    flex-direction: column;
    background: var(--bg1);
    border: 1px solid var(--accent);
    text-decoration: none;
    color: var(--fg);
    width: 320px;
    flex-shrink: 0;
  }

  .cover {
    width: 100%;
    height: 210px;
    object-fit: cover;
    object-position: top;
    background: #000;
    display: block;
  }

  .body { padding: 24px; }

  .title { font-size: 20px; font-weight: 700; margin-bottom: 10px; }

  .description { font-size: 14px; color: var(--fg4); line-height: 1.6; margin-bottom: 18px; }

  .episodes {
    border-top: 1px solid var(--bg2);
    padding-top: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 13px;
    color: var(--fg4);
  }
</style>
```

- [ ] **Step 2: Reescrever `src/components/SeriesGrid.svelte`**

```svelte
<script lang="ts">
  import type { Series } from "../domain/entities/Series.js";
  import SeriesCard from "./SeriesCard.svelte";

  const { seriesList }: { seriesList: Series[] } = $props();
</script>

<div class="carousel">
  {#each seriesList as series (series.slug.toString())}
    <SeriesCard {series} />
  {/each}
</div>

<style>
  .carousel {
    display: flex;
    gap: 24px;
    overflow-x: auto;
    padding: 12px 0;
    scrollbar-width: thin;
    scrollbar-color: var(--bg2) transparent;
  }
</style>
```

- [ ] **Step 3: Reescrever `src/components/SeriesNav.svelte`**

```svelte
<script lang="ts">
  import type { Post } from "../domain/entities/Post.js";
  import type { Series } from "../domain/entities/Series.js";

  const { series, currentPost }: { series: Series; currentPost: Post } = $props();

  const prev = series.previousPost(currentPost);
  const next = series.nextPost(currentPost);
</script>

<nav class="series-nav">
  <div class="label">
    Série: <a href={`/series/${series.slug}`}>{series.title}</a>
  </div>
  <div class="links">
    {#if prev}
      <a href={`/posts/${prev.slug}`} class="prev">← {prev.title}</a>
    {/if}
    {#if next}
      <a href={`/posts/${next.slug}`} class="next">{next.title} →</a>
    {/if}
  </div>
</nav>

<style>
  .series-nav {
    border-top: 1px solid var(--bg2);
    border-bottom: 1px solid var(--bg2);
    padding: 24px 0;
    margin: 48px 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .label { font-size: 13px; color: var(--fg4); }
  .label a { color: var(--blue); text-decoration: none; }
  .label a:hover { color: var(--accent); }

  .links {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    font-size: 14px;
  }

  a { text-decoration: none; }
  .prev { color: var(--blue); }
  .next { color: var(--blue); margin-left: auto; }
  a:hover { color: var(--accent); }
</style>
```

- [ ] **Step 4: Build**

```bash
pnpm build
```

- [ ] **Step 5: Commit**

```bash
git add src/components/SeriesCard.svelte src/components/SeriesGrid.svelte src/components/SeriesNav.svelte
git commit -m "feat: redesenha SeriesCard, SeriesGrid e SeriesNav"
```

---

### Task 5: SuggestionsGrid e Pagination

**Files:**
- Modify: `src/components/SuggestionsGrid.svelte`
- Modify: `src/components/Pagination.svelte`

- [ ] **Step 1: Reescrever `src/components/SuggestionsGrid.svelte`**

```svelte
<script lang="ts">
  import type { Post } from "../domain/entities/Post.js";
  import PostGrid from "./PostGrid.svelte";

  const { posts }: { posts: Post[] } = $props();
</script>

{#if posts.length > 0}
  <section class="suggestions">
    <div class="label">Você também pode gostar</div>
    <PostGrid {posts} />
  </section>
{/if}

<style>
  .suggestions { margin-top: 80px; }
  .label {
    font-size: 13px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 20px;
  }
</style>
```

- [ ] **Step 2: Reescrever `src/components/Pagination.svelte`**

```svelte
<script lang="ts">
  import type { PaginatedResult } from "../domain/value-objects/PaginatedResult.js";

  const {
    result,
    baseUrl,
  }: { result: PaginatedResult<unknown>; baseUrl: string } = $props();

  const prevUrl = result.hasPreviousPage() ? `${baseUrl}/${result.currentPage - 1}` : null;
  const nextUrl = result.hasNextPage() ? `${baseUrl}/${result.currentPage + 1}` : null;
</script>

<nav class="pagination" aria-label="Paginação">
  {#if prevUrl}
    <a href={prevUrl} rel="prev">← anterior</a>
  {:else}
    <span class="disabled">← anterior</span>
  {/if}
  <span class="info">{result.currentPage} / {result.totalPages}</span>
  {#if nextUrl}
    <a href={nextUrl} rel="next">próxima →</a>
  {:else}
    <span class="disabled">próxima →</span>
  {/if}
</nav>

<style>
  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 32px;
    padding: 48px 0;
    font-size: 14px;
  }

  a { color: var(--accent); text-decoration: none; }
  a:hover { color: var(--accent-hover); }

  .disabled { color: var(--bg2); cursor: default; }
  .info { color: var(--fg4); }
</style>
```

- [ ] **Step 3: Build**

```bash
pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/SuggestionsGrid.svelte src/components/Pagination.svelte
git commit -m "feat: redesenha SuggestionsGrid e Pagination"
```

---

### Task 6: PostLayout — layout do artigo

**Files:**
- Modify: `src/layouts/PostLayout.astro`

**Interfaces:**
- Consome: `Post`, `Series?`, `Post[]` (sugestões)
- Produz: layout com capa, metadados, conteúdo do post com estilos de tipografia (prose), SeriesNav e SuggestionsGrid

- [ ] **Step 1: Reescrever `src/layouts/PostLayout.astro`**

```astro
---
import BaseLayout from "./BaseLayout.astro";
import type { Post } from "../domain/entities/Post.js";
import type { Series } from "../domain/entities/Series.js";
import SuggestionsGrid from "../components/SuggestionsGrid.svelte";
import SeriesNav from "../components/SeriesNav.svelte";

interface Props {
  post: Post;
  suggestions: Post[];
  series?: Series;
}

const { post, suggestions, series } = Astro.props;
const cover = post.cover.toImageSource();
const dateStr = post.publishedAt.toLocaleDateString("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});
---

<BaseLayout title={post.title} description={post.summary} ogImage={cover.src}>
  <div class="post-wrap">
    <div class="cover-wrap">
      <img src={cover.src} alt={post.title} class="cover" width={cover.width} height={cover.height} />
    </div>

    <h1 class="post-title">
      <span class="prefix"># </span>{post.title}
    </h1>

    <div class="meta">
      <span>{dateStr}</span>
      <span>·</span>
      {post.categories.map((cat) => (
        <a href={`/categories/${cat.slug}`}>{cat.name}</a>
      ))}
      {series && (
        <>
          <span>·</span>
          <a href={`/series/${series.slug}`} class="series-link">série: {series.slug}</a>
        </>
      )}
    </div>

    <div class="prose">
      <slot />
    </div>

    {series && post.seriesRef && (
      <SeriesNav series={series} currentPost={post} />
    )}

    <SuggestionsGrid posts={suggestions} />
  </div>
</BaseLayout>

<style>
  .post-wrap {
    max-width: 720px;
    margin: 0 auto;
    padding: 64px 40px 120px;
  }

  .cover-wrap {
    position: relative;
    background: #000;
    border: 1px solid var(--bg2);
    padding: 20px;
    display: flex;
    justify-content: center;
    margin-bottom: 40px;
  }

  .cover {
    width: 100%;
    max-width: 360px;
    height: auto;
  }

  .post-title {
    font-size: 34px;
    font-weight: 700;
    margin: 0 0 6px;
    line-height: 1.25;
    color: var(--fg);
  }

  .prefix { color: var(--accent); }

  .meta {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
    color: var(--fg4);
    font-size: 13px;
    margin-bottom: 44px;
  }

  .meta a { color: var(--blue); text-decoration: none; }
  .meta a:hover { color: var(--accent); }

  .series-link { color: var(--blue); }

  /* Prose styles */
  .prose :global(p) { margin: 0 0 24px; }

  .prose :global(h2) {
    font-size: 24px;
    font-weight: 600;
    margin: 56px 0 20px;
    color: var(--fg);
  }
  .prose :global(h2::before) { content: "## "; color: var(--accent); }

  .prose :global(h3) {
    font-size: 19px;
    font-weight: 600;
    margin: 40px 0 16px;
    color: var(--fg);
  }
  .prose :global(h3::before) { content: "### "; color: var(--accent); }

  .prose :global(code) {
    background: var(--bg1);
    color: var(--accent);
    padding: 2px 6px;
    font-size: 0.92em;
    font-family: "JetBrains Mono", monospace;
  }

  .prose :global(pre) {
    background: var(--bg1);
    border: 1px solid var(--bg2);
    padding: 16px 20px;
    margin: 0 0 26px;
    overflow-x: auto;
    font-size: 13.5px;
    line-height: 1.6;
  }

  .prose :global(pre code) {
    background: none;
    color: var(--fg);
    padding: 0;
    font-size: inherit;
  }

  .prose :global(strong) { color: var(--fg); }

  .prose :global(a) { color: var(--blue); }
  .prose :global(a:hover) { color: var(--accent); }

  .prose :global(hr) {
    border: none;
    border-top: 1px solid var(--bg2);
    margin: 48px 0;
  }
</style>
```

- [ ] **Step 2: Build**

```bash
pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add src/layouts/PostLayout.astro
git commit -m "feat: redesenha PostLayout com tipografia Gruvbox"
```

---

### Task 7: Home Page — Hero + Séries + Artigos

**Files:**
- Modify: `src/pages/page/[page].astro`

**Interfaces:**
- Consome: `AstroPostRepository.paginate()`, `AstroSeriesRepository.findAll()`
- Produz: página home com hero (texto + CTA + widget RSS), seção de séries (carousel), seção de artigos recentes (grid)

- [ ] **Step 1: Reescrever `src/pages/page/[page].astro`**

O `getStaticPaths` permanece igual. O template muda para incluir o hero apenas na página 1:

```astro
---
import BaseLayout from "../../layouts/BaseLayout.astro";
import PostGrid from "../../components/PostGrid.svelte";
import SeriesGrid from "../../components/SeriesGrid.svelte";
import Pagination from "../../components/Pagination.svelte";
import { AstroPostRepository } from "../../infrastructure/repositories/AstroPostRepository.js";
import { AstroSeriesRepository } from "../../infrastructure/repositories/AstroSeriesRepository.js";

export async function getStaticPaths() {
  const postRepo = new AstroPostRepository();
  const pageSize = 9;
  const allPosts = await postRepo.findAll();
  const totalPages = Math.max(1, Math.ceil(allPosts.length / pageSize));

  return Array.from({ length: totalPages }, (_, i) => ({
    params: { page: String(i + 1) },
    props: { pageNumber: i + 1, pageSize },
  }));
}

const { pageNumber, pageSize } = Astro.props;
const isFirstPage = pageNumber === 1;

const postRepo = new AstroPostRepository();
const seriesRepo = new AstroSeriesRepository();

const [paginatedPosts, allSeries] = await Promise.all([
  postRepo.paginate(pageNumber, pageSize),
  isFirstPage ? seriesRepo.findAll() : Promise.resolve([]),
]);
---

<BaseLayout title="Blog — Caio Couto">
  {isFirstPage && (
    <section class="hero">
      <div class="hero-text">
        <div class="byline">por <strong>Caio Couto</strong></div>
        <h1 class="hero-title">
          Não é sobre usar<br />a ferramenta.<br />É sobre entender.
        </h1>
        <p class="hero-desc">
          Sou desenvolvedor e escrevo sobre o que acontece por baixo do código que uso
          todos os dias — redes, sistemas operacionais, linguagens e as decisões de
          engenharia que raramente aparecem no manual.
        </p>
        <div class="hero-cta">
          <a href="#articles" class="btn-primary">Ver artigos</a>
          <a href="/sobre" class="btn-secondary">Sobre mim</a>
        </div>
      </div>
    </section>
  )}

  {isFirstPage && allSeries.length > 0 && (
    <section class="section">
      <div class="section-wrap">
        <div class="section-label">Séries</div>
        <SeriesGrid seriesList={allSeries} />
      </div>
    </section>
  )}

  <section class="section" id="articles">
    <div class="section-wrap">
      <div class="section-label">Artigos recentes</div>
      <PostGrid posts={paginatedPosts.items} />
      <Pagination result={paginatedPosts} baseUrl="/page" />
    </div>
  </section>
</BaseLayout>

<style>
  .hero {
    max-width: 1120px;
    margin: 0 auto;
    padding: 72px 40px 64px;
  }

  .byline {
    font-size: 13px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--fg4);
    margin-bottom: 20px;
  }
  .byline strong { color: var(--fg); }

  .hero-title {
    font-size: 52px;
    font-weight: 700;
    line-height: 1.08;
    margin: 0 0 24px;
    letter-spacing: -0.5px;
  }

  .hero-desc {
    font-size: 16px;
    color: var(--fg4);
    line-height: 1.7;
    margin: 0 0 36px;
    max-width: 440px;
  }

  .hero-cta { display: flex; gap: 14px; }

  .btn-primary,
  .btn-secondary {
    position: relative;
    padding: 12px 22px;
    text-decoration: none;
    font-size: 14px;
    font-weight: 600;
  }

  .btn-primary {
    border: 1px solid var(--accent);
    color: var(--accent);
  }
  .btn-primary:hover { background: var(--accent); color: var(--bg); }

  .btn-secondary {
    border: 1px solid var(--bg2);
    color: var(--fg);
  }
  .btn-secondary:hover { border-color: var(--fg); }

  .section { padding: 0 0 48px; }

  .section-wrap {
    max-width: 760px;
    margin: 0 auto;
    padding: 0 40px;
  }

  .section-label {
    font-size: 13px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 20px;
  }
</style>
```

- [ ] **Step 2: Build**

```bash
pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/page/
git commit -m "feat: redesenha home com hero, séries e artigos recentes"
```

---

### Task 8: Página de Série e Página de Categoria

**Files:**
- Modify: `src/pages/series/[slug].astro`
- Modify: `src/pages/categories/[slug].astro`

- [ ] **Step 1: Atualizar `src/pages/series/[slug].astro`** — adicionar estilos da página de série (capa, título, descrição, grid de episódios)

- [ ] **Step 2: Atualizar `src/pages/categories/[slug].astro`** — adicionar label e grid estilizado

- [ ] **Step 3: Build**

```bash
pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/series/ src/pages/categories/
git commit -m "feat: estiliza páginas de série e categoria"
```

---

### Task 9: Merge na main

- [ ] **Step 1: Garantir build limpo e testes passando**

```bash
pnpm test && pnpm build
```

- [ ] **Step 2: Merge na main**

```bash
git checkout main
git merge --no-ff feat/design -m "feat: implementa design visual Gruvbox/JetBrains Mono"
```

- [ ] **Step 3: Deletar branch**

```bash
git branch -d feat/design
```
