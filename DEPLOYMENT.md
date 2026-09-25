# Deployment

This project is a full-stack Node application. Deploy it as a web service, not as a static GitHub Pages site.

## Render

1. Push this repository to GitHub.
2. In Render, choose **New +** and **Blueprint**.
3. Connect the GitHub repository and select `render.yaml`.
4. Add the required environment values in the Render service:
   - `DATABASE_URL`
   - `VITE_APP_ID`
   - `OAUTH_SERVER_URL`
   - `OWNER_OPEN_ID`
   - `BUILT_IN_FORGE_API_URL`
   - `BUILT_IN_FORGE_API_KEY`
5. Create the service and wait for the first deploy.
6. Run the database migration from a one-off shell or local environment with the production `DATABASE_URL`:

```bash
corepack pnpm db:push
```

The service URL will look like `https://hyperlocal-delivery-rider-pool.onrender.com`. Add that URL to the GitHub repository under **Settings > Pages** only as a repository link, or under **About > Website**. GitHub Pages itself cannot host this backend, OAuth callback, or database connection.

## OAuth callback

After deployment, register the production callback URL with the OAuth provider:

```text
https://YOUR_RENDER_HOST/api/oauth/callback
```

Keep secrets in Render environment variables. Do not commit `.env` files or credentials.
