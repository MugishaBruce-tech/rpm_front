import { createBrowserRouter } from "react-router";
import { MainLayout } from "./components/main-layout";
import { Dashboard } from "./components/dashboard";
import { StockManagement } from "./components/stock-management";
import { Loans } from "./components/loans";
import { Login } from "./components/login";
import { UserManagement } from "./components/user-management";
import { UserList } from "./components/user-list";
import { UserEdit } from "./components/user-edit";
import { ColorSettings } from "./components/color-settings";
import { AuthGuard } from "./components/auth-guard";
import { PermissionsManager } from "./components/permissions/PermissionsManager";
import { UsersStockDirectory, UsersLoansDirectory } from "./components/users-directory";
import { OPCORegionalInventory, OPCORegionalLoans, OPCOUserDirectory } from "./components/OPCOView";

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
        ],
      },
    ],
  },
]);
