import { useSyncExternalStore } from "react";
import { getAuthState, subscribeAuth } from "@/api/auth";

export function useAuth() {
  return useSyncExternalStore(subscribeAuth, getAuthState);
}
