import { createBrowserRouter } from "react-router";
import { MainLayout } from "./components/layout/MainLayout";
import { AuthLayout } from "./components/layout/AuthLayout";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { Home } from "./pages/Home";
import { Pricing } from "./pages/Pricing";
import { Solutions } from "./pages/Solutions";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Dashboard } from "./pages/Dashboard";
import { ManagerDashboard } from "./pages/dashboard/ManagerDashboard";
import { InventoryDashboard } from "./pages/dashboard/InventoryDashboard";
import { AdminDashboard } from "./pages/dashboard/AdminDashboard";
import { PredictiveAnalyticsPage } from "./pages/dashboard/PredictiveAnalytics";
import { LeakageDetectionPage } from "./pages/dashboard/LeakageDetection";
import { FefoTrackingPage } from "./pages/dashboard/FefoTracking";
import { VendorCreditsPage } from "./pages/dashboard/VendorCredits";
import { BehavioralIntelligencePage } from "./pages/dashboard/BehavioralIntelligence";
import { PrescriptiveSandboxPage } from "./pages/dashboard/PrescriptiveSandbox";
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
// Manager pages
import { InventoryPerformance } from "./pages/manager/InventoryPerformance";
import { DemandForecasts } from "./pages/manager/DemandForecasts";
import { OverstockRisks } from "./pages/manager/OverstockRisks";
import { LossTrends } from "./pages/manager/LossTrends";
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
            { path: "dashboard/manager", Component: ManagerDashboard },
            { path: "dashboard/inventory", Component: InventoryDashboard },
            { path: "dashboard/admin", Component: AdminDashboard },
            { path: "dashboard/predictive", Component: PredictiveAnalyticsPage },
            { path: "dashboard/leakage", Component: LeakageDetectionPage },
            { path: "dashboard/fefo", Component: FefoTrackingPage },
            { path: "dashboard/vendors", Component: VendorCreditsPage },
            { path: "dashboard/behavior", Component: BehavioralIntelligencePage },
            { path: "dashboard/prescriptive", Component: PrescriptiveSandboxPage },
            // Admin routes
            { path: "admin/users", Component: ManageUsers },
            { path: "admin/products", Component: ManageProducts },
            { path: "admin/categories", Component: ManageCategories },
            { path: "admin/suppliers", Component: ManageSuppliers },
            { path: "admin/settings", Component: SystemSettings },
            { path: "admin/reports", Component: GenerateReports },
            { path: "admin/audit-logs", Component: AuditLogs },
            // Inventory routes
            { path: "inventory/stock-in", Component: StockIn },
            { path: "inventory/stock-out", Component: StockOut },
            { path: "inventory/wastage", Component: RecordWastage },
            { path: "inventory/manage", Component: ManageInventory },
            { path: "inventory/fefo", Component: FEFOTracking },
            { path: "inventory/recommendations", Component: Recommendations },
            // Manager routes
            { path: "manager/performance", Component: InventoryPerformance },
            { path: "manager/forecasts", Component: DemandForecasts },
            { path: "manager/overstock", Component: OverstockRisks },
            { path: "manager/loss-trends", Component: LossTrends },
            { path: "manager/replenishment", Component: Replenishment },
            { path: "manager/suppliers", Component: SupplierPerformance },
            { path: "manager/reports", Component: ExecutiveReports },
        ],
    },
]);
