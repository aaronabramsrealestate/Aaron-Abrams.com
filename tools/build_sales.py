#!/usr/bin/env python3
"""Rebuild the sales sections of the site from data/transactions.json.

    python3 tools/build_sales.py

It rewrites the regions between <!-- name:start --> and <!-- name:end --> markers in:
  sales.html       sales:main    stats, charts, cards, and the table of every closed sale
  properties.html  live, recent  current listing and the latest sales
  index.html       recent        the "Recently closed" cards

To add or update a sale, edit its entry in data/transactions.json (price, date, role, beds,
baths, sqft, yearBuilt, type, hoaMonthly, photo) and run this again. "photo" is the Zillow image id,
the long hex string in https://photos.zillowstatic.com/fp/<id>-p_h.jpg.
"""
import html
import json
import os
import re
import statistics
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = json.load(open(os.path.join(ROOT, 'data', 'transactions.json')))
TX = D['transactions']
LIVE = D['liveListings']
Z = D['zillowTotals']
ZPROFILE = 'https://www.zillow.com/profile/aaronabramsrealtor'
MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
E = lambda s: html.escape(str(s), quote=True)


def money(n):
    return '${:,}'.format(int(n))


def photo(pid, size='p_h'):
    return 'https://photos.zillowstatic.com/fp/%s-%s.jpg' % (pid, size)


def zurl(t):
    unit = re.sub(r'^Apt\b', 'APT', t['unit']) if t.get('unit') else ''
    slug = re.sub(r'[^A-Za-z0-9]+', '-', '%s %s %s CA %s' % (t['street'], unit, t['city'], t['zip'])).strip('-')
    slug = re.sub(r'-+', '-', slug)
    return 'https://www.zillow.com/homedetails/%s/%s_zpid/' % (slug, t['zpid'])


def when(t, short=True):
    if not t.get('soldDate'):
        return None
    y, m, d = t['soldDate'].split('-')
    return '%s %s' % (MON[int(m) - 1], y) if short else '%s %d, %s' % (MON[int(m) - 1], int(d), y)


def role_text(t):
    r = t.get('role')
    return {'Buyer': 'Represented the Buyer', 'Seller': 'Represented the Seller',
            'Buyer and Seller': 'Represented the Buyer and Seller'}.get(r, 'Closed sale')


def street_line(t):
    return t['street'] + (' ' + t['unit'] if t.get('unit') else '')


def sold_card(t, lightbox=True):
    ga = ' data-gallery="%s"' % E(photo(t['photo'])) if lightbox else ''
    badge = 'Sold %s' % when(t) if when(t) else 'Sold'
    facts = []
    if t.get('yearBuilt'): facts.append('Built %s' % t['yearBuilt'])
    if t.get('type'): facts.append(t['type'])
    if t.get('sqft') and t.get('soldPrice'): facts.append('$%s per sq ft' % '{:,}'.format(round(t['soldPrice'] / t['sqft'])))
    if t.get('hoaMonthly'): facts.append('HOA $%s a month' % '{:,}'.format(t['hoaMonthly']))
    stats = '<div class="sale-stats"><b>%s</b>' % money(t['soldPrice'])
    if t.get('beds'): stats += '<span>%s bd</span>' % t['beds']
    if t.get('baths'): stats += '<span>%s ba</span>' % t['baths']
    if t.get('sqft'): stats += '<span>{:,} sq ft</span>'.format(t['sqft'])
    stats += '</div>'
    return ('<article class="sale" data-area="%s" data-role="%s">\n<div class="sale-media"%s>'
            '<img src="%s" alt="%s, %s, sold" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">'
            '<span class="sold-badge">%s</span><span class="ph-credit">Listing photo courtesy of the listing brokerage</span></div>\n'
            '<div class="sale-body"><span class="sale-role">%s</span>\n<h3>%s</h3><p class="sale-area">%s, CA %s</p>\n%s%s'
            '<p class="sale-story"><a href="%s" target="_blank" rel="noopener">View on Zillow</a></p></div></article>') % (
        E(t['city']), E(role_text(t)), ga, E(photo(t['photo'])), E(street_line(t)), E(t['city']), badge, role_text(t),
        E(street_line(t)), E(t['city']), E(t['zip']), stats,
        ('<ul class="sale-facts">%s</ul>' % ''.join('<li>%s</li>' % E(f) for f in facts)) if facts else '', E(zurl(t)))


