import type { MetadataRoute } from "next";

const HOME_LAST_MODIFIED = new Date("2026-07-12T00:00:00+03:00");
const PRIVACY_LAST_MODIFIED = new Date("2026-07-12T00:00:00+03:00");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://well-climate.ru/", lastModified: HOME_LAST_MODIFIED, changeFrequency: "monthly", priority: 1 },
    { url: "https://well-climate.ru/privacy", lastModified: PRIVACY_LAST_MODIFIED, changeFrequency: "yearly", priority: 0.3 },
  ];
}
