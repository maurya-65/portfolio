# Maurya Oganja — Portfolio

Personal portfolio built with Astro, GSAP, Lenis, Three.js and Matter.js.

## Run it

```
npm install
npm run dev
```

The dev server runs at http://localhost:4321.

| Command           | What it does                       |
| ----------------- | ---------------------------------- |
| `npm run dev`     | Start the dev server               |
| `npm run build`   | Build the static site into `dist/` |
| `npm run preview` | Preview the production build       |
| `npm run check`   | Type-check the project             |

If the dev server ever shows a blank 3D section after dependency changes, stop it, delete `node_modules/.vite` and start it again.

## What's on the page

- **Loader**: two rings of text in a Three.js scene with a real percentage. It stays up until fonts, images, both 3D scenes and the About letters have loaded, then the hero drops and the header fades in.
- **About**: the statement is made of Matter.js letters that fall and pile up as you scroll in.
- **Recent work**: a 3D monitor that tips up and zooms in until the screen fills the view. On wide screens the screen becomes a small computer: a login (type `maurya`), a desktop, a taskbar and Start menu, draggable windows, a terminal, and Projects, Resume, About and Contact apps. Phones get a swipeable slider instead.
- **Laptop**: an interactive 3D laptop you can drag and open.
- **Skills, experience, achievements, education, contact**: content sections from `src/data/site.ts`.

## Editing content

Everything written on the site lives in `src/data/site.ts`: name, links, hero and About copy, skills, experience, achievements, education, projects and the resume app's text. Items marked PLACEHOLDER (Picsum photos and covers) are waiting for real images.

The resume PDF is `public/maurya_oganja_resume.pdf`. Replace the file, keep the name, and the footer link and the Resume app pick it up.

## Project layout

- `src/components/` page sections (Hero, About, Works, LaptopShowcase, Services, Timeline, Education, Contact, Footer, ...)
- `src/scripts/`
  - `site.ts` scroll, loader, hero, header and form logic
  - `loader-ring.ts` the loader's 3D rings
  - `works.ts` the monitor scene; `pc.ts` the desktop that runs on it
  - `laptop.ts` the 3D laptop
  - `canvas-text.ts` the Matter.js About letters
  - `perf.ts` low-power detection (see below)
- `src/styles/` global, section and extra styles
- `public/fonts/` self-hosted Sofia Sans Condensed and Spline Sans Mono

## Performance

`src/scripts/perf.ts` switches the 3D scenes to a cheaper mode on machines with 4 cores or fewer, 4 GB of memory or less, or reduced-motion on: pixel ratio 1, no antialiasing, smaller shadow maps and lighter physics. Other machines are capped at a 1.5x pixel ratio. The monitor desktop is plain DOM and CSS, so it costs almost nothing once it is open.

Placeholder images load from Picsum. Real photos should be resized to about 1600px wide and compressed, since the loader waits for them.

## Deploying

`npm run build` outputs a static site to `dist/`, which any static host can serve (Vercel, Netlify, GitHub Pages, Cloudflare Pages).

## Credits

Design reference: [REF - OL](https://olhalazarieva.com/)
