# Supabase authentication and Admin Dashboard setup

## Verified diagnosis

The read-only `backend-health-report.json` records the live checks without credentials or row data. The configured Auth API is reachable and accepts the public key. Google is disabled (`external.google=false`) and `.env.local` has `VITE_GOOGLE_AUTH_ENABLED=false`; the active admin gate now uses Supabase Email + Password instead.

Required portfolio tables return `PGRST205` and admin RPCs return `PGRST202` through the configured project's REST schema. This means those objects are not available to the current API/schema cache; confirm migrations and public-schema exposure in SQL Editor. It is not proof that another project or an inaccessible schema has no data. The `portfolio-api` Edge Function returns 404. An anonymous storage listing returns an empty list, which cannot prove that private buckets do not exist.

Google Client ID/Secret, hosted Site URL and redirect allowlist are private dashboard settings. They were not accessible through the public API. No external provider settings, database content, credentials or deployments were changed by this fix.

## 1. Google Cloud Console

1. Open the intended Google Cloud project, then **Google Auth Platform**. Configure Branding, Audience and Data Access. If the app is in Testing, add the authorized owner Google account as a test user.
2. Create/open an OAuth client of type **Web application**.
3. Add JavaScript origins: `http://localhost:5173`, optionally `http://127.0.0.1:5173`, and your actual production HTTPS origin. Origins do not include `/admin`.
4. Add this Google **Authorized redirect URI**, copied exactly from the configured Supabase Google provider page:

   ```text
   https://cltfhbyqgoknztvcplyz.supabase.co/auth/v1/callback
   ```

   This callback belongs to Supabase. Do not replace it with the portfolio's `/admin` URL. If you change Supabase projects or use a custom Auth domain, copy that project's actual callback instead.
5. Use `openid`, email and profile scopes only. Copy the Client ID and Client Secret directly into Supabase's Google provider fields. Do not paste the secret into chat, source, `.env.local`, or any `VITE_` variable.

## 2. Supabase Dashboard

1. Open the same project as `.env.local`, then **Authentication → Sign In / Providers → Google** (the dashboard may label this Providers). Enable Google, enter the matching Web Client ID and Client Secret, and save. The frontend flag cannot enable a hosted provider.
2. In **Authentication → URL Configuration**, set **Site URL** to your actual production origin. For local-only development, `http://localhost:5173` can be used temporarily. Do not invent a production domain.
3. Add exact redirect URLs for the origins you actually use:

   ```text
   http://localhost:5173/admin
   http://localhost:5173/community
   http://127.0.0.1:5173/admin
   http://127.0.0.1:5173/community
   https://YOUR-ACTUAL-SITE/admin
   https://YOUR-ACTUAL-SITE/community
   ```

   Replace the last two placeholders with your real site. Remove unused entries; do not add broad production wildcards. Google Cloud's callback URI and Supabase's application redirect URLs are different settings.
4. Recheck provider status with `node scripts/check-backend.mjs --save`. Only after Google is enabled, change `.env.local` to `VITE_GOOGLE_AUTH_ENABLED=true` and restart Vite. Keep the existing public project URL/publishable key; no new browser secret is needed. Netlify environment variables require their own update and a future authorized build/deployment.
5. PKCE is enabled. Start and complete login in the same browser/origin so its stored verifier is available. The SDK automatically exchanges the returned `?code=` and removes it with `detectSessionInUrl=true`; do not add a second manual exchange or expose session tokens in logs.

## 3. Database setup and sole-owner authorization

Before running SQL, verify you are in the correct project and inspect existing tables/data. A missing REST object can also mean schema exposure/cache problems. Do not broadly rerun setup on an established database.

For a fresh portfolio schema, run these existing files in SQL Editor in this order:

1. `supabase/setup.sql`
2. `supabase/migrations/20261015_client_inquiries.sql`
3. `supabase/migrations/20261015_reading_archive.sql`
4. `supabase/migrations/20261016_admin_dashboard.sql`
5. `supabase/migrations/20261016_dashboard_operations.sql`

The date-only migration filenames share version prefixes; do not blindly use `supabase db push` on this directory. The ordered SQL Editor workflow above avoids duplicate migration-version conflicts. Do not rerun the base setup after the modern authorization migration, because it defines legacy authorization functions/policies.

Then, for the current Email + Password flow:

1. Create and verify the intended Email + Password user as described below. Google remains disabled; no Google login is required.
2. Privately inspect `supabase/bootstrap-admin.sql`. Replace `YOUR_VERIFIED_USER_UUID` with the exact UID of the verified `auth.users` row and run it in Supabase SQL Editor. The SQL re-checks `email_confirmed_at`, grants an active owner membership, and refuses to silently add another owner when another active administrator exists.
3. Verify `public.admin_members` contains only your intended active user ID. Review/deactivate any unwanted existing membership privately. Never grant this role from browser `user_metadata`, a signup form, or a public allowlist insert.
4. Reload `/admin`. Both `admin_identity()` and `is_admin()` must succeed. If an authenticator is enrolled, complete its six-digit challenge. Database RLS remains the authority, including any MFA requirement.

The current admin gate deliberately fails closed if the modern membership RPC is missing. Adding only a legacy email allowlist row is insufficient. Public visitors and ordinary authenticated users must not have INSERT/UPDATE/DELETE grants on `admin_members` or `admin_allowlist`.

