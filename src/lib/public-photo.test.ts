import { describe, expect, it } from "vitest";
import { immediatePhotoSource, publicPhotoUrl } from "./public-photo";

describe("immediate photo loading", () => {
  const path = "11111111-1111-4111-8111-111111111111/photo.webp";
  it("starts public listing requests without awaiting effects or signing", () => {
    expect(immediatePhotoSource("listings", path)).toBe(publicPhotoUrl("listings", path));
  });
  it("starts profile photos through the revocation-checking endpoint", () => {
    expect(immediatePhotoSource("avatars", path)).toBe(publicPhotoUrl("avatars", path));
  });
  it("does not expose private chat paths as public photos", () => {
    expect(immediatePhotoSource("chat-images", path)).toBeNull();
  });
  it("keeps local upload previews immediately available", () => {
    expect(immediatePhotoSource("listings", "blob:preview")).toBe("blob:preview");
  });
});