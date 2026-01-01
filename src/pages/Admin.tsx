import { Navigation } from "../components/Navigation";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Loader2, MapPin, ShieldAlert, LayoutDashboard, Image as ImageIcon, Calendar, BookOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { QuickCapture } from "../components/admin/QuickCapture";
import { RecentMomentsList } from "../components/admin/RecentMomentsList";
import { PhotoManager } from "../components/admin/PhotoManager";
import { StoryBuilder } from "../components/admin/StoryBuilder";
import { DestinationWidget } from "../components/admin/DestinationWidget";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { differenceInDays } from "date-fns";

const Admin = () => {
  const { user, isAdmin, loading } = useAdminAuth();
  const navigate = useNavigate();
  const [showMomentCapture, setShowMomentCapture] = useState(true); // Default open for dashboard feel?
  // Actually, toggles are fine.

  // Fetch stats details
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["adminStats"],
    queryFn: async () => {
      const [moments, destinations, earliestContext] = await Promise.all([
        supabase.from("moments").select("id", { count: "exact", head: true }),
        supabase.from("destinations").select("id", { count: "exact", head: true }),
        supabase.from("destinations").select("arrival_date").order("arrival_date", { ascending: true }).limit(1).single()
      ]);

      let days = 0;
      if (earliestContext.data?.arrival_date) {
        days = differenceInDays(new Date(), new Date(earliestContext.data.arrival_date)) + 1; // +1 for today
      }

      return {
        moments: moments.count || 0,
        destinations: destinations.count || 0,
        daysTraveling: days > 0 ? days : 0
      };
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navigation />

      {/* Dashboard Container: Max Width 1200px */}
      <div className="pt-24 max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12">

        <Tabs defaultValue="dashboard" className="space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="text-center sm:text-left">
              <h1 className="text-[32px] font-display font-bold text-foreground leading-tight">Dashboard</h1>
              <p className="text-muted-foreground mt-1">Overview of your travel content</p>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              {/* Segmented Control */}
              <TabsList className="h-10 p-1 bg-muted/80 backdrop-blur-sm rounded-xl">
                <TabsTrigger
                  value="dashboard"
                  className="rounded-lg px-4 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
                >
                  Dashboard
                </TabsTrigger>
                <TabsTrigger
                  value="photos"
                  className="rounded-lg px-4 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
                >
                  Photos
                </TabsTrigger>
                <TabsTrigger
                  value="stories"
                  className="rounded-lg px-4 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
                >
                  Stories
                </TabsTrigger>
              </TabsList>

              <Button variant="outline" onClick={handleSignOut} size="sm" className="hidden sm:flex">
                Sign out
              </Button>
            </div>
          </div>

          <TabsContent value="dashboard" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Row: Stats (Bento Grid - Square-ish Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Card 1: Total Moments */}
              <Card className="aspect-[4/3] sm:aspect-square flex flex-col justify-between overflow-hidden relative group hover:shadow-md transition-all border-neutral-200/60 bg-white/50 backdrop-blur-sm">
                <div className="absolute top-0 right-0 p-4 opacity-70 group-hover:opacity-100 transition-opacity">
                  <div className="p-3 bg-teal-50 text-teal-600 rounded-full">
                    <ImageIcon className="w-5 h-5 fill-current" />
                  </div>
                </div>
                <CardContent className="p-6 flex flex-col justify-end h-full">
                  <span className="text-5xl font-display font-bold text-foreground tracking-tight">{stats?.moments || 0}</span>
                  <span className="text-sm font-medium text-muted-foreground mt-2">Total Moments</span>
                </CardContent>
              </Card>

              {/* Card 2: Destinations */}
              <Card className="aspect-[4/3] sm:aspect-square flex flex-col justify-between overflow-hidden relative group hover:shadow-md transition-all border-neutral-200/60 bg-white/50 backdrop-blur-sm">
                <div className="absolute top-0 right-0 p-4 opacity-70 group-hover:opacity-100 transition-opacity">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
                    <MapPin className="w-5 h-5 fill-current" />
                  </div>
                </div>
                <CardContent className="p-6 flex flex-col justify-end h-full">
                  <span className="text-5xl font-display font-bold text-foreground tracking-tight">{stats?.destinations || 0}</span>
                  <span className="text-sm font-medium text-muted-foreground mt-2">Destinations</span>
                </CardContent>
              </Card>

              {/* Card 3: Days Traveling */}
              <Card className="aspect-[4/3] sm:aspect-square flex flex-col justify-between overflow-hidden relative group hover:shadow-md transition-all border-neutral-200/60 bg-white/50 backdrop-blur-sm">
                <div className="absolute top-0 right-0 p-4 opacity-70 group-hover:opacity-100 transition-opacity">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-full">
                    <Calendar className="w-5 h-5 fill-current" />
                  </div>
                </div>
                <CardContent className="p-6 flex flex-col justify-end h-full">
                  <span className="text-5xl font-display font-bold text-foreground tracking-tight">{stats?.daysTraveling || 0}</span>
                  <span className="text-sm font-medium text-muted-foreground mt-2">Days Traveling</span>
                </CardContent>
              </Card>
            </div>

            {/* Main Area: Split 2:1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Left Column (66%) - Capture & Feed */}
              <div className="lg:col-span-2 space-y-8">

                {/* Capture Section */}
                <div className="space-y-6">
                  <QuickCapture onCaptureComplete={() => {
                    refetchStats();
                    // Invalidate recent list too? 
                    // Ideally refetchStats or parent re-render handles it, but react-query keys need invalidation.
                    // I'll update QuickCapture to invalidate "recentMomentsAdmin" too.
                  }} />

                  <RecentMomentsList />
                </div>

                {/* Feed / Photo Manager Section (Mini View?) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <LayoutDashboard className="w-5 h-5 text-neutral-500" />
                      Library
                    </h3>
                  </div>
                  <Card>
                    <CardContent className="p-0 overflow-hidden min-h-[500px]">
                      <PhotoManager />
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Right Column (33%) - Management & Lists */}
              <div className="lg:col-span-1 space-y-8">

                {/* Destinations Widget */}
                <div className="space-y-4">
                  <DestinationWidget onUpdate={() => refetchStats()} />
                </div>

                {/* Stories Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                    Stories
                  </h3>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Story Builder</CardTitle>
                      <CardDescription>Curate moments into narratives</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <StoryBuilder />
                    </CardContent>
                  </Card>
                </div>

              </div>
            </div>
          </TabsContent>

          <TabsContent value="photos" className="min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Photo Library</h2>
                </div>
                <PhotoManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stories" className="min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <StoryBuilder />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
