import { Navigation } from "@/components/Navigation";
import { BottomNav } from "@/components/BottomNav";
import { FloatingActionButton } from "@/components/home/FloatingActionButton";
import { HeroLocation } from "@/components/home/HeroLocation";
import { RecentMoments } from "@/components/home/RecentMoments";
import { WeeklySummaryCard } from "@/components/home/WeeklySummaryCard";
import { MiniTimeline } from "@/components/home/MiniTimeline";
import { LatestStories } from "@/components/home/LatestStories";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Home = () => {
  const navigate = useNavigate();

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

  const currentDestination =
    destinations?.find((d) => d.is_current) ||
    destinations?.[destinations.length - 1];

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

  const { data: recentPhotos, isLoading: isLoadingPhotos } = useQuery({
    queryKey: ["recentPhotosHome"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
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

  const { data: tripSettings } = useQuery({
    queryKey: ["tripSettings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // --- Calculations ---
  const isVideo = locationImage?.mime_type?.startsWith("video/");
  const bgMediaUrl = locationImage
    ? supabase.storage.from("photos").getPublicUrl(locationImage.storage_path)
        .data.publicUrl
    : null;
  const bgThumbnailUrl = locationImage?.thumbnail_path
    ? supabase.storage.from("photos").getPublicUrl(locationImage.thumbnail_path)
        .data.publicUrl
    : null;

  // Calculate day number
  const dayNumber = tripSettings?.start_date
    ? differenceInDays(new Date(), new Date(tripSettings.start_date)) + 1
    : 1;
  const totalDays = tripSettings?.total_days || 180;

  // Week number calculation
  const weekNumber = Math.ceil(dayNumber / 7);
  const weekPhotosCount = recentPhotos?.length || 0;

  // --- FAB Actions ---
  const handleAddMoment = () => {
    navigate("/admin");
    toast.info("Navigate to photo upload");
  };

  const handleAddVoiceNote = () => {
    toast.info("Voice notes coming soon!");
  };

  const handleAddNote = () => {
    navigate("/admin/blog/new");
  };

  const handleAddLocation = () => {
    navigate("/admin");
    toast.info("Navigate to add destination");
  };

  const handlePublishWeekly = () => {
    navigate("/admin/blog/new");
    toast.info("Create your weekly summary");
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 md:pb-8">
      {/* Desktop Navigation */}
      <div className="hidden md:block">
        <Navigation />
      </div>

      {/* Mobile-first layout */}
      <main className="md:container md:mx-auto md:px-4 md:pt-28">
        {/* MOBILE LAYOUT */}
        <div className="md:hidden flex flex-col gap-6">
          {/* Hero - Full width on mobile */}
          <HeroLocation
            destination={currentDestination || null}
            mediaUrl={bgMediaUrl}
            thumbnailUrl={bgThumbnailUrl}
            isVideo={isVideo}
            dayNumber={dayNumber}
            totalDays={totalDays}
          />

          {/* Recent Moments - Horizontal scroll */}
          <RecentMoments photos={recentPhotos} isLoading={isLoadingPhotos} />

          {/* Weekly Summary Card */}
          <WeeklySummaryCard
            photos={recentPhotos}
            weekNumber={weekNumber}
            photosCount={weekPhotosCount}
            onPublish={handlePublishWeekly}
          />

          {/* Mini Timeline */}
          <MiniTimeline destinations={destinations} />

          {/* Latest Stories */}
          <LatestStories posts={recentPosts} />

          {/* Bottom spacing for nav */}
          <div className="h-4" />
        </div>

        {/* DESKTOP LAYOUT - Keep existing bento grid */}
        <div className="hidden md:grid md:grid-cols-4 md:auto-rows-[280px] gap-4">
          {/* Hero Location - Large */}
          <div className="col-span-2 row-span-2 relative overflow-hidden rounded-3xl">
            <HeroLocation
              destination={currentDestination || null}
              mediaUrl={bgMediaUrl}
              thumbnailUrl={bgThumbnailUrl}
              isVideo={isVideo}
              dayNumber={dayNumber}
              totalDays={totalDays}
            />
          </div>

          {/* Right column - Stories + Moments */}
          <div className="col-span-2 row-span-2 flex flex-col gap-4">
            <div className="flex-1">
              <LatestStories posts={recentPosts} />
            </div>
            <div className="flex-1">
              <RecentMoments photos={recentPhotos} isLoading={isLoadingPhotos} />
            </div>
          </div>

          {/* Timeline */}
          <div className="col-span-2">
            <MiniTimeline destinations={destinations} />
          </div>

          {/* Weekly Summary */}
          <div className="col-span-2">
            <WeeklySummaryCard
              photos={recentPhotos}
              weekNumber={weekNumber}
              photosCount={weekPhotosCount}
              onPublish={handlePublishWeekly}
            />
          </div>
        </div>
      </main>

      {/* FAB - Mobile only */}
      <FloatingActionButton
        onAddMoment={handleAddMoment}
        onAddVoiceNote={handleAddVoiceNote}
        onAddNote={handleAddNote}
        onAddLocation={handleAddLocation}
      />

      <BottomNav />
    </div>
  );
};

export default Home;
