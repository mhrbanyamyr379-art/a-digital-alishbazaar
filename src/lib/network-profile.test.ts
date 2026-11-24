import { describe, expect, it } from "vitest";
import { classifyConnection } from "./network-profile";

describe("adaptive loading without network probes", () => {
  it("accelerates only a strong low-latency connection", () => {
    expect(classifyConnection({ effectiveType: "4g", downlink: 10, rtt: 50 })).toBe("fast");
  });
  it("preserves light loading for 3G", () => {
    expect(classifyConnection({ effectiveType: "3g", downlink: 1, rtt: 200 })).toBe("constrained");
  });
  it("does not mistake slow 4G for fast internet", () => {
    expect(classifyConnection({ effectiveType: "4g", downlink: 0.8, rtt: 80 })).toBe("constrained");
  });
  it("respects data saver even with strong internet", () => {
    expect(classifyConnection({ effectiveType: "4g", downlink: 10, rtt: 50, saveData: true })).toBe("constrained");
  });
  it("does not accelerate a high-latency connection", () => {
    expect(classifyConnection({ effectiveType: "4g", downlink: 10, rtt: 500 })).toBe("constrained");
  });
  it("uses native loading without speculation when hints are unavailable", () => {
    expect(classifyConnection()).toBe("unknown");
    expect(classifyConnection({ effectiveType: "4g" })).toBe("unknown");
  });
});