# ZION Web browser tests

The browser suite runs against the built Next.js production server, not the development server.

## Local execution

1. Install the workspace dependencies with pnpm.
2. Install Playwright in the workspace or make `@playwright/test` resolvable from Node.
3. Install the Chromium browser with `playwright install chromium`.
4. Set the three public build variables used by the app:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_ZION_API_URL`
5. Build the web app: `pnpm --filter web build`.
6. Start the production server in another terminal: `pnpm --filter web start -- --hostname 127.0.0.1`.
7. Run: `playwright test --config=apps/web/e2e/playwright.config.cjs`.

## Current coverage

- Public landing page entry points.
- Sign-in form and phone/email method switching.
- Sign-up form and password minimum length.
- Redirect from a protected dashboard route when no session exists.
- Sign-in page horizontal overflow at narrow mobile widths.

The CI workflow installs a pinned Playwright runner into the runner's temporary directory. It does not alter the pnpm workspace or lockfile.

## Important boundary

These are browser smoke tests for public and unauthenticated flows. They do not prove that real Supabase email/SMS delivery, authenticated organization permissions, LiveKit calls, multi-user meetings, live broadcasts, or screen sharing work. Those require dedicated test identities, valid provider configuration, and separate multi-user browser scenarios. Do not treat this suite as the full release gate.
