<script lang="ts">
    interface Props {
        label: string;
        content: string;
        color?: string;
    }

    const {label, content, color = "var(--color-text)"}: Props = $props();
</script>

<figure class="ascii-card" style={`--_color: ${color}`}>
    <div class="ascii-card__frame">
        <span class="ascii-card__corner ascii-card__corner--tl" aria-hidden="true">+</span>
        <span class="ascii-card__corner ascii-card__corner--tr" aria-hidden="true">+</span>
        <div class="ascii-card__viewport">
            <pre class="ascii-card__art">{content}</pre>
        </div>
        <span class="ascii-card__corner ascii-card__corner--bl" aria-hidden="true">+</span>
        <span class="ascii-card__corner ascii-card__corner--br" aria-hidden="true">+</span>
    </div>
    <figcaption class="ascii-card__label">{label}</figcaption>
</figure>

<style>
    .ascii-card {
        margin: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-3);
    }

    .ascii-card__frame {
        position: relative;
        border: var(--border-width-dash) dashed transparent;
        background-color: transparent;
        transition: border-color 0.2s ease;
    }

    .ascii-card:hover .ascii-card__frame {
        border-color: var(--_color);
    }

    .ascii-card__corner {
        position: absolute;
        color: var(--_color);
        font-size: var(--corner-size);
        line-height: 1;
        background-color: transparent;
        padding: 0 var(--space-1);
        z-index: 2;
        font-family: var(--font-family-mono), monospace;
        pointer-events: none;
        user-select: none;
        opacity: 0;
        transition: opacity 0.2s ease;
    }

    .ascii-card:hover .ascii-card__corner {
        opacity: 1;
    }

    .ascii-card__corner--tl {
        top: var(--corner-offset);
        left: var(--corner-offset);
    }

    .ascii-card__corner--tr {
        top: var(--corner-offset);
        right: var(--corner-offset);
    }

    .ascii-card__corner--bl {
        bottom: var(--corner-offset);
        left: var(--corner-offset);
    }

    .ascii-card__corner--br {
        bottom: var(--corner-offset);
        right: var(--corner-offset);
    }

    .ascii-card__viewport {
        width: 13.75rem;
        height: 12.5rem;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .ascii-card__art {
        font-size: 4px;
        line-height: 1.1;
        color: var(--_color);
        font-family: var(--font-family-mono), monospace;
        white-space: pre;
        margin: 0;
        padding: 0;
        opacity: 0.9;
    }

    .ascii-card__label {
        font-size: var(--font-size-xs);
        letter-spacing: var(--letter-spacing-wider);
        text-transform: uppercase;
        color: var(--_color);
        opacity: 0;
        transition: opacity 0.2s ease;
    }

    .ascii-card:hover .ascii-card__label {
        opacity: 1;
    }
</style>
