import { Navigation } from "@/components/Navigation";
import { BottomNav } from "@/components/BottomNav";
import { MapEmbed } from "@/components/MapEmbed";
import { ContactWidget, PlaylistWidget, StatBox } from "@/components/DashboardWidgets";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, format } from "date-fns";
import { Calendar, Globe, MapPin, Navigation as NavIcon, Camera, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
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
        .order("arrival_date", { ascending: false }); // Latest first for list
      if (error) throw error;
      return data;
    },
  });

  // Calculate current destination immediately so we can fetch its image
  const currentDestination = destinations?.find((d) => d.is_current) || destinations?.[0];

  // Fetch background image for the current location
  const { data: locationImage } = useQuery({
    queryKey: ["locationImage", currentDestination?.id],
    queryFn: async () => {
      if (!currentDestination?.id) return null;
      const { data, error } = await supabase
        .from("photos")
        .select("storage_path")
        .eq("destination_id", currentDestination.id)
        .order("is_hero", { ascending: false }) // Prefer hero images if available, otherwise any
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!currentDestination?.id,
  });

  const { data: countryCount } = useQuery({
    queryKey: ["countryCount"],
    queryFn: async () => {
      const { data, error } = await supabase.from("destinations").select("country");
      if (error) throw error;
      const uniqueCountries = new Set(data.map((d) => d.country));
      return Math.max(0, uniqueCountries.size);
    },
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

  // Start date for days calc (Assuming first trip was the last in the array if sorted desc)
  const firstTripDate = destinations?.[destinations.length - 1]?.arrival_date;
  const daysTravellling = firstTripDate ? differenceInDays(new Date(), new Date(firstTripDate)) + 1 : 0;

  // Approx km (mock logic)
  const totalKm = (countryCount || 0) * 1245 + 340;

  // Prepare background image URL
  const bgImageUrl = locationImage
    ? supabase.storage.from("photos").getPublicUrl(locationImage.storage_path).data.publicUrl
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 md:pb-8 selection:bg-primary/20 selection:text-primary">
      <Navigation />

      <main className="container mx-auto px-4 pt-24 md:pt-28">
        {/* BENTO GRID LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-4 auto-rows-[180px] gap-4">
          {/* 1. LOCATION STATUS (Large) */}
          <div className="col-span-1 md:col-span-2 row-span-1 md:row-span-2 relative group overflow-hidden rounded-3xl bg-card shadow-lg hover:shadow-xl transition-all duration-500 border border-border">
            {/* Background Image with Map Fallback */}
            <div className="absolute inset-0 transition-all duration-700 group-hover:scale-105">
              {bgImageUrl ? (
                <img
                  src={bgImageUrl}
                  alt={currentDestination?.name || "Current Location"}
                  className="w-full h-full object-cover opacity-90"
                />
              ) : (
                <div className="w-full h-full opacity-60">
                  <MapEmbed className="w-full h-full pointer-events-none" />
                </div>
              )}
            </div>

            {/* Dark gradient overlay to ensure text readability on light theme with image */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            <div className="absolute inset-0 p-8 flex flex-col justify-end">
              <div className="space-y-1 mb-6">
                <div className="flex items-center gap-2 text-white/90 font-bold uppercase tracking-widest text-xs mb-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  Current Location
                </div>
                <h1 className="text-4xl md:text-5xl font-display font-bold text-white leading-tight drop-shadow-sm">
                  {currentDestination?.name || "Unknown"}
                </h1>
                <p className="text-xl md:text-2xl text-white/90 font-light drop-shadow-sm">
                  {currentDestination?.country}, {currentDestination?.continent}
                </p>
              </div>

              <div className="flex items-center gap-4 text-sm text-white/80 border-t border-white/20 pt-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Since{" "}
                  {currentDestination?.arrival_date ? format(new Date(currentDestination.arrival_date), "MMM d") : "-"}
                </div>
                <div className="w-px h-4 bg-white/30" />
                <div className="flex items-center gap-2">
                  <NavIcon className="w-4 h-4" />
                  {currentDestination?.latitude.toFixed(2)}° N, {currentDestination?.longitude.toFixed(2)}° E
                </div>
              </div>
            </div>
          </div>

          {/* 2. STATS: Days (Small) */}
          <div className="col-span-1 row-span-1">
            <StatBox label="Days on Road" value={daysTravellling} icon={Calendar} />
          </div>

          {/* 3. DESTINATIONS LIST (Tall) */}
          <div className="col-span-1 row-span-1 md:row-span-2 bg-card border border-border rounded-3xl p-6 flex flex-col overflow-hidden relative shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4 z-10">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                <MapPin className="w-3 h-3 text-primary" />
                History
              </div>
              <Badge variant="outline" className="border-border text-xs bg-secondary/50">
                {destinations?.length || 0} Stops
              </Badge>
            </div>

            <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-card to-transparent pointer-events-none z-0" />

            <ScrollArea className="flex-1 -mx-4 px-4 bento-scroll">
              <div className="space-y-1 relative z-0 py-2">
                {/* Timeline line */}
                <div className="absolute left-[19px] top-4 bottom-4 w-px bg-border" />

                {destinations?.map((dest, i) => (
                  <div key={dest.id} className="relative pl-8 py-2 group cursor-default">
                    <div
                      className={`absolute left-4 top-3.5 w-1.5 h-1.5 rounded-full ring-4 ring-card ${i === 0 ? "bg-primary" : "bg-muted-foreground/30 group-hover:bg-primary/50"} transition-colors`}
                    />
                    <p
                      className={`text-sm font-medium ${i === 0 ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"} transition-colors`}
                    >
                      {dest.name}
                    </p>
                    <p className="text-xs text-muted-foreground/60">{dest.country}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-card to-transparent pointer-events-none z-10" />
          </div>

          {/* 4. STATS: Distance (Small) */}
          <div className="col-span-1 row-span-1">
            <StatBox label="Distance" value={`${(totalKm / 1000).toFixed(1)}k`} subtext="km" icon={Globe} />
          </div>

          {/* 5. GLOBE (Wide) */}
          <div className="col-span-1 md:col-span-2 row-span-1 md:row-span-2 rounded-3xl overflow-hidden border border-border bg-slate-50 relative group shadow-sm hover:shadow-md transition-all">
            <div className="absolute top-6 left-6 z-10 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-foreground border border-white/20 shadow-sm">
              Interactive Route
            </div>
            <MapEmbed className="w-full h-full opacity-90 transition-opacity group-hover:opacity-100" />
            {/* Overlay gradient to blend edges */}
            <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-black/5 rounded-3xl" />
          </div>

          {/* 6. PLAYLIST (Small) */}
          <div className="col-span-1 row-span-1">
            <PlaylistWidget />
          </div>

          {/* 7. CONTACT (Small) */}
          <div className="col-span-1 row-span-1">
            <ContactWidget />
          </div>

          {/* 8. LATEST STORIES (Wide Row) */}
          <div className="col-span-1 md:col-span-2 row-span-1 md:row-span-1 bg-card border border-border rounded-3xl p-6 flex flex-col justify-center shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                <BookOpen className="w-3 h-3 text-primary" />
                Latest Stories
              </div>
              <Link to="/blog" className="text-xs text-primary hover:underline">
                View All
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentPosts?.slice(0, 2).map((post) => (
                <Link
                  key={post.id}
                  to={`/blog/${post.slug}`}
                  className="group flex gap-4 items-center bg-secondary/30 p-3 rounded-xl hover:bg-secondary/60 transition-colors"
                >
                  <div className="w-16 h-16 rounded-lg bg-muted shrink-0 overflow-hidden">
                    {post.cover_image_url && (
                      <img
                        src={post.cover_image_url}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-foreground truncate">{post.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(post.published_at || new Date()), "MMM d")} • {post.destinations?.country}
                    </p>
                  </div>
                </Link>
              ))}
              {!recentPosts?.length && <p className="text-muted-foreground text-sm">No stories yet.</p>}
            </div>
          </div>

          {/* 9. LATEST MEDIA (Wide Row) */}
          <div className="col-span-1 md:col-span-2 row-span-1 bg-card border border-border rounded-3xl p-6 flex flex-col justify-center relative overflow-hidden shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                <Camera className="w-3 h-3 text-primary" />
                Camera Roll
              </div>
              <Link to="/gallery" className="text-xs text-primary hover:underline">
                See All
              </Link>
            </div>

            <div className="grid grid-cols-4 gap-2 relative z-10">
              {recentPhotos?.map((photo) => {
                const url = supabase.storage.from("photos").getPublicUrl(photo.thumbnail_path || photo.storage_path)
                  .data.publicUrl;
                return (
                  <div
                    key={photo.id}
                    className="aspect-square rounded-lg overflow-hidden bg-muted relative group cursor-pointer"
                  >
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </div>
                );
              })}
              {(!recentPhotos || recentPhotos.length < 4) &&
                Array(4 - (recentPhotos?.length || 0))
                  .fill(0)
                  .map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg bg-secondary/50" />)}
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Home;
