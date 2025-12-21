import { Navigation } from "@/components/Navigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PhotoCard } from "@/components/gallery/PhotoCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon } from "lucide-react";

interface Moment {
  id: string;
  storage_path: string | null;
  title: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  taken_at: string | null;
  is_hero: boolean | null;
  mime_type: string | null;
  destination_id: string | null;
  media_type: string | null;
  caption: string | null;
  status: string | null;
}

const Gallery = () => {
  const {
    data: moments,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["moments_public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("moments_public")
        .select("*")
        .in("media_type", ["photo", "video", "audio", "text"])
        .order("taken_at", { ascending: false });
      if (error) throw error;
      return data as Moment[];
    },
  });

  return (
    <div className="min-h-screen bg-[#f7f7f7] pb-20">
      <Navigation />

      <main className="container mx-auto px-4 pt-24 md:pt-32">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 auto-rows-[250px] gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="w-full h-full rounded-2xl" />
            ))}
          </div>
        ) : moments && moments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 auto-rows-[300px] gap-4">
            {moments.map((moment, index) => {
              // Determine if this card should span
              const isHero = moment.is_hero;
              // Add some randomness to the spanning if not explicitly set, for the "bento" feel
              // But strictly respecting is_hero is safer. Let's stick to is_hero for prominent spans.

              const spanClass = isHero
                ? "col-span-1 sm:col-span-2 row-span-2"
                : "col-span-1 row-span-1";

              return (
                <div key={moment.id} className={`${spanClass} group`}>
                  <PhotoCard
                    id={moment.id}
                    storagePath={moment.storage_path || ""}
                    title={moment.title}
                    description={moment.description || moment.caption}
                    latitude={moment.latitude}
                    longitude={moment.longitude}
                    takenAt={moment.taken_at}
                    cameraMake={null}
                    cameraModel={null}
                    isHero={moment.is_hero}
                    mimeType={moment.mime_type || moment.media_type}
                    onHeroToggle={refetch}
                    className="h-full w-full"
                    destinationName={undefined}
                    country={undefined}
                  />
                  {/* Note: PhotoCard internal div needs to be h-full w-full to accept the grid area */}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-200 rounded-3xl bg-white/50 mt-12 mx-4">
            <ImageIcon className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-600">No moments yet</h3>
            <p className="text-sm text-gray-400 mt-2">Upload some photos to see them here.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Gallery;
