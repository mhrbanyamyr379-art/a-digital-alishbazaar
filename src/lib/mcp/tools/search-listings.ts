import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_listings",
  title: "Search listings",
  description: "Search active marketplace listings by keyword, category, province and price range.",
  inputSchema: {
    query: z.string().trim().optional().describe("Keyword to match in the title."),
    category: z.string().trim().optional().describe("Category slug filter."),
    subcategory: z.string().trim().optional().describe("Subcategory slug filter (belongs to the category)."),
    province: z.string().trim().optional().describe("Province filter."),
    minPrice: z.number().nonnegative().optional(),
    maxPrice: z.number().nonnegative().optional(),
    limit: z.number().int().min(1).max(50).default(20),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, category, subcategory, province, minPrice, maxPrice, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = supabaseForUser(ctx)
      .from("listings")
      .select("id, title, price, currency, category, subcategory, province, city, condition, created_at, view_count")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);

    if (query) q = q.ilike("title", `%${query}%`);
    if (category) q = q.eq("category", category);
    if (subcategory) q = q.eq("subcategory", subcategory);
    if (province) q = q.eq("province", province);
    if (typeof minPrice === "number") q = q.gte("price", minPrice);
    if (typeof maxPrice === "number") q = q.lte("price", maxPrice);

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { listings: data ?? [] },
    };
  },
});
