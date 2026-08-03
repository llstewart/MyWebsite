/* ===========================================================================
   instrument.js — everything on this page that reads or reports state.

   Reveal, position gauge, counters, the local clock, the live telemetry
   panel, and the command palette. Each is an independent unit with its own
   init, so one failing does not take the page with it.
   =========================================================================== */

(function () {
  "use strict";

  var reduced = LS.reduced;
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
    /* Both edges, not just the first crossing.

       This used to unobserve on the first hit, which made an exit state
       impossible: once an element had been revealed nothing ever heard from
       it again. It keeps observing now, because scrolling back up the page
       has to undo the exit as well. */
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var el = entry.target;
        if (entry.isIntersecting) {
          el.classList.add("is-revealed");
          el.classList.remove("is-past");
          return;
        }
        /* Only fade what has gone up. Something still below the fold has
           not been read yet, and should sit at its entrance state waiting
           its turn rather than being treated as already finished. */
        if (entry.boundingClientRect.top >= 0) return;

        /* is-revealed as well as is-past, and this is the part that is easy
           to miss: an element can end up above the viewport without ever
           having intersected it. Follow an anchor link, open the page on a
           #hash, or let the browser restore a scroll position, and
           everything jumped over is skipped entirely. Marking it past
           without marking it revealed would leave it at the entrance
           state, which is opacity 0, permanently invisible to anyone who
           scrolls back up. */
        el.classList.add("is-revealed", "is-past");
      });
    }, { rootMargin: "-6% 0px -12% 0px", threshold: 0.04 });
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
      { kind: "Go",     label: "Practice",                run: function () { jump("#approach"); } },
      { kind: "Go",     label: "Contact",                 run: function () { jump("#contact"); } },
      { kind: "Copy",   label: "Copy email address",      run: function () { copy(LS.contact().email, "Email address copied"); } },
      { kind: "Open",   label: "Email Lincoln",           run: function () { location.href = LS.contact().emailHref; } },
      { kind: "Open",   label: "LinkedIn",                mark: "linkedin", run: function () { open_("https://www.linkedin.com/in/lincoln-stewart01/"); } },
      { kind: "Open",   label: "GitHub",                  mark: "github",   run: function () { open_("https://github.com/llstewart"); } },
      { kind: "Open",   label: "Packleads, live",         run: function () { open_("https://packleads.io"); } },
      { kind: "File",   label: "Download resume",         run: function () { location.href = "./assets/Lincoln_Stewart_Resume.pdf"; } }
    ];

    /* The same two marks the contact block uses. Inline, because two shapes
       do not justify a sprite or a library. */
    var MARKS = {
      github: '<svg class="mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.12-.31-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.18.77.84 1.24 1.91 1.24 3.23 0 4.63-2.8 5.65-5.48 5.95.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z"/></svg>',
      linkedin: '<svg class="mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"/></svg>'
    };

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
        btn.innerHTML = '<span class="palette__kind"></span><span class="palette__label"></span>'
                      + '<span class="palette__go" aria-hidden="true"></span>';
        btn.querySelector(".palette__kind").textContent = cmd.kind;
        var label = btn.querySelector(".palette__label");
        label.textContent = cmd.label;
        if (cmd.mark && MARKS[cmd.mark]) label.insertAdjacentHTML("afterbegin", MARKS[cmd.mark]);
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

  LS.ready(boot);
})();
