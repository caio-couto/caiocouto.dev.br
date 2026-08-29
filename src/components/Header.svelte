<header class="header">
    <a href="/" class="header__brand">Caio Couto</a>

    <button
            class="header__menu-btn"
            data-menu-toggle
            aria-label="Abrir menu"
            aria-expanded="false"
            aria-controls="header-nav"
    >
        <span class="header__menu-icon" aria-hidden="true">☰</span>
    </button>

    <nav class="header__nav" id="header-nav">
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
        z-index: 100;
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

    .header__menu-btn {
        display: none;
        align-items: center;
        justify-content: center;
        width: 2.5rem;
        height: 2.5rem;
        background: none;
        border: var(--border-width) solid var(--color-border);
        color: var(--color-text);
        font-size: var(--font-size-lg);
        font-family: var(--font-family-mono), monospace;
        cursor: pointer;
        line-height: 1;
    }

    .header__menu-btn:hover {
        border-color: var(--color-accent);
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
        font-family: var(--font-family-mono), monospace;
        cursor: pointer;
        letter-spacing: var(--letter-spacing-normal);
    }

    .header__toggle:hover {
        border-color: var(--color-accent);
        color: var(--color-accent);
    }

    @media (max-width: 47.9375rem) {
        .header {
            padding: var(--space-4) var(--space-5);
            flex-wrap: wrap;
            gap: 0;
        }

        .header__menu-btn {
            display: flex;
        }

        .header__nav {
            display: none;
            width: 100%;
            flex-direction: column;
            align-items: flex-start;
            gap: 0;
            padding: var(--space-4) 0;
            border-top: var(--border-width) solid var(--color-border);
            margin-top: var(--space-4);
        }

        :global(.header__nav--open) {
            display: flex;
        }

        .header__nav-link {
            width: 100%;
            padding: var(--space-3) 0;
            border-bottom: var(--border-width) solid var(--color-border);
        }

        .header__toggle {
            margin-left: 0;
            margin-top: var(--space-4);
        }
    }
</style>
