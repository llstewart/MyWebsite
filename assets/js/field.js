/* ===========================================================================
   field.js — the spray.

   Thousands of single pixel particles, advected continuously along an
   invisible current. No trails, no spawning, no dying.

   THREE THINGS THIS GOT WRONG BEFORE, AND WHY

   1. It was a fragment shader. That shader ran its noise at a base span of
      0.20 across the viewport, copied from p5aholic.me. At that scale less
      than a fifth of one noise cell covers the screen, so there is almost
      no spatial variation at any instant: what looks like a pattern is
      really one value, and as time moves the sample point through noise
      space that value wanders. Measured across nine time samples the median
      ran 0.24, 0.22, 0.21, 0.21, 0.64, 0.90, 0.23, 0.72, 0.20. No fixed
      threshold survives that. It was dense at some moments and completely
      empty at others, including the moment somebody arrives.

   2. It had trails. Painting paper at a low alpha instead of clearing left
      every particle a tail, and tails read as fur. Looking at the reference
      closely settles it: there are no streaks in it at all, only isolated
      dots. Its motion lives in how the density MOVES, not in tails.

   3. Particles were born and recycled on a life counter. That is what read
      as populating and unpopulating rather than as flow. Nothing here is
      created or destroyed now: the field wraps, so a particle leaving one
      edge continues from the other, and every dot on screen has been
      travelling since the page loaded.

   HOW IT WORKS

   An invisible grid over the viewport, each cell holding a direction, with
   neighbouring cells holding similar ones so the whole grid reads as a
   smooth curving current. Every frame the canvas is cleared, each particle
   reads the direction of the cell it stands in, steps that way, and is
   drawn as a single pixel. Continuous motion, permanently.

   The current does not always come from the same rule. It cycles through
   four movements and crossfades between them, so the page keeps changing
   what it is doing instead of running one behaviour forever. See MOVEMENTS.

   Nothing may pile into a solid patch. See the occupancy cap in step().

   Capped like the glass: device pixel ratio at 1.5, thirty frames a second,
   asleep when hidden, one static frame under reduced motion, off on a
   metered connection. Any exit leaves the CSS gradients underneath
   untouched, and .has-shader only lands once a frame has been drawn.
   =========================================================================== */

