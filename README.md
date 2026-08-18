# LR-63 — Creative Marketing • Performance Advertising • AI

A cinematic, fully-interactive 3D portfolio website for **LR-63**, built as a
self-contained static frontend designed to be deployed straight to
**GitHub Pages**.

## What's inside

- **Cinematic intro** — canvas particle field that resolves into "LR-63",
  followed by a theatrical 3D curtain reveal and a "WELCOME TO LR-63"
  moment (with a "SKIP INTRO" button and localStorage skip on repeat visits).
- **Interactive 3D hero** — Three.js floating billboards, glass geometry,
  chrome knot, wire icosahedron and 750-point particle field with
  pointer-mouse parallax.
- **About / Services / Ad platforms / Portfolio** — GSAP + ScrollTrigger
  reveals, 3D card tilt, magnetic buttons, cursor-following glow.
- **AI Agents network** — animated central core with 7 orbiting nodes and
  SVG data-pulse lines.
- **Final CTA + Footer**.
- **23 high-quality visuals**, all generated in-house and bundled locally.

## How to deploy to GitHub Pages

1. Push the contents of this folder to a GitHub repository.
2. Repo → `Settings` → `Pages` → `Build and deployment` →
   `Source: Deploy from a branch` → branch: `main`, folder: `/ (root)`.
3. GitHub Pages will serve `index.html` as the homepage.

No build step is required — everything works as raw static files.

## Files

```
lr63/
├── index.html        ← entry point
├── css/style.css     ← full cinematic stylesheet
├── js/main.js        ← interaction engine (intro, curtain, 3D, scroll)
├── assets/img/       ← 23 site visuals (all locally bundled)
└── README.md         ← this file
```

## Editing

| What you want to change            | Where to look                                  |
|------------------------------------|------------------------------------------------|
| Agency copy / headlines / CTAs     | `index.html`                                   |
| Stat counters (campaigns / brands) | `#stats` block in `index.html` (data-count)    |
| Brand colours                      | `:root` CSS variables in `css/style.css`       |
| Hero 3D scene                      | `initHero3D()` in `js/main.js`                 |
| Service / portfolio visuals        | swap any `.jpg` in `assets/img/`               |
| Stage figures / curtain            | `.stage-figure` & `#curtain` in `index.html`   |

## Performance notes

- 23 visuals, ~2.9 MB total, lazy-loaded except the hero textures.
- `prefers-reduced-motion` is honoured.
- Mobile devices fall back from the Three.js hero to a high-quality image.
- All paths are relative — works on any sub-path on GitHub Pages.

© 2026 LR-63.
