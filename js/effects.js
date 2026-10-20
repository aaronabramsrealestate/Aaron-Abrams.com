/*!
 * Ricky Heidt site motion layer
 * Parallax coastal scene, cursor reactive particles (sea spray at sunset,
 * bioluminescence at night), scroll choreography, magnetic buttons.
 * Everything is progressive enhancement: with JS off or reduced motion on,
 * all content stays visible and readable.
 */
(function () {
  'use strict';

  var doc = document.documentElement;
  var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var SMALL = window.matchMedia('(max-width: 767px)').matches;
  var G = window.gsap, ST = window.ScrollTrigger;
  var HAS_GSAP = !!(G && ST);

  doc.classList.add('fx');
  if (REDUCE) doc.classList.add('fx-reduce');

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }
  function headerH() { var h = $('.site-header'); return h ? h.offsetHeight : 0; }

  /* ---------------------------------------------------------------
   * 1. PARTICLE FIELD
   * Glow sprites drawn with additive blending. Particles follow a
   * cheap trig flow field, and the cursor applies three forces:
   *   repel  (push away, falls off with distance squared)
   *   swirl  (tangential push, makes a little vortex)
   *   wake   (drags particles along with the cursor's velocity)
   * Clicks send out a shockwave ring. In "bio" mode particles also
   * light up when disturbed and the cursor leaves a glowing trail,
   * like San Diego's bioluminescent waves.
   * ------------------------------------------------------------- */
  function sprite(r, g, b) {
    var s = 64, c = document.createElement('canvas');
    c.width = c.height = s;
    var x = c.getContext('2d'), gr = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.16, 'rgba(' + r + ',' + g + ',' + b + ',0.95)');
    gr.addColorStop(0.42, 'rgba(' + r + ',' + g + ',' + b + ',0.25)');
    gr.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
    x.fillStyle = gr; x.fillRect(0, 0, s, s);
    return c;
  }
  var GOLD = sprite(255, 204, 140), CYAN = sprite(70, 236, 255);

  function Field(canvas, opts) {
    this.c = canvas; this.ctx = canvas.getContext('2d');
    this.host = opts.host; this.mode = opts.mode || 'spray';
    this.night = this.mode === 'bio' ? 1 : 0;
    this.p = []; this.trail = []; this.rings = [];
    this.mx = -9999; this.my = -9999; this.lx = null; this.ly = null; this.vx = 0; this.vy = 0;
    this.inside = false; this.sx = 0; this.sy = 0; this.t = 0; this.last = 0;
    this.visible = true; this.raf = 0;
    this.resize(); this.seed();
    var self = this;
    function pos(e) {
      var r = self.c.getBoundingClientRect();
      self.mx = e.clientX - r.left; self.my = e.clientY - r.top; self.inside = true;
    }
    this.host.addEventListener('pointermove', pos, { passive: true });
    this.host.addEventListener('pointerdown', function (e) { pos(e); self.burst(self.mx, self.my); }, { passive: true });
    this.host.addEventListener('pointerleave', function () { self.inside = false; self.lx = null; });
    this.host.addEventListener('touchmove', function (e) { if (e.touches[0]) pos(e.touches[0]); }, { passive: true });
    this.host.addEventListener('touchend', function () { self.inside = false; self.lx = null; }, { passive: true });
    window.addEventListener('resize', debounce(function () { self.resize(); self.seed(); if (REDUCE) self.draw(); }, 200));
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { self.visible = en[0].isIntersecting; if (self.visible) self.start(); }, { rootMargin: '80px' }).observe(this.host);
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) self.start(); });
    if (REDUCE) { this.draw(); } else { this.start(); }
  }
  Field.prototype.resize = function () {
    this.w = this.host.clientWidth; this.h = this.host.clientHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, SMALL ? 1.25 : 1.5);
    this.c.width = Math.round(this.w * this.dpr); this.c.height = Math.round(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };
  Field.prototype.seed = function () {
    var area = this.w * this.h, n;
    if (this.mode === 'bio') n = clamp(area / (SMALL ? 5200 : 3800), 60, SMALL ? 140 : 320);
    else n = clamp(area / (SMALL ? 8000 : 5200), 50, SMALL ? 110 : 260);
    if (REDUCE) n = Math.round(n * 0.4);
    this.p = [];
    for (var i = 0; i < n; i++) {
      var z = 0.3 + Math.random() * 0.7;
      this.p.push({ x: Math.random() * this.w, y: Math.random() * this.h, vx: 0, vy: 0, z: z,
        r: 0.6 + Math.random() * 1.7, ph: Math.random() * 6.283, ex: 0 });
    }
  };
  Field.prototype.burst = function (x, y) {
    if (REDUCE) return;
    this.rings.push({ x: x, y: y, r: 0, max: SMALL ? 220 : 340 });
    for (var i = 0; i < this.p.length; i++) {
      var p = this.p[i], dx = p.x - x, dy = p.y - y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d < 300) { var f = (1 - d / 300) * 9; p.vx += dx / d * f; p.vy += dy / d * f; p.ex = 1; }
    }
    if (this.mode === 'bio') for (var k = 0; k < 40; k++) this.spawn(x, y, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9);
  };
  Field.prototype.spawn = function (x, y, vx, vy) {
    if (this.trail.length > 420) this.trail.shift();
    this.trail.push({ x: x, y: y, vx: vx, vy: vy, life: 1, r: 0.8 + Math.random() * 2.2 });
  };
  Field.prototype.start = function () {
    if (REDUCE || this.raf || !this.visible || document.hidden) return;
    var self = this; this.last = performance.now();
    function loop(now) {
      self.raf = 0;
      if (!self.visible || document.hidden) return;
      var dt = Math.min(48, now - self.last); self.last = now;
      self.step(dt); self.draw();
      self.raf = requestAnimationFrame(loop);
    }
    this.raf = requestAnimationFrame(loop);
  };
  Field.prototype.step = function (dt) {
    var k = dt / 16.667, t = (this.t += dt), bio = this.mode === 'bio';
    // cursor velocity
    if (this.inside) {
      if (this.lx !== null) { this.vx = (this.mx - this.lx) / k; this.vy = (this.my - this.ly) / k; }
      this.lx = this.mx; this.ly = this.my;
    } else { this.vx *= 0.9; this.vy *= 0.9; }
    var speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    // smoothed pointer for depth parallax
    var tx = this.inside ? (this.mx / this.w - 0.5) : 0, ty = this.inside ? (this.my / this.h - 0.5) : 0;
    this.sx += (tx - this.sx) * 0.05 * k; this.sy += (ty - this.sy) * 0.05 * k;
    var R = bio ? 150 : 180, R2 = R * R;
    var rise = bio ? 0.02 : 0.22 + this.night * 0.1;
    for (var i = 0; i < this.p.length; i++) {
      var p = this.p[i];
      var a = Math.sin(p.x * 0.0016 + t * 0.00022) * Math.cos(p.y * 0.0021 - t * 0.00017) * 6.283;
      var flow = (bio ? 0.18 : 0.32) * p.z;
      p.vx += (Math.cos(a) * flow - p.vx) * 0.02 * k;
      p.vy += (Math.sin(a) * flow - rise * p.z - p.vy) * 0.02 * k;
      if (this.inside) {
        var dx = p.x - this.mx, dy = p.y - this.my, d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          var d = Math.sqrt(d2) || 1, f = 1 - d / R, f2 = f * f, nx = dx / d, ny = dy / d;
          p.vx += (nx * f2 * 2.4 - ny * f2 * 1.6) * k;
          p.vy += (ny * f2 * 2.4 + nx * f2 * 1.6) * k;
          p.vx += this.vx * f * 0.05 * k; p.vy += this.vy * f * 0.05 * k;
          p.ex = Math.min(1, p.ex + f * (bio ? 0.35 : 0.18) * k);
        }
      }
      for (var j = 0; j < this.rings.length; j++) {
        var rg = this.rings[j], rx = p.x - rg.x, ry = p.y - rg.y, rd = Math.sqrt(rx * rx + ry * ry) || 1;
        if (Math.abs(rd - rg.r) < 26) { p.vx += rx / rd * 1.2 * k; p.vy += ry / rd * 1.2 * k; p.ex = Math.min(1, p.ex + 0.3); }
      }
      p.vx *= Math.pow(0.955, k); p.vy *= Math.pow(0.955, k);
      p.x += p.vx * k; p.y += p.vy * k;
      p.ex *= Math.pow(bio ? 0.975 : 0.965, k);
      var m = 30;
      if (p.x < -m) p.x = this.w + m; else if (p.x > this.w + m) p.x = -m;
      if (p.y < -m) p.y = this.h + m; else if (p.y > this.h + m) p.y = -m;
    }
    // bio trail
    if (bio && this.inside && speed > 1.5) {
      var n = Math.min(7, speed / 5);
      for (var s = 0; s < n; s++) this.spawn(this.mx + (Math.random() - 0.5) * 14, this.my + (Math.random() - 0.5) * 14,
        this.vx * 0.08 + (Math.random() - 0.5) * 1.4, this.vy * 0.08 + (Math.random() - 0.5) * 1.4);
    }
    for (var q = this.trail.length - 1; q >= 0; q--) {
      var tr = this.trail[q];
      tr.x += tr.vx * k; tr.y += tr.vy * k; tr.vx *= 0.96; tr.vy *= 0.96; tr.vy -= 0.01 * k;
      tr.life -= 0.013 * k;
      if (tr.life <= 0) this.trail.splice(q, 1);
    }
    for (var r = this.rings.length - 1; r >= 0; r--) {
      this.rings[r].r += 7 * k;
      if (this.rings[r].r > this.rings[r].max) this.rings.splice(r, 1);
    }
    this.speed = speed;
  };
  Field.prototype.draw = function () {
    var c = this.ctx, w = this.w, h = this.h, t = this.t, n = this.night, bio = this.mode === 'bio';
    c.clearRect(0, 0, w, h);
    c.globalCompositeOperation = 'lighter';
    for (var i = 0; i < this.p.length; i++) {
      var p = this.p[i];
      var tw = 0.55 + 0.45 * Math.sin(t * 0.0021 + p.ph);
      var ox = -this.sx * 46 * p.z, oy = -this.sy * 26 * p.z;
      var size = p.r * (bio ? 3.4 : 4.2) * (0.6 + p.z * 0.7) * (1 + p.ex * 2.4);
      var base = bio ? (0.12 + 0.25 * p.z) * tw : (0.22 + 0.5 * p.z) * tw;
      var al = Math.min(1, base + p.ex * 0.9);
      var x = p.x + ox - size / 2, y = p.y + oy - size / 2;
      if (n < 1) { c.globalAlpha = al * (1 - n); c.drawImage(GOLD, x, y, size, size); }
      if (n > 0) { c.globalAlpha = al * n; c.drawImage(CYAN, x, y, size, size); }
    }
    for (var q = 0; q < this.trail.length; q++) {
      var tr = this.trail[q], sz = tr.r * 9 * (0.4 + tr.life);
      c.globalAlpha = tr.life * 0.9;
      c.drawImage(CYAN, tr.x - sz / 2, tr.y - sz / 2, sz, sz);
    }
    for (var r = 0; r < this.rings.length; r++) {
      var rg = this.rings[r], life = 1 - rg.r / rg.max;
      c.globalAlpha = life * 0.55;
      c.strokeStyle = n > 0.5 || bio ? 'rgb(120,240,255)' : 'rgb(255,226,180)';
      c.lineWidth = 2 + life * 3;
      c.beginPath(); c.arc(rg.x, rg.y, rg.r, 0, 6.283); c.stroke();
    }
    if (this.inside && !REDUCE) {
      var glow = 70 + Math.min(80, (this.speed || 0) * 3);
      var g = c.createRadialGradient(this.mx, this.my, 0, this.mx, this.my, glow);
      var col = bio || n > 0.5 ? '90,236,255' : '255,214,160';
      g.addColorStop(0, 'rgba(' + col + ',0.28)'); g.addColorStop(1, 'rgba(' + col + ',0)');
      c.globalAlpha = 1; c.fillStyle = g;
      c.fillRect(this.mx - glow, this.my - glow, glow * 2, glow * 2);
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  };

  var fields = [];
  $$('[data-particles]').forEach(function (cv) {
    var host = cv.parentElement;
    fields.push(new Field(cv, { host: host, mode: cv.getAttribute('data-particles') }));
  });
  function heroField() { for (var i = 0; i < fields.length; i++) if (fields[i].mode === 'spray') return fields[i]; return null; }

  function setNight(scene, v) {
    scene.style.setProperty('--night', v.toFixed(3));
    var f = heroField(); if (f) f.night = v;
  }

  if (REDUCE || !HAS_GSAP) {
    // Static, readable fallback. Pause SVG loop animations for reduced motion.
    if (REDUCE) $$('.scene svg').forEach(function (s) { if (s.pauseAnimations) s.pauseAnimations(); });
    return;
  }

  /* ---------------------------------------------------------------
   * 2. GSAP CHOREOGRAPHY
   * ------------------------------------------------------------- */
  G.registerPlugin(ST);
  ST.config({ limitCallbacks: true, ignoreMobileResize: true });

  // Smooth scrolling (desktop only) synced with ScrollTrigger
  var lenis = null;
  if (window.Lenis && FINE && !SMALL) {
    // allowNestedScroll lets a box that can scroll on its own (the pinned form sidebar)
    // scroll natively while it has room, then hands the wheel back to the page at its end.
    lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true, allowNestedScroll: true });
    window.__lenis = lenis;
    lenis.on('scroll', ST.update);
    G.ticker.add(function (time) { lenis.raf(time * 1000); });
    G.ticker.lagSmoothing(0);
  }

  // Scroll progress bar
  var bar = document.createElement('div'); bar.className = 'progress'; document.body.appendChild(bar);
  G.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

  /* --- Hero scene --- */
  $$('.scene').forEach(function (scene) {
    var isHome = scene.classList.contains('scene-home');
    var layers = $$('.layer', scene);
    var content = $('.scene-content', scene);
    var copy = $('.scene-copy', scene) || content;
    // The hero is left alone on load: nothing drops, rises or fades in, so it
    // looks the same on every page and does not flicker between them.

    // Mouse depth parallax on every layer, content counter-moves
    var movers = layers.map(function (l) {
      var d = parseFloat(l.getAttribute('data-depth')) || 0, inner = $('.layer-inner', l);
      return { d: d, x: G.quickTo(inner, 'x', { duration: 1.2, ease: 'power3' }), y: G.quickTo(inner, 'y', { duration: 1.2, ease: 'power3' }) };
    });
    var cx = G.quickTo(content, 'x', { duration: 1.4, ease: 'power3' }), cy = G.quickTo(content, 'y', { duration: 1.4, ease: 'power3' });
    if (FINE) {
      scene.addEventListener('pointermove', function (e) {
        var r = scene.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
        movers.forEach(function (m) { m.x(-nx * m.d * 150); m.y(-ny * m.d * 50); });
        cx(nx * 18); cy(ny * 10);
      });
      scene.addEventListener('pointerleave', function () { movers.forEach(function (m) { m.x(0); m.y(0); }); cx(0); cy(0); });
    }

    var cue = $('.scroll-cue', scene);
    var sunL = $('.layer-sun', scene);

    if (isHome && !SMALL) {
      // Pinned "sunset to bioluminescence" sequence
      var tl = G.timeline({
        scrollTrigger: {
          trigger: scene, start: function () { return 'top ' + headerH() + 'px'; }, end: '+=140%',
          pin: true, scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: function (st) { setNight(scene, clamp((st.progress - 0.15) / 0.6, 0, 1)); }
        }
      });
      if (cue) tl.to(cue, { opacity: 0, y: 20, duration: 0.1 }, 0);
      tl.to(sunL, { yPercent: 24, scale: 1.08, transformOrigin: '60% 60%', ease: 'none', duration: 0.75 }, 0);
      layers.forEach(function (l) {
        if (l === sunL) return;
        var d = parseFloat(l.getAttribute('data-depth')) || 0;
        tl.to(l, { scale: 1 + d * 0.55, y: d * 140, transformOrigin: '50% 100%', ease: 'none', duration: 1 }, 0);
      });
      tl.to(copy, { y: -70, opacity: 0, ease: 'none', duration: 0.32 }, 0.04);
    } else {
      // Interior pages and phones: layers separate as the hero scrolls away
      var tl2 = G.timeline({ scrollTrigger: { trigger: scene, start: 'top top', end: 'bottom top', scrub: true,
        onUpdate: function (st) { setNight(scene, clamp(st.progress * 1.3, 0, 0.85)); } } });
      layers.forEach(function (l) {
        var d = parseFloat(l.getAttribute('data-depth')) || 0;
        tl2.to(l, { y: (1 - d) * (SMALL ? 120 : 260), ease: 'none' }, 0);
      });
      tl2.to(copy, { yPercent: 40, opacity: 0, ease: 'none' }, 0);
    }
  });

  /* --- Content stays put on load; things below the fold fade in, nothing moves --- */
  function inView(el) { var r = el.getBoundingClientRect(); return r.top < window.innerHeight * 0.98 && r.bottom > 0; }
  function fadeIn(targets, trigger, stagger) {
    G.from(targets, { opacity: 0, duration: 0.6, ease: 'power1.out', stagger: stagger || 0,
      scrollTrigger: { trigger: trigger, start: 'top 92%', once: true } });
  }
  $$('[data-stagger]').forEach(function (g) { if (!inView(g)) fadeIn(g.children, g, 0.05); });
  $$('[data-reveal]').forEach(function (el) { if (!inView(el)) fadeIn(el, el); });

  /* --- Scroll speed parallax (orbs, portrait, decorative) --- */
  $$('[data-speed]').forEach(function (el) {
    var s = parseFloat(el.getAttribute('data-speed')) || 0;
    var trig = el.closest('section') || el;
    G.fromTo(el, { y: -s * 160 }, { y: s * 160, ease: 'none', scrollTrigger: { trigger: trig, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  $$('.portrait img').forEach(function (img) {
    G.fromTo(img, { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* --- Giant scroll-linked marquee --- */
  $$('.marquee-row').forEach(function (row, i) {
    var dir = i % 2 ? 1 : -1;
    G.fromTo(row, { xPercent: dir > 0 ? -30 : 0 }, { xPercent: dir > 0 ? 0 : -30, ease: 'none',
      scrollTrigger: { trigger: row.parentElement, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
  });

  /* --- Pinned horizontal neighborhood gallery --- */
  var mm = G.matchMedia();
  mm.add('(min-width: 768px)', function () {
    $$('.hgal').forEach(function (sec) {
      var track = $('.h-track', sec);
      sec.classList.add('fx-pin');
      track.scrollLeft = 0;
      function dist() { return Math.max(0, track.scrollWidth - window.innerWidth); }
      var tween = G.to(track, { x: function () { return -dist(); }, ease: 'none',
        scrollTrigger: { trigger: sec, start: function () { return 'top ' + headerH() + 'px'; }, end: function () { return '+=' + Math.round(dist() * 0.6); },   // the cards travel a bit faster than the page scrolls
          pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 } });
      $$('.h-card', sec).forEach(function (card) {
        var back = $('.h-art.back', card), front = $('.h-art.front', card);
        var o = { trigger: card, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true };
        if (back) G.fromTo(back, { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: o });
        if (front) G.fromTo(front, { xPercent: 14 }, { xPercent: -14, ease: 'none', scrollTrigger: Object.assign({}, o) });
      });
      return function () { sec.classList.remove('fx-pin'); };
    });
  });

  /* --- Magnetic buttons and custom cursor (mouse only) --- */
  if (FINE) {
    $$('.btn').forEach(function (b) {
      var xTo = G.quickTo(b, 'x', { duration: 0.5, ease: 'power3' }), yTo = G.quickTo(b, 'y', { duration: 0.5, ease: 'power3' });
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.35); yTo((e.clientY - r.top - r.height / 2) * 0.5);
      });
      b.addEventListener('pointerleave', function () { xTo(0); yTo(0); });
    });

    var dot = document.createElement('div'), ring = document.createElement('div');
    dot.className = 'cursor-dot'; ring.className = 'cursor-ring';
    document.body.appendChild(dot); document.body.appendChild(ring);
    G.set([dot, ring], { xPercent: -50, yPercent: -50 });
    var dX = G.quickTo(dot, 'x', { duration: 0.08 }), dY = G.quickTo(dot, 'y', { duration: 0.08 });
    var rX = G.quickTo(ring, 'x', { duration: 0.5, ease: 'power3' }), rY = G.quickTo(ring, 'y', { duration: 0.5, ease: 'power3' });
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      doc.classList.add('fx-cursor');
      dX(e.clientX); dY(e.clientY); rX(e.clientX); rY(e.clientY);
    }, { passive: true });
    document.addEventListener('pointerover', function (e) {
      var t = e.target;
      if (t.closest('.calendly-embed, .calendly-overlay, .calendly-popup')) { doc.classList.remove('fx-cursor'); return; }
      ring.classList.toggle('big', !!t.closest('a, button, summary, label'));
      ring.classList.toggle('dark', !!t.closest('.scene, .section-ink, .bio, .hgal, .site-footer, .cta-band'));
    });
    document.addEventListener('mouseleave', function () { doc.classList.remove('fx-cursor'); });
  }

  // Recalculate positions once fonts and images settle
  function refresh() { ST.refresh(); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  window.addEventListener('load', refresh);
})();
