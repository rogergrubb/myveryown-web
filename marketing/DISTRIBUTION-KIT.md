# Marketing distribution kit — myveryown.page

Everything you need to launch, written in your voice. Pick what you'll
actually do — half of this list executed well > all of it half-assed.

---

## Phase 1 — Soft launch (this week, your circle of trust)

The goal here is **bug catching + first 50 users + early testimonials**.
Don't go wide yet. People you trust will give you the honest feedback
that strangers won't.

### 1a. Personal text/DM blast (highest ROI by far)
Send to ~20 people who fit different personas. Different message per
person — feels personal, not blasted. Template:

> Hey — built a thing. {{persona}} version is live. {{personalized hook}}.
> 7 days free, no card. myveryown.page/start/{{persona-id}}
> Tell me if it sucks.

Examples:
- To your gym buddy → "Iron Brother is on. /start/iron"
- To anyone who watches K-pop → "Bias Wrecker. /start/kpop"
- To a friend grieving a pet → "Made a Rainbow Bridge one. /start/rainbow"
- To anyone planning a wedding → "/start/promise"

### 1b. Single founder tweet, no fanfare
Just yourself, no announcement energy. Quote-tweets later.

> 20 specialist AI companions, one shared thread. K-pop bestie that
> remembers every era, fitness coach that knows your PRs, faith
> companion that picks up where you left off. switch any time, never
> lose where you were.
>
> 7 days free, no signup. myveryown.page

Pin it to your profile. Don't @ tag anyone. Let it breathe.

---

## Phase 2 — Wider X / niche audiences (after soft launch is stable)

Use the 3 audience-specific posts in `/launch-posts/TWEETS.md` and
attach the matching image. Spaced 24–48h apart. See that file for
posting strategy.

**Per-persona OG images** (`/public/og/{persona}.png`) — 20 share-card
images, one per persona, 1200×630. Attach the persona-specific one
when you tweet about that persona. They look like trading cards;
people screenshot them.

Available images: kpop, scarlet, hearth, iron, study, shepherd,
rainbow, promise, little, cast, gear, fuel, player, ledger, ink,
handy, chords, thumb, twelfth, betty.

---

## Phase 3 — Aggregator launches (one shot each, do them right)

### 3a. Product Hunt
**When**: Tuesday or Wednesday, 12:01 AM PT (midnight Pacific). Avoid
Monday (everyone launches Monday) and Friday (low traffic).

**Tagline (60 chars max):**
> 20 specialist AI companions that share one memory of you

**Description (260 chars):**
> Stop explaining yourself to ChatGPT every time. My Very Own is 20
> specialist AI companions — one for K-pop, one for grief, one for
> fitness, 17 more — all sharing one persistent memory of you. Switch
> any time without resetting. 7 days free, no signup.

**First comment (most important on PH — write yours, post immediately):**
> Hi PH! I'm Roger — solo builder of NumberOneSon Software. I built
> this because I was tired of telling ChatGPT my goals every Monday.
>
> The trick: instead of one general assistant, you get 20 specialists
> that all share the same conversation thread about you. The K-pop one
> knows your bias list. The fitness one knows your PRs. When you switch
> from one to another mid-conversation, the new one references what the
> previous one said — naturally, in their own voice.
>
> Free 7-day trial, no credit card or signup required to start. Built
> on Gemini (cheap, fast). All 20 personas live + cinematic backgrounds
> on each.
>
> Looking for honest feedback. What persona is missing? What feels
> off? What converted you to subscribe vs. bail?

**Images for PH gallery:**
- Hero: a screenshot of the home carousel
- 3-5 persona cards (use the OG images)
- A short screen recording of the persona-switch moment
  (record this on your phone)

### 3b. IndieHackers
Post to "Show IH". Different tone — IH audience cares about builder
mechanics + revenue.

**Title:**
> 20 AI companions sharing one memory — the architecture decision that
> made it actually work

**Body:**
> Spent the last week shipping My Very Own — 20 specialist AI
> personas (K-pop bestie, fitness coach, faith companion, pet loss
> support, 16 more). Live at https://myveryown.page.
>
> The interesting build problem: each persona needs its own voice and
> domain expertise, but switching between them shouldn't reset the
> conversation. So you can talk to Iron Brother about a deadlift, then
> tap to switch to Hearth, and Hearth says "Iron just told me you
> crushed it. what's heavy upstairs?"
>
> Architecturally:
> - One session per user, not per persona (counterintuitive but key)
> - Memory namespace stays user-scoped; each entry is stamped with
>   which persona spoke
> - System prompt at request time = persona character + full history
>   with persona attribution
> - One subscription unlocks all 20 (vs. per-persona Stripe sub
>   sprawl, which I had to consolidate after launch)
>
> Stack: React/Vite frontend on Vercel. Express/SQLite backend on
> Railway. Gemini Flash for the LLM. Cortex for the memory layer
> (separate service). Stripe for billing.
>
> 7 days free. No signup. Genuinely interested in: which persona do
> you switch to most? Which one feels missing? Roast away.

