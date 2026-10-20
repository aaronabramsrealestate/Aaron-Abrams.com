/* Life in the hero scene.
 *
 * js/scenes.js draws one of four illustrations and leaves an empty <g id="life"> in it plus the
 * ground lines people can stand on. This file fills it with the cast for that scene and runs one
 * shared animation loop:
 *   encinitas  cars with headlights, pedestrians, a surfer carrying a board, a flickering neon sign
 *   carlsbad   walkers and a dog on the sand, umbrellas, kids at the waterline, surfers, rolling swells
 *   vineyards  grape pickers, baskets, a hauler loading a truck, a tractor puffing smoke
 *   pointloma  drifting sailboats, a kayaker, people on the dock and deck, a flapping flag
 * Every scene also gets a few gulls. The loop pauses when the hero is off screen or the tab is
 * hidden, and visitors who prefer reduced motion get a still frame.
 */
(function () {
  'use strict';
  var H = window.__heroScene;
  if (!H) return;
  var scene = H.el, L = H.life || {};
  var host = scene.querySelector('#life');
  if (!host) return;

  var NS = 'http://www.w3.org/2000/svg';
  var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SMALL = window.matchMedia('(max-width: 767px)').matches;
  var upd = [];                       // per-frame updaters: fn(t, dt)

  /* ---------- helpers ---------- */
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function sm(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function f1(n) { return n.toFixed(1); }
  function Surf(pts) { this.p = pts; }
  Surf.prototype.y = function (x) {
    var p = this.p, n = p.length;
    if (x <= p[0][0]) return p[0][1];
    if (x >= p[n - 1][0]) return p[n - 1][1];
    var i = Math.floor((x - p[0][0]) / (p[1][0] - p[0][0]));
    i = clamp(i, 0, n - 2);
    var a = p[i], b = p[i + 1], t = (x - a[0]) / (b[0] - a[0]);
    return a[1] + (b[1] - a[1]) * t;
  };

  var SKIN = ['#3a261d', '#5a3a2a', '#7a5238', '#2c1c16', '#8a6040'];
  var SHIRT = ['#2596be', '#e8e2d0', '#c45a4a', '#d9a441', '#5b8a6a', '#8a5aa8', '#e8734a', '#f1f1f1'];
  var PANTS = ['#1a2236', '#2b3550', '#3a3328', '#1f2a24', '#4a4a56'];

  /* ---------- people ---------- */
  function Person(parent, o) {
    o = o || {};
    var g = el('g', {}, parent), skin = o.skin || pick(SKIN), pants = o.pants || pick(PANTS), shirt = o.shirt || pick(SHIRT);
    this.g = g;
    this.legA = el('line', { x1: 0, y1: -13, x2: 0, y2: 0, stroke: pants, 'stroke-width': 3.6, 'stroke-linecap': 'round' }, g);
    this.legB = el('line', { x1: 0, y1: -13, x2: 0, y2: 0, stroke: pants, 'stroke-width': 3.6, 'stroke-linecap': 'round' }, g);
    this.up = el('g', {}, g);
    this.armB = el('line', { x1: 0, y1: -22, x2: 0, y2: -11, stroke: skin, 'stroke-width': 2.6, 'stroke-linecap': 'round' }, this.up);
    el('line', { x1: 0, y1: -13, x2: 0, y2: -23, stroke: shirt, 'stroke-width': 5.6, 'stroke-linecap': 'round' }, this.up);
    this.armA = el('line', { x1: 0, y1: -22, x2: 0, y2: -11, stroke: skin, 'stroke-width': 2.8, 'stroke-linecap': 'round' }, this.up);
    el('circle', { cx: 0, cy: -27.6, r: 3.7, fill: skin }, this.up);
    if (o.hat) {
      el('ellipse', { cx: 0, cy: -30.4, rx: 7, ry: 1.7, fill: o.hat }, this.up);
      el('path', { d: 'M-3.6,-30.4 Q0,-35.5 3.6,-30.4 Z', fill: o.hat }, this.up);
    }
    this.hold = el('g', {}, this.up);      // things in the hands
    this.pose({});
  }
  Person.prototype.pose = function (p) {
    this.up.setAttribute('transform', 'rotate(' + f1(p.lean || 0) + ' 0 -13)');
    this.legA.setAttribute('transform', 'rotate(' + f1(p.legA || 0) + ' 0 -13)');
    this.legB.setAttribute('transform', 'rotate(' + f1(p.legB || 0) + ' 0 -13)');
    this.armA.setAttribute('transform', 'rotate(' + f1(p.armA === undefined ? 4 : p.armA) + ' 0 -22)');
    this.armB.setAttribute('transform', 'rotate(' + f1(p.armB === undefined ? -4 : p.armB) + ' 0 -22)');
  };
  Person.prototype.at = function (x, y, s, dir) {
    this.g.setAttribute('transform', 'translate(' + f1(x) + ' ' + f1(y) + ') scale(' + f1(dir < 0 ? -s : s).replace(/(\.\d)$/, '$1') + ' ' + f1(s) + ')');
  };
  function walkPose(ph, carry) {
    var s = Math.sin(ph);
    return { lean: 2, legA: s * 32, legB: -s * 32, armA: carry ? -62 : -s * 28, armB: carry ? -62 : s * 28 };
  }

  /* ---------- gulls (every scene) ---------- */
  function Gull(parent) {
    this.g = el('path', { d: 'M-8,0 Q-4,-5 0,0 Q4,-5 8,0', fill: 'none', stroke: '#1d1c3a', 'stroke-width': 1.8, 'stroke-linecap': 'round', opacity: 0.7 }, parent);
    this.reset(true);
  }
  Gull.prototype.reset = function (first) {
    this.dir = Math.random() < 0.5 ? 1 : -1;
    this.x = first ? rnd(100, 1300) : (this.dir > 0 ? -40 : 1480);
    this.y0 = rnd(150, 400);
    this.v = rnd(22, 40);
    this.ph = rnd(0, 6);
    this.s = rnd(0.8, 1.5);
  };
  Gull.prototype.update = function (t, dt) {
    this.x += this.dir * this.v * dt;
    if ((this.dir > 0 && this.x > 1500) || (this.dir < 0 && this.x < -60)) this.reset(false);
    var fl = Math.sin(t * 7 + this.ph), y = this.y0 + Math.sin(t * 0.8 + this.ph) * 10;
    this.g.setAttribute('d', 'M-8,' + f1(fl * 1.6) + ' Q-4,' + f1(-5 * fl - 1) + ' 0,0 Q4,' + f1(-5 * fl - 1) + ' 8,' + f1(fl * 1.6));
    this.g.setAttribute('transform', 'translate(' + f1(this.x) + ' ' + f1(y) + ') scale(' + f1(this.s * this.dir) + ' ' + f1(this.s) + ')');
  };
  var sky = el('g', {}, host.parentNode);   // gulls live in the same layer, behind the people
  host.parentNode.insertBefore(sky, host);
  (function () {
    var n = SMALL ? 2 : 4, i, gs = [];
    for (i = 0; i < n; i++) gs.push(new Gull(sky));
    upd.push(function (t, dt) { gs.forEach(function (g) { g.update(t, dt); }); });
  })();

  /* ---------- smoke ---------- */
  function Smoke(parent, n) {
    this.pool = [];
    for (var i = 0; i < n; i++) this.pool.push({ c: el('circle', { r: 1, fill: '#e9e3df', opacity: 0 }, parent), age: 99, life: 1, x: 0, y: 0, vx: 0 });
    this.i = 0; this.acc = 0;
  }
  Smoke.prototype.emit = function (x, y, vx) {
    var p = this.pool[this.i++ % this.pool.length];
    p.age = 0; p.life = rnd(1.9, 2.8); p.x = x; p.y = y; p.vx = vx;
  };
  Smoke.prototype.update = function (dt) {
    this.pool.forEach(function (p) {
      if (p.age >= p.life) { p.c.setAttribute('opacity', 0); return; }
      p.age += dt;
      var k = p.age / p.life;
      p.x += p.vx * dt; p.y -= (20 - 9 * k) * dt;
      p.c.setAttribute('cx', f1(p.x)); p.c.setAttribute('cy', f1(p.y));
      p.c.setAttribute('r', f1(2.2 + k * 9));
      p.c.setAttribute('opacity', f1(0.78 * Math.pow(1 - k, 1.2) * 10) / 10);
    });
  };

  /* =====================================================================
   * VINEYARDS
   * ===================================================================== */
  function vineyards() {
    var h1 = new Surf(L.h1), h2 = new Surf(L.h2);
    var T0 = 880, Y1 = function (x) { return h1.y(x) + 36; };
    var g = el('g', {}, host);

    // truck, parked at the end of the rows
    var tx = 790, truck = el('g', {}, g), crates = [], nCrates = 0, truckX = 0, truckState = 'parked', truckT = 0, wheels = [];
    (function () {
      el('ellipse', { cx: 4, cy: 1, rx: 36, ry: 4, fill: '#05060f', opacity: 0.35 }, truck);
      var bed = el('g', {}, truck);
      el('rect', { x: -14, y: -19, width: 46, height: 9, fill: '#6a4a30' }, bed);
      el('rect', { x: -14, y: -22, width: 2.5, height: 12, fill: '#4a3220' }, bed);
      el('rect', { x: 29.5, y: -22, width: 2.5, height: 12, fill: '#4a3220' }, bed);
      el('rect', { x: -34, y: -23, width: 21, height: 14, rx: 2, fill: '#3b6b8a' }, truck);
      el('rect', { x: -42, y: -16, width: 10, height: 8, fill: '#2f566f' }, truck);
      el('rect', { x: -31, y: -21, width: 9, height: 7, fill: '#cfe3ee', opacity: 0.55 }, truck);
      el('rect', { x: -36, y: -12, width: 70, height: 3, fill: '#1c2a3a' }, truck);
      [-26, 18].forEach(function (cx) {
        var w = el('g', { transform: 'translate(' + cx + ' -7)' }, truck);
        el('circle', { r: 7, fill: '#0a0a12' }, w);
        var sp = el('g', {}, w);
        el('line', { x1: -5, y1: 0, x2: 5, y2: 0, stroke: '#6b7280', 'stroke-width': 1.4 }, sp);
        el('line', { x1: 0, y1: -5, x2: 0, y2: 5, stroke: '#6b7280', 'stroke-width': 1.4 }, sp);
        wheels.push({ sp: sp, a: 0 });
      });
      for (var i = 0; i < 6; i++) {
        var c = el('g', { transform: 'translate(' + (-10 + (i % 3) * 14) + ' ' + (-20 - Math.floor(i / 3) * 8) + ')', opacity: 0 }, truck);
        el('rect', { x: 0, y: -7, width: 13, height: 7.5, fill: '#8a5a34' }, c);
        el('circle', { cx: 3.5, cy: -8, r: 2.6, fill: '#4a2060' }, c); el('circle', { cx: 8.5, cy: -8, r: 2.6, fill: '#5a2a72' }, c);
        crates.push(c);
      }
    })();
    var truckS = 1.45;
    function placeTruck() {
      var x = tx + truckX;
      truck.setAttribute('transform', 'translate(' + f1(x) + ' ' + f1(Y1(x) + 4) + ') scale(' + truckS + ')');
    }
    var truckSmoke = new Smoke(g, 10);

    // baskets and pickers
    var spots = [915, 968, 1021], pickers = [], baskets = [];
    spots.forEach(function (sx, i) {
      var b = el('g', {}, g), grapes = [];
      el('path', { d: 'M-7,-8 L7,-8 L5.5,0 L-5.5,0 Z', fill: '#9a6a3a' }, b);
      el('path', { d: 'M-6,-4 H6 M-6.6,-6.2 H6.6', stroke: '#6a4524', 'stroke-width': 0.8 }, b);
      for (var k = 0; k < 6; k++) {
        var c = el('circle', { cx: -4.5 + (k % 3) * 4.5, cy: -9.5 - Math.floor(k / 3) * 3.4, r: 2.5, fill: k % 2 ? '#5a2a72' : '#4a2060', opacity: 0 }, b);
        grapes.push(c);
      }
      baskets.push({ g: b, grapes: grapes, n: 0, x: sx + 20 });
      var p = new Person(g, { hat: '#e9c77a' });
      var held = el('g', { opacity: 0 }, p.hold);
      el('circle', { cx: 7, cy: -12, r: 2.3, fill: '#4a2060' }, held); el('circle', { cx: 9.5, cy: -10.2, r: 2.3, fill: '#5a2a72' }, held);
      pickers.push({ p: p, held: held, x0: sx, ph0: i * 1.7, b: baskets[i], done: -1, s: 1.45 });
    });
    function fillBasket(b, n) {
      b.n = n;
      b.grapes.forEach(function (c, k) { c.setAttribute('opacity', k < n ? 1 : 0); });
    }
    function placeBaskets() {
      baskets.forEach(function (b) { var y = Y1(b.x) + 3; b.g.setAttribute('transform', 'translate(' + f1(b.x) + ' ' + f1(y) + ') scale(1.45)'); });
    }
    placeBaskets();

    var PERIOD = 6.4;
    pickers.forEach(function (pk) {
      pk.update = function (t) {
        var tt = (t + pk.ph0) % PERIOD, cyc = Math.floor((t + pk.ph0) / PERIOD), x = pk.x0, pose, carry = false;
        var bx = pk.b.x - 20 + 17;
        if (tt < 1.7) {                                  // bend and pick
          var k = sm(tt / 0.5) * (1 - sm((tt - 1.3) / 0.4));
          pose = { lean: 8 + 22 * k, legA: -6 * k, legB: 6 * k, armA: -40 - 28 * k + Math.sin(tt * 9) * 6 * k, armB: -30 };
          pk.held.setAttribute('opacity', tt > 1.1 ? 1 : 0);
        } else if (tt < 3.1) {                           // carry to the basket
          var u = sm((tt - 1.7) / 1.4); x = pk.x0 + (bx - pk.x0) * u;
          pose = walkPose(tt * 9, true); pk.held.setAttribute('opacity', 1); carry = true;
        } else if (tt < 3.7) {                           // drop in
          var d = Math.sin((tt - 3.1) / 0.6 * Math.PI); x = bx;
          pose = { lean: 6 + 18 * d, legA: 0, legB: 0, armA: -64 + 20 * d, armB: -58 + 20 * d };
          pk.held.setAttribute('opacity', tt < 3.4 ? 1 : 0);
          if (tt >= 3.4 && pk.done !== cyc) { pk.done = cyc; fillBasket(pk.b, Math.min(6, pk.b.n + 1)); }
        } else if (tt < 5.1) {                           // back to the vine
          var u2 = sm((tt - 3.7) / 1.4); x = bx + (pk.x0 - bx) * u2;
          pose = walkPose(tt * 9, false); pk.held.setAttribute('opacity', 0);
          pose.dir = -1;
        } else { pose = { lean: 2, legA: 0, legB: 0, armA: 6, armB: -6 }; pk.held.setAttribute('opacity', 0); }
        pk.p.pose(pose);
        pk.p.at(x, Y1(x) + 3, pk.s, (tt >= 3.7 && tt < 5.1) ? -1 : 1);
      };
    });

    // hauler: baskets to truck
    var hauler = new Person(g, { shirt: '#e8e2d0', hat: '#d9b66a' });
    var crate = el('g', { opacity: 0 }, hauler.hold);
    el('rect', { x: 3, y: -22, width: 13, height: 7.5, fill: '#8a5a34' }, crate);
    el('circle', { cx: 6.5, cy: -23, r: 2.6, fill: '#4a2060' }, crate); el('circle', { cx: 11.5, cy: -23, r: 2.6, fill: '#5a2a72' }, crate);
    var hc = { state: 'wait', t: 0, bi: 0, x: tx + 59, loaded: false };
    function setCrates(n) { nCrates = n; crates.forEach(function (c, i) { c.setAttribute('opacity', i < n ? 1 : 0); }); }
    function haulerUpdate(dt, t) {
      hc.t += dt;
      var homeX = tx + truckX + 59, pose = { lean: 2, legA: 0, legB: 0, armA: 6, armB: -6 }, dir = 1, y;
      if (hc.state === 'wait') {
        if (truckState !== 'parked') { hc.t = 0; }
        else if (hc.t > 1.2) {
          // find the fullest basket
          var bi = 0; baskets.forEach(function (b, i) { if (b.n > baskets[bi].n) bi = i; });
          if (baskets[bi].n >= 3) { hc.bi = bi; hc.state = 'out'; hc.t = 0; }
          else hc.t = 0;
        }
      } else if (hc.state === 'out') {
        var tx2 = baskets[hc.bi].x + 14, u = clamp(hc.t / 4.2, 0, 1);
        hc.x = homeX + (tx2 - homeX) * sm(u); dir = 1;
        pose = walkPose(hc.t * 8, false);
        if (u >= 1) { hc.state = 'lift'; hc.t = 0; }
      } else if (hc.state === 'lift') {
        var k2 = Math.sin(clamp(hc.t / 0.9, 0, 1) * Math.PI); dir = 1;
        pose = { lean: 4 + 24 * k2, legA: -4 * k2, legB: 4 * k2, armA: -60, armB: -54 };
        if (hc.t > 0.45 && !hc.loaded) { hc.loaded = true; fillBasket(baskets[hc.bi], 0); crate.setAttribute('opacity', 1); }
        if (hc.t > 0.9) { hc.state = 'back'; hc.t = 0; }
      } else if (hc.state === 'back') {
        var from = baskets[hc.bi].x + 14, u3 = clamp(hc.t / 4.4, 0, 1);
        hc.x = from + (homeX - from) * sm(u3);
        pose = walkPose(hc.t * 8, true);
        if (u3 >= 1) { hc.state = 'load'; hc.t = 0; }
      } else if (hc.state === 'load') {
        var k3 = Math.sin(clamp(hc.t / 0.9, 0, 1) * Math.PI);
        pose = { lean: 4 + 8 * k3, legA: 0, legB: 0, armA: -70 - 30 * k3, armB: -64 - 30 * k3 };
        if (hc.t > 0.5 && hc.loaded) { hc.loaded = false; crate.setAttribute('opacity', 0); setCrates(Math.min(6, nCrates + 1)); }
        if (hc.t > 0.95) {
          hc.state = 'wait'; hc.t = -1.5;
          if (nCrates >= 6) { truckState = 'leaving'; truckT = 0; }
        }
      }
      if (hc.state === 'wait' || hc.state === 'load') hc.x = homeX;
      y = Y1(hc.x) + 3;
      hauler.pose(pose); hauler.at(hc.x, y, 1.45, (hc.state === 'out' || hc.state === 'lift') ? 1 : -1);
    }

    // tractor
    var trac = el('g', {}, g), tractorX = 1560, tw = [], tS = 1.7;
    (function () {
      el('ellipse', { cx: 0, cy: 1, rx: 30, ry: 3.5, fill: '#05060f', opacity: 0.3 }, trac);
      el('rect', { x: -32, y: -24, width: 30, height: 13, rx: 2, fill: '#c4553a' }, trac);
      el('rect', { x: -35, y: -21, width: 4, height: 8, fill: '#1c1c24' }, trac);
      el('rect', { x: -22, y: -37, width: 3.4, height: 14, fill: '#1c1c24' }, trac);
      el('rect', { x: 0, y: -26, width: 22, height: 6, fill: '#a8412c' }, trac);
      el('rect', { x: 2, y: -44, width: 20, height: 22, rx: 2, fill: '#c4553a' }, trac);
      el('rect', { x: 4.5, y: -41, width: 15, height: 12, fill: '#cfe3ee', opacity: 0.5 }, trac);
      el('circle', { cx: 12, cy: -32, r: 3.4, fill: '#3a261d' }, trac);
      el('rect', { x: 0, y: -46, width: 24, height: 3, fill: '#8f3a28' }, trac);
      [[14, -12, 12], [-22, -7, 7]].forEach(function (w) {
        var wg = el('g', { transform: 'translate(' + w[0] + ' ' + w[1] + ')' }, trac);
        el('circle', { r: w[2], fill: '#0e1117' }, wg);
        var sp = el('g', {}, wg);
        el('line', { x1: -w[2] + 3, y1: 0, x2: w[2] - 3, y2: 0, stroke: '#7a7f88', 'stroke-width': 1.6 }, sp);
        el('line', { x1: 0, y1: -w[2] + 3, x2: 0, y2: w[2] - 3, stroke: '#7a7f88', 'stroke-width': 1.6 }, sp);
        el('circle', { r: 2.2, fill: '#c9472f' }, wg);
        tw.push({ sp: sp, r: w[2] });
      });
    })();
    var tSmoke = new Smoke(g, 16), tAcc = 0;
    function tractorUpdate(t, dt) {
      var v = 24;
      tractorX -= v * dt; if (tractorX < -120) tractorX = 1560;
      var y = h1.y(tractorX) + 104 + Math.sin(tractorX * 0.02) * 4;
      var bob = Math.sin(t * 22) * 0.45;
      trac.setAttribute('transform', 'translate(' + f1(tractorX) + ' ' + f1(y + bob) + ') scale(' + tS + ')');
      tw.forEach(function (w) { w.sp.setAttribute('transform', 'rotate(' + f1(((tractorX * tS) / (w.r * tS) * 57.3) % 360) + ')'); });
      tAcc += dt * (1 + Math.abs(Math.sin(t * 3)) * 0.6);
      if (tAcc > 0.2) { tAcc = 0; tSmoke.emit(tractorX - 20.5 * tS, y - 38 * tS, 9 + rnd(0, 4)); }
      tSmoke.update(dt);
    }

    // distant pickers on the upper field
    var far = [];
    [[690, 0.2], [748, 1.9]].forEach(function (d, i) {
      var p = new Person(g, { hat: '#e9c77a' });
      far.push({ p: p, x: d[0], ph: d[1] });
    });
    function farUpdate(t) {
      far.forEach(function (f) {
        var k = (Math.sin(t * 1.6 + f.ph) + 1) / 2;
        f.p.pose({ lean: 10 + 24 * k, legA: -4, legB: 4, armA: -50 - 20 * k, armB: -40 });
        f.p.at(f.x, h2.y(f.x) + 34, 0.82, 1);
      });
    }

    upd.push(function (t, dt) {
      // truck
      if (truckState === 'leaving') {
        truckT += dt; truckX -= (12 + truckT * 16) * dt;
        wheels.forEach(function (w) { w.a -= dt * 380; w.sp.setAttribute('transform', 'rotate(' + f1(w.a % 360) + ')'); });
        if (Math.random() < dt * 5) truckSmoke.emit(tx + truckX + 36 * truckS, Y1(tx + truckX) - 8, 14);
        truck.setAttribute('opacity', f1(clamp(1 - (truckT - 3.2) / 1.6, 0, 1)));
        if (truckT > 5) { truckState = 'arriving'; truckT = 0; setCrates(0); truckX = 0; truck.setAttribute('opacity', 0); }
      } else if (truckState === 'arriving') {
        truckT += dt; truck.setAttribute('opacity', f1(clamp(truckT / 1.8, 0, 1)));
        if (truckT > 1.8) truckState = 'parked';
      }
      placeTruck(); truckSmoke.update(dt);
      pickers.forEach(function (pk) { pk.update(t); });
      haulerUpdate(dt, t);
      tractorUpdate(t, dt);
      farUpdate(t);
    });
    // a head start so the first frame already has work under way
    fillBasket(baskets[0], 3); fillBasket(baskets[2], 2); setCrates(2);
    tractorX = 1020;
  }

  /* =====================================================================
   * CARLSBAD
   * ===================================================================== */
  function carlsbad() {
    var sand = new Surf(L.sand), g = el('g', {}, host);
    var swells = [], i;
    for (i = 0; i < 3; i++) swells.push({ p: el('path', { fill: 'none', stroke: '#ffffff', 'stroke-linecap': 'round' }, g), off: 40 + i * 70 });
    function drawSwells(dt) {
      swells.forEach(function (s) {
        s.off -= dt * 9; if (s.off < 4) s.off += 210;
        var k = s.off / 210, d = '';
        for (var x = 0; x <= 1440; x += 40) { var y = sand.y(x) - s.off - Math.sin(x * 0.012 + s.off * 0.05) * 3; d += (x ? 'L' : 'M') + x + ',' + f1(y); }
        s.p.setAttribute('d', d);
        s.p.setAttribute('stroke-width', f1(1.2 + (1 - k) * 3.2));
        s.p.setAttribute('opacity', f1(Math.min(0.5, (1 - k) * 0.9) * Math.min(1, k * 6)));
      });
    }

    // beach walkers
    var walkers = [];
    function addWalker(x0, x1, off, speed, s, o) {
      var p = new Person(g, o);
      walkers.push({ p: p, x: rnd(x0, x1), x0: x0, x1: x1, off: off, v: speed, dir: Math.random() < 0.5 ? 1 : -1, s: s, ph: rnd(0, 6) });
      return walkers[walkers.length - 1];
    }
    addWalker(640, 1380, 30, 11, 1.3, { shirt: '#e8e2d0' });
    addWalker(640, 1380, 36, 11, 1.3, { shirt: '#c45a4a' });      // a couple, kept side by side below
    addWalker(560, 1300, 52, 14, 1.55, { shirt: '#2596be' });
    addWalker(700, 1400, 24, 9, 1.15, { shirt: '#d9a441' });
    if (!SMALL) {
      addWalker(600, 1200, 64, 16, 1.7, { shirt: '#8a5aa8' });
      addWalker(760, 1420, 44, 12, 1.35, { shirt: '#e8734a' });
      addWalker(820, 1400, 28, 10, 1.2, { shirt: '#5b8a6a' });
      var bw = addWalker(560, 1100, 58, 13, 1.5, { shirt: '#2a3550' });      // walking out with a board
      var bb = el('ellipse', { cx: 3, cy: -17, rx: 2.3, ry: 17, fill: '#ffd84a', transform: 'rotate(-8 3 -17)' }, bw.p.hold);
      bw.p.hold.setAttribute('opacity', 1);
      var bw2 = addWalker(980, 1420, 40, 11, 1.4, { shirt: '#c45a4a' });
      el('ellipse', { cx: 3, cy: -17, rx: 2.3, ry: 17, fill: '#2596be', transform: 'rotate(-8 3 -17)' }, bw2.p.hold);
    }
    walkers[1].couple = walkers[0];
    // the dog
    var dog = el('g', {}, g), dogLegs = [], dx = 820, ddir = 1, dogParts = (function () {
      el('ellipse', { cx: 0, cy: -8, rx: 8.5, ry: 4, fill: '#7a5a3a' }, dog);
      el('circle', { cx: 9.5, cy: -11, r: 3.6, fill: '#7a5a3a' }, dog);
      el('path', { d: 'M12,-10 L15.5,-9 L12,-8 Z', fill: '#3a2a1c' }, dog);
      el('path', { d: 'M8,-14 L10,-17.5 L11.5,-13 Z', fill: '#3a2a1c' }, dog);
      for (var k = 0; k < 4; k++) dogLegs.push(el('line', { x1: k < 2 ? 5 : -5, y1: -6, x2: k < 2 ? 5 : -5, y2: 0, stroke: '#5a4028', 'stroke-width': 2, 'stroke-linecap': 'round' }, dog));
      return el('path', { d: 'M-8,-9 Q-13,-14 -12,-18', stroke: '#7a5a3a', 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round' }, dog);
    })();
    // umbrellas
    var umb = [];
    [[1110, '#ff6f4f'], [1262, '#2596be'], [940, '#e8c14a']].slice(0, SMALL ? 2 : 3).forEach(function (u, k) {
      var ug = el('g', {}, g), x = u[0], y = sand.y(x) + 38;
      ug.setAttribute('transform', 'translate(' + x + ' ' + f1(y) + ') scale(1.5)');
      el('ellipse', { cx: 0, cy: 1, rx: 22, ry: 2.5, fill: '#05060f', opacity: 0.25 }, ug);
      el('rect', { x: -14, y: -3, width: 28, height: 4, rx: 1, fill: k ? '#e8e2d0' : '#2596be' }, ug);
      el('line', { x1: 2, y1: -3, x2: 2, y2: -34, stroke: '#2a2a3a', 'stroke-width': 1.6 }, ug);
      el('path', { d: 'M-16,-30 Q2,-46 20,-30 Z', fill: u[1] }, ug);
      el('path', { d: 'M-6,-31 Q2,-44 6,-31 M6,-31 Q10,-42 14,-31', stroke: '#ffffff', 'stroke-width': 1.4, fill: 'none', opacity: 0.8 }, ug);
      var p = new Person(ug, { shirt: k ? '#e8734a' : '#e8e2d0', hat: k ? '#e9c77a' : undefined });
      umb.push({ p: p, ph: k * 2.2 });
    });
    // kids at the waterline
    var kids = [];
    [[760, 0.1], [900, 1.5], [1040, 3.1]].forEach(function (d) { kids.push({ p: new Person(g, { shirt: pick(SHIRT) }), x: d[0], ph: d[1], dir: 1 }); });

    // sunbathers on towels, and a couple of swimmers in the shallows
    var bathers = [];
    [[700, '#e8734a'], [1030, '#2596be'], [1350, '#e8c14a']].slice(0, SMALL ? 2 : 3).forEach(function (d, k) {
      var tg = el('g', {}, g);
      el('rect', { x: -22, y: -2, width: 44, height: 5, rx: 1, fill: d[1] }, tg);
      var p = new Person(tg, { shirt: pick(SHIRT) });
      bathers.push({ g: tg, p: p, x: d[0], ph: k * 1.9 });
    });
    var swimmers = [];
    [[300, 0.4], [560, 2.2]].forEach(function (d) {
      var sg = el('g', {}, g);
      el('circle', { cx: 0, cy: -3, r: 3.4, fill: '#5a3a2a' }, sg);
      var arm = el('path', { d: 'M3,-1 Q8,-6 13,-1', fill: 'none', stroke: '#5a3a2a', 'stroke-width': 2.2, 'stroke-linecap': 'round' }, sg);
      el('path', { d: 'M-8,0 Q0,3 8,0', fill: 'none', stroke: '#ffffff', 'stroke-width': 1.2, opacity: 0.6 }, sg);
      swimmers.push({ g: sg, arm: arm, x: d[0], ph: d[1] });
    });

    // surfers
    var paddlers = [], riders = [];
    function Board(parent, col) {
      var bg = el('g', {}, parent);
      el('ellipse', { cx: 0, cy: 0, rx: 17, ry: 2.4, fill: col }, bg);
      el('path', { d: 'M-10,0 L12,0', stroke: '#ffffff', 'stroke-width': 0.8, opacity: 0.7 }, bg);
      return bg;
    }
    [[250, 640, '#ffd84a'], [420, 700, '#ff6f4f'], [610, 626, '#e8e2d0'], [160, 700, '#2596be'], [350, 604, '#e8734a'], [690, 664, '#5b8a6a'], [90, 640, '#ffd84a']].slice(0, SMALL ? 4 : 7).forEach(function (d, k) {
      var sg = el('g', {}, g), b = Board(sg, d[2]), p = new Person(sg, { shirt: pick(SHIRT), pants: '#10182a' });
      paddlers.push({ g: sg, p: p, x: d[0], y: d[1], ph: k * 1.3 });
    });
    [[300, '#e8734a'], [520, '#2596be'], [130, '#ffd84a']].slice(0, SMALL ? 1 : 3).forEach(function (d, k) {
      var sg = el('g', {}, g), trail = el('path', { fill: 'none', stroke: '#ffffff', 'stroke-width': 2.6, 'stroke-linecap': 'round', opacity: 0 }, g);
      var b = Board(sg, d[1]), p = new Person(sg, { shirt: pick(SHIRT), pants: '#10182a' });
      riders.push({ g: sg, p: p, trail: trail, x0: d[0], t0: k * 5, pts: [] });
    });

    upd.push(function (t, dt) {
      drawSwells(dt);
      walkers.forEach(function (w) {
        if (w.couple) { w.x = w.couple.x - w.couple.dir * 14; w.dir = w.couple.dir; }
        else {
          w.x += w.dir * w.v * dt;
          if (w.x > w.x1) { w.x = w.x1; w.dir = -1; } if (w.x < w.x0) { w.x = w.x0; w.dir = 1; }
        }
        var ph = (w.x / w.v) * 5.2 + w.ph;
        w.p.pose(walkPose(ph, false));
        w.p.at(w.x, sand.y(w.x) + w.off, w.s, w.dir);
      });
      // dog runs ahead and comes back
      var lead = walkers[2];
      var target = lead.x + lead.dir * 70 + Math.sin(t * 0.9) * 55;
      ddir = target > dx ? 1 : -1; dx += clamp(target - dx, -1, 1) * 46 * dt;
      var run = t * 15;
      dogLegs.forEach(function (l, k) { l.setAttribute('transform', 'rotate(' + f1(Math.sin(run + (k % 2) * 3.14) * 34) + ' ' + (k < 2 ? 5 : -5) + ' -6)'); });
      dogParts.setAttribute('transform', 'rotate(' + f1(Math.sin(t * 14) * 12) + ' -8 -9)');
      dog.setAttribute('transform', 'translate(' + f1(dx) + ' ' + f1(sand.y(dx) + 58) + ') scale(' + f1(1.5 * ddir) + ' 1.5)');
      // umbrella people: sit, now and then wave
      umb.forEach(function (u) {
        var wave = Math.max(0, Math.sin(t * 0.55 + u.ph)) > 0.9;
        u.p.pose({ lean: 0, legA: -86, legB: -80, armA: wave ? -150 + Math.sin(t * 12) * 18 : -20, armB: 20 });
        u.p.g.setAttribute('transform', 'translate(-3 9)');
      });
      // kids dash in and out of the foam
      kids.forEach(function (k) {
        var c = (Math.sin(t * 0.9 + k.ph) + 1) / 2, x = k.x + Math.sin(t * 0.45 + k.ph) * 60;
        var y = sand.y(x) + 8 + c * 30, dir = Math.cos(t * 0.45 + k.ph) > 0 ? 1 : -1;
        k.p.pose(walkPose(t * 14 + k.ph, false)); k.p.at(x, y, 0.95, dir);
      });
      bathers.forEach(function (b) {
        var y = sand.y(b.x) + 40;
        b.g.setAttribute('transform', 'translate(' + b.x + ' ' + f1(y) + ') scale(1.4)');
        var wave = Math.sin(t * 0.5 + b.ph) > 0.92;
        b.p.pose({ lean: 82, legA: 84, legB: 82, armA: wave ? -170 + Math.sin(t * 12) * 20 : 30, armB: 40 });
        b.p.g.setAttribute('transform', 'translate(-2 9)');
      });
      swimmers.forEach(function (s) {
        var x = s.x + Math.sin(t * 0.3 + s.ph) * 30, y = sand.y(x) - 38 + Math.sin(t * 1.4 + s.ph) * 1.6;
        s.g.setAttribute('transform', 'translate(' + f1(x) + ' ' + f1(y) + ') scale(1.5)');
        s.arm.setAttribute('transform', 'rotate(' + f1(Math.sin(t * 4 + s.ph) * 40) + ' 3 -1)');
      });
      paddlers.forEach(function (s) {
        var bob = Math.sin(t * 1.1 + s.ph) * 2.2, stroke = Math.sin(t * 3 + s.ph);
        s.g.setAttribute('transform', 'translate(' + f1(s.x + Math.sin(t * 0.4 + s.ph) * 6) + ' ' + f1(s.y + bob) + ') scale(1.5) rotate(' + f1(Math.sin(t * 1.1 + s.ph) * 2.5) + ')');
        s.p.pose({ lean: 82, legA: 84, legB: 80, armA: -110 + stroke * 40, armB: -110 - stroke * 40 });
        s.p.g.setAttribute('transform', 'translate(-1 9)');
      });
      riders.forEach(function (r) {
        var tt = (t + r.t0) % 15;
        if (tt < 7) {                                  // ride the wave along the shore
          var u = tt / 7, x = r.x0 + u * 340, y = sand.y(x) - 78 - Math.sin(u * Math.PI) * 14 + u * 14;
          r.g.setAttribute('opacity', 1);
          r.g.setAttribute('transform', 'translate(' + f1(x) + ' ' + f1(y) + ') scale(1.6) rotate(' + f1(-6 + Math.sin(t * 3.4) * 5) + ')');
          r.p.pose({ lean: 16, legA: -22, legB: 24, armA: -78 + Math.sin(t * 5) * 8, armB: 80 });
          r.p.g.setAttribute('transform', 'translate(0 -1)');
          r.pts.push(f1(x - 4) + ',' + f1(y + 3)); if (r.pts.length > 24) r.pts.shift();
          r.trail.setAttribute('d', 'M' + r.pts.join(' L'));
          r.trail.setAttribute('opacity', 0.6);
        } else if (tt < 8.2) {                          // kick out
          r.g.setAttribute('opacity', f1(1 - (tt - 7) / 1.2)); r.trail.setAttribute('opacity', f1(0.6 * (1 - (tt - 7) / 1.2)));
        } else { r.g.setAttribute('opacity', 0); r.pts.length = 0; r.trail.setAttribute('opacity', 0); }
      });
    });
  }

  /* =====================================================================
   * POINT LOMA
   * ===================================================================== */
  function pointloma() {
    var g = el('g', {}, host);
    // sailboats drift on the breeze and rock on the water
    var boats = [].slice.call(scene.querySelectorAll('.boat')).map(function (b, i) {
      return { e: b, x: +b.getAttribute('data-x'), y: +b.getAttribute('data-y'), s: +b.getAttribute('data-s'), v: 1.6 + i * 0.5, ph: i * 1.7 };
    });
    // kayaker
    var kg = el('g', {}, g), kay = { x: 820, y: 650 };
    el('ellipse', { cx: 0, cy: 0, rx: 17, ry: 2.6, fill: '#e8734a' }, kg);
    var kp = new Person(kg, { shirt: '#e8e2d0', hat: '#2a3550' });
    var paddle = el('g', {}, kp.up);
    el('line', { x1: -16, y1: -11, x2: 16, y2: -11, stroke: '#2a2a3a', 'stroke-width': 1.4 }, paddle);
    el('ellipse', { cx: -17, cy: -11, rx: 3.4, ry: 1.7, fill: '#2596be' }, paddle);
    el('ellipse', { cx: 17, cy: -11, rx: 3.4, ry: 1.7, fill: '#2596be' }, paddle);
    // a stand-up paddleboarder and a second kayak
    var sup = el('g', {}, g), supP = new Person(sup, { shirt: '#e8734a', pants: '#10182a' }), sx = 1180;
    el('ellipse', { cx: 0, cy: 0, rx: 20, ry: 2.2, fill: '#e8e2d0' }, sup);
    var supPaddle = el('line', { x1: 7, y1: -28, x2: 10, y2: 4, stroke: '#2a2a3a', 'stroke-width': 1.6 }, supP.up);
    var kg2 = el('g', {}, g), kx2 = 380;
    el('ellipse', { cx: 0, cy: 0, rx: 17, ry: 2.6, fill: '#ffd84a' }, kg2);
    var kp2 = new Person(kg2, { shirt: '#2596be', hat: '#e8e2d0' });
    var paddle2 = el('g', {}, kp2.up);
    el('line', { x1: -16, y1: -11, x2: 16, y2: -11, stroke: '#2a2a3a', 'stroke-width': 1.4 }, paddle2);
    el('ellipse', { cx: -17, cy: -11, rx: 3.4, ry: 1.7, fill: '#e8e2d0' }, paddle2); el('ellipse', { cx: 17, cy: -11, rx: 3.4, ry: 1.7, fill: '#e8e2d0' }, paddle2);
    // dock and deck people
    var dock = L.dock, deck = L.deck, folks = [];
    function addFolk(x0, x1, y, s, speed, o) { var p = new Person(g, o); folks.push({ p: p, x: rnd(x0, x1), x0: x0, x1: x1, y: y, s: s, v: speed, dir: Math.random() < 0.5 ? 1 : -1, stand: speed === 0, ph: rnd(0, 6) }); }
    addFolk(dock[0], dock[1] - 10, dock[2] - 1, 1.15, 8, { shirt: '#c45a4a', hat: '#e8e2d0' });
    addFolk(dock[0], dock[1] - 10, dock[2] - 1, 1.15, 9, { shirt: '#2596be' });
    addFolk(dock[0] + 60, dock[0] + 62, dock[2] - 1, 1.15, 0, { shirt: '#e8e2d0' });
    addFolk(deck[0], deck[1], deck[2], 1.25, 0, { shirt: '#e8e2d0' });
    addFolk(deck[0] + 40, deck[1] - 30, deck[2], 1.25, 7, { shirt: '#d9a441' });
    folks[3].x = deck[0] + 30; folks[2].x = dock[0] + 61; folks[2].dir = -1;
    var flag = scene.querySelector('.flag');
    var fx = flag ? +flag.getAttribute('data-x') : 0, fy = flag ? +flag.getAttribute('data-y') : 0;

    upd.push(function (t, dt) {
      boats.forEach(function (b) {
        b.x += b.v * dt * (0.5 + b.s);
        if (b.x > 1520) b.x = -80;
        var ox = Math.sin(t * 0.6 + b.ph) * 2, oy = Math.sin(t * 1.3 + b.ph) * 1.4 * b.s, rot = Math.sin(t * 0.9 + b.ph) * 2.6;
        var a = clamp((b.x + 80) / 120, 0, 1) * clamp((1520 - b.x) / 120, 0, 1);
        b.e.setAttribute('transform', 'translate(' + f1(b.x + ox) + ' ' + f1(b.y + oy) + ') rotate(' + f1(rot) + ') scale(' + b.s + ')');
        b.e.setAttribute('opacity', f1(a));
      });
      // kayak: glides left to right, paddle dips on each side
      kay.x += 7 * dt; if (kay.x > 1500) kay.x = -60;
      var sw = Math.sin(t * 3.2);
      kg.setAttribute('transform', 'translate(' + f1(kay.x) + ' ' + f1(kay.y + Math.sin(t * 1.2) * 1.2) + ') scale(1.5)');
      kp.pose({ lean: 3, legA: -86, legB: -82, armA: -40, armB: -40 });
      kp.g.setAttribute('transform', 'translate(-1 9)');
      paddle.setAttribute('transform', 'rotate(' + f1(sw * 22) + ' 0 -11)');
      sx -= 5 * dt; if (sx < -60) sx = 1500;
      sup.setAttribute('transform', 'translate(' + f1(sx) + ' ' + f1(690 + Math.sin(t * 1.1) * 1.1) + ') scale(1.5)');
      supP.pose({ lean: 4, legA: -10, legB: 12, armA: -30 + Math.sin(t * 2.4) * 8, armB: -50 });
      supP.g.setAttribute('transform', 'translate(0 -1)');
      supPaddle.setAttribute('transform', 'rotate(' + f1(Math.sin(t * 2.4) * 9) + ' 7 -28)');
      kx2 += 6 * dt; if (kx2 > 1500) kx2 = -60;
      kg2.setAttribute('transform', 'translate(' + f1(kx2) + ' ' + f1(612 + Math.sin(t * 1.3 + 1) * 1.1) + ') scale(1.2)');
      kp2.pose({ lean: 3, legA: -86, legB: -82, armA: -40, armB: -40 }); kp2.g.setAttribute('transform', 'translate(-1 9)');
      paddle2.setAttribute('transform', 'rotate(' + f1(Math.sin(t * 3.4 + 2) * 22) + ' 0 -11)');
      folks.forEach(function (f) {
        if (f.stand) {
          var n = Math.sin(t * 0.7 + f.ph);
          f.p.pose({ lean: 0, legA: 0, legB: 0, armA: n > 0.85 ? -150 + Math.sin(t * 12) * 14 : 6, armB: -6 });
          f.p.at(f.x, f.y, f.s, f.dir);
          return;
        }
        f.x += f.dir * f.v * dt;
        if (f.x > f.x1) { f.x = f.x1; f.dir = -1; } if (f.x < f.x0) { f.x = f.x0; f.dir = 1; }
        f.p.pose(walkPose(f.x * 0.5, false)); f.p.at(f.x, f.y, f.s, f.dir);
      });
      if (flag) {
        var a1 = Math.sin(t * 4.2) * 3, a2 = Math.sin(t * 4.2 + 1.3) * 4;
        flag.setAttribute('points', f1(fx) + ',' + f1(fy) + ' ' + f1(fx + 16) + ',' + f1(fy + 2 + a1) + ' ' + f1(fx + 32) + ',' + f1(fy + 9 + a2) + ' ' + f1(fx + 16) + ',' + f1(fy + 14 + a1) + ' ' + f1(fx) + ',' + f1(fy + 22));
      }
    });
  }

  /* =====================================================================
   * ENCINITAS: traffic, pedestrians, neon flicker
   * ===================================================================== */
  function encinitas() {
    var cars = scene.querySelector('#cars'), glow = scene.querySelector('#carglow');
    var VX = 880, VY = 566, ZMAX = 15;
    var PAL = [['#1d2a44', '#141d33'], ['#6b7280', '#4b5260'], ['#e8e4da', '#bdb8aa'], ['#8c2f39', '#5f1f27'],
               ['#1f5f6b', '#164650'], ['#2a2a32', '#1a1a20'], ['#c7a35a', '#8f7236'], ['#2596be', '#1a6f8f']];
    function body(b, d, t) {
      return '<rect x="-43" y="-13" width="14" height="13" rx="3" fill="#07070f"/><rect x="29" y="-13" width="14" height="13" rx="3" fill="#07070f"/>' +
        '<path d="M-48,-10 Q-51,-28 -43,-34 L43,-34 Q51,-28 48,-10 Z" fill="' + b + '"/>' +
        '<path d="M-35,-34 L-29,' + (-57 - t) + ' Q-27,' + (-61 - t) + ' -21,' + (-61 - t) + ' L21,' + (-61 - t) + ' Q27,' + (-61 - t) + ' 29,' + (-57 - t) + ' L35,-34 Z" fill="' + d + '"/>' +
        '<path d="M-28,-36 L-24,' + (-55 - t) + ' L24,' + (-55 - t) + ' L28,-36 Z" fill="#141c30"/>' +
        '<path d="M-28,-36 L-24,' + (-55 - t) + ' L-6,' + (-55 - t) + ' L-14,-36 Z" fill="#ffb98a" opacity=".18"/>' +
        '<path d="M-43,-34 L43,-34" stroke="#ffd7a4" stroke-width="1.4" opacity=".4"/>';
    }
    function away(c, t) {
      return '<ellipse cx="0" cy="2" rx="56" ry="6" fill="#05060f" opacity=".4"/>' +
        '<g class="hl" style="mix-blend-mode:screen"><ellipse cx="0" cy="-46" rx="125" ry="48" fill="url(#hlpool)"/></g>' +
        body(c[0], c[1], t) +
        '<rect x="-48" y="-13" width="96" height="4" fill="#0c0d18" opacity=".7"/><rect x="-10" y="-23" width="20" height="7" rx="1" fill="#e6e0cc"/>' +
        '<rect x="-45" y="-31" width="16" height="7" rx="2" fill="#ff3b30"/><rect x="29" y="-31" width="16" height="7" rx="2" fill="#ff3b30"/>' +
        '<g class="hl" style="mix-blend-mode:screen"><circle cx="-37" cy="-28" r="22" fill="url(#tlglow)"/><circle cx="37" cy="-28" r="22" fill="url(#tlglow)"/></g>';
    }
    function toward(c, t) {
      return '<ellipse cx="0" cy="2" rx="56" ry="6" fill="#05060f" opacity=".4"/>' +
        '<g class="hl" style="mix-blend-mode:screen"><polygon points="-40,-22 40,-22 190,70 -190,70" fill="url(#beam)"/></g>' +
        body(c[0], c[1], t) +
        '<rect x="-21" y="-25" width="42" height="9" rx="2" fill="#0a0a12"/>' +
        '<ellipse cx="-34" cy="-26" rx="11" ry="6" fill="#fff6dc"/><ellipse cx="34" cy="-26" rx="11" ry="6" fill="#fff6dc"/>' +
        '<g class="hl" style="mix-blend-mode:screen"><circle cx="-34" cy="-26" r="34" fill="url(#hlglow)"/><circle cx="34" cy="-26" r="34" fill="url(#hlglow)"/><rect x="-95" y="-27" width="190" height="2" fill="#fff" opacity=".55"/></g>';
    }
    function mkCar(dir) {
      var c = { dir: dir, g: el('g', {}, cars), gl: el('g', {}, glow), z: 0, v: 0 };
      el('ellipse', { class: 'hl', cx: 0, cy: -48, rx: 215, ry: 92, fill: 'url(#hlglow)', opacity: 0.2, style: 'mix-blend-mode:screen' }, c.gl);
      reroll(c);
      return c;
    }
    function reroll(c) {
      var col = pick(PAL), tall = Math.random() < 0.3 ? 9 : 0;
      c.g.innerHTML = c.dir > 0 ? away(col, tall) : toward(col, tall);
      c.v = c.dir > 0 ? rnd(0.7, 1.05) : rnd(0.85, 1.25);
      c.z = c.dir > 0 ? 1.5 : ZMAX;
    }
    function place(c) {
      var z = c.z, u = 1 / z, y = VY + 334 * u, x = VX + (c.dir > 0 ? 1 : -1) * (6 + 334 * u), sc = 3.5 * u, a;
      if (c.dir > 0) a = clamp((ZMAX - z) / 6, 0, 1) * clamp((z - 1.5) / 0.5, 0, 1);
      else a = clamp((ZMAX - z) / 4, 0, 1) * clamp((z - 1.3) / 0.5, 0, 1);
      var tf = 'translate(' + f1(x) + ' ' + f1(y) + ') scale(' + sc.toFixed(3) + ')';
      c.g.setAttribute('transform', tf); c.gl.setAttribute('transform', tf);
      c.g.style.opacity = a.toFixed(2); c.gl.style.opacity = (a * 0.9).toFixed(2);
    }
    var list = [], n = SMALL ? 2 : 3, i;
    for (i = 0; i < n; i++) {
      var c1 = mkCar(1), c2 = mkCar(-1);
      c1.z = 2.4 + i * (ZMAX - 3.5) / n + rnd(0, 1.5);
      c2.z = ZMAX - 1 - i * (ZMAX - 3) / n - rnd(0, 1.5);
      list.push(c1, c2); place(c1); place(c2);
    }
    // pedestrians on the sidewalks, shrinking into the distance (u runs from near to far)
    var peds = [], np = SMALL ? 4 : 9, g = el('g', {}, host);
    function resetPed(p, first) {
      p.side = Math.random() < 0.5 ? -1 : 1;
      p.dir = Math.random() < 0.5 ? 1 : -1;               // 1: walking away from us
      p.u = first ? rnd(0.12, 0.5) : (p.dir > 0 ? 0.52 : 0.1);
      p.v = rnd(0.012, 0.022);
      p.surf = Math.random() < 0.16;                         // someone carrying a surfboard
      p.p.g.setAttribute('class', '');
      p.board.setAttribute('opacity', p.surf ? 1 : 0);
    }
    for (i = 0; i < np; i++) {
      var pp = new Person(g, { shirt: pick(SHIRT) });
      var bd = el('g', { opacity: 0 }, pp.hold);
      el('ellipse', { cx: 2, cy: -16, rx: 2.2, ry: 17, fill: pick(['#ffd84a', '#ff6f4f', '#e8e2d0', '#2596be']) }, bd);
      var ped = { p: pp, board: bd, ph: rnd(0, 6) };
      resetPed(ped, true); peds.push(ped);
    }
    function placePed(p, t) {
      var u = p.u, d = 334 * u, y = VY + d;
      var cx = p.side < 0 ? 864 - 2.17 * d : 896 + 2.17 * d, s = 5.2 * u;
      p.p.pose(walkPose(t * 7.5 + p.ph, false));
      p.p.at(cx, y, s, 1);
      var a = clamp((0.52 - u) / 0.08, 0, 1) * clamp((u - 0.09) / 0.05, 0, 1);
      p.p.g.setAttribute('opacity', a.toFixed(2));
    }
    var neon = scene.querySelector('#arcT');
    var neonTexts = neon ? [].slice.call(neon.parentNode.querySelectorAll('text')) : [];
    upd.push(function (t, dt) {
      list.forEach(function (c) {
        c.z += (c.dir > 0 ? 1 : -1) * c.v * dt * (c.z * 0.55 + 0.5) * 0.9;
        if (c.dir > 0 && c.z > ZMAX) reroll(c);
        if (c.dir < 0 && c.z < 1.3) reroll(c);
        place(c);
      });
      peds.forEach(function (p) {
        // walking away shrinks (u falls); walking toward grows
        p.u += (p.dir > 0 ? -1 : 1) * p.v * dt * (p.u * 3 + 0.4);
        if (p.u < 0.08 || p.u > 0.53) resetPed(p, false);
        placePed(p, t);
      });
      // a slow neon flicker, with an occasional stutter
      var fl = 0.92 + Math.sin(t * 2.1) * 0.05 + (Math.sin(t * 37) > 0.995 ? -0.35 : 0);
      neonTexts.forEach(function (n) { n.setAttribute('opacity', f1(fl * 10) / 10); });
    });
  }

  /* ---------- windows that turn on and off ---------- */
  (function () {
    if (H.name !== 'encinitas' && H.name !== 'pointloma' && H.name !== 'vineyards') return;
    var w = [].slice.call(scene.querySelectorAll('rect.wl')).filter(function (r) { return r.getAttribute('fill') === '#ffd98a'; });
    if (w.length > 40) w = w.filter(function () { return Math.random() < 0.35; });
    var st = w.map(function () { return { next: rnd(1, 9), on: 1 }; });
    upd.push(function (t) {
      w.forEach(function (r, i) {
        var s = st[i];
        if (t > s.next) { s.on = s.on > 0.5 ? 0.2 : 1; s.next = t + rnd(4, 14); r.style.opacity = s.on; r.style.transition = 'opacity .6s'; }
      });
    });
  })();

  /* ---------- run ---------- */
  var builders = { vineyards: vineyards, carlsbad: carlsbad, pointloma: pointloma, encinitas: encinitas };
  if (builders[H.name]) builders[H.name]();

  function step(t, dt) { for (var i = 0; i < upd.length; i++) upd[i](t, dt); }
  step(4, 0);                                  // first frame, also the still frame for reduced motion
  if (REDUCE) return;

  var T = 4, last = 0, running = false, visible = true;
  function frame(now) {
    if (!running) return;
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    T += dt; step(T, dt);
    requestAnimationFrame(frame);
  }
  function sync() {
    var go = visible && !document.hidden;
    if (go && !running) { running = true; last = 0; requestAnimationFrame(frame); }
    else if (!go) running = false;
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { visible = e[e.length - 1].isIntersecting; sync(); }, { rootMargin: '200px' }).observe(scene);
  }
  document.addEventListener('visibilitychange', sync);
  sync();
})();
