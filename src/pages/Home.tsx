

import { useQuery } from "@tanstack/react-query";
import { formatLocation, getLocationParts } from "@/utils/location";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useJourney } from "@/hooks/useJourney";
import { MasonryGrid } from "@/components/ui/MasonryGrid";
import { PhotoCard } from "@/components/gallery/PhotoCard";
import { MapPin, Calendar, Navigation as NavIcon, ChevronRight, ArrowRight, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveMediaUrl } from "@/lib/utils";
import { MAPBOX_TOKEN } from "@/lib/mapbox";

const Home = () => {
  // --- Data Fetching ---
  const { segments, loading } = useJourney();

  // Derived State (re-implemented from old hook logic)
  const { currentDestination, nextDestination, stats } = (() => {
    if (!segments) return { currentDestination: null, nextDestination: null, stats: { daysOnRoad: 0, totalStops: 0 } };

    const now = new Date();

    // Find current segment
    const current = segments.find((d) => d.is_current)
      || segments.find((d) => {
        const start = new Date(d.arrival_date);
        const end = d.departure_date ? new Date(d.departure_date) : new Date(3000, 0, 1);
        return now >= start && now <= end;
      })
      || segments[0];

    // Find next segment
    let next = null;
    if (current) {
      const idx = segments.findIndex(s => s.id === current.id);
      if (idx !== -1 && idx < segments.length - 1) {
        next = segments[idx + 1];
      }
    }

    // Stats
    const totalStops = segments.length;
    const tripStartDate = segments[0]?.arrival_date ? new Date(segments[0].arrival_date) : new Date();
    // @ts-ignore
    const daysOnRoad = Math.max(0, Math.ceil((now - tripStartDate) / (1000 * 60 * 60 * 24)));

    return { currentDestination: current, nextDestination: next, stats: { daysOnRoad, totalStops } };
  })();

  // Destructure all needed
  // const { destinations, currentDestination, stats } = useJourney(); 
  // Wait, I can't call it twice comfortably. Let's merge.


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



  // --- Simplified Logic via Hook ---
  // Fallback to "Luxembourg" if nothing returned (though hook handles fallback)
  const currentName = currentDestination?.name || "";
  const currentCountry = currentDestination?.country || "";
  const currentLat = currentDestination?.latitude || 49.61;
  const currentLng = currentDestination?.longitude || 6.13;





  // Static Map - Minimal Light Style as requested
  // Using light-v11 for a clean, minimal look
  // Updated pin to medium (pin-m) and darker green (059669) for better contrast
  const staticMapUrl = `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/pin-m-circle+059669(${currentLng},${currentLat})/${currentLng},${currentLat},3/600x400@2x?access_token=${MAPBOX_TOKEN}&logo=false&attribution=false`;


  const daysLabel = `Day ${stats.daysOnRoad}`;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 md:pb-8">


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
                {currentDestination ? "Currently in" : "Welcome"}
              </span>
              <h1 className="font-display font-bold text-foreground text-5xl md:text-6xl leading-[1.1] tracking-tight mb-0 break-words max-w-full">
                {(() => {
                  if (!currentDestination) {
                    return "Ready to start";
                  }

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
            <div className="stats-container w-full flex items-center mt-2 border-t border-neutral-100 pt-8">
              {/* Day Count */}
              <div className="flex items-center pr-6 md:pr-8 border-r border-neutral-200/60">
                <Calendar className="stats-icon text-teal-600" strokeWidth={1.8} />
                <span className="font-medium tracking-tight whitespace-nowrap">
                  {daysLabel}
                </span>
              </div>

              {/* Stops Count */}
              <div className="flex items-center px-6 md:px-8 border-r border-neutral-200/60">
                <MapPin className="stats-icon text-teal-600" strokeWidth={1.8} />
                <span className="font-medium tracking-tight whitespace-nowrap">
                  {stats.totalStops} destinations
                </span>
              </div>

              {/* Moments Count */}
              <div className="flex items-center pl-6 md:pl-8">
                <Send className="stats-icon text-teal-600" strokeWidth={1.8} />
                <span className="font-medium tracking-tight whitespace-nowrap">
                  {momentsCount ?? 0} moments
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* FEATURED STORIES */}


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
