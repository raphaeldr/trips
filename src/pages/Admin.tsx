import { Navigation } from "../components/Navigation";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Loader2, MapPin, ShieldAlert, ImageIcon, Calendar } from "lucide-react";
import { useEffect } from "react";
import { supabase } from "../integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Card, CardContent } from "../components/ui/card";
import { differenceInDays } from "date-fns";

const Admin = () => {
  const { user, isAdmin, loading } = useAdminAuth();
  const navigate = useNavigate();

  // Fetch stats details
  const { data: stats } = useQuery({
    queryKey: ["adminStats"],
    queryFn: async () => {
      const [media, segments, earliestContext] = await Promise.all([
        supabase.from("media").select("id", { count: "exact", head: true }),
        supabase.from("segments").select("id", { count: "exact", head: true }),
        supabase.from("segments").select("arrival_date").order("arrival_date", { ascending: true }).limit(1).single()
      ]);

      let days = 0;
      if (earliestContext.data?.arrival_date) {
        days = differenceInDays(new Date(), new Date(earliestContext.data.arrival_date)) + 1; // +1 for today
      }

      return {
        media: media.count || 0,
        segments: segments.count || 0,
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
              </TabsList>

              <Button variant="outline" onClick={handleSignOut} size="sm" className="hidden sm:flex">
                Sign out
              </Button>
            </div>
          </div>

          <TabsContent value="dashboard" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Row: Stats (Bento Grid - Square-ish Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Card 1: Total Media */}
              <Card className="aspect-[4/3] sm:aspect-square flex flex-col justify-between overflow-hidden relative group hover:shadow-md transition-all border-neutral-200/60 bg-white/50 backdrop-blur-sm">
                <div className="absolute top-0 right-0 p-4 opacity-70 group-hover:opacity-100 transition-opacity">
                  <div className="p-3 bg-teal-50 text-teal-600 rounded-full">
                    <ImageIcon className="w-5 h-5 fill-current" />
                  </div>
                </div>
                <CardContent className="p-6 flex flex-col justify-end h-full">
                  <span className="text-5xl font-display font-bold text-foreground tracking-tight">{stats?.media || 0}</span>
                  <span className="text-sm font-medium text-muted-foreground mt-2">Total Media</span>
                </CardContent>
              </Card>

              {/* Card 2: Segments */}
              <Card className="aspect-[4/3] sm:aspect-square flex flex-col justify-between overflow-hidden relative group hover:shadow-md transition-all border-neutral-200/60 bg-white/50 backdrop-blur-sm">
                <div className="absolute top-0 right-0 p-4 opacity-70 group-hover:opacity-100 transition-opacity">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
                    <MapPin className="w-5 h-5 fill-current" />
                  </div>
                </div>
                <CardContent className="p-6 flex flex-col justify-end h-full">
                  <span className="text-5xl font-display font-bold text-foreground tracking-tight">{stats?.segments || 0}</span>
                  <span className="text-sm font-medium text-muted-foreground mt-2">Segments</span>
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

            {/* Content Area Placeholder */}
            <div className="text-center py-12 text-muted-foreground">
              <p>Management tools for Segments and Media coming soon.</p>
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
