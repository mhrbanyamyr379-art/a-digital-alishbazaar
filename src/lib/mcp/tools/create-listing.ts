import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_listing",
  title: "Create listing",
  description: "Create a new marketplace listing owned by the signed-in user (draft by default).",
  inputSchema: {
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().max(5000).default(""),
    price: z.number().nonnegative().default(0),
    currency: z.enum(["AFN", "USD"]).default("AFN"),
    category: z.string().trim().min(1),
    province: z.string().trim().min(1),
    city: z.string().trim().optional(),
    condition: z.enum(["new", "used"]).optional(),
    negotiable: z.boolean().default(false),
    publish: z.boolean().default(false).describe("Publish immediately instead of saving as a draft."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { publish, ...fields } = input;
    const { data, error } = await supabase
      .from("listings")
      .insert({
        ...fields,
        seller_id: ctx.getUserId()!,
        status: publish ? "active" : "draft",
        published_at: publish ? new Date().toISOString() : null,
      })
      .select()
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { listing: data },
    };
  },
});
