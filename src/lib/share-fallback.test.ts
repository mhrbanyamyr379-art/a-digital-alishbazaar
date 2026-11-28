import { describe, expect, it } from "vitest";
import { directShareLinks } from "./share-fallback";

describe("direct Android fallback sharing", () => {
  const data = { title: "ماشین خیاطی", text: "سالم & آماده فروش", url: "https://a-digital-alishbazaar.lovable.app/listing/ad-1" };
  it("sends the title, description and direct listing URL to WhatsApp", () => {
    const link = new URL(directShareLinks(data).whatsapp);
    expect(link.origin).toBe("https://wa.me");
    expect(link.searchParams.get("text")).toBe("ماشین خیاطی\nسالم & آماده فروش\nhttps://a-digital-alishbazaar.lovable.app/listing/ad-1");
  });
  it("sends the title, description and direct listing URL to Telegram", () => {
    const link = new URL(directShareLinks(data).telegram);
    expect(link.origin).toBe("https://t.me");
    expect(link.searchParams.get("url")).toBe(data.url);
    expect(link.searchParams.get("text")).toBe("ماشین خیاطی\nسالم & آماده فروش");
  });
});