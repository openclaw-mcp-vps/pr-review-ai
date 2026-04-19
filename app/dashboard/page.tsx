import Link from "next/link";
import { Github, Lock } from "lucide-react";
import { RepoSetup } from "@/components/repo-setup";
import { listActiveScopesForUser, listRecentReviewsForUser, listRepositoriesByUser } from "@/lib/db";
import { listUserRepositories } from "@/lib/github";
import { getPaywallStateFromCookies, getSessionUserFromCookies } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUserFromCookies();

  if (!user) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col items-center justify-center gap-6 px-6 py-10 text-center">
        <div className="rounded-full border border-zinc-700 bg-zinc-900/60 p-4">
          <Lock className="h-8 w-8 text-zinc-300" />
        </div>
        <h1 className="text-3xl font-semibold text-zinc-50">Sign in to configure PR Review AI</h1>
        <p className="max-w-xl text-zinc-300">
          Connect GitHub to enable webhook-driven AI reviews and manage paid repository access.
        </p>
        <div className="flex gap-3">
          <a href="/api/auth/github" className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500">
            <Github className="h-4 w-4" />
            Continue with GitHub
          </a>
          <Link href="/" className="rounded-md border border-zinc-700 px-5 py-3 font-semibold text-zinc-100 hover:border-zinc-500">
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  const [connectedRepos, activeScopes, recentReviews, paywallState] = await Promise.all([
    listRepositoriesByUser(user.id),
    listActiveScopesForUser(user.id),
    listRecentReviewsForUser(user.id, 15),
    getPaywallStateFromCookies(),
  ]);

  const githubRepos = await listUserRepositories(user.accessToken).catch(() => []);

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">Repository Dashboard</h1>
          <p className="mt-2 text-zinc-300">Configure webhook automation and monitor review output for your active repositories.</p>
        </div>
        <Link href="/" className="rounded-md border border-zinc-700 bg-zinc-900/70 px-4 py-2 text-sm font-semibold text-zinc-100 hover:border-zinc-500">
          Landing Page
        </Link>
      </header>

      <RepoSetup
        userId={user.id}
        userLogin={user.login}
        connectedRepos={connectedRepos.map((repo) => ({
          fullName: repo.fullName,
          createdAt: repo.createdAt,
        }))}
        githubRepos={githubRepos}
        activeScopes={activeScopes}
        recentReviews={recentReviews.map((review) => ({
          id: review.id,
          repoFullName: review.repoFullName,
          prNumber: review.prNumber,
          summary: review.summary,
          commentUrl: review.commentUrl,
          createdAt: review.createdAt,
        }))}
        hasPaidCookie={paywallState?.userId === user.id && paywallState.access === "paid"}
        webhookUrl={`${appUrl}/api/webhooks/github`}
      />

      <footer className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-300">
        <p>
          GitHub webhook endpoint: <code>{`${appUrl}/api/webhooks/github`}</code>
        </p>
        <p className="mt-1">
          Lemon Squeezy webhook endpoint: <code>{`${appUrl}/api/webhooks/lemonsqueezy`}</code>
        </p>
      </footer>
    </main>
  );
}
