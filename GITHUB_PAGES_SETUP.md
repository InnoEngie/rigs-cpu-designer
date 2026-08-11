# Put the RIGS CPU prototype online with GitHub Pages

Everything needed for publishing is already included in this project. GitHub
will build the prototype automatically and give you a shareable web address.

## First-time setup

1. Sign in at [github.com](https://github.com/) and select the **+** menu in the
   upper-right, then **New repository**.
2. Name the repository `rigs-cpu-designer` (another name also works).
3. Set it to **Public**. Leave **Add a README**, `.gitignore`, and license
   unchecked, then select **Create repository**.
4. Extract the supplied `rigs-cpu-designer-github-ready.zip` on your computer.
5. On the empty repository page, choose **uploading an existing file**. Drag all
   of the extracted project's contents into the upload area. This includes the
   folders such as `.github`, `app`, `github-pages`, `lib`, `public`, and
   `scripts`.
6. At the bottom, select **Commit changes**.
7. Open the repository's **Settings** tab, choose **Pages** in the left sidebar,
   and set **Source** to **GitHub Actions** if it is not already selected.
8. Open the **Actions** tab. The workflow named **Deploy RIGS prototype to
   GitHub Pages** should be running. When both jobs show green check marks, open
   **Settings → Pages** again to find the live address.

The address will normally look like:

`https://YOUR-GITHUB-NAME.github.io/rigs-cpu-designer/`

Send that address to testers. They only need a normal web browser.

## Publishing later updates

Upload the changed project files to the same repository and commit them to the
`main` branch. GitHub automatically rebuilds the website at the same address.
Testers do not need to reinstall or download anything.

## If the deployment does not start

- Check **Settings → Pages** and confirm the source is **GitHub Actions**.
- Check **Actions** for a yellow banner asking you to enable workflows, then
  approve it.
- If the repository uses a branch named something other than `main`, rename it
  to `main` or change `branches: [main]` in
  `.github/workflows/deploy-pages.yml`.
- A red workflow run can be opened to show which named step failed. Keep that
  page available if you want help diagnosing it.

## Optional local check

If Node.js is already installed, you can verify the GitHub version before
uploading:

```powershell
npm ci
npm run build:github
npx vite preview --outDir dist-github
```

The GitHub workflow performs the same install and build automatically, so this
local check is not required.
