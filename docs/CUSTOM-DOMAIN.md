# Using your own web address

You can serve the site from an address such as `connections.yourchurch.org`.

1. **DNS:** at your domain provider, add a `CNAME` record for `connections` pointing to `joemighty.github.io`.
2. **GitHub:** in the repository go to **Settings > Pages > Custom domain**, enter `connections.yourchurch.org` and save. Tick **Enforce HTTPS** once it becomes available (this can take up to an hour).
3. **Link previews:** in `site/index.html` replace `https://joemighty.github.io/BibleConnections/` in the `og:url` and `og:image` tags with your new address, for example `https://connections.yourchurch.org/`.
4. **Stats (if used):** update `plausibleDomain` in `site/content/config.json`.

Old `github.io` links keep working because GitHub redirects them to the custom domain.
