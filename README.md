# SAHIL / Independent Studio
### Premium portfolio + private content studio + real PDF library

This is the complete editable project for Muhammad Sahil's freelance portfolio.
It includes a public-facing mobile-responsive site and a private CMS at `/admin`.
The files are designed for Netlify + Supabase (PostgreSQL, authentication and storage).

> **Important:** This ZIP contains code, not a live website. The public website can display its seeded visual preview without Supabase, but live uploads, contact messages, member logins, visitor counts and the admin CMS require **your own Supabase credentials and Google OAuth configuration**. No one can securely deploy to your private Netlify/domain/Supabase accounts without you connecting or authorizing those accounts.

## Website sections

- `/` — animated premium landing page; interactive CSS 3D hero; 90-day journey; featured projects
- `/work` — projects, project-cover images and optional live demo/GitHub links
- `/services` — add/remove/reorder service offerings
- `/learning` — 90-day public learning log and challenge tracker
- `/resources` — free PDF library with shareable `/resources/your-slug` links
- `/about` — background + **three replaceable image slots** on Home/About
- `/contact` — customer lead form that saves inquiries privately to Supabase
- `/community` — optional Google sign-in and **separate** marketing email opt-in
- `/admin` — approved-admin-only dashboard, uploads, lead inbox, member list and analytics

None of the public PDF resources require visitors to sign in.

## Step 1 — Open in VS Code and install packages

Install Node.js version **20.19+ or 22.12+** from https://nodejs.org/.
Extract the ZIP and open the `sahil-atelier` project folder in VS Code.
In **Terminal > New Terminal**, run:

```bash
npm install
npm run dev
```

Open the local URL shown by Vite (normally `http://localhost:5173`).
Even before database setup, the website displays its example project and service cards.

## Step 2 — Create your Supabase backend (SQL + storage + login)

1. Create an account at https://supabase.com/ and click **New project**.
2. Wait for its PostgreSQL database to be ready.
3. Go to **SQL Editor** → **New query**.
4. Open `supabase/setup.sql` in VS Code, copy **the entire file** into SQL Editor and press **Run**. Run it once, not repeatedly.
5. In Supabase **Project Settings** look for the Project URL and **public/publishable or legacy anon** API key. **NEVER use the `service_role`/secret API key in the frontend.**
6. Duplicate `.env.example` to `.env` and replace these values with yours:

```dotenv
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

7. Restart your local Vite server after changing `.env`:

```bash
npm run dev
```

The SQL creates all tables, Row Level Security access policies, public media and PDF buckets, and example data. Storage uploads are limited to **10 MB** per file. Public files are intentionally readable by anyone holding the link, so **never upload private contracts, credentials, client data or confidential PDFs**.

## Step 3 — Set up Google sign-in and claim YOUR dashboard

1. In Supabase Dashboard, open **Authentication → Providers → Google**. Follow the provider wizard. You will need an OAuth **Client ID** and **Client secret** from Google Cloud Console (https://console.cloud.google.com/apis/credentials). Configure your Google OAuth consent screen.
2. In Google Cloud OAuth client settings (type: **Web application**), register Supabase's exact callback, typically:

   `https://YOUR-PROJECT.supabase.co/auth/v1/callback`

   Supabase shows the callback URL on its Google provider setup page. Use that exact value.
3. Paste Google Client ID and Client secret into Supabase Google provider and enable it. If your Google app is in *Testing* mode, add your own Google account as a test user.
4. In Supabase **Authentication → URL Configuration**, set `Site URL` to your final Netlify/custom domain and **allow** both your production URL routes and local development routes. Examples:

   `https://YOUR-DOMAIN.COM/**`

   `https://YOUR-SITE.netlify.app/**`

   `http://localhost:5173/**`

5. Go to `/admin` and click **Continue with Google**, using **your own** Google account. Being logged in alone does **not** give admin access.
6. Back in Supabase **SQL Editor**, execute the following statement after replacing the email with your actual Google account email:

```sql
insert into public.admin_allowlist(email)
values ('YOUR-EXACT-GOOGLE-EMAIL@gmail.com')
on conflict do nothing;
```

7. Refresh `/admin`. Now your approved Google identity can access the dashboard. Other visitor accounts cannot edit the site.

**Why an allowlist?** Checking an email only in the browser would not be secure. The actual permission to create, update and delete content lives in the database Row Level Security rules.

## Step 4 — Add your three images, logo and links

At `/admin`:

