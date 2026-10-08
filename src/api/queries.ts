import { QueryClient, queryOptions } from "@tanstack/react-query";
import { getDeviceV2, listAutomationRulesV2, listDiscoveryV2 } from "./device-v2";

export const queryKeys = {
  status: ["status"] as const,
  queueSummary: ["queue-summary"] as const,
  deviceOverview: ["device-overview"] as const,
  device: (deviceId: string) => ["device", deviceId] as const,
  discovery: ["discovery"] as const,
  automations: ["automations"] as const,
  recentEvents: ["recent-events"] as const,
};

// One client per authenticated mount: private data never survives logout.
export function createHeraQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10_000,
        retry: false,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
}

export const discoveryQuery = queryOptions({ queryKey: queryKeys.discovery, queryFn: () => listDiscoveryV2() });
export const automationsQuery = queryOptions({ queryKey: queryKeys.automations, queryFn: () => listAutomationRulesV2() });
export const deviceQuery = (deviceId: string) => queryOptions({ queryKey: queryKeys.device(deviceId), queryFn: () => getDeviceV2(deviceId) });
