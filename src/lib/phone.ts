/** Phone helpers for Afghanistan-first, international-friendly OTP auth. */

/** Convert Arabic/Persian digits to ASCII. */
function toAsciiDigits(input: string): string {
  return input.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (d) => {
    const code = d.charCodeAt(0);
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - base);
  });
}

/**
 * Normalize user input to E.164.
 * - "0700123456" / "700123456" → "+93700123456" (Afghanistan default)
 * - "93700123456" → "+93700123456"
 * - "+491701234567" → unchanged (international preserved)
 * Returns null when the result isn't a plausible E.164 number.
 */
export function normalizePhone(raw: string): string | null {
  const cleaned = toAsciiDigits(raw).replace(/[\s\-().]/g, "").trim();
  if (!cleaned) return null;

  let e164: string;
  if (cleaned.startsWith("+")) {
    e164 = "+" + cleaned.slice(1).replace(/\D/g, "");
  } else if (cleaned.startsWith("00")) {
    e164 = "+" + cleaned.slice(2).replace(/\D/g, "");
  } else {
    const digits = cleaned.replace(/\D/g, "");
    if (digits.startsWith("93") && digits.length >= 11) e164 = "+" + digits;
    else if (digits.startsWith("0")) e164 = "+93" + digits.slice(1);
    else e164 = "+93" + digits;
  }

  if (!/^\+[1-9]\d{7,14}$/.test(e164)) return null;
  // Afghan mobile numbers are +93 followed by 9 digits starting with 7.
  if (e164.startsWith("+93") && !/^\+937\d{8}$/.test(e164)) return null;
  return e164;
}

/** Display form, always LTR-safe. */
export function formatPhone(e164: string): string {
  return e164;
}

/** Map a Supabase auth error to a translation key. */
export function phoneAuthErrorKey(err: unknown): string {
  const anyErr = err as { message?: string; code?: string; status?: number } | null;
  const code = (anyErr?.code ?? "").toLowerCase();
  const msg = (anyErr?.message ?? "").toLowerCase();

  if (code.includes("phone_provider_disabled") || msg.includes("unsupported phone provider"))
    return "errPhoneDisabled";
  if (code.includes("over_sms_send_rate_limit") || code.includes("over_request_rate_limit") || anyErr?.status === 429)
    return "errTooManyOtp";
  if (msg.includes("expired")) return "errExpiredOtp";
  if (code.includes("otp_expired")) return "errExpiredOtp";
  if (code.includes("otp_disabled") || msg.includes("invalid") || msg.includes("token")) return "errInvalidOtp";
  if (msg.includes("sms") || msg.includes("send")) return "errSmsFailed";
  return "errorTitle";
}
