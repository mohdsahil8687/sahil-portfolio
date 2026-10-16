# Muhammad Sahil — Freelance Developer
### Portfolio, private admin dashboard, and public learning resources

This is the complete editable project for Muhammad Sahil's freelance portfolio.
It includes a public-facing mobile-responsive site and a private CMS at `/admin`.
The files are designed for Netlify + Supabase (PostgreSQL, authentication and storage).

> **Important:** This repository contains the application source, not a connected live service. Live content, uploads, contact inquiries, member logins, visitor counts, and the admin dashboard require your own Supabase credentials and Google OAuth configuration. No sample project claims are published by the local fallback or seeded into a fresh database.

## Website sections

- `/` — animated portfolio landing page; reduced-motion-aware headline; CSS 3D hero; 90-day learning journey
- `/work` — projects, project-cover images and optional live demo/GitHub links
- `/services` — add/remove/reorder service offerings
- `/learning` — 90-day public learning log and challenge tracker
- `/resources` — free PDF library with shareable `/resources/your-slug` links
- `/about` — background + **three replaceable image slots** on Home/About
- `/contact` — public inquiry form that saves private records to Supabase; optional introduction video
- `/community` — optional Google sign-in and **separate** marketing email opt-in
- `/admin` — approved-admin-only dashboard, uploads, inquiry status management, member list and analytics

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
Without Supabase configuration the site uses empty content collections rather than publishing example projects or learning entries.

## Step 2 — Create your Supabase backend (SQL + storage + login)

1. Create an account at https://supabase.com/ and click **New project**.
2. Wait for its PostgreSQL database to be ready.
3. Go to **SQL Editor** → **New query**.
4. Open `supabase/setup.sql` in VS Code, copy **the entire file** into SQL Editor and press **Run** for a fresh project. Do not run it repeatedly.
   - If you already configured the earlier portfolio schema, apply `supabase/migrations/20261015_client_inquiries.sql` in SQL Editor before using the updated inquiry workflow. Existing site settings are not overwritten by the setup seed; update the role, experience, and profile text in `/admin` as needed. Previously seeded project or learning rows are also preserved, so review them in `/admin` and unpublish anything that is not accurate before launch.
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

- **Photos & logo**: individually upload/replace/remove logo, hero artwork, About portrait and background photo; choose cover or contain for images. SVG uploads are sanitized before storage.
- **Site content**: update role, headline, about, contact email, social links, optional supported introduction video URL and current day in the 90-day challenge.
- **Projects**: upload a cover image, enter the URL of the live project (starts `https://`), add a GitHub URL, status and stack.
- **Services / Offers / Learning log**: add, hide, edit, delete or reorder items by position.
- **PDF resources**: click Add new, fill title and description, upload a PDF, set URL slug, **Save & publish**. Share your final link directly from YouTube: `https://yourdomain.com/resources/your-slug`. Visitors click **Download free PDF**.
- **Client inquiries**: review private submissions, filter by New / Contacted / Closed, update their status, delete them, or export the current filter as CSV.

### Important: PDFs after uploading
The file-upload action uploads the file to Supabase Storage and fills its public URL and object path into the editor. You still need to click **Save & publish** to link the uploaded file to the document entry.

## Step 5 — Publish via Netlify + connect your domain

**Best option:** Deploy from GitHub so every `git push` automatically updates your website.

1. Create a **new private GitHub repository** (or public if you want the code publicly visible). Do **not** upload `.env`.
2. In the project folder:

