# Blog Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar o design visual do blog conforme mockup criado no Claude Design.

**Architecture:** Paleta Gruvbox (escuro/claro), fonte JetBrains Mono, marcadores de canto `+` nos cards, toggle de tema via CSS custom properties + vanilla JS sem hidratação de framework.

**Tech Stack:** Astro 7, Svelte 5, CSS custom properties (tokens), BEM, JetBrains Mono (Google Fonts)

## Global Constraints

- Duplas aspas em todo código TS/JS/Svelte
- Zero `client:*` directives — zero JS de framework no cliente
- Toggle de tema via vanilla JS + `data-theme` no `<html>` + `localStorage`
- **BEM** em todos os seletores CSS: `.block__element--modifier`
- **Tokens CSS** para cores, espaçamentos e tipografia — nunca valores literais no CSS dos componentes
- Scoped `<style>` em todo `.svelte` e `.astro` — sem CSS global de componente
- Estilos globais apenas em `src/styles/` — nunca em layouts ou páginas
- Paleta dark: `bg:#282828 surface:#3c3836 border:#504945 text:#ebdbb2 text-muted:#a89984 accent:#fe8019 accent-hover:#fabd2f link:#83a598 tag:#d3869b`
- Paleta light: `bg:#fbf1c7 surface:#ebdbb2 border:#d5c4a1 text:#3c3836 text-muted:#7c6f64 accent:#af3a03 accent-hover:#9d3902 link:#076678 tag:#8f3f71`
- Commit convencional em português após cada task

---

### Task 1: Tokens CSS e CSS Global

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Modify: `src/layouts/BaseLayout.astro`

**Interfaces:**
- Produz: variáveis CSS completas (cores, espaçamentos, tipografia) disponíveis globalmente via `data-theme` no `<html>`

- [ ] **Step 1: Criar `src/styles/tokens.css`**

```css
/* ============================================================
   TOKENS — cores, espaçamento, tipografia
   Nunca use valores literais nos componentes; use tokens.
   ============================================================ */

/* Tipografia */
:root {
  --font-family-mono: "JetBrains Mono", ui-monospace, Menlo, monospace;

  --font-size-2xs:  11px;
  --font-size-xs:   12px;
  --font-size-sm:   13px;
  --font-size-base: 16px;
  --font-size-md:   18px;
  --font-size-lg:   20px;
  --font-size-xl:   24px;
  --font-size-2xl:  34px;
  --font-size-3xl:  38px;
  --font-size-4xl:  52px;

  --font-weight-normal:   400;
  --font-weight-medium:   500;
  --font-weight-semibold: 600;
  --font-weight-bold:     700;

  --line-height-tight:   1.08;
  --line-height-snug:    1.25;
  --line-height-normal:  1.6;
  --line-height-relaxed: 1.75;

  --letter-spacing-tight:  -0.5px;
  --letter-spacing-normal:  0.3px;
  --letter-spacing-wide:    1px;
  --letter-spacing-wider:   1.5px;

  /* Espaçamento (base 4px) */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-14: 56px;
  --space-16: 64px;
  --space-18: 72px;
  --space-20: 80px;
  --space-24: 96px;
  --space-30: 120px;

  /* Layout */
  --layout-content-max:  720px;
  --layout-wide-max:    1120px;
  --layout-page-pad:    var(--space-10);

  /* Bordas */
  --border-width: 1px;
  --border-radius: 0;
  --corner-offset: -7px;
  --corner-size: var(--font-size-sm);
}

/* Cores — tema escuro (padrão) */
:root,
[data-theme="dark"] {
  --color-bg:           #282828;
  --color-surface:      #3c3836;
  --color-border:       #504945;
  --color-text:         #ebdbb2;
  --color-text-muted:   #a89984;
  --color-accent:       #fe8019;
  --color-accent-hover: #fabd2f;
  --color-link:         #83a598;
  --color-tag:          #d3869b;
}

/* Cores — tema claro */
[data-theme="light"] {
  --color-bg:           #fbf1c7;
  --color-surface:      #ebdbb2;
  --color-border:       #d5c4a1;
  --color-text:         #3c3836;
  --color-text-muted:   #7c6f64;
  --color-accent:       #af3a03;
  --color-accent-hover: #9d3902;
  --color-link:         #076678;
  --color-tag:          #8f3f71;
}
```

- [ ] **Step 2: Criar `src/styles/global.css`**

