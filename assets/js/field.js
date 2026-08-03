/* ===========================================================================
   field.js — the paper, drawn by the GPU.

   One full viewport canvas, one WebGL2 fragment shader.

   The structure here is Inigo Quilez's domain warping, which is also what
   p5aholic.me uses, and reading that site's shader corrected four things in
   the first version of this file.

   1. It is a SINGLE noise sample, not fBm. Stacking octaves was the wrong
      instinct. All of the structure comes from warping: the field is sampled
      at coordinates that are themselves noise, twice, and the second warp is
      offset by the first. Octaves add fuzz, warping adds shape.

   2. The warp factor is large. The first version warped by about 1.0 and
      came out a flat wash. It is 4.0 here, which is what turns a smooth
      gradient into something with ridges and hollows in it.

   3. The output is raised to a power. This is the whole look. A noise field
      is mostly mid values, so mixing colour straight from it gives an even
      mush everywhere. Raising it to the fourth crushes everything except the
      peaks, so most of the page stays paper and colour appears only along
      the ridges. Restraint, done in the shader rather than by turning the
      amplitude down until nothing is visible.

   4. The grain is not additive dithering. It is a per pixel displacement of
      where the noise is sampled: one hash gives a magnitude, a second gives
      an angle, and the pair pushes the lookup off its true position. That is
      why it reads as part of the wave rather than as speckle laid on top.
      It is also fixed in screen space, so it sits still like paper texture
      instead of crawling like television static.

      A small additive dither is kept on top of that, because a gradient this
      soft across two thousand pixels of eight bit colour still bands, and
      breaking the step boundaries apart is what makes it read as smooth.

   The intensity is not constant. Noise frequency, warp strength and grain
   displacement all lift with scroll velocity and settle back when the page
   is still, which is the part of the reference that reads as the background
   responding to you rather than looping.

   Cost is capped the same way the glass is: device pixel ratio at 1.5,
   thirty frames a second, asleep when the tab is hidden, one static frame
   under reduced motion, and it does not start at all on a metered
   connection. Every one of those exits leaves the CSS gradients underneath
   untouched.
   =========================================================================== */