## 4. Storage, functions and remaining integration

- The setup SQL defines `portfolio-media` and `portfolio-pdfs`; the dashboard migration also defines `portfolio-private`. Verify bucket existence, MIME/size limits and storage policies in Dashboard. Public cover/media URLs are public assets; use the private bucket for restricted files.
- Current dashboard editors for settings, navigation, footer, skills, projects, books, free PDFs and inquiries are wired to Supabase. Until the missing tables/RPCs/buckets are available, this is source integration, not verified live CRUD. Test an expendable private draft and an authorized test upload after login; do not test by deleting existing content.
- The advanced components in `src/admin/Reports.jsx` and `ContentManager.jsx` and the reusable password auth panel are not wired into the active legacy dashboard. Their presence in the repository does not mean those features are live. This fix does not replace the dashboard UI.
- The dashboard migration revokes legacy direct anonymous contact/page-view inserts in favor of the validated `portfolio-api` Edge Function. The active legacy contact/tracking paths require migration to that API and an existing consent/captcha flow before production collection can be called functional. Do not weaken RLS to make old inserts succeed.
- Deploy `supabase/functions/portfolio-api` only when separately authorized. Configure server-only secrets described in `supabase/functions/.env.example`, especially exact `ALLOWED_ORIGINS`, a strong `RATE_LIMIT_SALT`, and production captcha/email provider settings as needed. Never put these values in Vite variables. This fix does not deploy the function or invent secrets.
- Legacy overview analytics counts use `page_views`; advanced consented analytics uses `analytics_events`. Those are different datasets. Empty counts and unavailable reports must not be described as working visitor analytics.

## 5. Verification checklist

1. `node scripts/check-backend.mjs --save`: Auth provider status, public schema reachability, anonymous draft/RPC access and function preflight. The report contains no credentials or content rows. Public-only checks cannot prove authenticated RLS, bucket writes, OAuth consent or admin membership.
2. `node scripts/check-auth.mjs`: controlled auth-service success/failure and fail-closed authorization cases.
3. `node scripts/check-auth-browser.mjs`: local browser mocks for SDK PKCE exchange, persistence/refresh, sign-out, unauthorized/missing-schema rejection and MFA. These are not live Google login or live RLS tests. Use an installed Playwright module via `PLAYWRIGHT_MODULE_PATH` and an existing Chrome via `BROWSER_EXECUTABLE_PATH`; no packages are downloaded.
4. `npm.cmd run build`: production compilation. Use `npm run build` where npm.ps1 is allowed.
5. After external setup, complete a real owner login, reload, refresh the session, sign out, and verify a reload does not restore it. Repeat login with a non-admin account: it must be denied both by the UI and direct database/storage requests. Verify drafts stay private and ordinary users cannot assign roles.
6. Confirm all configured content collections load, a private test draft can be saved/published/unpublished, a test cover/PDF uploads, and existing public download links still work. Audit storage/RLS with authenticated SQL/API access; a successful frontend render alone is not proof.

References: [Supabase Google setup](https://supabase.com/docs/guides/auth/social-login/auth-google), [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Google Web OAuth](https://developers.google.com/identity/protocols/oauth2/web-server).
# Admin authentication setup

The portfolio admin dashboard uses Supabase Email + Password authentication. Google Sign-In is intentionally disabled until it is explicitly re-enabled in both Supabase and the local environment.

## Create and authorize the admin account

1. In Supabase Dashboard, open Authentication → Providers and make sure Email is enabled. Keep Google disabled.
2. Open Authentication → Users → Add user. Create the email address you want to use for this portfolio admin and a unique password of at least 12 characters. Require email confirmation, or confirm the user only through the Supabase dashboard after verifying ownership of the mailbox.
3. In SQL Editor, review the UID without changing data:

   ```sql
   select id, email_confirmed_at
   from auth.users
   where lower(email) = lower('YOUR_ADMIN_EMAIL');
   ```

   Continue only when the returned row is your intended user and `email_confirmed_at` is not null.
4. Copy `supabase/bootstrap-admin.sql` into the Supabase SQL Editor. Replace `YOUR_VERIFIED_USER_UUID` with that exact UID, then run it. This inserts only that verified user into `public.admin_members` with the `owner` role. It does not create or expose a password.
5. In the local project, keep `VITE_GOOGLE_AUTH_ENABLED=false` in `.env.local`, restart Vite, open `/admin`, and sign in with the approved email and password.

The dashboard does not trust a browser-supplied role. Every admin check calls the database-backed `admin_identity()`/`is_admin()` functions, and dashboard tables/storage policies require the active `admin_members` row. Do not put a service-role key in `.env.local` or the browser bundle.

## Password recovery

Use “Forgot password?” on `/admin`. Supabase sends the reset email; no password is stored in this application.

## Troubleshooting

- Confirm `VITE_SUPABASE_URL` and the public `VITE_SUPABASE_ANON_KEY` (or `VITE_SUPABASE_PUBLISHABLE_KEY`) are present in `.env.local`, then restart Vite after changes.
- If sign-in succeeds but access is denied, confirm the email is verified and that the bootstrap SQL ran against the same Supabase project.
- If the dashboard reports incomplete admin setup, apply `setup.sql` and the migrations in `supabase/migrations/` in order, then rerun the bootstrap SQL.
- Never grant `admin_members` through a client-side insert or expose the SQL editor/service-role credentials.