```css
@import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap");
@import "./tokens.css";

*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-family-mono);
  font-size: var(--font-size-base);
  line-height: var(--line-height-relaxed);
  -webkit-font-smoothing: antialiased;
}

a {
  color: var(--color-accent);
  text-decoration: none;
}

a:hover {
  color: var(--color-accent-hover);
}

img {
  display: block;
  max-width: 100%;
}

ul,
ol {
  list-style: none;
  margin: 0;
  padding: 0;
}

pre {
  margin: 0;
  font-family: var(--font-family-mono);
  white-space: pre;
}

::selection {
  background-color: var(--color-accent);
  color: var(--color-bg);
}
```

- [ ] **Step 3: Atualizar `src/layouts/BaseLayout.astro`**

Remover `currentPath` do props (não mais necessário), adicionar imports de CSS e scripts de tema:

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
    <!-- Lê tema do localStorage antes de renderizar — evita flash -->
    <script is:inline>
      (function () {
        var t = localStorage.getItem("theme") || "dark";
        document.documentElement.setAttribute("data-theme", t);
      })();
    </script>
  </head>
  <body>
    <Header />
    <main class="layout__main">
      <slot />
    </main>
    <Footer />
    <!-- Toggle de tema — vanilla JS, zero framework -->
    <script is:inline>
      document.addEventListener("click", function (e) {
        if (!e.target.closest("[data-theme-toggle]")) return;
        var cur = document.documentElement.getAttribute("data-theme") || "dark";
        var next = cur === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem("theme", next);
        document.querySelectorAll("[data-theme-label]").forEach(function (el) {
          el.textContent =
            next === "dark" ? "[ modo claro ]" : "[ modo escuro ]";
        });
      });
    </script>
  </body>
</html>

<style>
  .layout__main {
    min-height: calc(100vh - 140px);
  }
</style>
```

- [ ] **Step 4: Build e verificar sem erros**

```bash
pnpm build
```

Expected: build sem erros, 6 páginas geradas.

- [ ] **Step 5: Commit**

```bash
git add src/styles/ src/layouts/BaseLayout.astro
git commit -m "feat: adiciona tokens CSS e estilos globais"
```

---

### Task 2: Componente CornerBox

**Files:**
- Create: `src/components/CornerBox.svelte`

**Interfaces:**
- Produz: `<CornerBox color? tag? class? style? ...attrs>` — wrapper com marcadores `+` nos 4 cantos, usa `<slot>`

**Boas práticas:**
- `<svelte:element>` para tag dinâmica
- BEM interno: `.corner-box`, `.corner-box__marker`, `.corner-box__marker--tl` etc.
- Tokens CSS para posição e tamanho dos marcadores

- [ ] **Step 1: Criar `src/components/CornerBox.svelte`**

```svelte
<script lang="ts">
  import type { Snippet } from "svelte";

  const {
    color = "var(--color-border)",
    tag = "div",
    class: className = "",
    style: inlineStyle = "",
    children,
    ...attrs
  }: {
    color?: string;
    tag?: string;
    class?: string;
    style?: string;
    children?: Snippet;
    [key: string]: unknown;
  } = $props();
</script>

<svelte:element
  this={tag}
  class={`corner-box ${className}`}
  style={`--_corner-color:${color};${inlineStyle}`}
  {...attrs}
>
  <span class="corner-box__marker corner-box__marker--tl" aria-hidden="true">+</span>
  <span class="corner-box__marker corner-box__marker--tr" aria-hidden="true">+</span>
  {@render children?.()}
  <span class="corner-box__marker corner-box__marker--bl" aria-hidden="true">+</span>
  <span class="corner-box__marker corner-box__marker--br" aria-hidden="true">+</span>
</svelte:element>

<style>
  .corner-box {
    position: relative;
  }

  .corner-box__marker {
    position: absolute;
    color: var(--_corner-color);
    font-size: var(--corner-size);
    line-height: 1;
    background-color: var(--color-bg);
    padding: 0 var(--space-1);
    z-index: 2;
    font-family: var(--font-family-mono);
    pointer-events: none;
    user-select: none;
  }

  .corner-box__marker--tl { top: var(--corner-offset); left: var(--corner-offset); }
  .corner-box__marker--tr { top: var(--corner-offset); right: var(--corner-offset); }
  .corner-box__marker--bl { bottom: var(--corner-offset); left: var(--corner-offset); }
  .corner-box__marker--br { bottom: var(--corner-offset); right: var(--corner-offset); }
