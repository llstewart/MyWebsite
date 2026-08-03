/* ===========================================================================
   field.js — the flow field.

   Particles drifting along an invisible current, leaving short trails, with
   the current itself cycling through six named movements.

   ARCHITECTURE

   Four parts, each with one job and no knowledge of the others:

     Noise      pure function. value noise, no state.
     Movements  pure functions. (cellX, cellY, seconds) -> an angle.
                A movement never touches a particle, a canvas, or the DOM.
     Field      owns the grid of angles. Asks the current movement (or two,
                mid transition) for each cell. Knows nothing about drawing.
     Renderer   owns the canvas, the particles and the frame loop. Reads
                angles. Never computes one.

   Adding a movement means adding one pure function to MOVEMENTS. It cannot
   break the renderer, because it cannot reach it.

   TRANSITIONS

   Interpolating between two movements is done on the ANGLE along the
   shortest arc, not by averaging the two direction vectors.

   Vector averaging is the obvious approach and it has a hole in it: two
   opposing directions sum to nearly zero, so mid transition those cells hand
   the renderer a near zero vector and every particle standing in one stalls
   and jitters. That is what made the previous transitions feel broken. Angle
   interpolation along the shortest arc always yields a unit direction, so a
   cell rotates smoothly from one movement to the other and never loses
   magnitude on the way.

   The grid is also rebuilt every frame rather than every fourth. At a
   quarter rate the current visibly steps during a transition, which is
   exactly when it must not.
   =========================================================================== */

