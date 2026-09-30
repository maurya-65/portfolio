# Portfolio

Personal portfolio site built with Astro, GSAP, Three.js and Lenis smooth scrolling.

## Run it

```
npm install
npm run dev
```

The dev server runs at http://localhost:4321.

| Command           | What it does                      |
| ----------------- | --------------------------------- |
| `npm run dev`     | Start the dev server              |
| `npm run build`   | Build the static site into `dist/`|
| `npm run preview` | Preview the production build      |
| `npm run check`   | Type-check the project            |

## Editing content

Name, role, contact links, projects and skills all live in `src/data/site.ts`.

## Project layout

- `src/components/` - page sections (Hero, About, Works, Services, Education, Contact, ...)
- `src/scripts/` - animations and interactions (earth intro, scroll effects, works, awards)
- `src/styles/` - global and section styles
- `public/fonts/` - self-hosted fonts

## Fonts

Sofia Sans Condensed (headings) and Spline Sans Mono (body), installed from `@fontsource`.