```bash
git init
git add .
git commit -m "Launch Muhammad Sahil portfolio"
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
- [ ] Contact number is optional, inquiry status changes persist, and the status filter/export are accurate.
- [ ] Visit count increments after visitors open public routes. This measures **page views, not unique people**.
- [ ] A voluntary Google login appears under **Audience**. Marketing opt-in remains disabled until the person actively enables it.
- [ ] Visit `/admin`, add a PDF and share `/resources/<slug>` in a YouTube description.

## Privacy & security

**Google sign-in is not consent to send bulk emails.** The `member_profiles.marketing_opt_in` field is `false` by default. Use only **opted-in** email addresses for promotional outreach, provide an unsubscribe mechanism in any future email service and comply with applicable privacy/anti-spam laws. Storing emails alone does not authorize sending campaigns.

All content modification, upload, inquiry status changes and private inbox reads are controlled by Postgres Row Level Security. The public contact form and page-view endpoint permit anonymous inserts (necessary for public usage). The contact form has a basic honeypot and database validation, but no server-side rate limiting or CAPTCHA; add bot protection such as Cloudflare Turnstile with a trusted server/edge verifier before promoting the form at scale. Publish a privacy policy and retention/deletion process before collecting data from the general public.

Do **not** publish secrets in source, git or screenshots. The project uses no proprietary AI API keys and has no paid AI usage requirement. Supabase and Netlify pricing/quotas can change — check current plan limits.

## Current status / limits of this delivered source

The production build can be checked locally with `npm run build`. Google OAuth, live database policies, uploads, inquiry status updates and deployment still require your configured Supabase and Netlify environments.

**Design choice:** The hero uses lightweight interactive CSS 3D transforms rather than a costly WebGL scene. This keeps the desired premium motion and fits a freelance portfolio on mobile devices.


## Interactive Skills Journey

The homepage's former learning-log preview is replaced by a nine-stage Skills Journey at `/#skills`. The separate `/learning` journal, learning records and resource library remain available. The navigation has a Skills anchor and a Journal link.

Preview locally with `npm install` (if needed), then `npm run dev`, and open `http://localhost:5173/#skills`. On Windows PowerShell, use `npm.cmd run dev` if execution policy blocks npm.ps1. Build with `npm run build`; run the rendering checks with `node scripts/check-skills.mjs`.

### Edit skills

After signing in as an allowlisted administrator at `/admin`, choose **Skills journey**. Add/remove stages, edit titles, descriptions, categories, status and context, choose a stage symbol, enter technology labels one per line, or reorder stages with the arrow buttons. Known technology names receive matching Lucide symbols; these are interface symbols rather than official brand logos. Click **Save & publish** to persist changes. Loading curated defaults changes only the draft until saved.

Content is stored in `site_settings.data.skillsJourney`, using the existing admin-only UPDATE policy. No database migration, new table, service-role key or policy change is required. Existing global settings are retained when skills are saved. If the backend is disconnected, no saved journey exists, or saved skill data is malformed, the public page uses `src/skills-data.js`. Deleting the final stage is disabled. The editor supports up to 50 stages.

SVG connections follow measured node centers on desktop and mobile. Scroll progress draws the connection, and nodes can be selected by click or keyboard focus. The desktop detail panel can collapse; mobile stages also include an expandable tools/context disclosure. Reduced-motion preferences disable decorative movement and show the complete path. Scroll listeners, observers and animation frames are cleaned up when the component unmounts; ambient animation pauses outside the scene.

