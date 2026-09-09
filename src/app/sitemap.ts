import { MOCK_LOCATIONS } from "@/lib/mock/locations";
import { SERVICE_PROVIDERS } from "@/lib/mock/service-providers";
import { getSiteUrl } from "@/lib/site";
import { listPublishedCatalogListingRefs } from "@/server/repositories/catalog";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl().replace(/\/$/, "");
  const lastModified = new Date();
  const urls = new Map<string, MetadataRoute.Sitemap[number]>();

  function add(
    path: string,
    options: Pick<
      MetadataRoute.Sitemap[number],
      "changeFrequency" | "priority"
    >,
  ) {
    const url = `${baseUrl}${path}`;
    if (urls.has(url)) return;
    urls.set(url, { url, lastModified, ...options });
  }

  add("/", { changeFrequency: "weekly", priority: 1 });
  add("/business/onboarding", { changeFrequency: "monthly", priority: 0.6 });

  for (const location of MOCK_LOCATIONS) {
    add(`/location/${location.id}`, {
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  for (const service of SERVICE_PROVIDERS) {
    add(`/service/${service.id}`, {
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  const catalogListings = await listPublishedCatalogListingRefs();
  for (const listing of catalogListings) {
    if (listing.kind === "location") {
      add(`/location/${listing.id}`, {
        changeFrequency: "weekly",
        priority: 0.8,
      });
    } else if (listing.kind === "service") {
      add(`/service/${listing.id}`, {
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  return Array.from(urls.values());
}
