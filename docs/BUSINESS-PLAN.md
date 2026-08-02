# Business plan: llstewart.github.io

**Owner:** Lincoln Stewart
**Version:** 2.1, 2 August 2026
**Status:** Live

---

## 1. What this is

A personal engineering portfolio, treated as a product with one commercial job:
convert a recruiter or hiring engineer who has thirty seconds into an interview
loop at a company Lincoln actually wants.

It is not a blog, a design experiment, or a résumé in HTML. Those all exist and
none of them close. This is a sales asset with a single conversion event, and
every decision below is measured against it.

## 2. The objective

**Land a software engineering role at a product led or mission led company at
the tier Lincoln is targeting: Anduril, Stripe, Ramp, Veeam, and companies like
them, plus the strongest of the DC and Baltimore corridor.**

Supporting objectives, in priority order:

1. Survive the twenty second recruiter scan with the right role filed in their
   head: backend, full stack, platform, or real time data.
2. Give a hiring engineer enough architectural detail in five minutes to say
   "this person has actually built something," without a call.
3. Prove front end craft by existing, so the claim does not have to be made.
4. Make the résumé and the contact route impossible to miss or misplace.

## 3. Who this is for

| Audience | Time on page | What they need | What kills it |
|---|---|---|---|
| **Recruiter or sourcer** | 20 to 40 seconds | Role fit, years, location, authorization, résumé file | Having to hunt for a PDF, an unreadable dark page, no clear title |
| **Hiring engineer or manager** | 3 to 8 minutes | Architecture, tradeoffs, ownership, evidence a number is real | Buzzword lists, unattributed metrics, a project with no problem statement |
| **Founder or early stage hiring lead** | 2 to 5 minutes | Can he ship a product alone, does he find real problems | Only employer work, no product he owned end to end |
| **Design engineering interviewer** | 1 to 3 minutes | Taste, restraint, motion judgment, does the page itself hold up | Templated layout, default fonts, decoration with no idea behind it |

Every one of these people is arriving from the same three places: a LinkedIn
profile, a résumé header link, or a GitHub profile. Nobody discovers this site
by searching. That is a distribution fact and it shapes section 7.

## 4. Positioning

**Lincoln builds the systems people depend on while their shift is running.**

The differentiator is not the stack, which every candidate at this level shares.
It is the combination of three things almost nobody at four years has together:

1. **Production software with real operational consequences.** Plant operators
   and maintenance technicians use his dashboards mid shift, under time pressure,
   with a line waiting. He has led an incident where telemetry went silent and
   the failure surfaced somewhere else entirely.
2. **A product he built, launched, and sold by himself.** Packleads is not a side
   project with a landing page. It has a scoring engine, an LLM query planner,
   billing, and measured usage.
3. **Founder market fit with a story behind it.** He was the web designer
   scrolling maps for leads before he built the tool for that job. He interviewed
   restaurant floor staff before pitching the manager. He finds problems by being
   in them.

The honest weaknesses, stated so the strategy accounts for them rather than
hoping nobody notices: four years of experience against roles that often want
five to eight, no Kubernetes in production, no security or IAM ownership, and a
manufacturing domain that reads as unfamiliar to a fintech reviewer.

## 5. Competitive landscape

The comparison set is other engineering portfolios in the same applicant pool.
They cluster into four types, and each has a failure mode this site avoids:

| Type | What it does | Why it loses |
|---|---|---|
| **Template deploy** (Next.js starter, Linear-alike) | Clean, fast, forgettable | Signals nothing about the person, and the reviewer has seen it nine times today |
| **Terminal or matrix theme** | Green on black, boot sequence, typewriter | Reads as a hobbyist costume. This site used to be one of these |
| **Motion showcase** | Heavy scroll animation, WebGL, slow | Impresses other developers, annoys recruiters, fails on a phone |
| **Notion or Read.cv page** | Honest, fast, zero craft signal | Fine for a backend role, no evidence for anything front end or design adjacent |

**The gap this site occupies:** technically impressive enough that an engineer
respects it, restrained and fast enough that a recruiter can use it, and specific
enough to Lincoln that it could not be anyone else's page.

## 6. The product strategy

### 6.1 The thesis

**Quiet, with one thing moving underneath.**

Near white paper, generous space, and type doing almost all the work. Behind it,
at an alpha you have to look for, a landscape drawn as contour lines with small
carriers travelling along them: Lincoln's work drawn as terrain.

The restraint is the position. In a field where every second portfolio is a dark
terminal theme or a scroll-jacked motion reel, the differentiated move is the one
that does not ask for attention. Nothing on the page announces availability,
counts anything at the reader, or performs a trick. The single indulgence is real
glass refraction, used as chrome rather than as content, which is the only way it
stays quiet.

Two features were built and then deliberately removed: a live panel reporting the
page's own frame rate, and an "open to software engineering roles" badge. Both
were capability being performed rather than held. That instinct, cutting the
clever thing because it was louder than it was useful, is the same judgment the
work sections are trying to demonstrate.

### 6.2 What earns its place

- **Skills before anything else.** This is a resume companion, not a shop
  window. Nothing on the page offers a service, quotes a scope, or asks for
  work. The first section after the landing is seven languages with the years
  behind each one, because that is the comparison a recruiter is actually
  running.
