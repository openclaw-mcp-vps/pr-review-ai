"use client";

import { useMemo } from "react";
import Script from "next/script";
import { Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Plan = {
  name: string;
  price: string;
  cadence: string;
  audience: string;
  points: string[];
  cta: string;
  highlighted?: boolean;
};

const plans: Plan[] = [
  {
    name: "Starter Repo",
    price: "$15",
    cadence: "/mo per repo",
    audience: "Best for solo builders",
    points: [
      "Unlimited pull request reviews on one repository",
      "Bug, security, style, and testing feedback",
      "Webhook-driven comment posting in under 60s",
      "Review history in dashboard",
    ],
    cta: "Buy Starter",
    highlighted: true,
  },
  {
    name: "Org Plan",
    price: "$99",
    cadence: "/mo org",
    audience: "Best for 2-5 person teams",
    points: [
      "Coverage across all repos in your org",
      "Shared review policy and standardized feedback",
      "Priority processing during peak usage",
      "Single subscription for the whole team",
    ],
    cta: "Buy Org Plan",
  },
];

export function PricingCards() {
  const stripePaymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? "";
  const productId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID ?? "";

  const checkoutLink = useMemo(() => {
    if (stripePaymentLink) {
      return stripePaymentLink;
    }
    if (!productId) {
      return "#";
    }
    return `https://checkout.lemonsqueezy.com/buy/${productId}?embed=1&media=0&logo=0&desc=0`;
  }, [productId, stripePaymentLink]);

  return (
    <>
      <Script src="https://app.lemonsqueezy.com/js/lemon.js" strategy="afterInteractive" />
      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((plan) => (
          <Card key={plan.name} className={plan.highlighted ? "border-blue-500/50 shadow-lg shadow-blue-950/30" : ""}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.audience}</CardDescription>
              <p className="pt-2 text-3xl font-bold text-zinc-50">
                {plan.price}
                <span className="text-sm font-medium text-zinc-400">{plan.cadence}</span>
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-zinc-200">
                {plan.points.map((point) => (
                  <li key={point} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <a
                  href={checkoutLink}
                  className={checkoutLink === "#" ? "pointer-events-none opacity-50" : "lemon-squeezy-button"}
                >
                  {plan.cta}
                </a>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      {!productId && !stripePaymentLink && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          Add <code>NEXT_PUBLIC_STRIPE_PAYMENT_LINK</code> to enable checkout.
        </p>
      )}
    </>
  );
}
