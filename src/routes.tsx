import { createBrowserRouter } from "react-router";
import { MainLayout } from "./components/layout/MainLayout";
import { Home } from "./pages/Home";
import { Pricing } from "./pages/Pricing";
import { Solutions } from "./pages/Solutions";

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
]);
