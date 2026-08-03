/* ===========================================================================
   main.js — page lifecycle and the glass tier decision.

   Responsibilities:
     1. Arrival. Hold the hero until type is ready, then run the load
        sequence once. Never hold longer than the budget, whatever happens.
     2. Glass. Decide per device whether this page can afford real
        refraction, apply it, and downgrade live if it turns out it cannot.
     3. Departure. Fade out on outbound navigation, and undo that cleanly
        when the browser restores the page from the back/forward cache.
     4. Resilience. Retry what can be retried, degrade honestly when it
        cannot, and never leave a control that silently does nothing.
   =========================================================================== */

(function () {
  "use strict";

  var root = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lowTransparency = window.matchMedia("(prefers-reduced-transparency: reduce)").matches;
  // "pointer: coarse" is the wrong test: a Windows laptop with a touchscreen
  // reports coarse as its primary pointer while still having a mouse and a
  // discrete GPU. What actually matters is whether any fine, hovering pointer
  // exists at all, which is false exactly on the phones and tablets that
  // cannot afford this effect.
  var precise = window.matchMedia("(any-pointer: fine)").matches
             && window.matchMedia("(any-hover: hover)").matches;
  var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  var saveData = !!(conn && conn.saveData);
  var slowLink = !!(conn && /(^|-)2g$/.test(conn.effectiveType || ""));

  /* ------------------------------------------------------------------
     A promise that always settles. Used everywhere a third party could
     hang: fonts, network probes, anything not ours.
     ------------------------------------------------------------------ */
  function within(promise, ms, fallback) {
    return new Promise(function (resolve) {
      var done = false;
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        resolve(fallback);
      }, ms);
      Promise.resolve(promise).then(function (v) {
        if (done) return;
        done = true; clearTimeout(timer); resolve(v);
      }, function () {
        if (done) return;
        done = true; clearTimeout(timer); resolve(fallback);
      });
    });
  }

  /* Retry with backoff. Resolves with the value, or null once spent. */
  function retry(task, attempts, baseDelay) {
    attempts = attempts || 3;
    baseDelay = baseDelay || 400;
    return new Promise(function (resolve) {
      var n = 0;
      (function attempt() {
        n++;
        Promise.resolve()
          .then(task)
          .then(resolve, function () {
            if (n >= attempts) return resolve(null);
            setTimeout(attempt, baseDelay * Math.pow(2, n - 1));
          });
      })();
    });
  }

  /* ==================================================================
     1. Arrival
     ------------------------------------------------------------------
     The name is split into individual glyphs so each one can be given its
     own delay. The markup ships as plain words, the h1 carries an
     aria-label, and the split spans are hidden from assistive tech, so a
     screen reader hears "Lincoln Stewart" and never a column of letters.
     Under reduced motion the split is skipped entirely.
     ================================================================== */
  function splitName() {
    if (reduced) return;
    var lines = document.querySelectorAll(".hero__name .hero__word");
    if (!lines.length) return;
    var offset = 0;
    Array.prototype.forEach.call(lines, function (word, row) {
      var text = word.textContent;
      var frag = document.createDocumentFragment();
      for (var i = 0; i < text.length; i++) {
        var ch = document.createElement("span");
        ch.className = "hero__ch";
        ch.textContent = text.charAt(i);
        ch.style.setProperty("--i", offset + i);
        ch.style.setProperty("--row", row);
        frag.appendChild(ch);
      }
      word.textContent = "";
      word.appendChild(frag);
      word.setAttribute("aria-hidden", "true");
      offset += Math.round(text.length * 0.55);   // lines overlap, not queue
    });

    // Once the last glyph has landed, unmask the lines so the resting
    // shadow is not clipped at the baseline.
    var name = document.querySelector(".hero__name");
    setTimeout(function () { if (name) name.classList.add("is-settled"); }, 3200);
  }

  function arrive() {
    splitName();
    // Type is the whole design here, so the hero waits for it. Briefly.
    var fonts = document.fonts ? document.fonts.ready : Promise.resolve();
    within(fonts, 2200, null).then(function () {
      requestAnimationFrame(function () {
        requestAnimationFrame(ready);
      });
    });

    // Hard ceiling. If anything above misbehaves, the page still arrives.
    setTimeout(ready, 3200);
  }

  function ready() {
    if (root.classList.contains("is-ready")) return;
    root.classList.remove("is-loading");
    root.classList.add("is-ready");
  }

  /* ==================================================================
     2. Glass
     ------------------------------------------------------------------
     Refraction is a real cost: the displacement map is generated per
     element at O(w x h), and the filtered backdrop is recomposited over a
     moving field. It is worth it on a desktop pointer with a fast link,
     and it is not worth it on a phone on a metered one. The page decides
     rather than assuming, and it keeps checking after it decides.
     ================================================================== */
  var handles = [];

  function glassBudget() {
    if (lowTransparency) return "opaque";            // an explicit user request
    if (typeof window.liquidGlass !== "function") return "frosted";
    if (saveData || slowLink) return "frosted";
    if (window.innerWidth < 900) return "frosted";
    if ((navigator.hardwareConcurrency || 4) < 4) return "frosted";
    if ((navigator.deviceMemory || 4) < 4) return "frosted";
    // Touch only and not wide: a tablet, where the cost is not worth it.
    // Pointer media alone is not trustworthy here, since a Windows laptop
    // with a touchscreen reports no fine pointer at all, so it is only used
    // to break the tie. The live frame rate watchdog below is the real
    // safety net: measure, then decide, rather than guessing from a string.
    if (!precise && window.innerWidth < 1200) return "frosted";
    return "refractive";
  }

  /* Frost is the floor, not the absence of a floor. Anything that opted out
     of refraction still needs a backdrop, or the panel reads as a flat card. */
  function frost() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-glass]"), function (el) {
      el.classList.add("lg-fallback");
    });
  }

  var PROFILES = {
    // The nav is the one glass surface that passes over body copy, and the
    // name is 6.6rem. A strong displacement there reads as a smear rather
    // than as glass, so it gets a gentle bend and a heavier blur instead.
    // Page content scrolls under this bar, which is the one place on the page
    // with the high frequency detail refraction needs. Close to her defaults.
    nav:      { scale: -96, chroma: 5, blur: 3, saturate: 1.5, border: 0.09, mapBlur: 11 },
    palette:  { scale: -74,  chroma: 4, blur: 6, saturate: 1.4,  border: 0.09, mapBlur: 10 },
    // The approach panel is the only surface with a photograph behind it, so
    // it gets close to her published defaults. This is the effect at full
    // strength, and it is the one place on the page that earns it.
    approach: { scale: -112, chroma: 6, blur: 3, saturate: 1.5,  border: 0.07, mapBlur: 12 },
    // contact and feature were removed on 2026-08-03. Apple's guidance is
    // that Liquid Glass is for the navigation layer and never for content,
    // and on plain paper the refraction had nothing to bend regardless.
    // Small, and there are five of them. A gentle bend, a tight neutral
    // inset so the band stays inside the capsule, and no chroma: prism
    // fringe on a 40px control reads as a rendering fault, not as glass.
    pill:     { scale: -34,  chroma: 0, blur: 5, saturate: 1.35, border: 0.30, mapBlur: 6 },
    feature:  { scale: -88,  chroma: 5, blur: 4, saturate: 1.45, border: 0.06, mapBlur: 13 }
  };

  function applyGlass() {
    var mode = glassBudget();
    window.__glassMode = mode;
    root.setAttribute("data-glass-mode", mode);
    if (mode !== "refractive") { if (mode !== "opaque") frost(); return; }

    Array.prototype.forEach.call(document.querySelectorAll("[data-glass]"), function (el) {
      var profile = PROFILES[el.getAttribute("data-glass")] || PROFILES.contact;
      el.classList.remove("lg-fallback");     // may be re-upgrading after a resize
      try {
        var handle = window.liquidGlass(el, profile);
        handle.el = el;                       // so a resized element can be found later
        handles.push(handle);
        if (!handle.supported) window.__glassMode = "frosted";
      } catch (err) {
        el.classList.add("lg-fallback");
        if (window.console) console.warn("[glass] refraction unavailable, using frost", err);
      }
    });

    if (window.__glassMode !== "refractive") {
      root.setAttribute("data-glass-mode", window.__glassMode);
    } else {
      watchGlass();
    }
  }

  /* If the device turns out to be slower than it claimed, take the glass
     down rather than shipping a stuttering page. Checked over the first
     eight seconds, which is where the cost shows up.

     The threshold is deliberately low and the first two seconds are ignored.
     A 30Hz panel, a throttled tab, a power saving mode, and the font and map
     work of the load itself all report far under 60 while being perfectly
     smooth, and punishing any of them would strip the effect from machines
     that could carry it easily. Only a sustained sub-20 after the page has
     settled counts, and only while the tab is actually in front. */
  function watchGlass() {
    if (reduced) return;
    var frames = 0, start = performance.now(), strikes = 0, mark = start;

    function tick(now) {
      frames++;
      if (now - mark >= 1000) {
        var fps = (frames * 1000) / (now - mark);
        frames = 0; mark = now;
        var watching = !document.hidden && document.hasFocus() && now - start >= 2000;
        if (!watching) strikes = 0;
        else strikes = fps < 20 ? strikes + 1 : 0;
        if (strikes >= 4) return downgrade();
      }
      if (now - start < 10000) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function downgrade() {
    handles.forEach(function (h) { try { h.destroy(); } catch (_) {} });
    handles = [];
    frost();
    window.__glassMode = "frosted (auto)";
    root.setAttribute("data-glass-mode", "frosted");
  }

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var wanted = glassBudget();
      if (wanted === "refractive" && !handles.length) applyGlass();
      else if (wanted !== "refractive" && handles.length) downgrade();
    }, 260);
  }, { passive: true });

  /* ==================================================================
     3. Departure and return
     ================================================================== */
  function initTransitions() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest("a[href]") : null;
      if (!a) return;
      if (a.target === "_blank" || a.hasAttribute("download")) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

      var href = a.getAttribute("href") || "";
      if (href.charAt(0) === "#" || href.indexOf("mailto:") === 0 || href.indexOf("tel:") === 0) return;

      var url;
      try { url = new URL(a.href, location.href); } catch (_) { return; }
      if (url.origin !== location.origin) return;      // another site, let the browser handle it

      if (reduced) return;
      root.classList.add("is-leaving");
    });

    // Never strand the page mid fade if the navigation is cancelled or the
    // visitor comes back through history.
    window.addEventListener("pageshow", function (e) {
      root.classList.remove("is-leaving");
      if (e.persisted) ready();
    });
    window.addEventListener("pagehide", function () {
      root.classList.remove("is-leaving");
    });
  }

  /* ==================================================================
     4. Resilience
     ================================================================== */

  /* The resume is the single most important outbound asset on this page.
     Verify it exists, retry a transient failure, and if it is genuinely
     missing say so on the control instead of handing over a dead link. */
  function verifyResume() {
    var links = Array.prototype.slice.call(
      document.querySelectorAll('a[href$="Lincoln_Stewart_Resume.pdf"]')
    );
    if (!links.length || location.protocol === "file:" || !window.fetch) return;

    links.forEach(function (a) { a.setAttribute("data-state", "checking"); });

    retry(function () {
      return fetch(links[0].getAttribute("href"), { method: "HEAD", cache: "no-store" })
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return true;
        });
    }, 3, 500).then(function (ok) {
      links.forEach(function (a) {
        if (ok) { a.setAttribute("data-state", "ready"); return; }
        a.setAttribute("data-state", "missing");
        a.setAttribute("href", "mailto:lincolnstewart4@gmail.com?subject=Resume%20request");
        a.removeAttribute("download");
        a.textContent = "Request resume by email";
      });
    });
  }

  /* Offline is a state, not an error page. Say it once, quietly. */
  function initConnection() {
    var banner = document.getElementById("net-state");
    if (!banner) return;
    function update() {
      var off = navigator.onLine === false;
      banner.classList.toggle("is-up", off);
      banner.textContent = off ? "You are offline. This page still works." : "";
    }
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    update();
  }

  /* The glare from her demo: a 160px highlight that follows the pointer
     across every glass surface. liquid-glass.js does the refraction, the CSS
     carries the gradient, and this writes the two custom properties it reads. */
  function initGlare() {
    var surfaces = Array.prototype.slice.call(document.querySelectorAll(".glass, .glass--flat, .pill"));
    if (!surfaces.length || !window.matchMedia("(any-hover: hover)").matches) return;
    var queued = false, last = null;

    window.addEventListener("pointermove", function (e) {
      last = e;
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        if (!last) return;
        for (var i = 0; i < surfaces.length; i++) {
          var el = surfaces[i];
          var r = el.getBoundingClientRect();
          if (r.bottom < -200 || r.top > window.innerHeight + 200) continue;
          el.style.setProperty("--gx", ((last.clientX - r.left) / r.width * 100).toFixed(1) + "%");
          el.style.setProperty("--gy", ((last.clientY - r.top) / r.height * 100).toFixed(1) + "%");
        }
      });
    }, { passive: true });
  }

  /* The bar is open at the top of the page and contracts as the reader
     moves, continuously rather than at a threshold.

     A scroll position is turned into --nav-t, a number from 0 to 1, and
     every dimension in the CSS is an interpolation off it. The value is
     eased toward its target once per frame rather than written raw, so the
     bar settles instead of tracking the wheel exactly, which is the
     difference between something that resizes and something that feels
     attached to the page.

     The displacement map is sized for one exact set of dimensions, and
     rebuilding it costs O(w x h). It is therefore rebuilt once, 180ms after
     the value stops changing. Being a few pixels stale mid scroll is
     invisible; rebuilding per frame is not. */
  function initNavScale() {
    var nav = document.getElementById("nav");
    if (!nav) return;

    var RANGE = 140;          // px of scroll over which the bar collapses
    var last = -1, settle = null;

    /* The displacement map is generated for one exact size and rebuilding it
       costs O(w x h). It is therefore rebuilt once, after the value has
       stopped changing. A map a few pixels stale mid scroll is invisible;
       rebuilding one per frame is not. */
    function scheduleRefresh() {
      clearTimeout(settle);
      settle = setTimeout(function () {
        for (var i = 0; i < handles.length; i++) {
          if (handles[i] && handles[i].el === nav && handles[i].refresh) handles[i].refresh();
        }
      }, 200);
    }

    /* Direction, with a dead zone. Without one a trackpad's small reverse
       jitter flickers the bar in and out on every frame. */
    var prevY = window.scrollY, away = false;

    function direction() {
      var y = window.scrollY;
      var d = y - prevY;
      if (Math.abs(d) < 6) return;
      prevY = y;

      var next = d > 0 && y > 260;
      if (next === away) return;
      away = next;
      nav.classList.toggle("is-away", away);
    }

    function measure() {
      direction();
      var t = Math.min(1, Math.max(0, window.scrollY / RANGE));
      if (Math.abs(t - last) < 0.002) return;
      last = t;
      nav.style.setProperty("--nav-t", t.toFixed(4));
      scheduleRefresh();
    }

    /* Written straight from the scroll event rather than through
       requestAnimationFrame. The smoothing lives in the CSS transition on
       --nav-t, which keeps working when rAF is throttled: a background tab,
       a battery saver, or an automated browser. */
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    measure();
  }

  /* Touch-point illumination.

     Apple's description of the material is that pressing one piece of glass
     lights the glass near it, so the surface reads as connected rather than
     as a row of separate buttons. Nothing in their documentation gives a
     number for it, so the falloff here is chosen to match the description:
     the pressed surface goes to full, its neighbours fall away over about
     320px, and everything decays within half a second.

     --lit is a plain number per surface; the CSS turns it into light. */
  function initTouchLight() {
    var RADIUS = 320;
    var surfaces = function () {
      return Array.prototype.slice.call(
        document.querySelectorAll(".glass, .glass--flat, .pill, .nav__cmd"));
    };
    var decay = null;

    function light(x, y) {
      var all = surfaces();
      for (var i = 0; i < all.length; i++) {
        var r = all[i].getBoundingClientRect();
        if (r.bottom < -RADIUS || r.top > window.innerHeight + RADIUS) continue;
        var cx = Math.max(r.left, Math.min(x, r.right));
        var cy = Math.max(r.top, Math.min(y, r.bottom));
        var d = Math.hypot(x - cx, y - cy);
        var v = d >= RADIUS ? 0 : Math.pow(1 - d / RADIUS, 2);
        all[i].style.setProperty("--lit", v.toFixed(3));
      }
      clearTimeout(decay);
      decay = setTimeout(function () {
        all.forEach(function (el) { el.style.setProperty("--lit", "0"); });
      }, 140);
    }

    document.addEventListener("pointerdown", function (e) {
      if (reduced) return;
      light(e.clientX, e.clientY);
    }, { passive: true });
  }

  /* Touch has no hover, so every control gets a press state instead. */
  function initPressFeedback() {
    var SELECTOR = ".action, .nav__link, .nav__cmd, .palette__item, .link, .pill, .entry__head";

    document.addEventListener("pointerdown", function (e) {
      var target = e.target.closest ? e.target.closest(SELECTOR) : null;
      if (target) target.classList.add("is-pressed");
    }, { passive: true });

    ["pointerup", "pointercancel", "pointerleave", "scroll"].forEach(function (evt) {
      window.addEventListener(evt, function () {
        Array.prototype.forEach.call(document.querySelectorAll(".is-pressed"), function (el) {
          el.classList.remove("is-pressed");
        });
      }, { passive: true, capture: true });
    });
  }

  /* Service worker: an offline copy of a page that is already tiny. Kept
     network first for the document so a deploy is never stale. */
  function initServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    if (location.protocol === "file:") return;
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./sw.js").catch(function (err) {
        if (window.console) console.info("[sw] not registered", err && err.message);
      });
    });
  }

  function boot() {
    arrive();
    applyGlass();
    initTransitions();
    initGlare();
    initTouchLight();
    initNavScale();
    initPressFeedback();
    initConnection();
    verifyResume();
    initServiceWorker();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
