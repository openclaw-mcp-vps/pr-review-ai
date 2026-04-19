"use client";

import { useMemo, useState } from "react";
import Script from "next/script";
import { ExternalLink, Github, Lock, RefreshCw, ShieldCheck, Webhook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type GitHubRepo = {
  fullName: string;
  private: boolean;
  permissions: {
    admin: boolean;
    push: boolean;
  };
};

type ConnectedRepo = {
  fullName: string;
  createdAt: string;
};

type ReviewHistory = {
  id: string;
  repoFullName: string;
  prNumber: number;
  summary: string;
  commentUrl: string | null;
  createdAt: string;
};

type RepoSetupProps = {
  userId: string;
  userLogin: string;
  connectedRepos: ConnectedRepo[];
  githubRepos: GitHubRepo[];
  activeScopes: string[];
  recentReviews: ReviewHistory[];
  hasPaidCookie: boolean;
  webhookUrl: string;
};

function repoHasAccess(repoFullName: string, activeScopes: string[]) {
  const owner = repoFullName.split("/")[0];
  return activeScopes.includes(repoFullName) || activeScopes.includes(`org:${owner}`);
}

function buildCheckoutUrl(productId: string, scope: string, userId: string) {
  const params = new URLSearchParams({
    embed: "1",
    media: "0",
    logo: "0",
    desc: "0",
    "checkout[custom][scope]": scope,
    "checkout[custom][plan]": scope.startsWith("org:") ? "org" : "repo",
    "checkout[custom][github_user_id]": userId,
  });

  return `https://checkout.lemonsqueezy.com/buy/${productId}?${params.toString()}`;
}

export function RepoSetup({
  userId,
  userLogin,
  connectedRepos,
  githubRepos,
  activeScopes,
  recentReviews,
  hasPaidCookie,
  webhookUrl,
}: RepoSetupProps) {
  const lemonProductId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID ?? "";
  const [repoFullName, setRepoFullName] = useState(githubRepos[0]?.fullName ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedHasAccess = useMemo(() => repoHasAccess(repoFullName, activeScopes), [repoFullName, activeScopes]);
  async function connectRepo() {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/repos/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repoFullName }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to connect repository");
      }

      setMessage(`Repository ${repoFullName} is connected. GitHub webhooks can now trigger AI review comments.`);
      window.location.reload();
    } catch (caught) {
      const details = caught instanceof Error ? caught.message : "Failed to connect repository";
      setError(details);
    } finally {
      setBusy(false);
    }
  }

  async function refreshPaywall() {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/access/refresh", { method: "GET" });
      const payload = (await response.json()) as { access?: string; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to refresh access state");
      }

      setMessage(payload.access === "paid" ? "Paid access confirmed. You can now connect unlocked repositories." : "No active subscription found yet.");
      window.location.reload();
    } catch (caught) {
      const details = caught instanceof Error ? caught.message : "Failed to refresh paywall";
      setError(details);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <Script src="https://app.lemonsqueezy.com/js/lemon.js" strategy="afterInteractive" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5 text-blue-300" />
            Welcome, {userLogin}
          </CardTitle>
          <CardDescription>
            Connect repositories you want monitored. PR Review AI responds to pull request webhooks and posts review comments directly on GitHub.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <label className="grid gap-2 text-sm">
            Repository to connect
            <input
              list="github-repo-options"
              value={repoFullName}
              onChange={(event) => setRepoFullName(event.target.value.trim())}
              placeholder="owner/repo"
              className="h-11 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-blue-500"
            />
            <datalist id="github-repo-options">
              {githubRepos.map((repo) => (
                <option key={repo.fullName} value={repo.fullName} />
              ))}
            </datalist>
          </label>

          <div className="flex flex-wrap gap-2">
            <Button onClick={connectRepo} disabled={busy || !repoFullName || !selectedHasAccess}>
              {busy ? "Working..." : "Connect Repository"}
            </Button>
            <Button variant="outline" onClick={refreshPaywall} disabled={busy}>
              <RefreshCw className="h-4 w-4" />
              Refresh Access
            </Button>
          </div>

          {!selectedHasAccess && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
              <div className="flex items-start gap-2">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="grid gap-2">
                  <p>This repository is locked until checkout completes and webhook sync confirms an active subscription.</p>
                  {lemonProductId ? (
                    <a
                      className="lemon-squeezy-button inline-flex w-fit items-center gap-2 rounded-md bg-blue-600 px-3 py-2 font-semibold text-white hover:bg-blue-500"
                      href={buildCheckoutUrl(lemonProductId, repoFullName, userId)}
                    >
                      Unlock {repoFullName} for $15/mo
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : (
                    <p>
                      Missing <code>NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID</code>. Add it to enable checkout links.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {hasPaidCookie && (
            <p className="text-sm text-emerald-300">Paid cookie is active for this session. You can connect unlocked repositories directly.</p>
          )}

          {message && <p className="text-sm text-emerald-300">{message}</p>}
          {error && <p className="text-sm text-red-300">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-blue-300" />
            Webhook Setup
          </CardTitle>
          <CardDescription>
            For each connected repository, add this GitHub webhook endpoint for <code>Pull requests</code> events.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-zinc-200">
          <div className="rounded-md border border-zinc-700 bg-zinc-950 p-3 font-mono text-xs sm:text-sm">{webhookUrl}</div>
          <p className="text-zinc-300">
            Use content type <code>application/json</code>. Enable SSL verification and set the same secret as <code>GITHUB_WEBHOOK_SECRET</code>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-300" />
            Connected Repositories
          </CardTitle>
          <CardDescription>
            Repositories below are linked to your account. Reviews trigger only when the repository has an active subscription scope.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {connectedRepos.length === 0 ? (
            <p className="text-sm text-zinc-300">No repositories connected yet.</p>
          ) : (
            <ul className="grid gap-2">
              {connectedRepos.map((repo) => {
                const unlocked = repoHasAccess(repo.fullName, activeScopes);
                return (
                  <li key={repo.fullName} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm">
                    <span className="font-medium text-zinc-100">{repo.fullName}</span>
                    <span className={unlocked ? "text-emerald-300" : "text-amber-300"}>{unlocked ? "Active" : "Locked"}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent AI Reviews</CardTitle>
          <CardDescription>Latest comments posted by PR Review AI for your connected repositories.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentReviews.length === 0 ? (
            <p className="text-sm text-zinc-300">No AI review history yet. Open a pull request in a connected and active repository to see results.</p>
          ) : (
            <ul className="grid gap-3">
              {recentReviews.map((review) => (
                <li key={review.id} className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3 text-sm">
                  <p className="font-semibold text-zinc-100">
                    {review.repoFullName} PR #{review.prNumber}
                  </p>
                  <p className="mt-1 text-zinc-300">{review.summary}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                    <span>{new Date(review.createdAt).toLocaleString()}</span>
                    {review.commentUrl && (
                      <a href={review.commentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-300 hover:text-blue-200">
                        View Comment
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
