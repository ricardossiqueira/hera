import { useSyncExternalStore } from "react";
import { type Credentials, getCredentials, subscribeCredentials } from "@/api/auth";

/** Re-renders whenever ./api/auth's in-memory credential changes (login, logout, or a 401 dropping it). */
export function useCredentials(): Credentials | undefined {
  return useSyncExternalStore(subscribeCredentials, getCredentials);
}
