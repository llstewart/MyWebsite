# Design system

**Version:** 3.1, 2 August 2026
**Source of truth:** `assets/css/tokens.css`. If a value is not in that file, it
should not exist anywhere else.

---

## 1. The idea

**Quiet, with one thing moving underneath.**

The page is near white paper, generous space, and type doing almost all the
work. Behind it, at an alpha you have to look for, is a landscape drawn as
contour lines with small carriers travelling along them. It is Lincoln's work
drawn as terrain: a pipeline, seen from above.

Restraint is the whole position. Nothing announces availability, nothing counts
anything at you, nothing performs a trick. The one indulgence is real glass
refraction, and it is used as chrome rather than as content, which is the only
way it stays quiet.

**What was removed, and why it matters:** a live telemetry panel reporting the
page's own frame rate, and an "open to software engineering roles" status badge.
Both were capability being performed rather than held. Confidence is not needing
to show the trick.

## 2. Colour

Light, warm, and almost monochrome. Colour is a signal, not a mood.

| Token | Value | Use |
|---|---|---|
| `--c-paper` | `#FBFBF9` | The page. Near white, one degree warm |
| `--c-paper-2` | `#F4F4F1` | Recessed surfaces |
| `--c-ink` | `#101A17` | Headings, primary text. Never pure black |
| `--c-ink-2` | `#3A4642` | Body text |
| `--c-ink-3` | `#58635E` | Labels and metadata |
| `--c-ink-4` | `#6E7973` | The quietest legible step |
| `--c-brand` | `#0E6B52` | Links, active state, results, the turn of a headline |
| `--c-live` | `#B4732A` | Reserved. Currently unused, and that is correct |

Field hues (`--c-field-sage`, `--c-field-sky`, `--c-field-sand`) exist **only**
inside the background canvas so the glass has something to bend. They never
appear in the interface.

**Rules**

1. Green is the only interface accent. If you are reaching for a second one, the
   layout is wrong.
2. Amber is reserved for a genuine live state. There is not one on this page,
   so it does not appear. A colour with no job does not get used for decoration.
3. Every ink step clears 4.5:1 against the glass fill. Hierarchy comes from size
   and weight, not from fading text out of legibility.

## 3. Type

Two families. No third.

| Role | Family | Notes |
|---|---|---|
| Display and body | **Satoshi** (Fontshare) | Geometric grotesk. Deliberately not Inter |
| Data and labels | **IBM Plex Mono** (Google Fonts) | Metadata, numbers, stack lines. Never prose |

Scale, all fluid:

```
--t-name     clamp(2.9rem, 8.6vw, 6.6rem)    the name, once
--t-h1       clamp(1.95rem, 4.4vw, 3.3rem)   section headlines
--t-h2       clamp(1.4rem, 2.5vw, 1.95rem)   role titles
--t-h3       clamp(1.05rem, 1.5vw, 1.25rem)  index entry names
--t-lead     clamp(1rem, 1.3vw, 1.18rem)     claims
--t-body     1rem
--t-small    0.9rem                          most running text
--t-label    0.688rem                        mono, uppercase, 0.15em tracked
```

**Rules**

1. The mono face carries metadata and never a sentence a person reads for
   meaning. Stack lines and result lines are the boundary case, and they are
   deliberately set at normal case with looser tracking so they stay readable.
2. Extreme scale contrast is the typographic idea: 6.6rem next to 0.688rem, with
   very little in between.
3. One recurring move: `em` inside a section headline takes the brand colour and
   stays upright. It marks the turn of the sentence. It is the only italic
   element on the page and it is never actually italic.

## 4. Space and form

4pt base, `--s-1` through `--s-11`. Content column `--page-max: 1240px`, gutter
`clamp(1.15rem, 4.5vw, 4rem)`, left rail `4.5rem`.

Radii: `--r-glass: 28px`, `--r-panel: 18px`, `--r-tight: 10px`.

**28px on glass is load-bearing.** `liquid-glass.js` reads `border-radius` to
build the displacement map's neutral inset. Change it and the refraction band
stops matching the corner.

**Pills are used, deliberately.** An earlier version of this
system banned them. Lincoln reversed that on 2 August 2026, and he is right that
the capsule is the correct form here: the nav bar and the landing's section row
are both floating chrome over content, which is exactly what iOS uses a capsule
for. They are not used for metadata, tags, or skills, which stay as plain lines.

## 5. The material

Three tiers, chosen per device by `main.js`.

| Tier | What it is | Where |
|---|---|---|
| `refractive` | Real refraction. SVG displacement map applied through `backdrop-filter` | Nav, contact, palette. Desktop, fast link, enough cores and memory |
| `frosted` | `backdrop-filter: blur(18px) saturate(1.4)` | Phones, tablets, save-data, Safari, Firefox, and anything the frame rate watchdog demotes |
| `opaque` | Solid `#FBFCFA`, no filter | `prefers-reduced-transparency: reduce` |

