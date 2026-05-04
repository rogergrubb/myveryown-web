# Buffer setup — X → Threads auto cross-post

5-minute setup. $6/mo. Skips the Meta developer account, Threads API
rollout limitations, token refresh management, and Chrome extension
permission gymnastics.

## What you'll get

Every tweet from your @rogergrubb1 X auto-poster automatically mirrors
to Threads. You can configure a delay (e.g., post to X at 9 AM,
Threads at 9:30 AM) so the platforms don't look like obvious bot output.

## Setup steps

### Step 1 — Sign up for Buffer

1. Go to https://buffer.com/
2. Click **Get started** (free tier exists, but you'll need the **Essentials** plan at $6/mo for cross-posting features)
3. Sign in with Google → use rogergrubbrealestate@gmail.com
4. Skip the onboarding tour

### Step 2 — Connect X

1. In Buffer's sidebar, click **Channels**
2. Click **Connect a channel** → **X (Twitter)**
3. Click **Authorize Buffer** in the X popup
4. Authorize as **@rogergrubb1**

### Step 3 — Connect Threads

1. Same Channels page → **Connect a channel** → **Threads**
2. Authorize via your Instagram-linked Threads account
3. Buffer pulls in your Threads handle automatically

### Step 4 — Set up the auto cross-post rule

Buffer doesn't have a "watch X, mirror to Threads" rule directly, but
the workflow is:

**Option A: Manual cross-post per item (free / Essentials)**
1. When the X auto-poster fires (you'll see it in the Posted tab of /dashboard),
   copy the body
2. Paste into Buffer → select Threads channel → Schedule for 30 min from now
3. Buffer publishes to Threads at the scheduled time

This adds 30 seconds of manual effort per post. With 6 auto-scheduled posts/week,
that's 3 minutes of manual work per week. Acceptable.

**Option B: Zapier integration (zapier.com — free tier covers this)**

1. Create a Zap: trigger = "New tweet by @rogergrubb1" / action = "Create Buffer post for Threads"
2. Add a 30-min delay step between trigger and action
3. Map the tweet body to Buffer's text field
4. Activate the Zap

This is fully automated. Zapier free tier allows 100 tasks/month — way more than
your auto-poster will fire (6/week = ~26/month). No paid tier needed.

### Step 5 — Test

1. Manually trigger a post-now from your dashboard's Pending tab (use a low-stakes item)
2. Within 30 min, check threads.net to confirm the cross-post landed
3. If yes, you're done. If no, check Buffer's "Activity" log for errors

## Recommended cadence

- X auto-poster fires at the persona-specific slots already coded (gym 6am, kpop 8pm, etc.)
- Buffer mirrors to Threads with a 30-60 min delay
- Threads users notice less if it's not exactly simultaneous

## What you lose vs native API integration

- Buffer charges $6/mo. Native API would be free.
- Buffer can break if X or Threads change their public API (Buffer has to keep up)
- One more vendor in your stack

## What you gain

- Zero developer-account setup
- Zero token-refresh management
- Zero code maintenance for the Threads side
- Zapier integration option for full automation
- Buffer's analytics dashboard (per-platform engagement)
- Easy to swap in/out other platforms (LinkedIn, Pinterest if their API approves)

## Decision tree

| Volume | Recommendation |
|---|---|
| < 30 posts/month | Buffer Essentials manual mode ($6/mo, 30 sec/post) |
| 30-100 posts/month | Buffer Essentials + Zapier free (fully automated) |
| 100+ posts/month | Native Meta Threads API (worth the setup time) |

You're in the first or second bucket for the foreseeable future, so
Buffer is the right call.

## Future migration path

When you eventually want native Threads API (e.g., for richer features
like image-attached threads or thread-format multi-post):

1. The backend `threads.ts` module is already written
2. Set `THREADS_ACCESS_TOKEN` and `THREADS_USER_ID` on Railway
3. Cancel Buffer
4. The dashboard's per-platform status banner will flip Threads to ✓
5. Zero code work

So the Buffer route is a temporary bridge, not a dead end.
