import { beforeEach, describe, expect, it, vi } from "vitest";

const owner = "11111111-1111-4111-8111-111111111111";
const otherUser = "22222222-2222-4222-8222-222222222222";
const path = `${owner}/me/photo.jpg`;

const mocks = vi.hoisted(() => ({
  profiles: [] as { id: string; avatar_url: string }[],
  filters: [] as [string, string][],
  lookupError: null as null | { message: string },
  createSignedUrl: vi.fn(),
  from: vi.fn(),
}));

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
    storage: { from: () => ({ createSignedUrl: mocks.createSignedUrl }) },
  },
}));

import { signAvatarImage } from "./avatar-images.functions";

describe("profile photo owner authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.profiles = [];
    mocks.filters = [];
    mocks.lookupError = null;
    const query = {
      select: () => query,
      eq: (column: string, value: string) => {
        mocks.filters.push([column, value]);
        return query;
      },
      limit: async () => ({
        data: mocks.profiles.filter((row) => mocks.filters.every(([column, value]) =>
          column === "id" ? row.id === value : row.avatar_url === value,
        )),
        error: mocks.lookupError,
      }),
    };
    mocks.from.mockReturnValue(query);
    mocks.createSignedUrl.mockResolvedValue({ data: { signedUrl: "signed-avatar" }, error: null });
  });

  it("allows visitors to see a photo selected by its actual owner", async () => {
    mocks.profiles = [{ id: owner, avatar_url: path }];
    expect(await signAvatarImage({ data: { path } })).toEqual({ url: "signed-avatar" });
    expect(mocks.filters).toContainEqual(["id", owner]);
    expect(mocks.createSignedUrl).toHaveBeenCalledWith(path, 600);
  });

  it("blocks another user's reference to a private owner photo", async () => {
    mocks.profiles = [{ id: otherUser, avatar_url: path }];
    expect(await signAvatarImage({ data: { path } })).toEqual({ url: null });
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });

  it("does not expose an old photo when its owner selected a different one", async () => {
    mocks.profiles = [
      { id: owner, avatar_url: `${owner}/me/new.jpg` },
      { id: otherUser, avatar_url: path },
    ];
    expect(await signAvatarImage({ data: { path } })).toEqual({ url: null });
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });

  it("fails closed when no profile authorizes the photo or lookup fails", async () => {
    expect(await signAvatarImage({ data: { path } })).toEqual({ url: null });
    mocks.profiles = [{ id: owner, avatar_url: path }];
    mocks.lookupError = { message: "lookup failed" };
    expect(await signAvatarImage({ data: { path } })).toEqual({ url: null });
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });

  it("rejects traversal, encoded paths, external addresses and malformed folders", async () => {
    for (const invalid of [
      `${owner}/../private.jpg`, `${owner}/./photo.jpg`, `${owner}/%2e%2e/photo.jpg`,
      `${owner}//photo.jpg`, `${owner}/me\\photo.jpg`, "https://example.com/photo.jpg",
      "someone/me/photo.jpg", `${owner}/`,
    ]) {
      await expect(async () => signAvatarImage({ data: { path: invalid } })).rejects.toThrow();
    }
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });
});