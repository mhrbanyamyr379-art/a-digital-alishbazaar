import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { CATEGORIES } from "@/data/categories";

const RUN_ID = "X-Lovable-AIG-Run-ID";

function systemPrompt(lang: string, origin: string) {
  const cats = CATEGORIES.map((c) => `${c.id} (${c.fa} / ${c.en})`).join(", ");
  return `You are "دستیار الیش" (Alish Assistant), the friendly smart helper of Alish (الیش), Afghanistan's online marketplace for buying and selling across all 34 provinces.
Always reply in the same language the user writes in (Dari, Pashto or English). The user's interface language is "${lang}" (fa=Dari, ps=Pashto, en=English); use it when unclear. Keep answers short, warm and practical. Use markdown lightly.

You help with:
- Finding items: use the search_listings tool whenever the user wants to buy/find something. Link each result as [title](${origin}/listing/ID) with its price and province. If nothing is found, say so and suggest broadening the search.
- Selling: help write attractive titles and descriptions, suggest fair prices, and explain posting: press "چیزی بفروشید" (Sell something), choose category, add photos, price, province and contact method (call, chat, or both).
- Safety: meet in public places, inspect items before paying, never send money in advance, beware of too-good-to-be-true prices, report suspicious ads with the report button.
- Site help: accounts (email or Google sign-in), messages, favorites, notifications, marking ads as sold, editing ads, language switching.
Category ids: ${cats}.
Prices are usually in AFN (افغانی) or USD. Never invent listings, phone numbers or policies. Stay on topic politely.`;
}

export const Route = createFileRoute("/api/assistant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { messages?: UIMessage[]; lang?: string };
        try {
          body = await request.json();
        } catch {
          return new Response("Bad request", { status: 400 });
        }
        const messages = Array.isArray(body.messages) ? body.messages.slice(-30) : [];
        if (!messages.length) return new Response("Bad request", { status: 400 });
        const lang = ["fa", "ps", "en"].includes(body.lang ?? "") ? body.lang! : "fa";

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("AI not configured", { status: 500 });
        const sbUrl = process.env["SUPABASE_URL"]!;
        const sbKey = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        const db = createClient(sbUrl, sbKey, {
          auth: { persistSession: false },
          global: {
            fetch: (input, init) => {
              const h = new Headers(init?.headers);
              if (sbKey.startsWith("sb_") && h.get("Authorization") === `Bearer ${sbKey}`) h.delete("Authorization");
              h.set("apikey", sbKey);
              return fetch(input, { ...init, headers: h });
            },
          },
        });

        let runId = request.headers.get(RUN_ID)?.trim() || undefined;
        const provider = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey,
          headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          fetch: async (input, init) => {
            const headers = new Headers(init?.headers);
            if (runId && !headers.has(RUN_ID)) headers.set(RUN_ID, runId);
            const res = await fetch(input, { ...init, headers });
            runId ??= res.headers.get(RUN_ID)?.trim() || undefined;
            return res;
          },
        });

        const origin = new URL(request.url).origin;
        const result = streamText({
          model: provider.responses("openai/gpt-6-astra"),
          system: systemPrompt(lang, origin),
          messages: await convertToModelMessages(messages),
          abortSignal: request.signal,
          stopWhen: stepCountIs(4),
          tools: {
            search_listings: tool({
              description: "Search active Alish marketplace listings.",
              inputSchema: z.object({
                query: z.string().nullable().describe("Keyword in the title, in the user's language or English"),
                category: z.string().nullable().describe("Category id"),
                province: z.string().nullable().describe("Province name, e.g. Kabul / کابل"),
                maxPrice: z.number().nullable(),
                minPrice: z.number().nullable(),
              }),
              execute: async ({ query, category, province, maxPrice, minPrice }) => {
                let q = db
                  .from("listings")
                  .select("id,title,price,currency,category,province,city,condition")
                  .eq("status", "active")
                  .order("created_at", { ascending: false })
                  .limit(8);
                if (query) q = q.ilike("title", `%${query}%`);
                if (category) q = q.eq("category", category);
                if (province) q = q.ilike("province", `%${province}%`);
                if (typeof minPrice === "number") q = q.gte("price", minPrice);
                if (typeof maxPrice === "number") q = q.lte("price", maxPrice);
                const { data, error } = await q;
                if (error) return { error: "search failed", listings: [] };
                return { listings: data ?? [] };
              },
            }),
          },
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "low",
              reasoningSummary: "auto",
              store: false,
              include: ["reasoning.encrypted_content"],
            },
          },
        });

        const res = result.toUIMessageStreamResponse({ originalMessages: messages });
        if (runId) res.headers.set(RUN_ID, runId);
        return res;
      },
    },
  },
});
