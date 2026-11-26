import { describe, expect, it, vi } from "vitest";
import { nativeShare, shareData } from "./share";

describe("system sharing", () => {
  const data = shareData("listing", "ad-1", "ماشین خیاطی", "  ماشین سالم\nبرای فروش  ");
  it("includes the listing title, short description and public direct link", () => {
    expect(data).toEqual({ title: "ماشین خیاطی", text: "ماشین سالم برای فروش", url: "https://a-digital-alishbazaar.lovable.app/listing/ad-1" });
  });
  it("shortens long descriptions", () => {
    expect(shareData("listing", "ad-1", "Title", "x".repeat(300)).text).toHaveLength(178);
  });
  it("uses the public seller URL without browser query parameters", () => {
    expect(shareData("seller", "seller-1", "Sami", "Seller bio")).toEqual({ title: "Sami", text: "Seller bio", url: "https://a-digital-alishbazaar.lovable.app/seller/seller-1" });
  });
  it("calls native sharing immediately, before yielding to a promise", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const pending = nativeShare(data, { share, canShare: () => true });
    expect(share).toHaveBeenCalledWith(data);
    expect(await pending).toBe("shared");
  });
  it("supports browsers that have share but not canShare", async () => {
    expect(await nativeShare(data, { share: vi.fn().mockResolvedValue(undefined) })).toBe("shared");
  });
  it("does not turn user cancellation into a copy fallback", async () => {
    expect(await nativeShare(data, { share: vi.fn().mockRejectedValue(new DOMException("Cancelled", "AbortError")), canShare: () => true })).toBe("cancelled");
  });
  it("does not turn blocked sharing into a copy fallback", async () => {
    expect(await nativeShare(data, { share: vi.fn().mockRejectedValue(new DOMException("Blocked", "NotAllowedError")), canShare: () => true })).toBe("failed");
  });
  it("handles synchronous native errors without throwing", async () => {
    expect(await nativeShare(data, { share: () => { throw new Error("Blocked"); }, canShare: () => true })).toBe("failed");
  });
  it("offers a fallback when share is missing", async () => {
    expect(await nativeShare(data, {})).toBe("unsupported");
  });
  it("does not call native share if the payload is unsupported", async () => {
    const share = vi.fn();
    expect(await nativeShare(data, { share, canShare: () => false })).toBe("unsupported");
    expect(share).not.toHaveBeenCalled();
  });
});