import { createRootRoute, createRoute, createRouter, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { AutomationsList } from "@/pages/automations";
import { AutomationDetail } from "@/pages/automations/detail";
import { NewAutomation } from "@/pages/automations/new";
import { Devices } from "@/pages/devices";
import { DeviceDetail } from "@/pages/devices/detail";
import { NewDevice } from "@/pages/devices/new";
import { RemoveDevice } from "@/pages/devices/remove";
import { DeviceSettings } from "@/pages/devices/settings";
import { Manifests } from "@/pages/manifests";
import { Diagnostics } from "@/pages/diagnostics";
import { Overview } from "@/pages/overview";
import { Queue } from "@/pages/queue";
import { Routes } from "@/pages/routes";
import { AppSettings } from "@/pages/settings";

const rootRoute = createRootRoute({ component: AppShell });
const overviewRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: Overview });
// /devices is a layout route. Its children need this Outlet; otherwise a Link
// changes the URL but the list component keeps rendering over every child.
const devicesRoute = createRoute({ getParentRoute: () => rootRoute, path: "devices", component: Outlet });
const devicesIndexRoute = createRoute({ getParentRoute: () => devicesRoute, path: "/", component: Devices });
const newDeviceRoute = createRoute({ getParentRoute: () => devicesRoute, path: "new", component: NewDevice });
const detailRoute = createRoute({ getParentRoute: () => devicesRoute, path: "$deviceId", component: DeviceDetail });
const settingsRoute = createRoute({ getParentRoute: () => devicesRoute, path: "$deviceId/settings", component: DeviceSettings });
const removeDeviceRoute = createRoute({ getParentRoute: () => devicesRoute, path: "$deviceId/remove", component: RemoveDevice });
const queueRoute = createRoute({ getParentRoute: () => rootRoute, path: "queue", component: Queue });
const routesRoute = createRoute({ getParentRoute: () => rootRoute, path: "routes", component: Routes });
const manifestsRoute = createRoute({ getParentRoute: () => rootRoute, path: "manifests", component: Manifests });
// /automations is a layout route, same reasoning as /devices above: each
// rule gets its own canvas (new.tsx / detail.tsx), not a single shared
// one, so it needs its own sub-routes.
const automationsRoute = createRoute({ getParentRoute: () => rootRoute, path: "automations", component: Outlet });
const automationsIndexRoute = createRoute({ getParentRoute: () => automationsRoute, path: "/", component: AutomationsList });
const newAutomationRoute = createRoute({ getParentRoute: () => automationsRoute, path: "new", component: NewAutomation });
const automationDetailRoute = createRoute({ getParentRoute: () => automationsRoute, path: "$ruleId", component: AutomationDetail });
const diagnosticsRoute = createRoute({ getParentRoute: () => rootRoute, path: "diagnostics", component: Diagnostics });
const appSettingsRoute = createRoute({ getParentRoute: () => rootRoute, path: "settings", component: AppSettings });

const routeTree = rootRoute.addChildren([
  overviewRoute,
  devicesRoute.addChildren([devicesIndexRoute, newDeviceRoute, detailRoute, settingsRoute, removeDeviceRoute]),
  queueRoute,
  routesRoute,
  manifestsRoute,
  automationsRoute.addChildren([automationsIndexRoute, newAutomationRoute, automationDetailRoute]),
  diagnosticsRoute,
  appSettingsRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
