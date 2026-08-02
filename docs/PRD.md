# Product requirements: llstewart.github.io

**Owner:** Lincoln Stewart
**Version:** 2.0, 2 August 2026
**Status:** Implemented
**Related:** [BUSINESS-PLAN.md](./BUSINESS-PLAN.md), [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md)

---

## 1. Problem

The previous site was a terminal themed page with a simulated boot sequence,
matrix rain, and neural network decoration. Three problems, in order of cost:

1. **The content was wrong.** It listed C++, ASP.NET, .NET, and Bootstrap, none
   of which Lincoln has used in years and all of which are excluded from his
   knowledge base. It was missing Packleads entirely, the strongest thing he has
   built. Contact details pointed at an old location.
2. **The design worked against the candidate.** Terminal chrome, glitch text, and
   emoji icons read as a student project. The people it needs to impress build
   real interfaces for a living.
3. **It made no argument.** It listed facts. It never said what Lincoln is for,
   who depends on his software, or why any of it is hard.

## 2. Goals

**G1.** A recruiter can determine role, seniority band, location, work
authorization, and get the résumé within twenty seconds of landing.

**G2.** A hiring engineer can read one system entry and understand the problem,
the architecture, and the outcome without asking a question.

**G3.** Every quantitative claim on the page traces to a fact in
`resume-pipeline/knowledge-base/`, and none contradicts the résumé.

**G4.** The page itself is evidence of front end capability, at a level a design
engineering interviewer would respect, without ever saying so.

**G5.** It works completely on a phone, on a slow connection, with JavaScript
disabled, with a screen reader, with reduced motion, with reduced transparency,
and on paper.

## 3. Non-goals

- A blog, a CMS, or any content that requires maintenance to stay non-embarrassing.
- Analytics or any third party script.
- A build step, a package manager, or a framework.
- Any claim that is not already true in the master profile.
- Mention of the résumé generation pipeline, per a standing decision.

## 4. Users and their jobs

**J1. Recruiter, 20 to 40 seconds.** "Is this person the right shape for the role
I am filling, and can I get their résumé into the system?"
Served by: the landing sentence, the contents table, the results line on every
system and role, and the contact block.

**J2. Hiring engineer, 3 to 8 minutes.** "Has this person actually built and
operated something, or have they just been near it?"
Served by: the featured system and the five index entries, all in problem,
build, result form; the experience bullets; the AGV incident disclosure; the
stack section with its stated boundary.

**J3. Founder or early stage lead, 2 to 5 minutes.** "Can he ship a product alone
and find real problems?"
Served by: Packleads and Sellorie entries including the discovery stories, and
the approach section.

**J4. Design engineering interviewer, 1 to 3 minutes.** "Does this person have
taste, and does the execution hold up under inspection?"
Served by: the whole page, and specifically the restraint. The glass is real
refraction rather than a blur, it degrades on purpose, and nothing on the page
announces any of that.

## 5. Information architecture

```
/                       one page, seven regions
  #top          Hero. Name, claim, three actions, live status readout.
  (measured)    Six results, each with its source. Not in the rail; it reads
                as part of the hero's argument.
  #systems      Six entries. Problem / Build / Result, then the stack line.
  #experience   Two roles plus education. The AGV incident sits inside the
                current role as a callout.
  #stack        Eight groups plus what is being learned now, and the boundary
                statement.
  #approach     Four short pieces: origin, who it is for, how problems get
                found, what is held to.
  #contact      Six rows. Email, phone, LinkedIn, GitHub, résumé, authorization.
  (footer)      How the page is built, and credit for the refraction technique.

/404.html               Same system, one panel, three ways back.
/assets/Lincoln_Stewart_Resume.pdf
/sitemap.xml  /robots.txt  /manifest.json  /sw.js
```

Deliberately one page. Every extra route is another chance for a reviewer to stop.

## 6. Functional requirements

### 6.1 Navigation

| ID | Requirement |
|---|---|
| N1 | A fixed glass bar carries the name, section links, and a search control. It is held off screen only during arrival. |
| N2 | Below 1000px the section links collapse and the command palette becomes the navigation, labelled "Menu". |
| N3 | A fixed left rail shows one tick per section, lights the current one, and reports scroll depth as a percentage. Hidden below 900px. |
| N4 | Current section is reflected on both the rail and the nav via `aria-current`, driven by one writer so they cannot disagree. |
| N5 | A skip link is the first focusable element. |