(function () {
  "use strict";

  var canvas = document.getElementById("field-gl");
  if (!canvas) return;

  var root = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || ""))) return;

  var ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return;

  function token(name, fallback) {
    var v = getComputedStyle(root).getPropertyValue(name).trim();
    return v || fallback;
  }
  var PAPER = token("--c-paper", "#FBFBF9");
  var GRAIN = token("--c-field-grain", "#4A5054");

  /* ------------------------------------------------------------------
     Noise. Value noise is enough: the grid is coarse and the directions
     only need to vary smoothly, not beautifully.
     ------------------------------------------------------------------ */

  function hash(x, y, z) {
    var n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123;
    return n - Math.floor(n);
  }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function noise(x, y, z) {
    var ix = Math.floor(x), iy = Math.floor(y);
    var fx = smooth(x - ix), fy = smooth(y - iy);
    var a = hash(ix, iy, z),     b = hash(ix + 1, iy, z);
    var c = hash(ix, iy + 1, z), d = hash(ix + 1, iy + 1, z);
    var top = a + (b - a) * fx, bot = c + (d - c) * fx;
    return top + (bot - top) * fy;
  }

  /* ------------------------------------------------------------------
     State.
     ------------------------------------------------------------------ */

  var DPR_CAP = 1.5;
  var FRAME_MS = 1000 / 30;
  var CELL = 26;          // direction grid cell, CSS px
  var DOT_ALPHA = 0.42;   // density carries this, not weight

  /* The occupancy cap. See step(). */
  /* Six pixel cells at two dots each caps coverage near five percent,
     which stops the stain but also flattens the page to one even density
     and throws away the thing worth having. Five pixel cells at four dots
     allow about sixteen percent, so the current can genuinely crowd
     somewhere and genuinely thin out elsewhere, and only the extreme is
     refused. The cap is a ceiling, not a target. */
  var OCC = 5;            // occupancy cell, CSS px
  var OCC_MAX = 4;        // dots allowed per cell per frame

  var W = 0, H = 0, dpr = 1;
  var cols = 0, rows = 0, angles = null;
  var occCols = 0, occRows = 0, occ = null;
  var px = null, py = null, pv = null;
  var img = null, buf = null, blank = null;
  var DOT_R = 0, DOT_G = 0, DOT_B = 0;
  var count = 0;
  var raf = null, last = 0, frame = 0;
  var energy = 0, lastScroll = window.scrollY;

  /* ------------------------------------------------------------------
     MOVEMENTS.

     Four ways of deciding which way a cell points. The page holds one for
     a while, crossfades into the next over a few seconds, and goes round.
     One rule forever was what made the first version feel like a
     screensaver: never still, but always doing the same thing.

     Blending is done on the VECTOR, never on the angle. Angles wrap, so
     interpolating them sends a cell the long way round the circle and the
     current visibly tears during the handover.
     ------------------------------------------------------------------ */

  var MOVEMENTS = [
    /* Open noise current. Broad, wandering, no structure you could name. */
    { name: "drift", speed: 1.00, angle: function (x, y, t) {
        var s = 0.055;
        var n = noise(x * s, y * s, t * 0.035) * 0.72 +
                noise(x * s * 2.7, y * s * 2.7, t * 0.049) * 0.28;
        return n * Math.PI * 4.0;
      } },

    /* Mini waves, rotating. Short wavelength ripples running across the
       page with the whole set of them turning, so the direction they travel
       comes around over a couple of minutes. Medium pace deliberately: fast
       enough to read as movement, slow enough not to flicker. */
    { name: "waves", speed: 1.20, angle: function (x, y, t) {
        var rot = t * 0.052;
        var kx = Math.cos(rot), ky = Math.sin(rot);
        return rot + Math.sin((x * kx + y * ky) * 0.42 - t * 1.15) * 0.85;
      } },

    /* Two slow vortices, drifting. Particles run tangentially around them,
       which pulls the spray into arcs. */
    { name: "swirl", speed: 0.92, angle: function (x, y, t) {
        var c1x = cols * (0.34 + 0.16 * Math.sin(t * 0.041));
        var c1y = rows * (0.46 + 0.14 * Math.cos(t * 0.033));
        var c2x = cols * (0.71 + 0.13 * Math.cos(t * 0.027));
        var c2y = rows * (0.58 + 0.15 * Math.sin(t * 0.045));
        var d1x = x - c1x, d1y = y - c1y;
        var d2x = x - c2x, d2y = y - c2y;
        var w1 = 1 / (1 + (d1x * d1x + d1y * d1y) * 0.006);
        var w2 = 1 / (1 + (d2x * d2x + d2y * d2y) * 0.006);
        var a1 = Math.atan2(d1y, d1x) + Math.PI / 2;
        var a2 = Math.atan2(d2y, d2x) - Math.PI / 2;
        return Math.atan2(Math.sin(a1) * w1 + Math.sin(a2) * w2,
                          Math.cos(a1) * w1 + Math.cos(a2) * w2);
      } },

    /* Laminar bands sliding across each other. The most orderly of the
       four, and the one that makes the others read as disorder. */
    { name: "shear", speed: 1.05, angle: function (x, y, t) {
        var band = Math.sin(y * 0.32 + t * 0.16) + 0.35 * Math.sin(y * 0.11 - t * 0.09);
        return Math.PI * 0.5 * band + Math.sin(t * 0.02) * 0.6;
      } }
  ];

  var HOLD = 16;    // seconds on one movement
  var FADE = 3.4;   // seconds crossfading into the next
  var moveA = 0, moveB = 1, blend = 0, cycleT = 0, speedMul = 1;

  function updateCycle(dt) {
    cycleT += dt;
    if (cycleT < HOLD) {
      blend = 0;
    } else if (cycleT < HOLD + FADE) {
      var k = (cycleT - HOLD) / FADE;
      blend = k * k * (3 - 2 * k);
    } else {
      cycleT = 0; blend = 0;
      moveA = moveB;
      moveB = (moveB + 1) % MOVEMENTS.length;
    }
    var A = MOVEMENTS[moveA], B = MOVEMENTS[moveB];
    speedMul = A.speed + (B.speed - A.speed) * blend;
  }

  function buildField(t) {
    var A = MOVEMENTS[moveA].angle, B = MOVEMENTS[moveB].angle, k = blend;
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var a = A(x, y, t);
        if (k <= 0) { angles[y * cols + x] = a; continue; }
        var b = B(x, y, t);
        angles[y * cols + x] = Math.atan2(
          Math.sin(a) * (1 - k) + Math.sin(b) * k,
          Math.cos(a) * (1 - k) + Math.cos(b) * k);
      }
    }
  }

  /* ------------------------------------------------------------------
     Layout.
     ------------------------------------------------------------------ */

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    var cw = window.innerWidth, ch = window.innerHeight;
    W = Math.round(cw * dpr);
    H = Math.round(ch * dpr);
    if (canvas.width === W && canvas.height === H) return;

    canvas.width = W;
    canvas.height = H;
    canvas.style.width = cw + "px";
    canvas.style.height = ch + "px";

    cols = Math.ceil(cw / CELL) + 2;
    rows = Math.ceil(ch / CELL) + 2;
    angles = new Float32Array(cols * rows);

    occCols = Math.ceil(cw / OCC) + 2;
    occRows = Math.ceil(ch / OCC) + 2;
    occ = new Uint8Array(occCols * occRows);

    count = Math.min(15000, Math.max(2400, Math.round(cw * ch / 150)));
    px = new Float32Array(count);
    py = new Float32Array(count);
    pv = new Float32Array(count);
    for (var i = 0; i < count; i++) {
      px[i] = Math.random() * cw;
      py[i] = Math.random() * ch;
      pv[i] = 0.6 + Math.random() * 0.85;
    }

    /* Pixels are written straight into an ImageData rather than drawn with
       fillRect. Fifteen thousand fillRect calls a frame froze the renderer
       outright; fifteen thousand array writes do not come close. It also
       makes the density ceiling exact, because a dot is one assignment to
       one pixel and overlapping dots cannot stack into something darker
       than a single dot is. */
    img = ctx.createImageData(W, H);
    buf = img.data;

    var pr = parseInt(PAPER.slice(1, 3), 16),
        pg = parseInt(PAPER.slice(3, 5), 16),
        pb = parseInt(PAPER.slice(5, 7), 16);
    var gr = parseInt(GRAIN.slice(1, 3), 16),
        gg = parseInt(GRAIN.slice(3, 5), 16),
        gb = parseInt(GRAIN.slice(5, 7), 16);

    /* The dot colour is paper mixed toward grain once, here, instead of
       being alpha blended per pixel every frame. */
    DOT_R = Math.round(pr + (gr - pr) * DOT_ALPHA);
    DOT_G = Math.round(pg + (gg - pg) * DOT_ALPHA);
    DOT_B = Math.round(pb + (gb - pb) * DOT_ALPHA);

    /* A prefilled paper frame, so clearing is one typed array copy. */
    blank = new Uint8ClampedArray(W * H * 4);
    for (var b = 0; b < W * H; b++) {
      blank[b * 4] = pr; blank[b * 4 + 1] = pg; blank[b * 4 + 2] = pb; blank[b * 4 + 3] = 255;
    }
  }

  /* ------------------------------------------------------------------
     The frame.
     ------------------------------------------------------------------ */

  function step(now) {
    var cw = window.innerWidth, ch = window.innerHeight;
    var t = now / 1000;

    var breath = 0.62 + 0.38 * Math.sin(t * 0.11) * Math.sin(t * 0.037);
    var speed = (0.45 + breath * 0.85 + energy * 1.6) * speedMul;

    if (frame % 4 === 0) buildField(t);

    /* Cleared, not painted over. The reference has no streaks in it, and
       nor does this: what moves is the dot, not a tail behind it. */
    buf.set(blank);

    /* The occupancy cap.

       A flow field has sinks: places where the current converges and every
       particle that arrives keeps arriving. Left alone those areas fill in
       solid and the spray becomes a stain of space grey, which is exactly
       where the eye then goes.

       So the page is divided into small cells and each accepts a fixed
       number of dots per frame. Beyond that a particle still moves and
       still exists, it simply is not drawn this frame. Capping what is
       DRAWN rather than removing particles matters: removing them would
       thin the current that caused the convergence, so the crowding would
       vanish along with the evidence of it, and the page would slowly lose
       the particles it needs everywhere else. */
    occ.fill(0);

    for (var i = 0; i < count; i++) {
      var gx = (px[i] / CELL) | 0;
      var gy = (py[i] / CELL) | 0;
      if (gx < 0) gx = 0; else if (gx >= cols) gx = cols - 1;
      if (gy < 0) gy = 0; else if (gy >= rows) gy = rows - 1;

      var a = angles[gy * cols + gx];
      var v = speed * pv[i];
      var x = px[i] + Math.cos(a) * v;
      var y = py[i] + Math.sin(a) * v;

      /* Wrap, never respawn. A particle leaving one edge continues from
         the other, so nothing is ever created or destroyed and every dot
         has been travelling since the page loaded. This is the difference
         between a flow and a sequence of arrivals and departures. */
      if (x < 0) x += cw; else if (x >= cw) x -= cw;
      if (y < 0) y += ch; else if (y >= ch) y -= ch;
      px[i] = x; py[i] = y;

      var ox = (x / OCC) | 0, oy = (y / OCC) | 0;
      var oi = oy * occCols + ox;
      if (occ[oi] >= OCC_MAX) continue;
      occ[oi]++;

      var dx = (x * dpr) | 0, dy = (y * dpr) | 0;
      if (dx < 0 || dy < 0 || dx >= W || dy >= H) continue;
      var q = (dy * W + dx) * 4;
      buf[q] = DOT_R; buf[q + 1] = DOT_G; buf[q + 2] = DOT_B;
    }

    ctx.putImageData(img, 0, 0);

    energy *= 0.94;
    frame++;
  }

  /* ------------------------------------------------------------------ */

  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (now - last < FRAME_MS) return;
    var dt = last ? Math.min(0.2, (now - last) / 1000) : FRAME_MS / 1000;
    last = now;
    updateCycle(dt);
    step(now);
  }

  function start() {
    if (reduced) return;
    if (raf === null) { last = 0; raf = requestAnimationFrame(loop); }
  }
  function stop() {
    if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
  }

  window.addEventListener("scroll", function () {
    var y = window.scrollY;
    energy = Math.min(1, energy + Math.abs(y - lastScroll) / 900);
    lastScroll = y;
  }, { passive: true });

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 160);
  }, { passive: true });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop(); else start();
  });

  resize();
  buildField(0);
  step(0);

  root.classList.add("has-shader");
  start();

  window.SignalField = {
    stop: stop, start: start, redraw: resize,
    movement: function () {
      return MOVEMENTS[moveA].name + (blend ? " -> " + MOVEMENTS[moveB].name : "");
    }
  };
})();
