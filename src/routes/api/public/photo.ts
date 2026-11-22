import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/photo")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { servePublicPhoto } = await import("@/lib/public-photo.server");
        return servePublicPhoto(request);
      },
    },
  },
});