### 6.2 Command palette

| ID | Requirement |
|---|---|
| P1 | Opens on `K`, on `Cmd/Ctrl+K`, and by clicking the control. `K` alone is ignored while a field has focus. |
| P2 | Nineteen commands: jump to any section or any individual system, copy the email or phone, open LinkedIn, GitHub, or Packleads, download the résumé. |
| P3 | Substring filter across kind and label. Arrow keys move, Enter runs, Escape closes. |
| P4 | Exactly one row is selected at all times, written by a single function. |
| P5 | Focus moves to the input on open and returns to the invoking control on close. |
| P6 | A bottom sheet below 760px, capped at 72dvh so it never swallows the screen, with a visible Close control, 52px rows, and the keyboard hints hidden. |
| P7 | Copy actions confirm with a toast, because an action with no visible result reads as a broken control. |

### 6.3 Disclosures

| ID | Requirement |
|---|---|
| D1 | Every index entry ships closed. The featured system and the intern role ship open in the markup and close below 900px. |
| D2 | A disclosure the reader opens or closes themselves is remembered and never overridden by a resize. |
| D3 | Jumping to an entry from the palette expands it, or the jump lands on a closed row and looks like nothing happened. |
| D4 | Print forces every disclosure open. |

### 6.4 Content

| ID | Requirement |
|---|---|
| C1 | Every metric traces to `master-profile.json` `metrics_registry` or to the `facts` of an evidence bullet. |
| C2 | No skill from the excluded list: C, C++, C#, .NET, ASP.NET, Java, PHP, Bootstrap, Active Directory. |
| C3 | Job titles carry no invented level. "Intern" is never dropped. |
| C4 | Dates match the résumé exactly. |
| C5 | No em dashes anywhere in copy. |
| C6 | No emoji anywhere. |
| C7 | The `data_latency` 15% figure is excluded, because it conflicts with the 4s to 800ms figure and has not been resolved. |
| C8 | Agency clients are described by sector, not named. |

## 7. States

Every state below is implemented and reachable.

| State | Behaviour |
|---|---|
| **Arriving** | A hairline progress bar creeps to 88% while type loads, then completes. Body fades in. The name is split into glyphs and each one settles from a line height below, blurred to sharp, on a 46ms stagger. The sentence and the contents table follow. Once. |
| **Arrival failure** | An inline `setTimeout` in `<head>` reveals the page after 4 seconds regardless of whether `main.js` ever loads. `document.fonts.ready` is raced against a 2.2 second timeout. |
| **No JavaScript** | The holding classes are set by script, so they never apply. Reveal animations are scoped to `.js`. The page renders complete and static. |
| **Idle** | The field animates at a 30fps ceiling and sleeps entirely when the tab is hidden. The colour layer is cached at full size and re-rendered roughly twice a second, because re-running a high quality upscale every frame measured at 12fps behind a refracting panel. |
| **Hover** | Only offered where a pointer can hover. Neutralised under `@media (hover: none)` so a tapped card does not keep its lift. |
| **Pressed** | Every interactive control gets a press state on `pointerdown`, cleared on up, cancel, leave, or scroll. This is the only feedback a touch device gets between tap and result. |
| **Focused** | A 2px ember ring with 3px offset on `:focus-visible` throughout. |
| **Leaving** | Same origin navigation fades the body out. Cross document view transitions where supported. |
| **Returning** | `pageshow` clears the leaving state, and a back/forward cache restore is treated as ready immediately. |
| **Offline** | A status banner appears. The service worker serves the cached page. |
| **Asset checking** | The résumé link shows a pulsing indicator while its existence is verified. |
| **Asset missing** | After three retries with exponential backoff, the link becomes "Request résumé by email" and points at a pre-filled mailto. |
| **Reduced motion** | All durations collapse to 1ms, the field renders one static frame, reveals are disabled, view transitions are turned off, counters do not animate. |
| **Reduced transparency** | Every glass surface becomes an opaque panel, all backdrop filters are dropped, the field is dimmed. Layout does not change. |
| **High contrast** | Muted ink steps and hairlines are lifted. |
| **Printing** | Field, rail, nav, telemetry, palette, and actions are removed. Black on white, link targets expanded, page breaks avoided inside cards. |

## 8. Performance

