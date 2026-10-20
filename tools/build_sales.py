#!/usr/bin/env python3
"""Rebuild the sales sections of the site from data/transactions.json.

    python3 tools/build_sales.py

It rewrites the regions between <!-- name:start --> and <!-- name:end --> markers in:
  sales.html       sales:main    stats, charts, a card for every sale, and the full table
  properties.html  live, recent  current listing and the latest sales
  index.html       recent        the "Recently closed" cards
  <community>.html area-sales    the sales in that community, on its community guide page

To add or correct a sale, edit its entry in data/transactions.json and run this again.
Fields: soldPrice, soldDate (YYYY-MM-DD), role (Buyer, Seller, Buyer and Seller, or null),
beds, baths, sqft, yearBuilt, type, mls, photoUrl (the listing's first photo), source, link,
community (the community page the sale belongs on, such as "oceanside" for oceanside.html, or null).
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


def columns(rows):
    """Vertical column chart. rows: (label, count, note)."""
    maxv = max(c for _, c, _ in rows) or 1
    out = ''
    for label, c, note in rows:
        out += ('<div class="col%s"><b>%d</b><i style="height:%dpx"></i><span>%s</span><small>%s</small></div>'
                % (' now' if label == rows[-1][0] else '', c, max(28, round(200.0 * c / maxv)), E(label), note))
    return '<div class="cols">%s</div>' % out


def segments(rows):
    """One stacked bar with a legend. rows: (label, count)."""
    total = sum(v for _, v in rows) or 1
    bar = ''.join('<i class="s%d" style="flex:%d" title="%s: %d"></i>' % (n, v, E(l), v) for n, (l, v) in enumerate(rows))
    legend = ''.join('<li><span class="dot s%d"></span>%s<b>%d</b></li>' % (n, E(l), v) for n, (l, v) in enumerate(rows))
    return '<div class="seg" role="img" aria-label="%s">%s</div><ul class="seg-key">%s</ul>' % (
        E(', '.join('%s %d of %d' % (l, v, total) for l, v in rows)), bar, legend)


def last_12_months(rows):
    y, m, d = (int(x) for x in D['asOf'].split('-'))
    cutoff = '%04d-%02d-%02d' % (y - 1, m, d)
    return sum(1 for t in rows if t.get('soldDate') and t['soldDate'] >= cutoff)


FEATURED = 5  # latest closed sales shown before "Show all"


def main_region():
    priced = [t for t in TX if t.get('soldPrice')]
    prices = [t['soldPrice'] for t in priced]
    total = len(TX)
    volume = sum(prices)
    med = statistics.median(prices)
    ppsf = [t['soldPrice'] / t['sqft'] for t in priced if t.get('sqft')]
    by_year = tally(t['soldDate'][:4] for t in priced if t.get('soldDate'))
    vol_year = {}
    for t in priced:
        if t.get('soldDate'): vol_year[t['soldDate'][:4]] = vol_year.get(t['soldDate'][:4], 0) + t['soldPrice']
    yr = sorted(by_year)
    year_cols = [('%s%s' % (y, ' so far' if y == yr[-1] else ''), by_year[y], short_money(vol_year[y])) for y in yr]
    city_rows = sorted(tally(t['city'] for t in TX).items(), key=lambda kv: (-kv[1], kv[0]))
    bands = [('Under $600K', sum(1 for p in prices if p < 600000)), ('$600K to $999K', sum(1 for p in prices if 600000 <= p < 1000000)),
             ('$1M and up', sum(1 for p in prices if p >= 1000000))]
    roles = tally(t['role'] for t in TX if t.get('role'))
    side_label = {'Buyer': 'Buyers', 'Seller': 'Sellers', 'Buyer and Seller': 'Both sides'}
    side_rows = [(side_label[k], roles[k]) for k in ('Buyer', 'Seller', 'Buyer and Seller') if k in roles]
    cities_in_order = []
    for t in TX:
        if t['city'] not in cities_in_order: cities_in_order.append(t['city'])
    count_city = lambda c: sum(1 for t in TX if t['city'] == c)
    chips = ('<button class="chip on" data-filter="all">All</button>'
             '<button class="chip" data-filter="Represented the Buyer">Buyer side</button>'
             '<button class="chip" data-filter="Represented the Seller">Seller side</button>' +
             ''.join('<button class="chip" data-filter="%s">%s</button>' % (E(c), E(c)) for c in sorted(cities_in_order, key=lambda c: -count_city(c))[:4]))
    # Cards: the current listing and every sale with a photo. Newest few show first, the rest open with "Show all".
    carded = [t for t in TX if t.get('photoUrl')]
    card_html = [live_card(p) for p in LIVE] + [sold_card(t) for t in carded]
    first = len(LIVE) + FEATURED
    cards = ''.join(c if i < first else c.replace('<article class="sale"', '<article class="sale later"', 1) for i, c in enumerate(card_html))
    more = len(card_html) - first
    rows = ''
    for t in TX:
        url, _ = link_for(t)
        name = ('<a href="%s" target="_blank" rel="noopener">%s</a>' % (E(url), E(street_line(t)))) if url else E(street_line(t))
        rows += '<tr><td>%s, %s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>' % (
            name, E(t['city']), when(t, short=False) or '', money(t['soldPrice']), E({'Buyer': 'Buyer', 'Seller': 'Seller', 'Buyer and Seller': 'Buyer and seller'}.get(t.get('role'), '')),
            ('{:,} sq ft'.format(t['sqft']) if t.get('sqft') else ''))
    area_pills = ''.join('<li><b>%d</b> %s</li>' % (v, E(k)) for k, v in city_rows)
    return '''<section><div class="wrap">
<div class="stat-row" data-stagger>
<div class="stat"><b>%(total)d</b><span>closed sales</span></div>
<div class="stat"><b>%(vol)s</b><span>in total sales volume</span></div>
<div class="stat"><b>%(l12)d</b><span>homes closed in the last 12 months</span></div>
<div class="stat"><b>%(rating)s<em>&#9733;</em></b><span>on Zillow, %(rc)d client reviews</span></div>
</div>

<div class="section-head" style="margin-top:64px"><span class="eyebrow">The track record</span><h2>Busier every year</h2><p>A snapshot of Aaron&rsquo;s closed sales: how the business is growing, what Aaron sells, and who he works with.</p></div>
<div class="dash">
<div class="insight dash-year"><h3>Closings per year</h3>%(yearcols)s</div>
<div class="insight dash-price"><h3>Typical home</h3>
<p class="big"><b>%(med)s</b><span>median sale price</span></p>
<p class="big sm"><b>%(medppsf)s</b><span>median price per sq ft</span></p>
<p class="seg-cap">Closed sales by price range</p>%(bandseg)s</div>
<div class="insight dash-side"><h3>Buyers and sellers</h3><p class="seg-cap">Who Aaron represented</p>%(sideseg)s<p class="insight-note">Aaron works both sides of the table.</p></div>
<div class="insight dash-where"><h3>Where Aaron closes</h3><ul class="pills">%(areas)s</ul></div>
</div>

<div class="section-head" style="margin-top:64px"><span class="eyebrow">Homes</span><h2>Recent sales and current listing</h2></div>
<div class="chips" role="group" aria-label="Filter sales">%(chips)s</div>
<div class="grid g3 sales-grid" data-stagger>%(cards)s</div>
<p class="more-wrap"><button class="btn btn-light more-btn" type="button" data-more>Show all %(ncards)d closed sales</button></p>

<details class="tx-details"><summary>View every closed sale as a list</summary>
<div class="tx-wrap"><table class="tx"><thead><tr><th>Property</th><th>Closed</th><th>Sold price</th><th>Represented</th><th>Size</th></tr></thead><tbody>%(rows)s</tbody></table></div></details>
<p class="note" style="margin-top:22px">Closed sales on Aaron Abrams&rsquo;s <a href="%(z)s" target="_blank" rel="noopener">Zillow profile</a>, in which he represented the buyer, the seller, or both. Closed prices are public record, and prices, dates and details come from the San Diego MLS, Redfin and Zillow. The %(total)d sales add up to %(volfull)s, an average of %(avgfull)s. Anything marked &ldquo;For sale now&rdquo; is a current listing, not a closed sale. Listing photos are courtesy of the listing brokerages. Data as of %(asof)s.</p>
</div></section>
''' % dict(total=total, vol=short_money(volume), volfull=money(volume), avgfull=money(volume / len(prices)), l12=last_12_months(priced),
           rating='%.1f' % Z['rating'], rc=Z['reviewCount'], yearcols=columns(year_cols), med=money(med),
           medppsf='$%s' % '{:,}'.format(round(statistics.median(ppsf))), bandseg=segments(bands), sideseg=segments(side_rows),
           areas=area_pills, chips=chips, cards=cards, ncards=len(carded), rows=rows,
           asof=when({'soldDate': D['asOf']}, short=False), z=ZPROFILE)


def area_region(slug, sales):
    """The "homes I've helped clients buy and sell" block on a community guide page."""
    page = open(os.path.join(ROOT, slug + '.html'), encoding='utf-8').read()
    name = html.unescape(re.search(r'<h2>([^<]*) FAQ</h2>', page).group(1))
    words = {1: 'One home', 2: 'Two homes', 3: 'Three homes', 4: 'Four homes', 5: 'Five homes'}
    homes = words.get(len(sales), '%d homes' % len(sales))
    return ('<div class="area-sales"><h2>Homes I&rsquo;ve helped clients buy and sell in %s</h2>\n'
            '<p>%s I closed here, straight from my transaction history. <a href="sales.html">See all %d sales</a>.</p>\n'
            '<div class="grid g2 sales-grid">%s</div></div>') % (
        E(name), homes, len(TX),
        ''.join(sold_card(t, False) for t in sales))


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
    areas = {}
    for t in TX:
        if t.get('community'): areas.setdefault(t['community'], []).append(t)
    for slug, sales in sorted(areas.items()):
        swap(slug + '.html', 'area-sales', area_region(slug, sales))
    print('built: %d sales, %d with photos, %d community pages' % (len(TX), len(carded), len(areas)))
