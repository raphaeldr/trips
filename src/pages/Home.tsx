import { Navigation } from "@/components/Navigation";
import { BottomNav } from "@/components/BottomNav";
import { MapEmbed } from "@/components/MapEmbed";
import { TripProgressWidget } from "@/components/DashboardWidgets";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Calendar, Navigation as NavIcon, Camera, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

const Home = () => {
  // --- Data Fetching ---

  const { data: destinations } = useQuery({
    queryKey: ["destinations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("destinations")
        .select("*")
        .order("arrival_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const currentDestination = destinations?.find((d) => d.is_current) || destinations?.[0];

  const { data: locationImage } = useQuery({
    queryKey: ["locationImage", currentDestination?.id],
    queryFn: async () => {
      if (!currentDestination?.id) return null;
      const { data, error } = await supabase
        .from("photos")
        .select("storage_path")
        .eq("destination_id", currentDestination.id)
        .order("is_hero", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!currentDestination?.id,
  });

  const { data: recentPhotos } = useQuery({
    queryKey: ["recentPhotosHome"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data;
    },
  });

  const { data: recentPosts } = useQuery({
    queryKey: ["recentPostsHome"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*, destinations(name, country)")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  // --- Calculations ---

  const bgImageUrl = locationImage
    ? supabase.storage.from("photos").getPublicUrl(locationImage.storage_path).data.publicUrl
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 md:pb-8 selection:bg-primary/20 selection:text-primary">
      <Navigation />

      <main className="container mx-auto px-4 pt-20 md:pt-28">
        {/* BENTO GRID LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-4 md:auto-rows-[180px] gap-4">
          {/* 1. LOCATION STATUS (Large) */}
          <div className="col-span-1 md:col-span-2 min-h-[280px] md:min-h-0 md:row-span-2 relative group overflow-hidden rounded-3xl border border-border bg-muted shadow-xl hover:shadow-2xl transition-all duration-500">
            {/* Background Image with Map Fallback */}
            <div className="absolute inset-0">
              {bgImageUrl ? (
                <img
                  src={bgImageUrl}
                  alt={currentDestination?.name || "Current Location"}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
              )}
            </div>

            {/* Gradient Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />

            <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end">
              <div className="space-y-1 mb-4 md:mb-6">
                <div className="flex items-center gap-2 text-white font-bold uppercase tracking-widest text-xs mb-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  Current Location
                </div>
                <h1 className="text-3xl md:text-5xl font-display font-bold text-white leading-tight drop-shadow-md">
                  {currentDestination?.name || "Unknown"}
                </h1>
                <p className="text-lg md:text-2xl text-white/90 font-light drop-shadow-sm">
                  {currentDestination?.country}, {currentDestination?.continent}
                </p>
              </div>

              <div className="flex items-center gap-3 md:gap-4 text-xs md:text-sm text-white/80 border-t border-white/20 pt-3 md:pt-4">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Since{" "}
                  {currentDestination?.arrival_date ? format(new Date(currentDestination.arrival_date), "MMM d") : "-"}
                </div>
                <div className="w-px h-3 md:h-4 bg-white/30" />
                <div className="flex items-center gap-1.5 md:gap-2">
                  <NavIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  {currentDestination?.latitude?.toFixed(2)}° N, {currentDestination?.longitude?.toFixed(2)}° E
                </div>
              </div>
            </div>
          </div>

          {/* 2. LATEST STORIES (Prominent - Top Right) */}
          <div className="col-span-1 md:col-span-2 md:row-span-1 bg-card border border-border rounded-3xl p-5 md:p-6 flex flex-col justify-center shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                <BookOpen className="w-3 h-3 text-primary" />
                Latest Stories
              </div>
              <Link to="/blog" className="text-xs text-primary hover:underline font-medium">
                View All
              </Link>
            </div>
            <div className="flex flex-col md:grid md:grid-cols-2 gap-3 md:gap-4">
              {recentPosts?.slice(0, 2).map((post) => (
                <Link
                  key={post.id}
                  to={`/blog/${post.slug}`}
                  className="group flex gap-3 md:gap-4 items-center bg-secondary/30 p-2.5 md:p-3 rounded-xl hover:bg-secondary/60 transition-colors"
                >
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-lg bg-muted shrink-0 overflow-hidden shadow-sm">
                    {post.cover_image_url && (
                      <img
                        src={post.cover_image_url}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-foreground text-sm md:text-base truncate group-hover:text-primary transition-colors">
                      {post.title}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(post.published_at || new Date()), "MMM d")} • {post.destinations?.country}
                    </p>
                  </div>
                </Link>
              ))}
              {!recentPosts?.length && <p className="text-muted-foreground text-sm">No stories yet.</p>}
            </div>
          </div>

          {/* 3. LATEST MEDIA (Prominent - Below Stories) */}
          <div className="col-span-1 md:col-span-2 md:row-span-1 bg-card border border-border rounded-3xl p-5 md:p-6 flex flex-col justify-center relative overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between mb-3 md:mb-4 relative z-10">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                <Camera className="w-3 h-3 text-primary" />
                Camera Roll
              </div>
              <Link to="/gallery" className="text-xs text-primary hover:underline font-medium">
                See All
              </Link>
            </div>

            <div className="grid grid-cols-4 gap-3 md:gap-4 relative z-10">
              {recentPhotos?.map((photo) => {
                const url = supabase.storage.from("photos").getPublicUrl(photo.thumbnail_path || photo.storage_path)
                  .data.publicUrl;
                return (
                  <div
                    key={photo.id}
                    className="aspect-square rounded-xl overflow-hidden bg-muted relative group cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </div>
                );
              })}
              {(!recentPhotos || recentPhotos.length < 4) &&
                Array(4 - (recentPhotos?.length || 0))
                  .fill(0)
                  .map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl bg-secondary" />)}
            </div>
          </div>

          {/* 4. GLOBE (Bottom) */}
          <div className="col-span-1 md:col-span-2 min-h-[200px] md:min-h-0 md:row-span-2 rounded-3xl overflow-hidden border border-border bg-muted relative shadow-sm hover:shadow-lg transition-all">
            <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10 bg-card/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-foreground border border-border shadow-sm">
              Interactive Route
            </div>
            <MapEmbed className="w-full h-full" />
            <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-black/5 rounded-3xl" />
          </div>

          {/* 5. COMBINED STATS & HISTORY (Bottom) */}
          <div className="col-span-1 md:col-span-2 min-h-[250px] md:min-h-0 md:row-span-2">
            <TripProgressWidget destinations={destinations || []} />
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Home;
