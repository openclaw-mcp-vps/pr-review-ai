import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: "PR Review AI | Instant AI Review on Every Pull Request",
  description:
    "PR Review AI analyzes every pull request in under 60 seconds and posts actionable feedback on bug risks, security issues, style problems, and test coverage gaps.",
  openGraph: {
    title: "PR Review AI — instant AI review on every pull request",
    description:
      "Catch bugs before merge with automated AI code reviews delivered directly in GitHub pull request comments.",
    url: "/",
    siteName: "PR Review AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PR Review AI",
    description:
      "Automated AI code review for indie founders and small teams. Fast GitHub pull request feedback in under 60 seconds.",
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
