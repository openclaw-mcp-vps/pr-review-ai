import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RepoSelector } from "@/components/RepoSelector";
import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/paywall";

export const metadata = {
  title: "Dashboard",
  description: "Run on-demand pull request reviews and manage your repo access."
};

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  const access = verifyAccessToken(token);

  if (!access) {
    redirect("/unlock?next=/dashboard");
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-8">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-emerald-300">Paywalled Dashboard</p>
        <h1 className="mb-2 text-3xl font-bold text-zinc-50">PR Review Control Center</h1>
        <p className="text-zinc-300">
          Trigger manual reviews, validate your access, and verify that the webhook-powered analysis pipeline is healthy.
        </p>
      </div>
      <RepoSelector />
    </main>
  );
}
