import { Navigation } from "@/components/Navigation";
import { BottomNav } from "@/components/BottomNav";
import { MapEmbed } from "@/components/MapEmbed";
import { TripProgressWidget } from "@/components/DashboardWidgets";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Calendar, Navigation as NavIcon, Camera, BookOpen, Map as MapIcon, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

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
        .select("storage_path, thumbnail_path, mime_type")
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
        .limit(2); // Reduced to 2 to fit better visuals
      if (error) throw error;
      return data;
    },
  });

  // --- Calculations ---

  const isVideo = locationImage?.mime_type?.startsWith("video/");
  const bgMediaUrl = locationImage
    ? supabase.storage.from("photos").getPublicUrl(locationImage.storage_path).data.publicUrl
    : null;
  const bgThumbnailUrl = locationImage?.thumbnail_path
    ? supabase.storage.from("photos").getPublicUrl(locationImage.thumbnail_path).data.publicUrl
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 md:pb-8 selection:bg-primary/20 selection:text-primary">
      <Navigation />

      <main className="container mx-auto px-4 pt-20 md:pt-28">
        {/* BENTO GRID LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-4 md:auto-rows-[180px] gap-4">
          {/* 1. LOCATION STATUS (Large Hero - Left) */}
          <div className="col-span-1 md:col-span-2 min-h-[300px] md:min-h-0 md:row-span-2 relative group overflow-hidden rounded-3xl border border-border bg-muted shadow-lg hover:shadow-xl transition-all duration-500">
            {/* Background Image/Video */}
            <div className="absolute inset-0">
              {bgMediaUrl ? (
                isVideo ? (
                  <>
                    <img
                      src={bgThumbnailUrl || bgMediaUrl}
                      alt={currentDestination?.name || "Current Location"}
                      className="w-full h-full object-cover md:hidden"
                      loading="eager"
                    />
                    <video
                      src={bgMediaUrl}
                      poster={bgThumbnailUrl || undefined}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="w-full h-full object-cover hidden md:block scale-105 group-hover:scale-100 transition-transform duration-[2s]"
                    />
                  </>
                ) : (
                  <img
                    src={bgMediaUrl}
                    alt={currentDestination?.name || "Current Location"}
                    className="w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-[2s]"
                    loading="eager"
                  />
                )
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900" />
              )}
            </div>

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 md:opacity-60 transition-opacity" />

            <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end">
              <div className="space-y-1 mb-4 md:mb-6">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="bg-black/30 text-white border-white/20 backdrop-blur-md uppercase tracking-wider text-[10px] px-2 py-0.5"
                  >
                    <span className="relative flex h-1.5 w-1.5 mr-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                    </span>
                    Live Location
                  </Badge>
                </div>
                <h1 className="text-4xl md:text-5xl font-display font-bold text-white leading-tight drop-shadow-lg tracking-tight">
                  {currentDestination?.name || "Unknown"}
                </h1>
                <p className="text-xl md:text-2xl text-white/90 font-light drop-shadow-md flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  {currentDestination?.country}
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs md:text-sm text-white/70 border-t border-white/10 pt-4 backdrop-blur-[2px]">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  Arrived{" "}
                  {currentDestination?.arrival_date ? format(new Date(currentDestination.arrival_date), "MMM d") : "-"}
                </div>
                <div className="w-px h-3 bg-white/20" />
                <div className="flex items-center gap-2">
                  <NavIcon className="w-3.5 h-3.5 text-primary" />
                  {currentDestination?.latitude?.toFixed(2)}° N, {currentDestination?.longitude?.toFixed(2)}° E
                </div>
              </div>
            </div>
          </div>

          {/* 2. LATEST STORIES (Enhanced Visuals - Top Right) */}
          <div className="col-span-1 md:col-span-2 md:row-span-1 bg-card border border-border rounded-3xl p-5 flex flex-col justify-center shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                <BookOpen className="w-3 h-3 text-primary" />
                Recent Journal
              </div>
              <Link to="/blog" className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
                View All <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full">
              {recentPosts?.map((post) => (
                <Link
                  key={post.id}
                  to={`/blog/${post.slug}`}
                  className="group relative rounded-xl overflow-hidden min-h-[100px] border border-border/50"
                >
                  {/* Background Image */}
                  <div className="absolute inset-0">
                    {post.cover_image_url ? (
                      <img
                        src={post.cover_image_url}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full bg-secondary" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                  </div>

                  {/* Text Content */}
                  <div className="absolute inset-0 p-4 flex flex-col justify-end">
                    <h4 className="font-bold text-white text-sm leading-snug line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                      {post.title}
                    </h4>
                    <p className="text-[10px] text-white/70 font-medium">
                      {format(new Date(post.published_at || new Date()), "MMM d")} • {post.destinations?.country}
                    </p>
                  </div>
                </Link>
              ))}
              {!recentPosts?.length && (
                <div className="col-span-2 flex items-center justify-center text-muted-foreground text-sm h-full bg-secondary/20 rounded-xl border border-dashed">
                  No stories yet.
                </div>
              )}
            </div>
          </div>

          {/* 3. LATEST MEDIA (Middle Right) */}
          <div className="col-span-1 md:col-span-2 md:row-span-1 bg-card border border-border rounded-3xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                <Camera className="w-3 h-3 text-primary" />
                Latest Captures
              </div>
              <Link to="/gallery" className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
                Gallery <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-4 gap-3 h-24 md:h-auto">
              {recentPhotos?.map((photo) => {
                const isPhotoVideo = photo.mime_type?.startsWith("video/");
                const thumbnailUrl = photo.thumbnail_path
                  ? supabase.storage.from("photos").getPublicUrl(photo.thumbnail_path).data.publicUrl
                  : null;
                const mediaUrl = supabase.storage.from("photos").getPublicUrl(photo.storage_path).data.publicUrl;

                return (
                  <Link
                    key={photo.id}
                    to="/gallery"
                    className="relative aspect-square rounded-xl overflow-hidden bg-muted group cursor-pointer shadow-sm border border-border/50"
                  >
                    <img
                      src={thumbnailUrl || mediaUrl}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                    {isPhotoVideo && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-6 h-6 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
                          <div className="w-0 h-0 border-l-[6px] border-l-white border-y-[4px] border-y-transparent ml-0.5" />
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </Link>
                );
              })}
              {(!recentPhotos || recentPhotos.length < 4) &&
                Array(4 - (recentPhotos?.length || 0))
                  .fill(0)
                  .map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl bg-secondary" />)}
            </div>
          </div>

          {/* 4. GLOBE (Bottom Left) */}
          <div className="col-span-1 md:col-span-2 min-h-[250px] md:min-h-0 md:row-span-2 rounded-3xl overflow-hidden border border-border bg-slate-900 relative shadow-md group">
            <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-medium text-white border border-white/10 shadow-sm flex items-center gap-2">
              <MapIcon className="w-3 h-3 text-primary" />
              Route Map
            </div>
            <MapEmbed className="w-full h-full opacity-90 transition-opacity group-hover:opacity-100" />

            {/* Interactive hint overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div className="bg-black/50 text-white text-xs px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                Click to explore
              </div>
            </div>
          </div>

          {/* 5. HISTORY WIDGET (Bottom Right) */}
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
