"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to load account info.");
  }

  return response.json() as Promise<{
    access: { email: string; plan: "repo" | "org"; repoFullName?: string } | null;
  }>;
};

export function RepoSelector() {
  const [repoFullName, setRepoFullName] = useState("");
  const [pullNumber, setPullNumber] = useState("");
  const [postComment, setPostComment] = useState(true);
  const [reviewResult, setReviewResult] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { data } = useSWR("/api/account", fetcher);

  const account = data?.access;

  async function runReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setReviewResult("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          repoFullName,
          pullNumber: Number(pullNumber),
          postComment
        })
      });

      const payload = (await response.json()) as {
        review?: string;
        error?: string;
      };

      if (!response.ok || !payload.review) {
        throw new Error(payload.error ?? "Review failed.");
      }

      setReviewResult(payload.review);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unknown error.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle className="mb-2 text-lg">Your Access</CardTitle>
        <CardDescription>
          {account
            ? `Signed in as ${account.email}. Plan: ${account.plan}${account.repoFullName ? ` (${account.repoFullName})` : ""}.`
            : "No access cookie detected."}
        </CardDescription>
      </Card>

      <Card>
        <CardTitle className="mb-2 text-lg">Run AI Review</CardTitle>
        <CardDescription className="mb-4">
          Trigger an on-demand review for a pull request. This uses the same Claude review engine as the webhook.
        </CardDescription>

        <form className="space-y-4" onSubmit={runReview}>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300" htmlFor="repo">
              Repository (owner/name)
            </label>
            <Input
              id="repo"
              placeholder="octocat/hello-world"
              required
              value={repoFullName}
              onChange={(event) => setRepoFullName(event.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300" htmlFor="pr-number">
              Pull Request Number
            </label>
            <Input
              id="pr-number"
              type="number"
              min={1}
              required
              value={pullNumber}
              onChange={(event) => setPullNumber(event.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={postComment}
              onChange={(event) => setPostComment(event.target.checked)}
            />
            Post this review to GitHub PR comments
          </label>

          <Button className="w-full" disabled={isLoading} type="submit">
            {isLoading ? "Reviewing..." : "Run Review"}
          </Button>
        </form>
      </Card>

      {error ? (
        <Card className="border-red-500/50">
          <CardTitle className="mb-1 text-base text-red-300">Review failed</CardTitle>
          <CardDescription className="text-red-200">{error}</CardDescription>
        </Card>
      ) : null}

      {reviewResult ? (
        <Card>
          <CardTitle className="mb-2 text-lg">Latest Review</CardTitle>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-zinc-950 p-4 text-sm text-zinc-200">
            {reviewResult}
          </pre>
        </Card>
      ) : null}
    </div>
  );
}
