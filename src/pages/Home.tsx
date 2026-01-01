import { Navigation } from "@/components/Navigation";
import { VideoThumbnail } from "@/components/VideoThumbnail";
import { useQuery } from "@tanstack/react-query";
import { formatLocation, getLocationParts } from "@/utils/location";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
import { MasonryGrid } from "@/components/ui/MasonryGrid";
import { PhotoCard } from "@/components/gallery/PhotoCard";
import { MapPin, Calendar, Navigation as NavIcon, ChevronRight, ArrowRight, Send } from "lucide-react";
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
        .in("media_type", ["photo", "video"])
        .order("taken_at", { ascending: false })
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

  // Determine the "True Current" context
  // Priority: 
  // 1. Future Moment (Simulation/Flash Forward)
  // 2. Active Destination (Reality Check)
  // 3. Latest Past Data (Moment or Destination)

  let currentName = "Luxembourg";
  let currentCountry = "Luxembourg";
  let currentLat = 49.61; // Luxembourg approx
  let currentLng = 6.13;

  const latestMoment = recentMoments?.[0];
  const momentDate = latestMoment
    ? new Date(latestMoment.taken_at || latestMoment.created_at).getTime()
    : 0;

  // Check if moment is in the future relative to "Now" (Active Context)
  if (latestMoment && momentDate > now.getTime()) {
    // Future moment wins (Test/Simulation Mode)
    currentName = latestMoment.location_name || "Unknown Location";
    // @ts-ignore - Assuming country exists on moment from database
    currentCountry = latestMoment.country || "On the road";
    currentLat = latestMoment.latitude || currentLat;
    currentLng = latestMoment.longitude || currentLng;
  } else if (activeDestination) {
    currentName = activeDestination.name;
    currentCountry = activeDestination.country;
    currentLat = activeDestination.latitude;
    currentLng = activeDestination.longitude;
  } else {
    // If no active destination, find the latest recorded location (Destination or Moment)
    const lastDestination = destinations
      ?.filter((d) => new Date(d.arrival_date) <= now)
      .sort((a, b) => new Date(b.arrival_date).getTime() - new Date(a.arrival_date).getTime())[0];

    const lastDestDate = lastDestination
      ? new Date(lastDestination.departure_date || lastDestination.arrival_date).getTime()
      : 0;

    if (latestMoment && momentDate > lastDestDate) {
      // Moment is the latest truth
      currentName = latestMoment.location_name || "Unknown Location";
      // @ts-ignore - Assuming country exists on moment from database
      currentCountry = latestMoment.country || "On the road";
      currentLat = latestMoment.latitude || currentLat;
      currentLng = latestMoment.longitude || currentLng;
    } else if (lastDestination) {
      // Last destination is the latest truth
      currentName = lastDestination.name;
      currentCountry = lastDestination.country;
      currentLat = lastDestination.latitude;
      currentLng = lastDestination.longitude;
    }
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
  // Updated pin to medium (pin-m) and darker green (059669) for better contrast
  const staticMapUrl = `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/pin-m-circle+059669(${currentLng},${currentLat})/${currentLng},${currentLat},3/600x400@2x?access_token=${MAPBOX_TOKEN}&logo=false&attribution=false`;


  return (
    <div className="min-h-screen bg-background text-foreground pb-20 md:pb-8">
      <Navigation />

      <main className="container mx-auto px-4 pt-20 md:pt-28 space-y-12">
        {/* JOURNEY STRIP */}
        <div className="bg-white rounded-[24px] overflow-hidden shadow-sm flex flex-col md:flex-row min-h-[500px]">
          {/* Left Column: Map (40%) */}
          <div className="w-full md:w-[40%] relative bg-muted shrink-0 order-first">
            <img
              src={staticMapUrl}
              alt="Current Location Map"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <Link
              to="/map"
              className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full text-xs font-medium flex items-center gap-1.5 hover:bg-white transition-colors text-foreground shadow-sm"
            >
              Full journey <ChevronRight className="w-3 h-3 opacity-60" />
            </Link>
          </div>

          {/* Right Column: Content (60%) */}
          <div className="flex-1 md:w-[60%] p-8 md:p-12 flex flex-col justify-center items-start text-left bg-white">
            {/* Location Info */}
            <div className="flex flex-col items-start text-left w-full">
              <span className="font-sans text-xs font-semibold uppercase tracking-[2px] text-muted-foreground mb-4 pl-0.5 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300">
                Currently in
              </span>
              <h1 className="font-display font-bold text-foreground text-5xl md:text-6xl leading-[1.1] tracking-tight mb-0 break-words max-w-full">
                {(() => {
                  const parts = getLocationParts(currentName, currentCountry);
                  return (
                    <>
                      {parts.name}
                      {parts.country && <span className="text-muted-foreground font-normal ml-0 md:ml-0 text-2xl md:text-3xl block md:inline mt-1 md:mt-0 tracking-normal">
                        <span className="hidden md:inline">, </span>{parts.country}
                      </span>}
                    </>
                  );
                })()}
              </h1>
            </div>

            {/* Up Next Indicator - Secondary Destination */}
            {nextDestination && (
              <div className="mt-6 flex items-baseline gap-3 font-sans pl-0.5 animate-in fade-in slide-in-from-bottom-3 duration-700 delay-700">
                <span className="text-sm font-medium text-muted-foreground">Next</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground/60 translate-y-[3px]" strokeWidth={1.5} />
                <span className="text-lg font-medium text-foreground">{nextDestination.name}</span>
              </div>
            )}

            {/* refined stats row */}
            <div className="w-full flex items-center mt-2 border-t border-neutral-100 pt-8">
              {/* Day Count */}
              <div className="flex items-center gap-3 md:gap-4 pr-6 md:pr-8 border-r border-neutral-200/60">
                <Calendar className="w-6 h-6 text-teal-600" strokeWidth={1.8} />
                <span className="text-lg md:text-xl font-medium text-foreground tracking-tight whitespace-nowrap">
                  {daysLabel}
                </span>
              </div>

              {/* Stops Count */}
              <div className="flex items-center gap-3 md:gap-4 px-6 md:px-8 border-r border-neutral-200/60">
                <MapPin className="w-6 h-6 text-teal-600" strokeWidth={1.8} />
                <span className="text-lg md:text-xl font-medium text-foreground tracking-tight whitespace-nowrap">
                  {destinations?.length || 0} destinations
                </span>
              </div>

              {/* Moments Count */}
              <div className="flex items-center gap-3 md:gap-4 pl-6 md:pl-8">
                <Send className="w-6 h-6 text-teal-600" strokeWidth={1.8} />
                <span className="text-lg md:text-xl font-medium text-foreground tracking-tight whitespace-nowrap">
                  {momentsCount ?? 0} moments
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* FEATURED STORIES */}
        {stories && stories.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-border/40">
              <h2 className="font-display text-xl md:text-2xl font-semibold tracking-tight text-foreground">Stories</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stories.map((story) => (
                <Link key={story.id} to={`/story/${story.id}`}>
                  <div className="group relative aspect-video md:aspect-[4/3] overflow-hidden bg-muted cursor-pointer">
                    <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors z-10" />
                    {story.cover_image_path ? (
                      <img src={resolveMediaUrl(story.cover_image_path, { width: 300, quality: 70 })} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={story.title} />
                    ) : (
                      <div className="w-full h-full bg-secondary flex items-center justify-center text-muted-foreground">
                        <Calendar className="w-8 h-8" strokeWidth={1.5} />
                      </div>
                    )}

                    <div className="absolute inset-0 p-6 flex flex-col justify-end z-20 bg-gradient-to-t from-black/60 to-transparent">
                      <h3 className="font-display text-lg font-semibold text-white leading-tight mb-1">{story.title}</h3>
                      {story.description && <p className="text-white/80 text-sm line-clamp-1 font-sans font-normal">{story.description}</p>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* LIVING MOMENTS FEED */}
        <div>
          <div className="flex items-baseline justify-between mb-6 pb-2 border-b border-border/40">
            <h2 className="font-display text-xl md:text-2xl font-semibold tracking-tight text-foreground">Latest moments</h2>
            <Link to="/gallery" className="group flex items-center gap-1.5 font-sans text-xs font-medium text-muted-foreground hover:text-foreground hover:underline underline-offset-4 decoration-muted-foreground/30 transition-all">
              Browse all
              <ArrowRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={1.5} />
            </Link>
          </div>

          {/* Grid of moments - Standard Grid 4 cols */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recentMoments?.map((moment, index) => (
              <div
                key={moment.id}
                className="w-full animate-in fade-in zoom-in-50 duration-500 fill-mode-both"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[12px] bg-muted shadow-sm group cursor-pointer">
                  <PhotoCard
                    id={moment.id}
                    storagePath={moment.storage_path || ""}
                    thumbnailPath={moment.thumbnail_path}
                    title={undefined}
                    description={moment.caption || undefined}
                    latitude={moment.latitude || undefined}
                    longitude={moment.longitude || undefined}
                    takenAt={moment.taken_at || undefined}
                    mimeType={moment.mime_type || undefined}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    destinationName={moment.location_name || undefined}
                  />
                </div>
              </div>
            ))}

            {/* Skeletons / Empty Slots */}
            {(!recentMoments || recentMoments.length === 0) && (
              Array(4).fill(0).map((_, i) => (
                <Skeleton key={`skel-${i}`} className="aspect-[4/3] w-full rounded-[12px] bg-secondary/50" />
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
