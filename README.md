# llstewart.github.io

Lincoln Stewart's engineering portfolio. One page, no framework, no build step,
no dependencies.

**Live:** https://llstewart.github.io/MyWebsite/

---

## What it is

A single static page whose job is to convert a recruiter or hiring engineer into
an interview loop. Design direction, audience, and success measures are in
[`docs/BUSINESS-PLAN.md`](docs/BUSINESS-PLAN.md). Requirements and acceptance
criteria are in [`docs/PRD.md`](docs/PRD.md). Colour, type, material, and motion
are in [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md).

The short version: near white paper, a drawn contour field behind it, glass used
as chrome rather than as decoration, and content organised as a landing hub, one
featured system, and an index of the rest.

## Run it

There is nothing to install.

```bash
python -m http.server 8000
# then open http://localhost:8000
```

Editing is editing. Change the HTML, change a token, reload.

## Structure

```
index.html              the page
404.html                same system, one panel, three ways back
sw.js                   offline copy, network first
manifest.json           installable
robots.txt sitemap.xml

assets/
  css/
    tokens.css          the entire system: colour, type, space, form, motion
    base.css            reset, typography, page frame, field, rail, hub, links
    glass.css           the material, nav, command palette
    sections.css        one block per region, in document order
    states.css          arrival, departure, offline, pointer, preferences, print
  js/
    liquid-glass.js     vendored, unmodified, MIT
    field.js            the contour field canvas
    instrument.js       reveal, position gauge, disclosures, command palette
    main.js             lifecycle, glass tier decision, resilience
  icon.svg
  Lincoln_Stewart_Resume.pdf

docs/
  BUSINESS-PLAN.md  PRD.md  DESIGN-SYSTEM.md
```

Load order matters: `tokens` then `base` then `glass` then `sections` then
`states`. `states.css` is last because it wins.

## Editing the content

All content is in `index.html`. It is authored by hand rather than generated,
and it must stay consistent with the master profile in
`resume-pipeline/knowledge-base/`. Two rules that are not negotiable:

1. **Every number traces to a fact.** Either `metrics_registry` in
   `master-profile.json`, or the `facts` of an evidence bullet in
   `evidence-bank.json`. A number a reader cannot attribute is worth less than
   no number.
2. **Nothing appears that Lincoln has not shipped with.** The excluded list is
   C, C++, C#, .NET, ASP.NET, Java, PHP, Bootstrap, Active Directory.

Also: no em dashes, no emoji, no pills, and the résumé pipeline is never
mentioned.

## Replacing the résumé

Drop the new PDF at `assets/Lincoln_Stewart_Resume.pdf`, keeping the filename.
The page checks the file exists on load, retries a transient failure three times
with backoff, and degrades the control to "Request résumé by email" if it is
genuinely missing, so a stale link never silently 404s a recruiter.

**The file currently shipped is the July 2026 general software engineering
résumé and predates several profile corrections. It should be replaced.**

## The glass

Refraction is real: an SVG displacement map applied through `backdrop-filter`,
using the technique published by
[deepika-builds/liquid-glass](https://github.com/deepika-builds/liquid-glass)
(MIT). `assets/js/liquid-glass.js` is vendored unmodified so upstream fixes can
be dropped in.

Three tiers, chosen per device by `main.js`:

- **refractive** on a desktop with a fast link, enough cores and memory
- **frosted** on phones, tablets, save-data, Safari, Firefox, and anything a live
  frame rate watchdog demotes after four seconds under 20fps
- **opaque** under `prefers-reduced-transparency: reduce`

Only the nav, the contact panel, and the command palette ever get a displacement
map. Map generation is O(w x h) and the filtered backdrop recomposites over a
moving field, so large content panels use frost by design.

`--r-glass: 28px` is load bearing. The module reads `border-radius` to build the
map's neutral inset.

## Deploying

Push to `main`. `.github/workflows/deploy.yml` publishes the repository root to
GitHub Pages.

The service worker is network first for everything same origin, so a deploy is
never served stale. Bump `VERSION` in `sw.js` when you want old caches evicted.

## Browser support

Chromium, Safari, and Firefox, current and one back. Refraction is Chromium
only; everywhere else gets frost, which is a different finish rather than a
missing feature.

The page renders complete with JavaScript disabled: every disclosure ships open,
reveal animations are scoped to `.js`, and an inline timeout in `<head>` reveals
the body after four seconds even if `main.js` never loads.

## Licence

MIT for the code. The content, the résumé, and the likeness are Lincoln
Stewart's.
