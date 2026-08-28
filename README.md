# LUNA

LUNA is a private wellness companion built with React, Vite, TypeScript, and Supabase.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Add the Supabase project URL and browser-safe publishable key (or the existing public anon key).
3. In the Supabase SQL editor, run `supabase/migrations/001_initial_schema.sql`.
4. Run `npm install` and `npm run dev`.

Only the public anon key belongs in the browser. Never add a service-role key to `.env.local` or frontend code.

## Security model

Every health table has UUID ownership through `auth.users`. RLS is enabled for every table. The migration creates owner policies using `auth.uid()`, and signup creates a private profile through a database trigger. The browser check-in writes mood, stress, and sleep separately with a unique `(user_id, logged_on)` constraint, so saving today updates rather than duplicates.

The migration should be exercised against a linked Supabase project with two test accounts before deployment. Verify that each account cannot select, update, or delete the other account's records. This repository does not contain credentials, so that live RLS test cannot run locally.

## Verification

```bash
npm run lint
npm run build
```

The PWA manifest, service worker, and safe notification-ready shell are served from `public/`. Browser notifications remain subject to browser and iOS background restrictions; they are not native alarm guarantees.

## Auth email redirects

Authentication email links return to the current origin by default. For a deployed site, set `VITE_APP_URL` to the exact production origin, including no path, for example `https://your-app.example`. The local development origin is the URL used to run Vite, such as `http://localhost:3000/` when started on port 3000.

In Supabase Dashboard, configure Authentication > URL Configuration with the exact Site URL and Redirect URL origins used by the app. Add both the local origin and the real deployed origin; do not add placeholder domains.
