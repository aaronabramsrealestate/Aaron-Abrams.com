/* Neighborhood map for neighborhoods.html.
 * An illustrated map of the San Diego coast: every community is its own colored shape.
 * Hover an area to light it up, click it to zoom in, then pick a neighborhood for details
 * and a link to its guide. Once zoomed in, drag (or use the arrow keys) to move around.
 * Hand drawn and simplified, with no tiles and no outside library.
 */
(function () {
  'use strict';
  var root = document.getElementById('hood-map');
  var dataEl = document.getElementById('hood-map-data');
  if (!root || !dataEl) return;

  var NS = 'http://www.w3.org/2000/svg';
  var data = JSON.parse(dataEl.textContent);
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Five areas, five colors, taken from the site palette: coral, sage, indigo, teal and amber.
  var AREAS = {
    coast:   { name: 'North County Coast',    color: '#e2725b', blurb: 'Beach cities from Del Mar to Oceanside, linked by I-5 and the Coaster train.' },
    inland:  { name: 'North County Inland',   color: '#7f9d5a', blurb: 'Foothill and valley communities along SR-78, SR-76 and I-15, from Rancho Santa Fe and Poway to Fallbrook.' },
    central: { name: 'Central San Diego',     color: '#5668b3', blurb: 'The urban core and the neighborhoods around Downtown, Balboa Park and Mission Valley.' },
    beach:   { name: 'Beach and Bay',         color: '#2596be', blurb: 'Ocean and bayfront communities from La Jolla south to Point Loma and Coronado.' },
    north:   { name: 'North City and Inland', color: '#d99a2b', blurb: 'The north side of the City of San Diego, from University City to Rancho Bernardo.' }
  };
  var ORDER = ['coast', 'inland', 'central', 'beach', 'north'];
  var UNINC = { 'rancho-santa-fe': 1, fallbrook: 1, bonsall: 1 };   // governed by the county, not a city
  // Where each area's name sits on the full map (lat, lon). Written in the sea or open land beside it.
  // ---- Geography: [lat, lon]. Simplified on purpose; a guide to where things are, not a survey. ----
  var BB = { n: 33.43, s: 32.53, w: -117.60, e: -116.95 }, H = 1000;
  var W = Math.round(H * (BB.e - BB.w) * Math.cos(33 * Math.PI / 180) / (BB.n - BB.s));
  function P(lat, lon) { return [(lon - BB.w) / (BB.e - BB.w) * W, (BB.n - lat) / (BB.n - BB.s) * H]; }
  function path(arr, close) { return arr.map(function (p, i) { var q = P(p[0], p[1]); return (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('') + (close ? 'Z' : ''); }

  var COAST = [[33.43, -117.64], [33.385, -117.595], [33.35, -117.545], [33.31, -117.50], [33.27, -117.435], [33.235, -117.405], [33.215, -117.395], [33.195, -117.385], [33.18, -117.362], [33.16, -117.355], [33.145, -117.347], [33.12, -117.335], [33.09, -117.312], [33.07, -117.31], [33.04, -117.298], [33.015, -117.283], [32.99, -117.272], [32.96, -117.266], [32.93, -117.262], [32.90, -117.258], [32.86, -117.262], [32.852, -117.272], [32.83, -117.28], [32.81, -117.278], [32.795, -117.258], [32.77, -117.255], [32.75, -117.255], [32.735, -117.256], [32.70, -117.25], [32.668, -117.243]];
  // San Diego Bay shoreline, from the bay side of Point Loma around to the South Bay. The bay is drawn as part of
  // the ocean, so the water flows past the tip of Point Loma the way the harbor entrance does.
  var BAY = [[32.6706, -117.2379], [32.70, -117.232], [32.716, -117.236], [32.72, -117.205], [32.714, -117.178], [32.70, -117.162], [32.67, -117.128], [32.64, -117.107], [32.612, -117.10], [32.58, -117.095]];
  var COVER = [[33.43, -117.33], [33.43, -116.98], [32.93, -116.98], [32.93, -117.05], [32.69, -117.05], [32.69, -117.228], [32.655, -117.228], [32.655, -117.35], [33.26, -117.50], [33.26, -117.33]];
  

  // Major destinations: [name, lat, lon, icon, shown on the full map, neighborhoods it is near, one line about it]
  var DESTS = [
    ['Downtown San Diego', 32.7157, -117.1611, 'star', 1, ['downtown-san-diego', 'little-italy'], 'The city center, with the waterfront, the Gaslamp Quarter and Petco Park.'],
    ['San Diego International Airport', 32.7338, -117.1933, 'plane', 1, ['little-italy', 'point-loma', 'downtown-san-diego'], 'The region\'s main commercial airport, on the bay between Little Italy and Point Loma.'],
    ['Balboa Park and San Diego Zoo', 32.7341, -117.1470, 'tree', 1, ['hillcrest', 'north-park', 'south-park', 'university-heights', 'downtown-san-diego'], 'A large city park with museums, gardens and the San Diego Zoo.'],
    ['Petco Park', 32.7076, -117.1570, 'stadium', 0, ['downtown-san-diego'], 'The downtown ballpark and home of the San Diego Padres.'],
    ['SeaWorld San Diego', 32.7648, -117.2266, 'star', 0, ['pacific-beach', 'mission-beach'], 'A marine theme park on Mission Bay.'],
    ['Snapdragon Stadium', 32.7837, -117.1197, 'stadium', 0, ['mission-valley'], 'The Mission Valley stadium that is home to San Diego State football.'],
    ['UC San Diego', 32.8801, -117.2340, 'cap', 1, ['la-jolla', 'university-city'], 'The University of California campus in La Jolla.'],
    ['Torrey Pines State Natural Reserve', 32.9236, -117.2569, 'tree', 0, ['del-mar', 'la-jolla'], 'Coastal trails, sandstone bluffs and the rare Torrey pine.'],
    ['Del Mar Fairgrounds', 32.9761, -117.2579, 'pin', 0, ['del-mar'], 'Home of the San Diego County Fair and the Del Mar racetrack.'],
    ['LEGOLAND California', 33.1260, -117.3117, 'star', 1, ['carlsbad'], 'A family theme park in Carlsbad.'],
    ['Oceanside Pier', 33.1936, -117.3837, 'anchor', 0, ['oceanside'], 'The long wooden pier at the foot of downtown Oceanside.'],
    ['San Diego Zoo Safari Park', 33.0970, -116.9967, 'tree', 1, ['escondido'], 'A wildlife park in the San Pasqual Valley near Escondido.'],
    ['Hotel del Coronado', 32.6809, -117.1786, 'star', 0, ['coronado'], 'The landmark 1888 beachfront resort on Coronado Beach.'],
    ['Cabrillo National Monument', 32.6736, -117.2410, 'anchor', 0, ['point-loma'], 'A national monument at the tip of Point Loma, with bay views and tide pools.']
  ].map(function (d, i) { var q = P(d[1], d[2]); return { i: i, n: d[0], x: q[0], y: q[1], icon: d[3], major: !!d[4], near: d[5], b: d[6] }; });
  var ICONS = {
    star: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z',
    plane: 'M21 15v-2l-8-5V3.5a1.5 1.5 0 00-3 0V8l-8 5v2l8-2.5V18l-2 1.5V21l3.5-1 3.5 1v-1.5L13 18v-5.5z',
    tree: 'M12 3l5 8h-3l4 6H6l4-6H7zM11 17h2v4h-2z',
    cap: 'M12 4L2 9l10 5 8-4v6h2V9zM6 13.2v3.3c0 1.2 2.7 2.5 6 2.5s6-1.300 6-2.500v-3.300l-6 3z',
    stadium: 'M3 9c0-1.700 4-3 9-3s9 1.300 9 3v6c0 1.700-4 3-9 3s-9-1.300-9-3zm2 .6v1.200c1.300.8 3.700 1.400 7 1.400s5.700-.6 7-1.400V9.600C17.700 10.400 15.300 11 12 11s-5.700-.6-7-1.400z',
    pin: 'M12 2.500a6.500 6.500 0 00-6.500 6.500c0 4.700 6.500 12 6.500 12s6.500-7.300 6.500-12A6.500 6.500 0 0012 2.500zm0 8.800A2.300 2.300 0 1112 6.700a2.300 2.300 0 010 4.600z',
    anchor: 'M12 2.500a2.800 2.800 0 00-.9 5.400V10H8v2h3.100v7.500A6.500 6.500 0 015.500 13H3.500a8.500 8.500 0 0017 0h-2a6.500 6.500 0 01-5.600 6.500V12H16v-2h-3.100V7.900A2.800 2.800 0 0012 2.500zm0 1.900a.9.900 0 110 1.800.9.900 0 010-1.800z'
  };

  function svgNS(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function html(tag, cls, parent, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; if (parent) parent.appendChild(e); return e; }

  var byslug = {}, idx = {}; ORDER.forEach(function (g) { idx[g] = 0; });
  data.forEach(function (d) {
    byslug[d.s] = d; d.hay = (d.n + ' ' + d.b + ' ' + d.z + ' ' + AREAS[d.g].name).toLowerCase();
    d.fill = AREAS[d.g].color;
    var q = P(d.lat, d.lon); d.x = q[0]; d.y = q[1];
  });
  var count = {}; ORDER.forEach(function (g) { count[g] = data.filter(function (d) { return d.g === g; }).length; });

  var regionsBar = root.querySelector('.hm-regions'), svgHost = root.querySelector('.hm-svg'), card = root.querySelector('.hm-card'), list = root.querySelector('.hm-list');
  var state = { area: null, sel: null, dest: null, q: '' };
  var stage = root.querySelector('.hm-stage'), tip = html('div', 'hm-tip', stage); tip.hidden = true;

  // ---- build the static map once ----
  var svg = svgNS('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'group', 'aria-label': 'Illustrated map of San Diego County communities. Choose an area, then a neighborhood. When zoomed in, drag the map or use the arrow keys to move around, and the plus and minus keys to zoom.', focusable: 'false' }, svgHost);
  var defs = svgNS('defs', {}, svg), og = svgNS('linearGradient', { id: 'hmsea', x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
  svgNS('stop', { offset: 0, 'stop-color': '#4d9fd2' }, og); svgNS('stop', { offset: 1, 'stop-color': '#8ccbea' }, og);
  svgNS('rect', { x: -W, y: -H, width: W * 3, height: H * 3, fill: '#ebe8e2' }, svg);
  var clip = svgNS('clipPath', { id: 'hmcover' }, defs); svgNS('path', { d: path(COVER, true) }, clip);
  var gCells = svgNS('g', { 'clip-path': 'url(#hmcover)' }, svg);
  var oceanPts = [[34, -118.6]].concat(COAST).concat(BAY).concat([[32.40, -117.09], [32.40, -118.6]]);
  svgNS('path', { d: path(oceanPts, true), fill: 'url(#hmsea)' }, svg);
  // Communities that sit out in the water (Coronado) are drawn above the sea instead of under it.
  var gIsland = svgNS('g', {}, svg), islands = data.filter(function (d) { return d.i; });
  [path(COAST.concat(BAY))].concat(islands.map(function (d) { return path(d.c, true); })).forEach(function (d) {
    svgNS('path', { d: d, fill: 'none', stroke: '#1b2a38', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
  });
  var scaled = [];   // things drawn at a constant pixel size: [element, x, y]
  var gDeco = svgNS('g', { 'pointer-events': 'none' }, svg), gAreaLabels = svgNS('g', { 'pointer-events': 'none' }, svg), gLabels = svgNS('g', { 'pointer-events': 'none' }, svg), gDests = svgNS('g', {}, svg);
  [['PACIFIC OCEAN', 33.02, -117.50, '#fff', .75], ['CAMP PENDLETON', 33.33, -117.43, '#a89a82', 1], ['SOUTH BAY', 32.585, -117.04, '#a89a82', 1]].forEach(function (n) {
    var g = svgNS('g', {}, gDeco), t = svgNS('text', { 'class': 'hm-name', x: 0, y: 0, 'text-anchor': 'middle', fill: n[3], 'fill-opacity': n[4] }, g); t.textContent = n[0];
    var q = P(n[1], n[2]); scaled.push([g, q[0], q[1]]);
  });

  var cellEls = {}, labelEls = {}, areaLabelEls = {}, destEls = [], gEdges, selOutline;
  data.forEach(function (d) {
    var el = svgNS('path', { 'class': 'hm-cell', d: path(d.c, true), fill: d.fill, stroke: d.fill, 'data-s': d.s, 'data-g': d.g, tabindex: -1, role: 'button', 'aria-label': d.n }, d.i ? gIsland : gCells);
    el.addEventListener('click', function () { onCell(d); });
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCell(d); } });
    el.addEventListener('mouseenter', function () { onHover(d, true); });
    el.addEventListener('mouseleave', function () { onHover(d, false); });
    el.addEventListener('focus', function () { onHover(d, true); });
    el.addEventListener('blur', function () { onHover(d, false); });
    cellEls[d.s] = el;
    var lg = svgNS('g', {}, gLabels), t = svgNS('text', { 'class': 'hm-label', x: 0, y: 0 }, lg); t.textContent = d.n; lg._t = t; labelEls[d.s] = lg;
    scaled.push([lg, d.x, d.y]);
  });
  // Borders: thin lines between neighborhoods of one area, bold lines where one area meets another.
  (function () {
    var edges = {};
    data.forEach(function (d) {
      var c = d.c;
      for (var i = 0; i < c.length; i++) {
        var a = c[i], b = c[(i + 1) % c.length], ka = a[0] + ',' + a[1], kb = b[0] + ',' + b[1], key = ka < kb ? ka + '|' + kb : kb + '|' + ka;
        (edges[key] = edges[key] || { a: a, b: b, g: {} }).g[d.g] = 1;
      }
    });
    var thin = '', bold = '';
    Object.keys(edges).forEach(function (k) {
      var e = edges[k], pa = P(e.a[0], e.a[1]), pb = P(e.b[0], e.b[1]), seg = 'M' + pa[0].toFixed(1) + ' ' + pa[1].toFixed(1) + 'L' + pb[0].toFixed(1) + ' ' + pb[1].toFixed(1);
      if (Object.keys(e.g).length > 1) bold += seg; else thin += seg;
    });
    gEdges = svgNS('g', { 'clip-path': 'url(#hmcover)', 'pointer-events': 'none' }, svg);
    svgNS('path', { 'class': 'hm-edge', d: thin, fill: 'none' }, gEdges);
    svgNS('path', { 'class': 'hm-edge hm-edge-bold', d: bold, fill: 'none' }, gEdges);
    selOutline = svgNS('path', { 'class': 'hm-sel', d: '', fill: 'none' }, gEdges);
    svg.insertBefore(gEdges, gCells.nextSibling);
  })();
  ORDER.forEach(function (g) { areaLabelEls[g] = document.createElementNS(NS, 'g'); });
  // destinations: small round badges that stay the same size at every zoom
  DESTS.forEach(function (d) {
    var g = svgNS('g', { 'class': 'hm-dest' + (d.major ? ' major' : ''), tabindex: 0, role: 'button', 'aria-label': d.n + ', destination' }, gDests);
    svgNS('circle', { r: 15, fill: 'transparent' }, g);
    svgNS('circle', { 'class': 'hm-dest-c', r: 11.5 }, g);
    svgNS('path', { 'class': 'hm-dest-i', d: ICONS[d.icon], transform: 'translate(-7 -7) scale(.58)' }, g);
    var lab = svgNS('g', { 'class': 'hm-dest-l' }, g), w = Math.round(d.n.length * 6.5 + 18);
    svgNS('rect', { x: 0, y: -11, width: w, height: 22, rx: 11 }, lab); var t = svgNS('text', { x: 9, y: 4 }, lab); t.textContent = d.n; lab._w = w;
    var cnt = svgNS('g', { 'class': 'hm-dest-n', transform: 'translate(10 -10)' }, g); svgNS('circle', { r: 8 }, cnt); d.cntT = svgNS('text', { x: 0, y: 3.5 }, cnt);
    d.el = g; d.lab = lab; d.w = w; d.cnt = cnt; scaled.push([g, d.x, d.y]);
    function act() { if (d.group && d.group.length > 1) zoomGroup(d.group); else onDest(d); }
    g.addEventListener('click', act);
    g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
    g.addEventListener('mouseenter', function () { g.classList.add('show'); gDests.appendChild(g); });
    g.addEventListener('mouseleave', function () { g.classList.remove('show'); });
    g.addEventListener('focus', function () { g.classList.add('show'); });
    g.addEventListener('blur', function () { g.classList.remove('show'); });
  });

  // ---- viewport: the camera is the svg viewBox, and text and badges keep a constant pixel size ----
  var view = { x: 0, y: 0, w: W, h: H }, anim = null, MIN_W = W / 12;
  // Where the map sits on screen. The svg keeps the map's shape, so one scale fits both axes.
  function frame() {
    var r = svg.getBoundingClientRect(), w = r.width || 440, h = r.height || w * H / W, s = Math.min(w / view.w, h / view.h);
    return { x: r.left + (w - view.w * s) / 2, y: r.top + (h - view.h * s) / 2, s: s, w: view.w * s, h: view.h * s };
  }
  // Keep the camera on the map: never zoomed out past the whole map, never dragged off its edges.
  function clampView(v) {
    var w = Math.max(MIN_W, Math.min(W, v.w)), h = w * H / W;
    return { x: Math.max(0, Math.min(W - w, v.x)), y: Math.max(0, Math.min(H - h, v.y)), w: w, h: h };
  }
  function zoomed() { return view.w < W - .5; }
  function applyView() {
    svg.setAttribute('viewBox', view.x.toFixed(1) + ' ' + view.y.toFixed(1) + ' ' + view.w.toFixed(1) + ' ' + view.h.toFixed(1));
    var k = 1 / frame().s;
    scaled.forEach(function (s) { s[0].setAttribute('transform', 'translate(' + s[1].toFixed(1) + ' ' + s[2].toFixed(1) + ') scale(' + k.toFixed(4) + ')'); });
    syncControls();
  }
  function boxFor(area) {
    if (!area) return { x: 0, y: 0, w: W, h: H };
    var xs = [], ys = [];
    data.filter(function (d) { return d.g === area; }).forEach(function (d) {
      var a = P(d.lat + d.rad, d.lon - d.rad / .84), b2 = P(d.lat - d.rad, d.lon + d.rad / .84); xs.push(a[0], b2[0]); ys.push(a[1], b2[1]);
    });
    var x0 = Math.min.apply(0, xs), x1 = Math.max.apply(0, xs), y0 = Math.min.apply(0, ys), y1 = Math.max.apply(0, ys);
    var aspect = W / H, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, w = (x1 - x0) * 1.15, h = (y1 - y0) * 1.15;
    if (w / h < aspect) w = h * aspect; else h = w / aspect;
    if (w >= W || h >= H) return { x: 0, y: 0, w: W, h: H };
    return { x: Math.max(0, Math.min(W - w, cx - w / 2)), y: Math.max(0, Math.min(H - h, cy - h / 2)), w: w, h: h };
  }
  function homeBox() { return boxFor(state.q ? null : state.area); }
  function sameBox(a, b) { return Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1 && Math.abs(a.w - b.w) < 1; }
  function inView(p, m) { m = m || 0; return p.x > view.x + view.w * m && p.x < view.x + view.w * (1 - m) && p.y > view.y + view.h * m && p.y < view.y + view.h * (1 - m); }
  function centerOn(p, w) { w = w || view.w; return clampView({ x: p.x - w / 2, y: p.y - w * H / W / 2, w: w }); }
  function stopAnim() { if (anim) { cancelAnimationFrame(anim); anim = null; } root.classList.remove('hm-anim'); }
  function goTo(box, done, dur) {
    stopAnim(); box = clampView(box);
    if (reduce.matches) { view = box; applyView(); done && done(); return; }
    var from = view, t0 = null, zooming = Math.abs(box.w - from.w) > .5;
    dur = dur || 560;
    if (zooming) { gLabels.style.opacity = 0; root.classList.add('hm-anim'); }
    function step(ts) {
      if (t0 === null) t0 = ts;
      var u = Math.min(1, (ts - t0) / dur), e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      view = { x: from.x + (box.x - from.x) * e, y: from.y + (box.y - from.y) * e, w: from.w + (box.w - from.w) * e, h: from.h + (box.h - from.h) * e };
      applyView();
      if (u < 1) anim = requestAnimationFrame(step); else { anim = null; root.classList.remove('hm-anim'); done && done(); }
    }
    anim = requestAnimationFrame(step);
  }
  function zoomBy(f) { goTo(centerOn({ x: view.x + view.w / 2, y: view.y + view.h / 2 }, view.w / f), placeLabels, 320); }

  // ---- zoom controls, over the ocean in the lower left corner ----
  var zoomBar = html('div', 'hm-zoom', svgHost); zoomBar.setAttribute('role', 'group'); zoomBar.setAttribute('aria-label', 'Map zoom');
  function zbtn(label, icon, fn) {
    var b = html('button', 'hm-zb', zoomBar); b.type = 'button'; b.setAttribute('aria-label', label); b.title = label;
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' + icon + '"/></svg>';
    b.addEventListener('click', function () { if (b.getAttribute('aria-disabled') !== 'true') fn(); });
    return b;
  }
  var zIn = zbtn('Zoom in', 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z', function () { zoomBy(1.6); });
  var zOut = zbtn('Zoom out', 'M5 11h14v2H5z', function () { zoomBy(1 / 1.6); });
  var zHome = zbtn('Reset the map view', 'M4 9V4h5v2H6v3zm11-5h5v5h-2V6h-3zM4 15h2v3h3v2H4zm14 3v-3h2v5h-5v-2z', function () { goTo(homeBox(), placeLabels); });
  function syncControls() {
    var z = zoomed();
    root.classList.toggle('zoomed', z);
    // Zoomed in, one finger drags the map. On the full map, a swipe scrolls the page as usual.
    svg.style.touchAction = z ? 'none' : 'pan-y pinch-zoom';
    zIn.setAttribute('aria-disabled', view.w <= MIN_W + .5 ? 'true' : 'false');
    zOut.setAttribute('aria-disabled', z ? 'false' : 'true');
    zHome.setAttribute('aria-disabled', sameBox(view, clampView(homeBox())) ? 'true' : 'false');
  }
  var how = document.createElement('p'); how.className = 'hm-how';
  how.textContent = window.matchMedia('(pointer: coarse)').matches
    ? 'Tap an area or the + button to zoom in, then drag with one finger to look around or pinch to zoom.'
    : 'Click an area or the + button to zoom in, then drag the map to look around.';
  stage.insertBefore(how, stage.querySelector('.hm-note'));

  // ---- state to screen ----
  function visible(d) {
    if (state.q) return d.hay.indexOf(state.q) > -1;
    return state.area ? d.g === state.area : true;
  }
  function overview() { return !state.area && !state.q; }
  function paint() {
    var ov = overview(), firstOfGroup = {};
    data.forEach(function (d) {
      var el = cellEls[d.s], on = visible(d), q = !!state.q, a = !!state.area;
      el.classList.toggle('dim', (a || q) && !on);
      el.classList.toggle('sel', state.sel === d.s);
      el.classList.toggle('soft', !!state.sel && state.sel !== d.s && on);
      var tab = ov ? (!firstOfGroup[d.g] && (firstOfGroup[d.g] = 1)) : on;
      el.setAttribute('tabindex', tab ? 0 : -1);
      el.setAttribute('aria-label', ov ? AREAS[d.g].name + ': ' + d.n + '. Zoom in.' : d.n + ', show details');
    });
    DESTS.forEach(function (d) { d.el.classList.toggle('on', state.dest === d); });
    if (selOutline) selOutline.setAttribute('d', state.sel ? path(byslug[state.sel].c, true) : '');
    ORDER.forEach(function (g) { areaLabelEls[g].style.display = ov ? '' : 'none'; });
    regionsBar.querySelectorAll('.hm-r').forEach(function (b) { var on = (b.getAttribute('data-a') || '') === (state.area || ''); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  }
  // Destinations shown at this zoom: the major ones always, the rest once you zoom in or pick an area.
  // Badges closer than R pixels fold into the most important one, which shows a count and zooms in when chosen.
  function groupDests(fr) {
    var R = 30, groups = [], boxes = [], more = !overview() || view.w < W * .62;
    DESTS.forEach(function (d) { d.px = (d.x - view.x) * fr.s; d.py = (d.y - view.y) * fr.s; d.group = null; d.el.style.display = 'none'; });
    DESTS.filter(function (d) { return (d.major || more || state.dest === d) && d.px > 10 && d.px < fr.w - 10 && d.py > 10 && d.py < fr.h - 10; })
      .sort(function (a, b) { return (b === state.dest) - (a === state.dest) || b.major - a.major || a.i - b.i; })
      .forEach(function (d) {
        for (var i = 0; i < groups.length; i++) if (Math.hypot(d.px - groups[i][0].px, d.py - groups[i][0].py) < R) { groups[i].push(d); return; }
        groups.push([d]);
      });
    groups.forEach(function (g) {
      var d = g[0], n = g.length - 1;
      d.group = g; d.el.style.display = '';
      d.cnt.style.display = n ? '' : 'none'; d.cntT.textContent = '+' + n;
      d.el.setAttribute('aria-label', n ? d.n + ' and ' + n + ' more ' + (n > 1 ? 'destinations' : 'destination') + ' close by. Zoom in to see them.' : d.n + ', destination. Show details.');
      boxes.push(n ? [d.px - 14, d.py - 20, 34, 34, d] : [d.px - 14, d.py - 14, 28, 28, d]);   // room for the count bubble
    });
    return boxes;
  }
  function placeLabels() {
    var fr = frame(), s = fr.s, pw = fr.w, ph = fr.h;
    data.forEach(function (d) { labelEls[d.s].style.display = 'none'; });
    gLabels.style.opacity = 1; root.classList.remove('hm-anim');
    var placed = groupDests(fr);
    if (!overview() || view.w < W * .5) {
      var show = data.filter(function (d) {
        var px = (d.x - view.x) * s, py = (d.y - view.y) * s;
        return visible(d) && px > -20 && px < pw + 20 && py > -20 && py < ph + 20;
      });
      var spots = [[0, 5, 'middle'], [0, -12, 'middle'], [0, 22, 'middle'], [0, -29, 'middle'], [0, 39, 'middle']];
      show.sort(function (a, b) { return (state.sel === b.s) - (state.sel === a.s); });
      show.forEach(function (d) {
        var px = (d.x - view.x) * s, py = (d.y - view.y) * s, el = labelEls[d.s], w = d.n.length * 6.7 + 10, pick = null;
        for (var i = 0; i < spots.length && !pick; i++) {
          var sp = spots[i], x0 = px - w / 2, y0 = py + sp[1] - 14, ok = x0 > 2 && x0 + w < pw - 2 && y0 > 2 && y0 + 20 < ph - 2;
          for (var j = 0; j < placed.length && ok; j++) { var b = placed[j]; if (x0 < b[0] + b[2] && x0 + w > b[0] && y0 < b[1] + b[3] && y0 + 20 > b[1]) ok = false; }
          if (ok) pick = { s: sp, box: [x0, y0, w, 20] };
        }
        el.style.display = ''; var t = el._t, s2 = pick ? pick.s : spots[0];
        t.setAttribute('y', s2[1]); t.setAttribute('text-anchor', 'middle');
        t.setAttribute('class', 'hm-label' + (pick ? '' : ' hm-extra') + (state.sel === d.s ? ' hm-on' : ''));
        if (pick) placed.push(pick.box);
      });
    }
    placeDests(placed, fr);
  }
  // Destination names go where there is room. On the full map they wait for hover, focus or a tap.
  function placeDests(placed, fr) {
    var pw = fr.w, ph = fr.h, full = overview() && !zoomed();
    DESTS.forEach(function (d) {
      d.lab.style.display = 'none';
      if (!d.group) return;
      var spots = [[16, 0], [-16 - d.w, 0], [16, -24], [16, 24], [-16 - d.w, -24], [-16 - d.w, 24]], pick = null;
      for (var i = 0; i < spots.length && !pick && !full; i++) {
        var x0 = d.px + spots[i][0], y0 = d.py + spots[i][1] - 11, ok = x0 > 2 && x0 + d.w < pw - 2 && y0 > 2 && y0 + 22 < ph - 2;
        for (var j = 0; j < placed.length && ok; j++) { var b = placed[j]; if (b[4] === d) continue; if (x0 < b[0] + b[2] + 3 && x0 + d.w + 3 > b[0] && y0 < b[1] + b[3] + 3 && y0 + 22 + 3 > b[1]) ok = false; }
        if (ok) pick = { s: spots[i], box: [x0, y0, d.w, 22] };
      }
      if (pick) { d.lab.style.display = ''; d.lab.setAttribute('transform', 'translate(' + pick.s[0] + ' ' + pick.s[1] + ')'); placed.push(pick.box); return; }
      // no free spot: keep the name ready for hover (or shown, when chosen) on a side that stays inside the map
      var fit = spots.filter(function (sp) { var x0 = d.px + sp[0], y0 = d.py + sp[1] - 11; return x0 > 2 && x0 + d.w < pw - 2 && y0 > 2 && y0 + 22 < ph - 2; })[0];
      if (!fit) fit = [Math.max(2 - d.px, Math.min(pw - 2 - d.w - d.px, -d.w / 2)), d.py > 40 ? -26 : 26];
      d.lab.setAttribute('transform', 'translate(' + fit[0] + ' ' + fit[1] + ')');
      if (state.dest === d) d.lab.style.display = '';
    });
  }
  function clearHot() {
    gCells.classList.remove('hovering'); tip.hidden = true;
    data.forEach(function (o) { cellEls[o.s].classList.remove('hot'); });
  }
  function onDest(d) {
    var a0 = state.area;
    state.dest = d; state.sel = null;
    if (!state.q && !state.area) state.area = byslug[d.near[0]].g;
    clearHot(); paint(); renderSide();
    if (state.area !== a0) goTo(fitWith(boxFor(state.area), d), placeLabels);
    else if (!inView(d, .08)) goTo(centerOn(d), placeLabels);
    else placeLabels();
  }
  // A box that also takes in point p, with a little room around it.
  function fitWith(b, p) {
    var m = b.w * .08;
    if (p.x > b.x + m && p.x < b.x + b.w - m && p.y > b.y + m && p.y < b.y + b.h - m) return b;
    var x0 = Math.min(b.x, p.x - m), x1 = Math.max(b.x + b.w, p.x + m), y0 = Math.min(b.y, p.y - m), y1 = Math.max(b.y + b.h, p.y + m), w = Math.max(x1 - x0, (y1 - y0) * W / H);
    return clampView({ x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - w * H / W / 2, w: w });
  }
  // A grouped badge zooms in until its destinations sit at least 44 pixels apart.
  function zoomGroup(g) {
    var fr = frame(), dmin = Infinity, cx = 0, cy = 0;
    g.forEach(function (a, i) { cx += a.x / g.length; cy += a.y / g.length; for (var j = i + 1; j < g.length; j++) dmin = Math.min(dmin, Math.hypot(a.x - g[j].x, a.y - g[j].y)); });
    var w = Math.min(view.w / 1.6, fr.w * dmin / 44);
    if (!state.q && !state.area) { state.area = byslug[g[0].near[0]].g; state.sel = null; state.dest = null; clearHot(); paint(); renderSide(); }
    goTo(centerOn({ x: cx, y: cy }, w), placeLabels);
  }
  function onHover(d, on) {
    if (on && gest && gest.on) return;
    gCells.classList.toggle('hovering', on);
    if (overview() || state.q) {
      tip.hidden = !on;
      if (on) { tip.textContent = ''; tip.style.setProperty('--c', AREAS[d.g].color); tip.appendChild(document.createTextNode(AREAS[d.g].name + ', ' + count[d.g] + ' neighborhoods')); }
    }
    if (overview()) {
      ORDER.forEach(function (g) { areaLabelEls[g].classList.toggle('hot', on && g === d.g); });
      data.forEach(function (o) { cellEls[o.s].classList.toggle('hot', on && o.g === d.g); });
      return;
    }
    data.forEach(function (o) { cellEls[o.s].classList.toggle('hot', on && o.s === d.s); });
    var el = labelEls[d.s]; if (!el || el.style.display === 'none') return;
    if (on) el._t.classList.add('hm-on'); else if (state.sel !== d.s) el._t.classList.remove('hm-on');
  }
  function lightArea(g, on) {
    if (!overview()) return;
    gCells.classList.toggle('hovering', on);
    data.forEach(function (o) { cellEls[o.s].classList.toggle('hot', on && o.g === g); });
    areaLabelEls[g].classList.toggle('hot', on);
  }
  function onCell(d) {
    if (overview()) setArea(d.g); else select(d.s);
  }
  function nearest(d, n) {
    return data.filter(function (o) { return o.s !== d.s; }).map(function (o) { var dy = o.lat - d.lat, dx = (o.lon - d.lon) * .84; return [dy * dy + dx * dx, o]; })
      .sort(function (a, b) { return a[0] - b[0]; }).slice(0, n).map(function (a) { return a[1]; });
  }

  function renderRegions() {
    regionsBar.textContent = '';
    var all = html('button', 'hm-r', regionsBar, 'All of San Diego'); all.type = 'button'; all.setAttribute('data-a', ''); all.addEventListener('click', function () { setArea(null); });
    ORDER.forEach(function (g) {
      var b = html('button', 'hm-r', regionsBar); b.type = 'button'; b.setAttribute('data-a', g);
      var dot = html('span', 'hm-dot', b); dot.style.background = AREAS[g].color; html('span', '', b, AREAS[g].name);
      b.addEventListener('click', function () { setArea(g); });
      b.addEventListener('mouseenter', function () { lightArea(g, true); });
      b.addEventListener('mouseleave', function () { lightArea(g, false); });
    });
  }
  function closeCard() { state.sel = null; state.dest = null; update(false); }
  function cardTop(label) {
    var top = html('div', 'hm-card-top', card);
    var back = html('button', 'hm-back', top, '‹ ' + label); back.type = 'button'; back.addEventListener('click', closeCard);
    var x = html('button', 'hm-x', top, '×'); x.type = 'button'; x.setAttribute('aria-label', 'Close details'); x.addEventListener('click', closeCard);
  }
  function renderSide() {
    card.textContent = ''; list.textContent = '';
    var d = state.sel ? byslug[state.sel] : null, D = state.dest;
    if (D) {
      cardTop(state.q ? 'Search results' : state.area ? AREAS[state.area].name : 'All of San Diego');
      html('span', 'hm-badge hm-badge-dest', card, 'Destination');
      html('h3', '', card, D.n); html('p', 'hm-blurb hm-dblurb', card, D.b);
      html('p', 'hm-near-h hm-near-dh', card, 'Nearby neighborhoods'); var rowD = html('div', 'hm-near hm-near-d', card);
      D.near.forEach(function (s) { var c = html('button', 'hm-chip', rowD, byslug[s].n); c.type = 'button'; c.addEventListener('click', function () { select(s); }); });
    } else if (d) {
      cardTop(AREAS[d.g].name);
      var badge = html('span', 'hm-badge', card, AREAS[d.g].name); badge.style.background = AREAS[d.g].color;
      html('h3', '', card, d.n); html('p', 'hm-blurb', card, d.b);
      var z = html('p', 'hm-zip', card); html('strong', '', z, 'ZIP '); z.appendChild(document.createTextNode(d.z));
      z.appendChild(document.createTextNode('. ' + (UNINC[d.s] ? 'Unincorporated community' : d.r === 'sd' ? 'A neighborhood of the City of San Diego' : 'Separate city')));
      var a = html('a', 'btn btn-coral', card, 'View the ' + d.n + ' guide'); a.href = d.s + '.html';
      var dn = DESTS.filter(function (x) { return x.near.indexOf(d.s) > -1; });
      if (dn.length) { html('p', 'hm-near-h hm-dn-h', card, 'Nearby destinations'); html('p', 'hm-dn', card, dn.map(function (x) { return x.n; }).join(', ')); }
      html('p', 'hm-near-h', card, 'Close by'); var row = html('div', 'hm-near', card);
      nearest(d, 3).forEach(function (o) { var c = html('button', 'hm-chip', row, o.n); c.type = 'button'; c.addEventListener('click', function () { select(o.s); }); });
    } else if (state.area) {
      var A = AREAS[state.area], top2 = html('div', 'hm-card-top', card);
      var back2 = html('button', 'hm-back', top2, '‹ All of San Diego'); back2.type = 'button'; back2.addEventListener('click', function () { setArea(null); });
      var b2 = html('span', 'hm-badge', card, count[state.area] + ' neighborhoods'); b2.style.background = A.color;
      html('h3', '', card, A.name); html('p', 'hm-blurb', card, A.blurb);
    } else if (state.q) {
      html('p', 'hm-hint', card, 'Showing neighborhoods that match “' + state.q + '”. Clear the search to go back to the full map.');
    } else {
      html('p', 'hm-hint', card, 'Pick an area on the map, or from the list, to zoom in and meet its neighborhoods. The colors match the buttons above. Tap a round badge for a major destination.');
    }
    if (!state.area && !state.q) {
      ORDER.forEach(function (g) {
        var b = html('button', 'hm-area', list); b.type = 'button';
        var dot = html('span', 'hm-dot', b); dot.style.background = AREAS[g].color;
        var tx = html('span', 'hm-area-t', b); html('strong', '', tx, AREAS[g].name); html('small', '', tx, count[g] + ' neighborhoods');
        b.addEventListener('click', function () { setArea(g); });
        b.addEventListener('mouseenter', function () { lightArea(g, true); });
        b.addEventListener('mouseleave', function () { lightArea(g, false); });
      });
    } else {
      var items = data.filter(visible);
      if (!items.length) { html('p', 'hm-none', list, 'Nothing matches that search.'); return; }
      var ul = html('ul', '', list);
      items.forEach(function (d2) {
        var li = html('li', '', ul), b = html('button', 'hm-item' + (state.sel === d2.s ? ' on' : ''), li); b.type = 'button';
        var dot = html('span', 'hm-dot', b); dot.style.background = d2.fill; html('span', '', b, d2.n);
        b.addEventListener('click', function () { select(d2.s); });
        b.addEventListener('mouseenter', function () { onHover(d2, true); });
        b.addEventListener('mouseleave', function () { onHover(d2, false); });
      });
    }
  }
  function update(zoom) {
    paint(); renderSide();
    if (zoom === false) { placeLabels(); return; }
    goTo(homeBox(), placeLabels);
  }
  function setArea(g) { state.area = g; state.sel = null; state.dest = null; clearHot(); update(); }
  function select(s) {
    var d = byslug[s]; if (!d) return;
    var changed = state.area !== d.g && !state.q;
    state.sel = s; state.dest = null; if (!state.q) state.area = d.g;
    paint(); renderSide();
    if (changed) goTo(boxFor(state.area), placeLabels);
    else if (!inView(d, .1)) goTo(centerOn(d), placeLabels);   // panned away from it: bring it back into view
    else placeLabels();
    try { cellEls[s].focus({ preventScroll: true }); } catch (e) { }
  }

  // ---- dragging, pinching and zoom gestures ----
  // One pointer drags once it moves a few pixels; two touch pointers pinch. A drag never counts as a click.
  var pts = {}, gest = null, dragged = 0, settle = null;
  function endGesture() {
    if (gest && gest.on) { dragged = Date.now(); root.classList.remove('dragging'); placeLabels(); }
    gest = null;
  }
  function startPinch() {
    var ids = Object.keys(pts), a = pts[ids[0]], b = pts[ids[1]];
    stopAnim(); clearHot(); root.classList.add('dragging');
    gest = { pinch: true, on: true, d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], v: view, fr: frame() };
    ids.forEach(function (id) { try { svg.setPointerCapture(+id); } catch (e) { } });
  }
  svg.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse') { if (e.button !== 0) return; pts = {}; }
    dragged = 0;
    pts[e.pointerId] = [e.clientX, e.clientY];
    var n = Object.keys(pts).length;
    if (n === 1) gest = { id: e.pointerId, x: e.clientX, y: e.clientY, v: view, fr: frame(), on: false, touch: e.pointerType !== 'mouse' };
    else if (n === 2 && zoomed()) startPinch();
  });
  svg.addEventListener('pointermove', function (e) {
    if (!pts[e.pointerId]) return;
    if (e.pointerType === 'mouse' && !(e.buttons & 1)) { pointerEnd(e); return; }   // the button was released off the map
    pts[e.pointerId] = [e.clientX, e.clientY];
    if (!gest) return;
    var fr = gest.fr, v = gest.v, w, ux, uy;
    if (gest.pinch) {
      var ids = Object.keys(pts); if (ids.length < 2) return;
      var a = pts[ids[0]], b = pts[ids[1]], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      w = Math.max(MIN_W, Math.min(W, v.w * gest.d / Math.max(1, Math.hypot(a[0] - b[0], a[1] - b[1]))));
      ux = v.x + (gest.m[0] - fr.x) * v.w / fr.w; uy = v.y + (gest.m[1] - fr.y) * v.w / fr.w;   // the map point under the fingers stays under them
      view = clampView({ x: ux - (mx - fr.x) * w / fr.w, y: uy - (my - fr.y) * w / fr.w, w: w });
      applyView(); return;
    }
    if (e.pointerId !== gest.id) return;
    var dx = e.clientX - gest.x, dy = e.clientY - gest.y;
    if (!gest.on) {
      if (!zoomed() || Math.hypot(dx, dy) < (gest.touch ? 8 : 4)) return;
      gest.on = true; stopAnim(); clearHot(); root.classList.add('dragging');
      try { svg.setPointerCapture(e.pointerId); } catch (_) { }
      var u0 = view.w / fr.w; gest.v = v = { x: view.x + dx * u0, y: view.y + dy * u0, w: view.w };   // carry on from here without a jump
    }
    var u = v.w / fr.w;
    view = clampView({ x: v.x - dx * u, y: v.y - dy * u, w: v.w });
    applyView();
  });
  function pointerEnd(e) {
    if (!pts[e.pointerId]) return;
    delete pts[e.pointerId];
    var left = Object.keys(pts);
    if (gest && gest.pinch && left.length === 1) {   // one finger lifted: the other keeps dragging
      var p = pts[left[0]]; gest = { id: +left[0], x: p[0], y: p[1], v: view, fr: frame(), on: true, touch: true };
      return;
    }
    endGesture();
  }
  svg.addEventListener('pointerup', pointerEnd);
  svg.addEventListener('pointercancel', pointerEnd);
  svg.addEventListener('lostpointercapture', function (e) { if (e.target === svg) pointerEnd(e); });   // not when a child hands its touch capture to the svg
  window.addEventListener('blur', function () { pts = {}; endGesture(); });
  svg.addEventListener('click', function (e) { if (Date.now() - dragged < 400) { e.stopPropagation(); e.preventDefault(); } }, true);
  // Ctrl or Cmd with the wheel (and trackpad pinch) zooms around the pointer. A plain wheel scrolls the page.
  svg.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault(); stopAnim();
    var fr = frame(), f = Math.exp(-Math.max(-60, Math.min(60, e.deltaMode ? e.deltaY * 16 : e.deltaY)) * .008), w = view.w / f;
    var ux = view.x + (e.clientX - fr.x) / fr.s, uy = view.y + (e.clientY - fr.y) / fr.s;
    w = Math.max(MIN_W, Math.min(W, w));
    view = clampView({ x: ux - (e.clientX - fr.x) * w / fr.w, y: uy - (e.clientY - fr.y) * w / fr.w, w: w });
    applyView(); clearTimeout(settle); settle = setTimeout(placeLabels, 140);
  }, { passive: false });
  // Keyboard: with a neighborhood or badge focused, arrows move the map, + and - zoom, Escape closes the details.
  svg.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var k = e.key, d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
    if (k === '+' || k === '=') { e.preventDefault(); if (view.w > MIN_W + .5) zoomBy(1.6); }
    else if (k === '-' || k === '_') { e.preventDefault(); if (zoomed()) zoomBy(1 / 1.6); }
    else if (k === 'Escape' && (state.sel || state.dest)) { e.preventDefault(); closeCard(); }
    else if (d && zoomed()) { e.preventDefault(); goTo({ x: view.x + d[0] * view.w * .2, y: view.y + d[1] * view.h * .2, w: view.w }, placeLabels, 220); }
  });

  svg.addEventListener('mousemove', function (e) {
    if (tip.hidden) return;
    var r = stage.getBoundingClientRect(); tip.style.left = Math.min(r.width - tip.offsetWidth - 6, e.clientX - r.left + 14) + 'px'; tip.style.top = (e.clientY - r.top + 16) + 'px';
  });
  svg.addEventListener('mouseleave', function () { tip.hidden = true; });
  var q = document.getElementById('dir-q');
  if (q) q.addEventListener('input', function () { state.q = q.value.trim().toLowerCase(); state.sel = null; state.dest = null; update(); });
  window.addEventListener('resize', function () { view = clampView(view); applyView(); placeLabels(); });

  renderRegions();
  var hash = (location.hash || '').replace('#', '');
  if (byslug[hash]) { state.area = byslug[hash].g; state.sel = hash; }
  view = clampView(boxFor(state.area)); applyView(); paint(); renderSide(); placeLabels();
  root.classList.add('ready');
})();
