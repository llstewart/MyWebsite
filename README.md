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
as chrome rather than as decoration, and content ordered the way a recruiter
reads. Landing, then skills, then projects, then experience.

It is a resume companion, not a services page. Nothing on it offers work, quotes
a scope, or announces availability.

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

The shipped file was rebuilt on 2 August 2026 from the current knowledge base.
Source of truth for it is
`resume-pipeline/jobs/general-software-engineer-2026-08-02/`: the `resume.json`
records every bullet's `evidence_id`, and `composition_notes` records what was
trimmed to hold one page and why.

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

Push to `main`. GitHub Pages is configured to deploy from the branch root
(`build_type: legacy`), so its built-in `pages build and deployment` job
publishes every push. There is no custom workflow: the repository used to carry
one built on `actions/upload-pages-artifact@v2`, which failed permanently once
`upload-artifact@v3` was retired, and it was redundant with the built-in job
anyway. If you ever want the Actions based path instead, switch the Pages source
to "GitHub Actions" in repository settings first, then add a workflow using
`configure-pages@v5`, `upload-pages-artifact@v3`, and `deploy-pages@v4`.

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
