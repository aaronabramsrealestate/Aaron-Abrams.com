#!/usr/bin/env python3
"""Rebuild the market and listing sections of the site.

    python3 tools/build_sales.py

Reads data/market.json (county market figures, update monthly) and data/transactions.json (current
listings, Zillow rating). It rewrites the regions between <!-- name:start --> and <!-- name:end --> markers in:
  sales.html       sales:main    market headline numbers, current listings and the market report
  properties.html  live          current listing
  index.html       recent        current listing card
  index.html,      metrics       the headline numbers band under the banner
  properties.html
  <community>.html area-sales    emptied (closed sales are not shown publicly)

Closed sales and production totals are deliberately not published. Their data stays in
data/transactions.json for when Aaron decides to show them.
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
M = json.load(open(os.path.join(ROOT, 'data', 'market.json')))
AREA_PAGES = ['carlsbad', 'city-heights', 'escondido', 'fallbrook', 'mission-beach', 'north-park', 'ocean-beach', 'oceanside',
              'rancho-bernardo', 'rancho-penasquitos', 'vista']
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


def pct(n):
    return '%s%.1f%%' % ('+' if n > 0 else '-' if n < 0 else '', abs(n))


def scorecard():
    """Market headline numbers, shown first on the market page."""
    return ('<div class="stat-row six" data-stagger>'
            '<div class="stat"><b>%s</b><span>median sale price (%s)</span></div>'
            '<div class="stat"><b>%s</b><span>median, houses (%s)</span></div>'
            '<div class="stat"><b>%s</b><span>median, condos and townhomes (%s)</span></div>'
            '<div class="stat"><b>%d</b><span>median days on market</span></div>'
            '<div class="stat"><b>%.1f</b><span>months of supply</span></div>'
            '<a class="stat" href="#for-sale"><b>%d</b><span>for sale now</span></a>'
            '</div>') % (short_money(M['medianPrice']), pct(M['medianPriceYoY']), short_money(M['detachedMedian']), pct(M['detachedYoY']),
                         short_money(M['attachedMedian']), pct(M['attachedYoY']), M['daysOnMarket'], M['monthsOfSupply'], len(LIVE))


def metrics_band():
    """The short version of the scorecard, right under the homepage and properties banners."""
    return ('<a class="metrics-band" href="sales.html#numbers">'
            '<span class="mb-item"><b>%s</b>San Diego County median price</span>'
            '<span class="mb-item"><b>%d</b>median days on market</span>'
            '<span class="mb-item"><b>%.1f</b>months of supply</span>'
            '<span class="mb-item"><b>%.1f&#9733;</b>from %d Zillow reviews</span>'
            '<span class="mb-go">See the market report <span aria-hidden="true">&rarr;</span></span></a>') % (
        short_money(M['medianPrice']), M['daysOnMarket'], M['monthsOfSupply'], Z['rating'], Z['reviewCount'])


def main_region():
    sources = ', '.join('<a href="%s" target="_blank" rel="noopener">%s</a>' % (E(x['url']), E(x['label'])) for x in M['sources'])
    price_rows = [('Houses', M['detachedMedian']), ('All homes', M['medianPrice']), ('Condos and townhomes', M['attachedMedian'])]
    dom_cols = [('Sep 2025', M['daysOnMarketLastYear'], 'days on market'), ('Sep 2026', M['daysOnMarket'], 'days on market')]
    change_rows = [('Median sale price', M['medianPriceYoY']), ('Active listings', M['activeListingsYoY']),
                   ('Closed sales', M['closedSalesYoY']), ('Pending sales', M['pendingSalesYoY'])]
    changes = ''.join('<li><b>%s</b> %s</li>' % (pct(v), E(k)) for k, v in change_rows)
    return '''<section><div class="wrap">
%(scorecard)s
<nav class="jump" aria-label="On this page"><a href="#for-sale">For sale now</a><a href="#numbers">Market trends</a><a href="#reviews">Reviews</a></nav>

<div class="section-head" id="for-sale" style="margin-top:56px"><span class="eyebrow">Current listings</span><h2>For sale now</h2></div>
<div class="grid g3 sales-grid live-grid">%(livecards)s</div>

<div class="section-head" id="numbers" style="margin-top:64px"><span class="eyebrow">PorchLight market report</span><h2>San Diego County, %(asof)s</h2><p>Where prices, pace and inventory are heading, so you can plan your move with real numbers.</p></div>
<div class="dash">
<div class="insight dash-year"><h3>Homes are selling a little faster</h3>%(domcols)s<p class="insight-note">Median days on market, countywide.</p></div>
<div class="insight dash-price"><h3>Median sale price by home type</h3>%(pricebars)s<p class="insight-note">Houses are rising while condos and townhomes are flat.</p></div>
<div class="insight dash-side"><h3>Change from a year ago</h3><ul class="pills">%(changes)s</ul><p class="insight-note">Fewer homes are changing hands, and prices are holding steady.</p></div>
<div class="insight dash-where"><h3>What it means for you</h3><p>With about %(supply).1f months of supply, the market sits between a buyer&rsquo;s and a seller&rsquo;s market. Well-priced, well-prepared homes still move, and buyers have more room to negotiate on condos and townhomes. A home value review or a buyer strategy call shows how these numbers apply to your neighborhood.</p></div>
</div>
<p class="note" style="margin-top:22px">Countywide figures for %(asof)s, compiled from MLS-based market reports: %(sources)s. Sources round differently, so figures can vary slightly between reports. This is general market information, not a prediction, and individual neighborhoods and homes vary.</p>
</div></section>
''' % dict(scorecard=scorecard(), asof=M['asOf'], domcols=columns(dom_cols), pricebars=bars(price_rows, fmt=lambda v: short_money(v)),
           changes=changes, supply=M['monthsOfSupply'], sources=sources,
           livecards=''.join(live_card(p) for p in LIVE) or '<p>No active listings right now. <a href="contact.html">Ask Aaron</a> about homes coming soon.</p>')


def swap(path, name, new):
    p = os.path.join(ROOT, path)
    s = open(p, encoding='utf-8').read()
    pat = re.compile(r'(<!-- %s:start -->).*?(<!-- %s:end -->)' % (name, name), re.S)
    if not pat.search(s):
        sys.exit('no %s markers in %s' % (name, path))
    s = pat.sub(lambda m: m.group(1) + '\n' + new + '\n' + m.group(2), s, count=1)
    open(p, 'w', encoding='utf-8').write(s)


if __name__ == '__main__':
    swap('sales.html', 'sales:main', main_region())
    swap('properties.html', 'live', '<div class="grid g3 sales-grid">%s</div>' % ''.join(live_card(p) for p in LIVE))
    swap('index.html', 'recent', '<div class="grid g3 sales-grid" data-stagger>%s</div>' % ''.join(live_card(p) for p in LIVE))
    swap('index.html', 'metrics', metrics_band())
    swap('properties.html', 'metrics', metrics_band())
    for slug in AREA_PAGES:
        swap(slug + '.html', 'area-sales', '')
    print('built: market report, %d live listing(s)' % len(LIVE))
