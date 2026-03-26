import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router";
import { MainLayout } from "./components/main-layout";
import { Login } from "./components/login";
import { AuthGuard } from "./components/auth-guard";

// Lazy load components
const Dashboard = lazy(() => import("./components/dashboard").then(m => ({ default: m.Dashboard })));
const StockManagement = lazy(() => import("./components/stock-management").then(m => ({ default: m.StockManagement })));
const Loans = lazy(() => import("./components/loans").then(m => ({ default: m.Loans })));
const UserManagement = lazy(() => import("./components/user-management").then(m => ({ default: m.UserManagement })));
const UserList = lazy(() => import("./components/user-list").then(m => ({ default: m.UserList })));
const UserEdit = lazy(() => import("./components/user-edit").then(m => ({ default: m.UserEdit })));
const ColorSettings = lazy(() => import("./components/color-settings").then(m => ({ default: m.ColorSettings })));
const PermissionsManager = lazy(() => import("./components/permissions/PermissionsManager").then(m => ({ default: m.PermissionsManager })));
const UsersStockDirectory = lazy(() => import("./components/users-directory").then(m => ({ default: m.UsersStockDirectory })));
const UsersLoansDirectory = lazy(() => import("./components/users-directory").then(m => ({ default: m.UsersLoansDirectory })));
const OPCORegionalInventory = lazy(() => import("./components/OPCOView").then(m => ({ default: m.OPCORegionalInventory })));
const OPCORegionalLoans = lazy(() => import("./components/OPCOView").then(m => ({ default: m.OPCORegionalLoans })));
const OPCOUserDirectory = lazy(() => import("./components/OPCOView").then(m => ({ default: m.OPCOUserDirectory })));
const AuditLogs = lazy(() => import("./components/audit-logs"));
const BusinessPartnerList = lazy(() => import("./components/business-partner-list").then(m => ({ default: m.BusinessPartnerList })));
const BrarudiUserList = lazy(() => import("./components/brarudi-user-list").then(m => ({ default: m.BrarudiUserList })));

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/",
    Component: AuthGuard,
    children: [
      {
        path: "/",
        Component: MainLayout,
        children: [
          { index: true, Component: Dashboard },
          { path: "stock-management", Component: StockManagement },
          { path: "loans", Component: Loans },
          { path: "admin/business-partners", Component: BusinessPartnerList },
          { path: "admin/brarudi-users", Component: BrarudiUserList },
          { path: "settings/users", Component: UserList },
          { path: "settings/users/:id/edit", Component: UserEdit },
          { path: "settings/appearance", Component: ColorSettings },
          { path: "settings/permissions", Component: PermissionsManager },
          { path: "user-management", Component: UserManagement },
          { path: "admin/users-stock", Component: UsersStockDirectory },
          { path: "admin/users-loans", Component: UsersLoansDirectory },
          { path: "opco/regional-inventory", Component: OPCORegionalInventory },
          { path: "opco/regional-loans", Component: OPCORegionalLoans },
          { path: "opco/users", Component: OPCOUserDirectory },
          { path: "admin/audit-logs", Component: AuditLogs },
        ],
      },
    ],
  },
]);
