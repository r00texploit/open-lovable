# Sparkable Vercel Platform Setup

Sparkable runs as one Vercel project that serves many customer websites from the same codebase.

## Platform model

- Main marketing site: `mydomain.com`
- App host: `app.mydomain.com`
- Tenant sites: `{slug}.mydomain.com`
- Optional later: custom domains like `customerbrand.com`
- Tenant websites are database-backed site snapshots, not separate Vercel deployments

## Vercel setup

1. Create one Vercel Team for the business.
2. Create one Vercel Project for the Sparkable app.
3. Add these domains in the project settings:
   - `mydomain.com`
   - `www.mydomain.com`
   - `app.mydomain.com`
   - `*.mydomain.com`
4. Configure the wildcard domain with Vercel-compatible DNS.
   - If you want wildcard handling fully managed by Vercel, use Vercel nameservers where required.
5. Add these environment variables in Vercel:
   - `ROOT_DOMAIN`
   - `NEXT_PUBLIC_ROOT_DOMAIN`
   - `PLATFORM_APP_HOST`
   - `VERCEL_PROJECT_ID`
   - `VERCEL_TEAM_ID`
   - `VERCEL_API_TOKEN`

## Publishing model

- Users generate websites in the Sparkable app workspace.
- Publishing builds the current sandbox output and stores a static snapshot in the database.
- Public tenant requests are resolved by hostname and served from the stored snapshot.
- Republish after new edits if the public site should update.

## Custom domain flow

1. User creates a site and gets a default subdomain at `{slug}.{ROOT_DOMAIN}`.
2. User adds a custom domain in site settings.
3. Sparkable adds that domain to the existing Vercel project through the Project Domains API.
4. User applies the required DNS records.
5. User refreshes status and verifies the domain from the settings screen.

## Local testing

- Run the app locally at `http://localhost:3000`.
- Use the normal app routes for platform testing.
- Use `/site-preview/[slug]` for tenant snapshot testing when local subdomains are inconvenient.
- Tenant subdomain and custom-domain host routing should be validated again on a deployed Vercel preview or production environment.
