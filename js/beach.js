/* Beach life: the stick figures on the hero scene.
 *
 * Every scene page carries two empty layers (.layer-surfers and .layer-walkers).
 * This script draws the cast into them. Each figure follows its own itinerary
 * (walk, pause, turn around, wave) generated once from a fixed seed, and every
 * position is a pure function of a shared clock kept in sessionStorage. That is
 * why the same people are in the same places when you move between pages
 * instead of starting over.
 */
(function () {
  'use strict';

  var surfHost = document.querySelector('.layer-surfers .life');
  var walkHost = document.querySelector('.layer-walkers .life');
  if (!surfHost && !walkHost) return;

  var NS = 'http://www.w3.org/2000/svg';
  var INK = '#0b1d2b', CORAL = '#e4745c', CREAM = '#ffe3b3';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var small = window.matchMedia('(max-width: 767px)');

  var T0 = 0;
  try {
    T0 = +sessionStorage.getItem('beach-t0');
    if (!T0) { T0 = Date.now(); sessionStorage.setItem('beach-t0', String(T0)); }
  } catch (e) { T0 = Date.now(); }
  function clock() { return (Date.now() - T0) / 1000; }

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function mk(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(u) { return u * u * (3 - 2 * u); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rot(el, a, cx, cy) { el.setAttribute('transform', 'rotate(' + a.toFixed(1) + ' ' + cx + ' ' + cy + ')'); }
  function limb(parent, d, w) {
    return mk('path', { d: d, fill: 'none', stroke: INK, 'stroke-width': w || 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, parent);
  }

  /* ---------- Itineraries ---------- */

  // Builds a closed loop: walk to a waypoint, pause, walk to the next, and
  // finally come home, so the cycle repeats without a jump.
  function itinerary(c) {
    var r = rng(c.seed), segs = [], t = 0, x = c.x0, y = c.y0, dir = c.dir || 1, ph = r();
    var stride = c.stride || 8;
    if (!c.legs) {
      segs.push({ k: 'pause', pose: c.pose || 'stand', t0: 0, t1: c.hold || 60, x0: x, y0: y, x1: x, y1: y, dir: dir, s0: 0, strides: 0 });
      return { segs: segs, period: c.hold || 60 };
    }
    for (var i = 0; i <= c.legs; i++) {
      var last = i === c.legs, tx, ty;
      if (last) { tx = c.x0; ty = c.y0; }
      else {
        var tries = 0;
        do { tx = lerp(c.xr[0], c.xr[1], r()); tries++; } while (Math.abs(tx - x) < (c.hop || 40) && tries < 8);
        ty = lerp(c.yr[0], c.yr[1], r());
      }
      var dx = tx - x, dist = Math.abs(dx);
      if (dist > 1) {
        dir = dx > 0 ? 1 : -1;
        var v = lerp(c.v[0], c.v[1], r());
        var dur = Math.hypot(dx, (ty - y) * 3) / v;
        segs.push({ k: 'walk', t0: t, t1: t + dur, x0: x, y0: y, x1: tx, y1: ty, dir: dir, s0: ph, strides: dist / stride });
        ph += dist / stride; t += dur; x = tx; y = ty;
      }
      var pd = last ? 1.5 : lerp(c.pause[0], c.pause[1], r());
      var pose = 'stand';
      if (!last && c.waveAt && c.waveAt.indexOf(i) > -1) { pose = 'wave'; pd = Math.max(pd, 3.4); }
      segs.push({ k: 'pause', pose: pose, t0: t, t1: t + pd, x0: x, y0: y, x1: x, y1: y, dir: dir, s0: ph, strides: 0 });
      t += pd;
    }
    return { segs: segs, period: t };
  }

  function stateAt(f, t) {
    var tm = (t + f.off) % f.period; if (tm < 0) tm += f.period;
    var s = f.segs, i = f.i || 0;
    if (!(tm >= s[i].t0 && tm < s[i].t1)) { i = 0; while (i < s.length - 1 && tm >= s[i].t1) i++; f.i = i; }
    var g = s[i], el = tm - g.t0, len = g.t1 - g.t0, u = len > 0 ? el / len : 0;
    var nxt = s[(i + 1) % s.length];
    var st = { dir: g.dir, el: el, rem: g.t1 - tm, len: len };
    if (g.k === 'walk') {
      var e = ease(u);
      st.x = lerp(g.x0, g.x1, e); st.y = lerp(g.y0, g.y1, e);
      st.moving = true; st.ph = g.s0 + g.strides * e; st.pose = 'walk'; st.sx = g.dir;
    } else {
      st.x = g.x0; st.y = g.y0; st.moving = false; st.ph = g.s0; st.pose = g.pose; st.sx = g.dir;
      // Turn toward the next leg during the last third of a second of a pause.
      if (nxt.k === 'walk' && nxt.dir !== g.dir && st.rem < 0.35) st.sx = lerp(g.dir, nxt.dir, ease(1 - st.rem / 0.35));
      // A companion needs longer to walk around to the other side before the next leg.
      var sw = Math.min(2.5, len);
      if (nxt.k === 'walk' && nxt.dir !== g.dir && st.rem < sw) { st.swap = ease(1 - st.rem / sw); st.nextDir = nxt.dir; }
    }
    return st;
  }

  /* ---------- People ---------- */

  function buildPerson(host, o) {
    var root = mk('g', {}, host);
    mk('ellipse', { cx: 0, cy: 1, rx: 7.5, ry: 1.7, fill: INK, opacity: '.2' }, root);
    var p = { root: root, o: o };
    p.body = mk('g', {}, root);
    p.farArm = limb(p.body, 'M0,-21.5 L0,-13.5'); p.farArm.setAttribute('opacity', '.85');
    p.farLeg = limb(p.body, 'M0,-12.5 L0,0'); p.farLeg.setAttribute('opacity', '.7');
    limb(p.body, 'M0,-23.6 L0,-12.5');
    mk('circle', { cx: 0, cy: -27.6, r: 3.4, fill: INK }, p.body);
    if (o.hat) {
      mk('ellipse', { cx: 0.4, cy: -29.7, rx: 6.4, ry: 1.2, fill: CREAM }, p.body);
      mk('path', { d: 'M-2.8,-29.9 Q0.4,-34.6 3.6,-29.9Z', fill: CREAM }, p.body);
    }
    p.nearLeg = limb(p.body, 'M0,-12.5 L0,0');
    if (o.board) {
      p.board = mk('g', {}, p.body);
      mk('path', { d: 'M5,-35 Q10.4,-18 5,-1 Q-0.4,-18 5,-35Z', fill: CORAL }, p.board);
      mk('path', { d: 'M5,-31.5 L5,-4', stroke: CREAM, 'stroke-width': 1, opacity: '.9', fill: 'none' }, p.board);
      p.nearArm = limb(p.body, 'M0,-21.5 L4.6,-15.5');
    } else {
      p.nearArm = limb(p.body, 'M0,-21.5 L0,-13.5');
    }
    return p;
  }

  function poseOf(p, st, t) {
    var o = p.o, nl = 0, fl = 0, na = 0, fa = 0, bob = 0;
    if (st.pose === 'walk') {
      var s = Math.sin(st.ph * 6.2832), la = o.legAmp || 24, aa = o.armAmp || 22;
      nl = -la * s; fl = la * s;
      fa = -aa * s; na = aa * s;
      bob = Math.abs(Math.cos(st.ph * 6.2832)) * (o.bounce || 0);
    } else if (st.pose === 'wave') {
      var b = clamp(Math.min(st.el, st.rem) / 0.45, 0, 1);
      nl = 7 * b; fl = -7 * b; fa = 9 * b;
      na = -(155 + 22 * Math.sin(t * 9 + (o.seed || 0))) * b;
    } else if (st.pose === 'talk') {
      var k = (o.seed || 0);
      fa = 6; na = -24 + 16 * Math.sin(t * 1.7 + k) + 6 * Math.sin(t * 4.1 + k);
    } else {
      var sw = Math.sin(t * 1.3 + (o.seed || 0));
      nl = 5; fl = -5; na = -9 + 4 * sw; fa = 9 - 4 * sw;
    }
    if (o.leash && st.pose !== 'wave') na = -52;       // arm forward, holding the lead
    if (o.board) {
      if (p.board) rot(p.board, -3 + 2 * Math.sin(st.ph * 6.2832), 5, -17);
    } else rot(p.nearArm, na, 0, -21.5);
    rot(p.farArm, fa, 0, -21.5);
    rot(p.nearLeg, nl, 0, -12.5);
    rot(p.farLeg, fl, 0, -12.5);
    p.body.setAttribute('transform', 'translate(0 ' + (-bob).toFixed(2) + ')');
  }

  /* ---------- The dog ---------- */

  function buildDog(host) {
    var d = { root: mk('g', {}, host) };
    mk('ellipse', { cx: 0, cy: 1, rx: 9, ry: 1.5, fill: INK, opacity: '.2' }, d.root);
    d.stand = mk('g', {}, d.root);
    d.fl1 = limb(d.stand, 'M4,-7.5 L4,0', 1.8); d.fl2 = limb(d.stand, 'M2,-7.5 L2,0', 1.8);
    d.hl1 = limb(d.stand, 'M-5,-7.5 L-5,0', 1.8); d.hl2 = limb(d.stand, 'M-3,-7.5 L-3,0', 1.8);
    d.fl2.setAttribute('opacity', '.7'); d.hl2.setAttribute('opacity', '.7');
    limb(d.stand, 'M-6.5,-8.4 L5,-8.4', 4.2);
    d.tail = limb(d.stand, 'M-6.8,-9 L-11,-13', 1.6);
    mk('circle', { cx: 8.2, cy: -11.4, r: 2.7, fill: INK }, d.stand);
    limb(d.stand, 'M10,-10.6 L13,-10', 1.9);
    limb(d.stand, 'M7,-13.4 L5.8,-16', 1.5);
    d.sit = mk('g', {}, d.root);
    limb(d.sit, 'M3.5,-10 L3.5,0', 1.8);
    limb(d.sit, 'M-5.5,-3.5 L-1.5,-3.5 L-1.5,0', 1.8);
    limb(d.sit, 'M-6,-4.6 L3.5,-11', 4.2);
    d.tail2 = limb(d.sit, 'M-6.4,-3.4 L-11,-4.2', 1.6);
    mk('circle', { cx: 6.2, cy: -14.2, r: 2.7, fill: INK }, d.sit);
    limb(d.sit, 'M8,-13.4 L11,-12.8', 1.9);
    limb(d.sit, 'M5,-16.6 L3.8,-19', 1.5);
    d.leash = mk('path', { d: 'M0,0 L0,0', fill: 'none', stroke: INK, 'stroke-width': 0.9, opacity: '.75' }, host);
    return d;
  }

  /* ---------- Beach furniture ---------- */

  function buildProps(host) {
    var g = mk('g', {}, host);
    function umbrella(x, y, tilt) {
      var u = mk('g', { transform: 'translate(' + x + ' ' + y + ')' }, g);
      mk('ellipse', { cx: 6, cy: 1, rx: 24, ry: 2.4, fill: INK, opacity: '.16' }, u);
      var s = mk('g', { transform: 'rotate(' + tilt + ' 0 0)' }, u);
      limb(s, 'M0,0 L0,-36', 1.6);
      mk('path', { d: 'M-19,-31 Q0,-50 19,-31 Q9.5,-34.5 0,-31 Q-9.5,-34.5 -19,-31Z', fill: CORAL }, s);
      mk('path', { d: 'M-6.3,-32.4 Q-4,-46 0,-45.5 Q4,-46 6.3,-32.4 Q3,-33.4 0,-33 Q-3,-33.4 -6.3,-32.4Z', fill: CREAM, opacity: '.95' }, s);
    }
    function lounger(x, y, flip) {
      var l = mk('g', { transform: 'translate(' + x + ' ' + y + ') scale(' + (flip ? -1 : 1) + ' 1)' }, g);
      mk('ellipse', { cx: 0, cy: 1, rx: 19, ry: 1.8, fill: INK, opacity: '.18' }, l);
      limb(l, 'M-15,-5 L-15,0 M6,-5 L6,0', 1.6);
      limb(l, 'M-17,-5.6 L6,-5.6 L15,-14.4', 3);
      limb(l, 'M-17,-5.6 L6,-5.6 L15,-14.4', 1).setAttribute('stroke', CREAM);
      return l;
    }
    umbrella(1098, 838, -6);
    lounger(1076, 846, false);
    lounger(1124, 848, true);
    // a towel on the sand
    mk('path', { d: 'M1148,853 L1170,853 L1176,858 L1154,858Z', fill: CORAL, opacity: '.9' }, g);
    mk('path', { d: 'M1151,855.4 L1172,855.4', stroke: CREAM, 'stroke-width': 1.2, fill: 'none' }, g);
    return g;
  }

  function buildSitter(host, x, y, sc, wavePeriod, seed) {
    var s = { root: mk('g', { transform: 'translate(' + x + ' ' + y + ') scale(' + sc + ' 1)' }, host), per: wavePeriod, seed: seed };
    // Reclining on the lounger, facing right.
    limb(s.root, 'M-3,-9 L-9,-11 L-17,-6.4', 2.2);
    limb(s.root, 'M-3,-9 L8.5,-15.6', 2.2);
    mk('circle', { cx: 11.6, cy: -17.4, r: 3.1, fill: INK }, s.root);
    s.arm = limb(s.root, 'M6,-14.2 L-1,-10.6', 2.2);
    return s;
  }
  function sitterPose(s, t) {
    var ph = (t + s.seed) % s.per, a = 0;
    if (ph < 4) { var b = clamp(Math.min(ph, 4 - ph) / 0.5, 0, 1); a = -(125 + 20 * Math.sin(t * 8)) * b; }
    rot(s.arm, a, 6, -14.2);
  }

  /* ---------- Water ---------- */

  function buildRider(host, c) {
    var r = { c: c, root: mk('g', { transform: 'translate(' + c.x + ' ' + c.y + ')' }, host) };
    r.fade = mk('g', { opacity: 0 }, r.root);
    r.s = mk('g', { transform: 'scale(' + c.sc + ')' }, r.fade);
    mk('path', { d: 'M-36,8 C-24,7 -13,3 -5,-6 C0,-11 9,-13 15,-8 C11,-7 7,-4 7,0 C16,0 26,4 40,7', fill: 'rgba(222,242,246,.2)', stroke: 'rgba(255,255,255,.75)', 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, r.s);
    mk('path', { d: 'M-2,-9 C2,-12 9,-12 13,-8', fill: 'none', stroke: '#fff', 'stroke-width': 1.7, 'stroke-linecap': 'round', opacity: '.9' }, r.s);
    r.bob = mk('g', {}, r.s);
    mk('ellipse', { cx: 0, cy: 2.6, rx: 19, ry: 2, fill: '#eaf6f8', opacity: '.38' }, r.bob);
    mk('path', { d: 'M-16,0 Q-2,-3.2 16,-1.6 Q19,0 16,1.6 Q-2,3.2 -16,0Z', fill: INK }, r.bob);
    var b = mk('g', { fill: 'none', stroke: INK, 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, r.bob);
    mk('path', { d: 'M6,-2.4 L5,-9 L1,-13' }, b); mk('path', { d: 'M-6,-2.4 L-3,-9 L1,-13' }, b);
    mk('path', { d: 'M1,-13 L-3,-21' }, b); mk('path', { d: 'M-3,-20 L-12,-17.5' }, b); mk('path', { d: 'M-3,-20.5 L6,-23.5' }, b);
    mk('circle', { cx: -4.6, cy: -25.2, r: 3.2, fill: INK, stroke: 'none' }, b);
    return r;
  }
  function riderPose(r, t) {
    var c = r.c, u = (((t + c.off) % c.dur) + c.dur) % c.dur / c.dur;
    r.root.setAttribute('transform', 'translate(' + (c.x - u * c.dx).toFixed(1) + ' ' + (c.y + u * c.dy).toFixed(1) + ')');
    var o = u < .12 ? u / .12 : u > .88 ? (1 - u) / .12 : 1;
    r.fade.setAttribute('opacity', o.toFixed(2));
    r.bob.setAttribute('transform', 'translate(0 ' + (-0.9 - 0.9 * Math.sin(t * 2.9 + c.off)).toFixed(2) + ')');
  }

  function buildPaddler(host, c) {
    var s = { c: c, root: mk('g', {}, host) };
    s.in = mk('g', {}, s.root);
    mk('ellipse', { cx: 0, cy: 2.6, rx: 17, ry: 2, fill: '#eaf6f8', opacity: '.38' }, s.in);
    mk('path', { d: 'M-16,0 Q-2,-3.2 16,-1.6 Q19,0 16,1.6 Q-2,3.2 -16,0Z', fill: INK }, s.in);
    var b = mk('g', { fill: 'none', stroke: INK, 'stroke-width': 2.2, 'stroke-linecap': 'round' }, s.in);
    mk('path', { d: 'M-1,-3 L-1,-13' }, b); mk('path', { d: 'M-1,-3 L7,-7.5 L12,-2.6' }, b); mk('path', { d: 'M-1,-12 L7,-8' }, b);
    mk('circle', { cx: -1, cy: -17, r: 3.2, fill: INK, stroke: 'none' }, b);
    return s;
  }
  function paddlerPose(s, t) {
    var c = s.c;
    s.root.setAttribute('transform', 'translate(' + (c.x + c.rx * Math.sin(t / c.per + c.off)).toFixed(1) + ' ' + c.y + ') scale(' + c.sc + ')');
    s.in.setAttribute('transform', 'translate(0 ' + (-0.8 - 0.8 * Math.sin(t * 1.9 + c.off)).toFixed(2) + ')');
  }

  /* ---------- The cast ---------- */

  var people = [], dogs = [], sitters = [], riders = [], paddlers = [], leashes = [];

  function addPerson(c, host) {
    var it = itinerary(c);
    var f = { c: c, segs: it.segs, period: it.period, off: c.off || 0, i: 0, buddy: c.buddy, m: c.m };
    f.p = buildPerson(host, c);
    f.sc = c.sc;
    c.seed = c.seed || 1;
    people.push(f);
    return f;
  }

  function cast() {
    if (walkHost) {
      buildProps(walkHost);

      // Walking the dog along the waterline
      var owner = addPerson({ seed: 11, x0: 700, y0: 842, xr: [650, 1000], yr: [832, 852], v: [5, 8], pause: [3, 9], legs: 5, sc: 1.24, leash: true, m: 1, waveAt: [3] }, walkHost);
      var dog = buildDog(walkHost); dog.owner = owner; dogs.push(dog);

      // A couple strolling together
      var c1 = addPerson({ seed: 23, x0: 940, y0: 852, dir: -1, xr: [770, 1000], yr: [846, 856], v: [3.4, 4.8], pause: [4, 11], legs: 4, sc: 1.34, m: 1, off: 20 }, walkHost);
      addPerson({ seed: 24, sc: 1.2, hat: true, buddy: { of: c1, gap: 17 }, m: 1 }, walkHost);

      // Carrying a board down to the water
      addPerson({ seed: 31, x0: 790, y0: 844, xr: [650, 960], yr: [838, 850], v: [5, 7], pause: [2, 6], legs: 4, sc: 1.25, board: true, m: 1, off: 31 }, walkHost);

      // A jogger on the hard sand, fast and in a hurry
      addPerson({ seed: 41, x0: 620, y0: 830, xr: [600, 1120], yr: [826, 838], v: [15, 20], pause: [1.5, 4], legs: 3, hop: 160, sc: 1.02, legAmp: 36, armAmp: 40, bounce: 1.1, stride: 13, m: 0, off: 17 }, walkHost);

      // Far off near the surf line
      addPerson({ seed: 51, x0: 760, y0: 816, xr: [740, 900], yr: [813, 819], v: [4, 6], pause: [3, 8], legs: 4, sc: .78, m: 1, off: 9 }, walkHost);

      // Someone who waves at whoever is looking
      addPerson({ seed: 61, x0: 780, y0: 824, xr: [700, 850], yr: [821, 827], v: [4, 6], pause: [5, 11], legs: 3, hop: 50, sc: 1.18, hat: true, waveAt: [0, 2], m: 1, off: 5 }, walkHost);

      // Two friends chatting, one with a straw hat
      addPerson({ seed: 71, x0: 572, y0: 846, dir: 1, pose: 'talk', sc: 1.22, m: 0 }, walkHost);
      addPerson({ seed: 72, x0: 590, y0: 846, dir: -1, pose: 'talk', sc: 1.12, hat: true, m: 0 }, walkHost);

      // A kid running along the edge of the water
      addPerson({ seed: 81, x0: 730, y0: 820, xr: [700, 880], yr: [816, 826], v: [13, 19], pause: [1, 3], legs: 5, hop: 60, sc: .8, legAmp: 34, armAmp: 38, stride: 10, waveAt: [2], m: 1, off: 13 }, walkHost);

      // Sunbathers on the loungers, one of them waves now and then
      sitters.push(buildSitter(walkHost, 1076, 846, 1, 34, 0));
      sitters.push(buildSitter(walkHost, 1124, 848, -1, 61, 7));

      // Buddy people follow their leader, so they exist but have no itinerary of their own.
      people.forEach(function (f) { if (f.buddy) { f.segs = null; } });
    }
    if (surfHost) {
      riders.push(buildRider(surfHost, { x: 968, y: 606, sc: .9, dx: 34, dy: 4, dur: 11, off: 3.5 }));
      riders.push(buildRider(surfHost, { x: 915, y: 650, sc: 1.25, dx: 46, dy: 7, dur: 9, off: 0 }));
      riders.push(buildRider(surfHost, { x: 835, y: 690, sc: 1.05, dx: 40, dy: 5, dur: 12.5, off: 6 }));
      paddlers.push(buildPaddler(surfHost, { x: 888, y: 774, sc: 1.1, rx: 24, per: 4.4, off: 0 }));
      paddlers.push(buildPaddler(surfHost, { x: 1010, y: 706, sc: .9, rx: 14, per: 5.6, off: 2 }));
    }
  }

  /* ---------- Rendering ---------- */

  var smoothSx = {};
  function render(t) {
    var isSmall = small.matches;
    // leaders first
    people.forEach(function (f) {
      var hide = isSmall && !f.m && !(f.buddy && f.buddy.of.m);
      f.p.root.style.display = hide ? 'none' : '';
      f.hidden = hide;
    });
    people.forEach(function (f) {
      if (f.hidden) return;
      var st, x, y, sx, sc = f.c.sc;
      if (f.buddy) {
        var L = f.buddy.of;
        st = L.last;
        if (!st) return;
        // Trails behind the leader. When the leader is about to turn around, the companion
        // walks past in front of them to the other side, then turns to follow.
        var gap = f.buddy.gap, u = st.swap, st2;
        if (u != null) {
          x = st.x - lerp(st.dir, st.nextDir, u) * gap; y = st.y + 1.2 + Math.sin(Math.PI * u) * 3;
          sx = u < .85 ? st.dir : lerp(st.dir, st.nextDir, ease((u - .85) / .15));
          st2 = { pose: 'walk', ph: st.ph + 0.37 + u * Math.round(2 * gap / 8), el: st.el, rem: st.rem, moving: true };
        } else {
          x = st.x - st.dir * gap; y = st.y + 1.2; sx = st.dir;
          st2 = { pose: st.pose, ph: st.ph + 0.37, el: st.el, rem: st.rem, moving: st.moving };
        }
        poseOf(f.p, st2, t);
      } else {
        st = stateAt(f, t); f.last = st;
        x = st.x; y = st.y; sx = st.sx; f.sx = sx;
        poseOf(f.p, st, t);
      }
      f.sx = sx; f.x = x; f.y = y;
      var k = sc * (0.92 + clamp((y - 810) / 48, 0, 1) * 0.22);
      f.p.root.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + (sx * k).toFixed(3) + ' ' + k.toFixed(3) + ')');
      f.k = k;
    });
    dogs.forEach(function (d) {
      var o = d.owner, st = o.last;
      if (!st || o.hidden) { d.root.style.display = 'none'; d.leash.style.display = 'none'; return; }
      d.root.style.display = ''; d.leash.style.display = '';
      var moving = st.moving, sit = !moving && st.el > 1 && st.rem > 0.8 && st.pose !== 'wave' ? true : false;
      var wander = moving ? 3 * Math.sin(t * 0.8) : 0;
      var x = o.x + o.sx * (19 + wander), y = o.y + 1.6;
      var dk = o.k * 0.92;
      d.root.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + (o.sx * dk).toFixed(3) + ' ' + dk.toFixed(3) + ')');
      d.stand.style.display = sit ? 'none' : '';
      d.sit.style.display = sit ? '' : 'none';
      var s = Math.sin(st.ph * 6.2832 * 1.0), a = moving ? 28 : 3;
      rot(d.fl1, a * s, 4, -7.5); rot(d.hl2, a * s, -3, -7.5);
      rot(d.fl2, -a * s, 2, -7.5); rot(d.hl1, -a * s, -5, -7.5);
      var wag = 18 * Math.sin(t * (moving ? 14 : 9));
      rot(d.tail, -wag, -6.8, -9); rot(d.tail2, -wag, -6.4, -3.4);
      var hx = o.x + o.sx * o.k * 6, hy = o.y - o.k * 16.4, cx = x + o.sx * dk * (sit ? 7 : 8), cy = y - dk * (sit ? 12 : 10);
      d.leash.setAttribute('d', 'M' + hx.toFixed(1) + ',' + hy.toFixed(1) + ' L' + cx.toFixed(1) + ',' + cy.toFixed(1));
    });
    sitters.forEach(function (s) { sitterPose(s, t); });
    riders.forEach(function (r) { riderPose(r, t); });
    paddlers.forEach(function (s) { paddlerPose(s, t); });
    isSmall ? hideSmall(true) : hideSmall(false);
  }
  var smallHidden = null;
  function hideSmall(on) {
    if (smallHidden === on) return;
    smallHidden = on;
    // Keep only the nearer water figures on phones.
    riders.forEach(function (r, i) { r.root.style.display = on && i > 1 ? 'none' : ''; });
    paddlers.forEach(function (s, i) { s.root.style.display = on && i > 0 ? 'none' : ''; });
    sitters.forEach(function (s) { s.root.style.display = on ? 'none' : ''; });
  }

  /* ---------- Loop ---------- */

  cast();
  var running = false, last = 0, rafId = 0, visible = true;

  function frame(ms) {
    rafId = 0;
    if (!running) return;
    if (ms - last >= 32) { last = ms; render(clock()); }
    rafId = requestAnimationFrame(frame);
  }
  function start() { if (reduce.matches || running || !visible || document.hidden) return; running = true; rafId = requestAnimationFrame(frame); }
  function stop() { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = 0; }

  render(clock());
  [surfHost, walkHost].forEach(function (h) { if (h) h.parentNode.classList.add('life-ready'); });

  if ('IntersectionObserver' in window) {
    var scene = document.querySelector('.scene');
    if (scene) new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting; visible ? start() : stop();
    }, { rootMargin: '80px' }).observe(scene);
  }
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  var onReduce = function () { reduce.matches ? (stop(), render(clock())) : start(); };
  reduce.addEventListener ? reduce.addEventListener('change', onReduce) : reduce.addListener(onReduce);
  small.addEventListener ? small.addEventListener('change', function () { render(clock()); }) : 0;
  start();

  window.__beach = { render: render, clock: clock, stop: stop, people: people, riders: riders };
})();
