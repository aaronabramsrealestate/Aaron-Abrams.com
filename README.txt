RICKY HEIDT REALTOR WEBSITE
===========================

WHAT'S IN THIS FOLDER
  repo root             The website itself: *.html, styles.css, main.js,
                        js/, images/, downloads/, sitemap.xml, robots.txt
  netlify/functions/    The Follow Up Boss connection (runs on Netlify, not in the browser)
  netlify.toml          Tells Netlify where the site and the connection live

GO LIVE (free, about 10 minutes, no coding)
Use GitHub so the Follow Up Boss connection works. Netlify's drag and drop deploy
does not run functions, so leads would not reach Follow Up Boss that way.

The GitHub repository already exists: rickyheidt/rickyheidt.com. Steps 1 and 2 are done.

3. Make a free account at app.netlify.com. Click Add new site > Import an existing project >
   GitHub, and pick rickyheidt/rickyheidt.com. Leave the settings as they are and click Deploy.
4. Turn on forms: Site configuration > Forms > Enable form detection, then
   Deploys > Trigger deploy > Deploy site.
5. Email alerts: Site configuration > Notifications > Emails and webhooks >
   Form submission notifications > Add notification > Email notification > ricky@porchlightsocal.com

CONNECT FOLLOW UP BOSS
1. In Follow Up Boss: Admin > API > Create API Key. Copy it.
2. In Netlify: Site configuration > Environment variables > Add a variable.
   Key: FUB_API_KEY     Value: paste your key. Save.
3. Deploys > Trigger deploy > Deploy site (so the key takes effect).
4. Test: submit the contact form on your live site with your own info. Within a minute you
   should see a new lead in Follow Up Boss with the source "rickyheidt.com".
   If not, check Netlify > Logs > Functions > submission-created for the error message.

HOW LEADS FLOW
- Every form submission is saved in Netlify under Forms (your backup copy).
- You get an email alert (after step 5 above).
- The lead is created in Follow Up Boss automatically, matched to an existing contact by
  email or phone so you don't get duplicates.
    Contact form   -> "General Inquiry" (or "Seller Inquiry" if they picked selling)
    Home value     -> "Seller Inquiry" with the address, beds, baths, and timeline
    Guide download -> "Registration" with where they're moving from and their timeline
    Tags           -> Website Lead, Website Contact or Home Value Request, and the page
                      they came from (for example "Web: Carmel Valley")
- In Follow Up Boss you can set a Lead Flow rule for source "rickyheidt.com" to
  assign the lead and start an action plan automatically.

RELOCATION GUIDE (LEAD MAGNET)
- Landing page: relocation-guide.html. Visitors fill out the form, then land on
  guide-download.html with the download button and a link to book a relocation call.
- The PDF lives in downloads/. The download page and PDF are hidden from Google.
  Like any lead magnet on a simple site, someone could still share the direct link.
- In Follow Up Boss, filter by the "Relocation Guide" tag to follow up with downloaders.

UPDATING THE SITE LATER
Change files in the GitHub repository (or ask Claude to) and Netlify redeploys automatically.

CONNECT THE DOMAIN rickyheidt.com
Every page in this site already points at https://rickyheidt.com (canonical tags, social
share tags, sitemap.xml, robots.txt, and the Follow Up Boss lead source). Nothing in the
files needs changing. What is left happens in Netlify and at your domain registrar.

1. In Netlify: Site configuration > Domain management > Add a domain. Enter rickyheidt.com
   and click Verify, then Add domain. Netlify adds www.rickyheidt.com at the same time and
   redirects it to the bare domain.
2. Netlify then shows you how to point the domain. Pick one of these two:

   Option A, Netlify DNS (simpler, recommended). Netlify gives you four nameservers that
   look like dns1.p01.nsone.net. At your registrar, replace the existing nameservers with
   those four. Netlify then handles all DNS records for you.

   Option B, keep your current DNS. At your registrar, create:
     A record     @     75.2.60.5
     CNAME        www   <your-site-name>.netlify.app
   Use the exact values Netlify shows you on that screen, not these, in case they change.

3. Wait for DNS to propagate. Usually under an hour, up to 48 hours in the worst case.
   Netlify's Domain management page shows "Netlify DNS" or a green check when it is live.
4. HTTPS: Site configuration > Domain management > HTTPS > Verify DNS configuration, then
   Provision certificate. Free Let's Encrypt certificate, renews itself.
5. Confirm https://rickyheidt.com loads, and that http:// and www. both redirect to it.

IF YOU USE A DIFFERENT DOMAIN LATER
- Find and replace "https://rickyheidt.com" across the repo, including sitemap.xml and
  robots.txt, and update SOURCE in netlify/functions/submission-created.mjs.
- Leave the social links alone. The handle rickytherealtorsd is your Instagram, Facebook,
  and TikTok username, not a domain.

AFTER LAUNCH
- Google Search Console: add the site and submit sitemap.xml.
- Bing Webmaster Tools: import from Search Console (this feeds ChatGPT search).
- Update the website link on Google Business Profile, Bing Places, Zillow, Instagram, and Facebook.

MOTION AND EFFECTS
- Animation libraries live in js/vendor (GSAP, ScrollTrigger, Lenis). GSAP is free for commercial use.
- All motion code is in js/effects.js. Particles adapt to screen size and pause off screen.
- Visitors with "reduce motion" turned on get a calm, static version. Phones get a lighter version.
- All text stays in the HTML, so search engines and AI tools read every page normally.
