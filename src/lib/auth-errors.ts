/** Maps Supabase auth errors to friendly, localized message keys. */
export function authErrorKey(err: unknown): string {
  const e = err as { message?: string; code?: string; status?: number } | null;
  const code = (e?.code ?? "").toLowerCase();
  const msg = (e?.message ?? "").toLowerCase();

  if (code === "email_not_confirmed" || msg.includes("email not confirmed")) return "errEmailNotConfirmed";
  if (code === "user_already_exists" || code === "email_exists" || msg.includes("already registered"))
    return "errEmailExists";
  if (code === "weak_password" || msg.includes("password should be at least")) return "errWeakPassword";
  if (code === "validation_failed" || msg.includes("invalid email") || msg.includes("unable to validate email"))
    return "errInvalidEmail";
  if (code === "invalid_credentials" || msg.includes("invalid login credentials")) return "errInvalidCredentials";
  if (e?.status === 429 || code.includes("rate_limit") || msg.includes("rate limit")) return "errTooManyRequests";
  return "errorTitle";
}
