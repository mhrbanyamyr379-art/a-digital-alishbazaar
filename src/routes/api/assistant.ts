import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { CATEGORIES, CONDITIONS } from "@/data/categories";
import { SUBCATEGORIES } from "@/data/subcategories";
import { PROVINCES } from "@/data/provinces";

const RUN_ID = "X-Lovable-AIG-Run-ID";

// Map a province given in any language (id, English, Dari, Pashto) to its stored id.
function provinceId(v: string | null): string | null {
  if (!v) return null;
  const s = v.trim().toLowerCase();
  const p = PROVINCES.find((p) => [p.id, p.en.toLowerCase(), p.fa, p.ps].includes(s))
    ?? PROVINCES.find((p) => p.en.toLowerCase().includes(s) || p.fa.includes(v.trim()) || s.includes(p.en.toLowerCase()));
  return p?.id ?? null;
}

function systemPrompt(lang: string, origin: string) {
  const cats = CATEGORIES.map((c) => {
    const subs = (SUBCATEGORIES[c.id] ?? []).map((s) => `${s.id}=${s.en}/${s.fa}`).join("; ");
    return `- ${c.id} (${c.en} / ${c.fa} / ${c.ps}): ${subs}`;
  }).join("\n");
  const provs = PROVINCES.map((p) => `${p.id}=${p.fa}`).join(", ");
  const conds = CONDITIONS.map((c) => `${c.id}=${c.fa}/${c.en}`).join(", ");
  return `You are "دستیار الیش" (Alish Assistant), the smart helper of Alish (الیش), Afghanistan's online marketplace for buying and selling across all 34 provinces.

LANGUAGE
- Detect the language of the user's LATEST message and reply in exactly that language: Dari/Persian (فارسی/دری), Pashto (پښتو) or English. Pashto uses letters like ټ ډ ړ ښ ږ ګ ځ څ ې ۍ ئ — if present, reply in Pashto. If the message has no clear language (e.g. only a photo or a number), use the interface language "${lang}" (fa=Dari, ps=Pashto, en=English).
- Use Afghan Dari vocabulary (موتر, ولایت, افغانی), not Iranian Persian.

STYLE
- Short, natural, warm and practical. Usually 1–5 sentences or a short list. No filler, no repeating the question.
- For how-to questions (buying, selling, posting an ad, searching) give clear numbered steps.
- Use light markdown only (bold, lists, links). No tables or headings.
- Use the conversation history: remember what the user already said (item, budget, province) and do not ask again.

ACCURACY
- Never invent listings, prices of specific ads, phone numbers, sellers, features or policies.
- If the request is ambiguous and a search would be pointless, ask ONE short, specific question (e.g. which province, or what budget). Otherwise act directly.

FINDING ITEMS
- Whenever the user wants to buy/find something, call search_listings. Map their words to category/subcategory ids, province id, city, price range, condition. Translate keywords so the title search matches (try a short core word, e.g. "کرولا" or "Corolla").
- If no results, retry once with fewer filters (drop query or city), then tell the user honestly and suggest broadening or saving time by checking back later.
- Show results as a short list: [title](${origin}/listing/ID) — price currency — province/city. Max 6.
- To contact a seller, tell them to open the ad and use the Call / WhatsApp / Telegram / Message buttons.

SITE GUIDE
- Post an ad: 1) sign in 2) press "چیزی بفروشید" (Sell) 3) choose category and subcategory (or type a custom one) 4) title, description, price (AFN or USD), negotiable, condition 5) up to 10 photos 6) province and city 7) contact method: call only, call & message (phone + optional WhatsApp), or message only 8) publish.
- Edit/sold: "آگهی‌های من" (My listings) → edit, or mark as Sold.
- Search: search bar on the home page, then filter by category, subcategory, province and price.
- Other: email or Google sign-in, messages between users, favorites, notifications, language switch (Dari/Pashto/English), report button on suspicious ads.
- Safety: meet in public places, inspect before paying, never pay in advance, beware too-cheap prices, report scams.

PHOTOS
- Users may attach photos with or without text. Describe what you see, identify the item, estimate condition and a realistic price range in AFN for Afghanistan, and suggest a category, title and short description for an ad — or answer the user's specific question about the photo.
- If a photo is blurry, dark or unclear, say so politely and ask for a clearer one. Never identify real people from faces.

DATA
Categories (id: subcategory ids):
${cats}
Province ids: ${provs}
Condition ids: ${conds}
Stay on marketplace topics politely.`;
}

