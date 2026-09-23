import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://a-digital-alishbazaar.lovable.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/auth", changefreq: "monthly", priority: "0.3" },
        ];

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: listings } = await supabaseAdmin
            .from("listings")
            .select("id, updated_at")
            .eq("status", "active")
            .limit(5000);
          for (const l of listings ?? []) {
            entries.push({
              path: `/listing/${l.id}`,
              lastmod: l.updated_at ? new Date(l.updated_at).toISOString() : undefined,
              changefreq: "weekly",
              priority: "0.8",
            });
          }

          const { data: sellers } = await supabaseAdmin
            .from("profiles")
            .select("id, updated_at")
            .limit(5000);
          for (const s of sellers ?? []) {
            entries.push({
              path: `/seller/${s.id}`,
              lastmod: s.updated_at ? new Date(s.updated_at).toISOString() : undefined,
              changefreq: "weekly",
              priority: "0.5",
            });
          }
        } catch {
          // If DB fetch fails, still return static entries
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