- **Photos & logo**: individually upload/replace/remove logo, main hero artwork, About portrait and background photo (four editable media slots, three images plus logo).
- **Site content**: update role, headline, about, contact email, YouTube, Instagram, GitHub, LinkedIn and your current day in the 90-day challenge.
- **Projects**: upload a cover image, enter the URL of the live project (starts `https://`), add a GitHub URL, status and stack.
- **Services / Offers / Learning log**: add, hide, edit, delete or reorder items by position.
- **PDF resources**: click Add new, fill title and description, upload a PDF, set URL slug, **Save & publish**. Share your final link directly from YouTube: `https://yourdomain.com/resources/your-slug`. Visitors click **Download free PDF**.

### Important: PDFs after uploading
The file-upload action uploads the file to Supabase Storage and fills its public URL and object path into the editor. You still need to click **Save & publish** to link the uploaded file to the document entry.

## Step 5 — Publish via Netlify + connect your domain

**Best option:** Deploy from GitHub so every `git push` automatically updates your website.

1. Create a **new private GitHub repository** (or public if you want the code publicly visible). Do **not** upload `.env`.
2. In the project folder:

```bash
git init
git add .
git commit -m "Launch independent portfolio"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

3. Open https://app.netlify.com/ → **Add new project** → **Import an existing project** → GitHub and choose the repository.
4. Netlify settings are already in `netlify.toml`: **Build command** `npm run build`, **Publish directory** `dist`, SPA routing redirect enabled.
5. Before you deploy, open Netlify project → **Site configuration / Environment variables** and add both variables, including `VITE_` prefix:

   `VITE_SUPABASE_URL` = your public Supabase project URL

   `VITE_SUPABASE_ANON_KEY` = your public Supabase client key

6. Deploy. Open the generated `*.netlify.app` URL. Netlify should install dependencies and run the build in its own build environment.
7. Connect your purchased domain in Netlify **Domain management → Add a domain**; follow Netlify's **exact** DNS records for your registrar. Do not change nameservers without reviewing their effect on your domain email or other services.
8. After the final live domain is set, update **Supabase Authentication → URL Configuration** to allow the final domain. Test Google sign-in again.

### Alternative: manual deploy

On your machine, after `npm install`, run:

```bash
npm run build
```

Drag the generated **`dist`** folder (not the source project folder) to Netlify manual deploy. Remember: environment variables for `VITE_` are compiled into your bundle at build time; for local manual build they must already exist in `.env`.

## Step 6 — Final acceptance checks

- [ ] Site loads at the Netlify URL and your final domain.
- [ ] Mobile menu opens/closes on Android; cards are readable without sideways scrolling.
- [ ] `/work`, `/services`, `/learning`, `/about`, `/contact` load on **direct refresh**.
- [ ] Public PDF download works on a private/incognito browser without login.
- [ ] Admin Google login succeeds ONLY for your allowlisted email.
- [ ] Non-admin Google user cannot upload, edit or delete content.
- [ ] Image upload, replacement and removal show correctly on the public website.
- [ ] New project live URL opens correctly; missing links never lead to fake demos.
- [ ] Contact form saves an inquiry you can read under **Inquiries**.
- [ ] Visit count increments after visitors open public routes. This measures **page views, not unique people**.
- [ ] A voluntary Google login appears under **Audience**. Marketing opt-in remains disabled until the person actively enables it.
- [ ] Visit `/admin`, add a PDF and share `/resources/<slug>` in a YouTube description.

## Privacy & security

**Google sign-in is not consent to send bulk emails.** The `member_profiles.marketing_opt_in` field is `false` by default. Use only **opted-in** email addresses for promotional outreach, provide an unsubscribe mechanism in any future email service and comply with applicable privacy/anti-spam laws. Storing emails alone does not authorize sending campaigns.

All content modification, upload and private inbox reads are controlled by Postgres Row Level Security. The public contact form and page-view endpoint still permit anonymous inserts (necessary for public usage); for high-traffic deployment add bot protection such as Cloudflare Turnstile, throttling or a server-side API. The lightweight honey-pot protects against only basic spam, not serious automated attacks. You should publish a privacy policy and retention/deletion process before collecting data from the general public.

Do **not** publish secrets in source, git or screenshots. The project uses no proprietary AI API keys and has no paid AI usage requirement. Supabase and Netlify pricing/quotas can change — check current plan limits.

## Current status / limits of this delivered source

The project code and SQL security policies are included. Code can be syntax-checked without credentials, but a real package build, browser interaction test, OAuth flow, database query or public deployment **cannot be verified without installed npm dependencies, your actual Supabase project and authorized Netlify/GitHub accounts**.

**Design choice:** The hero uses lightweight interactive CSS 3D transforms rather than a costly WebGL scene. This keeps the desired premium motion and fits a freelance portfolio on mobile devices.
