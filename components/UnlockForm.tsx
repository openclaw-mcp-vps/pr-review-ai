"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { PlanType } from "@/lib/types";

interface UnlockFormProps {
  defaultPlan: PlanType;
}

export function UnlockForm({ defaultPlan }: UnlockFormProps) {
  const [plan, setPlan] = useState<PlanType>(defaultPlan);
  const [email, setEmail] = useState("");
  const [repoFullName, setRepoFullName] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const checkoutUrl = useMemo(() => {
    const checkoutPath = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID;
    if (!checkoutPath) {
      return "";
    }

    const base = checkoutPath.startsWith("http")
      ? new URL(checkoutPath)
      : new URL(`https://checkout.lemonsqueezy.com/buy/${checkoutPath}`);

    base.searchParams.set("embed", "1");
    base.searchParams.set("media", "0");
    base.searchParams.set("logo", "0");
    base.searchParams.set("checkout[custom][plan]", plan);

    if (email) {
      base.searchParams.set("checkout[email]", email);
      base.searchParams.set("checkout[custom][email]", email);
    }

    if (repoFullName) {
      base.searchParams.set("checkout[custom][repo_full_name]", repoFullName);
    }

    return base.toString();
  }, [email, plan, repoFullName]);

  async function verifyAccess() {
    setVerificationError("");
    setVerificationMessage("");
    setIsVerifying(true);

    try {
      const response = await fetch("/api/paywall/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          plan,
          repoFullName
        })
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Unable to verify purchase.");
      }

      setVerificationMessage("Access unlocked. You can now open the dashboard.");
    } catch (caught) {
      setVerificationError(caught instanceof Error ? caught.message : "Unknown error.");
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle className="mb-2 text-lg">1) Choose Plan + Checkout</CardTitle>
        <CardDescription className="mb-4">
          Pay in the Lemon Squeezy secure overlay. Use the same email you will verify in step 2.
        </CardDescription>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <Button
            variant={plan === "repo" ? "default" : "outline"}
            onClick={() => setPlan("repo")}
            type="button"
          >
            Repo Plan
          </Button>
          <Button
            variant={plan === "org" ? "default" : "outline"}
            onClick={() => setPlan("org")}
            type="button"
          >
            Org Plan
          </Button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300" htmlFor="email">
              Billing Email
            </label>
            <Input
              id="email"
              placeholder="you@company.com"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300" htmlFor="repo-name">
              Repository (required for repo plan)
            </label>
            <Input
              id="repo-name"
              placeholder="owner/repo"
              value={repoFullName}
              onChange={(event) => setRepoFullName(event.target.value)}
            />
          </div>

          <a
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-emerald-500 text-sm font-medium text-black transition hover:bg-emerald-400"
            data-ls-modal="true"
            data-ls-toggle="true"
            href={checkoutUrl || "#"}
          >
            Open Secure Checkout
          </a>
        </div>
      </Card>

      <Card>
        <CardTitle className="mb-2 text-lg">2) Unlock Dashboard</CardTitle>
        <CardDescription className="mb-4">
          After payment, verify your email and we will issue a secure access cookie.
        </CardDescription>

        <Button className="w-full" disabled={isVerifying || !email} onClick={verifyAccess} type="button">
          {isVerifying ? "Verifying..." : "Verify Purchase"}
        </Button>

        {verificationMessage ? <p className="mt-3 text-sm text-emerald-300">{verificationMessage}</p> : null}
        {verificationError ? <p className="mt-3 text-sm text-red-300">{verificationError}</p> : null}
      </Card>
    </div>
  );
}
