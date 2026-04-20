import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import type { PlanType } from "@/lib/types";

interface PricingCardProps {
  plan: PlanType;
  name: string;
  price: string;
  description: string;
  cta: string;
  features: string[];
  highlighted?: boolean;
}

export function PricingCard(props: PricingCardProps) {
  return (
    <Card className={props.highlighted ? "border-emerald-500/70 bg-zinc-900" : ""}>
      <div className="mb-4 flex items-center justify-between">
        <CardTitle>{props.name}</CardTitle>
        {props.highlighted ? <Badge>Most Popular</Badge> : null}
      </div>
      <p className="mb-1 text-3xl font-bold text-zinc-100">{props.price}</p>
      <CardDescription className="mb-6">{props.description}</CardDescription>
      <ul className="mb-6 space-y-2 text-sm text-zinc-300">
        {props.features.map((feature) => (
          <li key={feature}>• {feature}</li>
        ))}
      </ul>
      <Link href={`/unlock?plan=${props.plan}`} className="block">
        <Button className="w-full" variant={props.highlighted ? "default" : "outline"}>
          {props.cta}
        </Button>
      </Link>
    </Card>
  );
}