</style>
```

- [ ] **Step 2: Build**

```bash
pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/CornerBox.svelte
git commit -m "feat: adiciona componente CornerBox com marcadores de canto"
```

---

### Task 3: Header e Footer

**Files:**
- Modify: `src/components/Header.svelte`
- Modify: `src/components/Footer.svelte`

**Boas práticas Svelte:**
- Scoped `<style>` — sem `:global()` desnecessário
- BEM: `.header`, `.header__brand`, `.header__nav`, `.header__toggle`
- Tokens para todos os valores de cor, espaçamento e tipografia

- [ ] **Step 1: Reescrever `src/components/Header.svelte`**

```svelte
<header class="header">
  <a href="/" class="header__brand">Caio Couto</a>
  <nav class="header__nav">
    <a href="/" class="header__nav-link">Artigos</a>
    <a href="/series" class="header__nav-link">Séries</a>
    <a href="/sobre" class="header__nav-link">Sobre</a>
    <a href="/rss.xml" class="header__nav-link">RSS</a>
    <button class="header__toggle" data-theme-toggle aria-label="Alternar tema">
      <span data-theme-label>[ modo claro ]</span>
    </button>
  </nav>
</header>

<style>
  .header {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-5) var(--space-10);
    background-color: var(--color-surface);
    border-bottom: var(--border-width) solid var(--color-border);
  }

  .header__brand {
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
    text-decoration: none;
    letter-spacing: var(--letter-spacing-normal);
  }

  .header__brand:hover {
    color: var(--color-accent);
  }

  .header__nav {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    font-size: var(--font-size-sm);
  }

  .header__nav-link {
    color: var(--color-text);
    text-decoration: none;
  }

  .header__nav-link:hover {
    color: var(--color-accent);
  }

  .header__toggle {
    margin-left: var(--space-3);
    padding: var(--space-2) var(--space-3);
    border: var(--border-width) solid var(--color-border);
    background: none;
    color: var(--color-text);
    font-size: var(--font-size-xs);
    font-family: var(--font-family-mono);
    cursor: pointer;
    letter-spacing: var(--letter-spacing-normal);
  }

  .header__toggle:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
</style>
```

- [ ] **Step 2: Reescrever `src/components/Footer.svelte`**

```svelte
<footer class="footer">
  <p class="footer__copy">
    © {new Date().getFullYear()} Caio Couto ·
    <a
      href="https://creativecommons.org/licenses/by-sa/4.0/"
      class="footer__link"
    >CC BY-SA 4.0</a>
  </p>
  <nav class="footer__nav">
    <a href="https://github.com/caio-couto" class="footer__link">github</a>
    <a href="/rss.xml" class="footer__link">rss</a>
    <a href="mailto:cavalcantecaio.couto@gmail.com" class="footer__link">email</a>
  </nav>
</footer>

<style>
  .footer {
    border-top: var(--border-width) solid var(--color-border);
    background-color: var(--color-surface);
    padding: var(--space-10);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-4);
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }

  .footer__copy {
    margin: 0;
  }

  .footer__nav {
    display: flex;
    gap: var(--space-5);
  }

  .footer__link {
    color: var(--color-text-muted);
    text-decoration: none;
  }

  .footer__link:hover {
    color: var(--color-accent);
  }
</style>
```

- [ ] **Step 3: Build**

```bash
pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Header.svelte src/components/Footer.svelte
git commit -m "feat: redesenha Header e Footer com BEM e tokens CSS"
```

---

### Task 4: PostCard e PostGrid

**Files:**
- Modify: `src/components/PostCard.svelte`
- Modify: `src/components/PostGrid.svelte`

**Boas práticas:**
- `PostCard` usa `CornerBox` como wrapper e passa `tag="a"` (link semântico)
- BEM: `.post-card`, `.post-card__cover`, `.post-card__body`, `.post-card__category`, `.post-card__title`, `.post-card__summary`, `.post-card__meta`
- `:global(.post-card)` não deve existir — o BEM é definido dentro do CornerBox via `class` prop e os estilos ficam no PostCard com `:global` mínimo

**Nota sobre `:global` com CornerBox:** Como o `<svelte:element>` do CornerBox recebe a classe via prop, o Svelte não consegue escopar o seletor automaticamente. A solução é usar `:global(.post-card)` apenas no PostCard para estilizar o bloco raiz, e usar seletores normais para os elementos filhos (que estão no escopo do PostCard).

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
  const category = post.categories[0];
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
    border: var(--border-width) solid var(--color-border);
    text-decoration: none;
    color: var(--color-text);
    transition: border-color 0.15s ease;
  }

  :global(.post-card:hover) {
    border-color: var(--color-accent);
  }

  .post-card__cover {
    width: 100%;
    height: 180px;
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
```

- [ ] **Step 2: Reescrever `src/components/PostGrid.svelte`**

