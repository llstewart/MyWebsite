/* ===========================================================================
   instrument.js — everything on this page that reads or reports state.

   Reveal, position gauge, counters, the local clock, the live telemetry
   panel, and the command palette. Each is an independent unit with its own
   init, so one failing does not take the page with it.
   =========================================================================== */

(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------------------
     Reveal
     --------------------------------------------------------------------- */
  function initReveal() {
    var items = $$("[data-reveal]");
    if (!items.length) return;
    if (reduced || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-revealed"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------------------
     Scroll spy. Lights the current section in the nav bar.
     --------------------------------------------------------------------- */
  function initGauge() {
    var navLinks = $$("[data-nav]");
    var sections = navLinks
      .map(function (a) { return document.getElementById(a.getAttribute("data-nav")); })
      .filter(Boolean);
    if (!sections.length) return;

    var current = "";

    function setCurrent(id) {
      if (id === current) return;
      current = id;
      navLinks.forEach(function (a) {
        a.setAttribute("aria-current", a.getAttribute("data-nav") === id ? "true" : "false");
      });
    }

    function measure() {
      var mid = window.scrollY + window.innerHeight * 0.34;
      var found = sections[0].id;
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].offsetTop <= mid) found = sections[i].id;
      }
      setCurrent(found);
    }

    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { measure(); ticking = false; });
    }, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    measure();
  }

  /* ---------------------------------------------------------------------
     Command palette
     --------------------------------------------------------------------- */
  function initPalette() {
    var root = $("#palette");
    var input = $("#palette-input");
    var list = $("#palette-list");
    var opener = $("#cmd-open");
    if (!root || !input || !list) return;

    var COMMANDS = [
      { kind: "Go",     label: "Top",                     run: function () { jump("#top"); } },
      { kind: "Go",     label: "Skills",                  run: function () { jump("#skills"); } },
      { kind: "Go",     label: "Projects",                run: function () { jump("#projects"); } },
      { kind: "Go",     label: "Packleads",               run: function () { jump("#sys-packleads"); } },
      { kind: "Go",     label: "Sellorie",                run: function () { jump("#sys-sellorie"); } },
      { kind: "Go",     label: "Global Report Builder",   run: function () { jump("#sys-grb"); } },
      { kind: "Go",     label: "Serial number recognition", run: function () { jump("#sys-vision"); } },
      { kind: "Go",     label: "PulseHue",                run: function () { jump("#sys-pulsehue"); } },
      { kind: "Go",     label: "Client web practice",     run: function () { jump("#sys-agency"); } },
      { kind: "Go",     label: "Experience",              run: function () { jump("#experience"); } },
      { kind: "Go",     label: "Approach",                run: function () { jump("#approach"); } },
      { kind: "Go",     label: "Contact",                 run: function () { jump("#contact"); } },
      { kind: "Copy",   label: "Copy email address",      run: function () { copy("lincolnstewart4@gmail.com", "Email address copied"); } },
      { kind: "Copy",   label: "Copy phone number",       run: function () { copy("(443) 460-8224", "Phone number copied"); } },
      { kind: "Open",   label: "Email Lincoln",           run: function () { location.href = "mailto:lincolnstewart4@gmail.com"; } },
      { kind: "Open",   label: "LinkedIn",                run: function () { open_("https://www.linkedin.com/in/lincoln-stewart01/"); } },
      { kind: "Open",   label: "GitHub",                  run: function () { open_("https://github.com/llstewart"); } },
      { kind: "Open",   label: "Packleads, live",         run: function () { open_("https://packleads.io"); } },
      { kind: "File",   label: "Download resume",         run: function () { location.href = "./assets/Lincoln_Stewart_Resume.pdf"; } }
    ];

    var results = COMMANDS.slice();
    var index = 0;
    var lastFocus = null;

    function jump(sel) {
      var el = document.querySelector(sel);
      if (!el) return;
      // Landing on a collapsed index row would look like nothing happened.
      var d = el.querySelector ? el.querySelector("details") : null;
      if (d) d.open = true;
      el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    }
    function open_(url) { window.open(url, "_blank", "noopener"); }
    function copy(text, message) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { toast(message); },
                                                 function () { toast(text); });
      } else { toast(text); }
    }

    var toastEl = null, toastTimer = null;
    function toast(message) {
      if (!toastEl) {
        toastEl = document.createElement("div");
        toastEl.className = "toast label";
        document.body.appendChild(toastEl);
      }
      toastEl.textContent = message;
      toastEl.classList.add("is-up");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toastEl.classList.remove("is-up"); }, 2200);
    }

    /* One writer for selection state. Every path that changes the highlight
       goes through here, so the list can never end up with two selected rows
       or none at all. */
    function paint() {
      var nodes = $$(".palette__item", list);
      if (!nodes.length) return;
      if (index < 0 || index >= nodes.length) index = 0;
      nodes.forEach(function (n, j) { n.setAttribute("aria-selected", String(j === index)); });
    }

    function render() {
      list.innerHTML = "";
      if (!results.length) {
        var empty = document.createElement("li");
        empty.className = "palette__empty";
        empty.textContent = "Nothing matches that. Try a section name, or \"copy\".";
        list.appendChild(empty);
        return;
      }
      results.forEach(function (cmd, i) {
        var li = document.createElement("li");
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "palette__item";
        btn.setAttribute("role", "option");
        btn.setAttribute("aria-selected", String(i === index));
        btn.innerHTML = '<span class="palette__kind"></span><span class="palette__label"></span>';
        btn.querySelector(".palette__kind").textContent = cmd.kind;
        btn.querySelector(".palette__label").textContent = cmd.label;
        btn.addEventListener("click", function () { close_(); cmd.run(); });
        btn.addEventListener("mousemove", function () {
          if (index === i) return;
          index = i;
          paint();
        });
        li.appendChild(btn);
        list.appendChild(li);
      });
      paint();
    }

    function filter(q) {
      var needle = q.trim().toLowerCase();
      results = !needle ? COMMANDS.slice() : COMMANDS.filter(function (c) {
        return (c.kind + " " + c.label).toLowerCase().indexOf(needle) > -1;
      });
      index = 0;
      render();
    }

    function move(delta) {
      if (!results.length) return;
      index = (index + delta + results.length) % results.length;
      paint();
      var nodes = $$(".palette__item", list);
      if (nodes[index]) nodes[index].scrollIntoView({ block: "nearest" });
    }

    function open__() {
      lastFocus = document.activeElement;
      root.hidden = false;
      requestAnimationFrame(function () { root.classList.add("is-open"); });
      input.value = "";
      filter("");
      input.focus();
      requestAnimationFrame(paint);   // survive any repaint during the open
    }
    function close_() {
      root.classList.remove("is-open");
      setTimeout(function () { root.hidden = true; }, reduced ? 0 : 220);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    if (opener) opener.addEventListener("click", open__);
    var closer = $("#palette-close");
    if (closer) closer.addEventListener("click", close_);
    input.addEventListener("input", function () { filter(input.value); });

    root.addEventListener("click", function (e) { if (e.target === root) close_(); });

    root.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); close_(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
      else if (e.key === "Enter") {
        e.preventDefault();
        var cmd = results[index];
        if (cmd) { close_(); cmd.run(); }
      }
    });

    document.addEventListener("keydown", function (e) {
      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        root.hidden ? open__() : close_();
        return;
      }
      if (!typing && (e.key === "k" || e.key === "K") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        open__();
      }
    });
  }

  /* ---------------------------------------------------------------------
     Disclosure motion.

     Everything after the <summary> is moved into a two element wrapper so
     CSS can animate it: a grid that runs 0fr to 1fr for the height, and an
     inner element that carries the fade. The markup stays plain <details>
     in the file, so no JavaScript still means a working disclosure.

     Closing is the part browsers get wrong. [open] is removed the moment
     the summary is clicked, so the content vanishes before any transition
     can run. Here the click is intercepted, the element is marked, the
     reverse plays, and [open] comes off at the end.
     --------------------------------------------------------------------- */
  function initDisclosureMotion() {
    var items = $$("details");
    if (!items.length) return;

    items.forEach(function (d) {
      var summary = d.querySelector("summary");
      if (!summary || d.querySelector(":scope > .dsc")) return;

      var wrap = document.createElement("div");
      wrap.className = "dsc";
      var inner = document.createElement("div");
      inner.className = "dsc__inner";
      while (summary.nextSibling) inner.appendChild(summary.nextSibling);
      wrap.appendChild(inner);
      d.appendChild(wrap);

      if (reduced) return;

      var timer = null;
      summary.addEventListener("click", function (e) {
        e.preventDefault();
        if (timer) { clearTimeout(timer); timer = null; d.classList.remove("is-closing"); }

        if (!d.open) { d.open = true; return; }

        d.classList.add("is-closing");
        var ms = parseFloat(getComputedStyle(document.documentElement)
                   .getPropertyValue("--d-close")) || 340;
        timer = setTimeout(function () {
          d.open = false;
          d.classList.remove("is-closing");
          timer = null;
        }, ms);
      });
    });
  }

  /* ---------------------------------------------------------------------
     Width-aware disclosures.

     Marked elements ship open, so a reader without JavaScript, a printer,
     and a crawler all get the full text. Below 900px they close, because
     the same content in one column is several extra screens of scrolling
     before the next section. A panel the reader opens or closes themselves
     is remembered and never overridden by a resize.
     --------------------------------------------------------------------- */
  function initDisclosures() {
    var wide = window.matchMedia("(min-width: 901px)");
    var items = $$("[data-open-wide]");
    if (!items.length) return;

    function apply() {
      items.forEach(function (d) {
        if (d.getAttribute("data-touched") !== "1") d.open = wide.matches;
      });
    }
    items.forEach(function (d) {
      var head = d.querySelector("summary");
      if (head) head.addEventListener("click", function () {
        d.setAttribute("data-touched", "1");
      });
    });
    apply();
    if (wide.addEventListener) wide.addEventListener("change", apply);
    else if (wide.addListener) wide.addListener(apply);
  }

  function initYear() {
    var el = document.getElementById("year");
    if (el) el.textContent = String(new Date().getFullYear());
  }

  function boot() {
    [initReveal, initGauge, initPalette, initDisclosureMotion,
     initDisclosures, initYear]
      .forEach(function (fn) {
        try { fn(); } catch (err) {
          if (window.console) console.warn("[instrument] " + fn.name + " failed", err);
        }
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
