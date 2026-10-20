# aaronabrams.com Site Audit

Audited October 20, 2026 against the live site (https://aaronabrams.com) and this repository.
Method: Lighthouse 12 (mobile and desktop) on four representative pages, full page screenshots
at phone (390px) and laptop (1440x900) widths on eight pages, a scripted check of every HTML file
(titles, descriptions, canonicals, headings, structured data, image attributes, internal links,
sitemap coverage), live HTTP header and redirect checks, and a read through of the code.

## Summary

The site is in good technical shape. SEO basics are clean on all 50 pages, accessibility is 96 to 100,
best practices score 100 everywhere, and there are no broken links, console errors, or layout shift.
The biggest opportunities are not technical fixes. They are:

1. **No analytics or conversion tracking.** You cannot tell which pages bring leads.
2. **No testimonials on the homepage**, even though you have 5.0 stars from 14 Zillow reviews.
3. **Homepage mobile speed (80)** held back by Google Fonts loading.
4. **The homepage contact form's Send button is hidden** on common laptop screens.
5. **Local SEO levers outside the site** (Google Business Profile) and **community pages that do not
   use your own sales data.**

## Scorecard

| Page | Device | Perf | A11y | Best Pr. | SEO | LCP |
|---|---|---|---|---|---|---|
| Home | Mobile | **80** | 96 | 100 | 100 | 3.8 s |
| Home | Desktop | 97 | 96 | 100 | 100 | 1.0 s |
| Sales | Mobile | 92 | 100 | 100 | 100 | 2.7 s |
| Carlsbad | Mobile | 95 | 100 | 100 | 100 | 2.4 s |
| Contact | Mobile | 96 | 100 | 100 | 100 | 2.3 s |

Lighthouse mobile uses a slow 4G and throttled CPU profile, so treat these as relative numbers.
Google's "good" line for LCP is 2.5 s, and the homepage is the only page well over it.

---

## Priority 1: Do these first

### 1.1 Add analytics and lead tracking (Conversion)
The only measurement on the site is Netlify's built in RUM script. There is no GA4, Plausible,
or similar, so there is no record of traffic sources, which pages people read before contacting
you, or how many people click Call, Text, Schedule, or submit a form.

Recommended:
- Add GA4 (free) or Plausible (privacy friendly, no cookie banner needed).
- Track these as conversions: form submit (contact, home value), Calendly booking
  (Calendly posts a `calendly.event_scheduled` message to the page that main.js can listen for),
  `tel:` clicks, `sms:` clicks, and "View on Zillow" outbound clicks.
- Link GA4 to Google Search Console (already verified) so search queries show next to conversions.

### 1.2 Put reviews on the homepage (Conversion, Trust)
The homepage has listings, a bio, and FAQs, but zero client quotes. Your strongest trust signal
(5.0 stars, 14 Zillow reviews) is only on reviews.html and sales.html. Add a short reviews band
right after "Recently closed": the star rating, 2 or 3 short excerpts with the "Bought a home in
Escondido" style attribution you already use, and a link to all reviews. Also consider a small
"5.0 on Zillow, 14 reviews" line under the hero buttons.

The reviews page itself shows 4 of the 14 reviews. Adding more (with the clients' approval,
as the page already promises) makes it a stronger page.

### 1.3 Fix the hidden Send button in the homepage form (UX, Conversion)
On a 1440x900 laptop screen, the right column on the homepage (booking card plus contact form)
is a sticky box with its own internal scrollbar (`.sticky` in styles.css line 156). The form is
cut off at the Message field, and the Send Message button is not visible unless the visitor
notices and scrolls inside that small box. The same thing happens on community pages such as
carlsbad.html. Screens 900px tall or shorter are very common on laptops.

Options, simplest first:
- Only make the column sticky on tall screens, for example wrap the sticky rule in
  `@media (min-height: 1000px)` and let it flow normally otherwise.
- Or shorten the sidebar form (drop the "I'm interested in" select or the message box on the
  homepage version) so it fits inside 900px.

### 1.4 Speed up the homepage on phones (Performance)
LCP and first paint are both 3.8 s on mobile, and the lead paragraph is the LCP element, so the
delay is all about getting text on screen. Lighthouse attributes about 1.3 s to render blocking
resources:
- **Google Fonts stylesheet** blocks rendering for about 850 ms (an extra connection to
  fonts.googleapis.com, then another to fonts.gstatic.com).
- **Newsreader font is 132 KB** because it includes the full optical size axis (`opsz 6..72`).
  Inter is another 48 KB.

Fix: self host both fonts in `/fonts/`, subset to Latin, drop the `opsz` axis (or pick one
optical size), add `<link rel="preload" as="font" crossorigin>` for the two files used above the
fold, and keep `font-display: swap`. Expected result: mobile performance in the low to mid 90s and
LCP near 2.5 s. This also removes two third party connections from every page load.

---

## Priority 2: High value improvements

### 2.1 SEO: use your sales on community pages
Every community page has around 1,000 words of solid, unique copy, which is good. None of them
show your own work in that area. tools/build_sales.py already generates cards from
data/transactions.json, so it could also write a "Homes I've helped buy and sell in Escondido"
block onto each matching community page (Escondido, Oceanside, Mission Beach and others you have
closed in). That is unique, local, first hand content Google rewards, and it is the best trust
signal for someone searching "Escondido realtor".

Also worth adding to each community page over time:
- A short market snapshot (median price, typical days on market) with the date it was pulled.
- One or two real photos of the area, with descriptive alt text and file names.

### 2.2 SEO: Google Business Profile and local signals
For "realtor near me" and "[city] real estate agent" searches, the Google Business Profile matters
more than anything on the website.
- Create or claim a Google Business Profile (service area business, no public address needed),
  list the service areas, and link it to aaronabrams.com.
- Add the profile URL to the `sameAs` list in the RealEstateAgent schema on every page.
- Ask recent clients for Google reviews in addition to Zillow.
- Keep name, phone, and brokerage identical across Google, Zillow, Instagram, LinkedIn, and the site.

### 2.3 SEO: fresh content
The site has no blog or market updates, so nothing changes between deploys. A monthly
"San Diego and North County market update" page (or one per focus area such as Oceanside and
Carlsbad) gives Google a reason to recrawl, gives you something to share on Instagram, and builds
pages that rank for "Oceanside housing market 2026" style searches.

### 2.4 Looks: match the hero scene to the page
The hero art is picked at random on every page load. On carlsbad.html the screenshot showed the
vineyard scene rather than the Carlsbad coast and flower fields scene that exists in js/scenes.js.
Pin the matching scene on the pages where one exists (Carlsbad, Encinitas, Point Loma, and the
inland wine country pages such as Fallbrook, Escondido, and Bonsall), and keep random selection
everywhere else. A small `data-scene` attribute on the hero, read by scenes.js, would do it.

### 2.5 Looks: hero text legibility
The hero copy sits directly on busy illustration. Examples from the screenshots:
- Home (Point Loma scene, desktop): the lead paragraph runs across sailboats and a kayaker, and the
  "San Diego County" trust chip overlaps the figures on the pier.
- Home (Carlsbad scene, mobile): "local insight, clear communication" crosses the bright sun, and
  "CA DRE #02074758" and "San Diego County" overlap the beachgoers.
- Sales (beach scene): the lead text and "See my Zillow profile" button sit on the swimmers.

Fix: add a soft dark gradient behind the left side of the hero copy (a scrim on `.scene-copy`), or
keep the busiest scene elements out of the left half. On phones, consider moving the trust chips
below the hero.

---

## Priority 3: Polish

### Performance
- **Header logo mark**: images/aaron-abrams-mark.png is 392x314 (12 KB) but displays at 37x30.
  Export an 80px wide version, or better, an inline SVG.
- **Portraits**: aaron-abrams-portrait.jpg and portrait-2.jpg are about 215 KB each at 1000px wide.
  Add WebP or AVIF versions with `srcset` so phones download about 40 to 60 KB.
- **Caching**: CSS and JS are sent with `max-age=0, must-revalidate`, so every page view revalidates
  8 files. Because every reference already carries a version (`styles.css?v=37`), these could be
  cached for a year with `immutable`, as long as the `?v=` number is bumped on every change. The
  comment in netlify.toml explains why this was turned off, so only do this if bumping versions
  becomes part of the routine (build_sales.py or a small script could do it automatically).
- **Hero art cost**: the homepage has about 1,800 DOM elements, mostly the SVG scene, and on a
  throttled phone Lighthouse measured 3.6 s of main thread work (style, layout, and paint). Ideas:
  draw the scene after first paint (`requestIdleCallback`), and on phones render the static still
  and skip life.js entirely.
- **Smooth scroll library (Lenis)**: loaded on every page for desktop users. It is a stylistic
  choice; some visitors find hijacked scrolling sluggish. Worth a quick gut check.

### Accessibility
- The "eyebrow" label on sand sections with a teal glow behind it measures 3.88:1 contrast
  (`#1a7699` on `#c9e6e4`); it needs 4.5:1. Darken the eyebrow color slightly, for example `#145f7c`.
- The header brand link's `aria-label` ("Aaron Abrams, Real Estate Advisor, home") does not start
  with its visible text the way voice control users expect. "Aaron Abrams Real Estate Advisor, home"
  would pass.
- The pale marquee words fail contrast, but the marquee is `aria-hidden` and decorative, so this is
  fine to leave.

### Technical SEO
- `/index.html` and `/about` (no extension) both return 200 alongside the canonical URLs. The
  canonical tags handle this, but internal links point at `index.html` while the canonical is `/`.
  Point the logo and breadcrumb "Home" links at `/`, and add a 301 from `/index.html` to `/` in
  netlify.toml.
- robots.txt blocks /thank-you.html, which also stops Google from reading its `noindex` tag. Not a
  problem today; if the page ever shows up in search, remove the Disallow line and let the noindex
  do the work.
- FAQPage structured data is fine to keep, but Google no longer shows FAQ rich results for most
  commercial sites, so do not expect it to change how listings look.
- Self review markup (AggregateRating on your own RealEstateAgent) is ignored by Google, so do
  not add it for stars in search. Google reviews on the Business Profile are the way to get stars.
- HSTS is on without `includeSubDomains`. Fine as is.

### Content and trust
- Zillow listing photos on sales.html, properties.html, and the homepage are hotlinked from
  photos.zillowstatic.com. If Zillow changes or removes a photo, the card breaks, and photo rights
  belong to the listing brokerages (the README already flags this). Getting permission and hosting
  the photos locally would remove both risks and make them faster.
- 3057 Walton Pl still needs a photo and a confirmed role (from the README).
- The homepage community carousel runs edge to edge while the rest of the page is inset. On
  desktop it reads as cut off on both sides. Starting the first card at the content edge would
  look more intentional.

### Forms and lead handling
- The Follow Up Boss function is solid: honeypot, length limits, matches by email or phone, clear
  tags. One small thing: it logs the lead's first and last name to Netlify function logs. Logging
  only the success status keeps personal info out of logs.
- Consider a short auto reply (Netlify form notification or a Follow Up Boss action plan) so the
  person gets an immediate "Got it, I'll be in touch today" text or email.

---

## What is already done well
- Unique, well sized titles and meta descriptions on every page, with no duplicates.
- One H1 per page, correct canonicals, Open Graph tags, and a large preview image everywhere.
- Rich structured data: RealEstateAgent with license credential and service areas,
  BreadcrumbList, Place, ItemList, and FAQPage, all valid JSON.
- Every indexable page is in sitemap.xml; no broken internal links or missing files.
- Every image has alt text; zero layout shift on all tested pages.
- AI crawlers are explicitly welcomed in robots.txt, and all text is in the HTML.
- Calendly loads only when needed, so it costs nothing on first load.
- Reduced motion is respected, and motion is lighter on phones.
- Security headers (nosniff, frame options, referrer policy, permissions policy, HSTS) are set.
- www and http both redirect to https://aaronabrams.com, and missing pages return a real 404.

## Suggested order of work
1. Analytics and conversion events (1.1)
2. Homepage reviews band (1.2)
3. Sticky sidebar form fix (1.3)
4. Self hosted, subset fonts (1.4)
5. Hero scrim and per page scenes (2.4, 2.5)
6. Contrast and aria-label fixes, logo mark and portrait images (Priority 3)
7. Sales on community pages (2.1), then Google Business Profile and monthly market updates (2.2, 2.3)
