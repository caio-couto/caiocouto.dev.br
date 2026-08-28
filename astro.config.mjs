// @ts-check
import {defineConfig} from "astro/config";
import svelte from "@astrojs/svelte";

export default defineConfig({
    site: "https://caiocouto.dev.br",
    output: "static",
    integrations: [svelte()],
});
