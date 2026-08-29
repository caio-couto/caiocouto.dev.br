import rss from "@astrojs/rss";
import type {APIContext} from "astro";
import {AstroPostRepository} from "../infrastructure/repositories/AstroPostRepository.js";

export async function GET(context: APIContext) {
    const repo = new AstroPostRepository();
    const posts = await repo.findAll();

    return rss({
        title: "Caio Couto",
        description: "Meu blog pessoal: sistemas, redes, linguagens e engenharia.",
        site: context.site ?? "https://caiocouto.dev.br",
        items: posts.map((post) => ({
            title: post.title,
            description: post.summary,
            pubDate: post.publishedAt,
            link: `/posts/${post.slug}`,
        })),
    });
}