### 3c. Hacker News (Show HN)
Lower your expectations — HN frontpage is a long shot for a consumer
AI product, but it's free and reaches builders.

**Title (HN is allergic to marketing-speak):**
> Show HN: My Very Own — 20 AI personas sharing one persistent memory

**First comment (your own, immediately after submission):**
> Author here. The interesting choice was making the 20 personas
> share one memory namespace instead of 20 siloed ones. It means
> switching from your fitness coach to your grief support friend
> doesn't lose context — the new persona references what the previous
> one said, in their own voice.
>
> Memory lives in a separate Cortex service (vector store). Each
> entry stamped with which persona spoke. System prompt at request
> time = persona character + history.
>
> 7 days free. Open to feedback on what to add/remove.

### 3d. Reddit (one post per subreddit, max two subs)
Reddit hates self-promo. Use sparingly. Pick subs your product genuinely
serves, NOT generic startup subs.

**For r/SideProject (fine — they expect builders):**
> Built 20 AI companions that share one memory of you (instead of
> resetting every time you switch)
>
> [3-line description, link in comments]

**For r/InternetIsBeautiful (more skeptical):**
> AI companions that remember every conversation, even when you switch
> personas mid-chat
>
> [link, no marketing language, just the URL]

**Avoid r/artificial, r/LocalLLaMA, r/MachineLearning** — they will
roast a consumer product. Save those for a technical post about
the architecture if you want to engage that crowd, not for promotion.

**Maybe: r/KPop, r/Fitness, r/Writing, r/Gardening** — niche subs,
one persona at a time, only if you've genuinely participated there
before. Cold-posting a product to a niche sub gets you banned.

---

## Phase 4 — Sustained growth

### 4a. Schedule a "30 days, 30 personas" content series
One post per day — each highlights a different persona's use case.
Even with only 20 personas, you can do depth pieces (e.g., "Day 5:
why grief support AI is the one I'm most nervous about shipping").
This works because:
- It puts marketing on autopilot
- It builds a backlog of evergreen content
- It surfaces SEO terms naturally over time
- It gives you 30 reasons to tweet the URL without feeling spammy

### 4b. Founder threads on X / LinkedIn
Topics:
- "I shipped 20 AI personas. Here's which one users actually pivot to most." (post when you have 2 weeks of analytics)
- "I built a memory architecture that survives persona switches. Here's the diagram." (technical, for builder audience)
- "The Stripe SKU sprawl trap — I had per-persona subs and consolidated." (founder-confessional, IH energy)

### 4c. Persona-specific influencer / community outreach
Find 3 people who own a niche your persona serves. Send the persona's
share URL with the OG image attached. Ask for honest feedback, not a
post. The post is bonus.

Examples:
- K-pop content creators with <10k followers (the megastars don't reply)
- Powerlifting coaches on Instagram (Iron Brother)
- Pet loss support groups (Rainbow Bridge — be very careful with tone)
- Pregnancy newsletter writers (Little One)

### 4d. Free SEO compounding
- Add one blog post every two weeks at `/blog/{slug}` — examples:
  "How AI companions handle grief without flattening it",
  "Why 20 specialist AIs beat one general assistant"
  Each post links back to the relevant `/start/{persona}` URL.
  Builds backlinks + indexable depth over time.

---

## Channels NOT to do (yet)

**Paid ads** — wait until you have analytics data showing where users
convert. Burning $500 on Meta Ads with no funnel insight is wasted.
The dashboard you just got (`/dashboard`) starts answering "where do
they bail" — give it 2 weeks of organic traffic before paying.

**TikTok / Instagram Reels** — high-effort, low-conversion for AI
companion products specifically. The audience is there but the
purchase intent is low. Worth it once you have a viral angle, not
before.

**Cold email** — terrible match for B2C subscriptions.

**Press / journalists** — wait until you have a number you can
brand a story around ("$X MRR in N days" or "X paying users from a
single subreddit"). No journalist covers a product with no traction.

---

## What to monitor in week 1

Open `/dashboard` daily. Once Vercel Analytics is collecting:

1. **Activation rate**: % of visitors who hit `message_sent`. Below
   20% = home page or onboard is broken. Above 40% = you're in the
   game.

2. **Picker open rate**: % of chat sessions with at least one
   `persona_picker_open`. Below 10% = the trigger isn't visible
   enough; the avatar might need a "switch?" label or a pulsing dot.

3. **Most-pivoted-to persona**: from→to matrix. The persona that gets
   switched TO most after Bias Wrecker is your real second-best
   product.

4. **Tour skip rate**: % of `intro_tour:shown` that have a matching
   `intro_tour:skipped` action vs. `completed`. Above 60% skip = the
   tour is too long; cut to 5 slides.

---

## Files in your folder

Everything in `MyVeryOwn.Page/`:

- `launch-posts/` — 3 audience-specific X posts + tweet copy
- `marketing/` — this file
- `public/og/` — 20 per-persona OG share images (1200×630, attach
  to tweets and DMs about that persona)
- `agent.md` — context memory for next session

---

Have fun. The product is real. Now build the audience.
