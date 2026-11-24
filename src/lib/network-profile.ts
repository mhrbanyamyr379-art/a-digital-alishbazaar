import { useSyncExternalStore } from "react";

export interface ConnectionHints {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export type NetworkProfile = "fast" | "constrained" | "unknown";

// Hints only: no speed-test downloads or waiting before showing a page.
export function classifyConnection(connection?: ConnectionHints): NetworkProfile {
  if (!connection) return "unknown";
  if (connection.saveData || ["slow-2g", "2g", "3g"].includes(connection.effectiveType ?? "")) return "constrained";
  if ((connection.downlink != null && connection.downlink < 1.5) || (connection.rtt != null && connection.rtt > 300)) return "constrained";
  if (connection.effectiveType === "4g" && connection.downlink != null && connection.downlink >= 5 && connection.rtt != null && connection.rtt <= 150) return "fast";
  return "unknown";
}

type BrowserConnection = ConnectionHints & EventTarget;

function connection(): BrowserConnection | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as Navigator & { connection?: BrowserConnection }).connection;
}

function snapshot(): NetworkProfile {
  if (typeof navigator !== "undefined" && !navigator.onLine) return "constrained";
  return classifyConnection(connection());
}

function subscribe(notify: () => void) {
  const current = connection();
  current?.addEventListener("change", notify);
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  return () => {
    current?.removeEventListener("change", notify);
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
}

const serverSnapshot = (): NetworkProfile => "unknown";
export function useNetworkProfile() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}