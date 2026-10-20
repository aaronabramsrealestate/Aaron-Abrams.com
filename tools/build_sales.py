#!/usr/bin/env python3
"""Rebuild the sales sections of the site from data/transactions.json.

    python3 tools/build_sales.py

It rewrites the regions between <!-- name:start --> and <!-- name:end --> markers in:
  sales.html       sales:main    stats, charts, a card for every sale, and the full table
  properties.html  live, recent  current listing and the latest sales
  index.html       recent        the "Recently closed" cards

To add or correct a sale, edit its entry in data/transactions.json and run this again.
Fields: soldPrice, soldDate (YYYY-MM-DD), role (Buyer, Seller, Buyer and Seller, or null),
beds, baths, sqft, yearBuilt, type, mls, photoUrl (the listing's first photo), source, link.
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
    return '${:,}'.format(int(round(n)))


def short_money(n):
    return '$%.1fM' % (n / 1e6) if n >= 1e6 else '$%dK' % round(n / 1000)


def zurl(t):
    unit = re.sub(r'^Apt\b', 'APT', t['unit']) if t.get('unit') else ''
    slug = re.sub(r'[^A-Za-z0-9]+', '-', '%s %s %s CA %s' % (t['street'], unit, t['city'], t['zip'])).strip('-')
    return 'https://www.zillow.com/homedetails/%s/%s_zpid/' % (slug, t['zpid'])


def link_for(t):
    if t.get('zpid'):
        return zurl(t), 'View on Zillow'
    if t.get('link'):
        return t['link'], 'View on Redfin'
    return None, None


def when(t, short=True):
    if not t.get('soldDate'):
        return None
    y, m, d = t['soldDate'].split('-')
    return '%s %s' % (MON[int(m) - 1], y) if short else '%s %d, %s' % (MON[int(m) - 1], int(d), y)


def role_text(t):
    return {'Buyer': 'Represented the Buyer', 'Seller': 'Represented the Seller',
            'Buyer and Seller': 'Represented the Buyer and Seller'}.get(t.get('role'), 'Closed sale')


def street_line(t):
    return t['street'] + (' ' + t['unit'] if t.get('unit') else '')


def num(n):
    return '%g' % n


def sold_card(t, lightbox=True):
    badge = 'Sold %s' % when(t) if when(t) else 'Sold'
    facts = []
    if t.get('yearBuilt'): facts.append('Built %s' % t['yearBuilt'])
    if t.get('type'): facts.append(t['type'])
    if t.get('sqft') and t.get('soldPrice'): facts.append('$%s per sq ft' % '{:,}'.format(round(t['soldPrice'] / t['sqft'])))
    if t.get('hoaMonthly'): facts.append('HOA $%s a month' % '{:,}'.format(t['hoaMonthly']))
    stats = '<div class="sale-stats"><b>%s</b>' % money(t['soldPrice'])
    if t.get('beds'): stats += '<span>%s bd</span>' % num(t['beds'])
    if t.get('baths'): stats += '<span>%s ba</span>' % num(t['baths'])
    if t.get('sqft'): stats += '<span>{:,} sq ft</span>'.format(t['sqft'])
    stats += '</div>'
    if t.get('photoUrl'):
        ga = ' data-gallery="%s"' % E(t['photoUrl']) if lightbox else ''
        media = ('<div class="sale-media"%s><img src="%s" alt="%s, %s, sold" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">'
                 '<span class="sold-badge">%s</span><span class="ph-credit">Listing photo courtesy of the listing brokerage</span></div>') % (
            ga, E(t['photoUrl']), E(street_line(t)), E(t['city']), badge)
    else:
        media = '<div class="sale-media"><span class="sold-badge">%s</span><span class="ph-credit">Photo to be added</span></div>' % badge
    url, label = link_for(t)
    foot = ('<a href="%s" target="_blank" rel="noopener">%s</a>' % (E(url), label)) if url else ('MLS #%s' % E(t['mls']) if t.get('mls') else '')
    return ('<article class="sale" data-area="%s" data-role="%s">\n%s\n'
            '<div class="sale-body"><span class="sale-role">%s</span>\n<h3>%s</h3><p class="sale-area">%s, CA %s</p>\n%s%s'
            '<p class="sale-story">%s</p></div></article>') % (
        E(t['city']), E(role_text(t)), media, role_text(t), E(street_line(t)), E(t['city']), E(t['zip']), stats,
        ('<ul class="sale-facts">%s</ul>' % ''.join('<li>%s</li>' % E(f) for f in facts)) if facts else '', foot)


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
        E(p['city']), E(url), E(p['photoUrl']), E(p['street'] + ', ' + p['city']), E(p['street']), E(p['city']), E(p['zip']),
        money(p['price']), p['beds'], p['baths'], E(p['brokerage']), E(url))


def bars(rows, fmt=str, cls=''):
    maxv = max(v for _, v in rows) or 1
    out = ''
    for label, v in rows:
        out += '<div class="bar-row"><span class="bar-label">%s</span><span class="bar"><i style="width:%.1f%%"></i></span><b>%s</b></div>' % (
            E(label), 100.0 * v / maxv, fmt(v))
    return '<div class="bars%s">%s</div>' % ((' ' + cls) if cls else '', out)


def tally(items):
    d = {}
    for k in items: d[k] = d.get(k, 0) + 1
    return d


def main_region():
    priced = [t for t in TX if t.get('soldPrice')]
    prices = [t['soldPrice'] for t in priced]
    total = len(TX)
    volume = sum(prices)
    avg = volume / len(prices)
    med = statistics.median(prices)
    ppsf = [t['soldPrice'] / t['sqft'] for t in priced if t.get('sqft')]
    by_year = tally(t['soldDate'][:4] for t in priced if t.get('soldDate'))
    vol_year = {}
    for t in priced:
        if t.get('soldDate'): vol_year[t['soldDate'][:4]] = vol_year.get(t['soldDate'][:4], 0) + t['soldPrice']
    yr = sorted(by_year)
    year_rows = [('%s%s' % (y, ' so far' if y == yr[-1] else ''), by_year[y]) for y in yr]
    city_rows = sorted(tally(t['city'] for t in TX).items(), key=lambda kv: (-kv[1], kv[0]))
    bands = [('Under $600K', sum(1 for p in prices if p < 600000)), ('$600K to $999K', sum(1 for p in prices if 600000 <= p < 1000000)),
             ('$1M and up', sum(1 for p in prices if p >= 1000000))]
    roles = tally(t.get('role') or 'Not confirmed' for t in TX)
    side_label = {'Buyer': 'Buyer side', 'Seller': 'Seller side', 'Buyer and Seller': 'Both sides', 'Not confirmed': 'Not confirmed'}
    side_rows = [(side_label[k], roles[k]) for k in ('Buyer', 'Seller', 'Buyer and Seller', 'Not confirmed') if k in roles]
    types = tally(('condos' if t.get('type') == 'Condo' else 'houses') for t in TX if t.get('type'))
    type_note = ' and '.join('%d %s' % (v, k) for k, v in sorted(types.items(), key=lambda kv: -kv[1]))
    cities_in_order = []
    for t in TX:
        if t['city'] not in cities_in_order: cities_in_order.append(t['city'])
    count_city = lambda c: sum(1 for t in TX if t['city'] == c)
    chips = ('<button class="chip on" data-filter="all">All</button>'
             '<button class="chip" data-filter="Represented the Buyer">Buyer side</button>'
             '<button class="chip" data-filter="Represented the Seller">Seller side</button>' +
             ''.join('<button class="chip" data-filter="%s">%s</button>' % (E(c), E(c)) for c in sorted(cities_in_order, key=lambda c: -count_city(c))))
    cards = ''.join(live_card(p) for p in LIVE) + ''.join(sold_card(t) for t in TX)
    rows = ''
    for t in TX:
        url, _ = link_for(t)
        name = ('<a href="%s" target="_blank" rel="noopener">%s</a>' % (E(url), E(street_line(t)))) if url else E(street_line(t))
        rows += '<tr><td>%d</td><td>%s</td><td>%s, %s</td><td>%s</td><td>%s</td><td>%s</td></tr>' % (
            t['n'], name, E(t['city']), E(t['zip']), when(t, short=False) or '', money(t['soldPrice']), E(t.get('role') or 'To be confirmed'))
    trend = ', '.join('%d in %s' % (by_year[y], y) for y in reversed(yr))
    return '''<section><div class="wrap">
<div class="stat-row" data-stagger>
<div class="stat"><b>%(total)d</b><span>closed sales on Zillow, newest to oldest below</span></div>
<div class="stat"><b>%(vol)s</b><span>total sales volume across all %(total)d</span></div>
<div class="stat"><b>%(avg)s</b><span>average sale price, from %(lo)s to %(hi)s</span></div>
<div class="stat"><b>%(rating)s</b><span>Zillow rating, %(rc)d reviews</span></div>
</div>

<div class="section-head" style="margin-top:56px"><span class="eyebrow">At a glance</span><h2>Aaron&rsquo;s sales by the numbers</h2></div>
<div class="insights">
<div class="insight"><h3>Sales by year</h3>%(yearbars)s<p class="insight-note">Volume: %(yearnote)s</p></div>
<div class="insight"><h3>Where the %(total)d closings happened</h3>%(citybars)s</div>
<div class="insight"><h3>By price range</h3>%(bandbars)s<p class="insight-note">Median sale price %(med)s.</p></div>
<div class="insight"><h3>Which side Aaron represented</h3>%(sidebars)s<p class="insight-note">%(typenote)s among the sales with property details.</p></div>
</div>
<div class="stat-row three" data-stagger>
<div class="stat"><b>%(med)s</b><span>median sale price</span></div>
<div class="stat"><b>%(medppsf)s</b><span>median price per sq ft across %(nppsf)d homes</span></div>
<div class="stat"><b>%(cur)d</b><span>closed sales so far in %(curyear)s, up from %(prev)d in %(prevyear)s and %(prev2)d in %(prev2year)s</span></div>
</div>

<div class="section-head" style="margin-top:56px"><span class="eyebrow">Homes</span><h2>Current listing and every closed sale</h2></div>
<div class="chips" role="group" aria-label="Filter sales">%(chips)s</div>
<div class="grid g3 sales-grid" data-stagger>%(cards)s</div>

<div class="section-head" style="margin-top:56px"><span class="eyebrow">Full history</span><h2>Every closed sale at a glance</h2><p>Newest first.</p></div>
<div class="tx-wrap"><table class="tx"><thead><tr><th>#</th><th>Property</th><th>City</th><th>Closed</th><th>Sold price</th><th>Aaron represented</th></tr></thead><tbody>%(rows)s</tbody></table></div>
<p class="note" style="margin-top:22px">These are the %(total)d closed sales on Aaron Abrams&rsquo;s <a href="%(z)s" target="_blank" rel="noopener">Zillow profile</a>. Sales shown are transactions in which Aaron Abrams represented the buyer, the seller, or both, as noted; the role reads &ldquo;To be confirmed&rdquo; where it has not been verified. Closed prices are public record. Prices, dates and details come from the San Diego MLS, Redfin and Zillow, and the %(total)d prices add up to %(volfull)s, an average of %(avgfull)s. Anything marked &ldquo;For sale now&rdquo; is a current listing, not a closed sale. Listing photos are courtesy of the listing brokerages. Data as of %(asof)s.</p>
</div></section>
''' % dict(total=total, vol=short_money(volume), volfull=money(volume), avg=short_money(avg), avgfull=money(avg),
           lo='$%dK' % round(min(prices) / 1000), hi='$%.2fM' % (max(prices) / 1e6), rating='%.1f' % Z['rating'], rc=Z['reviewCount'],
           yearbars=bars(year_rows), yearnote=' &middot; '.join('%s %s' % (y, short_money(vol_year[y])) for y in yr),
           citybars=bars(city_rows), bandbars=bars(bands), med=money(med), sidebars=bars(side_rows), typenote=type_note,
           medppsf='$%s' % '{:,}'.format(round(statistics.median(ppsf))), nppsf=len(ppsf), cur=by_year[yr[-1]], curyear=yr[-1], prev=by_year[yr[-2]], prevyear=yr[-2], prev2=by_year[yr[-3]], prev2year=yr[-3],
           chips=chips, cards=cards, rows=rows, asof=when({'soldDate': D['asOf']}, short=False), z=ZPROFILE)


def swap(path, name, new):
    p = os.path.join(ROOT, path)
    s = open(p, encoding='utf-8').read()
    pat = re.compile(r'(<!-- %s:start -->).*?(<!-- %s:end -->)' % (name, name), re.S)
    if not pat.search(s):
        sys.exit('no %s markers in %s' % (name, path))
    s = pat.sub(lambda m: m.group(1) + '\n' + new + '\n' + m.group(2), s, count=1)
    open(p, 'w', encoding='utf-8').write(s)


if __name__ == '__main__':
    carded = [t for t in TX if t.get('photoUrl')]
    swap('sales.html', 'sales:main', main_region())
    swap('properties.html', 'live', '<div class="grid g3 sales-grid">%s</div>' % ''.join(live_card(p) for p in LIVE))
    swap('properties.html', 'recent', '<div class="grid g3 sales-grid" data-stagger>%s</div>' % ''.join(sold_card(t, False) for t in carded[:3]))
    swap('index.html', 'recent', '<div class="grid g3 sales-grid" data-stagger>%s</div>' % (
        ''.join(live_card(p) for p in LIVE) + ''.join(sold_card(t, False) for t in carded[:2])))
    print('built: %d sales, %d with photos' % (len(TX), len(carded)))
