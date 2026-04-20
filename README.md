# PR Review AI

PR Review AI is a Next.js 15 App Router service that listens to GitHub pull request webhooks, runs AI analysis with Claude Sonnet, and posts actionable comments back to the PR thread.

## What it does

- Reviews every `pull_request` webhook (`opened`, `reopened`, `synchronize`, `ready_for_review`)
- Detects bug risks, security issues, style/maintainability flags, and testing gaps
- Posts a markdown review comment directly to the PR
- Provides a paywalled dashboard for manual run-now reviews
- Supports Lemon Squeezy billing and cookie-based access unlock

## Tech stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4
- Claude Sonnet via `@anthropic-ai/sdk`
- GitHub API via `@octokit/rest`
- Lemon Squeezy webhook + checkout overlay
- JSON-file persistence for subscription state

## Environment setup

Copy `.env.example` to `.env` and set values:

```bash
cp .env.example .env
```

Required for end-to-end production behavior:

- `NEXT_PUBLIC_LEMON_SQUEEZY_STORE_ID`
- `NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID` (checkout URL slug or full checkout URL)
- `LEMON_SQUEEZY_WEBHOOK_SECRET`
- `GITHUB_TOKEN` (repo write access)
- `ANTHROPIC_API_KEY`
- `GITHUB_WEBHOOK_SECRET`
- `GITHUB_APP_INSTALL_URL`
- `PAYWALL_COOKIE_SECRET`

## Run locally

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run start
```

## Webhook endpoints

- GitHub: `POST /api/webhook/github`
- Lemon Squeezy: `POST /api/webhook/lemonsqueezy`

## Other routes

- Health check: `GET /api/health`
- Unlock flow: `/unlock`
- Paywalled dashboard: `/dashboard`

## Deployment notes

1. Add the GitHub webhook for pull request events.
2. Configure Lemon Squeezy webhook with the signing secret.
3. Ensure persistent storage for `data/subscriptions.json` in your hosting environment, or swap `lib/storage.ts` to a managed SQL backend.
