import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const eq = vi.fn();
  const select = vi.fn();
  const limit = vi.fn();
  const createSignedUrl = vi.fn();
  const storageFrom = vi.fn(() => ({ createSignedUrl }));
  const from = vi.fn(() => ({ select }));
  return { eq, select, limit, createSignedUrl, storageFrom, from };
});

// Exercise the real validator and handler without the framework transport.
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    inputValidator: (validate: (input: unknown) => unknown) => ({
      handler: (handler: (args: { data: unknown }) => Promise<unknown>) =>
        (args: { data: unknown }) => handler({ data: validate(args.data) }),
    }),
  }),
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: mocks.from,
    storage: { from: mocks.storageFrom },
  },
}));

import { signActiveListingImage } from "./listing-images.functions";

const seller = "11111111-1111-4111-8111-111111111111";
const otherSeller = "22222222-2222-4222-8222-222222222222";
const path = `${seller}/listing/photo.jpg`;

describe("listing photo signing authority", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.select.mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockReturnValue({ eq: mocks.eq, limit: mocks.limit });
    mocks.createSignedUrl.mockResolvedValue({ data: { signedUrl: "signed-photo" }, error: null });
  });

  it("signs an active listing photo only within its seller's folder", async () => {
    mocks.limit.mockResolvedValue({ data: [{ url: path }], error: null });
    expect(await signActiveListingImage({ data: { path } })).toEqual({ url: "signed-photo" });
    expect(mocks.eq).toHaveBeenCalledWith("url", path);
    expect(mocks.eq).toHaveBeenCalledWith("listings.status", "active");
    expect(mocks.eq).toHaveBeenCalledWith("listings.seller_id", seller);
    expect(mocks.createSignedUrl).toHaveBeenCalledWith(path, 600);
  });

  it("does not sign another seller's file attached to a caller-owned listing", async () => {
    const stolenPath = `${otherSeller}/private/photo.jpg`;
    mocks.limit.mockResolvedValue({ data: [], error: null });
    expect(await signActiveListingImage({ data: { path: stolenPath } })).toEqual({ url: null });
    expect(mocks.eq).toHaveBeenCalledWith("listings.seller_id", otherSeller);
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });

  it("fails closed for missing, inactive, or failed image lookups", async () => {
    for (const result of [
      { data: [], error: null },
      { data: null, error: { message: "lookup failed" } },
    ]) {
      mocks.limit.mockResolvedValue(result);
      expect(await signActiveListingImage({ data: { path } })).toEqual({ url: null });
    }
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });

  it("rejects traversal, encoded paths, external addresses and malformed folders", async () => {
    for (const invalid of [
      `${seller}/../private.jpg`, `${seller}/./photo.jpg`,
      `${seller}/%2e%2e/photo.jpg`, `${seller}//photo.jpg`,
      `${seller}/listing\\photo.jpg`, "https://example.com/photo.jpg",
      "someone/listing/photo.jpg", `${seller}/`,
    ]) {
      await expect(async () => signActiveListingImage({ data: { path: invalid } })).rejects.toThrow();
    }
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });
});