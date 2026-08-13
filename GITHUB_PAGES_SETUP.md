# Updating the RIGS GitHub Pages prototype

The project includes its own publishing workflow. Once the files are in the correct folders, every commit to `main` automatically tests, builds, and updates the existing GitHub Pages site.

## Required folder tree

Confirm these files appear at these exact paths:

```text
.github/
  workflows/
    deploy-pages.yml
app/
  designers.tsx
  system-pages.tsx
  page.tsx
  globals.css
github/
  index.html
  main.tsx
lib/
  chip-analysis.ts
  component-model.ts
  expansion-analysis.ts
tests/
  chip-analysis.test.ts
  full-system.test.ts
vite.github.config.ts
package.json
package-lock.json
```

The repository contains additional support files; keep those too.

## Uploading the update

1. Extract the ZIP.
2. In the repository's **Code** tab, upload the extracted contents.
3. Preserve the folder names. GitHub's browser upload can sometimes mishandle hidden folders, especially `.github`; manually create `.github/workflows` if necessary.
4. Commit the files to the `main` branch.
5. Open **Actions** and select **Deploy RIGS prototype to GitHub Pages**.
6. After both `build` and `deploy` are green, refresh the existing Pages URL.

Your **Settings → Pages → Source** should remain set to **GitHub Actions**.

## What testers should know

- Saved components persist in that browser using local storage.
- Different devices and browsers have separate libraries.
- Clearing the browser's site data removes saved components.
- The Rig Builder reads saved parts immediately; there is no account or server database.

## If the workflow does not appear

Verify `.github/workflows/deploy-pages.yml` exists in the repository and is not nested inside another copy of the project folder. The workflow appears in the main **Actions** tab, not **Settings → Actions → Runners**.

## Optional local test

With Node.js 22 installed, run:

```powershell
npm ci
npm run test:logic
npm run build:github
npx vite --config vite.github.config.ts
```

The terminal will show the local address to open.
