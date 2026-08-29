// @ts-check
import {defineConfig} from "astro/config";
import svelte from "@astrojs/svelte";
import {
    transformerMetaHighlight,
    transformerNotationDiff,
    transformerNotationFocus,
    transformerNotationHighlight,
} from "@shikijs/transformers";

function transformerTitle() {
    return {
        name: "transformer-title",
        pre(node) {
            const meta = this.options.meta?.__raw ?? "";
            const match = meta.match(/title="([^"]+)"/);

            if (!match) return;
            
            node.properties["data-title"] = match[1];
        },
    };
}

export default defineConfig({
    site: "https://caiocouto.dev.br",
    output: "static",
    integrations: [svelte()],
    markdown: {
        shikiConfig: {
            themes: {
                dark: "gruvbox-dark-medium",
                light: "gruvbox-light-medium",
            },
            defaultColor: "dark",
            transformers: [
                transformerNotationHighlight(),
                transformerNotationDiff(),
                transformerNotationFocus(),
                transformerMetaHighlight(),
                transformerTitle(),
            ],
        },
    },
});
