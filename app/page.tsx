import Link from "next/link";
import { PricingCard } from "@/components/PricingCard";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

const faqs = [
  {
    q: "How quickly does the review appear on a PR?",
    a: "Most reviews land in under 60 seconds after a pull_request opened, reopened, or synchronize event."
  },
  {
    q: "What does the AI check?",
    a: "Bug risks, security pitfalls, style/maintainability concerns, and missing test coverage based on the diff."
  },
  {
    q: "What do I need to connect?",
    a: "A GitHub token with repo write permissions, your webhook secret, and an Anthropic API key for Claude Sonnet."
  },
  {
    q: "Can I run a review manually?",
    a: "Yes. The dashboard includes a run-now form for any PR in your entitled repositories."
  }
];

export default function HomePage() {
  return (
    <main>
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-24 md:pt-28">
        <div className="grid gap-12 md:grid-cols-[1.15fr_0.85fr] md:items-center">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Code Review / GitHub</p>
            <h1 className="mb-6 text-4xl font-bold leading-tight text-zinc-50 md:text-6xl">
              PR Review AI posts instant, actionable review comments on every pull request.
            </h1>
            <p className="mb-8 max-w-xl text-lg text-zinc-300">
              Replace expensive per-seat review bots with one predictable repo SKU. Catch production bugs, security flaws,
              and test gaps before merge with Claude Sonnet-powered analysis.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/unlock">
                <Button size="lg">Start 5-minute Setup</Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" variant="outline">
                  Open Dashboard
                </Button>
              </Link>
            </div>
          </div>

          <Card className="border-zinc-700/70 bg-zinc-900/60">
            <CardTitle className="mb-3 text-lg">Webhook Runtime</CardTitle>
            <CardDescription className="mb-5">PR opened/sync → Claude Sonnet review → GitHub comment in one flow.</CardDescription>
            <div className="space-y-3 text-sm text-zinc-300">
              <div className="rounded-md border border-zinc-700 bg-zinc-950/70 p-3">1. GitHub sends pull_request webhook</div>
              <div className="rounded-md border border-zinc-700 bg-zinc-950/70 p-3">2. Diff analyzed for bugs, security, and quality</div>
              <div className="rounded-md border border-zinc-700 bg-zinc-950/70 p-3">3. Review comment posted directly to the PR thread</div>
            </div>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-14" id="problem">
        <div className="mb-8 max-w-2xl">
          <h2 className="mb-3 text-3xl font-semibold text-zinc-50">Why teams switch</h2>
          <p className="text-zinc-300">
            OSS reviewers lose maintainers and premium bots charge by seat. PR Review AI gives indie founders and 2-5 person
            teams a cheaper, one-repo model with immediate value.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardTitle className="mb-2 text-lg">Pricing Fit</CardTitle>
            <CardDescription>
              One repo, predictable monthly cost. No per-user growth tax as your contributor count changes.
            </CardDescription>
          </Card>
          <Card>
            <CardTitle className="mb-2 text-lg">Fast Feedback</CardTitle>
            <CardDescription>
              Comments arrive during active review, before context is lost and before risky code reaches main.
            </CardDescription>
          </Card>
          <Card>
            <CardTitle className="mb-2 text-lg">Focused Coverage</CardTitle>
            <CardDescription>
              Designed for PR quality checks: defect risk, security warning signs, maintainability debt, and tests.
            </CardDescription>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16" id="pricing">
        <div className="mb-8 max-w-2xl">
          <h2 className="mb-3 text-3xl font-semibold text-zinc-50">Simple pricing</h2>
          <p className="text-zinc-300">Start with one repository or roll out across a small org.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <PricingCard
            cta="Buy Repo Plan"
            description="Ideal for indie founders shipping one primary codebase."
            features={[
              "AI review on every PR event",
              "Manual run from dashboard",
              "Security + bug + test-gap checks",
              "One GitHub repository"
            ]}
            name="Repo"
            plan="repo"
            price="$15/mo"
          />
          <PricingCard
            cta="Buy Org Plan"
            description="For teams running multiple repos under one org."
            features={[
              "Everything in Repo plan",
              "Multi-repo entitlement",
              "Org rollout support",
              "Priority support window"
            ]}
            highlighted
            name="Org"
            plan="org"
            price="$99/mo"
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20" id="faq">
        <div className="mb-8 max-w-2xl">
          <h2 className="mb-3 text-3xl font-semibold text-zinc-50">FAQ</h2>
          <p className="text-zinc-300">Everything needed to ship this in production.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {faqs.map((faq) => (
            <Card key={faq.q}>
              <CardTitle className="mb-2 text-base">{faq.q}</CardTitle>
              <CardDescription>{faq.a}</CardDescription>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