```svelte
<script lang="ts">
  import type { Post } from "../domain/entities/Post.js";
  import PostCard from "./PostCard.svelte";

  const { posts }: { posts: Post[] } = $props();
</script>

<ul class="post-grid">
  {#each posts as post (post.slug.toString())}
    <li class="post-grid__item">
      <PostCard {post} />
    </li>
  {/each}
</ul>

<style>
  .post-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: var(--space-6);
  }

  .post-grid__item {
    display: flex;
  }

  .post-grid__item :global(.post-card) {
    width: 100%;
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
git commit -m "feat: redesenha PostCard e PostGrid com BEM e tokens"
```

---

### Task 5: SeriesCard, SeriesGrid e SeriesNav

**Files:**
- Modify: `src/components/SeriesCard.svelte`
- Modify: `src/components/SeriesGrid.svelte`
- Modify: `src/components/SeriesNav.svelte`

**BEM:**
- `.series-card`, `.series-card__cover`, `.series-card__body`, `.series-card__title`, `.series-card__description`, `.series-card__episodes`, `.series-card__episode`
- `.series-grid`, `.series-grid__item`
- `.series-nav`, `.series-nav__label`, `.series-nav__links`, `.series-nav__link`, `.series-nav__link--prev`, `.series-nav__link--next`

- [ ] **Step 1: Reescrever `src/components/SeriesCard.svelte`**

```svelte
<script lang="ts">
  import type { Series } from "../domain/entities/Series.js";
  import CornerBox from "./CornerBox.svelte";

  const { series }: { series: Series } = $props();
  const cover = series.cover.toImageSource();
</script>

<CornerBox
  tag="a"
  href={`/series/${series.slug}`}
  class="series-card"
  color="var(--color-accent)"
>
  <img
    src={cover.src}
    alt={series.title}
    width={cover.width}
    height={cover.height}
    class="series-card__cover"
  />
  <div class="series-card__body">
    <h2 class="series-card__title">{series.title}</h2>
    <p class="series-card__description">{series.description}</p>
    {#if series.posts.length > 0}
      <ul class="series-card__episodes">
        {#each series.posts as post}
          <li class="series-card__episode">
            <span class="series-card__episode-arrow">→</span>
            {post.title}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</CornerBox>

<style>
  :global(.series-card) {
    display: flex;
    flex-direction: column;
    background-color: var(--color-surface);
    border: var(--border-width) solid var(--color-accent);
    text-decoration: none;
    color: var(--color-text);
    width: 320px;
    flex-shrink: 0;
    transition: opacity 0.15s ease;
  }

  :global(.series-card:hover) {
    opacity: 0.85;
  }

  .series-card__cover {
    width: 100%;
    height: 210px;
    object-fit: cover;
    object-position: top;
    background-color: #000;
    display: block;
  }

  .series-card__body {
    padding: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .series-card__title {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
  }

  .series-card__description {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    line-height: var(--line-height-normal);
  }

  .series-card__episodes {
    border-top: var(--border-width) solid var(--color-border);
    padding-top: var(--space-3);
    margin-top: var(--space-2);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .series-card__episode {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
  }

  .series-card__episode-arrow {
    color: var(--color-accent);
    flex-shrink: 0;
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

<ul class="series-grid">
  {#each seriesList as series (series.slug.toString())}
    <li class="series-grid__item">
      <SeriesCard {series} />
    </li>
  {/each}
</ul>

<style>
  .series-grid {
    display: flex;
    gap: var(--space-6);
    overflow-x: auto;
    padding: var(--space-3) 0;
    scrollbar-width: thin;
    scrollbar-color: var(--color-border) transparent;
  }

  .series-grid__item {
    display: flex;
    flex-shrink: 0;
  }
</style>
```

- [ ] **Step 3: Reescrever `src/components/SeriesNav.svelte`**

```svelte
<script lang="ts">
  import type { Post } from "../domain/entities/Post.js";
  import type { Series } from "../domain/entities/Series.js";

  const {
    series,
    currentPost,
  }: { series: Series; currentPost: Post } = $props();

  const prev = series.previousPost(currentPost);
  const next = series.nextPost(currentPost);
</script>

<nav class="series-nav" aria-label="Navegação da série">
  <p class="series-nav__label">
    Série: <a href={`/series/${series.slug}`} class="series-nav__series-link">{series.title}</a>
  </p>
  <div class="series-nav__links">
    {#if prev}
      <a href={`/posts/${prev.slug}`} class="series-nav__link series-nav__link--prev" rel="prev">
        ← {prev.title}
      </a>
    {:else}
      <span></span>
    {/if}
    {#if next}
      <a href={`/posts/${next.slug}`} class="series-nav__link series-nav__link--next" rel="next">
        {next.title} →
      </a>
    {/if}
  </div>
</nav>

<style>
  .series-nav {
    border-top: var(--border-width) solid var(--color-border);
    border-bottom: var(--border-width) solid var(--color-border);
    padding: var(--space-6) 0;
    margin: var(--space-12) 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .series-nav__label {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .series-nav__series-link {
    color: var(--color-link);
    text-decoration: none;
  }

  .series-nav__series-link:hover {
    color: var(--color-accent);
  }

  .series-nav__links {
    display: flex;
    justify-content: space-between;
    gap: var(--space-4);
    font-size: var(--font-size-sm);
  }

  .series-nav__link {
    color: var(--color-link);
    text-decoration: none;
  }

  .series-nav__link:hover {
    color: var(--color-accent);
  }

  .series-nav__link--next {
    margin-left: auto;
  }
</style>
```

