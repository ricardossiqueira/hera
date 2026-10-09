import { createRootRoute, createRoute, createRouter, Outlet, redirect } from "@tanstack/react-router";
import { AuthenticatedApp } from "@/components/authenticated-app";
import { Landing } from "@/pages/landing";
import { AutomationsList } from "@/pages/automations";
import { EditAutomation, NewAutomation } from "@/pages/automations/new";
import { AutomationDetail } from "@/pages/automations/detail";
import { Devices } from "@/pages/devices";
import { DeviceDetail } from "@/pages/devices/detail";
import { Discovery } from "@/pages/discovery";
import { RegisterDiscoveredDevice } from "@/pages/discovery/register";
import { Overview } from "@/pages/overview";
import { Queue } from "@/pages/queue";
import { AppSettings } from "@/pages/settings";

const rootRoute = createRootRoute({ component: Outlet });
const landingRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: Landing });
// This pathless parent protects every operational page, including deep links.
// Credentials remain in memory; the data provider only mounts after login.
const appRoute = createRoute({ getParentRoute: () => rootRoute, id: "app", component: AuthenticatedApp });
const overviewRoute = createRoute({ getParentRoute: () => appRoute, path: "overview", component: Overview });
// /devices is a layout route. Its children need this Outlet; otherwise a Link
// changes the URL but the list component keeps rendering over every child.
const devicesRoute = createRoute({ getParentRoute: () => appRoute, path: "devices", component: Outlet });
const devicesIndexRoute = createRoute({ getParentRoute: () => devicesRoute, path: "/", component: Devices });
const discoveryRoute = createRoute({ getParentRoute: () => appRoute, path: "discovery", component: Outlet });
const discoveryIndexRoute = createRoute({ getParentRoute: () => discoveryRoute, path: "/", component: Discovery });
const registerDiscoveredDeviceRoute = createRoute({ getParentRoute: () => discoveryRoute, path: "$deviceUid", component: RegisterDiscoveredDevice });
const legacyDiscoveryRoute = createRoute({ getParentRoute: () => devicesRoute, path: "discovery", beforeLoad: () => { throw redirect({ to: "/discovery", replace: true }); } });
const legacyRegisterRoute = createRoute({ getParentRoute: () => devicesRoute, path: "discovery/$deviceUid", beforeLoad: ({ params }) => { throw redirect({ to: "/discovery/$deviceUid", params, replace: true }); } });
const detailRoute = createRoute({ getParentRoute: () => devicesRoute, path: "$deviceId", component: DeviceDetail });
const queueRoute = createRoute({ getParentRoute: () => appRoute, path: "queue", component: Queue });
// Details reuse the canvas in read-only mode; V2 has no update/remove RPC.
const automationsRoute = createRoute({ getParentRoute: () => appRoute, path: "automations", component: Outlet });
const automationsIndexRoute = createRoute({ getParentRoute: () => automationsRoute, path: "/", component: AutomationsList });
const newAutomationRoute = createRoute({ getParentRoute: () => automationsRoute, path: "new", component: NewAutomation });
const automationDetailRoute = createRoute({ getParentRoute: () => automationsRoute, path: "$ruleId", component: AutomationDetail });
const editAutomationRoute = createRoute({ getParentRoute: () => automationsRoute, path: "$ruleId/edit", component: EditAutomation });
const appSettingsRoute = createRoute({ getParentRoute: () => appRoute, path: "settings", component: AppSettings });

const routeTree = rootRoute.addChildren([
  landingRoute,
  appRoute.addChildren([
    overviewRoute,
    devicesRoute.addChildren([devicesIndexRoute, legacyDiscoveryRoute, legacyRegisterRoute, detailRoute]),
    discoveryRoute.addChildren([discoveryIndexRoute, registerDiscoveredDeviceRoute]),
    queueRoute,
    automationsRoute.addChildren([automationsIndexRoute, newAutomationRoute, automationDetailRoute, editAutomationRoute]),
    appSettingsRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
