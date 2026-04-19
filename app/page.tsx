import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldAlert, Timer, TestTube2 } from "lucide-react";
import { PricingCards } from "@/components/pricing-cards";

const faqs = [
  {
    q: "How fast are reviews posted?",
    a: "For standard pull requests, reviews are posted in under 60 seconds after GitHub sends the webhook event.",
  },
  {
    q: "What does PR Review AI check?",
    a: "Each review highlights bug risks, security issues, style flags, and test coverage gaps with concrete file-level suggestions.",
  },
  {
    q: "Does this replace human review?",
    a: "No. It acts as a first-pass reviewer so your team can spend human review time on architecture, product intent, and deeper design tradeoffs.",
  },
  {
    q: "Who is this for?",
    a: "Indie founders and small engineering teams who need strong code quality checks without enterprise pricing.",
  },
];

const outcomes = [
  "Find high-risk bugs before they hit main",
  "Catch insecure patterns before release",
  "Enforce style consistency automatically",
  "Ship with better test coverage signals",
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-6 py-10 md:px-10">
      <header className="flex items-center justify-between">
        <div className="text-sm font-semibold tracking-wide text-zinc-300">PR Review AI</div>
        <nav className="flex items-center gap-6 text-sm text-zinc-400">
          <a href="#pricing" className="hover:text-zinc-100">
            Pricing
          </a>
          <a href="#faq" className="hover:text-zinc-100">
            FAQ
          </a>
          <Link
            href="/dashboard"
            className="rounded-md border border-zinc-700 bg-zinc-900/60 px-4 py-2 text-zinc-100 transition hover:border-zinc-500"
          >
            Open Dashboard
          </Link>
        </nav>
      </header>

      <section className="grid gap-8 md:grid-cols-[1.15fr_1fr] md:items-center">
        <div className="space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-200">
            <Timer className="h-4 w-4" />
            Review comments in under 60 seconds
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-zinc-50 md:text-6xl">
            Instant AI review on every pull request.
          </h1>
          <p className="max-w-xl text-lg text-zinc-300">
            PR Review AI posts actionable GitHub comments for every pull request so your team catches bugs, insecure code, and test blind spots before merge.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500"
            >
              Set Up Repository
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#problem"
              className="rounded-md border border-zinc-700 px-5 py-3 font-semibold text-zinc-200 transition hover:border-zinc-500"
            >
              Why teams switch
            </a>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-2xl shadow-blue-900/20">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-400">What You Get</h2>
          <ul className="space-y-3">
            {outcomes.map((item) => (
              <li key={item} className="flex items-start gap-3 text-zinc-200">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-blue-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="problem" className="grid gap-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-50">The Problem</h2>
          <p className="mt-4 text-zinc-300">
            Open-source review bots have gone stale and enterprise tools overcharge small teams. Code quality slows down when reviews are delayed, inconsistent, or skipped.
          </p>
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-zinc-50">The Solution</h2>
          <p className="mt-4 text-zinc-300">
            Add one GitHub webhook and PR Review AI handles first-pass review automatically. Every pull request gets a structured report your team can act on immediately.
          </p>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-4">
        <article className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <ShieldAlert className="h-6 w-6 text-amber-300" />
          <h3 className="mt-3 text-lg font-semibold">Security Flags</h3>
          <p className="mt-2 text-sm text-zinc-300">Spot risky auth flows, unsafe data handling, and exposed secrets before deployment.</p>
        </article>
        <article className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <Timer className="h-6 w-6 text-blue-300" />
          <h3 className="mt-3 text-lg font-semibold">Fast Feedback</h3>
          <p className="mt-2 text-sm text-zinc-300">Post review feedback quickly enough to stay inside your normal PR review cycle.</p>
        </article>
        <article className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <TestTube2 className="h-6 w-6 text-green-300" />
          <h3 className="mt-3 text-lg font-semibold">Test Gap Detection</h3>
          <p className="mt-2 text-sm text-zinc-300">Identify untouched edge cases and suggest where regression tests are missing.</p>
        </article>
        <article className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <CheckCircle2 className="h-6 w-6 text-indigo-300" />
          <h3 className="mt-3 text-lg font-semibold">Small-Team Pricing</h3>
          <p className="mt-2 text-sm text-zinc-300">Simple repo-based pricing built for solo founders and 2-5 person teams.</p>
        </article>
      </section>

      <section id="pricing" className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight">Pricing</h2>
          <p className="text-zinc-300">Start with one repository and scale to organization coverage when your team grows.</p>
        </div>
        <PricingCards />
      </section>

      <section id="faq" className="space-y-4">
        <h2 className="text-3xl font-semibold tracking-tight">FAQ</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {faqs.map((item) => (
            <article key={item.q} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <h3 className="text-base font-semibold text-zinc-100">{item.q}</h3>
              <p className="mt-2 text-sm text-zinc-300">{item.a}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
