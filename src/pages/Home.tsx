import { Navigation } from "@/components/Navigation";
import { BottomNav } from "@/components/BottomNav";
import { MapEmbed } from "@/components/MapEmbed";

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

  const { data: galleryPhotos } = useQuery({
    queryKey: ["galleryPhotosHome"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photos")
        .select("*, destinations(name, country, arrival_date)")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  // Group photos by country
  const photosByCountry = galleryPhotos?.reduce((acc, photo) => {
    const country = photo.destinations?.country || "Unknown";
    if (!acc[country]) {
      acc[country] = {
        photos: [],
        arrivalDate: photo.destinations?.arrival_date || "1900-01-01",
      };
    }
    acc[country].photos.push(photo);
    return acc;
  }, {} as Record<string, { photos: typeof galleryPhotos; arrivalDate: string }>);

  // Sort countries by destination arrival_date (most recently visited first)
  const sortedCountries = photosByCountry 
    ? Object.entries(photosByCountry)
        .sort((a, b) => {
          const aDate = new Date(a[1].arrivalDate).getTime();
          const bDate = new Date(b[1].arrivalDate).getTime();
          return bDate - aDate; // Most recently visited first
        })
        .map(([country, data]) => [country, data.photos] as [string, typeof galleryPhotos])
    : [];

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
        <div className="grid grid-cols-1 md:grid-cols-4 md:auto-rows-[220px] gap-4">
          {/* 1. LOCATION STATUS (Large) */}
          <div className="col-span-1 md:col-span-2 min-h-[280px] md:min-h-0 md:row-span-2 relative group overflow-hidden rounded-3xl border border-border bg-muted shadow-xl hover:shadow-2xl transition-all duration-500">
            {/* Background Image/Video with Map Fallback */}
            <div className="absolute inset-0">
              {bgMediaUrl ? (
                isVideo ? (
                  <>
                    {/* Show thumbnail on mobile, video on desktop */}
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
                      className="w-full h-full object-cover hidden md:block"
                    />
                  </>
                ) : (
                  <img
                    src={bgMediaUrl}
                    alt={currentDestination?.name || "Current Location"}
                    className="w-full h-full object-cover"
                    loading="eager"
                  />
                )
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

          {/* 2. RIGHT COLUMN - Stories + Camera Roll */}
          <div className="col-span-1 md:col-span-2 md:row-span-4 bg-card border border-border rounded-3xl p-4 md:p-5 flex flex-col shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
            {/* Latest Stories - Top */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                  <BookOpen className="w-3 h-3 text-primary" />
                  Latest Stories
                </div>
                <Link to="/blog" className="text-xs text-primary hover:underline font-medium">
                  View All
                </Link>
              </div>
              <div className="space-y-2">
                {recentPosts?.slice(0, 3).map((post) => (
                  <Link
                    key={post.id}
                    to={`/blog/${post.slug}`}
                    className="group flex items-center justify-between py-1.5 hover:bg-secondary/30 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <span className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate flex-1 mr-3">
                      {post.title}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(post.published_at || new Date()), "d MMM")} • {post.destinations?.country}
                    </span>
                  </Link>
                ))}
                {!recentPosts?.length && <p className="text-muted-foreground text-sm">No stories yet.</p>}
              </div>
            </div>

            {/* Camera Roll - Bottom */}
            <div className="flex-1 border-t border-border pt-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                  <Camera className="w-3 h-3 text-primary" />
                  Camera Roll
                </div>
                <Link to="/gallery" className="text-xs text-primary hover:underline font-medium">
                  See All
                </Link>
              </div>

              <div className="space-y-3">
                {sortedCountries.slice(0, 3).map(([country, photos]) => (
                  <div key={country}>
                    <h3 className="text-xs font-bold text-foreground mb-1.5">{country}</h3>
                    <div className="grid grid-cols-3 gap-1.5">
                      {photos?.slice(0, 3).map((photo) => {
                        const isPhotoVideo = photo.mime_type?.startsWith("video/");
                        const thumbnailUrl = photo.thumbnail_path
                          ? supabase.storage.from("photos").getPublicUrl(photo.thumbnail_path).data.publicUrl
                          : null;
                        const mediaUrl = supabase.storage.from("photos").getPublicUrl(photo.storage_path).data.publicUrl;
                        
                        return (
                          <div
                            key={photo.id}
                            className="aspect-square rounded-md overflow-hidden bg-muted relative group cursor-pointer shadow-sm hover:shadow-md"
                          >
                            <img
                              src={thumbnailUrl || mediaUrl}
                              alt=""
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              loading="lazy"
                            />
                            {isPhotoVideo && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-5 h-5 bg-black/50 rounded-full flex items-center justify-center">
                                  <div className="w-0 h-0 border-l-[6px] border-l-white border-y-[4px] border-y-transparent ml-0.5" />
                                </div>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {!galleryPhotos?.length && (
                  <div className="grid grid-cols-3 gap-1.5">
                    {Array(9).fill(0).map((_, i) => (
                      <Skeleton key={i} className="aspect-square rounded-md bg-secondary" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. GLOBE (Bottom Left) */}
          <div className="col-span-1 md:col-span-2 min-h-[200px] md:min-h-0 md:row-span-2 rounded-3xl overflow-hidden border border-border bg-muted relative shadow-sm hover:shadow-lg transition-all">
            <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10 bg-card/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-foreground border border-border shadow-sm">
              Interactive Route
            </div>
            <MapEmbed className="w-full h-full" />
            <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-black/5 rounded-3xl" />
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Home;
