import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loading } from "@/components/ui/Loading";
import { CaptureButton } from "@/components/Capture/CaptureButton";
import { MainLayout } from "@/layouts/MainLayout";

// Lazy load pages for performance
const Home = lazy(() => import("./pages/Home"));
const Map = lazy(() => import("./pages/Map"));
const Gallery = lazy(() => import("./pages/Gallery"));
const Admin = lazy(() => import("./pages/Admin"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const StoryViewer = lazy(() => import("./pages/StoryViewer"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            {/* Public Routes wrapped in Layout */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/map" element={<Map />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/story/:id" element={<StoryViewer />} />
            </Route>

            {/* Standalone Routes */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <CaptureButton />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