def live_card(p):
    url = 'https://www.zillow.com/homedetails/%s/%s_zpid/' % (
        re.sub(r'[^A-Za-z0-9]+', '-', '%s %s CA %s' % (p['street'], p['city'], p['zip'])).strip('-'), p['zpid'])
    return ('<article class="sale" data-area="%s" data-role="Current listing">\n'
            '<a class="sale-media" href="%s" target="_blank" rel="noopener">'
            '<img src="%s" alt="%s, for sale" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">'
            '<span class="sold-badge live">For sale now</span><span class="ph-credit">Listing photo from Zillow</span></a>\n'
            '<div class="sale-body"><span class="sale-role">Current listing</span>\n<h3>%s</h3><p class="sale-area">%s, CA %s</p>\n'
            '<div class="sale-stats"><b>%s</b><span>%s bd</span><span>%s ba</span><span>{:,} sq ft</span></div>\n'
            '<p class="sale-story">Listed with %s. <a href="%s" target="_blank" rel="noopener">See the full listing and photos on Zillow</a>, or <a href="contact.html#consultation">ask Aaron about a showing</a>.</p></div></article>').format(p['sqft']) % (
        E(p['city']), E(url), E(photo(p['photo'])), E(p['street'] + ', ' + p['city']), E(p['street']), E(p['city']), E(p['zip']),
        money(p['price']), p['beds'], p['baths'], E(p['brokerage']), E(url))


def bars(rows, fmt=str, maxv=None, cls=''):
    maxv = maxv or max(v for _, v in rows)
    out = ''
    for label, v in rows:
        out += '<div class="bar-row"><span class="bar-label">%s</span><span class="bar"><i style="width:%.1f%%"></i></span><b>%s</b></div>' % (
            E(label), 100.0 * v / maxv, fmt(v))
    return '<div class="bars%s">%s</div>' % ((' ' + cls) if cls else '', out)


def main_region():
    known = [t for t in TX if t.get('soldPrice')]
    carded = [t for t in TX if t.get('photo')]
    cities = {}
    for t in TX: cities[t['city']] = cities.get(t['city'], 0) + 1
    city_rows = sorted(cities.items(), key=lambda kv: (-kv[1], kv[0]))
    price_rows = [(street_line(t), t['soldPrice']) for t in sorted(known, key=lambda x: -x['soldPrice'])]
    ppsf = [t['soldPrice'] / t['sqft'] for t in known if t.get('sqft')]
    implied = Z['totalSales'] * Z['averagePrice']
    roles = {}
    for t in TX:
        if t.get('role'): roles[t['role']] = roles.get(t['role'], 0) + 1
    role_rows = [(k, roles[k]) for k in ('Buyer', 'Seller', 'Buyer and Seller') if k in roles]
    chip_cities = []
    for t in carded:
        if t['city'] not in chip_cities: chip_cities.append(t['city'])
    chips = '<button class="chip on" data-filter="all">All</button>' + ''.join(
        '<button class="chip" data-filter="%s">%s</button>' % (E(c), E(c)) for c in chip_cities)
    cards = ''.join(live_card(p) for p in LIVE) + ''.join(sold_card(t) for t in carded)
    rows = ''
    for t in TX:
        pr = money(t['soldPrice']) if t.get('soldPrice') else '<span class="muted">To be added</span>'
        dt = when(t, short=False) or '<span class="muted">To be added</span>'
        rl = (t.get('role') or '') or '<span class="muted">To be added</span>'
        link = ('<a href="%s" target="_blank" rel="noopener">%s</a>' % (E(zurl(t)), E(street_line(t)))) if t.get('zpid') else E(street_line(t))
        rows += '<tr><td>%d</td><td>%s</td><td>%s, %s</td><td>%s</td><td>%s</td><td>%s</td></tr>' % (
            t['n'], link, E(t['city']), E(t['zip']), dt, pr, rl)
    return '''<section><div class="wrap">
<div class="stat-row" data-stagger>
<div class="stat"><b>%(total)d</b><span>total sales reported on Zillow</span></div>
<div class="stat"><b>%(l12)d</b><span>sales in the last 12 months</span></div>
<div class="stat"><b>%(avg)s</b><span>average sale price, from %(range)s</span></div>
<div class="stat"><b>%(rating)s</b><span>Zillow rating, %(rc)d reviews</span></div>
</div>

<div class="section-head" style="margin-top:56px"><span class="eyebrow">At a glance</span><h2>Aaron&rsquo;s sales by the numbers</h2></div>
<div class="insights">
<div class="insight"><h3>Where the %(total)d closings happened</h3>%(citybars)s<p class="insight-note">Counted from Aaron&rsquo;s full list of closed sales on Zillow.</p></div>
<div class="insight"><h3>Closed prices on file (%(nknown)d of %(total)d)</h3>%(pricebars)s<p class="insight-note">The rest are being added to the table below.</p></div>
</div>
<div class="stat-row three" data-stagger>
<div class="stat"><b>~$%(vol).1fM</b><span>estimated total sales volume (%(total)d sales at Zillow&rsquo;s %(avg)s average)</span></div>
<div class="stat"><b>%(medppsf)s</b><span>median price per sq ft across the %(nppsf)d homes with full details</span></div>
<div class="stat"><b>%(nroles)d of %(total)d</b><span>sales have a confirmed role so far: %(rolesline)s</span></div>
</div>

<div class="section-head" style="margin-top:56px"><span class="eyebrow">Homes</span><h2>Current listing and closed sales</h2></div>
<div class="chips" role="group" aria-label="Filter sales">%(chips)s</div>
<div class="grid g3 sales-grid" data-stagger>%(cards)s</div>

<div class="section-head" style="margin-top:56px"><span class="eyebrow">Full history</span><h2>Every closed sale on Zillow</h2><p>Newest first. Details are filled in as they are confirmed.</p></div>
<div class="tx-wrap"><table class="tx"><thead><tr><th>#</th><th>Property</th><th>City</th><th>Closed</th><th>Sold price</th><th>Aaron represented</th></tr></thead><tbody>%(rows)s</tbody></table></div>
<p class="note" style="margin-top:22px">Zillow reports %(total)d closed sales for Aaron Abrams, listed above. Sales shown are transactions in which Aaron Abrams represented the buyer, the seller, or both, as noted. Closed prices are public record and are shown as reported on Zillow. Anything marked &ldquo;For sale now&rdquo; is a current listing, not a closed sale. Listing photos are courtesy of the listing brokerages. Data as of %(asof)s, from Aaron&rsquo;s <a href="%(z)s" target="_blank" rel="noopener">Zillow profile</a>.</p>
</div></section>
''' % dict(total=Z['totalSales'], l12=Z['salesLast12Months'], avg='$%dK' % round(Z['averagePrice'] / 1000), range=Z['priceRangeLabel'],
           rating='%.1f' % Z['rating'], rc=Z['reviewCount'], citybars=bars(city_rows), pricebars=bars(price_rows, money, cls='price'),
           nknown=len(known), vol=implied / 1e6, medppsf='$%s' % '{:,}'.format(round(statistics.median(ppsf))), nppsf=len(ppsf),
           rolesline=', '.join('%d %s' % (v, {'Buyer': 'buyer side', 'Seller': 'seller side', 'Buyer and Seller': 'both sides'}[k]) for k, v in role_rows) if role_rows else 'none yet', nroles=sum(roles.values()),
           chips=chips, cards=cards, rows=rows, asof=when({'soldDate': D['asOf']}, short=False), z=ZPROFILE)


