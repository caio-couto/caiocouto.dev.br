<script lang="ts">
    import type {Snippet} from "svelte";

    interface Props {
        color?: string;
        bgColor?: string;
        tag?: string;
        class?: string;
        style?: string;
        children?: Snippet;

        [key: string]: unknown;
    }

    const {
        color = "var(--color-border)",
        bgColor = "var(--color-bg)",
        tag = "div",
        class: className = "",
        style: inlineStyle = "",
        children,
        ...attrs
    }: Props = $props();
</script>

<svelte:element
        this={tag}
        class={`corner-box ${className}`}
        style={`--_corner-color:${color};--_corner-bg:${bgColor};${inlineStyle}`}
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
        color: var(--color-text);
        font-size: var(--corner-size);
        line-height: 1;
        background-color: var(--_corner-bg);
        padding: 0 var(--space-1);
        z-index: 2;
        font-family: var(--font-family-mono), monospace;
        pointer-events: none;
        user-select: none;
        transition: color 0.15s ease;
    }

    .corner-box__marker--tl {
        top: var(--corner-offset);
        left: var(--corner-offset);
    }

    .corner-box__marker--tr {
        top: var(--corner-offset);
        right: var(--corner-offset);
    }

    .corner-box__marker--bl {
        bottom: var(--corner-offset);
        left: var(--corner-offset);
    }

    .corner-box__marker--br {
        bottom: var(--corner-offset);
        right: var(--corner-offset);
    }
</style>
