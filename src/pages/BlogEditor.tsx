// DEPRECATED: Journal/blog feature, kept temporarily for cleanup safety
import { Navigation } from "@/components/Navigation";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { useEffect } from "react";
import { BlogPostForm } from "@/components/blog/BlogPostForm";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const BlogEditor = () => {
  const { user, isAdmin, loading } = useAdminAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const { data: post, isLoading: isLoadingPost } = useQuery({
    queryKey: ["blogPost", id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    // Only redirect after loading is complete
    if (loading) return;
    
    if (!user) {
      navigate("/auth");
    } else if (!isAdmin) {
      navigate("/");
    }
  }, [user, isAdmin, loading, navigate]);

  if (loading || isLoadingPost) {
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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-20 container mx-auto px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl font-display font-bold text-foreground mb-8">
            {id ? "Edit Blog Post" : "Create New Blog Post"}
          </h1>
          
          <div className="bg-card rounded-2xl shadow-card p-8">
            <BlogPostForm
              initialData={post}
              onSuccess={() => navigate("/admin")}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogEditor;