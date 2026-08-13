import { lazy, Suspense, ComponentType } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { MainLayout } from "./components/layout/MainLayout";
import { AuthLayout } from "./components/layout/AuthLayout";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { PageLoader } from "./components/ui/PageLoader";

function lazyPage(imp: () => Promise<Record<string, ComponentType<unknown>>>, name: string) {
  const Comp = lazy(() => imp().then(m => ({ default: m[name] })));
  return function LazyPage() {
    return (
      <Suspense fallback={<PageLoader />}>
        <Comp />
      </Suspense>
    );
  };
}

const Home = lazyPage(() => import("./pages/Home"), "Home");
const Pricing = lazyPage(() => import("./pages/Pricing"), "Pricing");
const Solutions = lazyPage(() => import("./pages/Solutions"), "Solutions");
const Login = lazyPage(() => import("./pages/Login"), "Login");
const Dashboard = lazyPage(() => import("./pages/Dashboard"), "Dashboard");
const InventoryDashboard = lazyPage(() => import("./pages/dashboard/InventoryDashboard"), "InventoryDashboard");
const PredictiveAnalyticsPage = lazyPage(() => import("./pages/dashboard/PredictiveAnalytics"), "PredictiveAnalyticsPage");
const LeakageDetectionPage = lazyPage(() => import("./pages/dashboard/LeakageDetection"), "LeakageDetectionPage");
const FefoTrackingPage = lazyPage(() => import("./pages/dashboard/FefoTracking"), "FefoTrackingPage");
const VendorCreditsPage = lazyPage(() => import("./pages/dashboard/VendorCredits"), "VendorCreditsPage");
const ManageUsers = lazyPage(() => import("./pages/admin/ManageUsers"), "ManageUsers");
const ManageProducts = lazyPage(() => import("./pages/admin/ManageProducts"), "ManageProducts");
const ManageCategories = lazyPage(() => import("./pages/admin/ManageCategories"), "ManageCategories");
const ManageSuppliers = lazyPage(() => import("./pages/admin/ManageSuppliers"), "ManageSuppliers");
const SystemSettings = lazyPage(() => import("./pages/admin/SystemSettings"), "SystemSettings");
const GenerateReports = lazyPage(() => import("./pages/admin/GenerateReports"), "GenerateReports");
const AuditLogs = lazyPage(() => import("./pages/admin/AuditLogs"), "AuditLogs");
const PurchaseOrders = lazyPage(() => import("./pages/admin/PurchaseOrders"), "PurchaseOrders");
const RecordWastage = lazyPage(() => import("./pages/inventory/RecordWastage"), "RecordWastage");
const ManageInventory = lazyPage(() => import("./pages/inventory/ManageInventory"), "ManageInventory");
const FEFOTracking = lazyPage(() => import("./pages/inventory/FEFOTracking"), "FEFOTracking");
const Recommendations = lazyPage(() => import("./pages/inventory/Recommendations"), "Recommendations");
const POSTerminal = lazyPage(() => import("./pages/cashier/POSTerminal"), "POSTerminal");
const POSPaymentStatus = lazyPage(() => import("./pages/cashier/POSPaymentStatus"), "POSPaymentStatus");
const ReturnsRefunds = lazyPage(() => import("./pages/cashier/ReturnsRefunds"), "ReturnsRefunds");
const CashierHistory = lazyPage(() => import("./pages/cashier/CashierHistory"), "CashierHistory");
const InventoryPerformance = lazyPage(() => import("./pages/manager/InventoryPerformance"), "InventoryPerformance");
const OverstockRisks = lazyPage(() => import("./pages/manager/OverstockRisks"), "OverstockRisks");
const Replenishment = lazyPage(() => import("./pages/manager/Replenishment"), "Replenishment");
const SupplierPerformance = lazyPage(() => import("./pages/manager/SupplierPerformance"), "SupplierPerformance");
const ExecutiveReports = lazyPage(() => import("./pages/manager/ExecutiveReports"), "ExecutiveReports");

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
        ],
    },

    // ── PayMongo payment status (standalone — reached after the hosted checkout) ──
    {
        path: "pos/success",
        Component: POSPaymentStatus,
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
            { path: "owner/purchase-orders", Component: PurchaseOrders },
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
            { path: "admin/purchase-orders", element: <Navigate to="/owner/purchase-orders" replace /> },
            // Inventory routes
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
