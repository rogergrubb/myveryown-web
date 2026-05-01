# Hacker News — "Show HN" launch draft

## Title
Show HN: My Very Own – AI companions with private per-persona memory

## Best post window
Tuesday or Wednesday, 8:00-8:30 AM US Eastern. HN momentum is highest in the
first 90 minutes; getting upvotes early determines whether you make front page.
Avoid Mondays (admin clears spam, posts get buried) and weekends (lower traffic).

## Top comment (post yourself within 5 min of submitting)

> Hey HN — Roger here, builder of My Very Own. Quick context on what's actually going on under the hood:
>
> - 20 specialist AI personas (Iron Brother for fitness, The Ledger for budgets, The Promise for wedding planning, Bias Wrecker for K-pop fans, etc.) running on Gemini 2.5 Flash with persona-specific system prompts.
>
> - Each persona keeps its own private memory namespace (Cortex). Iron Brother knows your training history; Scarlet (late-night) knows your late-night thoughts; the two don't share. There's an opt-in "shared mind" toggle if you want them comparing notes.
>
> - Streaming chat via SSE. Per-persona OG meta on every /start/<persona> route. 7-day free trial, 10 messages, 3 image generations per day before the paywall hits.
>
> - Image generation via gemini-2.5-flash-image with per-persona style hints baked into the prompt (Iron's images go gritty/gym-aesthetic; Bias goes pastel-kpop-magazine). No image-to-image yet — that's the next iteration.
>
> Things I deliberately did NOT do:
>
> - Hearth (emotional support), Rainbow Bridge (pet loss), and Little One (pregnancy) personas exist but I won't market them directly. Those go through licensed-counselor / vet-hospice / doula partnerships, not search ads. Some products shouldn't grow via ad spend.
>
> - No fabricated user testimonials. The marketing copy is generated, but it's never "User X said..." with a fake quote.
>
> - No free credits for the auto-poster (the X marketing automation runs only on actual generated content; no botted engagement).
>
> Happy to talk shop on architecture, the per-persona vs shared-memory toggle, or the rate-limit + cost-cap design that protects against image-generation cost-amplification attacks.

## Anticipated comment threads + your responses

**"How is this different from Character.AI / Replika / etc.?"**
> Different model. Character.AI bets on character roleplay (you're the audience). My Very Own bets on remembering YOU specifically across roles in your life. Replika is one companion that tries to be everything; My Very Own is twenty specialists who each remember their slice. The toggle for "shared mind" is the clearest architectural difference — most companion products force one of those modes on you.

**"Why 20 personas instead of letting users define their own?"**
> Specificity beats infinite flexibility for non-power users. A K-pop fan doesn't want to write a system prompt — she wants Bias Wrecker. Power-user features come later if there's signal that the curated set is too constraining.

**"Privacy concerns?"**
> Each persona's memory lives in its own Cortex namespace, opt-in cross-talk only. Sessions are anonymous for 7 days; auth is via magic link or Google OAuth. SQLite on a Railway Volume for sessions, Cortex for long-term memory. No third-party analytics that can read message content. Privacy policy at /privacy.html.

**"Pricing?"**
> Free 7 days, 10 messages, 3 images/day. Paid: $9.99/month or $71.88/year. One subscription unlocks all 20 personas. Annual is the better deal — 40% off effective monthly.

**"Architecture?"**
> Backend: Express + better-sqlite3 + Gemini Flash + Stripe + nodemailer + jose for auth. Frontend: React 18 + Vite + TypeScript SPA, lazy-loaded routes, persona-specific OG meta generated at build time. Hosting: Vercel for frontend, Railway for backend. Cortex (memory) on a separate Railway service.

## What NOT to say in comments

- Don't claim user numbers you don't have
- Don't compare quality of responses to specific competitors by name
- Don't promise features you haven't shipped
- Don't argue with people calling AI companionship dystopian — listen, acknowledge

## URL to post
https://myveryown.page

## Cross-post

Once HN traction is established (after ~2 hours), reshare the Show HN URL on:
- Twitter/X with auto-poster + manual repost
- Threads
- LinkedIn (Roger's personal account)
- Indie Hackers (#showcase channel)