- [ ] **Step 4: Build**

```bash
pnpm build
```

- [ ] **Step 5: Commit**

```bash
git add src/components/SeriesCard.svelte src/components/SeriesGrid.svelte src/components/SeriesNav.svelte
git commit -m "feat: redesenha SeriesCard, SeriesGrid e SeriesNav com BEM e tokens"
```

---

### Task 6: SuggestionsGrid e Pagination

**Files:**
- Modify: `src/components/SuggestionsGrid.svelte`
- Modify: `src/components/Pagination.svelte`

**BEM:**
- `.suggestions`, `.suggestions__label`, `.suggestions__grid`
- `.pagination`, `.pagination__link`, `.pagination__link--disabled`, `.pagination__info`

- [ ] **Step 1: Reescrever `src/components/SuggestionsGrid.svelte`**

```svelte
<script lang="ts">
  import type { Post } from "../domain/entities/Post.js";
  import PostGrid from "./PostGrid.svelte";

  const { posts }: { posts: Post[] } = $props();
</script>

{#if posts.length > 0}
  <aside class="suggestions">
    <h2 class="suggestions__label">Você também pode gostar</h2>
    <PostGrid {posts} />
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
```

- [ ] **Step 2: Reescrever `src/components/Pagination.svelte`**

```svelte
<script lang="ts">
  import type { PaginatedResult } from "../domain/value-objects/PaginatedResult.js";

  const {
    result,
    baseUrl,
  }: { result: PaginatedResult<unknown>; baseUrl: string } = $props();

  const prevUrl = result.hasPreviousPage()
    ? `${baseUrl}/${result.currentPage - 1}`
    : null;
  const nextUrl = result.hasNextPage()
    ? `${baseUrl}/${result.currentPage + 1}`
    : null;
</script>

<nav class="pagination" aria-label="Paginação">
  {#if prevUrl}
    <a href={prevUrl} class="pagination__link" rel="prev">← anterior</a>
  {:else}
    <span class="pagination__link pagination__link--disabled">← anterior</span>
  {/if}

  <span class="pagination__info">{result.currentPage} / {result.totalPages}</span>

  {#if nextUrl}
    <a href={nextUrl} class="pagination__link" rel="next">próxima →</a>
  {:else}
    <span class="pagination__link pagination__link--disabled">próxima →</span>
  {/if}
</nav>

<style>
  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-8);
    padding: var(--space-12) 0;
    font-size: var(--font-size-sm);
  }

  .pagination__link {
    color: var(--color-accent);
    text-decoration: none;
  }

  .pagination__link:hover {
    color: var(--color-accent-hover);
  }

  .pagination__link--disabled {
    color: var(--color-border);
    cursor: default;
  }

  .pagination__info {
    color: var(--color-text-muted);
  }
</style>
```

- [ ] **Step 3: Build**

```bash
pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/SuggestionsGrid.svelte src/components/Pagination.svelte
git commit -m "feat: redesenha SuggestionsGrid e Pagination com BEM e tokens"
```

---

### Task 7: PostLayout

**Files:**
- Modify: `src/layouts/PostLayout.astro`

**Boas práticas Astro:**
- Estilos de `prose` (tipografia do corpo do post) ficam no PostLayout via `<style>` scoped — o Astro não escopa filhos de `<slot>`, então usa-se `:global` dentro do bloco `.post__prose`
- BEM: `.post`, `.post__cover-wrap`, `.post__cover`, `.post__title`, `.post__prefix`, `.post__meta`, `.post__prose`

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
  <article class="post">
    <div class="post__cover-wrap">
      <img
        src={cover.src}
        alt={post.title}
        width={cover.width}
        height={cover.height}
        class="post__cover"
      />
    </div>

    <h1 class="post__title">
      <span class="post__prefix" aria-hidden="true"># </span>{post.title}
    </h1>

    <div class="post__meta">
      <time datetime={post.publishedAt.toISOString()}>{dateStr}</time>
      <span class="post__meta-separator">·</span>
      {post.categories.map((cat) => (
        <a href={`/categories/${cat.slug}`} class="post__meta-category">{cat.name}</a>
      ))}
      {series && (
        <>
          <span class="post__meta-separator">·</span>
          <a href={`/series/${series.slug}`} class="post__meta-series">
            série: {series.slug}
          </a>
        </>
      )}
    </div>

    <div class="post__prose">
      <slot />
    </div>

    {series && post.seriesRef && (
      <SeriesNav series={series} currentPost={post} />
    )}

    <SuggestionsGrid posts={suggestions} />
  </article>
