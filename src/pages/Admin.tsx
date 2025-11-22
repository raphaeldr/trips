import { Navigation } from "@/components/Navigation";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, FileText, Image as ImageIcon, MapPin, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PhotoUpload } from "@/components/admin/PhotoUpload";
import { DestinationForm } from "@/components/admin/DestinationForm";
import { useQuery } from "@tanstack/react-query";

const Admin = () => {
  const { user, isAdmin, loading } = useAdminAuth();
  const navigate = useNavigate();
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [showDestinationForm, setShowDestinationForm] = useState(false);

  // Fetch stats
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const [photos, posts, stories, destinations] = await Promise.all([
        supabase.from('photos').select('id', { count: 'exact', head: true }),
        supabase.from('blog_posts').select('id', { count: 'exact', head: true }),
        supabase.from('stories').select('id', { count: 'exact', head: true }),
        supabase.from('destinations').select('id', { count: 'exact', head: true }),
      ]);

      return {
        photos: photos.count || 0,
        posts: posts.count || 0,
        stories: stories.count || 0,
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
      <div className="pt-20 container mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-display font-bold text-foreground">
            Backend Dashboard
          </h1>
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-card rounded-2xl shadow-card p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.photos || 0}</p>
                <p className="text-sm text-muted-foreground">Photos</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-card p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.posts || 0}</p>
                <p className="text-sm text-muted-foreground">Blog Posts</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-card p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <ImageIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.stories || 0}</p>
                <p className="text-sm text-muted-foreground">Stories</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-card p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.destinations || 0}</p>
                <p className="text-sm text-muted-foreground">Destinations</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl shadow-card p-8">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Upload className="w-6 h-6 text-primary" />
              Upload Photos
            </h2>
            <p className="text-muted-foreground mb-6">
              Upload photos with automatic EXIF data extraction and AI-powered tagging
            </p>
            
            {showPhotoUpload ? (
              <PhotoUpload onUploadComplete={() => {
                setShowPhotoUpload(false);
                refetchStats();
              }} />
            ) : (
              <Button className="w-full" onClick={() => setShowPhotoUpload(true)}>
                Choose Files
              </Button>
            )}
          </div>

          <div className="bg-card rounded-2xl shadow-card p-8">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              Create Blog Post
            </h2>
            <p className="text-muted-foreground mb-6">
              Write rich multimedia blog posts about your adventures
            </p>
            <Button className="w-full" onClick={() => navigate("/admin/blog/new")}>
              New Post
            </Button>
          </div>

          <div className="bg-card rounded-2xl shadow-card p-8">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <ImageIcon className="w-6 h-6 text-primary" />
              Create Story
            </h2>
            <p className="text-muted-foreground mb-6">
              Share daily highlights with Instagram-style stories
            </p>
            <Button className="w-full">
              New Story
            </Button>
          </div>

          <div className="bg-card rounded-2xl shadow-card p-8">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <MapPin className="w-6 h-6 text-primary" />
              Add Destination
            </h2>
            <p className="text-muted-foreground mb-6">
              Track new locations on your journey around the world
            </p>
            
            {showDestinationForm ? (
              <DestinationForm onSuccess={() => {
                setShowDestinationForm(false);
                refetchStats();
              }} />
            ) : (
              <Button className="w-full" onClick={() => setShowDestinationForm(true)}>
                Add Location
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;

