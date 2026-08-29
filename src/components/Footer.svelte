<footer class="footer">
    <p class="footer__copy">
        © {new Date().getFullYear()} ASCII Caio ·
        <a href="https://creativecommons.org/licenses/by-sa/4.0/" class="footer__link">CC BY-SA 4.0</a>
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
