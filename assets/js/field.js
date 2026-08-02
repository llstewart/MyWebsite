/* ===========================================================================
   field.js — the contour field.

   The background is a landscape, not a screen effect. Three layers:

   1. Soft colour masses in sage, sky, and sand, rendered into a 1/10 scale
      buffer and upscaled. They are pure gradient, so resolution buys nothing
      and costs a full screen of radial fill every frame. Their only job is to
      give the glass a hue to bend.
   2. Contour lines. Fourteen smooth curves stacked down the page, each a sum
      of three sines, so the spacing opens and closes the way a topographic
      map does. These are what the glass visibly refracts, because refraction
      only reads where there is an edge to bend.
   3. Carriers. Small marks that travel along the contours, left to right.
      They drift at rest and surge while the page is scrolling, then settle
      again. It is a pipeline drawn as a landscape, which is the thing Lincoln
      actually builds.

   Runs at a 30fps ceiling, sleeps when the tab is hidden, and renders exactly
   one frame when the visitor has asked for reduced motion.
   =========================================================================== */

(function () {
  "use strict";

  var canvas = document.getElementById("field");
  if (!canvas) return;

  var ctx = canvas.getContext("2d", { alpha: false });
  // Small buffer the masses are painted into.
  var buf = document.createElement("canvas");
  var bctx = buf.getContext("2d");
  // Full size cache of the upscaled result. Blitting this is a fast copy;
  // re-running a high quality 10x upscale every frame is not, and that was
  // measured at 12fps behind a refracting panel before this existed.
  var bg = document.createElement("canvas");
  var gctx = bg.getContext("2d", { alpha: false });
  var bgAt = -1e9;
  var BG_MS = 420;

  var W = 0, H = 0, DPR = 1, BW = 0, BH = 0;
  var SCALE = 10;
  var FRAME_MS = 1000 / 30;
  var last = 0, raf = null;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var still = reduced.matches;

  function token(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }
  var PAPER = token("--c-paper", "#FBFBF9");
  var SAGE  = token("--c-field-sage", "152, 184, 160");
  var SKY   = token("--c-field-sky",  "158, 186, 210");
  var SAND  = token("--c-field-sand", "226, 205, 168");
  var BRAND = "14, 107, 82";

  var MASSES = [
    { color: SAGE, r: 0.70, fx: 0.000090, fy: 0.000140, ox: 0.18, oy: 0.26, a: 0.30 },
    { color: SKY,  r: 0.78, fx: 0.000065, fy: 0.000105, ox: 0.82, oy: 0.22, a: 0.26 },
    { color: SAND, r: 0.60, fx: 0.000115, fy: 0.000075, ox: 0.55, oy: 0.82, a: 0.22 }
  ];

  /* Fourteen contours, generated rather than listed, so the spacing stays even
     while every line gets its own shape. */
  var LINES = [];
  (function buildLines() {
    for (var i = 0; i < 14; i++) {
      var t = i / 13;
      LINES.push({
        y:  0.04 + t * 0.94,
        a1: 16 + 22 * Math.sin(i * 1.7),
        f1: 0.0009 + 0.0006 * ((i % 3) / 2),
        p1: i * 0.9,
        a2: 8 + 9 * Math.cos(i * 2.3),
        f2: 0.0026 + 0.0011 * ((i % 4) / 3),
        p2: i * 1.7,
        a3: 5,
        f3: 0.0051,
        p3: i * 0.4,
        drift: 0.000018 + 0.000012 * ((i % 5) / 4),
        w: i % 4 === 0 ? 1.05 : 0.8,
        o: i % 4 === 0 ? 0.085 : 0.05
      });
    }
  })();

  /* One carrier per few lines, offset so they never form a column. */
  var CARRIERS = [];
  (function buildCarriers() {
    for (var i = 0; i < 22; i++) {
      CARRIERS.push({
        line: (i * 5) % LINES.length,
        x: (i / 22),
        base: 0.018 + 0.020 * ((i % 6) / 5),
        size: i % 5 === 0 ? 2.2 : 1.6,
        lead: 26 + (i % 4) * 12
      });
    }
  })();

  /* Scroll energy. Rises with movement, decays on its own, and is what makes
     the field feel attached to the reader rather than playing at them. */
  var energy = 0, lastScroll = window.scrollY;
  window.addEventListener("scroll", function () {
    var d = Math.abs(window.scrollY - lastScroll);
    lastScroll = window.scrollY;
    energy = Math.min(1, energy + d / 900);
  }, { passive: true });

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    BW = Math.max(2, Math.round(W / SCALE));
    BH = Math.max(2, Math.round(H / SCALE));
    buf.width = BW;
    buf.height = BH;

    bg.width = canvas.width;
    bg.height = canvas.height;
    gctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    bgAt = -1e9;

    draw(performance.now());
  }

  function lineY(l, x, time) {
    return l.y * H
      + l.a1 * Math.sin(x * l.f1 + l.p1 + time * l.drift)
      + l.a2 * Math.sin(x * l.f2 + l.p2 - time * l.drift * 1.6)
      + l.a3 * Math.sin(x * l.f3 + l.p3);
  }

  function drawMasses(time) {
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.fillStyle = PAPER;
    bctx.fillRect(0, 0, BW, BH);

    for (var i = 0; i < MASSES.length; i++) {
      var m = MASSES[i];
      var cx = (m.ox + 0.15 * Math.sin(time * m.fx)) * BW;
      var cy = (m.oy + 0.13 * Math.cos(time * m.fy)) * BH;
      var rad = m.r * Math.max(BW, BH);
      var g = bctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, "rgba(" + m.color + "," + m.a + ")");
      g.addColorStop(0.5, "rgba(" + m.color + "," + m.a * 0.34 + ")");
      g.addColorStop(1, "rgba(" + m.color + ",0)");
      bctx.fillStyle = g;
      bctx.fillRect(0, 0, BW, BH);
    }
  }

  function drawContours(time) {
    var step = Math.max(8, Math.round(W / 110));
    ctx.lineCap = "round";
    for (var i = 0; i < LINES.length; i++) {
      var l = LINES[i];
      ctx.beginPath();
      for (var x = -step; x <= W + step; x += step) {
        var y = lineY(l, x, time);
        if (x <= -step) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(16,26,23," + l.o + ")";
      ctx.lineWidth = l.w;
      ctx.stroke();
    }
  }

  function drawCarriers(time, dt) {
    for (var i = 0; i < CARRIERS.length; i++) {
      var c = CARRIERS[i];
      var l = LINES[c.line];
      c.x += (c.base * (1 + energy * 7)) * (dt / 1000);
      if (c.x > 1.08) c.x -= 1.16;

      var px = c.x * W;
      var py = lineY(l, px, time);

      // A short trail along the line, so movement reads as travel.
      var tailX = px - c.lead * (0.4 + energy);
      ctx.beginPath();
      ctx.moveTo(tailX, lineY(l, tailX, time));
      var seg = Math.max(6, (px - tailX) / 5);
      for (var x = tailX + seg; x < px; x += seg) ctx.lineTo(x, lineY(l, x, time));
      ctx.lineTo(px, py);
      ctx.strokeStyle = "rgba(" + BRAND + "," + (0.07 + energy * 0.13) + ")";
      ctx.lineWidth = 1.1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(px, py, c.size, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(" + BRAND + "," + (0.20 + energy * 0.22) + ")";
      ctx.fill();
    }
  }

  /* The masses drift over minutes, so they are re-rendered a couple of times
     a second and cached at full size. Every frame just copies the cache. */
  function refreshBackground(time) {
    drawMasses(time);
    gctx.imageSmoothingEnabled = true;
    gctx.imageSmoothingQuality = "high";
    gctx.drawImage(buf, 0, 0, BW, BH, 0, 0, W, H);
    bgAt = time;
  }

  function draw(time, dt) {
    if (!W || !H) return;
    if (time - bgAt > BG_MS) refreshBackground(time);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bg, 0, 0, bg.width, bg.height, 0, 0, W, H);
    drawContours(time);
    drawCarriers(time, dt || FRAME_MS);
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    var dt = now - last;
    if (dt < FRAME_MS) return;
    last = now;
    energy *= 0.92;
    if (energy < 0.001) energy = 0;
    draw(now, Math.min(dt, 120));
  }

  function start() {
    if (still) { draw(0, 0); return; }
    if (raf === null) { last = performance.now(); raf = requestAnimationFrame(loop); }
  }
  function stop() {
    if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
  }

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 140);
  }, { passive: true });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop(); else start();
  });

  if (reduced.addEventListener) {
    reduced.addEventListener("change", function (e) {
      still = e.matches;
      stop();
      start();
    });
  }

  resize();
  start();

  window.SignalField = { redraw: resize, stop: stop, start: start };
})();