def swap(path, name, new, wrap_re=None):
    p = os.path.join(ROOT, path)
    s = open(p, encoding='utf-8').read()
    pat = re.compile(r'(<!-- %s:start -->).*?(<!-- %s:end -->)' % (name, name), re.S)
    if pat.search(s):
        s = pat.sub(lambda m: m.group(1) + '\n' + new + '\n' + m.group(2), s, count=1)
    elif wrap_re:
        m = re.search(wrap_re, s, re.S)
        if not m:
            sys.exit('cannot find %s in %s' % (name, path))
        s = s[:m.start(1)] + '<!-- %s:start -->\n%s\n<!-- %s:end -->' % (name, new, name) + s[m.end(1):]
    else:
        sys.exit('no marker %s in %s' % (name, path))
    open(p, 'w', encoding='utf-8').write(s)


if __name__ == '__main__':
    carded = [t for t in TX if t.get('photo')]
    swap('sales.html', 'sales:main', main_region(),
         r'(<section><div class="wrap">\n<div class="stat-row".*?</div></section>\n)(?=<section class="bio">)')
    swap('properties.html', 'live', '<div class="grid g3 sales-grid">%s</div>' % ''.join(live_card(p) for p in LIVE),
         r'<h2>Current listing</h2></div>\n(<div class="grid g3 sales-grid">.*?</article></div>)')
    swap('properties.html', 'recent', '<div class="grid g3 sales-grid" data-stagger>%s</div>' % ''.join(sold_card(t, False) for t in carded[:3]),
         r'<h2>Homes I&rsquo;ve helped clients buy and sell</h2></div>\n(<div class="grid g3 sales-grid" data-stagger>.*?</article></div>)')
    swap('index.html', 'recent', '<div class="grid g3 sales-grid" data-stagger>%s</div>' % (
        ''.join(live_card(p) for p in LIVE) + ''.join(sold_card(t, False) for t in carded[:2])),
         r'<h2>Keys handed over across San Diego County</h2>.*?</div>\n(<div class="grid g3 sales-grid" data-stagger>.*?</article></div>)')
    print('built: %d sales, %d with full details' % (len(TX), len(carded)))
