import { Navigation } from "@/components/Navigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import { format } from "date-fns";
const Blog = () => {
  const {
    data: posts,
    isLoading
  } = useQuery({
    queryKey: ["blogPosts"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("blog_posts").select(`
          *,
          destinations (
            name,
            country
          )
        `).eq("status", "published").order("published_at", {
        ascending: false
      });
      if (error) throw error;
      return data;
    }
  });
  return <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-20 container mx-auto px-6 py-12">
        <h1 className="text-4xl font-display font-bold text-foreground mb-8">Travel journal</h1>
        
        {isLoading ? <div className="max-w-4xl mx-auto space-y-8">
            {[1, 2, 3].map(i => <div key={i} className="bg-card rounded-2xl shadow-card p-8 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
                <div className="h-8 bg-muted rounded w-3/4 mb-4"></div>
                <div className="h-20 bg-muted rounded"></div>
              </div>)}
          </div> : posts && posts.length > 0 ? <div className="max-w-4xl mx-auto space-y-8">
            {posts.map(post => <Link key={post.id} to={`/blog/${post.slug}`}>
                <div className="bg-card rounded-2xl shadow-card hover:shadow-elegant transition-all duration-300 overflow-hidden group cursor-pointer">
                  {post.cover_image_url && <img src={post.cover_image_url} alt={post.title} className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300" />}
                  <div className="p-8">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      {post.published_at && <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{format(new Date(post.published_at), "d MMMM yyyy")}</span>
                        </div>}
                      {post.destinations && <>
                          <span>•</span>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{post.destinations.name}, {post.destinations.country}</span>
                          </div>
                        </>}
                    </div>
                    <h2 className="text-3xl font-display font-bold text-foreground mb-4 group-hover:text-primary transition-colors">
                      {post.title}
                    </h2>
                    {post.excerpt && <p className="text-foreground/80 mb-4">
                        {post.excerpt}
                      </p>}
                    <div className="flex items-center gap-2 text-primary font-medium">
                      Read More
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>)}
          </div> : <div className="max-w-4xl mx-auto text-center py-16">
            <h2 className="text-2xl font-bold text-foreground mb-4">No posts yet</h2>
            <p className="text-muted-foreground">Check back soon for travel stories and adventures!</p>
          </div>}
      </div>
    </div>;
};
export default Blog;