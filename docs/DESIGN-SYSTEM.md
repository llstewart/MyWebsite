# Design system

**Version:** 3.2, 2 August 2026
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
| `--c-brand` | `#101A17` | Links, active state, results. Ink, not a hue |
| `--c-live` | `#3A4642` | Reserved for a genuine live state. There is not one |

There is no accent colour. A teal sat in this slot for a while and the question
that killed it was the right one: what is it for? It marked links, active nav,
and result numbers, all of which were already the strongest thing in their line
by size and weight. It was decoration claiming to be a system, and on a page
whose whole argument is restraint it was the one thing performing.

Field hues (`--c-field-sage`, `--c-field-sky`, `--c-field-sand`) exist **only**
inside the background canvas, and never appear in the interface. Their job is to
give the glass something to bend: a lens over a flat colour returns that same
flat colour, so without them the refraction has nothing to show.

**Rules**

1. There is no accent. If you are reaching for one, the layout is wrong.
2. A colour with no job does not get used for decoration.
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

- **Page wide**, under a `rgba(251,251,249,0.66)` paper wash. Measured, not
  guessed: against the brightest pixel in the aerial that leaves `--c-ink` at
  14.1:1, `--c-ink-2` at 7.8:1, and `--c-ink-3`, the quietest step on the page,
  at 5.0:1. It started at 0.88, which washed the place out for no benefit.
  Body copy does not sit on the photograph directly: it sits on a **sheet**, a
  glass panel at 0.78 to 0.70 white, which is how iOS handles content over a
  wallpaper. The material carries the legibility so the image does not have to
  be destroyed to provide it.
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

### The field

`assets/js/field.js`. A flow field: thousands of single pixel particles drifting
along an invisible current, leaving short trails.

**It was a fragment shader first, and that was the wrong architecture.** The
shader followed `p5aholic.me` closely: domain warped noise, thresholded per pixel
into stipple. It was replaced because measuring found a fault no tuning could
reach. It ran the noise at a base span of 0.20 across the viewport, copied from
the reference, and at that scale less than a fifth of one noise cell covers the
screen. There is almost no spatial variation at any instant; what looks like a
pattern is really one value, and as time moves the sample point through noise
space that value wanders. Measured at nine time samples the median ran 0.24,
0.22, 0.21, 0.21, 0.64, 0.90, 0.23, 0.72, 0.20. Any fixed threshold against that
is dense at some moments and completely empty at others, which is what kept
happening, including at the moment somebody first arrives. Several passes of
"lower the floor" were fitting constants to a moving target.

A flow field cannot fail that way. The number of particles **is** the coverage,
so empty is not a state it can reach.

**How it works.** An invisible grid over the viewport, each cell holding an angle
taken from value noise, so neighbouring cells point in similar directions and the
grid reads as a smooth curving current. Particles look up the angle in the cell
they stand in and step that way. The canvas is never cleared: it is painted with
paper at a low alpha, so old positions fade over a dozen frames and each particle
leaves a short trail. **The trails are what read as sweeping waves** rather than
as drifting dust.

**Three periods, none of which divide into each other.** The current rotates on
one, the speed breathes on another, and the clouds that decide where particles
may spawn drift on a third. Nothing lines up into a loop you can catch. Scroll
energy rides on top and decays.

**Density is spawn position, not opacity.** Particles are rejection sampled
against a slow noise field, so they gather into clouds with clear paper between
them rather than covering the page evenly. The acceptance test gives up after six
tries and takes what it has, because a particle still has to go somewhere and a
possibly-unbounded loop has no place in a frame budget.

Two numbers carry most of the character. Trail alpha started at 0.055, which
keeps a mark alive about twenty frames, and twenty frames of travel is a stroke:
the page read as fur. It is 0.17. And each dot draws at 0.34 alpha, because
density has to carry the effect rather than weight; marks strong enough to read
individually make a page you cannot read over.

Colour is `--c-field-grain`, a space grey rather than the ink.
`--c-field-grain-dark` sits beside it for whenever dark mode is built, and is
deliberately not wired to `prefers-color-scheme`, because the site is
`color-scheme: light` with no dark palette and flipping the spray alone would put
white dots on white paper.

Capped like the glass: device pixel ratio at 1.5, thirty frames a second, asleep
when hidden, a static settled frame under `prefers-reduced-motion`, off on a
metered connection. Any exit leaves the CSS gradients underneath untouched.

**A note for tuning it.** Do not judge this from a full page screenshot. Captures
downscale 1920 to 1568, which blends single pixel marks into the paper and makes
a correct render look empty. Zoom in, or read the canvas back and count.

### Depth

`assets/css/depth.css`, and it is the only file that decides height.

Before it existed the page had two hand written shadows, invented independently
for the glass and the card, and everything else was flat. That is why nothing
read as being in front of anything: there was no scale, so there was no
comparison to make.

Six levels, `--e-1` to `--e-6`, and each is the same shadow at a different
distance rather than a different effect. Three parts each:

