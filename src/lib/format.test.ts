import { describe, expect, it } from "vitest";
import { formatPhoneIntl, formatSolarDate } from "./format";

describe("formatPhoneIntl", () => {
  it("formats an Afghan number as +93 79 586 3251", () => {
    expect(formatPhoneIntl("93795863251")).toBe("+93 79 586 3251");
    expect(formatPhoneIntl("+93795863251")).toBe("+93 79 586 3251");
    expect(formatPhoneIntl("0795863251")).toBe("+93 79 586 3251");
  });
});

describe("formatSolarDate", () => {
  it("shows the join date in Solar Hijri", () => {
    expect(formatSolarDate("2026-06-02T12:00:00Z", "fa")).toBe("۱۲ خرداد ۱۴۰۵");
  });
});
