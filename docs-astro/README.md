# docs-astro

Incremental migration target for our documentation site using Astro.

## Useful commands

## Run locally

- Dev: `npm run dev`
- Build: `npm run build`
- Preview: `npm run preview`

## Structure

- `src/content/docs/` — Starlight docs content
- `src/content/config.ts` — Content collections schema
- `public/img/logo.svg` — Header logo
- `src/content/blog/` — Blog posts (Markdown)
- `src/pages/blog/` — Blog list and post routes

## Add or migrate pages

1. Create a new Markdown file under `src/content/docs/`, for example `getting-started.md`.
2. Add minimal frontmatter:

   ***

   title: Getting Started
   description: Optional short summary.

   ***

3. Add the page to the sidebar by editing `astro.config.ts` `starlight().sidebar` array.
4. Use relative links between pages, e.g. `[Intro](./intro/)`.
   Content lives under `src/` and static assets under `public/`.

## Add or migrate blog posts

1. Create a Markdown file in `src/content/blog/` with frontmatter:

   ***

   title: My Post Title
   pubDate: 2025-10-19
   author: Your Name
   authorImage: /img/team-avatar.svg
   tags: [tag1, tag2]

   ***

2. Visit `/blog/` to see the listing and click through to the post.
