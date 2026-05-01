# Threads cross-posting

Threads (Meta) is X-compatible for almost all post formats. The shortest path
to multi-platform reach is to repost your X content to Threads.

## Cross-post workflow

### Manual (free)

1. After the X auto-poster fires (you'll see it in the dashboard's "Posted" tab), copy
   the body text
2. Open Threads (web or mobile)
3. Paste the body
4. Attach the same OG image used on X (`/public/og/<persona>.png`)
5. Post

### Buffer ($6/mo)

1. Connect Buffer to your X account AND your Threads account
2. When auto-poster posts to X, Buffer detects the post
3. Configure Buffer to auto-cross-post X content to Threads with a 30-min delay
4. Result: every X post auto-mirrors to Threads

### Threads API (free if you set it up)

The Meta Graph API has Threads endpoints. Adding native cross-posting to the
backend would be a 1-day project — pattern is identical to the X auto-poster:

- POST /api/threads/post-now (mirror of X post-now)
- Threads scheduler that runs alongside X scheduler
- Frontend "Cross-post to Threads" toggle on Pending tab

Not built yet. If you want it, say the word.

## Threads-specific tweaks

- Threads tolerates longer posts (500 char limit vs X's 280)
- Threads users tolerate hashtags more than X users do
- Threads has "topic tagging" (#Topic) which actually surfaces your post to interest categories — use 1-2 per post

## What works on Threads but NOT X

- Long-form posts that are too long for a tweet but too short for a thread
- Image-heavy posts (Threads handles 4 images well)
- Casual, conversational tone (Threads users are less spam-conscious than X)

## What works on X but NOT Threads

- Quote-tweet hooks (Threads doesn't really have quote-tweets the same way)
- Link-baited single tweets (Threads de-prioritizes external links more aggressively)

## Mapping the existing content factory archetypes

| Archetype | X-friendly | Threads-friendly | Notes |
|---|---|---|---|
| founder_confession | ✓ | ✓ | Both platforms love this |
| contrarian_take | ✓ | ✓ | Threads slightly better (more discussion) |
| emotional_hook | ✓ | ✓✓ | Threads is BETTER for this — less cynical audience |
| persona_switch_moment | ✓ | ✓ | Use longer-form on Threads |
| niche_specific | ✓✓ | ✓ | X is where the niches live |
| technical_flex | ✓✓ | ✓ | Builder-Twitter is on X |
| problem_agitation | ✓ | ✓ | Both work |
| reply_bait | ✓✓ | ✓ | X is built for replies |

Bottom line: cross-post 80% of X content to Threads. Skip "reply_bait" archetype
on Threads (it's optimized for X discourse).
