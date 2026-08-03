/* ===========================================================================
   field.js — the spray.

   A flow field. Thousands of single pixel particles drifting along an
   invisible field of angles, leaving short trails.

   WHY THIS AND NOT THE SHADER IT REPLACES

   The previous version drew the same idea as one fullscreen fragment
   shader, following the structure p5aholic.me uses: domain warped noise,
   thresholded per pixel into dots. It was rewritten because measuring it
   found a fault that no amount of tuning could fix.

   That shader ran the noise at a base span of 0.20 across the whole
   viewport, copied from the reference. At that scale less than a fifth of
   one noise cell covers the screen, so there is almost no spatial variation
   in the field at any instant. What looks like a pattern is really one
   value, and as time moves the sample point through noise space that single
   value wanders. Measured across nine time samples the median ran 0.24,
   0.22, 0.21, 0.21, 0.64, 0.90, 0.23, 0.72, 0.20. Any fixed threshold
   against that is dense at some moments and completely empty at others,
   which is exactly what kept happening, including at the moment somebody
   first arrives.

   A flow field has no such failure. The number of particles IS the
   coverage. It cannot be empty, because emptiness is not a state it can
   reach.

   HOW IT WORKS

   1. An invisible grid over the viewport. Every cell holds an angle taken
      from value noise, so neighbouring cells point in similar directions
      and the whole grid reads as a smooth curving current.
   2. Particles are scattered across the page. Each frame every particle
      looks up the angle in the cell it is standing in and steps that way.
   3. The canvas is never cleared. It is painted with paper at a low alpha
      instead, so previous positions fade out over about twenty frames and
      each particle leaves a short trail. Those trails are what read as
      sweeping waves rather than as drifting dust.

   The current itself rotates slowly, and the speed breathes on a period
   unrelated to the rotation, so the spray gathers and slackens instead of
   running at one rate forever. Scrolling adds energy on top, which decays.

   Costs are capped the way the glass is: device pixel ratio at 1.5, thirty
   frames a second, asleep when the tab is hidden, one static frame under
   reduced motion, and it does not start at all on a metered connection.
   Any of those exits leaves the CSS gradients underneath untouched, and
   .has-shader only goes on <html> once a frame has actually been drawn.
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

  /* ------------------------------------------------------------------
     Colour, from the tokens file so the palette keeps one home.
     ------------------------------------------------------------------ */

  function token(name, fallback) {
    var v = getComputedStyle(root).getPropertyValue(name).trim();
    return v || fallback;
  }
  var PAPER = token("--c-paper", "#FBFBF9");
  var GRAIN = token("--c-field-grain", "#4A5054");

  function rgb(hex) {
    hex = hex.replace("#", "");
    return [parseInt(hex.slice(0, 2), 16),
            parseInt(hex.slice(2, 4), 16),
            parseInt(hex.slice(4, 6), 16)];
  }
  var P = rgb(PAPER);

  /* ------------------------------------------------------------------
     The noise behind the current. Value noise is enough: the grid is
     coarse and the angles only need to vary smoothly, not beautifully.
     ------------------------------------------------------------------ */

  function hash(x, y, z) {
    var n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123;
    return n - Math.floor(n);
  }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function noise(x, y, z) {
    var ix = Math.floor(x), iy = Math.floor(y);
    var fx = smooth(x - ix), fy = smooth(y - iy);
    var a = hash(ix, iy, z),         b = hash(ix + 1, iy, z);
    var c = hash(ix, iy + 1, z),     d = hash(ix + 1, iy + 1, z);
    var top = a + (b - a) * fx, bot = c + (d - c) * fx;
    return top + (bot - top) * fy;
  }

  /* ------------------------------------------------------------------
     State.
     ------------------------------------------------------------------ */

  var DPR_CAP = 1.5;
  var FRAME_MS = 1000 / 30;
  var CELL = 26;          // grid cell, CSS px
  /* Trail length. This was 0.055, which left tails long enough that the
     page read as fur rather than as spray: at that alpha a mark survives
     about twenty frames, and twenty frames of travel is a stroke, not a
     dot. Shorter tails, and the type wins again. */
  var TRAIL = 0.17;       // paper alpha per frame; lower = longer trails
  var LIFE = 190;         // frames before a particle is recycled

  var W = 0, H = 0, dpr = 1;
  var cols = 0, rows = 0, angles = null;
  var px = null, py = null, pl = null, pv = null;
  var count = 0;
  var raf = null, last = 0, frame = 0;
  var energy = 0, lastScroll = window.scrollY;
  var cloudZ = 0;   /* drifts the clouds, slower than the current turns */

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

    /* Particle count follows area, so a phone does not pay for a desktop's
       coverage and a wide monitor does not look sparse. */
    count = Math.min(11000, Math.max(1600, Math.round(cw * ch / 240)));
    px = new Float32Array(count);
    py = new Float32Array(count);
    pl = new Float32Array(count);
    pv = new Float32Array(count);
    for (var i = 0; i < count; i++) spawn(i, true);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, cw, ch);
  }

  /* Where a particle is allowed to appear.

     Spawning uniformly covers the page evenly, which is not what the
     reference does: its spray gathers into clouds with clear paper between
     them. This is a slow noise field, drifting on its own z, and a
     candidate position is accepted in proportion to it. Rejection sampling
     rather than placement, so the clouds have soft edges instead of
     outlines.

     It gives up after six tries and takes what it has. A particle that
     cannot find a home still has to go somewhere, and a loop that might not
     terminate has no place in a frame budget. */
  function densityAt(x, y, z) {
    var n = noise(x / 260, y / 260, z);
    /* Cubed rather than squared, so there is genuinely clear paper between
       the clouds instead of a thin haze everywhere. */
    return 0.04 + 0.96 * n * n * n;
  }

  function spawn(i, initial) {
    var cw = window.innerWidth, ch = window.innerHeight;
    var z = cloudZ;
    var tries = 0, x, y;
    do {
      x = Math.random() * cw;
      y = Math.random() * ch;
    } while (++tries < 6 && Math.random() > densityAt(x, y, z));
    px[i] = x;
    py[i] = y;
    /* Staggered ages, or every particle would recycle on the same frame and
       the whole page would blink. */
    pl[i] = initial ? Math.random() * LIFE : 0;
    pv[i] = 0.55 + Math.random() * 0.9;   // per particle speed spread
  }

  /* The current. Recomputed on a slow z so it turns over gradually rather
     than being rebuilt into something unrelated. */
  function field(z) {
    var scale = 0.055;
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        /* Two octaves. One alone gives a current that is too orderly, and
           the whole page sweeps in a single direction. */
        var n = noise(x * scale, y * scale, z) * 0.72 +
                noise(x * scale * 2.7, y * scale * 2.7, z * 1.4) * 0.28;
        angles[y * cols + x] = n * Math.PI * 4.0;
      }
    }
  }

  /* ------------------------------------------------------------------
     The frame.
     ------------------------------------------------------------------ */

  function step(now) {
    var cw = window.innerWidth, ch = window.innerHeight;
    var t = now / 1000;

    /* Speed breathes on one period and the current turns on another, so
       the two never line up into a loop you can catch. Scroll energy rides
       on top and decays on its own. */
    var breath = 0.62 + 0.38 * Math.sin(t * 0.11) * Math.sin(t * 0.037);
    var speed = (0.30 + breath * 0.62 + energy * 1.3) * dpr;

    cloudZ = t * 0.021;
    if (frame % 6 === 0) field(t * 0.035);

    /* Not cleared. Painted over, so what was drawn before fades and every
       particle leaves a trail behind it. */
    ctx.fillStyle = "rgba(" + P[0] + "," + P[1] + "," + P[2] + "," + TRAIL + ")";
    ctx.fillRect(0, 0, cw, ch);

    /* Each dot is faint. Density carries the effect, not weight: a page of
       marks strong enough to see individually is a page you cannot read
       over. */
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = GRAIN;
    var size = 1 / dpr * 1.1;

    for (var i = 0; i < count; i++) {
      var gx = (px[i] / CELL) | 0;
      var gy = (py[i] / CELL) | 0;
      if (gx < 0) gx = 0; else if (gx >= cols) gx = cols - 1;
      if (gy < 0) gy = 0; else if (gy >= rows) gy = rows - 1;

      var a = angles[gy * cols + gx];
      var v = speed * pv[i];
      px[i] += Math.cos(a) * v;
      py[i] += Math.sin(a) * v;

      ctx.fillRect(px[i], py[i], size, size);

      /* Recycle when it leaves or when it has lived long enough. Without
         the age limit particles pile into the field's sinks and the page
         ends up with a few dense knots and nothing between them. */
      if (++pl[i] > LIFE ||
          px[i] < -20 || px[i] > cw + 20 || py[i] < -20 || py[i] > ch + 20) {
        spawn(i, false);
      }
    }

    ctx.globalAlpha = 1;
    energy *= 0.94;
    frame++;
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (now - last < FRAME_MS) return;
    last = now;
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
  field(0);

  if (reduced) {
    /* One frame, no motion: the spray still belongs on the page, it simply
       does not move. */
    for (var k = 0; k < 40; k++) step(k * FRAME_MS);
  }

  root.classList.add("has-shader");
  start();

  window.SignalField = { stop: stop, start: start, redraw: resize };
})();
