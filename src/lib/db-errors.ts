/**
 * Maps a Postgres/Supabase error to a safe, translatable message key.
 * Raw database errors are only logged in dev, never shown to the user.
 */
export type DbErrorKey =
  | "notAuthorized"
  | "notFoundRecord"
  | "sessionExpired"
  | "networkError"
  | "actionFailed";

export function dbErrorKey(err: unknown): DbErrorKey {
  if (import.meta.env.DEV) console.error("[db]", err);
  const e = err as { code?: string; message?: string; status?: number } | null;
  const code = (e?.code ?? "").toLowerCase();
  const msg = (e?.message ?? "").toLowerCase();
  if (code === "42501" || msg.includes("not authorized") || msg.includes("permission denied")) return "notAuthorized";
  if (code === "p0002" || code === "pgrst116" || msg.includes("not found")) return "notFoundRecord";
  if (e?.status === 401 || msg.includes("jwt") || msg.includes("token is expired")) return "sessionExpired";
  if (msg.includes("failed to fetch") || msg.includes("network")) return "networkError";
  return "actionFailed";
}
