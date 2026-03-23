# Keycap Studio - Claude Code Guidelines

## Project Overview
3D keycap designer web app built with React + Vite + React Three Fiber. Users select keyboards, customize keycap colors/legends/materials, and export designs.

## Tech Stack
- React 18 + Vite
- Three.js via @react-three/fiber and @react-three/drei
- Zustand for state management
- Supabase (optional) for gallery persistence

## Key Files
- `src/store.js` - Zustand store with all app state
- `src/components/Keycap.jsx` - 3D keycap geometry and materials (PROFILE_SPECS here)
- `src/components/KeyboardRenderer.jsx` - Full keyboard 3D rendering
- `src/screens/EntryScreen.jsx` - Landing page with canvas animation
- `src/screens/SelectorScreen.jsx` - Keyboard/profile selection flow
- `src/screens/StudioScreen.jsx` - Main 3D editor interface
- `src/screens/GalleryScreen.jsx` - Community designs gallery
- `src/data/keyboards/` - Keyboard database (brands, models, layouts)
- `src/data/layouts.js` - Key layout definitions by form factor

## Compaction Preservation
When context is compacted, preserve:
- Modified file paths with line numbers
- Current task/bug being worked on
- Any error messages or stack traces encountered
- Architecture decisions made and why
- State of uncommitted changes (git status)

## Code Conventions
- Inline styles preferred (no separate CSS files for components)
- CSS variables defined in `src/index.css` (--surface, --primary, etc.)
- Profile names are lowercase in PROFILE_SPECS (cherry, oem, sa, dsa, xda, kat, mt3, asa, osa, ksa, low profile)
- Use normalizeProfile() for case-insensitive profile lookup

## Git Workflow
- Commit after completing features/fixes, not during
- Batch related changes into single commits
- Push without asking for confirmation (user granted full access)

## Common Gotchas
- Canvas animation in EntryScreen: keys must call updateFall() before drawing
- Profile names from UI are capitalized (Cherry) but PROFILE_SPECS keys are lowercase (cherry)
- Image textures need both top face AND body mesh application for full coverage
