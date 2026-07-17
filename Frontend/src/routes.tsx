import { createBrowserRouter, Navigate } from "react-router";
import { MainLayout } from "./components/layout/MainLayout";
import { AuthLayout } from "./components/layout/AuthLayout";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { Home } from "./pages/Home";
import { Pricing } from "./pages/Pricing";
import { Solutions } from "./pages/Solutions";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Dashboard } from "./pages/Dashboard";
import { InventoryDashboard } from "./pages/dashboard/InventoryDashboard";
import { PredictiveAnalyticsPage } from "./pages/dashboard/PredictiveAnalytics";
import { LeakageDetectionPage } from "./pages/dashboard/LeakageDetection";
import { FefoTrackingPage } from "./pages/dashboard/FefoTracking";
import { VendorCreditsPage } from "./pages/dashboard/VendorCredits";
// Admin pages
import { ManageUsers } from "./pages/admin/ManageUsers";
import { ManageProducts } from "./pages/admin/ManageProducts";
import { ManageCategories } from "./pages/admin/ManageCategories";
import { ManageSuppliers } from "./pages/admin/ManageSuppliers";
import { SystemSettings } from "./pages/admin/SystemSettings";
import { GenerateReports } from "./pages/admin/GenerateReports";
import { AuditLogs } from "./pages/admin/AuditLogs";
// Inventory pages
import { StockIn } from "./pages/inventory/StockIn";
import { StockOut } from "./pages/inventory/StockOut";
import { RecordWastage } from "./pages/inventory/RecordWastage";
import { ManageInventory } from "./pages/inventory/ManageInventory";
import { FEFOTracking } from "./pages/inventory/FEFOTracking";
import { Recommendations } from "./pages/inventory/Recommendations";
// Cashier pages
import { POSTerminal } from "./pages/cashier/POSTerminal";
import { ReturnsRefunds } from "./pages/cashier/ReturnsRefunds";
import { CashierHistory } from "./pages/cashier/CashierHistory";
// Manager pages
import { InventoryPerformance } from "./pages/manager/InventoryPerformance";
import { OverstockRisks } from "./pages/manager/OverstockRisks";
import { Replenishment } from "./pages/manager/Replenishment";
import { SupplierPerformance } from "./pages/manager/SupplierPerformance";
import { ExecutiveReports } from "./pages/manager/ExecutiveReports";

export const router = createBrowserRouter([
    // ── Public marketing site ──
    {
        path: "/",
        Component: MainLayout,
        children: [
            { index: true, Component: Home },
            { path: "pricing", Component: Pricing },
            { path: "solutions", Component: Solutions },
        ],
    },

    // ── Auth pages (login / register) ──
    {
        Component: AuthLayout,
        children: [
            { path: "login", Component: Login },
            { path: "register", Component: Register },
        ],
    },

    // ── Authenticated dashboard (always shows sidebar) ──
    {
        Component: DashboardLayout,
        children: [
            // Dashboard overview & sub-pages
            { path: "dashboard", Component: Dashboard },
            { path: "dashboard/inventory", Component: InventoryDashboard },
            { path: "dashboard/predictive", Component: PredictiveAnalyticsPage },
            { path: "dashboard/leakage", Component: LeakageDetectionPage },
            { path: "dashboard/fefo", Component: FefoTrackingPage },
            { path: "dashboard/vendors", Component: VendorCreditsPage },
            // Owner/Administrator routes
            { path: "owner/users", Component: ManageUsers },
            { path: "owner/products", Component: ManageProducts },
            { path: "owner/categories", Component: ManageCategories },
            { path: "owner/suppliers", Component: ManageSuppliers },
            { path: "owner/settings", Component: SystemSettings },
            { path: "owner/reports", Component: GenerateReports },
            { path: "owner/audit-logs", Component: AuditLogs },
            { path: "owner/performance", Component: InventoryPerformance },
            { path: "owner/overstock", Component: OverstockRisks },
            { path: "owner/replenishment", Component: Replenishment },
            { path: "owner/supplier-performance", Component: SupplierPerformance },
            { path: "owner/executive-reports", Component: ExecutiveReports },
            // Legacy redirects
            { path: "admin/users", element: <Navigate to="/owner/users" replace /> },
            { path: "admin/products", element: <Navigate to="/owner/products" replace /> },
            { path: "admin/categories", element: <Navigate to="/owner/categories" replace /> },
            { path: "admin/suppliers", element: <Navigate to="/owner/suppliers" replace /> },
            { path: "admin/settings", element: <Navigate to="/owner/settings" replace /> },
            { path: "admin/reports", element: <Navigate to="/owner/reports" replace /> },
            { path: "admin/audit-logs", element: <Navigate to="/owner/audit-logs" replace /> },
            // Inventory routes
            { path: "inventory/stock-in", Component: StockIn },
            { path: "inventory/stock-out", Component: StockOut },
            { path: "inventory/wastage", Component: RecordWastage },
            { path: "inventory/manage", Component: ManageInventory },
            { path: "inventory/fefo", Component: FEFOTracking },
            { path: "inventory/recommendations", Component: Recommendations },
            // Cashier routes
            { path: "cashier/pos", Component: POSTerminal },
            { path: "cashier/returns", Component: ReturnsRefunds },
            { path: "cashier/history", Component: CashierHistory },
            { path: "manager/performance", element: <Navigate to="/owner/performance" replace /> },
            { path: "manager/overstock", element: <Navigate to="/owner/overstock" replace /> },
            { path: "manager/replenishment", element: <Navigate to="/owner/replenishment" replace /> },
            { path: "manager/suppliers", element: <Navigate to="/owner/supplier-performance" replace /> },
            { path: "manager/reports", element: <Navigate to="/owner/executive-reports" replace /> },
        ],
    },
]);
