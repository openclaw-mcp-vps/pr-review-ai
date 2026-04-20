import type { PlanType } from "@/lib/types";
import { UnlockForm } from "@/components/UnlockForm";

export const metadata = {
  title: "Unlock Access",
  description: "Complete checkout and unlock your PR Review AI dashboard access."
};

export default async function UnlockPage({
  searchParams
}: {
  searchParams: Promise<{ plan?: string; status?: string }>;
}) {
  const params = await searchParams;
  const plan: PlanType = params.plan === "org" ? "org" : "repo";

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-6">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-emerald-300">Checkout + Verification</p>
        <h1 className="mb-2 text-3xl font-bold text-zinc-50">Unlock PR Review AI</h1>
        <p className="text-zinc-300">
          Complete payment through Lemon Squeezy, then verify purchase to issue your secure dashboard cookie.
        </p>
        {params.status === "paid" ? (
          <p className="mt-3 text-sm text-emerald-300">
            Payment was completed. Verify your purchase below to activate access.
          </p>
        ) : null}
      </div>
      <UnlockForm defaultPlan={plan} />
    </main>
  );
}
