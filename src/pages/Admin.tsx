import { Navigation } from "../components/Navigation";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Loader2, Upload, MapPin, ShieldAlert, LayoutDashboard, Image as ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { MomentCapture } from "../components/admin/MomentCapture";
import { PhotoManager } from "../components/admin/PhotoManager";
import { StoryBuilder } from "../components/admin/StoryBuilder";
import { DestinationForm } from "../components/admin/DestinationForm";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

const Admin = () => {
  const { user, isAdmin, loading } = useAdminAuth();
  const navigate = useNavigate();
  const [showMomentCapture, setShowMomentCapture] = useState(false);
  const [showDestinationForm, setShowDestinationForm] = useState(false);

  // Fetch stats
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["adminStats"],
    queryFn: async () => {
      const [moments, destinations] = await Promise.all([
        supabase.from("moments").select("id", { count: "exact", head: true }),
        supabase.from("destinations").select("id", { count: "exact", head: true }),
      ]);

      return {
        moments: moments.count || 0,
        destinations: destinations.count || 0,
      };
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    // else if (!loading && user && !isAdmin) {
    //   navigate("/");
    // }
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
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-24 container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Capture and manage your travel moments</p>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="w-full sm:w-auto">
            Sign out
          </Button>
        </div>

        {/* Quick Stats Row - Always Visible */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.moments || 0}</p>
                <p className="text-sm text-muted-foreground">Total moments</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.destinations || 0}</p>
                <p className="text-sm text-muted-foreground">Destinations</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area with Tabs */}
        <Tabs defaultValue="capture" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[500px] h-auto p-1">
            <TabsTrigger value="capture" className="py-2 gap-2">
              <ImageIcon className="w-4 h-4" />
              Capture
            </TabsTrigger>
            <TabsTrigger value="manage" className="py-2 gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Manage
            </TabsTrigger>
            <TabsTrigger value="stories" className="py-2 gap-2">
              <span className="text-xl">✨</span>
              Stories
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Capture */}
          <TabsContent value="capture" className="space-y-6 animate-in fade-in-50 duration-500">
            {/* Quick Capture Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" />
                  Quick capture
                </CardTitle>
                <CardDescription>
                  Add photos, videos, voice notes, or text moments. All saved as drafts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {showMomentCapture ? (
                  <div className="bg-muted/30 p-4 rounded-lg border border-border">
                    <MomentCapture
                      onCaptureComplete={() => {
                        setShowMomentCapture(false);
                        refetchStats();
                      }}
                    />
                    <Button variant="ghost" size="sm" className="mt-4 w-full" onClick={() => setShowMomentCapture(false)}>
                      Hide capture
                    </Button>
                  </div>
                ) : (
                  <Button className="w-full" onClick={() => setShowMomentCapture(true)}>
                    Add moment
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Destination Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Destinations
                </CardTitle>
                <CardDescription>Track new locations on your journey around the world</CardDescription>
              </CardHeader>
              <CardContent>
                {showDestinationForm ? (
                  <div className="bg-muted/30 p-4 rounded-lg border border-border">
                    <DestinationForm
                      onSuccess={() => {
                        setShowDestinationForm(false);
                        refetchStats();
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-4 w-full"
                      onClick={() => setShowDestinationForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button variant="secondary" className="w-full" onClick={() => setShowDestinationForm(true)}>
                    Add new location
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Manage */}
          <TabsContent value="manage" className="space-y-6 animate-in fade-in-50 duration-500">
            {/* Moments Library - Full Width */}
            <Card>
              <CardContent className="p-6">
                <PhotoManager />
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: STORIES */}
          <TabsContent value="stories" className="space-y-6 animate-in fade-in-50 duration-500">
            <StoryBuilder />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
