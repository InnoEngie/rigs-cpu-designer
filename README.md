# RIGS Full Component & Production Prototype (v3)

This repository contains the complete v2 component-design prototype plus the v3 Production and Fab
Line addendum.

## Included

- Lithography-aware CPU floorplanning with process-node and transistor gates
- Expansion Card radar analysis and the complete supporting-component roster
- Persistent Saved Components and Saved Fab Lines using browser localStorage
- Rig Builder socket, form-factor, and PCIe compatibility checks
- Eight-stage Fab Line design with QC checkpoints and Room Air Quality
- Poisson yield, basic/advanced binning, and expected material-use analysis
- A corrected GitHub Pages workflow that builds and uploads `github-dist`

## Local development

```bash
npm ci
npm run dev
```

## Verification

```bash
npm test
npm run lint
npm run build:github
```

See `GITHUB_PAGES_SETUP.md` for deployment setup.
