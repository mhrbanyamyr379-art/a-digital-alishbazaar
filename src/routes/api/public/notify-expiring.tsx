import { createFileRoute } from "@tanstack/react-router";

/**
 * Cron endpoint: creates "your listing is expiring soon" notifications.
 * Call with header `x-cron-secret: <CRON_SECRET>` from any scheduler.
 */
export const Route = createFileRoute("/api/public/notify-expiring")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["CRON_SECRET"];
        const provided = request.headers.get("x-cron-secret") ?? "";
        if (!secret || provided.length !== secret.length || provided !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("notify_expiring_listings");
        if (error) {
          return new Response(JSON.stringify({ ok: false }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ ok: true, created: data ?? 0 }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
