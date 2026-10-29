# Personal-Website

Personal site for Aarush Prasad Uli: research, experience, projects, and coursework.

Plain HTML, CSS, and vanilla JS. No build step and no dependencies.

## Run locally

```sh
python3 -m http.server 8765
# open http://localhost:8765
```

## Structure

```
index.html            all page content
styles.css            design tokens (light/dark), layout, components
script.js             theme toggle, nav, reveal-on-scroll, course filter, lightbox,
                      pointer effects, the ShelfLife sensor demo, and the animated
                      contour field in the hero
assets/
  Aarush_Uli_Resume.pdf
  favicon.svg
  og.png              link-preview image (1200×630)
  img/                research figures and project screenshots (WebP)
```

## Common edits

- **Projects / experience / courses**: edit the matching `<section>` in `index.html`.
- **Résumé**: replace `assets/Aarush_Uli_Resume.pdf` (keep the filename).
- **Colors**: change the tokens at the top of `styles.css` (`--accent`, etc.).

## Deploy

Import the repo in Vercel with the "Other" framework preset (no build command, output directory `.`).
After the first deploy, change `og:image` in `index.html` to the full URL
(e.g. `https://your-domain/assets/og.png`) so LinkedIn and iMessage show the preview.
