import { Navigation } from "@/components/Navigation";
import { BottomNav } from "@/components/BottomNav";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ArrowRight, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";

interface Destination {
  id: string;
  name: string;
  country: string;
  arrival_date: string;
  departure_date: string | null;
}

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  created_at: string;
  destination_id: string | null;
  destinations: {
    name: string;
    country: string;
  } | null;
}

const Blog = () => {
  const { data: posts, isLoading } = useQuery({
    queryKey: ["blogPosts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select(
          `
          *,
          destinations (
            name,
            country
          )
        `,
        )
        .eq("status", "published")
        .order("published_at", { ascending: false });

      if (error) throw error;
      return data as BlogPost[];
    },
  });

  const PostCard = ({ post }: { post: BlogPost }) => (
    <Link to={`/blog/${post.slug}`} className="block h-full group">
      <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden h-full flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
        {/* Image Section - 1:1 Aspect Ratio */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          {post.cover_image_url ? (
            <img
              src={post.cover_image_url}
              alt={post.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary text-muted-foreground">
              <ImageIcon className="w-12 h-12 opacity-20" />
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-6 flex flex-col flex-1">
          {/* Meta Data: Location & Date */}
          <div className="text-xs font-semibold text-primary mb-3 uppercase tracking-wider flex items-center gap-2">
            {post.destinations && <span>{post.destinations.name}</span>}
            {post.destinations && <span className="text-muted-foreground">•</span>}
            <span className="text-muted-foreground">
              {post.published_at
                ? format(new Date(post.published_at), "d MMMM yyyy")
                : format(new Date(post.created_at), "d MMMM yyyy")}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-xl font-display font-bold text-foreground mb-3 leading-tight group-hover:text-primary transition-colors line-clamp-2">
            {post.title}
          </h2>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-muted-foreground mb-6 line-clamp-3 text-sm flex-1 leading-relaxed">{post.excerpt}</p>
          )}

          {/* Read More */}
          <div className="mt-auto flex items-center gap-2 text-primary font-semibold text-sm">
            Read story
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navigation />
      <BottomNav />
      <div className="pt-24 container mx-auto px-4 sm:px-6">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-2">Travel journal</h1>
          {posts && (
            <p className="text-muted-foreground text-lg">
              {posts.length} {posts.length === 1 ? "story" : "stories"} from our adventures.
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card rounded-2xl shadow-card p-0 overflow-hidden animate-pulse">
                  <div className="aspect-square bg-muted"></div>
                  <div className="p-6 space-y-4">
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                    <div className="h-8 bg-muted rounded w-3/4"></div>
                    <div className="h-20 bg-muted rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto text-center py-24">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-4">No stories yet</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Check back soon for travel stories and adventures from our journey!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Blog;
