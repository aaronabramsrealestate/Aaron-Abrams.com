AARON ABRAMS REAL ESTATE WEBSITE
================================

WHAT'S IN THIS REPOSITORY
  repo root             The website itself: *.html, styles.css, main.js, js/, images/,
                        sitemap.xml, robots.txt
  netlify/functions/    The Follow Up Boss connection (runs on Netlify, not in the browser)
  netlify.toml          Tells Netlify where the site and the connection live

PAGES
  index.html            Home
  about.html            About Aaron
  buy.html, sell.html   Buyer and seller process
  properties.html       Current listing and home search (IDX pending)
  sales.html            Market trends (data/market.json), current listing, and Zillow reviews
  investment.html       Investment and property potential
  neighborhoods.html    Interactive map and all community guides (one page per community)
  resources.html        Practical guides
  services.html         PorchLight partners (31 Beaches, Goosehead, Home Warranty of America),
                        vendor referrals, and selling as-is for a cash offer
  reviews.html          Verified testimonials (empty until reviews are approved)
  faq.html, contact.html, home-value.html, thank-you.html, 404.html

STILL TO CONFIRM OR SUPPLY BEFORE LAUNCH
  1. Domain. Every page currently points at https://aaronabrams.com (canonical tags,
     social share tags, sitemap.xml, robots.txt, and the Follow Up Boss lead source in
     netlify/functions/submission-created.mjs). If the real domain is different,
     find and replace "aaronabrams.com" across the repo.
  2. Photos and logo. The real headshots and logo are in images/ (aaron-abrams-portrait.jpg,
     aaron-abrams-portrait-2.jpg, aaron-abrams-logo-light.png, aaron-abrams-logo-dark.png, and
     the AA monogram aaron-abrams-mark*.png). The favicons and the link preview image
     (images/og-image.jpg) were generated from the logo and can be swapped for designed versions.
  3. Scheduling link. Every "Schedule a Consultation" style button opens the booking calendar at
     https://calendly.com/aaronabrams/sandiego in a popup, and contact.html also has the calendar built in.
     If that Calendly event is ever switched off or loses its calendar connection, visitors see
     "This calendar is currently unavailable", so keep the event on and the calendar connected.
     The two web forms (contact and home-value) are the backup way to reach Aaron.
  4. Market numbers, listings and reviews. Aaron's own closed sales and production totals are NOT shown (the page shows PorchLight team figures from RealTrends instead, in data/market.json under "team")
     on the site (he will show them once he reaches $50M in production). The sales.html "Market Trends"
     page, the numbers band on the homepage and properties page, and the current listing cards come from
     data/market.json (county figures, update monthly from SDAR/MLS reports) and the liveListings and
     zillowTotals in data/transactions.json. After editing, run: python3 tools/build_sales.py
     The closed-sale records stay in data/transactions.json, unused, for later.
  5. MLS / IDX. properties.html says a search will be added once an approved MLS/IDX
     service is connected. Update it when that happens.
  6. Brokerage disclosures and branding. Confirm the footer text and any team branding
     required by PorchLight Realty and eXp Realty.
  7. Social links. Instagram, LinkedIn, and Zillow are linked. Add others if wanted.

GO LIVE ON NETLIFY (free)
Use GitHub so the Follow Up Boss connection works. Netlify's drag and drop deploy does
not run functions.
1. Make a free account at app.netlify.com. Add new site > Import an existing project >
   GitHub, pick this repository, leave the settings as they are, and click Deploy.
2. Turn on forms: Site configuration > Forms > Enable form detection, then
   Deploys > Trigger deploy > Deploy site.
3. Email alerts: Site configuration > Notifications > Emails and webhooks >
   Form submission notifications > Add notification > Email notification.

CONNECT FOLLOW UP BOSS
1. In Follow Up Boss: Admin > API > Create API Key. Copy it.
2. In Netlify: Site configuration > Environment variables > Add a variable.
   Key: FUB_API_KEY     Value: paste the key. Save.
3. Deploys > Trigger deploy > Deploy site (so the key takes effect).
4. Test by submitting the contact form on the live site. Within a minute a new lead
   should appear in Follow Up Boss with the source "aaronabrams.com". If not, check
   Netlify > Logs > Functions > submission-created for the error message.

HOW LEADS FLOW
- Every form submission is saved in Netlify under Forms (a backup copy).
- The lead is created in Follow Up Boss, matched to an existing contact by email or phone.
    Contact form   -> "General Inquiry" (or "Seller Inquiry" if they picked selling)
    Home value     -> "Seller Inquiry" with the address, beds, baths, and timeline
    Tags           -> Website Lead, Website Contact or Home Value Request, and the page
                      they came from (for example "Web: Buy")

CONNECT THE DOMAIN
1. In Netlify: Site configuration > Domain management > Add a domain.
2. Follow the DNS instructions Netlify shows (Netlify DNS is simplest).
3. After DNS propagates, provision the free HTTPS certificate in the same screen.

ANALYTICS
- The Google tag (Google Analytics 4, G-7LHDBV3NSV) is at the top of every page's <head>.
  New pages need the same snippet, and only one copy per page.
- main.js sends these events to it: generate_lead (a form was sent), book_consultation
  (a Calendly booking), open_calendar, click_call, click_text, click_email, click_zillow.
  In Google Analytics: Admin > Events, mark generate_lead and book_consultation (and the
  call and text clicks if wanted) as key events so they count as conversions.
- Link Google Analytics to Search Console: Admin > Product links > Search Console links.

AFTER LAUNCH
- Google Search Console: add the site and submit sitemap.xml.
- Bing Webmaster Tools: import from Search Console.
- Update the website link on Zillow, Instagram, LinkedIn, and Google Business Profile.

HERO ARTWORK
- Four original scenes (Encinitas sign, Carlsbad coast and flower fields, vineyards, Point Loma and
  Shelter Island) live in js/scenes.js. One is drawn into the top of every page, and a different
  one is picked each time the page loads. Add ?scene=1 to 4 to the address to force one.
  Community pages with a matching scene always show it (data-scene-pick on the hero): Carlsbad,
  Encinitas, Point Loma and Ocean Beach, and the vineyard scene on Fallbrook, Bonsall and Escondido.
- js/life.js animates each scene: traffic and pedestrians on the Encinitas street, beachgoers and
  surfers at Carlsbad, grape pickers, a truck and a tractor in the vineyard, and boats, a kayaker and
  a paddleboarder at Point Loma. It pauses when the hero is off screen and shows a still frame for
  visitors who prefer reduced motion.

FONTS
- Newsreader and Inter are served from fonts/ (Latin only, trimmed to the weights the site uses)
  instead of Google Fonts, so text shows up faster. To change fonts, replace those two files and
  the @font-face lines at the top of styles.css.

MOTION AND EFFECTS
- Animation libraries live in js/vendor (GSAP, ScrollTrigger, Lenis).
- All motion code is in js/effects.js. Visitors with "reduce motion" turned on get a
  calm, static version, and phones get a lighter version.
- All text stays in the HTML, so search engines and AI tools read every page normally.