**`assets/js/liquid-glass.js` is deepika-builds/liquid-glass byte for byte**
(sha256 `dfadcbd3e72646a1...`, 8,695 bytes). Not adapted, not reimplemented.
Upstream fixes drop straight in.

The dressing in `glass.css` is her `demo/index.html` `.glass-card` recipe in the
same order: drop shadow, `inset 0 1px 1px` specular, `inset 0 -8px 20px` lift,
`inset 0 0 0 1px` rim, plus her cursor tracked glare, a 160px radial at
`--gx`/`--gy` written from `pointermove` in `main.js`. The one departure is the
alpha on the tint and the drop shadow: hers assume a dark photograph underneath,
and used unchanged on light paper they read as a grey box.

**The background is a photograph, for a technical reason.** Refraction bends what
is behind it, so it needs high frequency detail to bend. Her demo puts a
photograph back there for precisely this reason. A flat white page is the worst
possible surface for this effect: there is nothing to displace and every glass
element collapses to plain frost.

So the page carries an aerial of the **Bat&eacute;k&eacute; Plateau in the
Democratic Republic of the Congo**, which is where Lincoln is from and which is
already the brand language of his own product. It is used at two strengths:

- **Page wide**, under a `rgba(251,251,249,0.88)` paper wash. At that strength it
  reads as texture rather than as a photograph, the detail survives for the
  displacement map, and black type still clears contrast.
- **The approach section**, at full strength, full bleed, with the glass panel on
  top. This is the one surface on the site where the material does what it was
  designed for, and it is placed where the Congo is the subject rather than the
  decoration. The texture the reader has been half seeing for the whole page
  resolves into the actual place.

The panel there sits at 0.86 to 0.80 white rather than the 0.34 used elsewhere.
A photograph under body copy needs more white behind the type than paper does:
measured worst case is 7.89:1 against the brightest pixel in the image.

Lightening the file itself was rejected. It would have thrown away the very
detail the effect needs.

**Only three surfaces ever get a displacement map.** The landing has no panel
at all: it is type on paper, and the glass appears first as the nav bar. Map generation is O(w x h)
and the filtered backdrop is recomposited over a moving field, so long content
panels use the frosted tier by design, not by omission.

## 6. Motion

Two curves, and nothing bounces.

```
--e-out    cubic-bezier(0.16, 1, 0.3, 1)     entrances
--e-inout  cubic-bezier(0.65, 0, 0.35, 1)    interface response
--d-fast   140ms   --d-base 320ms   --d-slow 680ms   --d-enter 980ms
```

There is exactly one orchestrated moment: the arrival.

The name is split into individual glyphs. Each one starts a full line height
below its place, blurred and weightless, and settles into a soft two layer
shadow that reads as type sitting a millimetre above the paper. The stagger is
46ms, which at 6.6rem is slow enough to read as a sequence rather than as a
wave, and the second line overlaps the first rather than queueing behind it.
Ease out only: nothing overshoots, nothing bounces, it happens once. The line is
masked while the glyphs travel and unmasks afterwards so the resting shadow is
not clipped at the baseline.

The eyebrow arrives first, the sentence at 1150ms, the contents table at 1400ms.
Everything after that is scroll reveal: opacity and a 16px lift, nothing else.
The field drifts continuously and the carriers surge with scroll energy, which
decays on its own.

Under `prefers-reduced-motion` the glyph split is skipped entirely rather than
just disabled, every duration collapses to 1ms, the field renders one static
frame, reveals are off, and view transitions are disabled.

## 7. Components

| Component | Notes |
|---|---|
| **Nav** | A floating glass capsule of section links and search. No name, no title. Collapses to the palette below 720px |
| **Pills** | The landing's section row. Real refraction, not a blur: five small surfaces at `scale: -34`, `chroma: 0`, since a prism fringe on a 40px control reads as a rendering fault |
| **Languages** | Seven cards, name over years, on a rule. The heaviest thing in the skills section because it is the first thing matched against |
| **Feature** | One project, given the weight it earns. Two columns: lede with the result rule, and the detail |
| **Index** | Five projects, one scannable line each, opening in place. Name, claim, and the metric that matters, in three columns |
| **Role** | Date column, then title, org, a results line, and tick-marked points |
| **Palette** | Centered dialog on desktop, bottom sheet capped at 72dvh on a phone. Never full screen |
| **Toast** | Ink on paper, one line, for actions with no visible result |

## 8. Voice

- Plain verbs, sentence case, no filler.
- Say what happened, then what it cost or saved. Problem, build, result.
- Every number carries where it came from.
- Name the boundary. "If a tool you need is not on this list, I have not shipped
  with it" is worth more than another line of stack.
- **No em dashes.** Periods, commas, or a middot separator.
- **No emoji.** Anywhere.
- No adjectives about Lincoln. A fact lands harder.

## 9. What this system will not do

- A second accent colour.
- A pill, a chip, or a tag cloud.
- A third typeface.
- Motion that does not serve reading.
- A number without a source.
- A skill he has not shipped with.
- Anything that announces what the page can do instead of doing it.
