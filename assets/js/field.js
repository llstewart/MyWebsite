/* ===========================================================================
   field.js — the flow field.

   Particles drifting along an invisible current, drawn as points with no
   trails, with the current itself cycling through six named movements.

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

  /* Phase helpers, shared by a movement's angle and its density.

     Both have to be driven by the same number or the crests of the bands
     drift away from the direction the particles are steering, and the wave
     stops looking like one thing. Speeds are chosen here rather than in the
     movements so there is one place to change how fast a wave travels. */
  var WAVE_SPEED = 0.95;    // how fast the bands cross the page
  var RIPPLE_SPEED = 1.45;  // how fast the rings expand

  function wavePhase(x, y, t) {
    var rot = t * 0.052;
    return (x * Math.cos(rot) + y * Math.sin(rot)) * 0.42 - t * WAVE_SPEED;
  }

  function rippleAt(x, y, t) {
    var cx = gridW * (0.5 + 0.22 * Math.sin(t * 0.023));
    var cy = gridH * (0.5 + 0.18 * Math.cos(t * 0.031));
    var dx = x - cx, dy = y - cy;
    var d = Math.sqrt(dx * dx + dy * dy);
    return { radial: Math.atan2(dy, dx), phase: d * 0.34 - t * RIPPLE_SPEED };
  }

  /* ------------------------------------------------------------------
     The globe.

     This replaces a keyboard that was here first. The keyboard worked in
     the sense that it drew, and did not work in the sense that mattered: at
     this dot size it read as a grid of dots rather than as keys, and a
     keyboard on a developer's page is the most literal image available. It
     said "software" the way a stock photo does.

     A globe says something this page has already earned. The approach
     section is about the Bateke Plateau and about being from the Congo, and
     the site's one photograph is that place from the air. Putting a slowly
     turning globe on the landing means the background is the same argument
     as the copy instead of a decoration next to it.

     How it is drawn. Every other movement is a current: it says which way
     to go, and the dots spread evenly because nothing says where to BE.
     This one is a formation, and it puts the whole idea in the density,
     which the renderer already reads as "how likely is a dot here".

     For a cell inside the disc, the screen position is read as a point on
     the front of a sphere: z comes from the radius, latitude from the
     height, and longitude from x and z after rotating them about the
     vertical axis. Density is then high near whole numbers of latitude and
     longitude, which is a wireframe, plus a rim term so the silhouette
     closes. Turning the sphere moves the longitude lines across it, and
     because they are computed per cell per frame they compress toward the
     edges exactly the way a real projection does.

     The dots keep flowing through it the whole time. The shape persists,
     the particles do not. Pinning particles to positions would look like a
     diagram and would stop dead the moment the shape changed.
     ------------------------------------------------------------------ */

  /* Pulled in off the right edge, which was cropping the far limb, and the
     wireframe is coarser than it looks like it should be on purpose: the
     density grid is sampled at 26px cells, so a line thinner than a cell
     falls between samples and simply is not there. Fewer lines, each wide
     enough to land on a cell, reads as a globe. More lines, each too thin,
     reads as noise. */
  var G = { cx: 0.70, cy: 0.46, r: 0.37, spin: 0.20 };

  function globe(x, y, t) {
    var R = gridH * G.r;
    var dx = (x - gridW * G.cx) / R;
    var dy = (y - gridH * G.cy) / R;
    var d2 = dx * dx + dy * dy;
    if (d2 > 1) return 0;

    var z = Math.sqrt(1 - d2);
    var a = t * G.spin;
    /* Longitude after turning the sphere about its vertical axis. Only the
       near face is sampled: the far side would need a second solution for
       z, and a wireframe with both faces on reads as a ball of wool. */
    var lon = Math.atan2(dx * Math.cos(a) - z * Math.sin(a),
                         dx * Math.sin(a) + z * Math.cos(a));
    var lat = Math.asin(dy < -1 ? -1 : dy > 1 ? 1 : dy);

    /* Sharp powers, so a line is a line and not a gradient. */
    var lats = Math.pow(Math.abs(Math.cos(lat * 6.0)), 9);
    var lons = Math.pow(Math.abs(Math.cos(lon * 5.0)), 9);
    var wire = lats > lons ? lats : lons;

    /* The rim. Without it the sphere has no edge and reads as a flat mesh. */
    var rim = Math.pow(d2, 9);

    var v = wire * 0.92 + rim * 0.9;
    return v > 1 ? 1 : v;
  }

  var MOVEMENTS = [
    /* The landing state. See the note above.

       Slow, and it ignores the page mask. The mask is a half ellipse on the
       left, which is the right composition for a current filling the page;
       a formation has its own shape and its own place and would be cut in
       half by it. So a movement may opt out, and the globe is the one that
       does: type on the left, globe on the right, which is a composition
       rather than an overlap. */
    { name: "globe", speed: 0.30, ignoreMask: true,
      angle: function (x, y, t) {
        return Math.sin(y * 0.07 + t * 0.09) * 0.45;
      },
      density: globe },

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
    { name: "waves", speed: 1.20,
      angle: function (x, y, t) {
        var rot = t * 0.052;
        return rot + Math.sin(wavePhase(x, y, t)) * 0.85;
      },
      /* The bands, in packets.

         Two envelopes multiplied. The fast one is the crests themselves.
         The slow one, at about a seventh of the frequency, groups them into
         sets of three or four with empty water between the sets.

         Without the slow one every crest exists everywhere at once and the
         whole field simply oscillates in place: correct as a wave, wrong as
         a picture, because nothing ARRIVES. A wave you notice is a wave
         that was not there a moment ago. Packets travel, so you watch a
         group cross the page, then a gap, then the next group. */
      density: function (x, y, t) {
        var ph = wavePhase(x, y, t);
        var crest = Math.pow(0.5 + 0.5 * Math.sin(ph), 1.7);
        var packet = Math.pow(0.5 + 0.5 * Math.sin(ph * 0.14 - t * 0.22), 1.9);
        return crest * (0.12 + 0.88 * packet);
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
    { name: "ripple", speed: 1.10,
      angle: function (x, y, t) {
        var c = rippleAt(x, y, t);
        /* The wavefront turns the radial direction into a tangential one
           and back again as it passes. */
        return c.radial + Math.sin(c.phase) * 1.25;
      },
      /* Rings, for the same reason the waves have bands: without a density
         term the rings exist in the maths and not on the screen. */
      density: function (x, y, t) {
        return Math.pow(0.5 + 0.5 * Math.sin(rippleAt(x, y, t).phase), 1.6);
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

  var cols = 0, rows = 0, angles = null, weights = null;
  var from = 0, to = 1, blend = 0, phase = 0, speedMul = 1;

  function allocGrid(cw, ch) {
    cols = Math.ceil(cw / CELL) + 2;
    rows = Math.ceil(ch / CELL) + 2;
    gridW = cols; gridH = rows;
    angles = new Float32Array(cols * rows);
    weights = new Float32Array(cols * rows);
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

  /* Density, blended across a transition the same way angles are. Scalars,
     so a plain linear blend is correct here: there is no wrap to go the
     long way round. A movement with no density function is uniform, which
     is what the four steady currents want. */
  function bandAt(x, y, t) {
    var A = MOVEMENTS[from].density;
    var a = A ? A(x, y, t) : 1;
    if (blend <= 0) return a;
    var B = MOVEMENTS[to].density;
    var b = B ? B(x, y, t) : 1;
    return a + (b - a) * blend;
  }

  /* How much of the page mask applies right now.

     A formation carries its own shape and its own position, so the half
     ellipse would crop it. A movement can opt out, and during a transition
     the mask fades in or out along with everything else rather than
     switching on the frame the movement changes. */
  function maskWeight() {
    var a = MOVEMENTS[from].ignoreMask ? 0 : 1;
    var b = MOVEMENTS[to].ignoreMask ? 0 : 1;
    return blend <= 0 ? a : a + (b - a) * blend;
  }

  /* Both grids are filled in one pass, once per frame.

     The weight used to be computed per particle, which meant a square root,
     two powers and a sine for every one of them on every frame. There are
     thousands of particles and about three thousand cells, and the answer
     only varies per cell, so it was the same work done several times over
     for no extra information. Per cell it is a fixed cost that does not
     grow when the particle count does. */
  function buildGrid(t) {
    var A = MOVEMENTS[from].angle, B = MOVEMENTS[to].angle, k = blend;
    var half = CELL * 0.5;

    /* The tide. Total coverage breathes between about seventy and a hundred
       and thirty percent on a slow, uneven period.

       A field at one density forever is a texture, and the eye stops seeing
       a texture within about a minute. Letting the whole page gather and
       thin means there are moments worth catching, which is the difference
       between something running and something happening. Two sines with
       unrelated periods, so it never repeats on a beat you could count. */
    var tide = 0.70 + 0.30 * Math.sin(t * 0.041)
                    + 0.30 * Math.sin(t * 0.017 + 1.7);
    var mw = maskWeight();
    for (var y = 0; y < rows; y++) {
      var base = y * cols;
      var py_ = y * CELL + half;
      for (var x = 0; x < cols; x++) {
        var a = A(x, y, t);
        /* Rotate along the shortest arc rather than averaging vectors.
           Averaging cancels to zero when the two disagree by 180 degrees,
           and a zero length direction stalls every particle standing in
           that cell. */
        angles[base + x] = k <= 0 ? a : a + arc(a, B(x, y, t)) * k;
        var m = 1 - mw + mw * mask(x * CELL + half, py_);
        weights[base + x] = m * bandAt(x, y, t) * tide;
      }
    }
  }

  /* ==================================================================
     Renderer. Owns the canvas, the particles and the loop.
     ================================================================== */

  var DPR_CAP = 1.5;
  var FRAME_MS = 1000 / 30;

  /* No trails. The canvas is cleared every frame.

     Trails were an attempt to make motion legible and they cost more than
     they bought. A tail is a smear, and a page of smears is a page of
     smears however short you make them: at any given instant most of the
     ink on screen was the history of a dot rather than the dot. The
     reference has no streaks in it either, only points.

     Clearing every frame means everything on screen is a particle at its
     actual position right now, which is the whole point, and it lets each
     one be drawn at full weight instead of being the brightest part of a
     gradient. Motion reads from the dots moving, which is what motion is. */
  var TRAIL = 0.55;      // paper alpha per frame. 1 clears outright.
  var DOT_ALPHA = 0.66;
  var DOT_SIZE = 1.3;
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
  /* Wider than it was. At 0.66 the horizontal reach was short enough
     against the full height that the visible arc curved like the side of a
     tall oval rather than the edge of a globe. Reaching further across, and
     pulling the vertical in a little, makes the curve read as part of a
     circle instead of part of an ellipse standing on end. */
  var SPREAD_X = 0.92;   // fraction of the viewport width it reaches
  var SPREAD_Y = 0.72;   // fraction of half the height, from the middle
  var FALLOFF = 1.15;    // >1 concentrates toward the anchored edge

  function mask(x, y) {
    var nx = x / cw;
    if (SIDE === "right") nx = 1 - nx;
    var dx = nx / SPREAD_X;
    var dy = (y / ch - 0.5) / SPREAD_Y;
    var d = Math.sqrt(dx * dx + dy * dy);
    return d >= 1 ? 0 : Math.pow(1 - d, FALLOFF);
  }

  var dpr = 1, cw = 0, ch = 0;
  var count = 0, px = null, py = null, pl = null, pv = null, pt = null;
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

    /* The count is high and that is fine, because the cost is not here.

       A particle only draws when its own threshold clears the local
       weight, and that weight averages well under a half once the mask and
       the band crests are multiplied together. Measured, about a tenth of
       them were drawing, which is why the page looked bare at six thousand.

       What matters for cost is how many fillRect calls happen, which is the
       number DRAWN, not the number simulated. Simulation is a handful of
       arithmetic per particle with the trigonometry now hoisted to the
       grid, so carrying three times as many is cheap and buys the density
       back. */
    count = Math.min(26000, Math.max(4000, Math.round(cw * ch / 108)));
    px = new Float32Array(count);
    py = new Float32Array(count);
    pl = new Float32Array(count);
    pv = new Float32Array(count);
    pt = new Float32Array(count);
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
    /* This particle's own threshold, fixed for its whole life. See the note
       at the draw call: re-rolling it per frame is what made the dots
       flicker and read as faint. */
    pt[i] = Math.random();
  }

  function step(t) {
    /* Speed breathes on a period unrelated to the movement cycle, so the
       two never line up into something you can predict. */
    var breath = 0.62 + 0.38 * Math.sin(t * 0.11) * Math.sin(t * 0.037);
    var speed = (1.5 + breath * 1.7 + energy * 2.6) * dpr * speedMul;

    buildGrid(t);

    /* A short trail, and this is a deliberate reversal.

       Clearing outright was right about the fur and wrong about the
       physics. A 1.3px dot travelling two to three pixels a frame lands
       clear of where it was, so at thirty frames a second the eye gets a
       sequence of separate positions rather than one thing moving, and it
       reads as stepping.

       At 0.55 a mark is gone in about two frames. That is long enough to
       bridge the gap between one position and the next, and far too short
       to accumulate into a stroke. The failure before was twelve frames,
       which is a line. Two is a dot that is moving. */
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

      /* Two jobs, two mechanisms. Folding them into one number was a bug.

         Shaping is stochastic: a dot is drawn with probability equal to the
         mask. Because each dot is an independent coin flip, density falls
         off exactly as smoothly as the mask does, with no edge anywhere.

         The ceiling stays a flat integer cap, which is the only thing an
         integer is right for here.

         These were one line before: the budget was the ceiling multiplied
         by the mask and truncated to an integer. That turned a smooth
         falloff into a step function, so the budget dropped 5, 4, 3, 2, 1,
         0 in bands and drew visible concentric arcs with a hard edge where
         it hit zero. It read as a circle stamped on the page. A continuous
         quantity had been quantised to five levels and the quantisation was
         the thing you could see. */
      var ox = (px[i] / OCC) | 0, oy = (py[i] / OCC) | 0;
      if (ox >= 0 && oy >= 0 && ox < occCols && oy < occRows) {
        var oi = oy * occCols + ox;
        /* Where it may be drawn, times how much of a crest it is standing
           in. Both are continuous, so neither can band.

           Compared against the particle's OWN fixed threshold, not a fresh
           random number. This is the whole reason the dots looked faint.

           With Math.random() per frame, every particle was a new coin flip
           every frame: one drawn at 40% density appeared in two frames out
           of five, at a different moment from its neighbours. Trails hid
           that by leaving something behind between appearances. Take the
           trails away and it is plain flicker, and flicker at 30fps reads
           as faint rather than as fast, because the eye averages it.

           Holding the threshold still means a particle is either drawn or
           not, steadily, and it fades in or out only when the field it is
           standing in changes. The randomness is still there, in which
           particles are visible where, but it stops being re-rolled at
           thirty hertz. */
        if (pt[i] < weights[gy * cols + gx] && occ[oi] < OCC_MAX) {
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
    /* And the weight: SignalField.ink({ alpha: 0.75, size: 1.5 }) */
    ink: function (o) {
      if (o) {
        if (o.alpha !== undefined) DOT_ALPHA = o.alpha;
        if (o.size  !== undefined) DOT_SIZE = o.size;
        if (o.trail !== undefined) TRAIL = o.trail;   // 1 = no trail at all
      }
      return { alpha: DOT_ALPHA, size: DOT_SIZE, trail: TRAIL, dots: count };
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
