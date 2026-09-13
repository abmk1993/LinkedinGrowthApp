# LinkedIn Growth Agent — MVP

## Status (read this first)

**The full MVP described in the original dev plan is now built**: every page and route in the "First Development Task" scope exists, including `/settings` (edit profile, view/change growth plan cadence, re-run profile/photo audit anytime) and `/analytics` (manual metrics entry per published post). The only piece left from the dev plan's task list is filling in the real Playwright E2E happy-path (`tests/e2e/core-flow.spec.ts`) — it's still the honest skeleton, but every page it needs to click through now actually exists, so this is now a real next step rather than blocked on missing UI.

**What's actually been verified, not just written — this round:**
- `npx tsc --noEmit` — clean
- `npx eslint .` — clean
- `npx next build` — clean, all 39 routes compile
- `npx vitest run` — 25/25 still pass
- **Started the built server and exercised every new route with curl**: `/settings` and `/analytics` correctly 307-redirect unauthenticated; the 5 new API routes (`GET /api/profile`, `GET /api/growth-plan`, `GET /api/posts`, `GET`/`POST /api/posts/[id]/metrics`) all correctly return 401 unauthenticated, zero server errors

**Still not run** (unchanged from last round): anything needing real credentials — Supabase, a real Claude API call (including the vision call), Serper, LinkedIn OAuth, or the Playwright E2E suite (browser install still blocked by the sandbox's network allowlist).

**What to actually do next**, in rough priority order:
1. Wire up real Supabase + Claude + Serper credentials and click through the whole flow yourself — this is the first time anything here gets tested against real services, not mocks
2. Fill in `tests/e2e/core-flow.spec.ts` now that every page exists
3. Enable LinkedIn OAuth in the Supabase dashboard if you want that login path working
4. Finish the background-blur correction in `lib/photo/correct.ts` (currently a documented no-op)



## Setup

```bash
npm install
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, ANTHROPIC_API_KEY, SERPER_API_KEY
```

Run the schema against your Supabase project (SQL editor, or `supabase db push` if you're using the CLI):
```
supabase/schema.sql
```

Create a **private** Storage bucket named `profile-photos` (dashboard: Storage → New bucket → uncheck "Public"). The photo onboarding step will fail clearly at upload if this is missing — it won't silently break.

```bash
npm run dev          # http://localhost:3000
npm run typecheck
npm run lint
npm test              # unit + contract tests, no network needed
npm run test:e2e      # starts a dev server with the mocked AI provider automatically
```

## Project layout

```
app/
  page.tsx                    Landing page
  login/, signup/             Auth pages (email/password + LinkedIn OAuth button)
  auth/callback/               Exchanges Supabase auth code for a session
  onboarding/profile/          Step 1: professional profile form
  onboarding/profile-audit/    Step 2: paste + copy guide + accept/edit/reject
  onboarding/photo/             Step 3: upload, vision score, correction, download
  onboarding/positioning/       Step 4: generate + edit content pillars
  onboarding/growth-plan/       Step 5: cadence picker, closes Phase 1
  dashboard/                    Phase 2 home: stats + "run research"
  research/                     List + topic detail (research/[itemId])
  posts/[postId]/edit/          Post editor: hook picker, regenerate modifiers, approve
  posts/[postId]/publish/       Copy-to-clipboard + mark published
  analytics/                    Manual metrics entry per published post
  settings/                     Edit profile, view/change cadence, re-run audits
  api/                        API routes (profile, positioning, profile-audit, photo, research, posts, growth-plan, analytics)
components/
  ui/                          Button, Field, TagInput — shared form primitives
  auth/LoginForm.tsx            Split out from the login page so useSearchParams() can sit in a
                                Suspense boundary (required for static prerendering — Next's build
                                catches this if you forget, eslint won't)
middleware.ts                 Refreshes the Supabase session every request; redirects unauthenticated
                               users away from /onboarding, /dashboard, /research, /posts, /analytics,
                               /settings — actually verified with curl, see Status above
lib/
  ai/
    provider.ts                The AIProvider interface — everything depends on this, not on Claude directly
    claudeProvider.ts           Real Claude implementation
    mockProvider.ts             Deterministic mock for tests
    getProvider.ts              Selector: real Claude, or mock when USE_MOCK_AI_PROVIDER=true
    e2eFixtures.ts               Fixed stub responses for the E2E suite
    parseJson.ts                 Safe JSON parsing/validation for AI responses (zod)
    agents/                      One file per agent: positioning, profile audit, content, research
  photo/correct.ts               Deterministic (non-AI) image correction — see the note in that file
                                  on why generative face edits are out of scope
  research/pipeline.ts           Orchestrates search + Research Agent + dedupe/rank for one run
  search/
    provider.ts                  The SearchProvider interface — mirrors ai/provider.ts
    serperProvider.ts             Real implementation (Serper.dev)
    mockProvider.ts               Deterministic mock for tests
    getProvider.ts                Selector, same USE_MOCK_AI_PROVIDER flag as the AI provider
  supabase/                      Server + browser clients, hand-written Database types, Storage helpers
  validation/requests.ts         zod schemas for every API request body
supabase/schema.sql             Full schema + Row Level Security policies
tests/
  unit/                          Pure logic + AI output contract tests
  api/                           Request-validation tests
  e2e/                           Playwright — landing page (real), core flow (skeleton, see file)
  fixtures/profiles.ts           Seeded fake profiles, including a QA/Playwright one
.github/workflows/ci.yml        Lint → typecheck → unit/contract → E2E (mocked) → merge gate;
                                 nightly real-API run is separate, not blocking
```

## Design decisions worth knowing before extending this

- **No scraping, anywhere.** Profile text (About, experience) is paste-in by design — LinkedIn's official API doesn't expose it, and scraping (even via extension, even with the user's own login) violates their ToS and risks the user's account. See the note at the top of the AI Prompts section in the original dev plan doc for the research behind this.
- **Photo correction is deterministic, not generative.** `lib/photo/correct.ts` uses `sharp` for crop/lighting/background — it does not redraw faces. The background-blur correction is a placeholder no-op pending a segmentation library; don't ship it as "working" without finishing that.
- **Every AI-calling route goes through `getAIProvider()`**, never `ClaudeProvider` directly — this is what makes the E2E suite mock-able without touching route code.
- **Row Level Security is on for every table** (`supabase/schema.sql`) — this wasn't in the original plan doc but is the right default for user-scoped data; don't disable it without a reason.
- **LinkedIn OAuth needs setup outside this code**: in the Supabase dashboard, enable the `linkedin_oidc` provider and add your LinkedIn app's Client ID/Secret (from a LinkedIn app with "Sign In with LinkedIn using OpenID Connect" enabled). Until that's configured, the "Sign in with LinkedIn" buttons on `/login` and `/signup` will error — the email/password flow works independently and doesn't need it.
