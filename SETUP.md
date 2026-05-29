# CrewHire Labs — Sprint 2 Setup Guide
## Supabase + Cloudflare Pages deployment

---

## STEP 1 — Create Supabase project

1. Go to https://supabase.com → Sign up free
2. Click **New project**
3. Name: `crewhire-labs`
4. Database password: create a strong one and save it
5. Region: **Southeast Asia (Singapore)** — closest to India
6. Click **Create new project** — wait ~2 minutes

---

## STEP 2 — Run the database schema

1. In Supabase dashboard → click **SQL Editor** (left sidebar)
2. Click **New query**
3. Open the file `supabase-schema.sql` from this project
4. Copy the entire contents → paste into the SQL editor
5. Click **Run** (or press Cmd+Enter)
6. You should see: `Success. No rows returned`

This creates all 6 tables + RLS policies + pgvector + search function.

---

## STEP 3 — Get your API keys

1. In Supabase dashboard → **Settings** → **API**
2. Copy two values:
   - **Project URL** → looks like `https://abcdefgh.supabase.co`
   - **anon public key** → long string starting with `eyJ...`

---

## STEP 4 — Configure environment variables

### For local development:
Create a `.env` file in the project root (copy from `.env.example`):
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### For Cloudflare Pages (production):
1. Go to Cloudflare Dashboard → Pages → crewhire-app
2. Settings → Environment variables
3. Add two variables:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
4. Save → Redeploy

---

## STEP 5 — Configure Supabase Auth

1. In Supabase → **Authentication** → **URL Configuration**
2. Set **Site URL**: `https://crewhire-app.pages.dev` (or your custom domain)
3. Add **Redirect URLs**:
   - `https://crewhire-app.pages.dev/**`
   - `https://crewhirelabs.online/**`
   - `http://localhost:5173/**` (for local dev)
4. Save

---

## STEP 6 — Deploy to Cloudflare Pages

### Option A — New separate Pages project (recommended)
This Sprint 2 app is a separate codebase from your landing page.
Deploy it as a NEW Cloudflare Pages project:

1. Push this folder to a new GitHub repo: `crewhire-app`
2. Cloudflare Pages → Create project → Connect Git → select `crewhire-app`
3. Build command: `npm run build`
4. Build output: `dist`
5. Add environment variables (Step 4 above)
6. Deploy

### Option B — Subdomain
Point `app.crewhirelabs.online` to the new Pages project:
- Cloudflare DNS → Add CNAME record
  - Name: `app`
  - Target: `crewhire-app.pages.dev`

---

## STEP 7 — Local development

```bash
# Install dependencies
npm install

# Copy env file
cp .env.example .env
# Fill in your Supabase URL and anon key

# Start dev server
npm run dev

# Open http://localhost:5173
```

---

## FILE STRUCTURE

```
crewhire-sprint2/
├── supabase-schema.sql     ← Run this in Supabase SQL Editor FIRST
├── .env.example            ← Copy to .env and fill in keys
├── src/
│   ├── lib/
│   │   ├── supabase.js     ← Supabase client
│   │   ├── AuthContext.jsx ← Global auth state
│   │   └── brandBrain.js   ← Brand Brain ingestion
│   ├── pages/
│   │   ├── AuthPage.jsx        ← Login + Signup
│   │   ├── OnboardingWizard.jsx← 5-step brand setup
│   │   └── Dashboard.jsx       ← Main app dashboard
│   ├── App.jsx             ← Router
│   ├── main.jsx            ← Entry point
│   └── index.css           ← Global styles
└── public/
    └── _redirects          ← Cloudflare SPA routing
```

---

## WHAT SPRINT 2 GIVES YOU

- ✅ Full auth — signup, login, email verification
- ✅ 5-step brand onboarding wizard
- ✅ Brand Brain ingestion (text → pgvector chunks)
- ✅ 10 agent employee roster seeded per brand
- ✅ Dashboard — hire agents, view activity, Brand Brain status
- ✅ 7-day trial timer per brand
- ✅ Row-level security — each brand sees only their own data
- ✅ Ready for Sprint 3 (Hermes agents on Oracle)

---

## NEXT — SPRINT 3

Sprint 3 connects Oracle Cloud + Hermes:
- FastAPI server on Oracle Always Free VM
- Hermes agent workers (Sales, Support, Founder)
- Celery task queue via Upstash Redis
- Agents pull Brand Brain context from Supabase pgvector
- Results logged to agent_tasks table → appear in dashboard live
