import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://pr-review-ai.com",
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: "https://pr-review-ai.com/unlock",
      changeFrequency: "weekly",
      priority: 0.8
    }
  ];
}
