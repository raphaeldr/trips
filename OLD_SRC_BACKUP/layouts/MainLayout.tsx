import { Outlet } from "react-router-dom";
import { Navigation } from "@/components/Navigation";

export const MainLayout = () => {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navigation />
            {/* This renders the child page (Home, Map, etc.) */}
            <Outlet />
        </div>
    );
};
