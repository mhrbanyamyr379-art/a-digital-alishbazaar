import { beforeEach, describe, expect, it, vi } from "vitest";
import { useShare } from "./useShare";
import { nativeShare, copyShareLink } from "../lib/share";
import { toast } from "sonner";
import { shareFallbackStore } from "../lib/share-fallback";

vi.mock("react", () => ({ useRef: () => ({ current: false }) }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock("@/lib/share", () => ({ nativeShare: vi.fn(), copyShareLink: vi.fn() }));
vi.mock("sonner", () => ({ toast: { message: vi.fn(), success: vi.fn(), error: vi.fn() } }));

describe("Share button clipboard and completion rules", () => {
  const payload = { title: "ماشین خیاطی", text: "ماشین سالم", url: "https://a-digital-alishbazaar.lovable.app/listing/ad-1" };
  beforeEach(() => { vi.clearAllMocks(); shareFallbackStore.close(); });
  it("copies only after the user selects the unsupported-browser fallback", async () => {
    vi.mocked(nativeShare).mockResolvedValue("unsupported");
    await useShare()(payload);
    expect(copyShareLink).not.toHaveBeenCalled();
    expect(shareFallbackStore.getSnapshot()?.data).toEqual(payload);
    expect(toast.error).not.toHaveBeenCalled();
  });
  it("does not copy, show fallback or record a share after cancellation", async () => {
    const result = "cancelled";
    vi.mocked(nativeShare).mockResolvedValue(result);
    const completed = vi.fn();
    await useShare()(payload, completed);
    expect(copyShareLink).not.toHaveBeenCalled();
    expect(completed).not.toHaveBeenCalled();
    expect(toast.message).not.toHaveBeenCalled();
    expect(shareFallbackStore.getSnapshot()).toBeNull();
  });
  it("opens fallback choices instead of an error for blocked native sharing", async () => {
    vi.mocked(nativeShare).mockResolvedValue("failed");
    const completed = vi.fn();
    await useShare()(payload, completed);
    expect(shareFallbackStore.getSnapshot()?.data).toEqual(payload);
    expect(toast.error).not.toHaveBeenCalled();
    expect(copyShareLink).not.toHaveBeenCalled();
    expect(completed).not.toHaveBeenCalled();
  });
  it("records completion only after successful native sharing", async () => {
    vi.mocked(nativeShare).mockResolvedValue("shared");
    const completed = vi.fn();
    await useShare()(payload, completed);
    expect(completed).toHaveBeenCalledOnce();
    expect(copyShareLink).not.toHaveBeenCalled();
  });
  it("does not open two share menus for repeated taps", async () => {
    let finish: ((value: "shared") => void) | undefined;
    vi.mocked(nativeShare).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const share = useShare();
    const first = share(payload);
    await share(payload);
    expect(nativeShare).toHaveBeenCalledOnce();
    finish?.("shared");
    await first;
  });
});