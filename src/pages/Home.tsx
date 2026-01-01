import { Navigation } from "@/components/Navigation";
import { VideoThumbnail } from "@/components/VideoThumbnail";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
import { MasonryGrid } from "@/components/ui/MasonryGrid";
import { PhotoCard } from "@/components/gallery/PhotoCard";
import { MapPin, Calendar, Navigation as NavIcon, ChevronRight, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveMediaUrl } from "@/lib/utils";
import { MAPBOX_TOKEN } from "@/lib/mapbox";

const Home = () => {
  // --- Data Fetching ---
  const { data: destinations } = useQuery({
    queryKey: ["destinations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("destinations")
        .select("*")
        .order("arrival_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: momentsCount } = useQuery({
    queryKey: ["momentsCount"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("moments")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count;
    },
  });

  const { data: recentMoments } = useQuery({
    queryKey: ["recentMomentsHome"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("moments")
        .select("*")
        .in("media_type", ["photo", "video"])
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
  });

  const { data: stories } = useQuery({
    queryKey: ["published_stories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select(`
          *,
          story_moments (
            sort_order,
            moments (
              storage_path
            )
          )
        `)
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Transform to get the fallback image
      return data.map(story => {
        const firstMomentPath = story.story_moments?.[0]?.moments?.storage_path;
        return {
          ...story,
          cover_image_path: story.cover_image_path || firstMomentPath
        };
      });
    },
  });

  // --- Logic for "Currently In" and "Next" ---
  const now = new Date();
  const firstDestination = destinations?.[0];

  // Find strictly active destination
  const activeDestination = destinations?.find((d) => {
    const start = new Date(d.arrival_date);
    const end = d.departure_date ? new Date(d.departure_date) : new Date(3000, 0, 1);
    return now >= start && now <= end;
  });

  // If no active destination, it means we are either before the first trip or between trips (or after all trips).
  // Implicit rule from user: If before first trip, we are in "Luxembourg".
  // If we are active, we are there.

  let currentName = "Luxembourg";
  let currentCountry = "Luxembourg";
  let currentLat = 49.61; // Luxembourg approx
  let currentLng = 6.13;

  if (activeDestination) {
    currentName = activeDestination.name;
    currentCountry = activeDestination.country;
    currentLat = activeDestination.latitude;
    currentLng = activeDestination.longitude;
  }

  // "Next" logic
  // If active, next is the one after active.
  // If not active and before first, next is first.
  let nextDestination = null;
  if (activeDestination) {
    const activeIndex = destinations?.findIndex(d => d.id === activeDestination.id) ?? -1;
    if (activeIndex >= 0 && destinations && activeIndex < destinations.length - 1) {
      nextDestination = destinations[activeIndex + 1];
    }
  } else if (destinations && destinations.length > 0) {
    // Check if we are past the last one
    const lastDest = destinations[destinations.length - 1];
    if (now < new Date(firstDestination?.arrival_date ?? 0)) {
      nextDestination = firstDestination;
    } else if (now > new Date(lastDest.arrival_date)) {
      // Post trip? Maybe nothing up next or "Home"
      nextDestination = null;
    }
  }

  // Trip Days Logic
  let daysLabel = "Day 0";
  // The User says: "before the trip starts... in XX days".
  // Trip start date is usually the first destination's arrival date.
  const tripStartDate = firstDestination ? new Date(firstDestination.arrival_date) : null;

  if (tripStartDate) {
    const diff = differenceInDays(now, tripStartDate);
    // differenceInDays(later, earlier) returns positive.
    // If now < tripStart, diff is negative. e.g. -56.

    if (diff < 0) {
      daysLabel = `In ${Math.abs(diff)} days`;
    } else {
      daysLabel = `Day ${diff + 1}`;
    }
  }

  // Static Map - Minimal Light Style as requested
  // Using light-v11 for a clean, minimal look
  const staticMapUrl = `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/pin-s-circle+10b981(${currentLng},${currentLat})/${currentLng},${currentLat},3/600x400@2x?access_token=${MAPBOX_TOKEN}&logo=false&attribution=false`;


  return (
    <div className="min-h-screen bg-background text-foreground pb-20 md:pb-8">
      <Navigation />

      <main className="container mx-auto px-4 pt-20 md:pt-28 space-y-12">
        {/* JOURNEY STRIP */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="flex flex-col md:flex-row">
            {/* Static Map Image - Full Height/Width cover */}
            <div className="w-full md:w-1/3 min-h-[200px] md:h-auto relative bg-muted self-stretch">
              <img
                src={staticMapUrl}
                alt="Current Location Map"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <Link
                to="/map"
                className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 hover:bg-white transition-colors border border-black/5 shadow-sm text-foreground/80"
              >
                Full journey <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Current Location + Stats */}
            {/* Current Location + Stats */}
            <div className="flex-1 p-6 md:p-10 flex flex-col justify-center">
              <div className="flex items-center gap-3 text-xs text-primary/80 font-semibold uppercase tracking-wide mb-4">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-primary opacity-40"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                </span>
                Currently in
              </div>

              <h1 className="font-display text-6xl md:text-8xl font-bold text-foreground tracking-tighter leading-[0.9] mb-3">
                {currentName}
              </h1>
              <p className="font-sans text-xl md:text-2xl text-muted-foreground font-medium mb-10">
                {currentCountry}
              </p>

              {/* Up Next Indicator */}
              {nextDestination && (
                <div className="mb-10 inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70 bg-secondary/50 px-3 py-1.5 rounded-full w-fit">
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>
                    Next: <span className="text-foreground">{nextDestination.name}</span>
                  </span>
                </div>
              )}

              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground/60">
                <div className="flex items-center gap-2">
                  <span className="text-foreground text-sm font-bold font-sans tracking-normal normal-case">{daysLabel}</span>
                </div>
                <div className="hidden sm:block opacity-30">•</div>
                <div className="flex items-center gap-2">
                  <span className="text-foreground text-sm font-bold font-sans tracking-normal normal-case">{destinations?.length || 0}</span>
                  <span>stops</span>
                </div>
                <div className="hidden sm:block opacity-30">•</div>
                <div className="flex items-center gap-2">
                  <span className="text-foreground text-sm font-bold font-sans tracking-normal normal-case">{momentsCount ?? 0}</span>
                  <span>moments</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FEATURED STORIES */}
        {stories && stories.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-8 border-b border-border/40 pb-4">
              <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground">Stories</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stories.map((story) => (
                <Link key={story.id} to={`/story/${story.id}`}>
                  <div className="group relative aspect-video md:aspect-[4/3] overflow-hidden bg-muted cursor-pointer transition-all duration-500 hover:shadow-2xl">
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors z-10" />
                    {story.cover_image_path ? (
                      <img src={resolveMediaUrl(story.cover_image_path, { width: 300, quality: 70 })} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt={story.title} />
                    ) : (
                      <div className="w-full h-full bg-secondary flex items-center justify-center text-muted-foreground">
                        <Calendar className="w-8 h-8" strokeWidth={1.5} />
                      </div>
                    )}

                    <div className="absolute inset-0 p-6 flex flex-col justify-end z-20 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-90">
                      <h3 className="font-display text-2xl font-bold text-white leading-tight mb-2 group-hover:-translate-y-1 transition-transform duration-300">{story.title}</h3>
                      {story.description && <p className="text-white/80 text-sm line-clamp-1 font-medium tracking-wide">{story.description}</p>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* LIVING MOMENTS FEED */}
        <div>
          <div className="flex items-center justify-between mb-8 border-b border-border/40 pb-4">
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground">Latest moments</h2>
            <Link to="/gallery" className="group flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors">
              Browse all moments
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={1.5} />
            </Link>
          </div>

          {/* Grid of moments - Masonry Layout */}
          <MasonryGrid>
            {recentMoments?.map((moment, index) => {
              const isMomentVideo = moment.mime_type?.startsWith("video/");

              // Use PhotoCard for consistent UI
              return (
                <div
                  key={moment.id}
                  className="masonry-item w-1/2 md:w-1/3 lg:w-1/4 p-3"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <PhotoCard
                    id={moment.id}
                    storagePath={moment.storage_path || ""}
                    thumbnailPath={moment.thumbnail_path}
                    title={undefined} // Homepage usually lacks titles, rely on caption
                    description={moment.caption || undefined}
                    latitude={moment.latitude || undefined}
                    longitude={moment.longitude || undefined}
                    takenAt={moment.taken_at || undefined}
                    mimeType={moment.mime_type || undefined}
                    className="w-full"
                    destinationName={moment.location_name || undefined}
                  // No explicit onClick or status toggle for homepage yet, keeping it simple
                  />
                </div>
              );
            })}
          </MasonryGrid>
          {/* Skeleton loaders */}
          {(!recentMoments || recentMoments.length === 0) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array(8)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-xl bg-secondary" />
                ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Home;
