import { Navigation } from "@/components/Navigation";
import { BottomNav } from "@/components/BottomNav";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { MapPin, ArrowRight, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { useMemo } from "react";

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

interface GroupedPosts {
  country: string;
  destinations: {
    destination: Destination;
    posts: BlogPost[];
  }[];
}

const Blog = () => {
  const { data: destinations } = useQuery({
    queryKey: ["destinations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("destinations")
        .select("*")
        .order("arrival_date", { ascending: false });
      if (error) throw error;
      return data as Destination[];
    },
  });

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

  // Group posts by country and destination
  const groupedPosts = useMemo(() => {
    if (!posts?.length || !destinations) return [];

    const destinationMap = new Map(destinations.map((d) => [d.id, d]));
    const countryGroups = new Map<string, Map<string, BlogPost[]>>();

    posts.forEach((post) => {
      if (!post.destination_id) return;
      const destination = destinationMap.get(post.destination_id);
      if (!destination) return;

      if (!countryGroups.has(destination.country)) {
        countryGroups.set(destination.country, new Map());
      }
      const countryMap = countryGroups.get(destination.country)!;

      if (!countryMap.has(destination.id)) {
        countryMap.set(destination.id, []);
      }
      countryMap.get(destination.id)!.push(post);
    });

    const result: GroupedPosts[] = [];

    countryGroups.forEach((destinationsMap, country) => {
      const destinationsList: { destination: Destination; posts: BlogPost[] }[] = [];

      destinationsMap.forEach((posts, destId) => {
        const destination = destinationMap.get(destId);
        if (destination) {
          destinationsList.push({ destination, posts });
        }
      });

      destinationsList.sort(
        (a, b) => new Date(b.destination.arrival_date).getTime() - new Date(a.destination.arrival_date).getTime(),
      );

      result.push({ country, destinations: destinationsList });
    });

    result.sort((a, b) => {
      const aDate = new Date(a.destinations[0]?.destination.arrival_date || 0);
      const bDate = new Date(b.destinations[0]?.destination.arrival_date || 0);
      return bDate.getTime() - aDate.getTime();
    });

    return result;
  }, [posts, destinations]);

  // Get posts without destination
  const unassignedPosts = useMemo(() => {
    return posts?.filter((p) => !p.destination_id) || [];
  }, [posts]);

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

          {/* Location Badge - Top Left Overlay */}
          {post.destinations && (
            <div className="absolute top-4 left-4 z-10">
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-black/60 text-white backdrop-blur-md shadow-sm border border-white/10">
                <MapPin className="w-3 h-3 mr-1.5" />
                {post.destinations.name}
              </span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-6 flex flex-col flex-1">
          {/* Date */}
          <div className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            {post.published_at
              ? format(new Date(post.published_at), "MMMM d, yyyy")
              : format(new Date(post.created_at), "MMMM d, yyyy")}
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
            Read Story
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
          <div className="space-y-16">
            {groupedPosts.map((countryGroup) => (
              <div
                key={countryGroup.country}
                className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700"
              >
                {/* Country Header */}
                <div className="border-b border-border pb-4">
                  <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                    {countryGroup.country}
                  </h2>
                </div>

                {/* Destinations within country */}
                {countryGroup.destinations.map(({ destination, posts }) => (
                  <div key={destination.id} className="space-y-6">
                    {/* Destination Header */}
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl md:text-2xl font-display font-semibold text-foreground">
                          {destination.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(destination.arrival_date), "d MMMM yyyy")}
                          {destination.departure_date &&
                            ` — ${format(new Date(destination.departure_date), "d MMMM yyyy")}`}
                        </p>
                      </div>
                    </div>

                    {/* Posts Grid - Max 3 columns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                      {posts.map((post) => (
                        <PostCard key={post.id} post={post} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {/* Unassigned posts section */}
            {unassignedPosts.length > 0 && (
              <div className="space-y-6">
                <div className="border-b border-border pb-4">
                  <h2 className="text-3xl md:text-4xl font-display font-bold text-muted-foreground">Uncategorized</h2>
                  <p className="text-sm text-muted-foreground mt-1">Stories not assigned to a destination</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                  {unassignedPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              </div>
            )}
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