(function () {
  "use strict";

  var canvas = document.getElementById("field-gl");
  if (!canvas) return;

  var root = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || ""))) return;

  var gl = null;
  try {
    gl = canvas.getContext("webgl2", {
      alpha: false, antialias: false, depth: false, stencil: false,
      powerPreference: "low-power", preserveDrawingBuffer: false
    });
  } catch (e) { return; }
  if (!gl) return;

  /* ------------------------------------------------------------------ */

  var VERT = [
    "#version 300 es",
    "in vec2 a_pos;",
    "void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }"
  ].join("\n");

  var FRAG = [
    "#version 300 es",
    "precision highp float;",
    "out vec4 outColor;",
    "uniform vec2  u_res;",
    "uniform float u_time;",
    "uniform float u_scale;",   /* noise frequency        */
    "uniform float u_warp;",    /* domain warp strength   */
    "uniform float u_disp;",    /* grain displacement     */
    "uniform float u_grain;",   /* additive dither        */
    "uniform float u_lift;",    /* overall colour amount  */
    "uniform vec3  u_paper;",
    "uniform vec3  u_a;",
    "uniform vec3  u_b;",
    "uniform vec3  u_c;",

    "#define TAU 6.283185307179586",

    /* Two hashes, because they have different jobs and the cheap one is
       not fit for the second.

       hash() is the classic fract(sin(dot)) trick, and it is fine for the
       value noise lattice below: that is sampled at integer cell corners
       and interpolated, so any structure in it is buried under the
       interpolation.

       It is not fine for per pixel grain. Fed screen coordinates directly
       it produced visible vertical striping rather than speckle, because
       sin() at arguments that large loses precision and the dot product
       with those constants lines the failures up in columns. Grain with a
       direction in it reads as a rendering fault, not as paper.

       rand() is a proper integer hash instead, PCG style: multiply, mix
       the two lanes into each other, xor down the high bits, repeat. It
       needs the integer support that only came with WebGL2, which this
       already requires. */
    "float hash(vec2 p) {",
    "  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);",
    "}",

    "uint uhash(uvec2 p) {",
    "  p = p * 1664525u + 1013904223u;",
    "  p.x += p.y * 1664525u;",
    "  p.y += p.x * 1664525u;",
    "  p ^= (p >> 16u);",
    "  p.x += p.y * 1664525u;",
    "  p.y += p.x * 1664525u;",
    "  p ^= (p >> 16u);",
    "  return p.x;",
    "}",
    "float rand(vec2 fc, uint salt) {",
    "  return float(uhash(uvec2(fc) + salt)) / 4294967295.0;",
    "}",

    /* Value noise, normalised to 0..1 the way snoise01 is in the reference.
       Simplex would be smoother; at this amplitude, behind a warp this
       strong and a power curve this steep, the difference does not survive
       to the screen, and value noise is a third of the instructions. */
    "float noise(vec2 p) {",
    "  vec2 i = floor(p);",
    "  vec2 f = fract(p);",
    "  vec2 u = f * f * (3.0 - 2.0 * f);",
    "  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),",
    "             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);",
    "}",

    /* Time moves x and y at different rates, so the field never repeats a
       diagonal slide. Every warp layer below calls this, at its own offset,
       which is what makes the layers pass through each other instead of
       travelling together. */
    "float n2(vec2 st) {",
    "  return noise(vec2(st.x + u_time * 0.020, st.y - u_time * 0.040));",
    "}",

    "float pattern(vec2 p) {",
    "  vec2 q = vec2(n2(p), n2(p + vec2(5.2, 1.3)));",
    "  vec2 r = vec2(n2(p + u_warp * q + vec2(1.7, 9.2)),",
    "                n2(p + u_warp * q + vec2(8.3, 2.8)));",
    "  return n2(p + r);",
    "}",

    "void main() {",
    "  vec2 uv = gl_FragCoord.xy / u_res;",

    /* The grain, as a displacement. One hash is how far, the other is which
       way. Keyed to gl_FragCoord so it is fixed to the screen and does not
       crawl. */
    "  float gm = pow(rand(gl_FragCoord.xy, 0u), 1.5);",
    "  float ga = rand(gl_FragCoord.xy, 7919u);",
    "  float ax = u_disp * gm * cos(ga * TAU);",
    "  float ay = u_disp * gm * sin(ga * TAU);",

    /* y runs at twice the frequency of x, which stretches the field
       horizontally. On a wide screen that reads as weather rather than as
       a tiled pattern. */
    "  float nx = uv.x * u_scale + ax;",
    "  float ny = uv.y * u_scale * 2.0 + ay;",

    /* Stretch first, then shape.

       The reference raises this to the sixth and it works there because its
       base colour is near black: a value of 0.05 still lifts visibly off a
       dark ground. Copying the exponent onto near white paper produced
       nothing at all, and the arithmetic says why. Value noise sits around
       0.5, and 0.5 to the fourth is 0.06, which smoothstep then pulls down
       to 0.01. One percent of a tint over paper is not a colour.

       So the range is stretched to fill 0..1 before the curve is applied.
       The power still does its job, holding most of the page near paper and
       letting colour gather along the ridges, but now it is shaping a signal
       that has somewhere to go. */
    "  float raw = pattern(vec2(nx, ny));",
    "  float n = smoothstep(0.30, 0.80, raw);",
    "  n = pow(n, 1.8);",

    /* One hue at a time, walked by the field value. Mixing all three on
       every pixel was the first attempt and it produced grey, because sage,
       sky and sand averaged together are a neutral. */
    "  float h = pattern(vec2(nx * 0.55 + 3.1, ny * 0.55 - 2.4));",
    "  float hs = smoothstep(0.32, 0.74, h);",
    "  vec3 tint = mix(u_a, u_b, smoothstep(0.00, 0.55, hs));",
    "  tint = mix(tint, u_c, smoothstep(0.50, 1.00, hs));",

    /* Edges settle toward paper so the field never fights the type. */
    "  float vig = smoothstep(1.35, 0.12, length((uv - 0.5) * vec2(1.15, 1.0)));",
    "  vec3 col = mix(u_paper, tint, n * u_lift * vig);",

    /* Additive dither, last, against the banding. */
    /* The grain only ever darkens.

       Centred on zero it clipped, and the measurement showed it plainly:
       the top of the range pinned at 255 and the median rose instead of
       staying put. Paper is 251, so a symmetric jitter has four levels of
       headroom upward and twenty downward. Everything above 255 is thrown
       away, which both flattens the highlights and drags the whole page
       lighter, because only the darkening half survives in full.

       Subtracting solves it exactly. On near white there is nowhere to go
       but down, and paper with grain taken out of it is what paper is. The
       anti banding term stays symmetric, since one level either way cannot
       clip anything. */
    "  float d1 = rand(gl_FragCoord.xy, 104729u) - 0.5;",
    "  float d2 = rand(gl_FragCoord.xy, 15485863u);",
    "  col += d1 * (1.0 / 255.0) - d2 * u_grain;",

    "  outColor = vec4(col, 1.0);",
    "}"
  ].join("\n");

  function compile(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      if (window.console) console.warn("[field] shader failed", gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  }

  var vs = compile(gl.VERTEX_SHADER, VERT);
  var fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;

  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    if (window.console) console.warn("[field] link failed", gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  /* One triangle covering the viewport. Two would waste a diagonal. */
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var U = {};
  ["res", "time", "scale", "warp", "disp", "grain", "lift", "paper", "a", "b", "c"]
    .forEach(function (k) { U[k] = gl.getUniformLocation(prog, "u_" + k); });

  /* Colour comes from the tokens file, so the palette has one home. */
  function token(name, fallback) {
    var v = getComputedStyle(root).getPropertyValue(name).trim();
    return v || fallback;
  }
  function hexToRgb(h) {
    h = h.replace("#", "");
    return [parseInt(h.slice(0, 2), 16) / 255,
            parseInt(h.slice(2, 4), 16) / 255,
            parseInt(h.slice(4, 6), 16) / 255];
  }
  function tripletToRgb(t) {
    var n = t.split(",").map(function (x) { return parseFloat(x) / 255; });
    return n.length === 3 ? n : [0.5, 0.5, 0.5];
  }

  gl.uniform3fv(U.paper, hexToRgb(token("--c-paper", "#FBFBF9")));
  gl.uniform3fv(U.a, tripletToRgb(token("--c-field-sage", "118,168,140")));
  gl.uniform3fv(U.b, tripletToRgb(token("--c-field-sky", "124,160,200")));
  gl.uniform3fv(U.c, tripletToRgb(token("--c-field-sand", "224,190,136")));
  /* Two jobs in one number, and the second is why it is not tiny.

     The displacement produces grain in the wave, but how much of that
     reaches the screen is capped by how far the colour travels: a tint at
     twenty percent over paper can only swing about twenty levels in total,
     so the speckle inside it is small no matter how hard the sample is
     scrambled. The reference does not have that ceiling, because its base
     is near black and its front is mid grey, a hundred and fifteen levels
     apart, and its grain gets the whole of that range to move in.

     That contrast is not available on near white paper without darkening
     the page, which is not a trade worth making. So this term carries the
     texture directly as a luminance jitter, on top of the wave rather than
     inside it. */
  gl.uniform1f(U.grain, 0.085);

  /* ------------------------------------------------------------------
     Intensity.

     The reference tweens its noise frequency, warp and grain per section,
     which is what makes the background feel like it is reacting rather than
     looping. Here the same three are driven by how fast the page is moving:
     they lift while scrolling and settle back over a couple of seconds when
     it stops. Every value is eased toward its target rather than set, so a
     flick of the wheel does not snap the whole field.
     ------------------------------------------------------------------ */

  /* Two settings, and the gap between them is the point.

     Rest is what the page looks like while you are reading it, and it has
     to lose every argument against the type. Peak is what it reaches while
     you are moving, when nothing is being read anyway. The reference varies
     these per section with a tween; here they follow scroll energy, which
     gets the same effect without needing a section to be the trigger. */
  /* These are the reference's own numbers, and the ratios between them are
     the entire look. Reading its uniforms rather than only its shader is
     what fixed this.

       base span   0.20 across the whole viewport
       warp        4.00, which is twenty times the base span
       grain       0.05, a quarter of the base span

     That is a field so low in frequency that less than a fifth of one noise
     cell covers the screen. Almost nothing in the picture comes from the
     noise directly. The large slow shapes come from the warp, which is
     twenty times wider than the field it is warping, and the fine speckle
     comes from displacing each pixel's sample by a quarter of the visible
     span, so neighbouring pixels land far apart in noise space and read as
     grain.

     My first version had the base at 2.60, thirteen times too high, and the
     displacement at 0.02, which against that base is under one percent
     rather than twenty five. Same algorithm, wrong by two orders of
     magnitude in the one ratio that produces the texture, which is why it
     came out as smooth pastel blobs with no grain in them. */
  var REST = { scale: 0.20, warp: 4.00, disp: 0.095, lift: 0.21 };
  var PEAK = { scale: 0.30, warp: 5.30, disp: 0.150, lift: 0.36 };

  var cur = { scale: REST.scale, warp: REST.warp, disp: REST.disp, lift: REST.lift };
  var energy = 0, lastScroll = window.scrollY;

  window.addEventListener("scroll", function () {
    var y = window.scrollY;
    var d = Math.abs(y - lastScroll);
    lastScroll = y;
    energy = Math.min(1, energy + d / 900);
  }, { passive: true });

  function ease(k) {
    var target = REST[k] + (PEAK[k] - REST[k]) * energy;
    cur[k] += (target - cur[k]) * 0.05;
    return cur[k];
  }

  /* ------------------------------------------------------------------ */

  var DPR_CAP = 1.5;
  var FRAME_MS = 1000 / 30;
  var last = 0, raf = null, W = 0, H = 0;

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    W = Math.round(window.innerWidth * dpr);
    H = Math.round(window.innerHeight * dpr);
    if (canvas.width === W && canvas.height === H) return;
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    gl.viewport(0, 0, W, H);
    gl.uniform2f(U.res, W, H);
  }

  function draw(t) {
    gl.uniform1f(U.time, t / 1000);
    gl.uniform1f(U.scale, ease("scale"));
    gl.uniform1f(U.warp, ease("warp"));
    gl.uniform1f(U.disp, ease("disp"));
    gl.uniform1f(U.lift, ease("lift"));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    energy *= 0.94;
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (now - last < FRAME_MS) return;
    last = now;
    draw(now);
  }

  function start() {
    if (reduced) { draw(0); return; }
    if (raf === null) raf = requestAnimationFrame(loop);
  }
  function stop() {
    if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
  }

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { resize(); draw(performance.now()); }, 140);
  }, { passive: true });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop(); else start();
  });

  /* Only now does the CSS fallback stand down: if anything above had
     failed, the gradients underneath are still what the page shows. */
  resize();
  draw(0);
  root.classList.add("has-shader");
  start();

  window.SignalField = { stop: stop, start: start, redraw: resize };
})();
