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

  /* Colours are sampled from CSS once at startup, so a theme change has to
     say so. Everything else on the page inverts through the cascade; a
     canvas cannot. */
  function recolor() {
    PAPER = token("--c-paper", "#FBFBF9");
    GRAIN = token("--c-field-grain", "#4A5054");
    P = rgbOf(PAPER);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, cw, ch);
  }

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

  /* One layer: bilinear across x and y, at a fixed integer z. */
  function layer(x, y, iz) {
    var ix = Math.floor(x), iy = Math.floor(y);
    var fx = ease(x - ix), fy = ease(y - iy);
    var a = hash(ix, iy, iz),     b = hash(ix + 1, iy, iz);
    var c = hash(ix, iy + 1, iz), d = hash(ix + 1, iy + 1, iz);
    var top = a + (b - a) * fx, bot = c + (d - c) * fx;
    return top + (bot - top) * fy;
  }

  /* Value noise in three dimensions, and the third one is the fix for a
     real bug rather than a nicety.

     This used to pass z straight through to hash(), which puts it inside a
     sine and multiplies the result by 43758. Any change in z at all, however
     small, completely re-randomises the output. So the field interpolated
     smoothly across space and not at all across time: every lattice corner
     took a fresh random value on every frame.

     Measured, a corner moved by an average of 0.2445 per frame at drift's
     rate. Smooth noise moves by about 0.001. That is white noise in time
     wearing the shape of a noise field.

     The two movements that drive time through the noise, drift and curl,
     were therefore handing every particle a new direction thirty times a
     second, which is exactly the furious shaking with no travel. The other
     five drive time through sin and cos directly, which is why only those
     two were affected and why it looked like one broken mode rather than a
     broken engine.

     Interpolating between two integer layers is all it needs. Twice the
     hashing, on about three thousand cells, for a field that actually
     evolves. */
  function noise(x, y, z) {
    var iz = Math.floor(z), fz = ease(z - iz);
    var a = layer(x, y, iz);
    var b = layer(x, y, iz + 1);
    return a + (b - a) * fz;
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

  /* Per frame constants, computed once.

     These are all functions of time alone, so their value is identical for
     every cell in the grid. They were being recomputed inside the per cell
     loop: a cosine and a sine for the wave rotation and another pair for
     the globe's spin, seven thousand times a frame, to produce seven
     thousand copies of the same four numbers. Measured, the grid pass was
     costing 5.7ms of a 33ms budget and the frame rate had fallen to 31.

     Hoisting them is not a micro optimisation, it is removing work that was
     never needed. The loop body should only contain things that vary per
     cell, and by definition none of these do. */
  var fRot = 0, fRotC = 1, fRotS = 0;      // wave rotation
  var fSpinC = 1, fSpinS = 0;              // globe spin
  var fRipX = 0, fRipY = 0;                // ripple centre

  function frameConstants(t) {
    fRot = t * 0.052;
    fRotC = Math.cos(fRot);
    fRotS = Math.sin(fRot);

    var a = t * G.spin;
    fSpinC = Math.cos(a);
    fSpinS = Math.sin(a);

    fRipX = gridW * (0.5 + 0.22 * Math.sin(t * 0.023));
    fRipY = gridH * (0.5 + 0.18 * Math.cos(t * 0.031));
  }

  function wavePhase(x, y, t) {
    return (x * fRotC + y * fRotS) * 0.42 - t * WAVE_SPEED;
  }

  function rippleAt(x, y, t) {
    var dx = x - fRipX, dy = y - fRipY;
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
  /* Geometry is resolved in layout(), in pixels, because it has to survive
     a phone.

     The radius used to be a fraction of the grid HEIGHT. On a desktop that
     is fine. On a 390 by 844 phone the height is more than twice the width,
     so the same fraction produced a globe spanning -27 to 646 pixels on a
     390 pixel screen: one and a half times the viewport, centred over the
     copy. Measured, not guessed.

     Radius comes off the SMALLER dimension now, so the sphere is a sphere
     on any aspect ratio. And below 760px there is no room for a composition
     with type on one side and an object on the other, so it moves to the
     centre, drops below the copy, and shrinks. */
  var G = { spin: 0.20 };
  var gCx = 0, gCy = 0, gR = 1;    // cell units, set in layout()

  function globeGeometry() {
    if (cw < 760)  return { cx: 0.50, cy: 0.74, r: 0.30 };
    if (cw < 1100) return { cx: 0.66, cy: 0.50, r: 0.30 };
    return { cx: 0.70, cy: 0.46, r: 0.37 };
  }

  function globe(x, y, t) {
    var R = gR;
    var dx = (x - gCx) / R;
    var dy = (y - gCy) / R;
    var d2 = dx * dx + dy * dy;
    if (d2 > 1) return 0;

    var z = Math.sqrt(1 - d2);
    /* Longitude after turning the sphere about its vertical axis. Only the
       near face is sampled: the far side would need a second solution for
       z, and a wireframe with both faces on reads as a ball of wool. */
    var lon = Math.atan2(dx * fSpinC - z * fSpinS,
                         dx * fSpinS + z * fSpinC);
    var lat = Math.asin(dy < -1 ? -1 : dy > 1 ? 1 : dy);

    /* Sharp falloff by repeated squaring rather than Math.pow.

       Math.pow with a non integer exponent is a log and an exp, and this
       ran three times per cell over seven thousand cells every frame. Eight
       multiplies give the ninth power exactly, and multiplies are close to
       free. The shape of the curve is identical; only the instruction count
       changed. */
    var a1 = Math.abs(Math.cos(lat * 6.0));
    var a2 = a1 * a1; var a4 = a2 * a2; var a8 = a4 * a4;
    var lats = a8 * a1;

    var b1 = Math.abs(Math.cos(lon * 5.0));
    var b2 = b1 * b1; var b4 = b2 * b2; var b8 = b4 * b4;
    var lons = b8 * b1;

    var wire = lats > lons ? lats : lons;

    /* The rim. Without it the sphere has no edge and reads as a flat mesh. */
    var r2 = d2 * d2; var r4 = r2 * r2; var r8 = r4 * r4;
    var rim = r8 * d2;

    var v = wire * 1.0 + rim * 0.95;
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
        var s = 0.055, z = t * 0.19;
        return (noise(x * s, y * s, z) * 0.72 +
                noise(x * s * 2.7, y * s * 2.7, z * 1.4) * 0.28) * Math.PI * 4;
      } },

    /* Mini waves, rotating. Short ripples crossing the page with the whole
       set of them turning, so the direction they travel comes around over a
       couple of minutes. Medium pace: enough to read as movement, not
       enough to flicker. */
    { name: "waves", speed: 1.20,
      angle: function (x, y, t) {
        return fRot + Math.sin(wavePhase(x, y, t)) * 0.85;
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
        /* Squared rather than raised to 1.7 and 1.9. Two multiplies instead
           of two log-exp pairs per cell, and at these amplitudes the curve
           is indistinguishable. */
        var c = 0.5 + 0.5 * Math.sin(ph);
        var pk = 0.5 + 0.5 * Math.sin(ph * 0.14 - t * 0.22);
        return (c * c) * (0.12 + 0.88 * (pk * pk));
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
        var r = 0.5 + 0.5 * Math.sin(rippleAt(x, y, t).phase);
        return r * r;
      } },

    /* NEW. Turbulence: the noise current sampled at a much finer scale and
       fed back through itself, so it curls at the size of a paragraph
       rather than the size of the page. The busiest of the six, which is
       why it runs slowest. */
    { name: "curl", speed: 0.80, angle: function (x, y, t) {
        var s = 0.14, z = t * 0.26;
        var a = noise(x * s, y * s, z);
        var b = noise(x * s + a * 1.8, y * s - a * 1.4, z * 1.3);
        return (a * 0.35 + b * 0.65) * Math.PI * 6;
      } }
  ];

  /* ==================================================================
     Field. Owns the grid of angles and the transition between movements.
     ================================================================== */

  /* The density grid resolution, and it is the globe's real constraint.

     A wireframe line thinner than one cell falls between samples and simply
     is not drawn, so at 26px the globe was being reconstructed from a grid
     far coarser than the lines it was trying to show. That is why it read as
     a faint scatter: not too few dots and not too light, but a shape being
     sampled below the resolution it needs.

     16px roughly triples the cell count, to about seven thousand at desktop
     size. That is still small next to sixteen thousand particles, and the
     per cell work is a couple of trig calls, so it costs far less than it
     looks like it should. The wave bands sharpened for the same reason. */
  var CELL = 16;
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
    frameConstants(t);
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
  /* Thirty on a desktop, twenty on a phone. Nobody has ever looked at a
     background and wanted more frames, and the difference on a battery is
     a third of the work. */
  var FRAME_MS = window.matchMedia("(any-hover: hover)").matches
    ? 1000 / 30 : 1000 / 20;

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
  var TRAIL = 0.46;      // paper alpha per frame. 1 clears outright.
  var DOT_ALPHA = 0.80;
  var DOT_SIZE = 1.55;
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
    var d2 = dx * dx + dy * dy;
    if (d2 >= 1) return 0;
    /* sqrt only once past the early out, and a fixed exponent instead of a
       configurable one, for the same reason as the globe. */
    var k = 1 - Math.sqrt(d2);
    return k * k * Math.sqrt(k);       // k^2.5, close to the old 1.15 curve
                                       // once the early out is accounted for

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

    var g = globeGeometry();
    var minSide = cw < ch ? cw : ch;
    gR  = (minSide * g.r) / CELL;
    gCx = (cw * g.cx) / CELL;
    gCy = (ch * g.cy) / CELL;

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
    /* Scaled by area, floored low enough that a phone is not carrying a
       desktop's load. A 390 by 844 screen asks for about three thousand,
       and the old floor of four thousand was quietly handing it more work
       than the formula wanted, on the device least able to take it. */
    count = Math.min(26000, Math.max(2200, Math.round(cw * ch / 108)));
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
    /* Uniform, deliberately.

       This used to reject spawns against the page mask, so particles were
       born mostly inside the half ellipse on the left. That was an
       optimisation when every movement shared that shape, and it became a
       bug the moment a movement could opt out of it: the globe sits on the
       right, where the mask is zero, so almost no particles existed there
       to draw it with. It came out as a faint outline because there was
       nothing to fill it, not because its density was too low.

       Placement is not the mask's job. The weight grid already decides
       where a dot may be drawn, every frame, from whatever the current
       movement wants. Spawning evenly means whatever shape the field asks
       for has particles available to make it. */
    px[i] = Math.random() * cw;
    py[i] = Math.random() * ch;
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
    recolor: recolor,
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
