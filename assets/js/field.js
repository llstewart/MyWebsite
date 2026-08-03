/* ===========================================================================
   field.js — STEP 1 of 6: the material.

   Static dots. Nothing moves. No flow field, no trails, no cycling.

   This is a deliberate restart. The previous version was built all at once
   and every problem in it turned out to be a different layer: the dots were
   too faint, then too heavy, then clumping, then moving too slowly to read,
   then cycling in ways that hid whether any of the rest was right. Judging
   six things at once meant judging none of them.

   So: one thing at a time, each shipped and looked at before the next.

     1. the material    <- you are here. Size, weight, colour, density.
     2. motion          one direction, constant speed. Is it legible?
     3. the current     replace the direction with a noise flow field.
     4. trails          how long a mark survives behind a particle.
     5. the ceiling     stop the current piling dots into a solid patch.
     6. the movements   cycle between waves, arcs, bands.

   Nothing below this line does anything except place dots and draw them
   once. If the density or the weight is wrong, it is wrong here, and it is
   fixed here before anything is allowed to move.
   =========================================================================== */

(function () {
  "use strict";

  var canvas = document.getElementById("field-dots");
  if (!canvas) return;

  var root = document.documentElement;
  var ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return;

  function token(name, fallback) {
    var v = getComputedStyle(root).getPropertyValue(name).trim();
    return v || fallback;
  }

  /* ------------------------------------------------------------------
     The only four numbers in this step.
     ------------------------------------------------------------------ */

  var PAPER   = token("--c-paper", "#FBFBF9");
  var GRAIN   = token("--c-field-grain", "#4A5054");
  var ALPHA   = 0.38;    // how dark one dot is
  var SIZE    = 1.15;    // dot size in CSS px
  var PER_PX  = 170;     // one dot per this many square px of viewport

  var DPR_CAP = 1.5;

  var dpr = 1, count = 0;
  var px = null, py = null;

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    var cw = window.innerWidth, ch = window.innerHeight;

    canvas.width  = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    canvas.style.width  = cw + "px";
    canvas.style.height = ch + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* Count follows area, so a phone does not pay for a desktop's coverage
       and a wide monitor does not come out sparse. */
    count = Math.min(14000, Math.max(1500, Math.round(cw * ch / PER_PX)));
    px = new Float32Array(count);
    py = new Float32Array(count);
    for (var i = 0; i < count; i++) {
      px[i] = Math.random() * cw;
      py[i] = Math.random() * ch;
    }
  }

  function draw() {
    var cw = window.innerWidth, ch = window.innerHeight;
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, cw, ch);

    ctx.globalAlpha = ALPHA;
    ctx.fillStyle = GRAIN;
    for (var i = 0; i < count; i++) {
      ctx.fillRect(px[i], py[i], SIZE, SIZE);
    }
    ctx.globalAlpha = 1;
  }

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { layout(); draw(); }, 160);
  }, { passive: true });

  layout();
  draw();

  /* Set only after a frame exists, so a failure anywhere above leaves the
     CSS gradients underneath showing rather than a blank page. */
  root.classList.add("has-dots");

  /* A handle for tuning from the console without a rebuild:
       SignalField.set({ alpha: 0.5, size: 1.4, perPx: 120 }) */
  window.SignalField = {
    redraw: function () { layout(); draw(); },
    set: function (o) {
      if (o.alpha  !== undefined) ALPHA  = o.alpha;
      if (o.size   !== undefined) SIZE   = o.size;
      if (o.perPx  !== undefined) PER_PX = o.perPx;
      layout(); draw();
      return { alpha: ALPHA, size: SIZE, perPx: PER_PX, dots: count };
    },
    stats: function () { return { alpha: ALPHA, size: SIZE, perPx: PER_PX, dots: count }; }
  };
})();
