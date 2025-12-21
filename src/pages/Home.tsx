import { Navigation } from "@/components/Navigation";
import { VideoThumbnail } from "@/components/VideoThumbnail";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
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

  const { count: momentsCount } = useQuery({
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

  // Static Map - Focus on current location
  // Mapbox Static Images API
  // Using satelite or dark style? User had a dark globe in screenshot but light in others. 
  // User screenshot shows a dark/space globe. "Satellite-v9" or "dark-v11"?
  // The screenshot says "mapbox" and looks like a globe view.
  // Static API doesn't do 3D globes well (it projects to flat image), but we can use "satellite-streets-v12" for a nice look or "dark-v11".
  // Let's try to match the dark aesthetic from the screenshot roughly, or just clean light if generic.
  // User asked for "astatic map which indictaes with a marker where we are now".
  const staticMapUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/pin-s-circle+10b981(${currentLng},${currentLat})/${currentLng},${currentLat},3/600x400@2x?access_token=${MAPBOX_TOKEN}&logo=false&attribution=false`;


  return (
    <div className="min-h-screen bg-background text-foreground pb-20 md:pb-8">
      <Navigation />

      <main className="container mx-auto px-4 pt-20 md:pt-28 space-y-12">
        {/* JOURNEY STRIP */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="flex flex-col md:flex-row">
            {/* Static Map Image */}
            <div className="w-full md:w-1/3 h-40 md:h-48 relative bg-muted">
              <img
                src={staticMapUrl}
                alt="Current Location Map"
                className="w-full h-full object-cover"
              />
              <Link
                to="/map"
                className="absolute bottom-3 right-3 bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 hover:bg-card transition-colors border border-border shadow-sm"
              >
                Full journey <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Current Location + Stats */}
            <div className="flex-1 p-5 md:p-6 flex flex-col justify-center">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Currently in
              </div>

              <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground leading-tight mb-1">
                {currentName}
              </h1>
              <p className="text-muted-foreground mb-4">
                {currentCountry}
              </p>

              {/* Up Next Indicator */}
              {nextDestination && (
                <div className="mb-4 inline-flex items-center gap-2 text-xs font-medium text-muted-foreground/80 bg-muted/50 px-2 py-1 rounded-md w-fit">
                  <ArrowRight className="w-3 h-3" />
                  Next: <span className="text-foreground">{nextDestination.name}</span>
                  <span className="opacity-50">({format(new Date(nextDestination.arrival_date), "MMM d")})</span>
                </div>
              )}

              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="font-medium text-foreground">{daysLabel}</span>
                </div>
                <div className="w-px h-4 bg-border hidden sm:block" />
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="font-medium text-foreground">{destinations?.length || 0}</span>
                  <span>stops</span>
                </div>
                <div className="w-px h-4 bg-border hidden sm:block" />
                <div className="flex items-center gap-1.5">
                  <NavIcon className="w-4 h-4 text-primary" />
                  <span className="font-medium text-foreground">{momentsCount ?? 0}</span>
                  <span>moments</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FEATURED STORIES */}
        {stories && stories.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-semibold text-foreground">Stories</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stories.map((story) => (
                <Link key={story.id} to={`/story/${story.id}`}>
                  <div className="group relative aspect-video md:aspect-[4/3] overflow-hidden rounded-xl bg-muted cursor-pointer">
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors z-10" />
                    {story.cover_image_path ? (
                      <img src={resolveMediaUrl(story.cover_image_path)} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={story.title} />
                    ) : (
                      <div className="w-full h-full bg-secondary flex items-center justify-center text-muted-foreground">
                        <Calendar className="w-8 h-8" />
                      </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-20 pt-12">
                      <h3 className="text-xl font-bold text-white">{story.title}</h3>
                      {story.description && <p className="text-white/80 text-sm line-clamp-1">{story.description}</p>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* LIVING MOMENTS FEED */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-semibold text-foreground">Latest Moments</h2>
            <Link to="/gallery" className="text-sm text-primary hover:underline font-medium flex items-center gap-1">
              See all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Grid of moments - Portrait.so inspired "airy" grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-[minmax(180px,auto)]">
            {recentMoments?.map((moment, index) => {
              const isMomentVideo = moment.mime_type?.startsWith("video/");
              const thumbnailUrl = resolveMediaUrl(moment.thumbnail_path);
              const mediaUrl = resolveMediaUrl(moment.storage_path);

              // Simple "bento" logic: Every 7th item spans 2 columns (index 0, 7, 14...)
              // This breaks uniformity and adds that "dynamic" feel
              const isLarge = index === 0 || index % 7 === 0;

              if (!mediaUrl) return null;

              return (
                <div
                  key={moment.id}
                  className={`
                    relative group cursor-pointer overflow-hidden bg-muted
                    rounded-3xl shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 ease-out
                    ${isLarge ? 'md:col-span-2 md:row-span-2 aspect-square md:aspect-auto' : 'aspect-square'}
                  `}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {thumbnailUrl ? (
                    <img
                      src={thumbnailUrl}
                      alt={moment.caption || ""}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                    />
                  ) : isMomentVideo ? (
                    <VideoThumbnail
                      src={mediaUrl}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                    />
                  ) : (
                    <img
                      src={mediaUrl}
                      alt={moment.caption || ""}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                    />
                  )}

                  {/* Video indicator - Minimalist Top Right */}
                  {isMomentVideo && (
                    <div className="absolute top-3 right-3 flex items-center justify-center pointer-events-none z-20">
                      <div className="bg-black/20 backdrop-blur-md rounded-full p-2 border border-white/10">
                        <div className="w-0 h-0 border-l-[8px] border-l-white border-y-[5px] border-y-transparent ml-0.5" />
                      </div>
                    </div>
                  )}

                  {/* Overlay - Portrait style: Clean, bottom-aligned, gradient only at very bottom */}
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end">

                    {/* Caption (if any) */}
                    {moment.caption && (
                      <p className="text-white font-medium line-clamp-2 mb-1.5 drop-shadow-md text-sm leading-snug">{moment.caption}</p>
                    )}

                    {/* Meta Pill */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/10 text-[10px] text-white font-medium">
                        <Calendar className="w-3 h-3" />
                        {moment.taken_at ? format(new Date(moment.taken_at), "MMM d") : ""}
                      </div>

                      {moment.location_name && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/10 text-[10px] text-white font-medium truncate max-w-[120px]">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{moment.location_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Skeleton loaders */}
            {(!recentMoments || recentMoments.length === 0) &&
              Array(8)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-xl bg-secondary" />
                ))}
          </div>
        </div>
      </main>


    </div>
  );
};

export default Home;