| ID | Requirement | How it is met |
|---|---|---|
| PF1 | No render blocking JavaScript | All four scripts are at the end of `<body>` |
| PF2 | Type never blocks content | `font-display: swap`, real fallback stacks, preconnect to both hosts |
| PF3 | The background costs as little as possible | Colour masses render into a 1/10 scale buffer and upscale; only the thin traces are drawn at full resolution; 30fps ceiling; paused when hidden |
| PF4 | Refraction is budgeted, not assumed | Three tiers chosen from viewport, cores, memory, save-data, and pointer capability; only four small and medium surfaces ever get a displacement map |
| PF5 | A wrong budget decision self corrects | A frame rate watchdog runs for the first 8 seconds and downgrades to frost after 3 consecutive seconds under 24fps, ignoring hidden tabs |
| PF6 | Scroll work is cheap | One `requestAnimationFrame` throttled scroll handler, all listeners passive |
| PF7 | Layout does not shift | No web fonts in the critical text path without a metric compatible fallback, no images above the fold, no injected content |

## 9. Accessibility

Target: WCAG 2.2 AA.

- Every muted ink step clears 4.5:1 against the panel fill. Hierarchy is carried
  by size and weight rather than by fading text out of legibility.
- Landmarks: `header`, `nav` with distinct labels, `main`, `footer`. Sections use
  headings in order with no level skipped.
- The palette is a labelled `role="dialog"` with `aria-modal`, an `aria-label`
  on the input, `role="listbox"` and `role="option"` rows, managed focus, and
  Escape to close.
- The decorative field canvas and every glyph used as ornament are
  `aria-hidden`.
- The offline banner is a polite `role="status"` live region.
- All targets on a coarse pointer are at least 44px.
- `prefers-reduced-motion`, `prefers-reduced-transparency`, and
  `prefers-contrast` are all honoured.
- Keyboard reachable end to end, with a visible focus style on every control.

## 10. Technical architecture

```
index.html            semantic markup, no client rendered content
404.html              same system
sw.js                 network first, cache fallback, same origin only
manifest.json         installable, standalone
assets/css/
  tokens.css          the entire system: colour, type, space, form, motion
  base.css            reset, typography, page frame, field, rail, links
  glass.css           the material, nav, telemetry panel, palette
  sections.css        one block per region, in document order
  states.css          arrival, departure, offline, pointer, preferences, print
assets/js/
  liquid-glass.js     vendored unmodified from deepika-builds/liquid-glass (MIT)
  field.js            the signal field canvas
  instrument.js       reveal, gauge, counters, clock, telemetry, palette
  main.js             lifecycle, glass tier decision, resilience
```

No framework, no build step, no dependencies. Four stylesheets and four scripts,
served static.

**Why the glass is vendored rather than reimplemented:** the technique has one
load bearing detail that is easy to get wrong and hard to debug, namely that SVG
filters default to linearRGB, which remaps the displacement map's neutral gray
and injects a constant phantom offset. The upstream file gets it right and is
kept unmodified so fixes can be dropped in.

## 11. Acceptance criteria

- [x] Renders correctly at 320, 390, 768, 1024, 1440, and 1920 wide.
- [x] No horizontal overflow at any width.
- [x] Nav collapses to the palette below 1000px without clipping.
- [x] Refraction applies on a capable desktop and degrades to frost otherwise.
- [x] The frame rate watchdog downgrades rather than shipping a stuttering page.
- [x] Palette opens by key, shortcut, and click; exactly one row selected; closes
      three ways; bottom sheet capped at 72dvh on a phone, never full screen.
- [x] The name is split into glyphs for the entrance and still reads as
      "Lincoln Stewart" to a screen reader.
- [x] Résumé link verifies, retries, and degrades to an email request.
- [x] Page reveals within 4 seconds even if `main.js` never loads.
- [x] Renders complete with JavaScript disabled.
- [x] Prints as a clean black on white document.
- [x] No emoji, no em dashes, no excluded skills, no unsourced metric.

## 12. Open questions

Carried from the knowledge base. Each needs an answer from Lincoln before the
relevant content changes.

1. **Résumé PDF.** The shipped file is the July 2026 general software engineering
   résumé. It predates several profile corrections. It should be replaced with a
   current general purpose build.
2. **Agency clients.** Named, or kept described by sector? Currently by sector.
3. **Agency start date.** Recorded as an estimate of January 2024.
4. **Packleads figures.** Confirmed accurate on 28 July 2026. They will need a
   refresh before they are a year old.
5. **Domain.** Whether to buy `lincolnstewart.dev` and retire the `github.io`
   URL. Recommended in the business plan.
