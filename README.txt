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
  properties.html       Listings, selected past sales, home search (placeholders until real content exists)
  investment.html       Investment and property potential
  neighborhoods.html    Interactive map and all community guides (one page per community)
  resources.html        Practical guides
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
  3. Scheduling link. "Schedule a Consultation" buttons go to the form on contact.html.
     If you want a booking calendar (for example Calendly), add the link and ask for the
     buttons to be switched over.
  4. Reviews and past sales. Only add testimonials and transactions that are verified and
     used with permission. Confirm photo permissions for any listing images.
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

AFTER LAUNCH
- Google Search Console: add the site and submit sitemap.xml.
- Bing Webmaster Tools: import from Search Console.
- Update the website link on Zillow, Instagram, LinkedIn, and Google Business Profile.

HERO ARTWORK
- Four original scenes (Encinitas sign, Carlsbad coast and flower fields, vineyards, Point Loma and
  Shelter Island) live in js/scenes.js. One is drawn into the top of every page, and a different
  one is picked each time the page loads. Add ?scene=1 to 4 to the address to force one.

MOTION AND EFFECTS
- Animation libraries live in js/vendor (GSAP, ScrollTrigger, Lenis).
- All motion code is in js/effects.js. Visitors with "reduce motion" turned on get a
  calm, static version, and phones get a lighter version.
- All text stays in the HTML, so search engines and AI tools read every page normally.
