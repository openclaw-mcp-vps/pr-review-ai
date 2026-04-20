import type { Metadata } from "next";
import Script from "next/script";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "@/app/globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap"
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pr-review-ai.com"),
  title: {
    default: "PR Review AI",
    template: "%s | PR Review AI"
  },
  description:
    "Instant AI review on every pull request. Catch bug risks, security issues, style flags, and test coverage gaps before merge.",
  keywords: [
    "PR review",
    "GitHub webhook",
    "AI code review",
    "small team dev tools",
    "Claude Sonnet",
    "Lemon Squeezy SaaS"
  ],
  openGraph: {
    type: "website",
    siteName: "PR Review AI",
    title: "PR Review AI — instant AI review on every pull request",
    description:
      "Webhook-based AI reviewer for solo devs and small teams. Posts actionable pull request feedback in under 60 seconds.",
    url: "https://pr-review-ai.com",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PR Review AI"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "PR Review AI",
    description: "Instant AI review comments on every GitHub pull request.",
    images: ["/og-image.png"]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={`${spaceGrotesk.variable} ${jetBrainsMono.variable}`} lang="en">
      <body className="min-h-screen bg-[#0d1117] text-zinc-100 antialiased">
        {children}
        <Script src="https://assets.lemonsqueezy.com/lemon.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
