# Sherpa Marketing

Multi-tenant social media publishing platform. Connect social accounts and publish content to Facebook, Instagram (and soon LinkedIn, TikTok) — publish now or schedule for later.

## Stack

- **Next.js 15** (App Router, TypeScript, server mode)
- **Tailwind CSS** for styling
- **Prisma + PostgreSQL** for data
- **Redis + BullMQ** for job queue (scheduled & immediate publishing)
- **NextAuth** for authentication (Google OAuth + email magic link)
- **Zod** for validation
- Provider tokens encrypted at rest with AES-256-GCM

## Quick Start (Local Development)

### Prerequisites

- Node.js 18+
- PostgreSQL running locally
- Redis running locally

### Setup

```bash
# Install dependencies
npm install

# Copy env file and fill in values
cp .env.example .env

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database (creates "The Tax Shelter" org + owner user)
npm run seed

# Start dev server
npm run dev

# In a separate terminal, start the worker
npm run worker:dev
```

Visit http://localhost:3000

## NPM Scripts

| Script | Description |
|--------|-------------|
| `dev` | Start Next.js dev server |
| `build` | Build for production |
| `start` | Start production server |
| `worker` | Start BullMQ publish worker |
| `worker:dev` | Start worker with file watching |
| `migrate` | Run Prisma migrations (deploy) |
| `migrate:dev` | Run Prisma migrations (dev) |
| `seed` | Seed database |
| `generate` | Generate Prisma client |

## Deploy to Render

### Option A: Blueprint (recommended)

1. Push this repo to GitHub
2. In Render dashboard, click **New > Blueprint**
3. Connect your repo and select the `render.yaml`
4. Render will create: Web Service, Background Worker, Postgres, Redis
5. **Set these env vars manually** in Render dashboard:
   - `NEXTAUTH_URL` = `https://sherpa-marketing.onrender.com` (your Render URL)
   - `APP_ENCRYPTION_KEY` = generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `META_APP_ID` and `META_APP_SECRET` (from Meta Developer Portal)
   - Google OAuth credentials (optional)
   - Email SMTP credentials (optional)

### Option B: Manual Setup

1. Create a **PostgreSQL** database on Render
2. Create a **Redis** instance on Render
3. Create a **Web Service**:
   - Build: `npm ci && npx prisma generate && npm run build`
   - Start: `npm run migrate && npm start`
4. Create a **Background Worker**:
   - Build: `npm ci && npx prisma generate`
   - Start: `npm run worker`
5. Set environment variables on both services (see `.env.example`)

### Setting NEXTAUTH_URL

**Critical:** Set `NEXTAUTH_URL` to your Render service URL so OAuth callbacks work:

```
NEXTAUTH_URL=https://sherpa-marketing.onrender.com
```

This must match exactly — no trailing slash. Update this if you add a custom domain later.

## Meta (Facebook + Instagram) App Setup

1. Go to [Meta Developer Portal](https://developers.facebook.com/)
2. Create a new app (type: Business)
3. Add **Facebook Login** product
4. Set Valid OAuth Redirect URI to: `https://sherpa-marketing.onrender.com/api/social-accounts/meta/callback`
5. Add required permissions:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `instagram_basic`
   - `instagram_content_publish`
6. Copy App ID and App Secret to environment variables

## Architecture

### Multi-Tenant Model

- `Organization` is the tenant boundary
- Every data record is scoped to `orgId`
- Users belong to organizations via `OrgMember` (MVP: owner role only)

### Publishing Flow

1. User composes a post with caption, media, and platform selection
2. User chooses "Publish Now" or "Schedule"
3. A `PublishJob` is created and enqueued to BullMQ
4. The worker picks up the job and publishes via provider adapters
5. `PublishAttempt` records track success/failure per platform
6. Failed attempts retry up to 3 times with exponential backoff

### Provider Adapters

Each social platform has an adapter implementing:
- `validateConnection()` — check if token is valid
- `publish()` — publish content to the platform

Implemented:
- **MetaAdapter** — Facebook Pages + Instagram Business (via Graph API v21.0)

Stubbed (scaffolding only):
- **LinkedInAdapter**
- **TikTokAdapter**

## Assumptions & Limitations

- **MVP scope**: Only Meta (Facebook + Instagram) publishing is functional
- **Single page per org**: The Meta OAuth flow uses the first Facebook Page found. Multi-page selection can be added later
- **Local file storage**: Media uploads are stored locally in `uploads/`. For production, swap to S3-compatible storage
- **No role-based access**: MVP only has "owner" role. RBAC can be added later
- **Session-based org**: The app uses the user's first org membership. Org switching UI exists but doesn't persist a "current org" preference — it uses the first membership found
- **Timezone handling**: Schedule timezone is stored but the datetime is always converted to UTC for the queue. Display is in the user's browser timezone
- **No content preview**: Posts are published as-is; no platform-specific preview rendering
- **Meta token expiry**: Long-lived user tokens last ~60 days. Page tokens obtained via the user token may be permanent, but the user token still needs renewal
