/* ===========================================================================
   field.js — the paper, drawn by the GPU.

   A single full viewport canvas running one WebGL2 fragment shader. It is
   two effects stacked, and the second one is the interesting half.

   The wave. A fractal Brownian motion field, five octaves of value noise,
   domain warped by a second fBm field so the shape folds into itself
   instead of sliding. A time uniform moves it. This is what undulates.

   The grain. Deliberate per pixel dithering. A smooth gradient stretched
   across two thousand pixels in eight bit colour visibly bands: you see
   stripes where the value steps. Adding a small random value per pixel
   breaks the step boundaries apart, and the eye averages it back to a
   smooth gradient while still reading the texture up close. It is a fix for
   a technical problem that happens to look like film.

   The colour is the page palette and nothing else: paper, and the three
   field hues at an amplitude low enough that the whole thing reads as a
   tinted surface rather than as a picture.

   Costs are held down deliberately. Device pixel ratio is capped at 1.5,
   because a fragment shader is per pixel and the top of that range buys
   nothing on a field this soft. Thirty frames a second. It sleeps when the
   tab is hidden, renders exactly one frame under reduced motion, and does
   not start at all on a metered connection. If WebGL2 is missing the CSS
   gradients underneath are left alone and this file does nothing.
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
    "uniform float u_grain;",
    "uniform vec3  u_paper;",
    "uniform vec3  u_a;",
    "uniform vec3  u_b;",
    "uniform vec3  u_c;",

    "float hash(vec2 p) {",
    "  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);",
    "}",

    /* Value noise. Cheaper than simplex and indistinguishable once five
       octaves are stacked and the amplitude is this low. */
    "float noise(vec2 p) {",
    "  vec2 i = floor(p);",
    "  vec2 f = fract(p);",
    "  vec2 u = f * f * (3.0 - 2.0 * f);",
    "  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),",
    "             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);",
    "}",

    "float fbm(vec2 p) {",
    "  float v = 0.0;",
    "  float a = 0.5;",
    "  for (int i = 0; i < 5; i++) {",
    "    v += a * noise(p);",
    "    p *= 2.02;",
    "    a *= 0.5;",
    "  }",
    "  return v;",
    "}",

    "void main() {",
    "  vec2 uv = gl_FragCoord.xy / u_res;",
    "  vec2 p  = vec2(uv.x * (u_res.x / u_res.y), uv.y);",
    "  float t = u_time * 0.023;",

    /* Domain warp: the field is sampled at coordinates that are themselves
       noise, which is what makes it fold rather than drift sideways. */
    "  vec2 q = vec2(fbm(p * 1.30 + vec2(0.0, t)),",
    "                fbm(p * 1.30 + vec2(5.2, 1.3 - t)));",
    "  vec2 r = vec2(fbm(p * 1.70 + q * 1.1 + vec2(1.7, 9.2) + t * 0.5),",
    "                fbm(p * 1.70 + q * 1.1 + vec2(8.3, 2.8) - t * 0.4));",
    "  float f = fbm(p * 1.9 + r * 0.9);",

    /* One hue at a time, not three at once.

       Stacking all three tints on every pixel was the first attempt and it
       came out grey: sage, sky and sand averaged together are a neutral, so
       the field had a lightness range and no colour in it at all. Walking
       the palette with the field value instead means a given region is
       mostly one hue, and the hue changes as the field moves under it. */
    "  vec3 tint = mix(u_a, u_b, smoothstep(0.26, 0.64, f));",
    "  tint = mix(tint, u_c, smoothstep(0.55, 0.95, r.y + 0.35));",

    /* Edges settle back toward paper so the field never fights the type. */
    "  float vig = smoothstep(1.20, 0.20, length((uv - 0.5) * vec2(1.25, 1.0)));",
    "  float amt = (0.045 + 0.085 * smoothstep(0.18, 0.82, f)) * vig;",
    "  vec3 col = mix(u_paper, tint, amt);",

    /* The dither. Two terms: one at roughly one least significant bit to
       kill the banding, and one a little larger that is the visible grain. */
    "  float d1 = hash(gl_FragCoord.xy + fract(u_time) * 17.0) - 0.5;",
    "  float d2 = hash(gl_FragCoord.xy * 1.7 - fract(u_time) * 11.0) - 0.5;",
    "  col += d1 * (1.0 / 255.0) + d2 * u_grain;",

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

  var U = {
    res:   gl.getUniformLocation(prog, "u_res"),
    time:  gl.getUniformLocation(prog, "u_time"),
    grain: gl.getUniformLocation(prog, "u_grain"),
    paper: gl.getUniformLocation(prog, "u_paper"),
    a:     gl.getUniformLocation(prog, "u_a"),
    b:     gl.getUniformLocation(prog, "u_b"),
    c:     gl.getUniformLocation(prog, "u_c")
  };

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
  gl.uniform1f(U.grain, 0.017);

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
    gl.drawArrays(gl.TRIANGLES, 0, 3);
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
