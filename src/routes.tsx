import { createBrowserRouter } from "react-router";
import { MainLayout } from "./components/layout/MainLayout";
import { AuthLayout } from "./components/layout/AuthLayout";
import { Home } from "./pages/Home";
import { Pricing } from "./pages/Pricing";
import { Solutions } from "./pages/Solutions";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Dashboard } from "./pages/Dashboard";
import { PredictiveAnalyticsPage } from "./pages/dashboard/PredictiveAnalytics";
import { LeakageDetectionPage } from "./pages/dashboard/LeakageDetection";
import { FefoTrackingPage } from "./pages/dashboard/FefoTracking";
import { VendorCreditsPage } from "./pages/dashboard/VendorCredits";
import { BehavioralIntelligencePage } from "./pages/dashboard/BehavioralIntelligence";
import { PrescriptiveSandboxPage } from "./pages/dashboard/PrescriptiveSandbox";

export const router = createBrowserRouter([
    {
        path: "/",
        Component: MainLayout,
        children: [
            { index: true, Component: Home },
            { path: "pricing", Component: Pricing },
            { path: "solutions", Component: Solutions },
        ],
    },
    {
        Component: AuthLayout,
        children: [
            { path: "login", Component: Login },
            { path: "register", Component: Register },
            {
                path: "dashboard",
                children: [
                    { index: true, Component: Dashboard },
                    { path: "predictive", Component: PredictiveAnalyticsPage },
                    { path: "leakage", Component: LeakageDetectionPage },
                    { path: "fefo", Component: FefoTrackingPage },
                    { path: "vendors", Component: VendorCreditsPage },
                    { path: "behavior", Component: BehavioralIntelligencePage },
                    { path: "prescriptive", Component: PrescriptiveSandboxPage },
                ],
            },
        ],
    },
]);
