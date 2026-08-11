# RIGS CPU Designer Prototype

A playable browser prototype for the RIGS CPU design workflow. It includes die
sizing, spatial floorplan painting, independent Performance and Efficiency core
blobs, connectivity analysis, package choices, thermal assembly, and a final
design review.

## Share it with testers

The repository includes an automatic GitHub Pages deployment. Follow
[GITHUB_PAGES_SETUP.md](GITHUB_PAGES_SETUP.md) for the one-time setup. After
that, every update committed to `main` is published at the same web address.

## Run locally

Requires Node.js 22.13 or newer.

```sh
npm ci
npx vite
```

Open the local address printed in the terminal, normally
`http://localhost:5173/`.

## Checks

```sh
node --test tests/chip-analysis.test.ts
npm run build:github
```

The original Sites production build remains available through `npm run build`.