| Part | Job |
|---|---|
| contact | Tight and nearly opaque, directly under the edge. This is what says an object is *touching* a surface. A lone large blur without it reads as a glow, not a shadow |
| key | Offset downward, carrying the direction of the light |
| ambient | Wide, faint, negatively spread so it only escapes at the sides. It grows fastest with height, which is what separates near from far |

Opacity falls as blur grows. A shadow that keeps its density while spreading
reads as dirt on the page rather than as distance from it. The hue is the ink,
never black: a neutral black shadow on warm paper goes visibly grey and flattens
the warmth out of everything beneath it.

The order, from the page outward: the field, then type directly on paper with no
surface at all, then resting surfaces (index rows, language cards, roles,
disclosures), then raised ones (the feature, contact, the approach panel), then
chrome, then modal.

Two rules keep it honest.

**Nothing skips a level on hover.** A surface resting at `--e-2` goes to `--e-3`
under the pointer, never to `--e-5`. A hover that jumps three levels reads as the
element leaping at you rather than rising to meet you.

**Height is earned by importance, not by decoration.** The feature project sits
above the index because it matters more. The index rows sit above the paper
because you can open them. Nothing is raised merely to look raised, and the index
rows are flat at rest because eleven raised rows is a stack of cards, not an
index.

There is also recession, and it is the reason the raised things read as raised.
The proof column is set *into* the page with an inset shadow, and disclosure
bodies carry one at their top edge so content emerges from beneath its own
heading rather than appearing beside it. Without something below the surface
there is only one plane with a pile of shadows on it.

Pressing goes down. An element drops to the level below its resting one and the
contact shadow tightens, so it reads as being pushed toward the page. A press
that keeps its shadow is a colour change pretending to be a button.

Shadows are stripped entirely for print, where they come out as grey mud on
paper that has no backlight. `prefers-reduced-motion` kills the transitions but
keeps the elevation, because depth is information about what is in front of
what, and that is not an animation.

## 6. Motion

Two curves, and nothing bounces.

```
--e-out    cubic-bezier(0.16, 1, 0.3, 1)     entrances
--e-inout  cubic-bezier(0.65, 0, 0.35, 1)    interface response
--d-fast   140ms   --d-base 320ms   --d-slow 680ms   --d-enter 980ms
```

**Disclosures open and close.** A `<details>` has no transition of its own: it
shows and hides in a single frame, and it drops `[open]` the instant you click,
which is why a naive CSS transition animates open and snaps shut. Two things fix
it. The height comes from a one row grid going `0fr` to `1fr`, which is the only
technique that animates to a height nobody measured and works without a
`max-height` guess that truncates. The close is held open by script:
`instrument.js` intercepts the click, marks the element `.is-closing` so the
rules run in reverse, and removes `[open]` when the transition finishes.

The curve is `--e-sheet: cubic-bezier(0.32, 0.72, 0, 1)`, which is the shape
Apple uses for sheets: most of the distance early, then a settle, no overshoot.
Opening takes 460ms, closing 340ms, because a close that matches its open reads
as slow.

There is one other orchestrated moment: the arrival.

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

**Content leaves as well as arrives.** Reveal used to be one way: an element
faded in on first intersection and the observer stopped watching it, so the page
was a single long sheet sliding past. Anything scrolled past stayed at full
weight, which is why the section you were reading never felt like the current
one.

The reference for the other behaviour was `p5aholic.me`, where sections appear
to come and go rather than scroll. Measuring it showed that site takes the
scroll away from the browser entirely: `document.scrollHeight` equals
`window.innerHeight` and a wrapper is moved with a transform. That was rejected.
It costs find on page, PageDown and the spacebar, screen reader navigation,
anchor links, scroll restoration, and phone momentum, and none of that is worth
paying for a transition.

The part worth having is not the hijacking. It is that content has an exit as
well as an entrance, which is one extra class. `.is-past` takes an element to
0.2 opacity and lifts it 16px, and it is only applied to things that have gone
up, never to things below the fold that have not been read yet.

Two details it would be easy to get wrong. It fades to 0.2 rather than to 0,
because anything fully transparent is gone for someone searching the page or
tabbing through it. And an element is marked revealed at the same time it is
marked past: an anchor link, a `#hash` on load, or a restored scroll position
jumps over content that then never intersects, and marking it past alone would
leave it at the entrance state, invisible for good.

The field drifts continuously and the carriers surge with scroll energy, which
decays on its own.

Under `prefers-reduced-motion` the glyph split is skipped entirely rather than
just disabled, every duration collapses to 1ms, the field renders one static
frame, reveals are off, and view transitions are disabled.

## 7. Components

| Component | Notes |
|---|---|
| **Nav** | A floating glass capsule of section links and search. No name, no title. Collapses to the palette below 720px |
| **Sheet** | A glass panel carrying a whole section's body copy over the photograph. Skills, the projects index, and experience each sit on one |
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
