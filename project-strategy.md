# Project Strategy

> **Opinionated.** This file reflects the original author's stack and principles. Adapt the sections that don't apply to your workflow. See `docs/adapting.md`.

Reference document for the Architect. Contains the reference stack, non-negotiable principles, and implementation patterns that apply to all projects.

---

## 1. Reference stack

Starting point for web/app projects:

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React + Vite + Tailwind CSS v3 | Build → `dist/` |
| Hosting | Cloudflare Pages | `wrangler pages deploy dist --project-name [name] --branch main` |
| Auth | Firebase Auth | email/password by default |
| Database | Firestore | documents with camelCase fields |
| Serverless HTTP | Cloudflare Pages Functions | `functions/api/*.js`, export `onRequestPost` |
| Cron / scheduler | Standalone Cloudflare Worker | `workers/<name>/`, own `wrangler.toml` |
| Version control | GitHub | `gh repo create --private` |
| Transactional email | Resend | if the project requires it |
| AI / LLM | Claude API (claude-sonnet-4-6) | if vision or language processing is needed |
| Analytics | Cloudflare Web Analytics | MANUAL STEP: Workers & Pages → [project] → Metrics → Enable → redeploy |

**Firebase is used only for Auth + Firestore.** Firebase Hosting and Firebase Functions are not used — Cloudflare replaces them at lower cost and without cold starts.

### When to deviate from the standard stack

Evaluate on each project before assuming the default stack:

| Situation | Consider |
|---|---|
| Single user, no team, simple data | Firestore may be overkill — evaluate Cloudflare KV or JSON in R2 |
| Static or near-static content only | Plain HTML or Astro without React — less bundle, faster |
| No auth required | Remove Firebase completely |
| Intensive or long-running processing | Workers have limits (CPU 10ms free / 30ms paid); evaluate an alternative |
| Native mobile app | This stack doesn't apply — requires separate design |

Always evaluate: real cost in production, complexity for the MVP, simplicity of deploy and maintenance. Propose the alternative with its trade-off; the user decides.

---

## 2. Non-negotiable principles

### Resilience *(incorporated 2026-06-10)*

These three patterns are designed into the brief from the start — not added as a fix later:

1. **Error notification**: every async flow that can fail must notify if it fails. In Workers: root try-catch with alert email. In React: visible error state for the user, not just infinite loading.

2. **Timeouts on external calls**: every `fetch()` in a Worker must have AbortController + timeout (10–15s recommended). Without a timeout, the Worker can hang until the CPU limit without warning.

3. **Idempotency**: operations that can repeat (crons, retries, double-submit) must have a duplicate guard before writing. The brief must specify the mechanism.

4. **Errors in list iteration**: when a job processes a collection with per-item try-catch, silent errors aren't enough. The brief must specify a `failed[]` array that the notification summary includes. "Didn't break execution" is not the same as "the user knows what happened."

Design question for each async flow: *"If this fails at 3am, does anyone know before noon?"*

### Security

- Workers with only cron trigger: `workers_dev = false` in `wrangler.toml` from the first commit
- Backend secrets **never** with `VITE_` prefix — VITE_ variables are public on the client
- Firebase rules: each user only accesses their own data. Read the rules before deploying, never assume
- No `console.log` with tokens, passwords, or user data

**Minimum required gitignore:**
```
node_modules/
dist/
.env
.env.local
*.env*
*firebase-adminsdk*.json
_claude_log.md
.claude/settings*.json
# Do NOT exclude .claude/agent-memory/ — it must be committed (QA and Analyst memory migrates with the repo)
```

### UX

- Low friction: every click that can be eliminated, is eliminated
- Mobile-first by default unless specified otherwise
- Clear hover states on all interactive elements
- Every activatable state has a visible exit. If the user can enter, they must be able to leave
- Visible error states — never a spinner that never ends
- UI language should be consistent and match your users' language

### MVP and costs

- Start with the cheapest and simplest solution that solves the real problem
- Explicitly flag if something requested is disproportionate for the MVP scope
- Phase 2 is phase 2 — don't design for hypothetical use cases or scale prematurely
- No over-engineering: three similar lines are better than a premature abstraction

### Ethics

- If the project touches questionable industries or practices (tobacco, gambling, manipulative content), flag it before continuing.

---

## 3. Proven implementation patterns

Problems already solved. Use these patterns instead of reinventing.

| Problem | Pattern |
|---|---|
| Firebase Admin from Workers / Pages Functions | JWT signed via Web Crypto API (RSASSA-PKCS1-v1_5) + Firestore REST API directly. The `firebase-admin` SDK doesn't run in Workers. |
| Single version across the app | Create `src/lib/version.js`: `export { version } from '../../package.json'`. Each component imports from there. Never hardcode the number. |
| SPA routing in Cloudflare Pages | `public/_redirects`: `/* /index.html 200` |
| Firebase Auth popup (CORS) | `public/_headers`: `Cross-Origin-Opener-Policy: same-origin-allow-popups` |
| Local secrets (development) | `.dev.vars` for Workers · `.env.local` for Pages. Never in committed code. |
| Pages Functions with Anthropic SDK or other Node modules | `compatibility_flags = ["nodejs_compat"]` in `wrangler.toml` |
| Upload secrets to production | Pages: `wrangler pages secret put VAR --project-name=xxx` · Workers: `wrangler secret put VAR` from the worker directory |
| Cloudflare Web Analytics | MANUAL STEP after first deploy: Workers & Pages → [project] → Metrics → Enable Web Analytics → redeploy |
| Firebase Authorized Domains | MANUAL STEP after first deploy on new domain: Firebase Console → Authentication → Settings → Authorized Domains |
