# GitHub Pages setup

1. Upload this project with the folder tree intact, including `.github/workflows/deploy-pages.yml`.
2. In the repository, open **Settings → Pages**.
3. Set **Source** to **GitHub Actions**.
4. Push to `main`, then open the **Actions** tab and watch “Deploy RIGS to GitHub Pages.”

The workflow builds into `github-dist` and uploads that exact folder. This corrects the earlier
artifact-path mismatch that caused `tar: github-dist: Cannot open` during the upload step.