</BaseLayout>

<style>
  .post {
    max-width: var(--layout-content-max);
    margin: 0 auto;
    padding: var(--space-16) var(--layout-page-pad) var(--space-30);
  }

  .post__cover-wrap {
    position: relative;
    background-color: #000;
    border: var(--border-width) solid var(--color-border);
    padding: var(--space-5);
    display: flex;
    justify-content: center;
    margin-bottom: var(--space-10);
  }

  .post__cover {
    width: 100%;
    max-width: 360px;
    height: auto;
  }

  .post__title {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    margin: 0 0 var(--space-1);
    line-height: var(--line-height-snug);
    color: var(--color-text);
  }

  .post__prefix {
    color: var(--color-accent);
  }

  .post__meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    margin-bottom: var(--space-14);
  }

  .post__meta-separator {
    color: var(--color-border);
  }

  .post__meta-category,
  .post__meta-series {
    color: var(--color-link);
    text-decoration: none;
  }

  .post__meta-category:hover,
  .post__meta-series:hover {
    color: var(--color-accent);
  }

  /* Prose — estilos do conteúdo gerado pelo Markdown */
  .post__prose :global(p) {
    margin: 0 0 var(--space-6);
  }

  .post__prose :global(h2) {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    margin: var(--space-14) 0 var(--space-5);
    color: var(--color-text);
  }

  .post__prose :global(h2::before) {
    content: "## ";
    color: var(--color-accent);
  }

  .post__prose :global(h3) {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-semibold);
    margin: var(--space-10) 0 var(--space-4);
    color: var(--color-text);
  }

  .post__prose :global(h3::before) {
    content: "### ";
    color: var(--color-accent);
  }

  .post__prose :global(code) {
    background-color: var(--color-surface);
    color: var(--color-accent);
    padding: 2px var(--space-1);
    font-size: 0.92em;
    font-family: var(--font-family-mono);
  }

  .post__prose :global(pre) {
    background-color: var(--color-surface);
    border: var(--border-width) solid var(--color-border);
    padding: var(--space-4) var(--space-5);
    margin: 0 0 var(--space-6);
    overflow-x: auto;
    font-size: var(--font-size-sm);
    line-height: var(--line-height-normal);
  }

  .post__prose :global(pre code) {
    background: none;
    color: var(--color-text);
    padding: 0;
    font-size: inherit;
  }

  .post__prose :global(a) {
    color: var(--color-link);
  }

  .post__prose :global(a:hover) {
    color: var(--color-accent);
  }

  .post__prose :global(strong) {
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
  }

  .post__prose :global(blockquote) {
    margin: 0 0 var(--space-6);
    padding: var(--space-4) var(--space-5);
    border-left: 3px solid var(--color-accent);
    background-color: var(--color-surface);
    color: var(--color-text-muted);
  }

  .post__prose :global(ul),
  .post__prose :global(ol) {
    margin: 0 0 var(--space-6);
    padding-left: var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .post__prose :global(ul) {
    list-style: none;
  }

  .post__prose :global(ul li::before) {
    content: "→ ";
    color: var(--color-accent);
  }

  .post__prose :global(hr) {
    border: none;
    border-top: var(--border-width) solid var(--color-border);
    margin: var(--space-12) 0;
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
git commit -m "feat: redesenha PostLayout com prose BEM e tokens"
```

---

### Task 8: Home Page

**Files:**
- Modify: `src/pages/page/[page].astro`

**Boas práticas Astro:**
- `<style>` scoped no arquivo `.astro`
- BEM: `.home-hero`, `.home-hero__text`, `.home-hero__title`, `.home-hero__desc`, `.home-hero__cta`, `.home-hero__btn`, `.home-hero__btn--primary`, `.home-hero__btn--secondary`
- `.home-section`, `.home-section__label`, `.home-section__content`

- [ ] **Step 1: Reescrever `src/pages/page/[page].astro`**

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
    <section class="home-hero">
      <div class="home-hero__text">
        <p class="home-hero__byline">
          por <strong class="home-hero__byline-name">Caio Couto</strong>
        </p>
        <h1 class="home-hero__title">
          Não é sobre usar<br />a ferramenta.<br />É sobre entender.
        </h1>
        <p class="home-hero__desc">
          Sou desenvolvedor e escrevo sobre o que acontece por baixo do código
          que uso todos os dias — redes, sistemas operacionais, linguagens e as
          decisões de engenharia que raramente aparecem no manual.
        </p>
        <div class="home-hero__cta">
          <a href="#artigos" class="home-hero__btn home-hero__btn--primary">
            Ver artigos
          </a>
          <a href="/sobre" class="home-hero__btn home-hero__btn--secondary">
            Sobre mim
          </a>
        </div>
      </div>
    </section>
  )}

  {isFirstPage && allSeries.length > 0 && (
    <section class="home-section">
      <div class="home-section__inner">
        <h2 class="home-section__label">Séries</h2>
        <SeriesGrid seriesList={allSeries} />
      </div>
    </section>
  )}

  <section class="home-section" id="artigos">
    <div class="home-section__inner">
      <h2 class="home-section__label">Artigos recentes</h2>
      <PostGrid posts={paginatedPosts.items} />
      <Pagination result={paginatedPosts} baseUrl="/page" />
    </div>
  </section>
</BaseLayout>

<style>
  .home-hero {
    max-width: var(--layout-wide-max);
    margin: 0 auto;
    padding: var(--space-18) var(--layout-page-pad) var(--space-16);
  }

  .home-hero__byline {
    margin: 0 0 var(--space-5);
    font-size: var(--font-size-sm);
    letter-spacing: var(--letter-spacing-wider);
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .home-hero__byline-name {
    color: var(--color-text);
    font-weight: var(--font-weight-semibold);
  }

  .home-hero__title {
    font-size: var(--font-size-4xl);
    font-weight: var(--font-weight-bold);
    line-height: var(--line-height-tight);
    letter-spacing: var(--letter-spacing-tight);
    margin: 0 0 var(--space-6);
    color: var(--color-text);
  }

  .home-hero__desc {
    font-size: var(--font-size-base);
    color: var(--color-text-muted);
    line-height: 1.7;
    margin: 0 0 var(--space-8);
    max-width: 440px;
  }

  .home-hero__cta {
    display: flex;
    gap: var(--space-3);
  }

  .home-hero__btn {
    padding: var(--space-3) var(--space-5);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    font-family: var(--font-family-mono);
    text-decoration: none;
    border: var(--border-width) solid;
    transition: background-color 0.15s ease, color 0.15s ease;
  }

  .home-hero__btn--primary {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  .home-hero__btn--primary:hover {
    background-color: var(--color-accent);
    color: var(--color-bg);
  }

  .home-hero__btn--secondary {
    border-color: var(--color-border);
    color: var(--color-text);
  }

  .home-hero__btn--secondary:hover {
    border-color: var(--color-text);
    color: var(--color-text);
  }

  .home-section {
    padding: 0 0 var(--space-12);
  }

  .home-section__inner {
    max-width: 760px;
    margin: 0 auto;
    padding: 0 var(--layout-page-pad);
  }

  .home-section__label {
    margin: 0 0 var(--space-5);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-normal);
    letter-spacing: var(--letter-spacing-wider);
    text-transform: uppercase;
    color: var(--color-accent);
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
git commit -m "feat: redesenha home com hero, séries e artigos"
```

---

### Task 9: Páginas de Série e Categoria

**Files:**
- Modify: `src/pages/series/[slug].astro`
- Modify: `src/pages/categories/[slug].astro`

**BEM:**
- `.series-page`, `.series-page__cover-wrap`, `.series-page__cover`, `.series-page__meta`, `.series-page__title`, `.series-page__description`, `.series-page__episodes-label`
- `.category-page`, `.category-page__title`, `.category-page__count`

- [ ] **Step 1: Atualizar `src/pages/series/[slug].astro`**

```astro
---
import BaseLayout from "../../layouts/BaseLayout.astro";
import PostGrid from "../../components/PostGrid.svelte";
import { AstroSeriesRepository } from "../../infrastructure/repositories/AstroSeriesRepository.js";
import { Slug as SlugVO } from "../../domain/value-objects/Slug.js";

export async function getStaticPaths() {
  const repo = new AstroSeriesRepository();
  const allSeries = await repo.findAll();
  return allSeries.map((s) => ({
    params: { slug: s.slug.toString() },
    props: { seriesSlug: s.slug.toString() },
  }));
}

const { seriesSlug } = Astro.props;
const repo = new AstroSeriesRepository();
const series = await repo.findBySlug(SlugVO.from(seriesSlug));
if (!series) return Astro.redirect("/page/1");

const cover = series.cover.toImageSource();
---

<BaseLayout title={`${series.title} — Séries`} description={series.description}>
  <div class="series-page">
    <div class="series-page__cover-wrap">
      <img
        src={cover.src}
        alt={series.title}
        width={cover.width}
        height={cover.height}
        class="series-page__cover"
      />
    </div>
    <p class="series-page__meta">
      Série · {series.posts.length} episódio{series.posts.length !== 1 ? "s" : ""} · por Caio Couto
    </p>
    <h1 class="series-page__title">{series.title}</h1>
    <p class="series-page__description">{series.description}</p>
    <h2 class="series-page__episodes-label">Episódios</h2>
    <PostGrid posts={series.posts} />
  </div>
</BaseLayout>

<style>
  .series-page {
    max-width: var(--layout-content-max);
    margin: 0 auto;
    padding: var(--space-18) var(--layout-page-pad) var(--space-30);
  }

  .series-page__cover-wrap {
    position: relative;
    border: var(--border-width) solid var(--color-border);
    background-color: #000;
    display: flex;
    justify-content: center;
    padding: var(--space-6);
    margin-bottom: var(--space-10);
  }

  .series-page__cover {
    width: 100%;
    max-width: 480px;
    height: auto;
  }

  .series-page__meta {
    margin: 0 0 var(--space-2);
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }

  .series-page__title {
    margin: 0 0 var(--space-4);
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    line-height: var(--line-height-snug);
    color: var(--color-text);
  }

  .series-page__description {
    margin: 0 0 var(--space-14);
    font-size: var(--font-size-base);
    color: var(--color-text);
    max-width: 600px;
    line-height: var(--line-height-normal);
  }

  .series-page__episodes-label {
    margin: 0 0 var(--space-5);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-normal);
    letter-spacing: var(--letter-spacing-wider);
    text-transform: uppercase;
    color: var(--color-accent);
  }
</style>
```

- [ ] **Step 2: Atualizar `src/pages/categories/[slug].astro`**

```astro
---
import BaseLayout from "../../layouts/BaseLayout.astro";
import PostGrid from "../../components/PostGrid.svelte";
import { AstroCategoryRepository } from "../../infrastructure/repositories/AstroCategoryRepository.js";
import { AstroPostRepository } from "../../infrastructure/repositories/AstroPostRepository.js";
import { Slug as SlugVO } from "../../domain/value-objects/Slug.js";

export async function getStaticPaths() {
  const repo = new AstroCategoryRepository();
  const categories = await repo.findAll();
  return categories.map((cat) => ({
    params: { slug: cat.slug.toString() },
    props: { categorySlug: cat.slug.toString() },
  }));
}

const { categorySlug } = Astro.props;
const catRepo = new AstroCategoryRepository();
const postRepo = new AstroPostRepository();
const category = await catRepo.findBySlug(SlugVO.from(categorySlug));
if (!category) return Astro.redirect("/page/1");

const posts = await postRepo.findByCategory(category);
---

<BaseLayout title={`${category.name} — Categorias`}>
  <div class="category-page">
    <div class="category-page__header">
      <p class="category-page__label">Categoria</p>
      <h1 class="category-page__title">{category.name}</h1>
      <p class="category-page__count">{posts.length} artigo{posts.length !== 1 ? "s" : ""}</p>
    </div>
    <PostGrid posts={posts} />
  </div>
</BaseLayout>

<style>
  .category-page {
    max-width: var(--layout-content-max);
    margin: 0 auto;
    padding: var(--space-18) var(--layout-page-pad) var(--space-30);
  }

  .category-page__header {
    margin-bottom: var(--space-10);
    border-bottom: var(--border-width) solid var(--color-border);
    padding-bottom: var(--space-8);
  }

  .category-page__label {
    margin: 0 0 var(--space-2);
    font-size: var(--font-size-sm);
    letter-spacing: var(--letter-spacing-wider);
    text-transform: uppercase;
    color: var(--color-accent);
  }

  .category-page__title {
    margin: 0 0 var(--space-2);
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text);
  }

  .category-page__count {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }
</style>
```

- [ ] **Step 3: Build**

```bash
pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/series/ src/pages/categories/
git commit -m "feat: estiliza páginas de série e categoria com BEM e tokens"
```

---

### Task 10: Testes + Merge na main

- [ ] **Step 1: Garantir build limpo e testes passando**

```bash
pnpm test && pnpm build
```

Expected: 48 testes passando, 6+ páginas geradas.

- [ ] **Step 2: Merge na main**

```bash
git checkout main
git merge --no-ff feat/design -m "feat: implementa design visual Gruvbox com BEM e tokens CSS"
```

- [ ] **Step 3: Deletar branch**

```bash
git branch -d feat/design
```