(function () {
  "use strict";

  var canvas = document.getElementById("field-dots");
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

  function rgbOf(hex) {
    hex = hex.replace("#", "");
    return [parseInt(hex.slice(0, 2), 16),
            parseInt(hex.slice(2, 4), 16),
            parseInt(hex.slice(4, 6), 16)];
  }
  var P = rgbOf(PAPER);

  /* ==================================================================
     Noise. Pure.
     ================================================================== */

  function hash(x, y, z) {
    var n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123;
    return n - Math.floor(n);
  }
  function ease(t) { return t * t * (3 - 2 * t); }
  function noise(x, y, z) {
    var ix = Math.floor(x), iy = Math.floor(y);
    var fx = ease(x - ix), fy = ease(y - iy);
    var a = hash(ix, iy, z),     b = hash(ix + 1, iy, z);
    var c = hash(ix, iy + 1, z), d = hash(ix + 1, iy + 1, z);
    var top = a + (b - a) * fx, bot = c + (d - c) * fx;
    return top + (bot - top) * fy;
  }

  /* ==================================================================
     Movements. Pure: (x, y, t) -> angle in radians.

     x and y are grid cell indices, t is seconds. Each carries its own
     speed multiplier, because a pattern of tight arcs and a pattern of
     long straight bands do not read as the same pace at the same rate.
     ================================================================== */

  var gridW = 0, gridH = 0;   // read by the centre-relative movements

  var MOVEMENTS = [
    /* Open noise current. Broad and wandering, no nameable structure. Two
       octaves, because one alone sweeps the whole page one way. */
    { name: "drift", speed: 1.00, angle: function (x, y, t) {
        var s = 0.055, z = t * 0.035;
        return (noise(x * s, y * s, z) * 0.72 +
                noise(x * s * 2.7, y * s * 2.7, z * 1.4) * 0.28) * Math.PI * 4;
      } },

    /* Mini waves, rotating. Short ripples crossing the page with the whole
       set of them turning, so the direction they travel comes around over a
       couple of minutes. Medium pace: enough to read as movement, not
       enough to flicker. */
    { name: "waves", speed: 1.20, angle: function (x, y, t) {
        var rot = t * 0.052;
        return rot + Math.sin((x * Math.cos(rot) + y * Math.sin(rot)) * 0.42
                              - t * 1.15) * 0.85;
      } },

    /* Two drifting vortices. Particles run tangentially, pulling the spray
       into arcs. Weighted by inverse square distance so each one dominates
       near itself and neither reaches across the whole page. */
    { name: "swirl", speed: 0.92, angle: function (x, y, t) {
        var ax = gridW * (0.34 + 0.16 * Math.sin(t * 0.041));
        var ay = gridH * (0.46 + 0.14 * Math.cos(t * 0.033));
        var bx = gridW * (0.71 + 0.13 * Math.cos(t * 0.027));
        var by = gridH * (0.58 + 0.15 * Math.sin(t * 0.045));
        var dax = x - ax, day = y - ay, dbx = x - bx, dby = y - by;
        var wa = 1 / (1 + (dax * dax + day * day) * 0.006);
        var wb = 1 / (1 + (dbx * dbx + dby * dby) * 0.006);
        var a1 = Math.atan2(day, dax) + Math.PI / 2;
        var a2 = Math.atan2(dby, dbx) - Math.PI / 2;
        return Math.atan2(Math.sin(a1) * wa + Math.sin(a2) * wb,
                          Math.cos(a1) * wa + Math.cos(a2) * wb);
      } },

    /* Laminar bands sliding across each other at different rates. The most
       orderly of the set, and the one that makes the others read as
       disorder by contrast. */
    { name: "shear", speed: 1.05, angle: function (x, y, t) {
        return Math.PI * 0.5 * (Math.sin(y * 0.32 + t * 0.16)
             + 0.35 * Math.sin(y * 0.11 - t * 0.09))
             + Math.sin(t * 0.02) * 0.6;
      } },

    /* NEW. A ring travelling outward from a wandering source, like
       something dropped in water. Particles turn to face the wavefront as
       it passes and settle back once it has gone by, so the page gets a
       pulse crossing it rather than a steady current. */
    { name: "ripple", speed: 1.10, angle: function (x, y, t) {
        var cx = gridW * (0.5 + 0.22 * Math.sin(t * 0.023));
        var cy = gridH * (0.5 + 0.18 * Math.cos(t * 0.031));
        var dx = x - cx, dy = y - cy;
        var d = Math.sqrt(dx * dx + dy * dy);
        var radial = Math.atan2(dy, dx);
        /* The wavefront turns the radial direction into a tangential one
           and back again as it passes. */
        return radial + Math.sin(d * 0.34 - t * 1.9) * 1.25;
      } },

    /* NEW. Turbulence: the noise current sampled at a much finer scale and
       fed back through itself, so it curls at the size of a paragraph
       rather than the size of the page. The busiest of the six, which is
       why it runs slowest. */
    { name: "curl", speed: 0.80, angle: function (x, y, t) {
        var s = 0.14, z = t * 0.05;
        var a = noise(x * s, y * s, z);
        var b = noise(x * s + a * 1.8, y * s - a * 1.4, z * 1.3);
        return (a * 0.35 + b * 0.65) * Math.PI * 6;
      } }
  ];

  /* ==================================================================
     Field. Owns the grid of angles and the transition between movements.
     ================================================================== */

  var CELL = 26;
  var HOLD = 15;     // seconds on one movement
  var FADE = 4.5;    // seconds crossfading into the next

  var cols = 0, rows = 0, angles = null;
  var from = 0, to = 1, blend = 0, phase = 0, speedMul = 1;

  function allocGrid(cw, ch) {
    cols = Math.ceil(cw / CELL) + 2;
    rows = Math.ceil(ch / CELL) + 2;
    gridW = cols; gridH = rows;
    angles = new Float32Array(cols * rows);
  }

  function advance(dt) {
    phase += dt;
    if (phase < HOLD) {
      blend = 0;
    } else if (phase < HOLD + FADE) {
      var k = (phase - HOLD) / FADE;
      /* Smoothstep twice. One pass still leaves a detectable start and stop;
         two makes the handover begin and end below the threshold where the
         eye can name the moment it happened. */
      blend = ease(ease(k));
    } else {
      phase = 0; blend = 0;
      from = to;
      to = (to + 1) % MOVEMENTS.length;
    }
    var A = MOVEMENTS[from], B = MOVEMENTS[to];
    speedMul = A.speed + (B.speed - A.speed) * blend;
  }

  /* Shortest signed arc from a to b, always in [-PI, PI]. */
  function arc(a, b) {
    return Math.atan2(Math.sin(b - a), Math.cos(b - a));
  }

  function buildGrid(t) {
    var A = MOVEMENTS[from].angle, B = MOVEMENTS[to].angle, k = blend;
    for (var y = 0; y < rows; y++) {
      var base = y * cols;
      for (var x = 0; x < cols; x++) {
        var a = A(x, y, t);
        /* Rotate along the shortest arc rather than averaging vectors.
           Averaging cancels to zero when the two disagree by 180 degrees,
           and a zero length direction stalls every particle standing in
           that cell. */
        angles[base + x] = k <= 0 ? a : a + arc(a, B(x, y, t)) * k;
      }
    }
  }

  /* ==================================================================
     Renderer. Owns the canvas, the particles and the loop.
     ================================================================== */

  var DPR_CAP = 1.5;
  var FRAME_MS = 1000 / 30;

  /* Definition. A dot has to survive as a dot.

     At 0.38 alpha with a trail lasting a dozen frames, a mark spent most of
     its life as a faint smear and only briefly looked like a point. Raising
     the alpha and shortening the trail together is what makes it read as
     spray: the head is clearly a dot, and the tail is short enough to say
     which way it went without becoming the thing you see. */
  var TRAIL = 0.24;      // paper alpha per frame; lower = longer trails
  var DOT_ALPHA = 0.54;
  var DOT_SIZE = 1.25;
  var LIFE = 460;        // frames before a particle is recycled

  /* Density ceiling. A flow field has sinks, and without a cap those cells
     take a mark from dozens of particles per frame until the area is solid
     space grey. Small cells, a fixed budget each, and a particle over
     budget still moves and still lives, it is simply not drawn this frame.
     Capping what is DRAWN rather than culling particles matters: culling
     would thin the current that caused the convergence, removing the
     evidence along with the cause. */
  var OCC = 5, OCC_MAX = 5;

  /* ------------------------------------------------------------------
     THE MASK. Where the artwork is allowed to exist.

     A half ellipse anchored to one edge, densest at the edge and thinning
     to nothing by the time it reaches SPREAD_X across. Everything outside
     it is clean paper.

     Why one shape for every movement rather than only for the waves. The
     mask decides WHERE the piece lives; a movement decides WHAT it does
     inside. Confining some movements and not others would change the shape
     of the page every fifteen seconds, and a composition that keeps
     rearranging itself reads as indecision rather than as motion. Holding
     the frame still and letting the behaviour change inside it is the
     stronger idea, and it is what the reference does.

     Anchored left, with the dense core against the edge, so it thins as it
     approaches the content column instead of crowding it. On the landing
     the name starts about a sixth of the way in, so the heavy part of the
     mask sits outside the type and the light part passes behind it.

     Flip SIDE to "right" to mirror it. Nothing else needs to change.
     ------------------------------------------------------------------ */
  var SIDE = "left";
  var SPREAD_X = 0.66;   // fraction of the viewport width it reaches
  var SPREAD_Y = 0.78;   // fraction of half the height, from the middle
  var FALLOFF = 1.5;     // >1 concentrates toward the anchored edge

  function mask(x, y) {
    var nx = x / cw;
    if (SIDE === "right") nx = 1 - nx;
    var dx = nx / SPREAD_X;
    var dy = (y / ch - 0.5) / SPREAD_Y;
    var d = Math.sqrt(dx * dx + dy * dy);
    return d >= 1 ? 0 : Math.pow(1 - d, FALLOFF);
  }

  var dpr = 1, cw = 0, ch = 0;
  var count = 0, px = null, py = null, pl = null, pv = null;
  var occCols = 0, occRows = 0, occ = null;
  var raf = null, last = 0, frame = 0;
  var energy = 0, lastScroll = window.scrollY;

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    cw = window.innerWidth;
    ch = window.innerHeight;

    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    canvas.style.width = cw + "px";
    canvas.style.height = ch + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    allocGrid(cw, ch);

    occCols = Math.ceil(cw / OCC) + 2;
    occRows = Math.ceil(ch / OCC) + 2;
    occ = new Uint8Array(occCols * occRows);

    count = Math.min(11000, Math.max(1600, Math.round(cw * ch / 240)));
    px = new Float32Array(count);
    py = new Float32Array(count);
    pl = new Float32Array(count);
    pv = new Float32Array(count);
    for (var i = 0; i < count; i++) spawn(i, true);

    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, cw, ch);
  }

  function spawn(i, initial) {
    /* Rejection sampled against the mask, so particles are born where the
       piece lives instead of being born everywhere and only drawn in part
       of it. Gives up after six tries and takes what it has: a particle
       still has to go somewhere, and an unbounded loop has no place in a
       frame budget. */
    var x, y, tries = 0;
    do {
      x = Math.random() * cw;
      y = Math.random() * ch;
    } while (++tries < 6 && Math.random() > mask(x, y));
    px[i] = x;
    py[i] = y;
    /* Staggered ages, or every particle recycles on the same frame and the
       whole page blinks at once. */
    pl[i] = initial ? Math.random() * LIFE : 0;
    pv[i] = 0.6 + Math.random() * 0.85;
  }

  function step(t) {
    /* Speed breathes on a period unrelated to the movement cycle, so the
       two never line up into something you can predict. */
    var breath = 0.62 + 0.38 * Math.sin(t * 0.11) * Math.sin(t * 0.037);
    var speed = (1.5 + breath * 1.7 + energy * 2.6) * dpr * speedMul;

    buildGrid(t);

    /* Painted over, not cleared, so each particle leaves a trail. */
    ctx.fillStyle = "rgba(" + P[0] + "," + P[1] + "," + P[2] + "," + TRAIL + ")";
    ctx.fillRect(0, 0, cw, ch);

    occ.fill(0);
    ctx.globalAlpha = DOT_ALPHA;
    ctx.fillStyle = GRAIN;

    for (var i = 0; i < count; i++) {
      var gx = (px[i] / CELL) | 0;
      var gy = (py[i] / CELL) | 0;
      if (gx < 0) gx = 0; else if (gx >= cols) gx = cols - 1;
      if (gy < 0) gy = 0; else if (gy >= rows) gy = rows - 1;

      var a = angles[gy * cols + gx];
      var v = speed * pv[i];
      px[i] += Math.cos(a) * v;
      py[i] += Math.sin(a) * v;

      /* The per cell budget is the ceiling scaled by the mask, so the same
         one mechanism does two jobs: it stops any area saturating, and it
         shapes the piece. Outside the mask the budget rounds to zero and
         nothing is drawn at all, while the particle carries on moving. */
      var ox = (px[i] / OCC) | 0, oy = (py[i] / OCC) | 0;
      if (ox >= 0 && oy >= 0 && ox < occCols && oy < occRows) {
        var oi = oy * occCols + ox;
        var budget = (OCC_MAX * mask(px[i], py[i]) + 0.35) | 0;
        if (budget > 0 && occ[oi] < budget) {
          occ[oi]++;
          ctx.fillRect(px[i], py[i], DOT_SIZE, DOT_SIZE);
        }
      }

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
    /* Clamped, so a tab that was backgrounded for a minute does not return
       and advance the whole cycle in one frame. */
    var dt = last ? Math.min(0.2, (now - last) / 1000) : FRAME_MS / 1000;
    last = now;
    advance(dt);
    step(now / 1000);
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
    resizeTimer = setTimeout(layout, 160);
  }, { passive: true });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop(); else start();
  });

  layout();
  buildGrid(0);

  if (reduced) {
    /* Still a field, just not a moving one: run it far enough to look
       settled, then leave it. */
    for (var k = 0; k < 90; k++) step(k / 30);
  }

  root.classList.add("has-dots");
  start();

  window.SignalField = {
    stop: stop,
    start: start,
    redraw: layout,
    movement: function () {
      return blend
        ? MOVEMENTS[from].name + " -> " + MOVEMENTS[to].name +
          " (" + Math.round(blend * 100) + "%)"
        : MOVEMENTS[from].name;
    },
    movements: function () { return MOVEMENTS.map(function (m) { return m.name; }); },
    /* Retune the shape live: SignalField.shape({ side: "right", x: 0.5 }) */
    shape: function (o) {
      if (o) {
        if (o.side    !== undefined) SIDE = o.side;
        if (o.x       !== undefined) SPREAD_X = o.x;
        if (o.y       !== undefined) SPREAD_Y = o.y;
        if (o.falloff !== undefined) FALLOFF = o.falloff;
      }
      return { side: SIDE, x: SPREAD_X, y: SPREAD_Y, falloff: FALLOFF };
    },
    /* And the weight: SignalField.ink({ alpha: 0.6, trail: 0.3 }) */
    ink: function (o) {
      if (o) {
        if (o.alpha !== undefined) DOT_ALPHA = o.alpha;
        if (o.trail !== undefined) TRAIL = o.trail;
        if (o.size  !== undefined) DOT_SIZE = o.size;
      }
      return { alpha: DOT_ALPHA, trail: TRAIL, size: DOT_SIZE };
    },
    /* Jump straight to a movement by name, for looking at one on its own. */
    go: function (name) {
      for (var i = 0; i < MOVEMENTS.length; i++) {
        if (MOVEMENTS[i].name === name) {
          from = i; to = (i + 1) % MOVEMENTS.length;
          blend = 0; phase = 0;
          return MOVEMENTS[i].name;
        }
      }
      return null;
    }
  };
})();
