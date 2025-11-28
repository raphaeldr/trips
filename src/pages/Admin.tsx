import { Navigation } from "../components/Navigation";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Loader2, Upload, FileText, MapPin, ShieldAlert, LayoutDashboard, Image as ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { PhotoUpload } from "../components/admin/PhotoUpload";
import { PhotoManager } from "../components/admin/PhotoManager";
import { DestinationForm } from "../components/admin/DestinationForm";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

const Admin = () => {
  const { user, isAdmin, loading } = useAdminAuth();
  const navigate = useNavigate();
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [showDestinationForm, setShowDestinationForm] = useState(false);

  // Fetch stats
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["adminStats"],
    queryFn: async () => {
      const [photos, posts, destinations] = await Promise.all([
        supabase.from("photos").select("id", { count: "exact", head: true }),
        supabase.from("blog_posts").select("id", { count: "exact", head: true }),
        supabase.from("destinations").select("id", { count: "exact", head: true }),
      ]);

      return {
        photos: photos.count || 0,
        posts: posts.count || 0,
        destinations: destinations.count || 0,
      };
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    } else if (!loading && user && !isAdmin) {
      navigate("/");
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
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-24 container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage your travel content and media</p>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="w-full sm:w-auto">
            Sign Out
          </Button>
        </div>

        {/* Quick Stats Row - Always Visible */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.photos || 0}</p>
                <p className="text-sm text-muted-foreground">Total Photos</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.posts || 0}</p>
                <p className="text-sm text-muted-foreground">Blog Posts</p>
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
        <Tabs defaultValue="media" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px] h-auto p-1">
            <TabsTrigger value="media" className="py-2 gap-2">
              <ImageIcon className="w-4 h-4" />
              Photos & Media
            </TabsTrigger>
            <TabsTrigger value="content" className="py-2 gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Content & Trips
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Photos & Media */}
          <TabsContent value="media" className="space-y-6 animate-in fade-in-50 duration-500">
            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" />
                  Upload Photos
                </CardTitle>
                <CardDescription>
                  Upload high-quality photos from your travels. Supports EXIF data extraction.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {showPhotoUpload ? (
                  <div className="bg-muted/30 p-4 rounded-lg border border-border">
                    <PhotoUpload
                      onUploadComplete={() => {
                        setShowPhotoUpload(false);
                        refetchStats();
                      }}
                    />
                    <Button variant="ghost" size="sm" className="mt-4 w-full" onClick={() => setShowPhotoUpload(false)}>
                      Hide Uploader
                    </Button>
                  </div>
                ) : (
                  <Button className="w-full" onClick={() => setShowPhotoUpload(true)}>
                    Open Uploader
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Media Library - Full Width */}
            <Card>
              <CardContent className="p-6">
                <PhotoManager />
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Content & Trips */}
          <TabsContent value="content" className="space-y-6 animate-in fade-in-50 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Blog Post Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Blog Posts
                  </CardTitle>
                  <CardDescription>Write rich multimedia blog posts about your adventures</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" onClick={() => navigate("/admin/blog/new")}>
                    Create New Post
                  </Button>
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
                      Add New Location
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