Implementation references: [MDN SVG stroke-dashoffset](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/stroke-dashoffset), [Motion scroll-linked animation patterns](https://motion.dev/docs/scroll). The implementation is original and uses browser APIs and the existing ISC-licensed Lucide library; no third-party animation code or artwork was copied.

Validation: production build and the rendering/data checks were executed. Browser visual, mobile viewport, keyboard, scroll, reduced-motion, and reload interaction checks require manual verification because this session has no connected browser. Supabase OAuth, persistence and live RLS enforcement remain unverified without backend configuration. No deployment or push was performed.


## Floating navigation

The public header now uses a dark/champagne floating capsule with independent branding and social/contact actions. It has a measured moving active highlight, scroll compaction with hysteresis, a Skills disclosure, and a curated Work preview when published project records exist. Home/Skills highlighting follows the Skills section in the viewport; other links follow the current route, including resource detail pages. The original journal is linked from the Skills preview and mobile panel, and can be restored as a primary link in the editor.

At **Admin ? Navigation**, edit brand text, contact label/destination, social URLs (Instagram, Facebook, LinkedIn, GitHub), primary-link visibility and order, skills-preview categories, and the optional current-work preview. Social URLs use the existing global fields; the logo remains in **Photos & logo**, and availability remains in **Site content**. Empty social URLs hide their links. The workflow preview is disabled by default and needs an owner-provided title before enabling; its dot indicates a configured work preview, not online presence.

Navigation configuration lives in `site_settings.data.navigation` under the existing administrator-only UPDATE policy. No migration or new credentials are needed. Without configuration, the default seven-link navigation remains usable. Previously saved menus keep their order and visibility settings when the Reading entry is added. Invalid stored configuration falls back to defaults. Contact destinations support existing routes/anchors or a valid HTTPS URL. Social links use secure new-tab attributes; unsafe schemes and URLs containing credentials are rejected.

Below 1051px, the capsule becomes a single floating menu with a scrollable, safe-area-aware panel, touch-sized controls, inline previews, socials and contact action. Menus support click/tap, desktop hover, Tab, Escape with focus return, outside click and focus-leave dismissal. Reduced motion disables decorative movement. Listeners, resize observers, hover timers and scroll animation frames are cleaned up on unmount. The UI uses the existing ISC-licensed Lucide package and original CSS/SVG; no external component code or artwork was copied.

Optional GitHub API fetching was not added. Work previews use only your existing published project data, so navigation has no API/token/rate-limit dependency. To add projects, use the existing Projects editor.

Preview: `npm.cmd run dev`, then open the printed localhost URL. Navigation checks: `node scripts/check-navigation.mjs`. Skills regression checks: `node scripts/check-skills.mjs`. Production build: `npm.cmd run build`.

Research references: [WAI disclosure navigation pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/), [Lucide React documentation](https://lucide.dev/guide/react/), [Magic UI dock interaction reference](https://magicui.design/docs/components/dock). These informed disclosure semantics and restrained dock interactions; the implementation does not reuse their component code.

Verification limits: server-rendered markup and configuration tests do not verify browser layout, pointer/keyboard behavior, scrolling, reduced-motion rendering or refresh interactions. This session has no connected browser. Live Supabase persistence, OAuth and RLS require your configured backend and remain unverified. Nothing was pushed or deployed.


## Reading Archive & free book notes

The **Read. Reflect. Build.** archive is available from **Reading** in the desktop and mobile navigation at `/reading`; the homepage reading section remains removed. Each published book has free notes at `/reading/<slug>`, for example `/reading/atomic-habits`. The original gallery, book data, covers, notes and interactions are shared by these standalone routes. The original `/resources`, PDF download flow, resource records and uploads are preserved. The archive links to **Browse Free Resources** separately.

The initial collection is exactly the eight owner-specified books, all marked Read. Default introductions, key ideas, learning focuses and practical questions are editorial starting points. Personal reflections start empty. No quotes, personal success stories or complete book downloads have been added. Books added later by the owner can be Read, Reading or Up Next; the Books I've Read perspective shows completed reads, while other perspectives can include ongoing reading. Select any book to open its existing notes page through **Read My Notes**. **Browse Free Resources** opens the separate PDF library.

### Coverflow & reading controls

Three books are visible at once, with the selected title forward and neighboring books behind it. CSS perspective, spine/page treatments, spatial repositioning and 750 ms easing provide the depth without WebGL or new dependencies. Hover selection waits 160 ms, locks during the 780 ms transition window and requires real pointer movement before another selection. Clicks, keyboard focus, Enter/Space, previous/next controls, Arrow keys, Home/End and mobile swipes are supported. Swipe-generated clicks are suppressed briefly. Cached cover elements remain mounted while leaving the foreground to avoid a cover-to-fallback flash.

Automatic rotation starts **off**. The play/pause control enables a 6.5-second interval and is the first keyboard control in the gallery, while remaining visually below the books. Mouse, touch and keyboard can start and stop it; hovering into the collection or focusing another control pauses it. Offscreen and inactive-tab detection suspend the timer; reduced motion disables automatic rotation and decorative transitions. Observers, timers and visibility listeners are cleaned up on unmount. Only the three foreground cover requests are present initially; images are lazy-loaded and decoded asynchronously. The selected-notes announcement region remains mounted while its content changes. Mobile notes panels reserve the same height for all eight initial books and all three perspectives.

Covers are directly referenced from the [Open Library Covers API](https://openlibrary.org/dev/docs/api/covers) using ISBNs, following its public-page hotlink guidance. Open Library credit appears on each seeded notes page. Medium JPGs are used without recoloring artwork. Missing, blocked or invalid images fall back to original typographic jackets. No cover artwork is bundled or reconstructed. Owners can supply authorized replacement images. Remote availability depends on the cover provider; it is reported separately from the browser suite's controlled image-loading and fallback checks.

### Activate editing with Supabase

1. Complete the existing Supabase setup and admin allowlist.
2. Apply **`supabase/migrations/20261015_reading_archive.sql`** in Supabase SQL Editor. This adds the books table, indexes, timestamp trigger, RLS policies and eight seed rows. It does not alter existing resource tables. Seed conflicts never overwrite edits. Apply as a migration; rerunning the seed after intentionally deleting an original book could restore that absent seed row.
3. Use **Admin ? Reading archive** to add/edit/remove books, change author/category/status, set sort positions, edit notes/reflections, attach related resources and publish/unpublish. New books start as private drafts. Changing a slug changes its public notes URL.
4. Cover uploads reuse the existing admin-protected `portfolio-media` storage bucket. JPG, PNG, WebP and AVIF are accepted, with a 5 MB limit in the cover editor. Uploaded files still need **Save & publish** or **Save private draft** to attach to a book. Replaced/removed files are retained to avoid deleting a potentially shared asset.

Database SELECT policies expose only published books to public visitors; allowlisted admins can also read drafts. Inserts, updates and deletes require the existing `is_admin()` check. No service-role key or new API secret is introduced. Draft text is kept in the books table rather than the publicly readable settings JSON.

Without a configured backend or while the books table is unavailable, the public site renders local seed content. The admin does not claim that local edits persist. A successfully loaded empty books table remains empty, so deleting/unpublishing everything does not silently restore the collection. Cover uploads use existing Storage policies; their image files are public assets, including when the associated notes are drafts.

### Preview & checks

Run `npm.cmd run dev`, then open `http://localhost:5173/reading` or `http://localhost:5173/reading/atomic-habits`. On shells where npm is available directly, `npm run dev` works too.

- `npm.cmd run build`: production compilation.
- `node scripts/check-reading.mjs`: eight titles/authors, public note rendering and links, ring positions for every selection, repeated wrap arithmetic, draft/empty filtering, fallback markup, link safety, missing-backend editor and migration structure.
- `node scripts/check-reading-browser.mjs`: optional Chrome/Playwright checks against a running local preview. It uses an already installed `playwright` module, or its absolute directory through `PLAYWRIGHT_MODULE_PATH`. Set `BROWSER_EXECUTABLE_PATH` to an existing Chrome executable if needed. No package or browser is downloaded. `READING_PREVIEW_URL` overrides the default `http://127.0.0.1:5173`; reports and screenshots go to the temporary `sahil-reading-qa` directory. `--layouts-only` reruns only responsive, swipe, reduced-motion and image checks. Font requests and covers are intercepted for deterministic functional checks; a separate bounded request reports live cover availability.
- `node scripts/check-skills.mjs` and `node scripts/check-navigation.mjs`: earlier feature regression checks.

The existing navigation/footer check scripts still assert previous branding behavior: a custom navigation brand title and the old footer signature/monogram. Those assertions fail against the current independent navigation/footer redesigns; this reading update does not alter those designs or remove the assertions.

Rendering/data checks and headless Chrome interaction checks have been executed. The browser suite covers all eight note pages, authors and existing content; hover reordering in both directions; stable hover and rapid controls; looping; keyboard and touch swipes; Play/Pause; perspective changes; reduced motion; image loading/fallback; responsive widths from 320 to 1440 pixels; direct refresh; navigation; resources; and the absent homepage archive. OS-level tab scheduling and device FPS are not measured; visibility-handler checks use a simulated hidden-page event. Live Supabase authentication, uploads, persistence and RLS enforcement require backend configuration. The reading migration is provided but was not applied in this session. Existing React Router build directives and bundle-size warnings remain. Nothing was pushed or deployed.

Interaction reference: [WAI carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/). The implementation uses original React/CSS rather than copied carousel code or external animation packages.


## Interactive mega footer

All public pages now finish with a dark/champagne mega footer. Its content-driven `65svh` minimum does not impose a fixed height or overlap the preceding section. The layout contains a closing statement and contact CTA, an original CSS/SVG orbital brand visual, Explore/social/skills/focus areas, an oversized personal signature and a final copyright/back-to-top strip. On mobile, the order becomes closing statement, CTA, compact brand visual, Explore, socials, skills, professional focus and the bottom strip.

The default heading is **Let's build something extraordinary.** The monogram uses the existing logo, or a configurable S/M/S fallback. WEB, AI, DESIGN, CODE and AUTOMATION nodes are decorative; the brand visual itself links Home. The primary CTA uses the existing `/contact#inquiry-form`, preserving the inquiry submission flow. Footer navigation includes every existing primary route, the Skills anchor, Journal, Reading archive, learning community and the admin entry. Every skill pill links to the existing Skills Journey.

### Content management

Use **Admin ? Footer** to edit the heading, italic emphasis, supporting text, CTA label/destination, signature, fallback monogram, skill labels, professional focus and navigation visibility. Availability and social URLs are shared with the existing global settings; the image logo remains under **Photos & logo**. Footer edits save into `site_settings.data.footer`, retaining all other settings and using the existing allowlisted-admin UPDATE policy. No migration, new table, new credential or dependency is required for the footer.

The owner-provided GitHub URL (`https://github.com/mohdsahil8687`) is used as the footer default until social preferences are explicitly saved. Other unconfigured social links are hidden. After saving Footer settings, clearing a URL hides its footer icon, including GitHub. The editor shows non-clickable previews for missing profiles. Configured social links open in a new tab with `rel="noopener noreferrer"`; unsafe URL schemes and credential-bearing URLs are rejected.

The default **CURRENTLY EXPLORING** note describes the supplied AI automation/full-stack direction, not live online presence or invented project activity. Its heading, focus, description, visibility and optional related-work URL are editable. Skill labels describe hands-on tools and topics being explored, without mastery scores or certifications.

### Navigation, motion and accessibility

The contact CTA carries inquiry-focus intent into the existing scroll manager: after arriving at the form it focuses the name field without another scroll. Same-page anchor clicks also work. The Back to Top control scrolls to actual page position 0 and transfers focus to the main content. Both respect reduced motion. Social tooltips support hover/focus and Escape dismissal; normal browser cursors remain in use.

The footer uses an 850 ms entrance, restrained social stagger, 250?400 ms hover/depth changes and 8?12 second ambient cycles. Reveals play once per mounted footer. Ambient motion pauses outside the viewport and while the tab is inactive. Minimal background depth uses one requestAnimationFrame per visible scroll frame, without React state updates per frame. Observers, listeners and pending frames are cleaned up. Mobile removes the extra orbit and continuous monogram float; reduced motion disables decorative animation. Footer content is visible before animation enhancement, so a failed motion setup does not hide links.

A source-level motion review found Work reveals (850?950 ms), navigation interactions (roughly 220?450 ms), Skills transitions and the reading gallery's 750 ms movement broadly consistent with the new footer. Optional follow-up: the pre-existing hero/headline and marquee loops could also pause when offscreen. They were not redesigned as part of this footer task.

### Preview & verification

Run `npm.cmd run dev` and open the printed localhost URL; scroll to the end of any public page. Configure footer content at `/admin` after the existing Supabase setup. Run `node scripts/check-footer.mjs` for markup, route destinations, social link handling, configuration fallbacks, visibility controls, editor rendering and focus/scroll helper checks. Existing navigation, Skills and reading checks remain available in `scripts/`.

Production compilation and all four rendering/data/helper check scripts were executed. These are not browser tests. This session has no connected browser or live Supabase credentials, so desktop/tablet/mobile visual layout, real keyboard/pointer interaction, actual anchor navigation, overflow, console behavior and Supabase persistence remain unverified. Existing React Router directive and bundle-size warnings remain. No push or deployment was performed.

Implementation references: [CSS animation-play-state](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/animation-play-state), [reduced-motion media queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion), [Motion viewport-reveal patterns](https://motion.dev/docs/react-use-in-view). The footer uses original CSS/SVG and the existing ISC-licensed Lucide icons; no third-party component code or artwork was copied.