export const Route = createFileRoute("/api/assistant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Signed-in users only: verify the caller's session before any AI spend.
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
        if (!token) return new Response("Unauthorized", { status: 401 });
        {
          const authDb = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data: claims, error: authErr } = await authDb.auth.getClaims(token);
          if (authErr || !claims?.claims?.sub) return new Response("Unauthorized", { status: 401 });
        }
        let body: { messages?: UIMessage[]; lang?: string };
        try {
          body = await request.json();
        } catch {
          // Client closed the connection mid-request (e.g. panel closed): not an error.
          if (request.signal.aborted) return new Response(null, { status: 499 });
          return new Response("Bad request", { status: 400 });
        }
        // Never trust caller-chosen roles: only user/assistant turns, with text/file parts only
        // (no system turns, no tool/reasoning parts injected into the model context).
        const messages: UIMessage[] = (Array.isArray(body.messages) ? body.messages.slice(-30) : [])
          .filter((m) => m && (m.role === "user" || m.role === "assistant") && Array.isArray(m.parts))
          .map((m, i) => ({
            id: typeof m.id === "string" ? m.id.slice(0, 100) : `m${i}`,
            role: m.role,
            parts: m.parts
              .filter((p) => p && (p.type === "text" || (p.type === "file" && m.role === "user")))
              .map((p) => (p.type === "text" ? { type: "text" as const, text: String(p.text ?? "").slice(0, 8000) } : p)),
          }))
          .filter((m) => m.parts.length > 0);
        if (messages.length && messages[messages.length - 1].role !== "user") return new Response("Bad request", { status: 400 });
        if (!messages.length) return new Response("Bad request", { status: 400 });
        // Only accept small inline image data; keep photos only in the latest messages.
        messages.forEach((m, idx) => {
          const recent = idx >= messages.length - 6;
          m.parts = (m.parts ?? []).map((p) => {
            if (p.type !== "file") return p;
            const ok = recent && m.role === "user" && typeof p.url === "string" && /^data:image\/(jpeg|png|webp|gif);base64,/.test(p.url) && p.url.length < 4_000_000;
            return ok ? p : { type: "text" as const, text: "[image]" };
          });
        });
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
          stopWhen: stepCountIs(5),
          tools: {
            search_listings: tool({
              description: "Search active Alish marketplace listings. Use null for unknown filters.",
              inputSchema: z.object({
                query: z.string().nullable().describe("Short keyword matched in title/description, in the user's language or English"),
                category: z.string().nullable().describe("Category id"),
                subcategory: z.string().nullable().describe("Subcategory id"),
                province: z.string().nullable().describe("Province id, e.g. kabul"),
                city: z.string().nullable().describe("City or district name"),
                condition: z.string().nullable().describe("Condition id"),
                currency: z.enum(["AFN", "USD"]).nullable(),
                maxPrice: z.number().nullable(),
                minPrice: z.number().nullable(),
                sort: z.enum(["newest", "price_low", "price_high"]).nullable(),
              }),
              execute: async ({ query, category, subcategory, province, city, condition, currency, maxPrice, minPrice, sort }) => {
                let q = db
                  .from("listings")
                  .select("id,title,price,currency,negotiable,category,subcategory,custom_subcategory,province,city,condition,created_at")
                  .eq("status", "active");
                q = sort === "price_low" ? q.order("price", { ascending: true })
                  : sort === "price_high" ? q.order("price", { ascending: false })
                  : q.order("created_at", { ascending: false });
                q = q.limit(8);
                const clean = (s: string) => s.replace(/[%,()]/g, " ").trim().slice(0, 60);
                if (query && clean(query)) { const k = clean(query); q = q.or(`title.ilike.%${k}%,description.ilike.%${k}%`); }
                if (category) q = q.eq("category", category);
                if (subcategory) q = q.eq("subcategory", subcategory);
                const pid = provinceId(province);
                if (pid) q = q.eq("province", pid);
                if (city && clean(city)) q = q.ilike("city", `%${clean(city)}%`);
                if (condition) q = q.eq("condition", condition);
                if (currency) q = q.eq("currency", currency);
                if (typeof minPrice === "number") q = q.gte("price", minPrice);
                if (typeof maxPrice === "number") q = q.lte("price", maxPrice);
                const { data, error } = await q;
                if (error) return { error: "search failed", listings: [] };
                return { count: data?.length ?? 0, listings: data ?? [] };
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

        const res = result.toUIMessageStreamResponse({
          originalMessages: messages,
          onError: () => (request.signal.aborted ? "aborted" : "error"),
        });
        if (runId) res.headers.set(RUN_ID, runId);
        return res;
      },
    },
  },
});
