# Auto-content engine

Ready-to-deploy marketing content for every channel from `marketing/PLACES.md`
that can be partially automated. The folders below contain finished copy you
can paste into the relevant platform — no LLM calls needed at deploy time.

## Folder map

| Folder | What's in it | How to deploy |
|---|---|---|
| `pinterest/` | 5-7 pin descriptions per fit persona, with title + body + keywords + image path | Manual upload OR Tailwind bulk import |
| `tiktok-dms/` | Outreach DM template per persona, with placeholders for creator name + niche detail | Send via TikTok DM, manual personalization |
| `launches/` | HN Show HN draft + Product Hunt launch draft | Schedule in advance, post manually |
| `newsletters/` | Sponsorship pitch templates per niche | Email newsletter operators directly |
| `threads/` | Cross-post mapping from existing X content | Auto-post via existing X auto-poster + Threads cross-post button |

## What's NOT automated (and why)

- **Discord engagement** — automation = ban. Roger does this manually.
- **YouTube comment outreach** — looks spammy at scale. Manual only.
- **Reddit** — Roger explicitly off the channel.
- **Forum engagement** — must look human and contextual. Manual.

## Channels that ARE programmatic (already wired)

- **X auto-poster** — content factory + scheduler + X API. LIVE.
- **Pinterest API** — possible to wire (Pinterest dev account + OAuth). Not built yet — currently using manual upload.
- **Threads API** — possible (Meta Graph API) but limited rollout. Currently manual cross-post.

## Recommended weekly cadence

| Day | What | Channel |
|---|---|---|
| Mon AM | Bulk-upload 9 Pinterest pins (1 per fit persona) | Pinterest |
| Tue AM | Schedule X auto-poster batch via dashboard | X |
| Wed | Send 5-10 TikTok creator DMs from templates | TikTok |
| Thu | One newsletter outreach email | Email |
| Fri | Publish 1 long-form Threads post (cross-post X content) | Threads |
| Weekend | Real-time engagement in 1-2 niche communities | X / Discord |

If you only do one thing each week: **the Pinterest upload**. Highest organic
intent traffic, lowest effort, your existing OG cards are already pin-shaped.
