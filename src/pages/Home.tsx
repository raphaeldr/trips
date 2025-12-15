import { Navigation } from "@/components/Navigation";
import { BottomNav } from "@/components/BottomNav";
import { QuickCaptureFAB } from "@/components/home/QuickCaptureFAB";
import { ScrapbookHero } from "@/components/home/ScrapbookHero";
import { PolaroidMoments } from "@/components/home/PolaroidMoments";
import { JourneyRibbon } from "@/components/home/JourneyRibbon";
import { WeeklyRecap } from "@/components/home/WeeklyRecap";
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

  const dayNumber = tripSettings?.start_date
    ? differenceInDays(new Date(), new Date(tripSettings.start_date)) + 1
    : 1;
  const totalDays = tripSettings?.total_days || 180;
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

  const handleAddLocation = () => {
    navigate("/admin");
    toast.info("Navigate to add destination");
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 md:pb-8">
      {/* Desktop Navigation */}
      <div className="hidden md:block">
        <Navigation />
      </div>

      {/* Mobile Layout */}
      <main className="md:container md:mx-auto md:px-4 md:pt-28">
        <div className="md:hidden">
          {/* Hero */}
          <ScrapbookHero
            destination={currentDestination || null}
            mediaUrl={bgMediaUrl}
            thumbnailUrl={bgThumbnailUrl}
            isVideo={isVideo}
            dayNumber={dayNumber}
            totalDays={totalDays}
          />

          {/* Journey Ribbon */}
          <JourneyRibbon destinations={destinations} />

          {/* Recent Moments */}
          <PolaroidMoments photos={recentPhotos} isLoading={isLoadingPhotos} />

          {/* Weekly Recap */}
          <WeeklyRecap
            photos={recentPhotos}
            weekNumber={weekNumber}
            photosCount={weekPhotosCount}
          />

          {/* Bottom spacing */}
          <div className="h-8" />
        </div>

        {/* Desktop - Bento Grid */}
        <div className="hidden md:grid md:grid-cols-3 gap-6">
          <div className="col-span-2 row-span-2">
            <ScrapbookHero
              destination={currentDestination || null}
              mediaUrl={bgMediaUrl}
              thumbnailUrl={bgThumbnailUrl}
              isVideo={isVideo}
              dayNumber={dayNumber}
              totalDays={totalDays}
            />
          </div>
          <div>
            <WeeklyRecap
              photos={recentPhotos}
              weekNumber={weekNumber}
              photosCount={weekPhotosCount}
            />
          </div>
          <div className="col-span-3">
            <PolaroidMoments photos={recentPhotos} isLoading={isLoadingPhotos} />
          </div>
          <div className="col-span-3">
            <JourneyRibbon destinations={destinations} />
          </div>
        </div>
      </main>

      {/* FAB - Mobile only */}
      <QuickCaptureFAB
        onAddMoment={handleAddMoment}
        onAddVoiceNote={handleAddVoiceNote}
        onAddLocation={handleAddLocation}
      />

      <BottomNav />
    </div>
  );
};

export default Home;
