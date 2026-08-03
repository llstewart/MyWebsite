/* ===========================================================================
   env.js — the things every other script needs to know, in one place.

   Loaded first. Nothing here touches layout, draws anything, or knows what
   the page contains. It answers four questions that were previously being
   answered separately, and slightly differently, in three files:

     What does this visitor prefer?   reduced motion, saved data, hover
     What does the stylesheet say?     one reader for design tokens
     When may I start?                 one document-ready path
     How do I contact Lincoln?         read from the page, never retyped

   The last one is the one that mattered. His email address appeared in
   eight places across three files: twice in the command palette, once in
   the resume fallback, and four times in the markup including the JSON-LD.
   Changing it meant eight edits and one of them would eventually be missed,
   which for a contact detail on a job hunt is the most expensive bug on the
   site. The markup is now the single source and the scripts read it.

   Why a global rather than modules. The page ships four small scripts with
   no build step and no bundler, deliberately: it is a static site that must
   work from a file:// URL and from a cache. A single namespaced global is
   the honest form that dependency takes without a module graph.
   =========================================================================== */

window.LS = (function () {
  "use strict";

  var root = document.documentElement;

  function mq(q) {
    return window.matchMedia ? window.matchMedia(q).matches : false;
  }

  var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  var api = {
    /* --- Preferences ------------------------------------------------------
       Read once at load, which is what every caller already assumed. A
       visitor who changes their motion setting mid-session gets it on the
       next navigation, and that is the right trade for not having three
       files each maintaining a live listener. */
    reduced: mq("(prefers-reduced-motion: reduce)"),
    lowTransparency: mq("(prefers-reduced-transparency: reduce)"),

    /* A fine, hovering pointer ANYWHERE. Not "pointer: coarse", which is
       true on a Windows laptop with a touchscreen that also has a mouse and
       a discrete GPU. */
    precise: mq("(any-pointer: fine)") && mq("(any-hover: hover)"),
    hover: mq("(any-hover: hover)"),

    saveData: !!(conn && conn.saveData),
    slowLink: !!(conn && /(^|-)2g$/.test(conn.effectiveType || "")),

    /* --- Tokens -----------------------------------------------------------
       The stylesheet is the source of truth for colour, and a canvas cannot
       inherit, so anything drawing pixels has to ask. */
    token: function (name, fallback) {
      var v = getComputedStyle(root).getPropertyValue(name).trim();
      return v || fallback;
    },

    /* --- Timing ----------------------------------------------------------- */
    debounce: function (fn, ms) {
      var t = null;
      return function () {
        var self = this, args = arguments;
        clearTimeout(t);
        t = setTimeout(function () { fn.apply(self, args); }, ms);
      };
    },

    ready: function (fn) {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", fn);
      } else {
        fn();
      }
    },

    /* --- DOM -------------------------------------------------------------- */
    all: function (sel, within) {
      return Array.prototype.slice.call((within || document).querySelectorAll(sel));
    },

    /* --- Contact -----------------------------------------------------------
       Derived from the markup rather than declared here, so the page stays
       the one place these exist. Lazy, because the scripts that want them
       may load before the body does. */
    contact: function () {
      /* Email only. The phone number was removed from the site on
         2026-08-03 at Lincoln's request, so there is no tel: anchor to
         derive one from, and a reader that goes looking for a value that
         is deliberately absent invites someone to helpfully put it back. */
      var mail = document.querySelector('a[href^="mailto:"]');
      return {
        email: mail ? mail.getAttribute("href").replace(/^mailto:/, "").split("?")[0] : "",
        emailHref: mail ? mail.getAttribute("href") : ""
      };
    }
  };

  return api;
})();
