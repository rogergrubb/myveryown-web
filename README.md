# My Very Own — Web Frontend

React + Vite + TypeScript. The full app:
- Homepage with 20-persona rotating rail
- Onboarding (name entry)
- Themed chat interface with real-time streaming
- Magic link + Google OAuth auth
- Stripe-powered paywall

## Run locally

```bash
cp .env.example .env
# edit VITE_API_URL to point at your backend

npm install
npm run dev
```

Open http://localhost:5173

## Deploy to Vercel

1. Push this repo to GitHub
2. In Vercel: import repo, it auto-detects Vite
3. Set env var: `VITE_API_URL=https://api.myveryown.page`
4. Point custom domain `myveryown.page` to the Vercel deployment

## Architecture

```
src/
├── App.tsx           # Router
├── main.tsx          # Entry
├── styles.css        # Global + theme CSS vars
├── lib/
│   ├── api.ts        # Backend API client (fetch + SSE streaming)
│   └── session.ts    # localStorage session management
└── pages/
    ├── Home.tsx      # 20-persona slideshow
    ├── Onboard.tsx   # Name entry for chosen persona
    ├── Chat.tsx      # Streaming chat UI + paywall
    ├── AuthMagic.tsx # Magic link email + Google OAuth
    └── Account.tsx   # Signed-in view
```

## The funnel

1. Land on `/` → see 20 personas cycling
2. Click CTA → `/start/:persona` → name entry
3. Enter name → creates anonymous session (48hr free), redirects to `/chat/:persona`
4. Chat with the persona, Cortex stores memory from message 1
5. At ~10 messages or 48hr mark → soft paywall modal
6. Click "Make it permanent" → `/auth/magic` with session ID
7. Email magic link or Google OAuth → account created, session migrates
8. Redirected to Stripe checkout (via `/api/subscribe/checkout`)
9. Successful payment → `/account?subscribed=kpop` → chat unlocked

## Theming

Each persona sets `body[data-persona="..."]` which overrides CSS variables:
- `--accent` (primary color)
- `--accent-2` (secondary)
- `--accent-rgb` (for alpha variants)

All components use these vars, so changing persona = changing theme everywhere.
