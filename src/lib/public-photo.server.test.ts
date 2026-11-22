import { beforeEach, describe, expect, it, vi } from "vitest";

const owner = "11111111-1111-4111-8111-111111111111";
const path = `${owner}/photo.jpg`;
const mocks = vi.hoisted(() => ({
  status: "active",
  banned: false,
  owner: "11111111-1111-4111-8111-111111111111",
  reference: "11111111-1111-4111-8111-111111111111/photo.jpg",
  lookupError: false,
  download: vi.fn(),
  createSignedUrl: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: mocks.from,
    storage: { from: () => ({ download: mocks.download, createSignedUrl: mocks.createSignedUrl }) },
  },
}));

import { servePublicPhoto } from "./public-photo.server";

function request(bucket = "listings", photo = path) {
  return new Request(`https://alish.example/api/public/photo?bucket=${bucket}&path=${encodeURIComponent(photo)}`);
}

describe("public photo request-time access revocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.status = "active";
    mocks.banned = false;
    mocks.owner = owner;
    mocks.reference = path;
    mocks.lookupError = false;
    mocks.download.mockResolvedValue({ data: new Blob(["photo"], { type: "image/jpeg" }), error: null });
    mocks.from.mockImplementation((table: string) => {
      const filters: [string, unknown][] = [];
      const query = {
        select: () => query,
        eq: (key: string, value: unknown) => { filters.push([key, value]); return query; },
        limit: async () => {
          const row: Record<string, unknown> = table === "profiles"
            ? { id: mocks.owner, avatar_url: mocks.reference, is_banned: mocks.banned }
            : { url: mocks.reference, "listings.status": mocks.status, "listings.seller_id": mocks.owner };
          return {
            data: filters.every(([key, value]) => row[key] === value) ? [row] : [],
            error: mocks.lookupError ? { message: "private error details" } : null,
          };
        },
      };
      return query;
    });
  });

  it.each(["listings", "avatars"])("delivers %s bytes without reusable tokens or caches", async (bucket) => {
    const response = await servePublicPhoto(request(bucket));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("photo");
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("CDN-Cache-Control")).toBe("no-store");
    expect(response.headers.has("Location")).toBe(false);
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });

  it.each(["draft", "pending", "rejected", "suspended", "expired", "sold"])("saved listing URLs stop working when status becomes %s", async (status) => {
    const saved = request();
    expect((await servePublicPhoto(saved)).status).toBe(200);
    mocks.status = status;
    expect((await servePublicPhoto(saved)).status).toBe(404);
    expect(mocks.download).toHaveBeenCalledTimes(1);
  });

  it("saved avatar URLs stop working immediately after a ban", async () => {
    const saved = request("avatars");
    expect((await servePublicPhoto(saved)).status).toBe(200);
    mocks.banned = true;
    expect((await servePublicPhoto(saved)).status).toBe(404);
    expect(mocks.download).toHaveBeenCalledTimes(1);
  });

  it.each(["listings", "avatars"])("rejects forged ownership and replaced references for %s", async (bucket) => {
    mocks.owner = "22222222-2222-4222-8222-222222222222";
    expect((await servePublicPhoto(request(bucket))).status).toBe(404);
    mocks.owner = owner;
    mocks.reference = `${owner}/new.jpg`;
    expect((await servePublicPhoto(request(bucket))).status).toBe(404);
    expect(mocks.download).not.toHaveBeenCalled();
  });

  it("fails closed on invalid paths, unsupported buckets and missing objects", async () => {
    for (const invalid of [`${owner}/../photo.jpg`, `${owner}/%2e%2e/photo.jpg`, "https://example.com/x.jpg"])
      expect((await servePublicPhoto(request("listings", invalid))).status).toBe(404);
    expect((await servePublicPhoto(request("chat-images"))).status).toBe(404);
    expect(mocks.from).not.toHaveBeenCalled();
    mocks.download.mockResolvedValue({ data: null, error: { message: "private error details" } });
    const response = await servePublicPhoto(request());
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Photo unavailable");
  });

  it("does not read storage after a failed authorization lookup", async () => {
    mocks.lookupError = true;
    expect((await servePublicPhoto(request())).status).toBe(404);
    expect(mocks.download).not.toHaveBeenCalled();
  });
});