- **Problem, build, result on every project.** Not a feature list. The order is the
  order a hiring engineer thinks in.
- **Every number carries its source.** "800ms, Oshkosh, REST and SQL rebuild."
  A metric a reviewer cannot attribute is a metric they discount.
- **One incident, told properly.** The AGV telemetry failure is the single most
  senior thing on the page and it gets its own disclosure inside the role.
- **A stated boundary.** "If a tool you need is not on this list, I have not
  shipped with it, and I will tell you that in the first conversation rather than
  the third." Candidates who volunteer their edges are rare and get believed
  about everything else.
- **The résumé is one control away** from anywhere on the page, and the site
  verifies the file actually exists before handing over the link.

### 6.3 What was deliberately left out

- Any mention of the résumé pipeline Lincoln built. It is genuinely impressive
  and it reads as applicant tracking system gaming to the exact people this page
  targets.
- Skills he has not shipped with, however much a job posting asks for them.
- A blog. An empty or stale blog is worse than none.
- Testimonials. Nobody believes them on a personal site.
- Client names for the independent work, which stays described by sector. That
  work is presented as engineering evidence, front end and design system depth,
  rather than as a practice taking clients.

## 7. Distribution

Traffic is entirely referral, so the plan is placement, not acquisition.

| Channel | Action | Priority |
|---|---|---|
| LinkedIn profile | URL in the featured section and the contact block | Ship immediately |
| Résumé header | Already present as `llstewart.github.io/MyWebsite` | Live |
| GitHub profile | Set as the profile website, plus a profile README link | Ship immediately |
| Application forms | Paste into the portfolio field on every application | Per application |
| Email signature | One line, name and URL | Ship immediately |
| Search | `sitemap.xml`, `robots.txt`, and Person structured data are in place | Passive, low value |

**Recommended upgrade:** buy a real domain, for example `lincolnstewart.dev`, and
point it at the same GitHub Pages deploy. A `github.io` URL in a résumé header
quietly signals student project. This costs about fifteen dollars a year and is
the highest return change available. The site is already built for it: every path
is relative, so only the canonical tag, the sitemap, and the JSON-LD `url` need
updating.

## 8. Success measures

There is no analytics on this site, on purpose: it is one page, the sample size
would be too small to act on, and adding a third party tracker to a page that
brags about having no dependencies is a bad trade. Measurement is therefore
outcome based, tracked by Lincoln by hand.

| Measure | Target | How it is read |
|---|---|---|
| Recruiter reply rate on applications carrying the link | Better than applications without it | Compare two batches of ten |
| "I looked at your site" mentioned unprompted in a screen | At least one in four screens | Note it after every call |
| Résumé downloads leading to a scheduled call | Directional only | Follow up thread |
| Lighthouse performance and accessibility | 95 or above on both, mobile profile | Re-run after any change |
| Time to first contentful paint on a mid tier phone | Under 1.5 seconds | Reported live in the telemetry panel |
| Interview loops at target tier companies | 3 in the next two quarters | The actual objective |

## 9. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Dark, effect heavy page reads as style over substance | Medium | High | Content is dense and specific, motion is restrained, print stylesheet produces a clean document |
| Refraction stutters on a weak device | Medium | Medium | Three tiers, chosen per device and re-checked live against measured frame rate |
| The résumé PDF goes stale or missing | High over time | High | The page verifies the file at load, retries, and falls back to an email request rather than a dead link |
| Two external font hosts are a hard dependency | Low | Medium | Both are `font-display: swap` with real fallback stacks, and the arrival sequence has a hard timeout so type never blocks content |
| A recruiter's tooling cannot read the page | Low | High | Semantic HTML, works with JavaScript disabled, no client rendered content |
| Content drifts from the résumé | High over time | High | Both are generated from the same knowledge base, and a mismatch between them is the single fastest way to lose credibility |

## 10. Roadmap

**Shipped (v2.0, August 2026)**
Full rebuild from a terminal themed page. Light design system on near white
paper, a drawn contour field, real liquid glass refraction on three surfaces, a
landing hub, one featured system plus an index of five, sourced metrics attached
to the sections that earn them, a per glyph arrival sequence, a command palette,
offline support, a print stylesheet, and structured data.

**Next (30 days)**
Custom domain. Open Graph share image, since the link currently previews as text
in Slack and LinkedIn. A screenshot or short capture inside the Packleads and
Sellorie entries, which is the largest single content gap.

**Later (90 days)**
Per role variants of the hero claim for backend, platform, and product angles.
A short written breakdown of the AGV incident as a standalone page, which is the
strongest interview artifact available and is currently compressed into one
paragraph.

**Maintenance**
Refresh the résumé PDF whenever the master profile changes. Re-check the numbers
against the knowledge base every quarter. Retire any metric that stops being
defensible.

## 11. Cost

| Item | Cost |
|---|---|
| Hosting (GitHub Pages) | 0 |
| Build tooling, dependencies, frameworks | 0 |
| Fonts (Fontshare, Google Fonts) | 0 |
| Domain, if taken | about 15 per year |
| **Total** | **about 15 per year** |

The entire operating cost of this asset is one domain registration. Every other
decision was made to keep it that way, which is also the reason there is no build
step: a portfolio that needs a toolchain to change is a portfolio that stops
getting changed.
