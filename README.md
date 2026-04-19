<div align="center">

# Keycap Studio

**A 3D mechanical keyboard customization studio in the browser.**

![Last Commit](https://img.shields.io/github/last-commit/MohamedZameell/keycap-studio?style=flat-square)
![Stack](https://img.shields.io/badge/stack-React%2019%20·%20Three.js%20·%20Vite%208-61dafb?style=flat-square)

</div>

---

## Why

Mechanical keyboards are art, but every "render your dream board" tool I tried was either paywalled, desktop-only, or stuck in 2015. I wanted:

- A **browser-first** studio, no downloads
- **Real colorways** (GMK, not "pick a hex")
- Multi-color keycap logic that respects alphas / mods / accents
- A **typing test** while you admire your work

## Features

- **Form factors** — 60%, 65%, 75%, TKL, 100%
- **72 GMK colorways** — multi-color rules mapped per key group
- **11 profiles** — Cherry, SA, DSA, OEM, XDA, KAT, MT3, ASA, OSA, KSA, low-profile
- **Case customization** — style (rounded / angular), finish (matte / brushed / glossy), color picker
- **Typing test** at `/typing-test` — Monkeytype-style words with live 3D key presses
- **Image wrap** — map any image across keycaps
- **Export** as PNG / PDF (jsPDF)
- **Supabase auth** — save designs, favorites, browse the gallery

## Tech

| Layer | Choice |
|---|---|
| Framework | React 19 + Vite 8 |
| 3D | Three.js via `@react-three/fiber` + `@react-three/drei` |
| Post FX | `@react-three/postprocessing` |
| State | Zustand |
| Routing | React Router 7 |
| Auth / DB | Supabase |
| Styling | Inline styles + CSS variables in `src/index.css` |
| Audio | Howler (typing sounds) |

## Design Decisions

- **`meshStandardMaterial`** (not Physical) — simpler and closer to the reference [keysim](https://github.com/magic-akari/keysim) look
- **No HDRI / Environment preset** — caused glare; directional lights only (`ambient 0.5`, `primary 0.7`, `secondary 0.2`)
- **Roughness 0.45 – 0.9** — realistic plastic, not glossy plastic-wrap
- **Inline styles + CSS vars** — no component-scoped stylesheets
- **graphify knowledge graph** integrated at `graphify-out/` — 1,142 nodes / 1,509 edges; AI tooling navigates the codebase via the graph instead of grepping

## What's Done

- [x] Core 3D render with realistic lighting and materials
- [x] GMK multi-color colorway system (per-group key mapping)
- [x] URL-based routing — pages persist on refresh
- [x] User auth + **Designs / Favorites / Settings** tabs
- [x] Case style / finish / color picker
- [x] Typing test with live key press animation
- [x] Monkeytype-clean word display
- [x] Huly.io-inspired premium landing pass
- [x] Homepage canvas animation optimized for speed + smoothness

## Still Improving

- [ ] Secondary legends on keys (`@`, `#`, `$`, etc.)
- [ ] Front-face legend positioning needs more testing
- [ ] Match keysim reference even more closely
- [ ] Gallery social features — likes, remix
- [ ] Per-switch-type sound profiles

## Run Locally

```bash
git clone https://github.com/MohamedZameell/keycap-studio.git
cd keycap-studio
npm install
npm run dev
# → http://localhost:5173
```

## Reference Material

Bundled in `/references/` — keysim source, GMK color list, KL3V, KLE-Render, KeycapModels. Used as the visual north star for rendering quality.

## Key Files

- `src/components/Keycap.jsx` — 3D keycap geometry + `PROFILE_SPECS`
- `src/components/KeyboardRenderer.jsx` — full keyboard rendering
- `src/components/KeyboardChassis.jsx` — case with style / finish / color
- `src/screens/StudioScreen.jsx` — main editor
- `src/data/colorways/` — 72 GMK colorway JSON files
- `src/store.js` — Zustand store

---

<sub>Vibe-coded with Claude Code and Codex. Designed and maintained by <a href="https://github.com/MohamedZameell">@MohamedZameell</a>.</sub>
