# Build Task: pr-review-ai

Build a complete, production-ready Next.js 15 App Router application.

PROJECT: pr-review-ai
HEADLINE: PR Review AI — instant AI review on every pull request, catches bugs before merge
WHAT: Add one GitHub webhook. Every PR gets an AI review posted as comment within 60s: bug risks, security issues, style flags, test coverage gaps. Uses Claude Sonnet 4.
WHY: ChatGPT-CodeReview OSS lost maintainership. CodeRabbit charges $24/user. Solo devs + 2-5 person teams want cheaper one-repo SKU.
WHO PAYS: Indie founders + small teams on GitHub
NICHE: code-review
PRICE: $$15/mo per repo, $99/mo org/mo

ARCHITECTURE SPEC:
Simple webhook-based service that receives GitHub PR events, analyzes code changes with Claude Sonnet, and posts review comments back to the PR. Built with Next.js API routes for webhooks, Prisma for subscription tracking, and Lemon Squeezy for payments.

PLANNED FILES:
- pages/api/webhook/github.js
- pages/api/webhook/lemonsqueezy.js
- pages/api/auth/github.js
- lib/claude-reviewer.js
- lib/github-client.js
- lib/lemonsqueezy.js
- components/RepoSelector.jsx
- components/PricingCard.jsx
- pages/dashboard.js
- pages/index.js
- prisma/schema.prisma

DEPENDENCIES: next, tailwindcss, @anthropic-ai/sdk, @octokit/rest, prisma, @prisma/client, @lemonsqueezy/lemonsqueezy.js, crypto, next-auth, swr

REQUIREMENTS:
- Next.js 15 with App Router (app/ directory)
- TypeScript
- Tailwind CSS v4
- shadcn/ui components (npx shadcn@latest init, then add needed components)
- Dark theme ONLY — background #0d1117, no light mode
- Lemon Squeezy checkout overlay for payments
- Landing page that converts: hero, problem, solution, pricing, FAQ
- The actual tool/feature behind a paywall (cookie-based access after purchase)
- Mobile responsive
- SEO meta tags, Open Graph tags
- /api/health endpoint that returns {"status":"ok"}
- NO HEAVY ORMs: Do NOT use Prisma, Drizzle, TypeORM, Sequelize, or Mongoose. If the tool needs persistence, use direct SQL via `pg` (Postgres) or `better-sqlite3` (local), or just filesystem JSON. Reason: these ORMs require schema files and codegen steps that fail on Vercel when misconfigured.
- INTERNAL FILE DISCIPLINE: Every internal import (paths starting with `@/`, `./`, or `../`) MUST refer to a file you actually create in this build. If you write `import { Card } from "@/components/ui/card"`, then `components/ui/card.tsx` MUST exist with a real `export const Card` (or `export default Card`). Before finishing, scan all internal imports and verify every target file exists. Do NOT use shadcn/ui patterns unless you create every component from scratch — easier path: write all UI inline in the page that uses it.
- DEPENDENCY DISCIPLINE: Every package imported in any .ts, .tsx, .js, or .jsx file MUST be
  listed in package.json dependencies (or devDependencies for build-only). Before finishing,
  scan all source files for `import` statements and verify every external package (anything
  not starting with `.` or `@/`) appears in package.json. Common shadcn/ui peers that MUST
  be added if used:
  - lucide-react, clsx, tailwind-merge, class-variance-authority
  - react-hook-form, zod, @hookform/resolvers
  - @radix-ui/* (for any shadcn component)
- After running `npm run build`, if you see "Module not found: Can't resolve 'X'", add 'X'
  to package.json dependencies and re-run npm install + npm run build until it passes.

ENVIRONMENT VARIABLES (create .env.example):
- NEXT_PUBLIC_LEMON_SQUEEZY_STORE_ID
- NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID
- LEMON_SQUEEZY_WEBHOOK_SECRET

After creating all files:
1. Run: npm install
2. Run: npm run build
3. Fix any build errors
4. Verify the build succeeds with exit code 0

Do NOT use placeholder text. Write real, helpful content for the landing page
and the tool itself. The tool should actually work and provide value.
