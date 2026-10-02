import { createRootRoute, createRoute, createRouter, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { AutomationsList } from "@/pages/automations";
import { NewAutomation } from "@/pages/automations/new";
import { Devices } from "@/pages/devices";
import { DeviceDetail } from "@/pages/devices/detail";
import { Discovery } from "@/pages/devices/discovery";
import { RegisterDiscoveredDevice } from "@/pages/devices/register";
import { Overview } from "@/pages/overview";
import { Queue } from "@/pages/queue";
import { AppSettings } from "@/pages/settings";

const rootRoute = createRootRoute({ component: AppShell });
const overviewRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: Overview });
// /devices is a layout route. Its children need this Outlet; otherwise a Link
// changes the URL but the list component keeps rendering over every child.
const devicesRoute = createRoute({ getParentRoute: () => rootRoute, path: "devices", component: Outlet });
const devicesIndexRoute = createRoute({ getParentRoute: () => devicesRoute, path: "/", component: Devices });
const discoveryRoute = createRoute({ getParentRoute: () => devicesRoute, path: "discovery", component: Discovery });
const registerDiscoveredDeviceRoute = createRoute({ getParentRoute: () => devicesRoute, path: "discovery/$deviceUid", component: RegisterDiscoveredDevice });
const detailRoute = createRoute({ getParentRoute: () => devicesRoute, path: "$deviceId", component: DeviceDetail });
const queueRoute = createRoute({ getParentRoute: () => rootRoute, path: "queue", component: Queue });
// /automations is a layout route, same reasoning as /devices above: each
// rule gets its own canvas (new.tsx), not a single shared one, so it needs
// its own sub-routes. There is no detail/$ruleId route any more - V1's
// edit flow was removed and V2 has no update/remove RPC yet (ADR-017).
const automationsRoute = createRoute({ getParentRoute: () => rootRoute, path: "automations", component: Outlet });
const automationsIndexRoute = createRoute({ getParentRoute: () => automationsRoute, path: "/", component: AutomationsList });
const newAutomationRoute = createRoute({ getParentRoute: () => automationsRoute, path: "new", component: NewAutomation });
const appSettingsRoute = createRoute({ getParentRoute: () => rootRoute, path: "settings", component: AppSettings });

const routeTree = rootRoute.addChildren([
  overviewRoute,
  devicesRoute.addChildren([devicesIndexRoute, discoveryRoute, registerDiscoveredDeviceRoute, detailRoute]),
  queueRoute,
  automationsRoute.addChildren([automationsIndexRoute, newAutomationRoute]),
  appSettingsRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
